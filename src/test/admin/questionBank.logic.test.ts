import { describe, it, expect } from "vitest";
import {
  applyQuestionFilters,
  isValidMCQQuestion,
  isValidCodingQuestion,
  type QuestionSummary,
} from "../../lib/admin/questionBank";

describe("Question Bank Logic", () => {
  const questions: QuestionSummary[] = [
    { id: "q1", subjectId: "sub-1", topicId: "top-1", type: "MCQ", prompt: "What is OOP?", marks: 5 },
    { id: "q2", subjectId: "sub-1", topicId: "top-2", type: "CODING", prompt: "Write binary search", marks: 10 },
    { id: "q3", subjectId: "sub-2", topicId: "top-1", type: "MCQ", prompt: "What is polymorphism?", marks: 5 },
    { id: "q4", subjectId: "sub-1", topicId: "top-1", subtopicId: "sub-top-1", type: "CODING", prompt: "Sort array", marks: 10 },
  ];

  describe("applyQuestionFilters", () => {
    it("should filter by subjectId", () => {
      expect(applyQuestionFilters(questions, { subjectId: "sub-1" })).toHaveLength(3);
    });

    it("should filter by topicId", () => {
      expect(applyQuestionFilters(questions, { topicId: "top-1" })).toHaveLength(3);
    });

    it("should filter by question type", () => {
      expect(applyQuestionFilters(questions, { type: "CODING" })).toHaveLength(2);
    });

    it("should apply combined filters", () => {
      const result = applyQuestionFilters(questions, { subjectId: "sub-1", type: "MCQ" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("q1");
    });

    it("should return all questions when no filters applied", () => {
      expect(applyQuestionFilters(questions, {})).toHaveLength(4);
    });
  });

  describe("isValidMCQQuestion", () => {
    it("should return true for valid MCQ", () => {
      expect(isValidMCQQuestion({
        prompt: "Question?",
        options: [{ id: "o1", text: "A" }, { id: "o2", text: "B" }],
      })).toBe(true);
    });

    it("should return false when prompt is blank", () => {
      expect(isValidMCQQuestion({ prompt: "", options: [{ id: "o1", text: "A" }, { id: "o2", text: "B" }] })).toBe(false);
    });

    it("should return false when fewer than 2 options", () => {
      expect(isValidMCQQuestion({ prompt: "Q?", options: [{ id: "o1", text: "A" }] })).toBe(false);
    });
  });

  describe("isValidCodingQuestion", () => {
    it("should return true for valid coding question", () => {
      expect(isValidCodingQuestion({ prompt: "Write a sort function" })).toBe(true);
    });

    it("should return false for blank prompt", () => {
      expect(isValidCodingQuestion({ prompt: "  " })).toBe(false);
    });
  });
});
