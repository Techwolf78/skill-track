import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";

// ==================== Request DTOs ====================
export interface CreateTestRequest {
  title: string;
  description?: string;
  durationMins: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  instructions?: Record<string, unknown>;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  passMark: number;
  isActive?: boolean;
  questions?: Array<{
    questionId: string;
    orderIndex: number;
    marks: number;
    timeLimitSecs: number;
  }>;
}

export interface CreateTestQuestionRequest {
  testId: string;
  questionId: string;
  orderIndex: number;
  marks: number;
  timeLimitSecs: number;
}

export interface BulkAddQuestionsRequest {
  testId: string;
  questionIds: string[];
  startOrderIndex: number;
  defaultMarks: number;
  defaultTimeLimitSecs: number;
}

export interface CreateSubjectRequest {
  name: string;
}

export interface UpdateSubjectRequest {
  name: string;
}

export interface CreateTopicRequest {
  name: string;
  subjectId: string;
}

export interface UpdateTopicRequest {
  name: string;
  subjectId: string;
}

export interface CreateSubtopicRequest {
  name: string;
  topicId: string;
}

export interface UpdateSubtopicRequest {
  name: string;
  topicId: string;
}

export interface CreateQuestionRequest {
  type: "MCQ" | "CODING";
  prompt: string;
  subjectId: string;
  topicId?: string;
  subtopicId?: string;
  marks: number;
  mcqOptions?: Array<{ text: string; isCorrect: boolean }>;
  codeTemplate?: Record<string, CodeTemplateEntry>;
  title?: string;
  difficulty?: string;
  constraints?: string;
  memoryLimitMb?: number;
  timeLimitSecs?: number;
  sampleExplanation?: string;
  examples?: Array<Record<string, unknown>>;
  hints?: string[];
  tags?: string[];
}

export interface CodeTemplateEntry {
  code: string;
  lang: string;
  langSlug: string;
}

export interface UpdateQuestionRequest {
  questionType?: "MCQ" | "CODING";
  prompt?: string;
  subjectId?: string;
  topicId?: string;
  subtopicId?: string;
  marks?: number;
  mcqOptions?: Array<{ text: string; isCorrect: boolean }>;
  codeTemplate?: Record<string, CodeTemplateEntry>;
  title?: string;
  difficulty?: string;
  constraints?: string;
  memoryLimitMb?: number;
  timeLimitSecs?: number;
  sampleExplanation?: string;
  examples?: Array<Record<string, unknown>>;
  hints?: string[];
  tags?: string[];
}

// ==================== Response Models ====================
export interface Subject {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Topic {
  id: string;
  name: string;
  subjectId?: string;
  subject?: Subject;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subtopic {
  id: string;
  name: string;
  topicId?: string;
  topic?: Topic;
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  questionType: "MCQ" | "CODING";
  type?: "MCQ" | "CODING";
  prompt: string;
  subjectId: string;
  topicId?: string;
  subtopicId?: string;
  marks?: number;
  mcqOptions?: Array<{ text: string; isCorrect: boolean }>;
  codeTemplate?: Record<string, CodeTemplateEntry>;
  title?: string;
  difficulty?: string;
  constraints?: string;
  memoryLimitMb?: number;
  timeLimitSecs?: number;
  sampleExplanation?: string;
  examples?: Array<Record<string, unknown>>;
  hints?: string[];
  tags?: string[];
  subject?: Subject;
  topic?: Topic;
  subtopic?: Subtopic;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestQuestion {
  id: string;
  testId: string;
  questionId: string;
  orderIndex: number;
  marks: number;
  timeLimitSecs: number;
  question?: Question;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  organisation?: Organisation;  // Add this
}

export interface Test {
  id: string;
  title: string;
  description?: string;
  durationMins: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  instructions?: Record<string, unknown>;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  passMark: number;
  createdBy?: User;
  organisationId?: string;  // Add this line
  createdAt?: string;
  updatedAt?: string;
  questions?: TestQuestion[];
  testQuestions?: TestQuestion[];
  isActive?: boolean;
}

export interface TestViewModel {
  id: string;
  name: string;
  description?: string;
  type: string;
  duration: number;
  questions: number;
  totalMarks: number;
  passingMarks?: number;
  status: string;
  participants?: number;
  difficulty: string;
  passMark: number;
  isActive?: boolean;
}

export interface TestSchedule {
  id: string;
  testId: string;
  startTime: string;
  endTime: string;
  status: string;
  test?: Test;
}

export interface CreateTestScheduleRequest {
  testId: string;
  startTime: string;
  endTime: string;
  status: string;
}

// Test Cases
export interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  sample: boolean;
  weight: number;
  questionId?: string;
}

export interface CreateTestCaseRequest {
  input: string;
  expectedOutput: string;
  sample?: boolean;
  weight?: number;
  questionId: string;
}

export interface UpdateTestCaseRequest {
  input?: string;
  expectedOutput?: string;
  sample?: boolean;
  weight?: number;
  questionId?: string;
}

// Test Schedule (extended)
export interface TestScheduleExtended {
  id: string;
  testId: string;
  test?: Test;  // This should already include organisation info
  createdById?: string;
  startTime: string;
  endTime: string;
  maxCandidates: number;
  status: "SCHEDULED" | "ACCEPTED" | "EXPIRED" | "LIVE" | "COMPLETED";
  createdAt?: string;
}

export interface CreateTestScheduleExtendedRequest {
  testId: string;
  startTime: string;
  endTime: string;
  maxCandidates?: number;
  // Remove organisationId if backend doesn't need it
  // organisationId?: string;
}

// ==================== Helper to unwrap BaseResponse ====================
const unwrapResponse = <T>(response: { data: BaseResponse<T> | T }): T => {
  const data = response.data;
  if (data && typeof data === "object" && "data" in data && "success" in data) {
    return (data as BaseResponse<T>).data;
  }
  return data as T;
};

const unwrapArrayResponse = <T>(response: {
  data: BaseResponse<T[]> | T[];
}): T[] => {
  const data = response.data;
  if (Array.isArray(data)) {
    return data;
  }
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    Array.isArray((data as BaseResponse<T[]>).data)
  ) {
    return (data as BaseResponse<T[]>).data;
  }
  return [];
};

// ==================== Service ====================
export const testService = {
  // ==================== Subject APIs ====================
  getAllSubjects: async (): Promise<Subject[]> => {
    const response = await apiClient.get<Subject[]>("/subjects");
    return unwrapArrayResponse(response);
  },

  getSubjectById: async (id: string): Promise<Subject> => {
    const response = await apiClient.get<Subject>(`/subjects/${id}`);
    return unwrapResponse(response);
  },

  createSubject: async (name: string): Promise<Subject> => {
    const response = await apiClient.post<Subject>("/subjects", { name });
    return unwrapResponse(response);
  },

  updateSubject: async (id: string, name: string): Promise<Subject> => {
    const response = await apiClient.put<Subject>(`/subjects/${id}`, { name });
    return unwrapResponse(response);
  },

  deleteSubject: async (id: string): Promise<void> => {
    await apiClient.delete(`/subjects/${id}`);
  },

  // ==================== Topic APIs ====================
  getAllTopics: async (): Promise<Topic[]> => {
    const response = await apiClient.get<Topic[]>("/topics");
    return unwrapArrayResponse(response);
  },

  getTopicById: async (id: string): Promise<Topic> => {
    const response = await apiClient.get<Topic>(`/topics/${id}`);
    return unwrapResponse(response);
  },

  getTopicsBySubject: async (subjectId: string): Promise<Topic[]> => {
    const response = await apiClient.get<Topic[]>(`/topics/subject/${subjectId}`);
    return unwrapArrayResponse(response);
  },

  createTopic: async (name: string, subjectId: string): Promise<Topic> => {
    const response = await apiClient.post<Topic>("/topics", {
      name,
      subject_id: subjectId,
    });
    return unwrapResponse(response);
  },

  updateTopic: async (
    id: string,
    name: string,
    subjectId: string,
  ): Promise<Topic> => {
    const response = await apiClient.put<Topic>(`/topics/${id}`, {
      name,
      subject_id: subjectId,
    });
    return unwrapResponse(response);
  },

  deleteTopic: async (id: string): Promise<void> => {
    await apiClient.delete(`/topics/${id}`);
  },

  // ==================== Subtopic APIs ====================
  getAllSubtopics: async (): Promise<Subtopic[]> => {
    const response = await apiClient.get<Subtopic[]>("/subtopics");
    return unwrapArrayResponse(response);
  },

  getSubtopicById: async (id: string): Promise<Subtopic> => {
    const response = await apiClient.get<Subtopic>(`/subtopics/${id}`);
    return unwrapResponse(response);
  },

  getSubtopicsByTopic: async (topicId: string): Promise<Subtopic[]> => {
    const response = await apiClient.get<Subtopic[]>(`/subtopics/topic/${topicId}`);
    return unwrapArrayResponse(response);
  },

  createSubtopic: async (name: string, topicId: string): Promise<Subtopic> => {
    const response = await apiClient.post<Subtopic>("/subtopics", {
      name,
      topic_id: topicId,
    });
    return unwrapResponse(response);
  },

  updateSubtopic: async (
    id: string,
    name: string,
    topicId: string,
  ): Promise<Subtopic> => {
    const response = await apiClient.put<Subtopic>(`/subtopics/${id}`, {
      name,
      topic_id: topicId,
    });
    return unwrapResponse(response);
  },

  deleteSubtopic: async (id: string): Promise<void> => {
    await apiClient.delete(`/subtopics/${id}`);
  },

  // ==================== Question APIs ====================
  getAllQuestions: async (
    subjectId?: string,
    topicId?: string,
    subtopicId?: string,
  ): Promise<Question[]> => {
    const params = new URLSearchParams();
    if (subjectId) params.append("subjectId", subjectId);
    if (topicId) params.append("topicId", topicId);
    if (subtopicId) params.append("subtopicId", subtopicId);

    const url = `/questions${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await apiClient.get<Question[]>(url);
    return unwrapArrayResponse(response);
  },

  getQuestionById: async (id: string): Promise<Question> => {
    const response = await apiClient.get<Question>(`/questions/${id}`);
    return unwrapResponse(response);
  },

  createQuestion: async (dto: CreateQuestionRequest): Promise<Question> => {
    const apiDto = {
      type: dto.type,
      prompt: dto.prompt,
      subject_id: dto.subjectId,
      topic_id: dto.topicId,
      subtopic_id: dto.subtopicId,
      marks: dto.marks,
      mcqOptions: dto.mcqOptions,
      codeTemplate: dto.codeTemplate,
    };
    const response = await apiClient.post<Question>("/questions", apiDto);
    return unwrapResponse(response);
  },

  updateQuestion: async (
    id: string,
    dto: UpdateQuestionRequest,
  ): Promise<Question> => {
    const apiDto: Record<string, unknown> = {};
    if (dto.questionType !== undefined) apiDto.type = dto.questionType;
    if (dto.prompt !== undefined) apiDto.prompt = dto.prompt;
    if (dto.subjectId !== undefined) apiDto.subject_id = dto.subjectId;
    if (dto.topicId !== undefined) apiDto.topic_id = dto.topicId;
    if (dto.subtopicId !== undefined) apiDto.subtopic_id = dto.subtopicId;
    if (dto.marks !== undefined) apiDto.marks = dto.marks;
    if (dto.mcqOptions !== undefined) apiDto.mcqOptions = dto.mcqOptions;
    if (dto.codeTemplate !== undefined) apiDto.codeTemplate = dto.codeTemplate;
    
    const response = await apiClient.patch<Question>(`/questions/${id}`, apiDto);
    return unwrapResponse(response);
  },

  deleteQuestion: async (id: string): Promise<void> => {
    await apiClient.delete(`/questions/${id}`);
  },

  // ==================== Test Case APIs ====================
  getAllTestCases: async (): Promise<TestCase[]> => {
    const response = await apiClient.get<TestCase[]>("/test-cases");
    return response.data || [];
  },

  getTestCasesByQuestion: async (questionId: string): Promise<TestCase[]> => {
    const allTestCases = await testService.getAllTestCases();
    return allTestCases.filter((tc: TestCase) => tc.questionId === questionId);
  },

  createTestCase: async (dto: CreateTestCaseRequest): Promise<TestCase> => {
    const response = await apiClient.post<TestCase>("/test-cases", dto);
    return response.data;
  },

  updateTestCase: async (
    id: string,
    dto: UpdateTestCaseRequest,
  ): Promise<TestCase> => {
    const response = await apiClient.patch<TestCase>(`/test-cases/update/${id}`, dto);
    return response.data;
  },

  deleteTestCase: async (id: string): Promise<string> => {
    const response = await apiClient.delete<string>(`/test-cases/delete/${id}`);
    return response.data;
  },

  // ==================== Test APIs ====================
  getAllTests: async (): Promise<Test[]> => {
    const response = await apiClient.get<Test[]>("/tests");
    return unwrapArrayResponse(response);
  },

  getInactiveTests: async (): Promise<Test[]> => {
    const response = await apiClient.get<Test[]>("/tests/inactive");
    return unwrapArrayResponse(response);
  },

  getTestById: async (id: string): Promise<Test> => {
    const response = await apiClient.get<Test>(`/tests/${id}`);
    return unwrapResponse(response);
  },

  createTest: async (test: CreateTestRequest): Promise<Test> => {
    const response = await apiClient.post<Test>("/tests", test);
    return unwrapResponse(response);
  },

  updateTest: async (
    id: string,
    test: Partial<CreateTestRequest>,
  ): Promise<Test> => {
    const response = await apiClient.patch<Test>(`/tests/${id}`, test);
    return unwrapResponse(response);
  },

  deleteTest: async (id: string): Promise<void> => {
    await apiClient.patch(`/tests/${id}/inactive`);
  },

  activateTest: async (id: string): Promise<void> => {
    await apiClient.patch(`/tests/${id}/active`);
  },

  // ==================== Test Question APIs ====================
  createTestQuestion: async (
    dto: CreateTestQuestionRequest,
  ): Promise<TestQuestion> => {
    const response = await apiClient.post<TestQuestion>("/test-questions", dto);
    return unwrapResponse(response);
  },

  getTestQuestions: async (
    testId?: string,
    questionId?: string,
  ): Promise<TestQuestion[]> => {
    const params = new URLSearchParams();
    if (testId) params.append("testId", testId);
    if (questionId) params.append("questionId", questionId);

    const url = `/test-questions${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await apiClient.get<TestQuestion[]>(url);
    return unwrapArrayResponse(response);
  },

  getTestQuestionById: async (id: string): Promise<TestQuestion> => {
    const response = await apiClient.get<TestQuestion>(`/test-questions/${id}`);
    return unwrapResponse(response);
  },

  updateTestQuestion: async (
    id: string,
    dto: Partial<CreateTestQuestionRequest>,
  ): Promise<TestQuestion> => {
    const response = await apiClient.put<TestQuestion>(`/test-questions/${id}`, dto);
    return unwrapResponse(response);
  },

  deleteTestQuestion: async (id: string): Promise<void> => {
    await apiClient.delete(`/test-questions/${id}`);
  },

  // Helper: Add question to test
  addQuestionToTest: async (
    testId: string,
    questionId: string,
    orderIndex: number,
    marks: number,
    timeLimitSecs: number,
  ): Promise<TestQuestion> => {
    return testService.createTestQuestion({
      testId,
      questionId,
      orderIndex,
      marks,
      timeLimitSecs,
    });
  },

  // Helper: Remove question from test
  removeQuestionFromTest: async (testQuestionId: string): Promise<void> => {
    await testService.deleteTestQuestion(testQuestionId);
  },

  // Helper: Bulk add questions to test
  bulkAddQuestionsToTest: async (
    dto: BulkAddQuestionsRequest,
  ): Promise<TestQuestion[]> => {
    const response = await apiClient.post<TestQuestion[]>(`/test-questions/bulk`, dto);
    return unwrapArrayResponse(response);
  },

  // Helper: Get questions for a test
  getQuestionsForTest: async (testId: string): Promise<Question[]> => {
    const testQuestions = await testService.getTestQuestions(testId);
    const questionIds = testQuestions.map((tq) => tq.questionId);
    if (questionIds.length === 0) return [];

    const allQuestions = await testService.getAllQuestions();
    return allQuestions.filter((q) => questionIds.includes(q.id));
  },

  // Helper: Get available questions not in test
  getAvailableQuestions: async (testId: string): Promise<Question[]> => {
    const [allQuestions, testQuestions] = await Promise.all([
      testService.getAllQuestions(),
      testService.getTestQuestions(testId),
    ]);

    const testQuestionIds = new Set(testQuestions.map((tq) => tq.questionId));
    return allQuestions.filter((q) => !testQuestionIds.has(q.id));
  },

  // ==================== Helper Methods for UI ====================
  toViewModel: (test: Test): TestViewModel => {
    const status = (test.status || "DRAFT").toLowerCase();
    const difficulty = (test.difficulty || "MEDIUM").toLowerCase();
    const passMark = test.passMark || 40;
    const duration = test.durationMins || 60;

    const questions = test.questions || test.testQuestions || [];

    let type = "Mixed";
    if (questions.length > 0) {
      const types = new Set(questions.map((tq) => tq.question?.type));
      if (types.size === 1) {
        const questionType = Array.from(types)[0];
        type =
          questionType === "MCQ"
            ? "MCQ"
            : questionType === "CODING"
              ? "Coding"
              : "Mixed";
      }
    }

    const totalMarks =
      questions.reduce((sum, tq) => sum + (tq.marks || 0), 0) || 0;

    return {
      id: test.id,
      name: test.title,
      description: test.description,
      type,
      duration,
      questions: questions.length,
      totalMarks,
      passingMarks: passMark,
      status,
      participants: 0,
      difficulty,
      passMark,
      isActive: test.isActive,
    };
  },

  getStatusStyle: (status: string): string => {
    const styles: Record<string, string> = {
      published: "bg-green-500/10 text-green-500 border-green-500/20",
      draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      archived: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return styles[status.toLowerCase()] || styles.draft;
  },

  getTypeStyle: (type: string): string => {
    const styles: Record<string, string> = {
      mcq: "bg-purple-500/10 text-purple-500",
      coding: "bg-blue-500/10 text-blue-500",
      mixed: "bg-gray-500/10 text-gray-700",
    };
    return styles[type.toLowerCase()] || styles.mixed;
  },

  getDifficultyStyle: (difficulty: string): string => {
    const styles: Record<string, string> = {
      easy: "bg-green-500/10 text-green-500",
      medium: "bg-yellow-500/10 text-yellow-500",
      hard: "bg-red-500/10 text-red-500",
    };
    return styles[difficulty.toLowerCase()] || styles.medium;
  },

  // ==================== Test Schedule APIs ====================
  getAllSchedules: async (): Promise<TestSchedule[]> => {
    const response = await apiClient.get<TestSchedule[]>("/schedules/all");
    return response.data || [];
  },

  createSchedule: async (dto: CreateTestScheduleRequest): Promise<string> => {
    const response = await apiClient.post<string>("/schedules/create", dto);
    return response.data;
  },

  getAllTestSchedules: async (): Promise<TestScheduleExtended[]> => {
    const response = await apiClient.get<TestScheduleExtended[]>("/test-schedules");
    return unwrapArrayResponse(response);
  },

  getTestScheduleById: async (id: string): Promise<TestScheduleExtended> => {
    const response = await apiClient.get<TestScheduleExtended>(`/test-schedules/${id}`);
    return unwrapResponse(response);
  },

createTestSchedule: async (
  request: CreateTestScheduleExtendedRequest,
): Promise<TestScheduleExtended> => {
  // DO NOT send createdById - backend gets it from Security Context
  const payload = {
    testId: request.testId,
    startTime: request.startTime,
    endTime: request.endTime,
    maxCandidates: request.maxCandidates || 100,
  };
  
  console.log("Final payload being sent:", payload);
  
  const response = await apiClient.post<TestScheduleExtended>("/test-schedules", payload);
  console.log("Schedule creation response:", response);
  return unwrapResponse(response);
},
// Add this to your testService object in test-service.ts

updateTestScheduleStatus: async (scheduleId: string, status: string): Promise<TestScheduleExtended> => {
  const response = await apiClient.patch<TestScheduleExtended>(`/test-schedules/${scheduleId}/status`, { status });
  return unwrapResponse(response);
},

  deleteTestSchedule: async (id: string): Promise<void> => {
    await apiClient.delete(`/test-schedules/${id}`);
  },
};