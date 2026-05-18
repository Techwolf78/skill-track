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

interface ProctoringContextType extends ProctoringState {
  addViolation: (type: ViolationType, metadata?: Record<string, unknown>) => void;
  startProctoring: () => void;
  stopProctoring: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
      case "TAB_SWITCH": severity = "MEDIUM"; break;
      case "EXTENDED_TAB_SWITCH": severity = "HIGH"; break;
      case "SPEECH": severity = "MEDIUM"; break;
      case "DEVTOOLS_OPEN": severity = "CRITICAL"; break;
      case "BACKGROUND_OBJECT": severity = "HIGH"; break;
      case "SCREEN_RECORD": severity = "CRITICAL"; break;
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

    // Removed redundant sonner toast to avoid duplicate notifications
  }, []);

  const handleViolation = useCallback((type: ViolationType, meta?: Record<string, unknown>) => {
    addViolation(type, meta || {});
  }, [addViolation]);

  const { videoRef } = useCameraMonitor(state.isProctoringActive, handleViolation);
  useTabMonitor(state.isProctoringActive, handleViolation);
  useDevToolsDetector(state.isProctoringActive, () => addViolation("DEVTOOLS_OPEN"));
  useAudioMonitor(state.isProctoringActive, handleViolation);
  // useScreenMonitor(state.isProctoringActive, handleViolation);

  // Periodic Object Detection
  useEffect(() => {
    if (!state.isProctoringActive || !videoRef.current) return;

    const interval = setInterval(async () => {
      if (videoRef.current) {
        const suspicious = await objectDetector.current.detect(videoRef.current);
        if (suspicious.length > 0) {
          addViolation("BACKGROUND_OBJECT", { objects: suspicious.map(s => s.class) });
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
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

  const startProctoring = () => setState(prev => ({ ...prev, isProctoringActive: true }));
  const stopProctoring = () => setState(prev => ({ ...prev, isProctoringActive: false }));

  return (
    <ProctoringContext.Provider value={{ 
      ...state, 
      addViolation, 
      startProctoring, 
      stopProctoring,
      videoRef 
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
