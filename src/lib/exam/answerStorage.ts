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
  payload: any;
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
  saveAnswer(sessionId: string, questionId: string, answer: any): void {
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

  getAnswers(sessionId: string): Record<string, any> {
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
  queueOfflineSubmission(sessionId: string, questionId: string, type: "MCQ" | "CODING", payload: any): OfflineSubmission {
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

  async syncOfflineQueue(sessionId: string, onProgress?: (questionId: string, success: boolean, result?: any) => void): Promise<boolean> {
    const queue = this.getOfflineQueue(sessionId);
    if (queue.length === 0) return true;
    
    console.log(`🌐 Syncing ${queue.length} offline submissions...`);
    let allSuccess = true;
    
    // Process sequentially to avoid race conditions
    for (const item of queue) {
      try {
        let result: any = null;
        if (item.type === "MCQ") {
          await apiClient.post("/submissions", {
            sessionId: sessionId,
            questionId: item.questionId,
            selectedOptionIds: [item.payload]
          });
          // Save to local answers status
          this.saveAnswer(sessionId, item.questionId, item.payload);
        } else if (item.type === "CODING") {
          // Trigger submission
          const submissionId = await testService.submitCode({
            sessionId: sessionId,
            questionId: item.questionId,
            language: item.payload.language,
            sourceCode: item.payload.code
          });
          
          // Try to poll for result immediately since we are back online
          // But do not block sync completely if polling takes time.
          // We can let the background polling in TestInterface handle it, 
          // or do a quick check here.
          result = { submissionId, status: "PENDING", code: item.payload.code, language: item.payload.language };
          this.saveAnswer(sessionId, item.questionId, result);
        }
        
        // Remove from queue
        this.removeFromQueue(sessionId, item.id);
        if (onProgress) {
          onProgress(item.questionId, true, result);
        }
      } catch (err) {
        console.error(`Failed to sync offline submission for question ${item.questionId}:`, err);
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
