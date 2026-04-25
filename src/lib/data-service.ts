import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  extraFields?: Record<string, unknown>;
  organisation_id: string;
}

export interface OrganisationResponse {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganisationRequest {
  name: string;
  logoUrl?: string;
}

export const candidateService = {
  getCandidates: async (): Promise<Candidate[]> => {
    const response = await apiClient.get<BaseResponse<Candidate[]>>("/candidates");
    return response.data.data || [];
  },

  createCandidate: async (candidate: unknown): Promise<string> => {
    const response = await apiClient.post<BaseResponse<string>>("/candidates", candidate);
    return response.data.data;
  },

  updateCandidate: async (id: string, candidate: unknown): Promise<Candidate> => {
    const response = await apiClient.patch<BaseResponse<Candidate>>(`/candidates/${id}`, candidate);
    return response.data.data;
  },

  deleteCandidate: async (id: string): Promise<void> => {
    await apiClient.delete(`/candidates/${id}`);
  },
};

export const organisationService = {
  getOrganisations: async (): Promise<OrganisationResponse[]> => {
    const response = await apiClient.get<BaseResponse<OrganisationResponse[]>>("/organisations");
    return response.data.data || [];
  },

  getOrganisationById: async (id: string): Promise<OrganisationResponse> => {
    const response = await apiClient.get<BaseResponse<OrganisationResponse>>(`/organisations/${id}`);
    return response.data.data;
  },

  createOrganisation: async (organisation: CreateOrganisationRequest): Promise<OrganisationResponse> => {
    const response = await apiClient.post<BaseResponse<OrganisationResponse>>("/organisations", organisation);
    return response.data.data;
  },

  updateOrganisation: async (id: string, organisation: unknown): Promise<OrganisationResponse> => {
    const response = await apiClient.patch<BaseResponse<OrganisationResponse>>(`/organisations/${id}`, organisation);
    return response.data.data;
  },

  deleteOrganisation: async (id: string): Promise<void> => {
    await apiClient.delete(`/organisations/${id}`);
  },
};

export const questionService = {
  getAllQuestions: async (): Promise<unknown[]> => {
    const response = await apiClient.get<unknown[]>("/questions");
    return response.data;
  },

  getQuestionById: async (id: string): Promise<unknown> => {
    const response = await apiClient.get<unknown>(`/questions/${id}`);
    return response.data;
  },

  createQuestion: async (question: unknown): Promise<string> => {
    const response = await apiClient.post<string>("/questions", question);
    return response.data;
  },

  updateQuestion: async (id: string, question: unknown): Promise<unknown> => {
    const response = await apiClient.patch<unknown>(`/questions/${id}`, question);
    return response.data;
  },

  deleteQuestion: async (id: string): Promise<string> => {
    const response = await apiClient.delete<string>(`/questions/${id}`);
    return response.data;
  },
};

export interface TestResponse {
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
  startTime?: string;
  endTime?: string;
  status: string;
  participants?: number;
  organisation_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTestRequest {
  name: string;
  description?: string;
  type: string;
  duration: number;
  totalMarks: number;
  passingMarks?: number;
  batch?: string;
  college?: string;
  scheduledFor?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  organisation_id?: string;
}

export interface UpdateTestRequest {
  name?: string;
  description?: string;
  type?: string;
  duration?: number;
  totalMarks?: number;
  passingMarks?: number;
  batch?: string;
  college?: string;
  scheduledFor?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  organisation_id?: string;
}

export const testService = {
  getAllTests: async (): Promise<TestResponse[]> => {
    const response = await apiClient.get<BaseResponse<TestResponse[]>>("/tests");
    return response.data.data || [];
  },

  getTestById: async (id: string): Promise<TestResponse> => {
    const response = await apiClient.get<BaseResponse<TestResponse>>(`/tests/${id}`);
    return response.data.data;
  },

  createTest: async (test: CreateTestRequest): Promise<TestResponse> => {
    const response = await apiClient.post<BaseResponse<TestResponse>>("/tests", test);
    return response.data.data;
  },

  updateTest: async (id: string, test: UpdateTestRequest): Promise<TestResponse> => {
    const response = await apiClient.patch<BaseResponse<TestResponse>>(`/tests/${id}`, test);
    return response.data.data;
  },

  deleteTest: async (id: string): Promise<void> => {
    await apiClient.delete(`/tests/${id}`);
  },
};
