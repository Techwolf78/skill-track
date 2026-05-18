import { Violation, Severity } from "../../types/proctoring.types";

const VIOLATIONS_KEY = "proctor_violations";

export class ViolationStore {
  private sessionId: string;
  
  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }
  
  addViolation(violation: Omit<Violation, "id" | "timestamp" | "resolved">): Violation {
    const all = this.getAll();
    const newViolation: Violation = {
      ...violation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      resolved: false
    };
    all.push(newViolation);
    this.save(all);
    return newViolation;
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
