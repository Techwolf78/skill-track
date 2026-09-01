import { describe, it, expect } from "vitest";
import {
  resolveTaxonomyForRow,
  parseImportRow,
  generateDynamicExcelTemplate,
  TaxonomyContext,
} from "../../lib/admin/questionImport";
import { Subject, Topic, Subtopic } from "../../lib/test-service";

describe("Question Import Taxonomy Resolver", () => {
  const sampleSubjects: Subject[] = [
    { id: "sub-1111-aaaa", name: "Computer Science" },
    { id: "sub-2222-bbbb", name: "Databases" },
  ];

  const sampleTopics: Topic[] = [
    { id: "top-1111-aaaa", name: "Data Structures", subjectId: "sub-1111-aaaa" },
    { id: "top-2222-bbbb", name: "Algorithms", subjectId: "sub-1111-aaaa" },
    { id: "top-3333-cccc", name: "SQL Basics", subjectId: "sub-2222-bbbb" },
  ];

  const sampleSubtopics: Subtopic[] = [
    { id: "stp-1111-aaaa", name: "Arrays & Hash Tables", topicId: "top-1111-aaaa" },
    { id: "stp-2222-bbbb", name: "Trees & Graphs", topicId: "top-1111-aaaa" },
    { id: "stp-3333-cccc", name: "Joins & Aggregations", topicId: "top-3333-cccc" },
  ];

  const baseContext: TaxonomyContext = {
    subjects: sampleSubjects,
    topics: sampleTopics,
    subtopics: sampleSubtopics,
    fallbackSubjectId: "sub-1111-aaaa",
    fallbackTopicId: undefined,
    fallbackSubtopicId: undefined,
  };

  it("should match subject, topic, and subtopic by case-insensitive name", () => {
    const row = {
      subject: "computer science",
      topic: "DATA STRUCTURES",
      subtopic: "arrays & hash tables",
    };

    const res = resolveTaxonomyForRow(row, baseContext);
    expect(res.subjectStatus).toBe("MATCHED");
    expect(res.subjectId).toBe("sub-1111-aaaa");
    expect(res.subjectName).toBe("Computer Science");

    expect(res.topicStatus).toBe("MATCHED");
    expect(res.topicId).toBe("top-1111-aaaa");
    expect(res.topicName).toBe("Data Structures");

    expect(res.subtopicStatus).toBe("MATCHED");
    expect(res.subtopicId).toBe("stp-1111-aaaa");
    expect(res.subtopicName).toBe("Arrays & Hash Tables");
  });

  it("should use modal fallback when row fields are empty", () => {
    const contextWithFallbacks: TaxonomyContext = {
      ...baseContext,
      fallbackSubjectId: "sub-1111-aaaa",
      fallbackTopicId: "top-2222-bbbb",
      fallbackSubtopicId: undefined,
    };

    const row = { prompt: "Explain Binary Search" };
    const res = resolveTaxonomyForRow(row, contextWithFallbacks);

    expect(res.subjectStatus).toBe("FALLBACK");
    expect(res.subjectId).toBe("sub-1111-aaaa");

    expect(res.topicStatus).toBe("FALLBACK");
    expect(res.topicId).toBe("top-2222-bbbb");
    expect(res.topicName).toBe("Algorithms");

    expect(res.subtopicStatus).toBe("NONE");
    expect(res.subtopicId).toBeUndefined();
  });

  it("should flag UNMATCHED when row specifies a non-existent topic name (typo)", () => {
    const row = {
      subject: "Computer Science",
      topic: "DS", // Typo for Data Structures
    };

    const res = resolveTaxonomyForRow(row, baseContext);
    expect(res.subjectStatus).toBe("MATCHED");
    expect(res.subjectId).toBe("sub-1111-aaaa");

    expect(res.topicStatus).toBe("UNMATCHED");
    expect(res.rawTopic).toBe("DS");
    expect(res.topicId).toBeUndefined();
  });

  it("should support direct UUIDs for backwards compatibility", () => {
    const row = {
      subject: "sub-2222-bbbb",
      topic: "top-3333-cccc",
      subtopic: "stp-3333-cccc",
    };

    const res = resolveTaxonomyForRow(row, baseContext);
    expect(res.subjectStatus).toBe("MATCHED");
    expect(res.subjectId).toBe("sub-2222-bbbb");
    expect(res.subjectName).toBe("Databases");

    expect(res.topicStatus).toBe("MATCHED");
    expect(res.topicId).toBe("top-3333-cccc");
    expect(res.topicName).toBe("SQL Basics");

    expect(res.subtopicStatus).toBe("MATCHED");
    expect(res.subtopicId).toBe("stp-3333-cccc");
  });

  it("should correctly parse an MCQ row", () => {
    const rawRow = {
      title: "Java Map Question",
      type: "MCQ",
      prompt: "Which Map allows null keys?",
      marks: 3,
      difficulty: "Easy",
      subject: "Computer Science",
      topic: "Data Structures",
      option1: "HashMap",
      option2: "Hashtable",
      option3: "ConcurrentHashMap",
      correctOption: "1",
    };

    const parsed = parseImportRow(rawRow, 1, baseContext, "PUBLIC");
    expect(parsed).not.toBeNull();
    expect(parsed?.question.questionType).toBe("MCQ");
    expect(parsed?.question.title).toBe("Java Map Question");
    expect(parsed?.question.subject_id).toBe("sub-1111-aaaa");
    expect(parsed?.question.topic_id).toBe("top-1111-aaaa");
    expect(parsed?.question.marks).toBe(3);
    expect(parsed?.question.difficulty).toBe("EASY");
    expect(parsed?.question.mcqOptions?.length).toBe(3);
    expect(parsed?.question.mcqOptions?.[0].isCorrect).toBe(true);
    expect(parsed?.question.mcqOptions?.[1].isCorrect).toBe(false);
  });

  it("should correctly parse a CODING row with test cases", () => {
    const rawRow = {
      title: "Two Sum",
      type: "Coding",
      prompt: "Find two numbers that add up to target.",
      difficulty: "Medium",
      marks: 10,
      subject: "Computer Science",
      topic: "Algorithms",
      sampleInput1: "[2, 7, 11, 15]\n9",
      sampleOutput1: "[0, 1]",
      hiddenInput1: "[3, 2, 4]\n6",
      hiddenOutput1: "[1, 2]",
    };

    const parsed = parseImportRow(rawRow, 2, baseContext, "PUBLIC");
    expect(parsed).not.toBeNull();
    expect(parsed?.question.questionType).toBe("CODING");
    expect(parsed?.question.subject_id).toBe("sub-1111-aaaa");
    expect(parsed?.question.topic_id).toBe("top-2222-bbbb");
    expect(parsed?.question.testCases?.length).toBe(2);
    expect(parsed?.question.testCases?.[0].sample).toBe(true);
    expect(parsed?.question.testCases?.[1].sample).toBe(false);
  });

  it("should generate dynamic Excel template containing active taxonomy reference sheet", () => {
    const wb = generateDynamicExcelTemplate({
      subjects: sampleSubjects,
      topics: sampleTopics,
      subtopics: sampleSubtopics,
    });

    expect(wb.SheetNames).toContain("Questions");
    expect(wb.SheetNames).toContain("Taxonomy_Reference");
  });
});
