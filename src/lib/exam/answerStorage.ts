import { apiClient } from "../api-client";
import { testService } from "../test-service";

const DRAFTS_PREFIX = "rxone_code_drafts";
const ANSWERS_PREFIX = "rxone_answers";
const OFFLINE_QUEUE_PREFIX = "rxone_offline_queue";

interface CodeDraft {
  code: string;
  language: string;
  timestamp: number;
}

export interface OfflineSubmission {
  id: string;
  questionId: string;
  type: "MCQ" | "CODING";
  payload: unknown;
  timestamp: number;
}

export const AnswerStore = {
  // ==================== Code Drafts ====================
  saveDraft(sessionId: string, questionId: string, language: string, code: string): void {
    try {
      const key = `${DRAFTS_PREFIX}_${sessionId}`;
      const draftsRaw = localStorage.getItem(key);
      const drafts = draftsRaw ? JSON.parse(draftsRaw) : {};
      
      if (!drafts[questionId]) {
        drafts[questionId] = {};
      }
      
      drafts[questionId][language] = {
        code,
        language,
        timestamp: Date.now()
      };
      
      localStorage.setItem(key, JSON.stringify(drafts));
    } catch (e) {
      console.error("Failed to save code draft to localStorage:", e);
    }
  },

  getDraft(sessionId: string, questionId: string, language: string): string | null {
    try {
      const key = `${DRAFTS_PREFIX}_${sessionId}`;
      const draftsRaw = localStorage.getItem(key);
      if (!draftsRaw) return null;
      
      const drafts = JSON.parse(draftsRaw);
      return drafts[questionId]?.[language]?.code || null;
    } catch (e) {
      console.error("Failed to read code draft from localStorage:", e);
      return null;
    }
  },

  // ==================== Saved Answers (Completed status) ====================
  saveAnswer(sessionId: string, questionId: string, answer: unknown): void {
    try {
      const key = `${ANSWERS_PREFIX}_${sessionId}`;
      const answersRaw = localStorage.getItem(key);
      const answers = answersRaw ? JSON.parse(answersRaw) : {};
      
      answers[questionId] = answer;
      localStorage.setItem(key, JSON.stringify(answers));
    } catch (e) {
      console.error("Failed to save answer to localStorage:", e);
    }
  },

  getAnswers(sessionId: string): Record<string, unknown> {
    try {
      const key = `${ANSWERS_PREFIX}_${sessionId}`;
      const answersRaw = localStorage.getItem(key);
      return answersRaw ? JSON.parse(answersRaw) : {};
    } catch (e) {
      console.error("Failed to get answers from localStorage:", e);
      return {};
    }
  },

  // ==================== Offline Submission Queue ====================
  queueOfflineSubmission(sessionId: string, questionId: string, type: "MCQ" | "CODING", payload: unknown): OfflineSubmission {
    const queueKey = `${OFFLINE_QUEUE_PREFIX}_${sessionId}`;
    const queueRaw = localStorage.getItem(queueKey);
    const queue: OfflineSubmission[] = queueRaw ? JSON.parse(queueRaw) : [];
    
    // Remove duplicate offline items for same question to avoid spamming syncs
    const filteredQueue = queue.filter(item => item.questionId !== questionId);
    
    const newSubmission: OfflineSubmission = {
      id: crypto.randomUUID(),
      questionId,
      type,
      payload,
      timestamp: Date.now()
    };
    
    filteredQueue.push(newSubmission);
    localStorage.setItem(queueKey, JSON.stringify(filteredQueue));
    return newSubmission;
  },

  getOfflineQueue(sessionId: string): OfflineSubmission[] {
    try {
      const queueKey = `${OFFLINE_QUEUE_PREFIX}_${sessionId}`;
      const queueRaw = localStorage.getItem(queueKey);
      return queueRaw ? JSON.parse(queueRaw) : [];
    } catch (e) {
      console.error("Failed to get offline queue:", e);
      return [];
    }
  },

  removeFromQueue(sessionId: string, id: string): void {
    try {
      const queueKey = `${OFFLINE_QUEUE_PREFIX}_${sessionId}`;
      const queueRaw = localStorage.getItem(queueKey);
      if (!queueRaw) return;
      
      const queue: OfflineSubmission[] = JSON.parse(queueRaw);
      const updated = queue.filter(item => item.id !== id);
      localStorage.setItem(queueKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to remove item from offline queue:", e);
    }
  },

  async syncOfflineQueue(sessionId: string, onProgress?: (questionId: string, success: boolean, result?: unknown) => void): Promise<boolean> {
    const queue = this.getOfflineQueue(sessionId);
    if (queue.length === 0) return true;
    
    console.log(`🌐 Syncing ${queue.length} offline submissions...`);
    let allSuccess = true;
    
    // Process sequentially to avoid race conditions
    for (const item of queue) {
      try {
        let result: unknown = null;
        if (item.type === "MCQ") {
          const payloadVal = item.payload && typeof item.payload === "object" && "value" in item.payload ? item.payload.value : item.payload;
          const versionVal = item.payload && typeof item.payload === "object" && "saveVersion" in item.payload ? item.payload.saveVersion : 0;
          await apiClient.post("/submissions", {
            sessionId: sessionId,
            questionId: item.questionId,
            selectedOptionIds: [payloadVal],
            saveVersion: versionVal
          });
          this.saveAnswer(sessionId, item.questionId, payloadVal);
        } else if (item.type === "CODING") {
          const codeVal = item.payload?.code || "";
          const langVal = item.payload?.language || "python3";
          const versionVal = item.payload?.saveVersion || 0;

          await apiClient.post("/submissions", {
            sessionId: sessionId,
            questionId: item.questionId,
            answerText: codeVal,
            language: langVal,
            saveVersion: versionVal
          });

          result = { code: codeVal, language: langVal };
          this.saveAnswer(sessionId, item.questionId, result);
        }
        
        // Remove from queue
        this.removeFromQueue(sessionId, item.id);
        if (onProgress) {
          onProgress(item.questionId, true, result);
        }
      } catch (err: unknown) {
        console.error(`Failed to sync offline submission for question ${item.questionId}:`, err);
        // Expiry handling: stop queue retries on session expiration
        const axiosErr = err as { response?: { status: number; data?: { message?: string } } };
        if (axiosErr.response?.status === 400 && axiosErr.response?.data?.message?.includes("expired")) {
          AnswerStore.clearSession(sessionId);
          window.location.reload();
          return false;
        }
        allSuccess = false;
        if (onProgress) {
          onProgress(item.questionId, false);
        }
      }
    }
    
    return allSuccess;
  },

  clearSession(sessionId: string): void {
    try {
      localStorage.removeItem(`${DRAFTS_PREFIX}_${sessionId}`);
      localStorage.removeItem(`${ANSWERS_PREFIX}_${sessionId}`);
      localStorage.removeItem(`${OFFLINE_QUEUE_PREFIX}_${sessionId}`);
      localStorage.removeItem(`rxone_camera_snapshots_${sessionId}`);
    } catch (e) {
      console.error("Failed to clear localStorage keys:", e);
    }
  }
};
