/**
 * Question bank filtering and validation logic.
 */

export type QuestionType = "MCQ" | "CODING";

export interface QuestionFilter {
  subjectId?: string;
  topicId?: string;
  subtopicId?: string;
  type?: QuestionType;
}

export interface QuestionSummary {
  id: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string;
  type: QuestionType;
  prompt: string;
  marks: number;
}

/** Applies zero or more filters to a question list. Non-specified filters are ignored. */
export const applyQuestionFilters = (
  questions: QuestionSummary[],
  filters: QuestionFilter
): QuestionSummary[] =>
  questions.filter((q) => {
    if (filters.subjectId && q.subjectId !== filters.subjectId) return false;
    if (filters.topicId && q.topicId !== filters.topicId) return false;
    if (filters.subtopicId && q.subtopicId !== filters.subtopicId) return false;
    if (filters.type && q.type !== filters.type) return false;
    return true;
  });

/** Returns true when an MCQ question has a non-blank prompt and at least 2 options. */
export const isValidMCQQuestion = (
  q: Partial<QuestionSummary> & { options?: { id: string; text: string }[] }
): boolean => {
  if (!q.prompt || q.prompt.trim() === "") return false;
  if (!q.options || q.options.length < 2) return false;
  return true;
};

/** Returns true when a coding question has a non-blank prompt. */
export const isValidCodingQuestion = (
  q: Partial<QuestionSummary>
): boolean => !!(q.prompt && q.prompt.trim() !== "");
