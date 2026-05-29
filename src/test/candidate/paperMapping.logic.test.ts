import { describe, it, expect } from "vitest";

// --- Paper/snapshot mapping logic (extracted from TestInterface paper mapping) ---

interface SnapshotQuestion {
  snapshotQuestionId?: string;
  sourceQuestionId: string;
  orderIndex: number;
  marks: number;
  type: "MCQ" | "CODING";
  prompt: string;
  options?: { id: string; text: string }[];
  coding?: {
    timeLimitSecs?: number;
    memoryLimitMB?: number;
    starterCode?: Record<string, { code: string }>;
    examples?: { input: string; expectedOutput: string; explanation: string }[];
    difficulty?: string;
    constraints?: string;
    title?: string;
    hints?: string[];
    tags?: string[];
  };
}

interface Paper {
  testId: string;
  title: string;
  description: string;
  durationMins: number;
  difficulty?: string;
  passMark?: number;
  questions: SnapshotQuestion[];
}

const mapSnapshotQuestion = (q: SnapshotQuestion, testId: string) => ({
  id: q.snapshotQuestionId || q.sourceQuestionId,
  testId,
  questionId: q.sourceQuestionId,
  orderIndex: q.orderIndex,
  marks: q.marks,
  timeLimitSecs: q.coding?.timeLimitSecs,
  question: {
    id: q.sourceQuestionId,
    type: q.type,
    questionType: q.type,
    prompt: q.prompt,
    marks: q.marks,
    mcqOptions: q.options || [],
    sampleInput: q.coding?.examples?.[0]?.input || "",
    sampleOutput: q.coding?.examples?.[0]?.expectedOutput || "",
    codeTemplate: q.coding?.starterCode,
    difficulty: q.coding?.difficulty,
    title: q.coding?.title || q.prompt,
  },
});

const mapPaperToTestDetails = (paper: Paper) => ({
  id: paper.testId,
  title: paper.title,
  description: paper.description,
  durationMins: paper.durationMins,
  difficulty: paper.difficulty || "MEDIUM",
  passMark: paper.passMark || 40,
  questions: paper.questions.map(q => mapSnapshotQuestion(q, paper.testId)),
});

describe("Test Paper Snapshot Mapping", () => {
  const mockPaper: Paper = {
    testId: "test-uuid-1",
    title: "Java Basics",
    description: "Basic Java test",
    durationMins: 60,
    difficulty: "EASY",
    passMark: 50,
    questions: [
      {
        snapshotQuestionId: "snap-q-1",
        sourceQuestionId: "src-q-1",
        orderIndex: 0,
        marks: 5,
        type: "MCQ",
        prompt: "What is JVM?",
        options: [
          { id: "opt-a", text: "Java Virtual Machine" },
          { id: "opt-b", text: "Java Variable Method" },
        ],
      },
      {
        sourceQuestionId: "src-q-2",
        orderIndex: 1,
        marks: 10,
        type: "CODING",
        prompt: "Write a sum function",
        coding: {
          timeLimitSecs: 2,
          memoryLimitMB: 256,
          title: "Sum Function",
          starterCode: { python3: { code: "def sum(a, b):\n  pass" } },
          examples: [{ input: "1 2", expectedOutput: "3", explanation: "1+2=3" }],
          difficulty: "EASY",
        },
      },
    ],
  };

  it("should preserve paper-level metadata correctly", () => {
    const details = mapPaperToTestDetails(mockPaper);
    expect(details.id).toBe("test-uuid-1");
    expect(details.title).toBe("Java Basics");
    expect(details.durationMins).toBe(60);
    expect(details.passMark).toBe(50);
  });

  it("should default difficulty to MEDIUM if absent", () => {
    const details = mapPaperToTestDetails({ ...mockPaper, difficulty: undefined });
    expect(details.difficulty).toBe("MEDIUM");
  });

  it("should default passMark to 40 if absent", () => {
    const details = mapPaperToTestDetails({ ...mockPaper, passMark: undefined });
    expect(details.passMark).toBe(40);
  });

  it("should prefer snapshotQuestionId as the mapped question id", () => {
    const details = mapPaperToTestDetails(mockPaper);
    expect(details.questions[0].id).toBe("snap-q-1");
  });

  it("should fallback to sourceQuestionId when snapshotQuestionId is absent", () => {
    const details = mapPaperToTestDetails(mockPaper);
    expect(details.questions[1].id).toBe("src-q-2");
  });

  it("should map MCQ options correctly", () => {
    const details = mapPaperToTestDetails(mockPaper);
    expect(details.questions[0].question.mcqOptions.length).toBe(2);
    expect(details.questions[0].question.mcqOptions[0].text).toBe("Java Virtual Machine");
  });

  it("should map CODING question starter code", () => {
    const details = mapPaperToTestDetails(mockPaper);
    expect(details.questions[1].question.codeTemplate?.python3?.code).toContain("def sum");
  });

  it("should map sample input from first example", () => {
    const details = mapPaperToTestDetails(mockPaper);
    expect(details.questions[1].question.sampleInput).toBe("1 2");
    expect(details.questions[1].question.sampleOutput).toBe("3");
  });

  it("should use coding title if available, else fall back to prompt", () => {
    const details = mapPaperToTestDetails(mockPaper);
    expect(details.questions[1].question.title).toBe("Sum Function");
    expect(details.questions[0].question.title).toBe("What is JVM?");
  });

  it("should return empty mcqOptions array for CODING question", () => {
    const details = mapPaperToTestDetails(mockPaper);
    expect(details.questions[1].question.mcqOptions).toEqual([]);
  });

  it("should preserve orderIndex for sorting", () => {
    const details = mapPaperToTestDetails(mockPaper);
    expect(details.questions[0].orderIndex).toBe(0);
    expect(details.questions[1].orderIndex).toBe(1);
  });
});
