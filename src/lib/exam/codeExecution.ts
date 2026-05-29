/**
 * Code execution and grading result utilities.
 * Extracted from TestInterface.tsx for testability and reuse.
 */

export type SubmissionStatus =
  | "PENDING"
  | "PROCESSING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED";

export interface TestCaseRunResult {
  status: SubmissionStatus;
  passed?: boolean;
}

export interface GradingResult {
  status: SubmissionStatus;
  testCasesPassed: number;
  testCasesTotal: number;
}

/**
 * Returns true when a submission has reached a final (non-pending) state.
 * Used to break the polling loop in the submit-and-poll workflow.
 */
export const isTerminalStatus = (status: SubmissionStatus): boolean =>
  status !== "PENDING" && status !== "PROCESSING";

/**
 * Maps raw test case results from the run endpoint,
 * adding a boolean `passed` field for convenient consumption.
 */
export const mapTestCaseResults = (results: TestCaseRunResult[]) =>
  results.map((tc) => ({ ...tc, passed: tc.status === "ACCEPTED" }));

/**
 * Builds the output message shown after a full asynchronous submission grades.
 */
export const buildSubmitOutputMessage = (
  gradingResult: GradingResult
): { type: "success" | "error"; message: string } => {
  if (gradingResult.status === "ACCEPTED") {
    return { type: "success", message: "✓ All test cases passed!" };
  }
  return {
    type: "error",
    message: `✗ ${gradingResult.status}: ${gradingResult.testCasesPassed}/${gradingResult.testCasesTotal} passed`,
  };
};

/**
 * Builds the output message shown after a synchronous "Run Code" execution.
 */
export const buildRunOutputMessage = (
  results: { passed: boolean }[]
): { type: "success" | "error"; message: string } => {
  if (results.length === 0) return { type: "error", message: "No test cases returned." };
  const passedCount = results.filter((tc) => tc.passed).length;
  if (passedCount === results.length) {
    return { type: "success", message: `✓ All ${passedCount} test cases passed!` };
  }
  return { type: "error", message: `✗ ${passedCount}/${results.length} test cases passed` };
};
