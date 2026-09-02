import * as XLSX from "xlsx";
import { CreateQuestionRequest, McqOption, McqType, Subject, Topic, Subtopic } from "../test-service";

export type ResolutionStatus = "MATCHED" | "FALLBACK" | "UNMATCHED" | "NONE";

export interface TaxonomyResolution {
  subjectId: string;
  subjectName?: string;
  rawSubject?: string;
  subjectStatus: "MATCHED" | "FALLBACK" | "UNMATCHED";

  topicId?: string;
  topicName?: string;
  rawTopic?: string;
  topicStatus: ResolutionStatus;

  subtopicId?: string;
  subtopicName?: string;
  rawSubtopic?: string;
  subtopicStatus: ResolutionStatus;
}

export interface ParsedQuestionRow {
  id: string; // Unique client-side row ID
  rowIndex: number; // 1-indexed row number from file
  raw: Record<string, any>;
  question: CreateQuestionRequest;
  taxonomy: TaxonomyResolution;
  isValid: boolean;
  validationError?: string;
}

export interface TaxonomyContext {
  subjects: Subject[];
  topics: Topic[];
  subtopics: Subtopic[];
  fallbackSubjectId: string;
  fallbackTopicId?: string;
  fallbackSubtopicId?: string;
}

/** Check if a string is a valid UUID */
export const isUUID = (val?: any): boolean =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

/**
 * Intelligent Taxonomy Resolver:
 * Resolves Subject, Topic, and Subtopic names or IDs with case-insensitivity,
 * hierarchy filtering, and fallback inheritance.
 */
export function resolveTaxonomyForRow(
  row: Record<string, any>,
  context: TaxonomyContext
): TaxonomyResolution {
  const { subjects, topics, subtopics, fallbackSubjectId, fallbackTopicId, fallbackSubtopicId } = context;

  // 1. Resolve Subject
  let subjectId = fallbackSubjectId;
  let subjectName = subjects.find((s) => s.id === fallbackSubjectId)?.name || "Default Subject";
  let subjectStatus: "MATCHED" | "FALLBACK" | "UNMATCHED" = "FALLBACK";

  const rawSubject = (row.subject || row.subjectid || row.subjectname || "").toString().trim();
  if (rawSubject) {
    if (isUUID(rawSubject)) {
      const match = subjects.find((s) => s.id.toLowerCase() === rawSubject.toLowerCase());
      if (match) {
        subjectId = match.id;
        subjectName = match.name;
        subjectStatus = "MATCHED";
      } else {
        subjectId = rawSubject;
        subjectName = "Custom UUID";
        subjectStatus = "MATCHED";
      }
    } else {
      const match = subjects.find(
        (s) => s.name.trim().toLowerCase() === rawSubject.toLowerCase() || s.id.toLowerCase() === rawSubject.toLowerCase()
      );
      if (match) {
        subjectId = match.id;
        subjectName = match.name;
        subjectStatus = "MATCHED";
      } else {
        // Provided subject string did not match any active subject
        subjectId = fallbackSubjectId;
        subjectName = subjects.find((s) => s.id === fallbackSubjectId)?.name || "Default Subject";
        subjectStatus = "UNMATCHED";
      }
    }
  }

  // 2. Resolve Topic within resolved Subject
  let topicId = fallbackTopicId || undefined;
  let topicName = fallbackTopicId ? topics.find((t) => t.id === fallbackTopicId)?.name : undefined;
  let topicStatus: ResolutionStatus = fallbackTopicId ? "FALLBACK" : "NONE";

  const rawTopic = (row.topic || row.topicid || row.topicname || "").toString().trim();
  const subjectTopics = topics.filter((t) => t.subjectId === subjectId || (t.subject && t.subject.id === subjectId));

  if (rawTopic) {
    if (isUUID(rawTopic)) {
      const match = subjectTopics.find((t) => t.id.toLowerCase() === rawTopic.toLowerCase()) ||
        topics.find((t) => t.id.toLowerCase() === rawTopic.toLowerCase());
      if (match) {
        topicId = match.id;
        topicName = match.name;
        topicStatus = "MATCHED";
      } else {
        topicId = rawTopic;
        topicName = "Custom Topic UUID";
        topicStatus = "MATCHED";
      }
    } else {
      const match = subjectTopics.find(
        (t) => t.name.trim().toLowerCase() === rawTopic.toLowerCase() || t.id.toLowerCase() === rawTopic.toLowerCase()
      ) || topics.find(
        (t) => t.name.trim().toLowerCase() === rawTopic.toLowerCase() || t.id.toLowerCase() === rawTopic.toLowerCase()
      );

      if (match) {
        topicId = match.id;
        topicName = match.name;
        topicStatus = "MATCHED";
      } else {
        // Raw topic string provided but did not match known topics
        topicId = fallbackTopicId || undefined;
        topicName = fallbackTopicId ? topics.find((t) => t.id === fallbackTopicId)?.name : undefined;
        topicStatus = "UNMATCHED";
      }
    }
  }

  // 3. Resolve Subtopic within resolved Topic
  let subtopicId = fallbackSubtopicId || undefined;
  let subtopicName = fallbackSubtopicId ? subtopics.find((st) => st.id === fallbackSubtopicId)?.name : undefined;
  let subtopicStatus: ResolutionStatus = fallbackSubtopicId ? "FALLBACK" : "NONE";

  const rawSubtopic = (row.subtopic || row.subtopicid || row.subtopicname || "").toString().trim();
  const topicSubtopics = topicId
    ? subtopics.filter((st) => st.topicId === topicId || (st.topic && st.topic.id === topicId))
    : subtopics;

  if (rawSubtopic) {
    if (isUUID(rawSubtopic)) {
      const match = topicSubtopics.find((st) => st.id.toLowerCase() === rawSubtopic.toLowerCase()) ||
        subtopics.find((st) => st.id.toLowerCase() === rawSubtopic.toLowerCase());
      if (match) {
        subtopicId = match.id;
        subtopicName = match.name;
        subtopicStatus = "MATCHED";
      } else {
        subtopicId = rawSubtopic;
        subtopicName = "Custom Subtopic UUID";
        subtopicStatus = "MATCHED";
      }
    } else {
      const match = topicSubtopics.find(
        (st) => st.name.trim().toLowerCase() === rawSubtopic.toLowerCase() || st.id.toLowerCase() === rawSubtopic.toLowerCase()
      ) || subtopics.find(
        (st) => st.name.trim().toLowerCase() === rawSubtopic.toLowerCase() || st.id.toLowerCase() === rawSubtopic.toLowerCase()
      );

      if (match) {
        subtopicId = match.id;
        subtopicName = match.name;
        subtopicStatus = "MATCHED";
      } else {
        subtopicId = fallbackSubtopicId || undefined;
        subtopicName = fallbackSubtopicId ? subtopics.find((st) => st.id === fallbackSubtopicId)?.name : undefined;
        subtopicStatus = "UNMATCHED";
      }
    }
  }

  return {
    subjectId,
    subjectName,
    rawSubject: rawSubject || undefined,
    subjectStatus,
    topicId,
    topicName,
    rawTopic: rawTopic || undefined,
    topicStatus,
    subtopicId,
    subtopicName,
    rawSubtopic: rawSubtopic || undefined,
    subtopicStatus,
  };
}

/**
 * Parses an individual raw row (from Excel JSON or direct JSON) into a full ParsedQuestionRow.
 */
export function parseImportRow(
  rawRow: Record<string, any>,
  rowIndex: number,
  context: TaxonomyContext,
  defaultVisibility: "PUBLIC" | "ORG_OWNED" = "PUBLIC"
): ParsedQuestionRow | null {
  const norm: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawRow)) {
    norm[k.toLowerCase().replace(/[^a-z0-9]/g, "")] = v;
  }

  const prompt = norm.prompt || norm.description || norm.question || norm.problem || norm.questiontext;
  if (!prompt || !String(prompt).trim()) return null;

  const rawType = (norm.type || norm.questiontype || "MCQ").toString().toUpperCase();
  const isCoding = rawType.includes("COD");
  const questionType: "MCQ" | "CODING" = isCoding ? "CODING" : "MCQ";

  const taxonomy = resolveTaxonomyForRow(norm, context);

  const title = norm.title || (String(prompt).length > 50 ? String(prompt).slice(0, 50) + "..." : String(prompt));
  const marks = Math.max(1, Number(norm.marks || norm.points || norm.score) || 1);
  const rawDiff = (norm.difficulty || "MEDIUM").toString().toUpperCase();
  const difficulty: "EASY" | "MEDIUM" | "HARD" =
    rawDiff === "EASY" ? "EASY" : rawDiff === "HARD" || rawDiff === "EXPERT" ? "HARD" : "MEDIUM";
  const avg_time_seconds = Math.max(0, Number(norm.avgtimeseconds || norm.time || norm.avgtime) || (isCoding ? 300 : 90));

  let tags: string[] = [];
  const rawTags = norm.tags || norm.tag || norm.categories;
  if (Array.isArray(rawTags)) {
    tags = rawTags.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof rawTags === "string") {
    tags = rawTags.split(",").map((t) => t.trim()).filter(Boolean);
  }

  const base: Partial<CreateQuestionRequest> = {
    questionType,
    prompt: String(prompt).trim(),
    title: String(title).trim(),
    subject_id: taxonomy.subjectId,
    topic_id: taxonomy.topicId,
    subtopic_id: taxonomy.subtopicId,
    marks,
    difficulty,
    visibility: defaultVisibility,
    avg_time_seconds,
    domain: ((norm.domain || "ENGINEERING").toUpperCase() as any) || "ENGINEERING",
    cognitiveLevel: ((norm.cognitivelevel || norm.cognitive || "APPLY").toUpperCase() as any) || "APPLY",
    p_value: Number(norm.pvalue) || 0.45,
    discrimination_index: Number(norm.discriminationindex) || 0.35,
    status: defaultVisibility === "PUBLIC" ? "UNDER_REVIEW" : "ACTIVE",
    tags: tags.length ? tags : undefined,
  };

  let fullQuestion: CreateQuestionRequest;

  if (questionType === "MCQ") {
    const options: McqOption[] = [];
    const correctRaw = String(norm.correctoption || norm.correctanswer || norm.answer || norm.correct || "1").toLowerCase();

    for (let i = 1; i <= 10; i++) {
      const optVal = norm[`option${i}`] || norm[`opt${i}`] || norm[`choice${i}`];
      if (optVal != null && String(optVal).trim()) {
        const optText = String(optVal).trim();
        const isNumMatch = correctRaw.includes(String(i));
        const isLetterMatch = correctRaw.includes(String.fromCharCode(96 + i));
        const isTextMatch = correctRaw === optText.toLowerCase();
        options.push({
          text: optText,
          isCorrect: isNumMatch || isLetterMatch || isTextMatch,
        });
      }
    }

    if (options.length < 2) {
      options.push({ text: "Option A", isCorrect: true }, { text: "Option B", isCorrect: false });
    } else if (!options.some((o) => o.isCorrect)) {
      options[0].isCorrect = true;
    }

    const multipleCorrect = options.filter((o) => o.isCorrect).length > 1;
    let mcqType: McqType = multipleCorrect ? "MULTIPLE_CORRECT" : "SINGLE_CORRECT";

    const optTexts = options.map((o) => o.text.toLowerCase().trim());
    const isTF =
      optTexts.length === 2 &&
      ((optTexts[0] === "true" && optTexts[1] === "false") ||
        (optTexts[0] === "false" && optTexts[1] === "true"));

    const rawSubtype = String(norm.subtype || norm.mcqtype || norm.type || "").toUpperCase();
    const fullText = `${norm.title || ""} ${prompt || ""}`.toLowerCase();

    if (isTF || rawSubtype.includes("TRUE") || rawSubtype.includes("FALSE")) {
      mcqType = "TRUE_FALSE";
    } else if (
      rawSubtype.includes("ASSERT") ||
      fullText.includes("assertion") ||
      fullText.includes("reason (r)") ||
      fullText.includes("(a) and (r)")
    ) {
      mcqType = "ASSERTION_REASON";
    } else if (
      rawSubtype.includes("BLANK") ||
      rawSubtype.includes("FILL") ||
      fullText.includes("fill in the blank") ||
      fullText.includes("_____") ||
      fullText.includes("__________")
    ) {
      mcqType = "FILL_IN_THE_BLANK";
    }

    fullQuestion = {
      ...(base as CreateQuestionRequest),
      mcqType,
      multipleCorrect,
      shuffleOptions: mcqType !== "TRUE_FALSE" && mcqType !== "ASSERTION_REASON",
      mcqOptions: options,
    };
  } else {
    // Coding question test case parsing
    const rawTestCases: Array<{
      input: string;
      expectedOutput: string;
      sample: boolean;
      weight: number;
      explanation?: string;
    }> = [];

    for (let i = 1; i <= 5; i++) {
      const inVal = norm[`sampleinput${i}`] || norm[`sample_input_${i}`] || norm[`sample_input${i}`] || (i === 1 ? (norm.sampleinput || norm.sample_input || norm.input) : null);
      const outVal = norm[`sampleoutput${i}`] || norm[`sample_output_${i}`] || norm[`sample_output${i}`] || (i === 1 ? (norm.sampleoutput || norm.sample_output || norm.output || norm.expectedoutput || norm.expected_output) : null);
      const expVal = norm[`sampleexplanation${i}`] || norm[`sample_explanation_${i}`] || (i === 1 ? (norm.sampleexplanation || norm.explanation) : undefined);
      if (inVal && outVal) {
        rawTestCases.push({
          input: String(inVal).trim(),
          expectedOutput: String(outVal).trim(),
          sample: true,
          weight: 10,
          explanation: expVal ? String(expVal).trim() : undefined,
        });
      }
    }

    for (let i = 1; i <= 10; i++) {
      const inVal = norm[`hiddeninput${i}`] || norm[`hidden_input_${i}`] || norm[`hidden_input${i}`] || norm[`testcase${i}input`] || norm[`testcase_${i}_input`];
      const outVal = norm[`hiddenoutput${i}`] || norm[`hidden_output_${i}`] || norm[`hidden_output${i}`] || norm[`testcase${i}output`] || norm[`testcase_${i}_output`];
      if (inVal && outVal) {
        rawTestCases.push({
          input: String(inVal).trim(),
          expectedOutput: String(outVal).trim(),
          sample: false,
          weight: 10,
        });
      }
    }

    fullQuestion = {
      ...(base as CreateQuestionRequest),
      constraints: norm.constraints || undefined,
      timeLimitSecs: Number(norm.timelimit || norm.timelimitsecs) || 2,
      memoryLimitMb: Number(norm.memorylimit || norm.memorylimitmb) || 256,
      sampleExplanation: norm.sampleexplanation || norm.explanation || undefined,
      testCases: rawTestCases.length ? rawTestCases : undefined,
      languageTemplates: norm.languagetemplates || {
        java: { template: "// Write your code here", driver: "// Execution harness" },
        python: { template: "# Write your code here", driver: "# Execution harness" },
        javascript: { template: "// Write your code here", driver: "// Execution harness" },
      },
      signatureMetadata: norm.signaturemetadata || { method_name: "solve", return_type: "void", params: [] },
    };
  }

  return {
    id: `row-${rowIndex}-${Date.now().toString(36)}`,
    rowIndex,
    raw: rawRow,
    question: fullQuestion,
    taxonomy,
    isValid: Boolean(fullQuestion.subject_id),
  };
}

/**
 * Generates an MCQ-only Excel Template with only MCQ-specific columns.
 */
export function generateMcqExcelTemplate(context: {
  subjects: Subject[];
  topics: Topic[];
  subtopics: Subtopic[];
}) {
  const { subjects, topics, subtopics } = context;

  const sampleSub = subjects[0]?.name || "Computer Science";
  const sampleTop1 = topics.find((t) => subjects[0] && (t.subjectId === subjects[0].id || t.subject?.id === subjects[0].id))?.name || topics[0]?.name || "Data Structures";
  const sampleSubtop = subtopics.find((st) => topics[0] && (st.topicId === topics[0].id || st.topic?.id === topics[0].id))?.name || subtopics[0]?.name || "Arrays & Hash Tables";

  const sampleRows = [
    {
      Title: "Thread Safety in Java HashMap",
      Type: "MCQ",
      Subject: sampleSub,
      Topic: sampleTop1,
      Subtopic: sampleSubtop,
      Difficulty: "MEDIUM",
      Marks: 3,
      Prompt: "Which data structure provides synchronized thread-safe access in Java collections?",
      "Option 1": "ConcurrentHashMap",
      "Option 2": "HashMap",
      "Option 3": "TreeMap",
      "Option 4": "WeakHashMap",
      "Correct Option": "1",
      Tags: "java, concurrency, collections",
      "Avg Time (s)": 90,
    },
    {
      Title: "SQL Transaction Isolation Levels",
      Type: "MCQ",
      Subject: subjects[1]?.name || sampleSub,
      Topic: topics[1]?.name || sampleTop1,
      Subtopic: "",
      Difficulty: "HARD",
      Marks: 4,
      Prompt: "Which SQL transaction isolation level prevents Phantom Reads?",
      "Option 1": "Serializable",
      "Option 2": "Read Committed",
      "Option 3": "Repeatable Read",
      "Option 4": "Read Uncommitted",
      "Correct Option": "1",
      Tags: "sql, dbms, acid",
      "Avg Time (s)": 120,
    },
  ];

  const wsQuestions = XLSX.utils.json_to_sheet(sampleRows);
  wsQuestions["!cols"] = [
    { wch: 32 }, // Title
    { wch: 10 }, // Type
    { wch: 22 }, // Subject
    { wch: 22 }, // Topic
    { wch: 22 }, // Subtopic
    { wch: 12 }, // Difficulty
    { wch: 8 },  // Marks
    { wch: 50 }, // Prompt
    { wch: 24 }, // Option 1
    { wch: 24 }, // Option 2
    { wch: 24 }, // Option 3
    { wch: 24 }, // Option 4
    { wch: 14 }, // Correct Option
    { wch: 28 }, // Tags
    { wch: 14 }, // Avg Time (s)
  ];

  const taxonomyRows = buildTaxonomyReferenceRows(subjects, topics, subtopics);
  const wsTaxonomy = XLSX.utils.json_to_sheet(taxonomyRows);
  wsTaxonomy["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 28 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsQuestions, "MCQ_Questions");
  XLSX.utils.book_append_sheet(wb, wsTaxonomy, "Taxonomy_Reference");
  return wb;
}

/**
 * Generates a Coding-only Excel Template with only Coding-specific columns.
 */
export function generateCodingExcelTemplate(context: {
  subjects: Subject[];
  topics: Topic[];
  subtopics: Subtopic[];
}) {
  const { subjects, topics, subtopics } = context;

  const sampleSub = subjects[0]?.name || "Computer Science";
  const sampleTop2 = topics.find((t) => subjects[0] && (t.subjectId === subjects[0].id || t.subject?.id === subjects[0].id))?.name || topics[0]?.name || "Algorithms";
  const sampleSubtop = subtopics.find((st) => topics[0] && (st.topicId === topics[0].id || st.topic?.id === topics[0].id))?.name || subtopics[0]?.name || "Arrays & Hash Tables";

  const sampleRows = [
    {
      Title: "Two Sum Problem",
      Type: "CODING",
      Subject: sampleSub,
      Topic: sampleTop2,
      Subtopic: sampleSubtop,
      Difficulty: "EASY",
      Marks: 5,
      Prompt: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      Constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.",
      "Sample Input 1": "[2, 7, 11, 15]\n9",
      "Sample Output 1": "[0, 1]",
      "Sample Explanation 1": "nums = [2,7,11,15], target = 9 -> Output: [0,1] because nums[0] + nums[1] == 9",
      "Hidden Input 1": "[3, 2, 4]\n6",
      "Hidden Output 1": "[1, 2]",
      "Time Limit (s)": 2,
      "Memory Limit (MB)": 256,
      Tags: "arrays, hashmap, algorithms",
      "Avg Time (s)": 300,
    },
  ];

  const wsQuestions = XLSX.utils.json_to_sheet(sampleRows);
  wsQuestions["!cols"] = [
    { wch: 32 }, // Title
    { wch: 10 }, // Type
    { wch: 22 }, // Subject
    { wch: 22 }, // Topic
    { wch: 22 }, // Subtopic
    { wch: 12 }, // Difficulty
    { wch: 8 },  // Marks
    { wch: 50 }, // Prompt
    { wch: 30 }, // Constraints
    { wch: 24 }, // Sample Input 1
    { wch: 24 }, // Sample Output 1
    { wch: 35 }, // Sample Explanation 1
    { wch: 24 }, // Hidden Input 1
    { wch: 24 }, // Hidden Output 1
    { wch: 14 }, // Time Limit (s)
    { wch: 16 }, // Memory Limit (MB)
    { wch: 28 }, // Tags
    { wch: 14 }, // Avg Time (s)
  ];

  const taxonomyRows = buildTaxonomyReferenceRows(subjects, topics, subtopics);
  const wsTaxonomy = XLSX.utils.json_to_sheet(taxonomyRows);
  wsTaxonomy["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 28 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsQuestions, "Coding_Questions");
  XLSX.utils.book_append_sheet(wb, wsTaxonomy, "Taxonomy_Reference");
  return wb;
}

function buildTaxonomyReferenceRows(
  subjects: Subject[],
  topics: Topic[],
  subtopics: Subtopic[]
): Array<{ "Subject Name": string; "Topic Name": string; "Subtopic Name": string }> {
  const taxonomyRows: Array<{
    "Subject Name": string;
    "Topic Name": string;
    "Subtopic Name": string;
  }> = [];

  if (subjects.length > 0) {
    for (const sub of subjects) {
      const subTopics = topics.filter((t) => t.subjectId === sub.id || (t.subject && t.subject.id === sub.id));
      if (subTopics.length === 0) {
        taxonomyRows.push({
          "Subject Name": sub.name,
          "Topic Name": "(No topics yet)",
          "Subtopic Name": "",
        });
      } else {
        for (const top of subTopics) {
          const topSubtopics = subtopics.filter((st) => st.topicId === top.id || (st.topic && st.topic.id === top.id));
          if (topSubtopics.length === 0) {
            taxonomyRows.push({
              "Subject Name": sub.name,
              "Topic Name": top.name,
              "Subtopic Name": "",
            });
          } else {
            for (const st of topSubtopics) {
              taxonomyRows.push({
                "Subject Name": sub.name,
                "Topic Name": top.name,
                "Subtopic Name": st.name,
              });
            }
          }
        }
      }
    }
  } else {
    taxonomyRows.push({
      "Subject Name": "Computer Science",
      "Topic Name": "Data Structures",
      "Subtopic Name": "Arrays",
    });
  }

  return taxonomyRows;
}

/**
 * Generates an Enterprise Excel Template with:
 * 1. Questions Template sheet containing sample MCQ & Coding rows
 * 2. Active_Taxonomy_Reference sheet with current system Subjects, Topics, and Subtopics
 */
export function generateDynamicExcelTemplate(context: {
  subjects: Subject[];
  topics: Topic[];
  subtopics: Subtopic[];
}) {
  return generateMcqExcelTemplate(context);
}
