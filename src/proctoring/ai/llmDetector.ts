import { ViolationType } from "../../types/proctoring.types";

const SEVERITY_WEIGHTS: Record<ViolationType, number> = {
  DEVTOOLS_OPEN: 0.95,
  SCREEN_RECORD: 0.95,
  BACKGROUND_OBJECT: 0.75,
  EXTENDED_TAB_SWITCH: 0.70,
  TAB_SWITCH: 0.60,
  COPY_PASTE: 0.50,
  MULTI_FACE: 0.50,
  SPEECH: 0.40,
  LOOK_AWAY: 0.30,
  UNUSUAL_BEHAVIOR: 0.50,
};

export interface AnalyzerResult {
  label: "POSITIVE" | "NEGATIVE";
  score: number;
}

export class LLMBehaviorAnalyzer {
  private classifier: unknown = null;
  private isInitializing = false;
  
  async init() {
    if (this.classifier || this.isInitializing) return;
    this.isInitializing = true;
    try {
      // Instantly initialize mock classifier to satisfy API contracts without loading heavy packages
      this.classifier = { ruleBased: true };
      console.log("⚡ Optimized rule-based behavior analyzer initialized successfully (0MB overhead).");
    } catch (err) {
      console.error("Failed to initialize behavior analyzer:", err);
    } finally {
      this.isInitializing = false;
    }
  }
  
  async analyzeSequence(actions: Array<{ type: ViolationType, timestamp: number }>): Promise<AnalyzerResult[] | null> {
    if (!this.classifier) return null;
    if (actions.length === 0) {
      return [{ label: "NEGATIVE", score: 0.0 }];
    }
    
    try {
      let sumWeight = 0;
      let maxWeight = 0;

      for (const action of actions) {
        const weight = SEVERITY_WEIGHTS[action.type] || 0.2;
        sumWeight += weight;
        if (weight > maxWeight) maxWeight = weight;
      }

      // Calculate the base average weight of recent actions
      const avgWeight = sumWeight / actions.length;

      // Higher violation frequency (3+ actions) increases the suspicion multiplier
      const frequencyMultiplier = actions.length >= 3 ? 1.25 : 1.0;

      // If violations are happening rapidly in succession (e.g. within 2 minutes), boost suspicion
      let temporalBoost = 1.0;
      if (actions.length > 1) {
        const timestamps = actions.map(a => a.timestamp);
        const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
        if (timeSpan > 0 && timeSpan < 120000) {
          temporalBoost = 1.3;
        }
      }

      // Compute suspicion score bound to [0, 1]
      const suspicionScore = Math.min(1.0, avgWeight * frequencyMultiplier * temporalBoost);

      // Classify as POSITIVE (suspicious sequence) if score is above threshold (0.65)
      const isSuspicious = suspicionScore >= 0.65;

      return [
        {
          label: isSuspicious ? "POSITIVE" : "NEGATIVE",
          score: suspicionScore
        }
      ];
    } catch (err) {
      console.error("Behavior analyzer sequence classification error:", err);
      return null;
    }
  }
}

