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

  async syncToBackend(): Promise<boolean> {
    const violations = this.getAll();
    if (violations.length === 0) return true;
    
    try {
      await apiClient.post(`/test-sessions/${this.sessionId}/violations/batch`, {
        violations,
      });
      const updated = violations.map(v => ({ ...v, synced: true }));
      this.save(updated);
      return true;
    } catch (error) {
      console.error("Failed to sync violations to backend:", error);
      return false;
    }
  }

  async syncSingleViolation(violation: Violation): Promise<boolean> {
    try {
      await apiClient.post(`/test-sessions/${this.sessionId}/violations`, violation);
      
      const all = this.getAll();
      const updated = all.map(v => v.id === violation.id ? { ...v, synced: true } : v);
      this.save(updated);
      
      return true;
    } catch (error) {
      console.error("Failed to sync single violation to backend:", error);
      return false;
    }
  }

  async syncUnsynced(): Promise<boolean> {
    const all = this.getAll();
    const unsynced = all.filter(v => !(v as any).synced);
    if (unsynced.length === 0) return true;

    try {
      await apiClient.post(`/test-sessions/${this.sessionId}/violations/batch`, {
        violations: unsynced,
      });
      const updated = all.map(v => ({ ...v, synced: true }));
      this.save(updated);
      return true;
    } catch (error) {
      console.error("Failed to sync unsynced violations:", error);
      return false;
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
          case "LOW": score -= 5; break;
          case "MEDIUM": score -= 15; break;
          case "HIGH": score -= 35; break;
          case "CRITICAL": score -= 60; break;
        }
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  clear() {
    localStorage.removeItem(`${VIOLATIONS_KEY}_${this.sessionId}`);
  }
}
