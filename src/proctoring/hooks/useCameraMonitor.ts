import { useEffect, useRef, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as blazeface from "@tensorflow-models/blazeface";

function calculateBrightness(video: HTMLVideoElement): number {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 128;
    ctx.drawImage(video, 0, 0, 64, 48);
    const imgData = ctx.getImageData(0, 0, 64, 48);
    const data = imgData.data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return sum / (data.length / 4);
  } catch {
    return 128;
  }
}

export function useCameraMonitor(
  isActive: boolean, 
  onViolation: (type: "MULTI_FACE" | "LOOK_AWAY" | "NO_FACE", metadata: Record<string, unknown>) => void,
  onFaceStatusChange?: (status: { faceNotVisible: boolean; isCameraObscured: boolean }) => void
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [detector, setDetector] = useState<blazeface.BlazeFaceModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const initDetector = useCallback(async () => {
    try {
      setIsInitializing(true);
      await tf.ready();
      await tf.setBackend("webgl");
      const newDetector = await blazeface.load();
      setDetector(newDetector);
    } catch (err) {
      console.error("Failed to initialize blazeface detector:", err);
      setError("Failed to initialize face detector");
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoEl) {
          videoEl.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to start camera:", err);
        setError("Camera permission denied or not found");
      }
    };

    if (isActive) {
      startCamera();
      if (!detector && !isInitializing) {
        initDetector();
      }
    } else {
      if (videoEl) {
        if (videoEl.srcObject instanceof MediaStream) {
          videoEl.srcObject.getTracks().forEach((t) => t.stop());
        }
        videoEl.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (videoEl?.srcObject instanceof MediaStream) {
        videoEl.srcObject.getTracks().forEach((t) => t.stop());
        videoEl.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isActive, detector, isInitializing, initDetector]);

  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;
  const onFaceStatusChangeRef = useRef(onFaceStatusChange);
  onFaceStatusChangeRef.current = onFaceStatusChange;

  useEffect(() => {
    if (!detector || !videoRef.current || !isActive) return;

    let timeoutId: NodeJS.Timeout;
    let lastViolationTime = 0;
    let consecutiveMissingFaceCount = 0;
    let consecutiveFacePresentCount = 0;
    let isFaceMissing = false;

    const VIOLATION_COOLDOWN = 3000; // 3 seconds
    const detectionInterval = 1000; // 1.0 second loop

    const detect = async () => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) {
        timeoutId = setTimeout(detect, detectionInterval);
        return;
      }

      try {
        const brightness = calculateBrightness(video);
        const isTooDark = brightness < 15;
        const predictions = isTooDark ? [] : await detector.estimateFaces(video, false);
        const now = Date.now();

        if (predictions.length === 0 || isTooDark) {
          consecutiveMissingFaceCount++;
          consecutiveFacePresentCount = 0;

          // Require 3 consecutive missing seconds before engaging blocking modal and logging single violation
          if (consecutiveMissingFaceCount >= 3) {
            if (!isFaceMissing) {
              isFaceMissing = true;
              onViolationRef.current("NO_FACE", { 
                reason: isTooDark ? "camera_obscured" : "no_face_detected",
                brightness: Math.round(brightness)
              });
              lastViolationTime = now;
              onFaceStatusChangeRef.current?.({ 
                faceNotVisible: true, 
                isCameraObscured: isTooDark 
              });
            }
          }
        } else if (predictions.length === 1) {
          consecutiveFacePresentCount++;
          consecutiveMissingFaceCount = 0;

          // If face was previously missing and now stable for 2 cycles (2s), clear blocking modal
          if (isFaceMissing && consecutiveFacePresentCount >= 2) {
            isFaceMissing = false;
            onFaceStatusChangeRef.current?.({ 
              faceNotVisible: false, 
              isCameraObscured: false 
            });
          }

          // Check lateral head rotation if face is active and test is not blocked
          if (!isFaceMissing && now - lastViolationTime > VIOLATION_COOLDOWN) {
            const pred = predictions[0];
            const landmarks = Array.isArray(pred.landmarks) ? (pred.landmarks as unknown as number[][]) : null;
            if (landmarks && landmarks.length >= 3) {
              const rightEye = landmarks[0];
              const leftEye = landmarks[1];
              const nose = landmarks[2];

              if (Array.isArray(rightEye) && Array.isArray(leftEye) && Array.isArray(nose)) {
                const eyeMidpointX = (rightEye[0] + leftEye[0]) / 2;
                const eyeDistance = Math.abs(leftEye[0] - rightEye[0]);

                if (eyeDistance > 0) {
                  const noseOffsetRatio = (nose[0] - eyeMidpointX) / eyeDistance;
                  const ROTATION_THRESHOLD = 0.35; // Trigger threshold for lateral head rotation

                  if (Math.abs(noseOffsetRatio) > ROTATION_THRESHOLD) {
                    onViolationRef.current("LOOK_AWAY", {
                      message: "Head rotation look-away detected",
                      offset: noseOffsetRatio.toFixed(3),
                    });
                    lastViolationTime = now;
                  }
                }
              }
            }
          }
        } else if (predictions.length > 1) {
          consecutiveFacePresentCount = 0;
          consecutiveMissingFaceCount = 0;
          if (now - lastViolationTime > VIOLATION_COOLDOWN) {
            onViolationRef.current("MULTI_FACE", { count: predictions.length });
            lastViolationTime = now;
          }
        }
      } catch (err) {
        console.error("BlazeFace detection error:", err);
      }

      if (isActive) {
        timeoutId = setTimeout(detect, detectionInterval);
      }
    };

    timeoutId = setTimeout(detect, detectionInterval);
    return () => {
      clearTimeout(timeoutId);
      if (isFaceMissing) {
        onFaceStatusChangeRef.current?.({ faceNotVisible: false, isCameraObscured: false });
      }
    };
  }, [detector, isActive]);

  return { videoRef, error, isInitializing };
}

