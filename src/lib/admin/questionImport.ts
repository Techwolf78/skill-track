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

  const imageUrl = norm.imageurl || norm.image || norm.questionimage || norm.asseturl || undefined;

  const base: Partial<CreateQuestionRequest> = {
    questionType,
    prompt: String(prompt).trim(),
    title: String(title).trim(),
    imageUrl: imageUrl ? String(imageUrl).trim() : undefined,
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
      const optImg = norm[`option${i}image`] || norm[`option${i}imageurl`] || norm[`opt${i}image`] || norm[`choice${i}image`];
      if ((optVal != null && String(optVal).trim()) || optImg) {
        const optText = String(optVal || "").trim();
        const isNumMatch = correctRaw.includes(String(i));
        const isLetterMatch = correctRaw.includes(String.fromCharCode(96 + i));
        const isTextMatch = optText ? correctRaw === optText.toLowerCase() : false;
        options.push({
          text: optText,
          imageUrl: optImg ? String(optImg).trim() : undefined,
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
      if (inVal != null && outVal != null && (String(inVal).trim() || String(outVal).trim())) {
        rawTestCases.push({
          input: String(inVal).trim(),
          expectedOutput: String(outVal).trim(),
          sample: true,
          weight: Number(norm[`sampleweight${i}`]) || 10,
          explanation: expVal ? String(expVal).trim() : undefined,
        });
      }
    }

    for (let i = 1; i <= 10; i++) {
      const inVal = norm[`hiddeninput${i}`] || norm[`hidden_input_${i}`] || norm[`hidden_input${i}`] || norm[`testcase${i}input`] || norm[`testcase_${i}_input`];
      const outVal = norm[`hiddenoutput${i}`] || norm[`hidden_output_${i}`] || norm[`hidden_output${i}`] || norm[`testcase${i}output`] || norm[`testcase_${i}_output`];
      if (inVal != null && outVal != null && (String(inVal).trim() || String(outVal).trim())) {
        rawTestCases.push({
          input: String(inVal).trim(),
          expectedOutput: String(outVal).trim(),
          sample: false,
          weight: Number(norm[`hiddenweight${i}`] || norm[`testcase${i}weight`]) || 10,
        });
      }
    }

    const isLangSpecRaw = norm.islanguagespecific || norm.languagespecific || norm.singlelanguage;
    const isLanguageSpecific = isLangSpecRaw != null
      ? (String(isLangSpecRaw).toLowerCase() === "true" || isLangSpecRaw === true || isLangSpecRaw === 1 || String(isLangSpecRaw) === "1")
      : undefined;

    const methodName = norm.methodname || norm.functionname || "solve";
    const returnType = norm.returntype || "int";
    const paramsStr = norm.parameters || norm.params || "n:int";
    const parsedParams: Array<{ name: string; type: string }> = [];

    if (typeof paramsStr === "string" && paramsStr.trim()) {
      paramsStr.split(",").forEach((p) => {
        const parts = p.trim().split(":");
        if (parts.length === 2) {
          parsedParams.push({ name: parts[0].trim(), type: parts[1].trim() });
        } else if (parts.length === 1 && parts[0].trim()) {
          parsedParams.push({ name: parts[0].trim(), type: "int" });
        }
      });
    }

    // Per-language starter code & driver overrides from Excel columns
    const pyTemplate = norm.python3startercode || norm.pythontemplate || norm.pythonstartercode || norm.pythoncode;
    const pyDriver = norm.python3drivercode || norm.pythondriver || norm.python3driver || norm.pythonevaluationrunner;

    const jsTemplate = norm.javascriptstartercode || norm.jstemplate || norm.javascripttemplate || norm.javascriptcode;
    const jsDriver = norm.javascriptdrivercode || norm.jsdriver || norm.javascriptdriver || norm.jsevaluationrunner;

    const javaTemplate = norm.javastartercode || norm.javatemplate || norm.javacode;
    const javaDriver = norm.javadrivercode || norm.javadriver || norm.javaevaluationrunner;

    const cppTemplate = norm.cppstartercode || norm.cpptemplate || norm.cppcode || norm.cplusplusstartercode;
    const cppDriver = norm.cppdrivercode || norm.cppdriver || norm.cppevaluationrunner;

    let hintsList: string[] | undefined = undefined;
    const rawHints = norm.hints || norm.hint;
    if (Array.isArray(rawHints)) {
      hintsList = rawHints.map((h) => String(h).trim()).filter(Boolean);
    } else if (typeof rawHints === "string" && rawHints.trim()) {
      hintsList = rawHints.includes("|")
        ? rawHints.split("|").map((h) => h.trim()).filter(Boolean)
        : rawHints.split(",").map((h) => h.trim()).filter(Boolean);
    }

    const rawCompMode = (norm.comparisonmode || norm.comparison || "").toString().toLowerCase().trim();
    const comparisonMode: "exact" | "unordered_array" | "float_tolerance" | undefined =
      rawCompMode.includes("unordered")
        ? "unordered_array"
        : rawCompMode.includes("float")
        ? "float_tolerance"
        : rawCompMode.includes("exact")
        ? "exact"
        : undefined;

    fullQuestion = {
      ...(base as CreateQuestionRequest),
      constraints: norm.constraints || undefined,
      timeLimitSecs: Number(norm.timelimit || norm.timelimitsecs) || 2,
      memoryLimitMb: Number(norm.memorylimit || norm.memorylimitmb) || 256,
      sampleExplanation: norm.sampleexplanation || norm.explanation || undefined,
      testCases: rawTestCases.length ? rawTestCases : undefined,
      hints: hintsList && hintsList.length ? hintsList : undefined,
      comparisonMode,
      isLanguageSpecific,
      languageTemplates: norm.languagetemplates || {
        python3: {
          template: pyTemplate
            ? String(pyTemplate).trim()
            : `class Solution:\n    def ${methodName}(self, ${parsedParams.map(p => `${p.name}: ${p.type}`).join(", ") || "n: int"}) -> ${returnType}:\n        # Write your logic here\n        return 0`,
          driver: pyDriver
            ? String(pyDriver).trim()
            : `import sys\nif __name__ == "__main__":\n    data = sys.stdin.read().strip()\n    if data:\n        sol = Solution()\n        print(sol.${methodName}(int(data)))`,
        },
        javascript: {
          template: jsTemplate
            ? String(jsTemplate).trim()
            : `class Solution {\n    ${methodName}(${parsedParams.map(p => p.name).join(", ") || "n"}) {\n        // Write your logic here\n        return 0;\n    }\n}`,
          driver: jsDriver
            ? String(jsDriver).trim()
            : `const fs = require('fs');\nfunction main() {\n    const input = fs.readFileSync('/dev/stdin', 'utf-8').trim();\n    if (input) {\n        const sol = new Solution();\n        console.log(sol.${methodName}(parseInt(input, 10)));\n    }\n}\nmain();`,
        },
        java: {
          template: javaTemplate
            ? String(javaTemplate).trim()
            : `class Solution {\n    public ${returnType} ${methodName}(${parsedParams.map(p => `${p.type} ${p.name}`).join(", ") || "int n"}) {\n        // Write your logic here\n        return 0;\n    }\n}`,
          driver: javaDriver
            ? String(javaDriver).trim()
            : `import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            Solution sol = new Solution();\n            System.out.println(sol.${methodName}(n));\n        }\n    }\n}`,
        },
        cpp: {
          template: cppTemplate
            ? String(cppTemplate).trim()
            : `#include <iostream>\nusing namespace std;\nclass Solution {\npublic:\n    ${returnType} ${methodName}(${parsedParams.map(p => `${p.type} ${p.name}`).join(", ") || "int n"}) {\n        // Write your logic here\n        return 0;\n    }\n};`,
          driver: cppDriver
            ? String(cppDriver).trim()
            : `int main() {\n    int n;\n    if (cin >> n) {\n        Solution sol;\n        cout << sol.${methodName}(n) << endl;\n    }\n    return 0;\n}`,
        },
      },
      signatureMetadata: norm.signaturemetadata || {
        method_name: methodName,
        return_type: returnType,
        params: parsedParams.length ? parsedParams : [{ name: "n", type: "int" }],
      },
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
      "Question Image URL": "",
      "Option 1": "ConcurrentHashMap",
      "Option 1 Image URL": "",
      "Option 2": "HashMap",
      "Option 2 Image URL": "",
      "Option 3": "TreeMap",
      "Option 3 Image URL": "",
      "Option 4": "WeakHashMap",
      "Option 4 Image URL": "",
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
      "Question Image URL": "",
      "Option 1": "Serializable",
      "Option 1 Image URL": "",
      "Option 2": "Read Committed",
      "Option 2 Image URL": "",
      "Option 3": "Repeatable Read",
      "Option 3 Image URL": "",
      "Option 4": "Read Uncommitted",
      "Option 4 Image URL": "",
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
    { wch: 26 }, // Question Image URL
    { wch: 24 }, // Option 1
    { wch: 24 }, // Option 1 Image URL
    { wch: 24 }, // Option 2
    { wch: 24 }, // Option 2 Image URL
    { wch: 24 }, // Option 3
    { wch: 24 }, // Option 3 Image URL
    { wch: 24 }, // Option 4
    { wch: 24 }, // Option 4 Image URL
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
      Title: "Add Two Numbers / Offset Problem",
      Type: "CODING",
      Subject: sampleSub,
      Topic: sampleTop2,
      Subtopic: sampleSubtop,
      Difficulty: "EASY",
      Marks: 100,
      Prompt: "Given an integer n, return the value of n added to 9.",
      "Question Image URL": "",
      "Is Language Specific": "FALSE",
      "Method Name": "solve",
      "Return Type": "int",
      Parameters: "n:int",
      "Comparison Mode": "exact",
      Constraints: "0 <= n <= 10^9",
      "Sample Input 1": "10",
      "Sample Output 1": "19",
      "Sample Explanation 1": "n = 10 -> 10 + 9 = 19",
      "Sample Weight 1": 20,
      "Hidden Input 1": "5",
      "Hidden Output 1": "14",
      "Hidden Weight 1": 40,
      "Hidden Input 2": "0",
      "Hidden Output 2": "9",
      "Hidden Weight 2": 40,
      "Time Limit (s)": 2,
      "Memory Limit (MB)": 256,
      Hints: "Consider adding 9 directly to n | Check standard 32-bit integer limits",
      Tags: "algorithms, math, basic",
      "Avg Time (s)": 300,
      // Python3
      "Python3 Starter Code": `class Solution:\n    def solve(self, n: int) -> int:\n        # Write your logic here\n        return n + 9`,
      "Python3 Driver Code": `import sys\nif __name__ == "__main__":\n    data = sys.stdin.read().strip()\n    if data:\n        n = int(data)\n        sol = Solution()\n        print(sol.solve(n))`,
      // JavaScript
      "JavaScript Starter Code": `class Solution {\n    solve(n) {\n        // Write your logic here\n        return n + 9;\n    }\n}`,
      "JavaScript Driver Code": `const fs = require('fs');\nfunction main() {\n    const input = fs.readFileSync('/dev/stdin', 'utf-8').trim();\n    if (input) {\n        const n = parseInt(input, 10);\n        const sol = new Solution();\n        console.log(sol.solve(n));\n    }\n}\nmain();`,
      // Java
      "Java Starter Code": `class Solution {\n    public int solve(int n) {\n        // Write your logic here\n        return n + 9;\n    }\n}`,
      "Java Driver Code": `import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            Solution sol = new Solution();\n            System.out.println(sol.solve(n));\n        }\n    }\n}`,
      // C++
      "C++ Starter Code": `#include <iostream>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(int n) {\n        // Write your logic here\n        return n + 9;\n    }\n};`,
      "C++ Driver Code": `int main() {\n    int n;\n    if (cin >> n) {\n        Solution sol;\n        cout << sol.solve(n) << endl;\n    }\n    return 0;\n}`,
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
    { wch: 26 }, // Question Image URL
    { wch: 20 }, // Is Language Specific
    { wch: 18 }, // Method Name
    { wch: 16 }, // Return Type
    { wch: 26 }, // Parameters
    { wch: 18 }, // Comparison Mode
    { wch: 30 }, // Constraints
    { wch: 20 }, // Sample Input 1
    { wch: 20 }, // Sample Output 1
    { wch: 30 }, // Sample Explanation 1
    { wch: 16 }, // Sample Weight 1
    { wch: 20 }, // Hidden Input 1
    { wch: 20 }, // Hidden Output 1
    { wch: 16 }, // Hidden Weight 1
    { wch: 20 }, // Hidden Input 2
    { wch: 20 }, // Hidden Output 2
    { wch: 16 }, // Hidden Weight 2
    { wch: 14 }, // Time Limit (s)
    { wch: 16 }, // Memory Limit (MB)
    { wch: 36 }, // Hints
    { wch: 28 }, // Tags
    { wch: 14 }, // Avg Time (s)
    { wch: 36 }, // Python3 Starter Code
    { wch: 36 }, // Python3 Driver Code
    { wch: 36 }, // JavaScript Starter Code
    { wch: 36 }, // JavaScript Driver Code
    { wch: 36 }, // Java Starter Code
    { wch: 36 }, // Java Driver Code
    { wch: 36 }, // C++ Starter Code
    { wch: 36 }, // C++ Driver Code
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
