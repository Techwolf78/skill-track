import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnswerStore } from "../../lib/exam/answerStorage";
import { apiClient } from "../../lib/api-client";
import { testService } from "../../lib/test-service";

// Mock the dependencies
vi.mock("../../lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock("../../lib/test-service", () => ({
  testService: {
    submitCode: vi.fn(),
  },
}));

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: () => "mocked-uuid-1234",
});

describe("AnswerStore", () => {
  const sessionId = "session-123";
  const questionId = "question-456";

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
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
    it("should queue offline submissions and avoid duplicates for same questionId", () => {
      const sub1 = AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", 1);
      expect(sub1).toEqual({
        id: "mocked-uuid-1234",
        questionId: "q1",
        type: "MCQ",
        payload: 1,
        timestamp: expect.any(Number),
      });

      // Queue another for same question to test duplicate filtration
      AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", 2);

      const queue = AnswerStore.getOfflineQueue(sessionId);
      expect(queue.length).toBe(1);
      expect(queue[0].payload).toBe(2);
    });

    it("should remove items from queue by id", () => {
      AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", 1);
      const queueBefore = AnswerStore.getOfflineQueue(sessionId);
      expect(queueBefore.length).toBe(1);

      AnswerStore.removeFromQueue(sessionId, "mocked-uuid-1234");
      const queueAfter = AnswerStore.getOfflineQueue(sessionId);
      expect(queueAfter.length).toBe(0);
    });
  });

  describe("Sync Offline Queue", () => {
    it("should successfully sync MCQ and CODING submissions sequentially", async () => {
      // Mock APIs
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
      vi.mocked(testService.submitCode).mockResolvedValue("submission-id-999");

      // Queue an MCQ
      AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", 3);
      // Queue a Coding
      AnswerStore.queueOfflineSubmission(sessionId, "q2", "CODING", { language: "typescript", code: "let a = 1;" });

      const onProgress = vi.fn();

      const success = await AnswerStore.syncOfflineQueue(sessionId, onProgress);

      expect(success).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith("/submissions", {
        sessionId,
        questionId: "q1",
        selectedOptionIds: [3],
        saveVersion: 0,
      });
      expect(apiClient.post).toHaveBeenCalledWith("/submissions", {
        sessionId,
        questionId: "q2",
        answerText: "let a = 1;",
        language: "typescript",
        saveVersion: 0,
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
      vi.mocked(apiClient.post).mockRejectedValue(new Error("Network Error"));

      AnswerStore.queueOfflineSubmission(sessionId, "q1", "MCQ", 3);

      const onProgress = vi.fn();
      const success = await AnswerStore.syncOfflineQueue(sessionId, onProgress);

      expect(success).toBe(false);
      expect(onProgress).toHaveBeenCalledWith("q1", false);
      expect(AnswerStore.getOfflineQueue(sessionId).length).toBe(1);
    });

    it("should handle validation failures (e.g. invalid questionId, null queueing) gracefully", () => {
      // Test queueing with empty payload/id
      const sub = AnswerStore.queueOfflineSubmission(sessionId, "", "MCQ", null);
      expect(sub.questionId).toBe("");
      expect(sub.payload).toBeNull();
      expect(AnswerStore.getOfflineQueue(sessionId).length).toBe(1);
    });

    it("should handle boundary cases (extreme payload sizes and multi-select formats)", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
      
      const complexPayload = {
        selectedOptionIds: Array.from({ length: 1000 }, (_, i) => i),
        notes: "a".repeat(10000)
      };
      
      AnswerStore.queueOfflineSubmission(sessionId, "q-boundary", "MCQ", complexPayload);
      const success = await AnswerStore.syncOfflineQueue(sessionId);
      expect(success).toBe(true);
      expect(AnswerStore.getOfflineQueue(sessionId).length).toBe(0);
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
      vi.mocked(apiClient.post).mockRejectedValue(expiredError);

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
