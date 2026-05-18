import { pipeline } from "@xenova/transformers";
import { ViolationType } from "../../types/proctoring.types";

export class LLMBehaviorAnalyzer {
  private classifier: unknown = null;
  private isInitializing = false;
  
  async init() {
    if (this.classifier || this.isInitializing) return;
    this.isInitializing = true;
    try {
      // Using a small model for browser performance
      this.classifier = await pipeline("text-classification", "Xenova/distilbert-base-uncased-finetuned-sst-2-english");
    } catch (err) {
      console.error("Failed to initialize LLM analyzer:", err);
    } finally {
      this.isInitializing = false;
    }
  }
  
  async analyzeSequence(actions: Array<{ type: ViolationType, timestamp: number }>) {
    if (!this.classifier) return null;
    
    // Convert action sequence to text representation
    // e.g., "TAB_SWITCH TAB_SWITCH LOOK_AWAY SPEECH"
    const sequenceStr = actions.map(a => a.type).join(" ");
    
    // In a real scenario, we'd have a specific model for cheating patterns
    // Here we use a generic sentiment/classification as a placeholder for "suspicious" detection
    try {
      const result = await (this.classifier as (text: string) => Promise<unknown>)(sequenceStr);
      return result;
    } catch (err) {
      console.error("LLM analysis error:", err);
      return null;
    }
  }
}
