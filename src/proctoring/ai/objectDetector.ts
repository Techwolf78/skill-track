import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";

export class ObjectDetector {
  private model: cocoSsd.ObjectDetection | null = null;
  private isInitializing = false;

  async init() {
    if (this.model || this.isInitializing) return;
    this.isInitializing = true;
    try {
      this.model = await cocoSsd.load();
    } catch (err) {
      console.error("Failed to load COCO-SSD model:", err);
    } finally {
      this.isInitializing = false;
    }
  }

  async detect(video: HTMLVideoElement) {
    if (!this.model) return [];
    try {
      const predictions = await this.model.detect(video);
      if (predictions.length > 0) {
        console.log("🔍 Object Detector found:", predictions.map(p => `${p.class} (${Math.round(p.score * 100)}%)`).join(", "));
      }
      
      // Filter for suspicious objects
      const suspicious = predictions.filter(p => 
        ["cell phone", "book", "laptop", "tablet", "remote", "calculator", "mobile phone"].includes(p.class) && p.score > 0.4
      );
      return suspicious;
    } catch (err) {
      console.error("Object detection error:", err);
      return [];
    }
  }
}
