import { useEffect, useRef, useState, useCallback } from "react";
import * as faceDetection from "@tensorflow-models/face-detection";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@mediapipe/face_mesh";

export function useCameraMonitor(
  isActive: boolean, 
  onViolation: (type: "MULTI_FACE" | "LOOK_AWAY", metadata: Record<string, unknown>) => void
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [detector, setDetector] = useState<faceDetection.FaceDetector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const initDetector = useCallback(async () => {
    try {
      setIsInitializing(true);
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig: faceDetection.MediaPipeFaceDetectorTfjsModelConfig = {
        runtime: "tfjs",
        maxFaces: 5,
        modelType: "short"
      };
      const newDetector = await faceDetection.createDetector(model, detectorConfig);
      setDetector(newDetector);
    } catch (err) {
      console.error("Failed to initialize face detector:", err);
      setError("Failed to initialize face detector");
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
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
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      stream?.getTracks().forEach(t => t.stop());
    }

    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [isActive, detector, isInitializing, initDetector]);

  useEffect(() => {
    if (!detector || !videoRef.current || !isActive) return;

    let timeoutId: NodeJS.Timeout;
    let lastViolationTime = 0;
    const VIOLATION_COOLDOWN = 3000; // 3 seconds
    let detectionInterval = 5000; // 5.0 seconds (increased from 1.5s to prevent UI lag on lower-end devices)

    const detect = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        timeoutId = setTimeout(detect, detectionInterval);
        return;
      }

      try {
        const t0 = performance.now();
        const faces = await detector.estimateFaces(videoRef.current);
        const t1 = performance.now();
        const duration = t1 - t0;

        if (duration > 3000) {
          console.warn(`⚠️ Face detection took ${duration.toFixed(2)}ms. Critical delay, degrading interval to 30s.`);
          detectionInterval = 30000;
        } else if (duration > 1500) {
          console.warn(`⚠️ Face detection took ${duration.toFixed(2)}ms. Major delay, degrading interval to 20s.`);
          detectionInterval = 20000;
        } else if (duration > 800) {
          console.warn(`⚠️ Face detection took ${duration.toFixed(2)}ms. Moderate delay, degrading interval to 10s.`);
          detectionInterval = 10000;
        } else if (duration > 300) {
          console.warn(`⚠️ Face detection took ${duration.toFixed(2)}ms. Slight delay, degrading interval to 4s.`);
          detectionInterval = 4000;
        } else {
          detectionInterval = 5000; // Normal speed
        }

        const now = Date.now();

        if (now - lastViolationTime > VIOLATION_COOLDOWN) {
          if (faces.length > 1) {
            onViolation("MULTI_FACE", { count: faces.length });
            lastViolationTime = now;
          } else if (faces.length === 0) {
            onViolation("LOOK_AWAY", { message: "No face detected" });
            lastViolationTime = now;
          }
        }
      } catch (err) {
        console.error("Face detection error:", err);
      }

      if (isActive) {
        timeoutId = setTimeout(detect, detectionInterval);
      }
    };

    timeoutId = setTimeout(detect, detectionInterval);
    return () => clearTimeout(timeoutId);
  }, [detector, isActive, onViolation]);

  return { videoRef, error, isInitializing };
}
