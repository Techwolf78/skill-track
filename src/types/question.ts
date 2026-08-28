export interface SignatureParameter {
  name: string;
  type: string; // e.g., 'int', 'list[int]', 'map[string,int]'
}

export interface SignatureMetadata {
  method_name: string;
  params: SignatureParameter[];
  return_type: string;
}

export interface LanguageTemplateEntry {
  template: string;
  driver: string;
}

// Replaces the old Record<string, string> codeTemplate
export type LanguageTemplates = Record<string, LanguageTemplateEntry>;

export type QuestionBankStatus = "ACTIVE" | "UNDER_REVIEW" | "QUARANTINED" | "DRAFT" | "RETIRED";

// 1. Updated Coding Question Response
export interface CodingQuestionResponse {
  id: string;
  title: string;
  prompt: string;
  questionType: "CODING" | "MCQ";
  isLanguageSpecific?: boolean | null;
  languageTemplates?: Record<string, LanguageTemplateEntry>;
  signatureMetadata?: Record<string, any>;
  comparisonMode?: "exact" | "unordered_array" | "float_tolerance";
  verifiedLanguages?: string[];
  pendingLanguages?: string[];
  status?: QuestionBankStatus;
  marks?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  timeLimitSecs?: number;
  memoryLimitMb?: number;
}

// 2. Pre-Flight Validation Request & Response
export interface ValidateDriverRequest {
  language: string;
  referenceSolution: string;
  driverCode?: string;
  testCaseIds?: string[];
}

export interface TestCaseRunResult {
  testCaseId: string;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  status: "ACCEPTED" | "WRONG_ANSWER" | "COMPILE_ERROR" | "TLE" | "RUNTIME_ERROR" | "ERROR";
  execTimeMs: number;
  expectedOutput?: string;
}

export interface ValidateDriverResponse {
  language: string;
  status: "PASSED" | "FAILED" | "COMPILE_ERROR" | "ERROR";
  testCasesPassed: number;
  testCasesTotal: number;
  questionStatus: QuestionBankStatus;
  verifiedLanguages: string[];
  pendingLanguages: string[];
  results: TestCaseRunResult[];
}

/**
 * Crucial Language Key Translation Map:
 * The frontend uses `python3` to reference Python, but the backend maps it to `python`.
 * Ensure you translate `python3` to `python` before posting to the backend,
 * and translate `python` to `python3` when parsing response templates.
 */
export const mapFrontendToBackendLang = (lang: string): string => {
  if (lang === "python3") return "python";
  return lang;
};

export const mapBackendToFrontendLang = (lang: string): string => {
  if (lang === "python") return "python3";
  return lang;
};

export const getLanguageDisplayName = (lang: string): string => {
  const normalized = lang.toLowerCase();
  switch (normalized) {
    case "python":
    case "python3":
      return "Python";
    case "javascript":
    case "js":
      return "JavaScript";
    case "java":
      return "Java";
    case "cpp":
    case "c++":
      return "C++";
    case "csharp":
    case "c#":
      return "C#";
    default:
      return lang.toUpperCase();
  }
};
