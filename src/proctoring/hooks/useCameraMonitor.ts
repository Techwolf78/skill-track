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

    let frameId: number;
    let lastViolationTime = 0;
    const VIOLATION_COOLDOWN = 3000; // 3 seconds

    const detect = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        frameId = requestAnimationFrame(detect);
        return;
      }

      try {
        const faces = await detector.estimateFaces(videoRef.current);
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

      frameId = requestAnimationFrame(detect);
    };

    detect();
    return () => cancelAnimationFrame(frameId);
  }, [detector, isActive, onViolation]);

  return { videoRef, error, isInitializing };
}
