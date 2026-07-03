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

/**
 * Captures a JPEG frame from a video element entirely off the main thread
 * using createImageBitmap + OffscreenCanvas Worker. Falls back to a plain
 * canvas.toDataURL() on browsers that don\'t support OffscreenCanvas.
 */
async function captureFrame(
  video: HTMLVideoElement,
  width: number,
  height: number,
  quality = 0.5
): Promise<string> {
  // Prefer off-thread path
  if (typeof createImageBitmap !== "undefined" && typeof OffscreenCanvas !== "undefined") {
    return new Promise((resolve, reject) => {
      createImageBitmap(video, { resizeWidth: width, resizeHeight: height })
        .then((bitmap) => {
          const worker = new Worker(
            new URL("./snapshotWorker.ts", import.meta.url),
            { type: "module" }
          );
          worker.onmessage = (e) => {
            worker.terminate();
            if (e.data.type === "DONE") resolve(e.data.dataUrl);
            else reject(new Error(e.data.message));
          };
          worker.onerror = (err) => { worker.terminate(); reject(err); };
          worker.postMessage({ type: "CAPTURE", bitmap, width, height, quality }, [bitmap]);
        })
        .catch(reject);
    });
  }

  // Fallback: main-thread canvas (older browsers / Safari)
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));
      ctx.drawImage(video, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    } catch (err) {
      reject(err);
    }
  });
}

interface ProctoringContextType extends ProctoringState {
  addViolation: (type: ViolationType, metadata?: Record<string, unknown>) => void;
  startProctoring: () => void;
  stopProctoring: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  syncViolations: () => Promise<number | null>;
}

const ProctoringContext = createContext<ProctoringContextType | undefined>(undefined);

export interface ProctoringConfigDto {
  camera: boolean;
  audio: boolean;
  tabSwitch: boolean;
  devtools: boolean;
  screenShare: boolean;
  objectDetection: boolean;
  llmDetector: boolean;
  maxTabSwitches: number;
  snapshotIntervalSecs: number;
  violationThresholds: Record<string, number>;
}

export const ProctoringProvider: React.FC<{ 
  children: React.ReactNode; 
  sessionId: string;
  config: ProctoringConfigDto;
}> = ({ 
  children, 
  sessionId,
  config
}) => {
  const [state, setState] = useState<ProctoringState>({
    violations: [],
    trustScore: 100,
    isProctoringActive: false,
    cameraActive: false,
    screenActive: false,
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

    // Capture a small compressed frame for visual proof on HIGH/CRITICAL violations.
    // Done fully async & off-thread — never blocks the main thread.
    if (severity === "CRITICAL" || severity === "HIGH") {
      const video = document.querySelector<HTMLVideoElement>("video");
      if (video && !video.paused && !video.ended) {
        captureFrame(video, 200, 150, 0.5)
          .then((dataUrl) => {
            // Re-add violation with evidence once frame is ready
            const withEvidence = store.current.addViolation({ type, severity, metadata, evidence: dataUrl });
            setState(prev => ({
              ...prev,
              violations: [...prev.violations.filter(v => v.id !== newViolation.id), withEvidence],
            }));
            // Immediately sync to backend
            store.current.syncSingleViolation(withEvidence).then(score => {
              if (score !== null) setState(prev => ({ ...prev, trustScore: score }));
            }).catch(err => console.error("Failed to sync critical violation:", err));
          })
          .catch(err => console.error("Evidence capture failed:", err));
        // Return early — the violation already added below without evidence;
        // it will be replaced once the frame arrives
      }
    } else if (severity === "CRITICAL" || severity === "HIGH") {
      // Sync immediately even without evidence
      store.current.syncSingleViolation(newViolation).then(score => {
        if (score !== null) setState(prev => ({ ...prev, trustScore: score }));
      }).catch(err => console.error("Failed to sync critical violation immediately:", err));
    }

    const newViolation = store.current.addViolation({
      type,
      severity,
      metadata,
    });

    setState(prev => ({
      ...prev,
      violations: [...prev.violations, newViolation],
      trustScore: store.current.getScore()
    }));

    // For low/medium violations: just sync in the next batch
    // For high/critical: evidence is captured async above and violation updated when ready
    if (severity !== "CRITICAL" && severity !== "HIGH") return;
  }, []);

  const handleViolation = useCallback((type: ViolationType, meta?: Record<string, unknown>) => {
    addViolation(type, meta || {});
  }, [addViolation]);

  const { videoRef } = useCameraMonitor(state.isProctoringActive && config.camera, handleViolation);
  useTabMonitor(state.isProctoringActive && config.tabSwitch, handleViolation);
  useDevToolsDetector(state.isProctoringActive && config.devtools, () => addViolation("DEVTOOLS_OPEN"));
  useAudioMonitor(state.isProctoringActive && config.audio, handleViolation);
  // useScreenMonitor(state.isProctoringActive && config.screenShare, handleViolation);

  // Periodic Object Detection with Dynamic Degradation
  useEffect(() => {
    if (!state.isProctoringActive || !config.objectDetection || !videoRef.current) return;

    let checkInterval = 5000; // start at 5s
    let timeoutId: NodeJS.Timeout;

    const runObjectDetection = async () => {
      if (!state.isProctoringActive || !config.objectDetection) return;
      if (videoRef.current) {
        try {
          const t0 = performance.now();
          const suspicious = await objectDetector.current.detect(videoRef.current);
          const t1 = performance.now();
          const duration = t1 - t0;
          
          if (duration > 3000) {
            console.warn(`⚠️ Object detection took ${duration.toFixed(2)}ms. Critical delay, degrading check interval to 60s.`);
            checkInterval = 60000;
          } else if (duration > 1500) {
            console.warn(`⚠️ Object detection took ${duration.toFixed(2)}ms. Major delay, degrading check interval to 30s.`);
            checkInterval = 30000;
          } else if (duration > 800) {
            console.warn(`⚠️ Object detection took ${duration.toFixed(2)}ms. Moderate delay, degrading check interval to 15s.`);
            checkInterval = 15000;
          } else {
            checkInterval = 5000; // Normal speed
          }

          if (suspicious.length > 0) {
            addViolation("BACKGROUND_OBJECT", { objects: suspicious.map(s => s.class) });
          }
        } catch (e) {
          console.error("Object detection error:", e);
        }
      }
      if (state.isProctoringActive && config.objectDetection) {
        timeoutId = setTimeout(runObjectDetection, checkInterval);
      }
    };

    timeoutId = setTimeout(runObjectDetection, checkInterval);
    return () => clearTimeout(timeoutId);
  }, [state.isProctoringActive, config.objectDetection, addViolation, videoRef]);

  // Periodic behavior analysis
  useEffect(() => {
    if (!state.isProctoringActive || !config.llmDetector) return;

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
  }, [state.isProctoringActive, config.llmDetector, state.violations, addViolation]);

  // In-memory snapshot buffer — avoids per-tick localStorage serialize/deserialize
  const snapshotBufferRef = useRef<{ timestamp: number; image: string }[]>([]);

  // Periodic Camera Snapshot capturing — only when periodicSnapshots is enabled
  useEffect(() => {
    if (!state.isProctoringActive || !config.camera || !config.periodicSnapshots) return;

    const intervalMs = Math.max((config.snapshotIntervalSecs || 60) * 1000, 30000); // min 30s
    const interval = setInterval(() => {
      const video = document.querySelector<HTMLVideoElement>("video");
      if (!video || video.paused || video.ended) return;
      // Off-thread capture — does NOT block the main thread
      captureFrame(video, 160, 120, 0.5)
        .then((dataUrl) => {
          snapshotBufferRef.current.push({ timestamp: Date.now(), image: dataUrl });
          if (snapshotBufferRef.current.length > 20) snapshotBufferRef.current.shift();
          console.log(`📸 Buffered periodic snapshot. Buffer size: ${snapshotBufferRef.current.length}`);
        })
        .catch((e) => console.error("Failed to capture periodic camera snapshot:", e));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [state.isProctoringActive, config.camera, config.periodicSnapshots, config.snapshotIntervalSecs]);

  // Batch upload worker — flushes in-memory snapshot buffer every 5 minutes & on unmount
  useEffect(() => {
    if (!state.isProctoringActive || !sessionId) return;

    const syncSnapshots = async () => {
      const snapshots = snapshotBufferRef.current;
      if (snapshots.length === 0) return;
      const toSync = snapshots.splice(0, snapshots.length); // drain buffer atomically
      try {
        console.log(`📤 Syncing ${toSync.length} webcam snapshots in batch...`);
        await apiClient.post(`/test-sessions/${sessionId}/snapshots/batch`, {
          snapshots: toSync.map((s) => ({ timestamp: s.timestamp, image: s.image }))
        });
        console.log("✅ Webcam snapshots synced successfully.");
      } catch (err) {
        // Put frames back at front of buffer so they are retried next cycle
        snapshotBufferRef.current.unshift(...toSync);
        console.error("Failed to batch upload webcam snapshots:", err);
      }
    };

    const batchInterval = setInterval(syncSnapshots, 300000); // 5 minutes
    return () => {
      clearInterval(batchInterval);
      syncSnapshots(); // flush on unmount
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
      store.current.syncUnsynced().then(score => {
        if (score !== null) {
          setState(prev => ({ ...prev, trustScore: score }));
        }
      }).catch(err => {
        console.error("Failed to sync offline queue:", err);
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const startProctoring = () => setState(prev => ({ ...prev, isProctoringActive: true }));
  const stopProctoring = () => setState(prev => ({ ...prev, isProctoringActive: false }));

  const syncViolations = useCallback(async () => {
    const score = await store.current.syncToBackend();
    if (score !== null) {
      setState(prev => ({ ...prev, trustScore: score }));
    }
    return score;
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
