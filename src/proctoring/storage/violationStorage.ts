import { Violation, Severity } from "../../types/proctoring.types";
import { apiClient } from "../../lib/api-client";

const VIOLATIONS_KEY = "proctor_violations";

export class ViolationStore {
  private sessionId: string;
  
  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }
  
  addViolation(violation: Omit<Violation, "id" | "timestamp" | "resolved">): Violation {
    const all = this.getAll();
    const newViolation: Violation & { synced?: boolean } = {
      ...violation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      resolved: false,
      synced: false
    };
    all.push(newViolation);
    this.save(all);
    return newViolation;
  }

  private mapToBackendPayload(v: Violation) {
    let backendType = v.type as string;
    if (v.type === "DEVTOOLS_OPEN") {
      backendType = "DEVTOOLS";
    } else if (v.type === "SPEECH") {
      backendType = "SUSPICIOUS_AUDIO";
    } else if (v.type === "BACKGROUND_OBJECT") {
      backendType = "OBJECT_DETECTED";
    } else if (v.type === "EXTENDED_TAB_SWITCH" || v.type === "COPY_PASTE") {
      backendType = "TAB_SWITCH";
    } else if (v.type === "UNUSUAL_BEHAVIOR") {
      backendType = "LOOK_AWAY";
    }

    return {
      clientEventId: v.id,
      type: backendType,
      timestamp: v.timestamp,
      severity: v.severity,
      evidence: v.evidence || null,
      metadata: v.metadata || {}
    };
  }

async retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  backoff = 2
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.retryWithBackoff(fn, retries - 1, delay * backoff, backoff);
  }
}

  async syncToBackend(): Promise<number | null> {
    const violations = this.getAll();
    if (violations.length === 0) return null;
    
    try {
      const response = await this.retryWithBackoff(async () => {
        return await apiClient.post(`/test-sessions/${this.sessionId}/violations/batch`, {
          violations: violations.map(v => this.mapToBackendPayload(v)),
        });
      });
      const updated = violations.map(v => ({ ...v, synced: true }));
      this.save(updated);
      
      const serverScore = response.data?.data?.score;
      return typeof serverScore === "number" ? serverScore : null;
    } catch (error) {
      console.error("Failed to sync violations to backend after retries:", error);
      return null;
    }
  }

  async syncSingleViolation(violation: Violation): Promise<number | null> {
    try {
      const payload = this.mapToBackendPayload(violation);
      const response = await this.retryWithBackoff(async () => {
        return await apiClient.post(`/test-sessions/${this.sessionId}/violations`, payload);
      });
      
      const all = this.getAll();
      const updated = all.map(v => v.id === violation.id ? { ...v, synced: true } : v);
      this.save(updated);
      
      const serverScore = response.data?.data?.score;
      return typeof serverScore === "number" ? serverScore : null;
    } catch (error) {
      console.error("Failed to sync single violation to backend after retries:", error);
      return null;
    }
  }

  async syncUnsynced(): Promise<number | null> {
    const all = this.getAll();
    const unsynced = all.filter(v => !(v as any).synced);
    if (unsynced.length === 0) return null;

    try {
      const response = await this.retryWithBackoff(async () => {
        return await apiClient.post(`/test-sessions/${this.sessionId}/violations/batch`, {
          violations: unsynced.map(v => this.mapToBackendPayload(v)),
        });
      });
      const updated = all.map(v => ({ ...v, synced: true }));
      this.save(updated);
      
      const serverScore = response.data?.data?.score;
      return typeof serverScore === "number" ? serverScore : null;
    } catch (error) {
      console.error("Failed to sync unsynced violations after retries:", error);
      return null;
    }
  }
  
  getAll(): Violation[] {
    const data = localStorage.getItem(`${VIOLATIONS_KEY}_${this.sessionId}`);
    return data ? JSON.parse(data) : [];
  }
  
  private save(violations: Violation[]) {
    localStorage.setItem(`${VIOLATIONS_KEY}_${this.sessionId}`, JSON.stringify(violations));
  }
  
  getScore(): number {
    const violations = this.getAll();
    let score = 100;
    
    for (const v of violations) {
      if (!v.resolved) {
        switch (v.severity) {
          case "LOW": score -= 2; break;
          case "MEDIUM": score -= 5; break;
          case "HIGH": score -= 10; break;
          case "CRITICAL": score -= 20; break;
        }
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  clear() {
    localStorage.removeItem(`${VIOLATIONS_KEY}_${this.sessionId}`);
  }
}
