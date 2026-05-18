export type ViolationType = 
  | "TAB_SWITCH" 
  | "EXTENDED_TAB_SWITCH"
  | "MULTI_FACE" 
  | "LOOK_AWAY" 
  | "SPEECH" 
  | "DEVTOOLS_OPEN" 
  | "COPY_PASTE" 
  | "SCREEN_RECORD" 
  | "BACKGROUND_OBJECT"
  | "UNUSUAL_BEHAVIOR";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Violation {
  id: string;
  type: ViolationType;
  timestamp: number;
  severity: Severity;
  evidence?: string; // base64 screenshot/frame
  metadata: Record<string, unknown>;
  resolved: boolean;
}

export interface ProctoringState {
  violations: Violation[];
  trustScore: number;
  isProctoringActive: boolean;
  cameraActive: boolean;
  screenActive: boolean;
  micActive: boolean;
}

export interface ProctoringConfig {
  sessionId: string;
  enabledRules: ViolationType[];
  thresholds: {
    maxViolationsBeforeSuspension: number;
    criticalViolationScore: number;
  };
}
