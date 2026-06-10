import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Violation, ViolationType, ProctoringState, Severity } from "../types/proctoring.types";
import { ViolationStore } from "./storage/violationStorage";
import { useCameraMonitor } from "./hooks/useCameraMonitor";
import { useTabMonitor } from "./hooks/useTabMonitor";
import { useDevToolsDetector } from "./hooks/useDevToolsDetector";
import { useAudioMonitor } from "./hooks/useAudioMonitor";
import { useScreenMonitor } from "./hooks/useScreenMonitor";
import { ObjectDetector } from "./ai/objectDetector";
import { LLMBehaviorAnalyzer } from "./ai/llmDetector";
import { toast } from "sonner";
import { apiClient } from "../lib/api-client";

interface ProctoringContextType extends ProctoringState {
  addViolation: (type: ViolationType, metadata?: Record<string, unknown>) => void;
  startProctoring: () => void;
  stopProctoring: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  syncViolations: () => Promise<boolean>;
}

const ProctoringContext = createContext<ProctoringContextType | undefined>(undefined);

export const ProctoringProvider: React.FC<{ children: React.ReactNode; sessionId: string }> = ({ 
  children, 
  sessionId 
}) => {
  const [state, setState] = useState<ProctoringState>({
    violations: [],
    trustScore: 100,
    isProctoringActive: false,
    cameraActive: false,
    micActive: false,
  });

  const store = useRef(new ViolationStore(sessionId));
  const objectDetector = useRef(new ObjectDetector());
  const behaviorAnalyzer = useRef(new LLMBehaviorAnalyzer());

  const addViolation = useCallback((type: ViolationType, metadata: Record<string, unknown> = {}) => {
    let severity: Severity = "LOW";
    
    switch (type) {
      case "MULTI_FACE": severity = "HIGH"; break;
      case "LOOK_AWAY": severity = "MEDIUM"; break;
      case "TAB_SWITCH": severity = "HIGH"; break;
      case "EXTENDED_TAB_SWITCH": severity = "HIGH"; break;
      case "SPEECH": severity = "MEDIUM"; break;
      case "DEVTOOLS_OPEN": severity = "CRITICAL"; break;
      case "BACKGROUND_OBJECT": severity = "HIGH"; break;
      case "SCREEN_RECORD": severity = "CRITICAL"; break;
    }

    // Capture compressed low-resolution frame for visual proof on HIGH/CRITICAL violations
    let evidence: string | undefined = undefined;
    if (severity === "CRITICAL" || severity === "HIGH") {
      const video = document.querySelector("video");
      if (video && !video.paused && !video.ended) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 200;
          canvas.height = 150;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            // Convert to grayscale to minimize base64 payload size by ~66%
            for (let i = 0; i < data.length; i += 4) {
              const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
              data[i] = brightness;
              data[i + 1] = brightness;
              data[i + 2] = brightness;
            }
            ctx.putImageData(imgData, 0, 0);
            evidence = canvas.toDataURL("image/jpeg", 0.6); // 60% quality compressed JPEG
          }
        } catch (e) {
          console.error("Failed to capture video frame evidence:", e);
        }
      }
    }

    const newViolation = store.current.addViolation({
      type,
      severity,
      metadata,
      evidence,
    });

    setState(prev => ({
      ...prev,
      violations: [...prev.violations, newViolation],
      trustScore: store.current.getScore()
    }));

    // Non-blocking real-time alert sync for critical/high violations
    if (severity === "CRITICAL" || severity === "HIGH") {
      store.current.syncSingleViolation(newViolation).catch(err => {
        console.error("Failed to sync critical violation immediately:", err);
      });
    }
  }, []);

  const handleViolation = useCallback((type: ViolationType, meta?: Record<string, unknown>) => {
    addViolation(type, meta || {});
  }, [addViolation]);

  const { videoRef } = useCameraMonitor(state.isProctoringActive, handleViolation);
  useTabMonitor(state.isProctoringActive, handleViolation);
  useDevToolsDetector(state.isProctoringActive, () => addViolation("DEVTOOLS_OPEN"));
  useAudioMonitor(state.isProctoringActive, handleViolation);
  // useScreenMonitor(state.isProctoringActive, handleViolation);

  // Periodic Object Detection with Dynamic Degradation
  useEffect(() => {
    if (!state.isProctoringActive || !videoRef.current) return;

    let checkInterval = 5000; // start at 5s
    let timeoutId: NodeJS.Timeout;

    const runObjectDetection = async () => {
      if (!state.isProctoringActive) return;
      if (videoRef.current) {
        try {
          const t0 = performance.now();
          const suspicious = await objectDetector.current.detect(videoRef.current);
          const t1 = performance.now();
          const duration = t1 - t0;
          
          if (duration > 1000) {
            console.warn(`Object detection took ${duration.toFixed(2)}ms (exceeding 1s). Degrading check interval to 10s.`);
            checkInterval = 10000;
          }

          if (suspicious.length > 0) {
            addViolation("BACKGROUND_OBJECT", { objects: suspicious.map(s => s.class) });
          }
        } catch (e) {
          console.error("Object detection error:", e);
        }
      }
      if (state.isProctoringActive) {
        timeoutId = setTimeout(runObjectDetection, checkInterval);
      }
    };

    timeoutId = setTimeout(runObjectDetection, checkInterval);
    return () => clearTimeout(timeoutId);
  }, [state.isProctoringActive, addViolation, videoRef]);

  // Periodic behavior analysis
  useEffect(() => {
    if (!state.isProctoringActive) return;

    const interval = setInterval(async () => {
      const recentViolations = state.violations.slice(-5);
      if (recentViolations.length >= 3) {
        const result = await behaviorAnalyzer.current.analyzeSequence(
          recentViolations.map(v => ({ type: v.type, timestamp: v.timestamp }))
        );
        if (result && result[0].label === "POSITIVE") { // Placeholder logic
           // addViolation("UNUSUAL_BEHAVIOR", { details: "AI detected suspicious sequence" });
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [state.isProctoringActive, state.violations, addViolation]);

  // Periodic Camera Snapshot capturing/auditing
  useEffect(() => {
    if (!state.isProctoringActive) return;

    const interval = setInterval(() => {
      const video = document.querySelector("video");
      if (video && !video.paused && !video.ended) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 160;
          canvas.height = 120;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            // Convert to grayscale to minimize base64 payload size by ~66%
            for (let i = 0; i < data.length; i += 4) {
              const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
              data[i] = brightness;
              data[i + 1] = brightness;
              data[i + 2] = brightness;
            }
            ctx.putImageData(imgData, 0, 0);
            const snapshotBase64 = canvas.toDataURL("image/jpeg", 0.5); // 50% quality compressed JPEG

            // Store in LocalStorage
            const storageKey = `rxone_camera_snapshots_${sessionId}`;
            const snapshotsRaw = localStorage.getItem(storageKey);
            const snapshots = snapshotsRaw ? JSON.parse(snapshotsRaw) : [];
            
            snapshots.push({
              timestamp: Date.now(),
              image: snapshotBase64
            });

            // Enforce max 20 snapshots cap to stay well under browser quota
            if (snapshots.length > 20) {
              snapshots.shift();
            }

            localStorage.setItem(storageKey, JSON.stringify(snapshots));
            console.log(`📸 Saved periodic camera snapshot evidence. Total snapshots: ${snapshots.length}`);
          }
        } catch (e) {
          console.error("Failed to capture periodic camera snapshot:", e);
        }
      }
    }, 60000); // Capture every 60 seconds

    return () => clearInterval(interval);
  }, [state.isProctoringActive, sessionId]);

  // Batch upload worker for periodic webcam snapshots (every 5 minutes & component unmount)
  useEffect(() => {
    if (!state.isProctoringActive || !sessionId) return;

    const syncSnapshots = async () => {
      const storageKey = `rxone_camera_snapshots_${sessionId}`;
      const snapshotsRaw = localStorage.getItem(storageKey);
      if (!snapshotsRaw) return;

      try {
        const snapshots = JSON.parse(snapshotsRaw);
        if (snapshots.length === 0) return;

        console.log(`📤 Syncing ${snapshots.length} webcam snapshots in batch...`);
        await apiClient.post(`/test-sessions/${sessionId}/snapshots/batch`, {
          snapshots: snapshots.map((s: { timestamp: number; image: string }) => ({
            timestamp: s.timestamp,
            image: s.image,
          }))
        });

        localStorage.removeItem(storageKey);
        console.log("✅ Webcam snapshots synced successfully.");
      } catch (err) {
        console.error("Failed to batch upload webcam snapshots:", err);
      }
    };

    const batchInterval = setInterval(syncSnapshots, 300000); // 5 minutes

    return () => {
      clearInterval(batchInterval);
      syncSnapshots(); // flush final snapshots on unmount
    };
  }, [state.isProctoringActive, sessionId]);

  useEffect(() => {
    // Initial Load
    setState(prev => ({
      ...prev,
      violations: store.current.getAll(),
      trustScore: store.current.getScore()
    }));
    
    // Initialize AI models
    objectDetector.current.init();
    behaviorAnalyzer.current.init();
  }, [sessionId]);

  // Flush cached offline violations when connection returns
  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Connection restored. Syncing unsynced violations to backend...");
      store.current.syncUnsynced().catch(err => {
        console.error("Failed to sync offline queue:", err);
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const startProctoring = () => setState(prev => ({ ...prev, isProctoringActive: true }));
  const stopProctoring = () => setState(prev => ({ ...prev, isProctoringActive: false }));

  const syncViolations = useCallback(async () => {
    return await store.current.syncToBackend();
  }, []);

  return (
    <ProctoringContext.Provider value={{ 
      ...state, 
      addViolation, 
      startProctoring, 
      stopProctoring,
      videoRef,
      syncViolations
    }}>
      {children}
    </ProctoringContext.Provider>
  );
};

export const useProctoring = () => {
  const context = useContext(ProctoringContext);
  if (!context) throw new Error("useProctoring must be used within ProctoringProvider");
  return context;
};
