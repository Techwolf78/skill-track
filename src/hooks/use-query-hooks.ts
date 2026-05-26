import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  testService,
  Subject,
  Topic,
  Subtopic,
  CreateSubjectRequest,
  CreateTopicRequest,
  CreateSubtopicRequest,
  Test,
  CreateTestRequest,
  TestScheduleExtended,
  CreateTestScheduleExtendedRequest,
  Question,
  CreateQuestionRequest,
  UpdateQuestionRequest,
} from "@/lib/test-service";
import { candidateService, Candidate, CreateCandidateRequest } from "@/lib/candidate-service";
import { organisationService, OrganisationResponse, CreateOrganisationRequest } from "@/lib/organisation-service";

// ==================== Subjects Hooks ====================

export function useSubjectsQuery() {
  return useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: testService.getAllSubjects,
  });
}

export function useCreateSubjectMutation() {
  const queryClient = useQueryClient();
  return useMutation<Subject, Error, string>({
    mutationFn: testService.createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}

export function useUpdateSubjectMutation() {
  const queryClient = useQueryClient();
  return useMutation<Subject, Error, { id: string; name: string }>({
    mutationFn: ({ id, name }) => testService.updateSubject(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}

export function useDeleteSubjectMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: testService.deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}

// ==================== Topics Hooks ====================

export function useTopicsQuery() {
  return useQuery<Topic[]>({
    queryKey: ["topics"],
    queryFn: testService.getAllTopics,
  });
}

export function useCreateTopicMutation() {
  const queryClient = useQueryClient();
  return useMutation<Topic, Error, { name: string; subjectId: string }>({
    mutationFn: ({ name, subjectId }) => testService.createTopic(name, subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

export function useUpdateTopicMutation() {
  const queryClient = useQueryClient();
  return useMutation<Topic, Error, { id: string; name: string; subjectId: string }>({
    mutationFn: ({ id, name, subjectId }) => testService.updateTopic(id, name, subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

export function useDeleteTopicMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: testService.deleteTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

// ==================== Subtopics Hooks ====================

export function useSubtopicsQuery() {
  return useQuery<Subtopic[]>({
    queryKey: ["subtopics"],
    queryFn: testService.getAllSubtopics,
  });
}

export function useCreateSubtopicMutation() {
  const queryClient = useQueryClient();
  return useMutation<Subtopic, Error, { name: string; topicId: string }>({
    mutationFn: ({ name, topicId }) => testService.createSubtopic(name, topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtopics"] });
    },
  });
}

export function useUpdateSubtopicMutation() {
  const queryClient = useQueryClient();
  return useMutation<Subtopic, Error, { id: string; name: string; topicId: string }>({
    mutationFn: ({ id, name, topicId }) => testService.updateSubtopic(id, name, topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtopics"] });
    },
  });
}

export function useDeleteSubtopicMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: testService.deleteSubtopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtopics"] });
    },
  });
}

// ==================== Candidates Hooks ====================

export function useCandidatesQuery() {
  return useQuery<Candidate[]>({
    queryKey: ["candidates"],
    queryFn: candidateService.getCandidates,
  });
}

export function useCreateCandidateMutation() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, CreateCandidateRequest>({
    mutationFn: candidateService.createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteCandidateMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: candidateService.deleteCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    throwOnError: false,
  });
}

// ==================== Organisations Hooks ====================

export function useOrganisationsQuery() {
  return useQuery<OrganisationResponse[]>({
    queryKey: ["organisations"],
    queryFn: organisationService.getOrganisations,
  });
}

export function useCreateOrganisationMutation() {
  const queryClient = useQueryClient();
  return useMutation<OrganisationResponse, Error, CreateOrganisationRequest>({
    mutationFn: organisationService.createOrganisation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
    },
  });
}

// ==================== Tests Hooks ====================

export function useTestsQuery() {
  return useQuery<Test[]>({
    queryKey: ["tests"],
    queryFn: testService.getAllTests,
  });
}

export function useInactiveTestsQuery() {
  return useQuery<Test[]>({
    queryKey: ["inactiveTests"],
    queryFn: testService.getInactiveTests,
  });
}

export function useCreateTestMutation() {
  const queryClient = useQueryClient();
  return useMutation<Test, Error, CreateTestRequest>({
    mutationFn: testService.createTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });
}

export function useUpdateTestMutation() {
  const queryClient = useQueryClient();
  return useMutation<Test, Error, { id: string; test: Partial<CreateTestRequest> }>({
    mutationFn: ({ id, test }) => testService.updateTest(id, test),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      queryClient.invalidateQueries({ queryKey: ["inactiveTests"] });
    },
  });
}

export function useDeleteTestMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: testService.deleteTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      queryClient.invalidateQueries({ queryKey: ["inactiveTests"] });
    },
  });
}

export function useActivateTestMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: testService.activateTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      queryClient.invalidateQueries({ queryKey: ["inactiveTests"] });
    },
  });
}

// ==================== Test Schedules Hooks ====================

export function useTestSchedulesQuery() {
  return useQuery<TestScheduleExtended[]>({
    queryKey: ["test-schedules"],
    queryFn: testService.getAllTestSchedules,
  });
}

export function useCreateTestScheduleMutation() {
  const queryClient = useQueryClient();
  return useMutation<TestScheduleExtended, Error, CreateTestScheduleExtendedRequest>({
    mutationFn: testService.createTestSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-schedules"] });
    },
  });
}

export function useUpdateTestScheduleStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation<TestScheduleExtended, Error, { scheduleId: string; status: string }>({
    mutationFn: ({ scheduleId, status }) => testService.updateTestScheduleStatus(scheduleId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-schedules"] });
    },
  });
}

// ==================== Questions Hooks ====================

export function useQuestionsQuery() {
  return useQuery<Question[]>({
    queryKey: ["questions"],
    queryFn: () => testService.getAllQuestions(),
  });
}

export function useCreateQuestionMutation() {
  const queryClient = useQueryClient();
  return useMutation<Question, Error, CreateQuestionRequest>({
    mutationFn: testService.createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
  });
}

export function useUpdateQuestionMutation() {
  const queryClient = useQueryClient();
  return useMutation<Question, Error, { id: string; dto: UpdateQuestionRequest }>({
    mutationFn: ({ id, dto }) => testService.updateQuestion(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
  });
}

export function useDeleteQuestionMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: testService.deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
  });
}
