import { useEffect, useRef, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as blazeface from "@tensorflow-models/blazeface";

export function useCameraMonitor(
  isActive: boolean, 
  onViolation: (type: "MULTI_FACE" | "LOOK_AWAY", metadata: Record<string, unknown>) => void
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
    const detectionInterval = 1000; // 1.0 second (locked for high frequency/immediate results)

    const detect = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        timeoutId = setTimeout(detect, detectionInterval);
        return;
      }

      try {
        const predictions = await detector.estimateFaces(videoRef.current, false);
        const now = Date.now();

        if (now - lastViolationTime > VIOLATION_COOLDOWN) {
          if (predictions.length > 1) {
            onViolation("MULTI_FACE", { count: predictions.length });
            lastViolationTime = now;
          } else if (predictions.length === 0) {
            onViolation("LOOK_AWAY", { message: "No face detected" });
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
    return () => clearTimeout(timeoutId);
  }, [detector, isActive, onViolation]);

  return { videoRef, error, isInitializing };
}
