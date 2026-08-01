import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnswerStore, computeContentHash } from "../../lib/exam/answerStorage";
import { apiClient } from "../../lib/api-client";
import { testService } from "../../lib/test-service";

// Mock the dependencies
vi.mock("../../lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("../../lib/test-service", () => ({
  testService: {
    submitCode: vi.fn(),
    saveQuestionAnswer: vi.fn(),
  },
}));

// Mock crypto.randomUUID and crypto.subtle for node environment testing
if (!globalThis.crypto) {
  vi.stubGlobal("crypto", {
    randomUUID: () => "mocked-uuid-1234",
  });
}

describe("AnswerStore", () => {
  const sessionId = "session-123";
  const questionId = "question-456";

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("computeContentHash", () => {
    it("should generate consistent SHA-256 or fallback hash for string input", async () => {
      const hash1 = await computeContentHash("function test() {}");
      const hash2 = await computeContentHash("function test() {}");
      const emptyHash = await computeContentHash("");

      expect(hash1).toBeTruthy();
      expect(hash1).toBe(hash2);
      expect(emptyHash).toBe("");
    });
  });

  describe("Code Drafts", () => {
    it("should save and retrieve a code draft", () => {
      AnswerStore.saveDraft(sessionId, questionId, "typescript", "console.log('hello')");
      const draft = AnswerStore.getDraft(sessionId, questionId, "typescript");
      expect(draft).toBe("console.log('hello')");
    });

    it("should return null if no draft exists", () => {
      const draft = AnswerStore.getDraft(sessionId, questionId, "javascript");
      expect(draft).toBeNull();
    });

    it("should handle error gracefully during localStorage operations", () => {
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("localStorage blocked");
      });
      const draft = AnswerStore.getDraft(sessionId, questionId, "typescript");
      expect(draft).toBeNull();
      getItemSpy.mockRestore();
    });
  });

  describe("Saved Answers", () => {
    it("should save and retrieve multiple answers for a session", () => {
      const answer1 = { selectedOptionIds: [1] };
      const answer2 = { code: "const x = 5;", language: "javascript" };

      AnswerStore.saveAnswer(sessionId, "q1", answer1);
      AnswerStore.saveAnswer(sessionId, "q2", answer2);

      const answers = AnswerStore.getAnswers(sessionId);
      expect(answers).toEqual({
        q1: answer1,
        q2: answer2,
      });
    });

    it("should return empty object if no answers saved", () => {
      expect(AnswerStore.getAnswers("non-existent")).toEqual({});
    });
  });

  describe("Offline Queue", () => {
    it("should queue offline submissions and coalesce duplicates for same questionId", () => {
      const timestamp = 1700000000000;
      const sub1 = AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", "opt-1", timestamp);
      expect(sub1).toEqual({
        id: expect.any(String),
        questionId: "q1",
        type: "MCQ",
        payload: "opt-1",
        timestamp: expect.any(Number),
        clientTimestamp: timestamp,
      });

      // Queue another for same question to test duplicate filtration (coalescing)
      AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", "opt-2", timestamp + 1000);

      const queue = AnswerStore.getOfflineQueue(sessionId);
      expect(queue.length).toBe(1);
      expect(queue[0].payload).toBe("opt-2");
      expect(queue[0].clientTimestamp).toBe(timestamp + 1000);
    });

    it("should remove items from queue by id", () => {
      const sub = AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", 1);
      const queueBefore = AnswerStore.getOfflineQueue(sessionId);
      expect(queueBefore.length).toBe(1);

      AnswerStore.removeFromQueue(sessionId, sub.id);
      const queueAfter = AnswerStore.getOfflineQueue(sessionId);
      expect(queueAfter.length).toBe(0);
    });
  });

  describe("Sync Offline Queue", () => {
    it("should successfully sync MCQ and CODING submissions sequentially via PUT answer endpoint", async () => {
      // Mock APIs
      vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true } });

      // Queue an MCQ
      const t1 = 1700000000000;
      const t2 = 1700000005000;
      AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", "opt-3", t1);
      // Queue a Coding
      AnswerStore.queueOfflineSubmission(sessionId, "q2", "CODING", { language: "typescript", code: "let a = 1;" }, t2);

      const onProgress = vi.fn();

      const success = await AnswerStore.syncOfflineQueue(sessionId, onProgress);

      expect(success).toBe(true);
      expect(apiClient.put).toHaveBeenCalledWith(`/test-sessions/${sessionId}/questions/q1/answer`, {
        answerText: "opt-3",
        clientTimestamp: t1,
      });
      expect(apiClient.put).toHaveBeenCalledWith(`/test-sessions/${sessionId}/questions/q2/answer`, {
        answerText: "let a = 1;",
        gradingLanguage: "typescript",
        clientTimestamp: t2,
      });

      // Verify progress callback calls
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, "q1", true, null);
      expect(onProgress).toHaveBeenNthCalledWith(2, "q2", true, {
        code: "let a = 1;",
        language: "typescript",
      });

      // Queue should now be empty
      expect(AnswerStore.getOfflineQueue(sessionId).length).toBe(0);
    });

    it("should return false if any item in the sync fails, leaving failed items in the queue", async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error("Network Error"));

      AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", 3);

      const onProgress = vi.fn();
      const success = await AnswerStore.syncOfflineQueue(sessionId, onProgress);

      expect(success).toBe(false);
      expect(onProgress).toHaveBeenCalledWith("q1", false);
      expect(AnswerStore.getOfflineQueue(sessionId).length).toBe(1);
    });

    it("should recover and trigger window reload / clear session when sync fails with an expired session error", async () => {
      const reloadMock = vi.fn();
      vi.stubGlobal("location", { reload: reloadMock });

      const expiredError = {
        response: {
          status: 400,
          data: { message: "session has expired" }
        }
      };
      vi.mocked(apiClient.put).mockRejectedValue(expiredError);

      AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", 3);
      const success = await AnswerStore.syncOfflineQueue(sessionId);

      expect(success).toBe(false);
      expect(reloadMock).toHaveBeenCalled();
      expect(AnswerStore.getOfflineQueue(sessionId).length).toBe(0); // cleared
    });
  });

  describe("Clear Session", () => {
    it("should clear all related localstorage keys", () => {
      AnswerStore.saveDraft(sessionId, "q1", "javascript", "code");
      AnswerStore.saveAnswer(sessionId, "q1", "ans");
      AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", "payload");

      AnswerStore.clearSession(sessionId);

      expect(AnswerStore.getDraft(sessionId, "q1", "javascript")).toBeNull();
      expect(AnswerStore.getAnswers(sessionId)).toEqual({});
      expect(AnswerStore.getOfflineQueue(sessionId)).toEqual([]);
    });
  });
});
