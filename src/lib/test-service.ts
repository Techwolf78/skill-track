import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";

// ==================== Request DTOs ====================
export interface CreateTestRequest {
  createdById: string;
  title: string;
  description?: string;
  durationMins: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  instructions?: Record<string, unknown>;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  passMark: number;
}

export interface CreateTestQuestionRequest {
  testId: string;
  questionId: string;
  orderIndex: number;
  marks: number;
  timeLimitSecs: number;
}

export interface CreateSubjectRequest {
  name: string;
}

export interface CreateTopicRequest {
  name: string;
  subjectId: string;
}

export interface CreateSubtopicRequest {
  name: string;
  subjectId: string;
}

// ==================== Models ====================
export interface Subject {
  id: string;
  name: string;
  topics?: Topic[];
  subtopics?: Subtopic[];
  questions?: Question[];
}

export interface Topic {
  id: string;
  name: string;
  subject?: Subject;
  questions?: Question[];
}

export interface Subtopic {
  id: string;
  name: string;
  subject?: Subject;
  questions?: Question[];
}

export interface Question {
  id: string;
  subjectId: string;
  topicId: string;
  subtopicId: string;
  type: "MCQ" | "TEXT" | "CODE";
  prompt: string;
  mcqOptions?: Array<Record<string, unknown>>;
}

export interface TestQuestion {
  id?: string;
  testId: string;
  questionId: string;
  orderIndex: number;
  marks: number;
  timeLimitSecs: number;
  question?: Question;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
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
  createdAt?: string;
  updatedAt?: string;
  testQuestions?: TestQuestion[];
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
  batch?: string;
  college?: string;
  scheduledFor?: string;
  status: string;
  participants?: number;
  difficulty: string;
  passMark: number;
}

// ==================== Service ====================
export const testService = {
  // ==================== Subject APIs ====================
  // FIXED: Backend returns direct array, not wrapped in BaseResponse
  getAllSubjects: async (): Promise<Subject[]> => {
    const response = await apiClient.get<Subject[]>("/subjects");
    return response.data || [];
  },

  getSubjectById: async (id: string): Promise<Subject> => {
    const response = await apiClient.get<Subject>(`/subjects/${id}`);
    return response.data;
  },

  createSubject: async (name: string): Promise<string> => {
    const response = await apiClient.post<string>("/subjects", { name });
    return response.data;
  },

  deleteSubject: async (id: string): Promise<string> => {
    const response = await apiClient.delete<string>(`/subjects/${id}`);
    return response.data;
  },

  // ==================== Topic APIs ====================
  // FIXED: Backend returns direct array
  getAllTopics: async (): Promise<Topic[]> => {
    const response = await apiClient.get<Topic[]>("/topics");
    return response.data || [];
  },

  getTopicById: async (id: string): Promise<Topic> => {
    const response = await apiClient.get<Topic>(`/topics/${id}`);
    return response.data;
  },

  createTopic: async (name: string, subjectId: string): Promise<string> => {
    const response = await apiClient.post<string>("/topics", {
      name,
      subjectId,
    });
    return response.data;
  },

  deleteTopic: async (id: string): Promise<string> => {
    const response = await apiClient.delete<string>(`/topics/${id}`);
    return response.data;
  },

  // ==================== Subtopic APIs ====================
  // FIXED: Backend returns direct array
  getAllSubtopics: async (): Promise<Subtopic[]> => {
    const response = await apiClient.get<Subtopic[]>("/subtopics");
    return response.data || [];
  },

  getSubtopicById: async (id: string): Promise<Subtopic> => {
    const response = await apiClient.get<Subtopic>(`/subtopics/${id}`);
    return response.data;
  },

  createSubtopic: async (name: string, subjectId: string): Promise<string> => {
    const response = await apiClient.post<string>("/subtopics", {
      name,
      subjectId,
    });
    return response.data;
  },

  deleteSubtopic: async (id: string): Promise<string> => {
    const response = await apiClient.delete<string>(`/subtopics/${id}`);
    return response.data;
  },

  // ==================== Test APIs ====================
  getAllTests: async (): Promise<Test[]> => {
    const response = await apiClient.get<Test[]>("/tests/all");
    return response.data || [];
  },

  getTestById: async (id: string): Promise<Test> => {
    const response = await apiClient.get<Test>(`/tests/${id}`);
    return response.data;
  },

  createTest: async (test: CreateTestRequest): Promise<string> => {
    const response = await apiClient.post<string>("/tests/create", test);
    return response.data;
  },

  updateTest: async (
    id: string,
    test: Partial<CreateTestRequest>,
  ): Promise<string> => {
    const response = await apiClient.put<string>(`/tests/update/${id}`, test);
    return response.data;
  },

  deleteTest: async (id: string): Promise<string> => {
    const response = await apiClient.delete<string>(`/tests/delete/${id}`);
    return response.data;
  },

  publishTest: async (id: string): Promise<string> => {
    return testService.updateTest(id, { status: "PUBLISHED" });
  },

  archiveTest: async (id: string): Promise<string> => {
    return testService.updateTest(id, { status: "ARCHIVED" });
  },

  getTestsByStatus: async (status: string): Promise<Test[]> => {
    const allTests = await testService.getAllTests();
    return allTests.filter((test) => test.status === status.toUpperCase());
  },

  getTestsByCreator: async (creatorId: string): Promise<Test[]> => {
    const allTests = await testService.getAllTests();
    return allTests.filter((test) => test.createdBy?.id === creatorId);
  },

  // ==================== Test Question APIs ====================
  addQuestionToTest: async (
    dto: CreateTestQuestionRequest,
  ): Promise<string> => {
    console.warn("addQuestionToTest endpoint not implemented in backend");
    return "Not implemented";
  },

  getTestQuestions: async (testId: string): Promise<TestQuestion[]> => {
    console.warn("getTestQuestions endpoint not implemented in backend");
    return [];
  },

  updateTestQuestion: async (
    testId: string,
    questionId: string,
    dto: Partial<CreateTestQuestionRequest>,
  ): Promise<string> => {
    console.warn("updateTestQuestion endpoint not implemented in backend");
    return "Not implemented";
  },

  removeQuestionFromTest: async (
    testId: string,
    questionId: string,
  ): Promise<string> => {
    console.warn("removeQuestionFromTest endpoint not implemented in backend");
    return "Not implemented";
  },

  reorderTestQuestions: async (
    testId: string,
    questionOrders: Array<{ questionId: string; orderIndex: number }>,
  ): Promise<string> => {
    console.warn("reorderTestQuestions endpoint not implemented in backend");
    return "Not implemented";
  },

  bulkAddQuestionsToTest: async (
    testId: string,
    questions: CreateTestQuestionRequest[],
  ): Promise<string> => {
    console.warn("bulkAddQuestionsToTest endpoint not implemented in backend");
    return "Not implemented";
  },

  // ==================== Question APIs ====================
  getAllQuestions: async (): Promise<Question[]> => {
    const response = await apiClient.get<Question[]>("/questions");
    return response.data || [];
  },

  getQuestionById: async (id: string): Promise<Question> => {
    const response = await apiClient.get<Question>(`/questions/${id}`);
    return response.data;
  },

  createQuestion: async (dto: any): Promise<string> => {
    const response = await apiClient.post<string>("/questions", dto);
    return response.data;
  },

  updateQuestion: async (id: string, dto: any): Promise<string> => {
    const response = await apiClient.put<string>(`/questions/${id}`, dto);
    return response.data;
  },

  deleteQuestion: async (id: string): Promise<string> => {
    const response = await apiClient.delete<string>(`/questions/${id}`);
    return response.data;
  },

  // ==================== Helper Methods ====================
  toViewModel: (test: Test): TestViewModel => {
    let type = "Mixed";
    if (test.testQuestions && test.testQuestions.length > 0) {
      const types = new Set(test.testQuestions.map((tq) => tq.question?.type));
      if (types.size === 1) {
        const questionType = Array.from(types)[0];
        type =
          questionType === "MCQ"
            ? "MCQ"
            : questionType === "CODE"
              ? "Coding"
              : "Mixed";
      }
    }

    const totalMarks =
      test.testQuestions?.reduce((sum, tq) => sum + tq.marks, 0) || 0;

    return {
      id: test.id,
      name: test.title,
      description: test.description,
      type,
      duration: test.durationMins,
      questions: test.testQuestions?.length || 0,
      totalMarks: totalMarks,
      passingMarks: test.passMark,
      status: test.status.toLowerCase(),
      participants: 0,
      difficulty: test.difficulty.toLowerCase(),
      passMark: test.passMark,
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

  getFullTestDetails: async (testId: string): Promise<Test> => {
    return testService.getTestById(testId);
  },

  getAvailableQuestionsForTest: async (testId: string): Promise<Question[]> => {
    console.warn(
      "getAvailableQuestionsForTest endpoint not implemented in backend",
    );
    return [];
  },

  getTestTotalMarks: async (testId: string): Promise<number> => {
    const test = await testService.getTestById(testId);
    return test.testQuestions?.reduce((sum, q) => sum + q.marks, 0) || 0;
  },

  getTestTotalDuration: async (testId: string): Promise<number> => {
    const test = await testService.getTestById(testId);
    return test.durationMins;
  },
};
