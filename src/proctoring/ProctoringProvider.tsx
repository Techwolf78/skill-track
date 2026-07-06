import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Violation, ViolationType, ProctoringState, Severity } from "../types/proctoring.types";
import { ViolationStore } from "./storage/violationStorage";
import { useCameraMonitor } from "./hooks/useCameraMonitor";
import { useTabMonitor } from "./hooks/useTabMonitor";
import { useDevToolsDetector } from "./hooks/useDevToolsDetector";
import { useAudioMonitor } from "./hooks/useAudioMonitor";
import { ObjectDetector } from "./ai/objectDetector";
import { LLMBehaviorAnalyzer } from "./ai/llmDetector";
import { UploadQueue } from "./uploadQueue";

interface ProctoringContextType extends ProctoringState {
  addViolation: (type: ViolationType, metadata?: Record<string, unknown>) => void;
  startProctoring: () => void;
  stopProctoring: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  syncViolations: () => Promise<number | null>;
  flushEvidence: () => Promise<void>;
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
  periodicSnapshots: boolean;
  violationThresholds: Record<string, number>;
}

/**
 * Captures a JPEG frame from a video element entirely off the main thread
 * using createImageBitmap + OffscreenCanvas Worker.
 * Falls back to a plain canvas.toDataURL() on browsers that don't support OffscreenCanvas.
 * Returns an ArrayBuffer (raw JPEG bytes) for direct upload — no Base64.
 */
async function captureFrame(
  video: HTMLVideoElement,
  width: number,
  height: number,
  quality = 0.6
): Promise<ArrayBuffer> {
  // Off-thread path (Chrome, Edge, Firefox)
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
            if (e.data.type === "DONE") resolve(e.data.buffer as ArrayBuffer);
            else reject(new Error(e.data.message));
          };
          worker.onerror = (err) => { worker.terminate(); reject(err); };
          worker.postMessage({ type: "CAPTURE", bitmap, width, height, quality }, [bitmap]);
        })
        .catch(reject);
    });
  }

  // Fallback: main-thread canvas (Safari)
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("toBlob returned null"));
          blob.arrayBuffer().then(resolve).catch(reject);
        },
        "image/jpeg",
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}

export const ProctoringProvider: React.FC<{
  children: React.ReactNode;
  sessionId: string;
  config: ProctoringConfigDto;
}> = ({ children, sessionId, config }) => {
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
  const uploadQueue = useRef(new UploadQueue(sessionId));

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

    // Record violation in store immediately (non-blocking)
    const newViolation = store.current.addViolation({ type, severity, metadata });
    setState(prev => ({
      ...prev,
      violations: [...prev.violations, newViolation],
      trustScore: store.current.getScore(),
    }));

    // For HIGH/CRITICAL: capture evidence frame off-thread and enqueue upload
    if (severity === "CRITICAL" || severity === "HIGH") {
      const video = document.querySelector<HTMLVideoElement>("video");
      if (video && !video.paused && !video.ended) {
        captureFrame(video, 640, 480, 0.6)
          .then((buffer) => {
            uploadQueue.current.enqueue({
              buffer,
              evidenceType: "VIOLATION_FRAME",
              violationType: type,
              capturedAt: Date.now(),
            });
          })
          .catch((err) => console.error("Evidence capture failed:", err));
      }
      // Sync trust score immediately for critical violations
      store.current.syncSingleViolation(newViolation)
        .then(score => { if (score !== null) setState(prev => ({ ...prev, trustScore: score })); })
        .catch(err => console.error("Failed to sync violation:", err));
    }
  }, []);

  const handleViolation = useCallback((type: ViolationType, meta?: Record<string, unknown>) => {
    addViolation(type, meta || {});
  }, [addViolation]);

  const { videoRef } = useCameraMonitor(state.isProctoringActive && config.camera, handleViolation);
  useTabMonitor(state.isProctoringActive && config.tabSwitch, handleViolation);
  useDevToolsDetector(state.isProctoringActive && config.devtools, () => addViolation("DEVTOOLS_OPEN"));
  useAudioMonitor(state.isProctoringActive && config.audio, handleViolation);

  // Periodic Object Detection with Dynamic Degradation
  useEffect(() => {
    if (!state.isProctoringActive || !config.objectDetection || !videoRef.current) return;
    let checkInterval = 5000;
    let timeoutId: NodeJS.Timeout;
    const runObjectDetection = async () => {
      if (!state.isProctoringActive || !config.objectDetection) return;
      if (videoRef.current) {
        try {
          const t0 = performance.now();
          const suspicious = await objectDetector.current.detect(videoRef.current);
          const duration = performance.now() - t0;
          if (duration > 3000) checkInterval = 60000;
          else if (duration > 1500) checkInterval = 30000;
          else if (duration > 800) checkInterval = 15000;
          else checkInterval = 5000;
          if (suspicious.length > 0) addViolation("BACKGROUND_OBJECT", { objects: suspicious.map(s => s.class) });
        } catch (e) { console.error("Object detection error:", e); }
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
        await behaviorAnalyzer.current.analyzeSequence(
          recentViolations.map(v => ({ type: v.type, timestamp: v.timestamp }))
        );
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [state.isProctoringActive, config.llmDetector, state.violations]);

  /**
   * HIGH mode: Periodic audit snapshot at a random interval between 1 and 5 minutes.
   * Captures off-thread and enqueues upload — never blocks the main thread.
   * Only active when config.periodicSnapshots === true (HIGH / CUSTOM modes).
   */
  useEffect(() => {
    if (!state.isProctoringActive || !config.camera || !config.periodicSnapshots) return;

    let timeoutId: NodeJS.Timeout;

    const scheduleNextSnapshot = () => {
      // Random interval between 1 minute (60,000ms) and 5 minutes (300,000ms)
      const randomIntervalMs = Math.floor(Math.random() * (300000 - 60000 + 1)) + 60000;

      timeoutId = setTimeout(() => {
        const video = document.querySelector<HTMLVideoElement>("video");
        if (video && !video.paused && !video.ended) {
          captureFrame(video, 640, 480, 0.6)
            .then((buffer) => {
              uploadQueue.current.enqueue({
                buffer,
                evidenceType: "AUDIT_FRAME",
                capturedAt: Date.now(),
              });
              console.log(`📸 Audit snapshot enqueued. Next in ${Math.round(randomIntervalMs / 1000)}s.`);
            })
            .catch((e) => console.error("Periodic snapshot capture failed:", e));
        }
        scheduleNextSnapshot();
      }, randomIntervalMs);
    };

    scheduleNextSnapshot();
    return () => clearTimeout(timeoutId);
  }, [state.isProctoringActive, config.camera, config.periodicSnapshots]);

  // Initial load & AI model init
  useEffect(() => {
    setState(prev => ({
      ...prev,
      violations: store.current.getAll(),
      trustScore: store.current.getScore(),
    }));
    objectDetector.current.init();
    behaviorAnalyzer.current.init();
  }, [sessionId]);

  // Re-sync offline violations when connection restores
  useEffect(() => {
    const handleOnline = () => {
      store.current.syncUnsynced().then(score => {
        if (score !== null) setState(prev => ({ ...prev, trustScore: score }));
      }).catch(err => console.error("Failed to sync offline queue:", err));
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const startProctoring = () => setState(prev => ({ ...prev, isProctoringActive: true }));
  const stopProctoring = () => setState(prev => ({ ...prev, isProctoringActive: false }));

  const syncViolations = useCallback(async () => {
    const score = await store.current.syncToBackend();
    if (score !== null) setState(prev => ({ ...prev, trustScore: score }));
    return score;
  }, []);

  /** Flush pending evidence uploads — call on test submit */
  const flushEvidence = useCallback(async () => {
    await uploadQueue.current.flush();
  }, []);

  return (
    <ProctoringContext.Provider value={{
      ...state,
      addViolation,
      startProctoring,
      stopProctoring,
      videoRef,
      syncViolations,
      flushEvidence,
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
