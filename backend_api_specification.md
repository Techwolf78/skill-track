# RxOne Backend: Complete Developer API Specification Report
This document provides a highly detailed, comprehensive guide to the RxOne backend architecture, database model, authentication/authorization layers, API endpoints, DTO models, and system enums. It is designed to act as the single source of truth for the frontend development team to facilitate flawless integration.

## 1. System & Architectural Overview
- **Backend Framework**: Spring Boot (Java 17+)
- **Database**: PostgreSQL (Migrations managed by Flyway)
- **API Architecture**: REST APIs exposing structured JSON responses
- **Common Envelope Format**: Every API response is wrapped in a standard `BaseResponse<T>` schema:
  ```json
  {
    "success": boolean,
    "status": integer,
    "message": "string",
    "data": T,
    "errorCode": "string",
    "errors": null or Object/Array,
    "timestamp": "ISO-8601 string",
    "path": "string",
    "correlationId": "string"
  }
  ```
- **Authentication**: Stateless JWT-based authentication. Frontend must include the header `Authorization: Bearer <token>` for all secured endpoints.
- **Execution Engine**: Sandboxed code execution is integrated via RapidAPI Judge0 for coding questions and submissions.
- **Resilience & Fault Tolerance (Resilience4j)**: Resilience4j Circuit Breaker is active on the Judge0 API calls (instance: `judge0`, window-size: 5, failure-rate: 100%, wait-duration: 10s). If the circuit breaker trips, calls fallback immediately and throws `Judge0UnavailableException`, resulting in a `503 Service Unavailable` response with `errorCode: "JUDGE0_UNAVAILABLE"`.
- **Performance Optimization**: Java Virtual Threads are enabled (`spring.threads.virtual.enabled=true`) for high-throughput, non-blocking asynchronous grading and code execution operations.

## 2. Platform Enums & Type Definitions
These values must be matched exactly in frontend dropdowns, status indicators, and payload mapping.

### `CodeRunStatus`
Allowed values:
- `ACCEPTED`
- `WRONG_ANSWER`
- `COMPILE_ERROR`
- `RUNTIME_ERROR`
- `TLE`
- `ERROR`

### `CodingSubmissionStatus`
Allowed values:
- `ACCEPTED`
- `PARTIAL`
- `WRONG_ANSWER`
- `COMPILE_ERROR`
- `TLE`
- `ERROR`

### `Difficulty`
Allowed values:
- `EASY`
- `MEDIUM`
- `HARD`

### `ExecutionStatus`
Allowed values:
- `QUEUED`
- `PROCESSING`
- `ACCEPTED`
- `WRONG_ANSWER`
- `TIME_LIMIT_EXCEEDED`
- `COMPILATION_ERROR`
- `RUNTIME_ERROR`
- `INTERNAL_ERROR`

### `InvitationStatus`
Allowed values:
- `PENDING`
- `ACCEPTED`
- `EXPIRED`

### `Judge0PendingStatus`
Allowed values:
- `SUBMITTED`
- `PROCESSING`
- `COMPLETED`
- `FAILED`

### `McqType`
Allowed values:
- `SINGLE_CORRECT`
- `MULTIPLE_CORRECT`
- `TRUE_FALSE`
- `IMAGE_SINGLE_CORRECT`
- `IMAGE_MULTIPLE_CORRECT`
- `ASSERTION_REASON`
- `FILL_IN_THE_BLANK`

### `PasswordProvider`
Allowed values:
- `LOCAL`
- `GOOGLE`

### `QuestionType`
Allowed values:
- `MCQ`
- `CODING`

### `QuestionVisibility`
Allowed values:
- `PUBLIC`
- `ORG_OWNED`

### `Role`
Allowed values:
- `ADMIN`
- `SUPERADMIN`
- `CANDIDATE`
- `GUEST`
- `TRAINER`

### `ScheduleStatus`
Allowed values:
- `SCHEDULED`
- `LIVE`
- `COMPLETED`

### `SubmissionStatus`
Allowed values:
- `PENDING`
- `GRADED`
- `PENDING_GRADING`
- `FAILED`

### `TestSessionStatus`
Allowed values:
- `ACTIVE`
- `SUBMITTED`
- `FLAGGED`
- `TERMINATED`
- `INACTIVE`
- `EVALUATED`

### `TestStatus`
Allowed values:
- `DRAFT`
- `PUBLISHED`
- `ARCHIVED`

## 3. REST API Endpoint Catalog
All endpoints below are relative to the base URL (typically `http://localhost:8081`).

### AdminController
- **Base Path**: `/admin`
- **Class-level Security**: `@sec.isAdminOrSuperAdmin()`

#### `[POST] /admin/users`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> createUser( @RequestBody @Valid CreateUserRequest request, @RequestParam Role role )`

### AuthController
- **Base Path**: `/auth`

#### `[POST] /auth/register`
- **Authentication / Security Rule**: `permitAll()`
- **Method Signature**: `public ResponseEntity<BaseResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request)`

#### `[POST] /auth/login`
- **Authentication / Security Rule**: `permitAll()`
- **Method Signature**: `public ResponseEntity<BaseResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request)`

#### `[PATCH] /auth/reset-password`
- **Authentication / Security Rule**: `isAuthenticated()`
- **Method Signature**: `public ResponseEntity<BaseResponse<AuthResponse>> resetPassword(@Valid @RequestBody ResetPasswordRequest request)`

### CandidateController
- **Base Path**: `/candidates`
- **Class-level Security**: `@sec.isAdminOrSuperAdmin()`

#### `[POST] /candidates`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> createCandidate(@RequestBody @Valid CreateCandidateRequest request)`

#### `[GET] /candidates`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<CandidateResponse>>> getCandidates( @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size)`

#### `[POST] /candidates/bulk-upload`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<BulkUploadResult>> bulkUpload(@RequestParam("file") MultipartFile file)`

#### `[PATCH] /candidates/{id}`
- **Authentication / Security Rule**: `@authorizationService.canAccessCandidate(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<CandidateResponse>> patchCandidate( @PathVariable UUID id, @RequestBody UpdateCandidateRequest request )`

#### `[DELETE] /candidates/{id}`
- **Authentication / Security Rule**: `@authorizationService.canAccessCandidate(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> deleteCandidate(@PathVariable UUID id)`

### CandidateInvitationController
- **Base Path**: `/candidate-invitations`

#### `[POST] /candidate-invitations`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<CandidateInvitationResponse>> create( @RequestBody @Valid CreateCandidateInvitationRequest request )`

#### `[GET] /candidate-invitations`
- **Authentication / Security Rule**: `@sec.isAnyRole()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<CandidateInvitationResponse>>> getAll( @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size )`

#### `[GET] /candidate-invitations/{id}`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessInvitation(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<CandidateInvitationResponse>> getById( @PathVariable UUID id )`

#### `[PATCH] /candidate-invitations/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessInvitation(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<CandidateInvitationResponse>> patch( @PathVariable UUID id, @RequestBody @Valid PatchCandidateInvitationRequest request )`

#### `[DELETE] /candidate-invitations/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessInvitation(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> delete( @PathVariable UUID id )`

#### `[GET] /candidate-invitations/validate/{token}`
- **Authentication / Security Rule**: `permitAll()`
- **Method Signature**: `public ResponseEntity<BaseResponse<CandidateInvitationResponse>> validateToken( @PathVariable String token )`

### CodeExecutionController
- **Base Path**: `/api/code/execute`

#### `[POST] /api/code/execute/run`
- **Authentication / Security Rule**: `@sec.isAnyRole()`
- **Method Signature**: `public ResponseEntity<BaseResponse<List<CodeRunResponseDTO>>> run(@RequestBody @Valid CodeRunRequest request)`

#### `[POST] /api/code/execute/submit`
- **Authentication / Security Rule**: `@sec.isAnyRole()`
- **Method Signature**: `public ResponseEntity<BaseResponse<UUID>> submit(@RequestBody @Valid CodeRunRequest request)`

#### `[GET] /api/code/execute/submit/{submissionId}/result`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessSubmission(#submissionId)`
- **Method Signature**: `public ResponseEntity<BaseResponse<CodingSubmissionResultDTO>> getResult(@PathVariable UUID submissionId)`

#### `[POST] /api/code/execute/playground`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<List<CodeRunResponseDTO>>> playground(@RequestBody @Valid com.gryphon.rxone.DTO.CodeExecution.PlaygroundRequest request)`

### OrganisationController
- **Base Path**: `/organisations`

#### `[GET] /organisations`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<OrganisationResponse>>> getOrganisations( @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size )`

#### `[POST] /organisations`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<OrganisationResponse>> createOrganisation(@RequestBody @Valid CreateOrganisationRequest request)`

#### `[GET] /organisations/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessOrganisation(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<OrganisationResponse>> getOrganisationById(@PathVariable UUID id)`

#### `[PATCH] /organisations/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessOrganisation(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<OrganisationResponse>> updateOrganisation( @PathVariable UUID id, @RequestBody @Valid UpdateOrganisationRequest request )`

### QuestionController
- **Base Path**: `/questions`

#### `[POST] /questions`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<QuestionResponse>> createQuestion(@RequestBody @Valid CreateQuestionRequest request)`

#### `[GET] /questions/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessQuestion(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<QuestionResponse>> getQuestionById(@PathVariable UUID id)`

#### `[DELETE] /questions/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessQuestion(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> deleteQuestion(@PathVariable UUID id)`

#### `[GET] /questions`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<QuestionResponse>>> getAllQ( @RequestParam(required = false) UUID subjectId, @RequestParam(required = false) UUID topicId, @RequestParam(required = false) UUID subtopicId, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size )`

#### `[PUT] /questions/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessQuestion(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<QuestionResponse>> updateQuestion( @PathVariable UUID id, @RequestBody @Valid UpdateQuestionRequest request )`

#### `[PATCH] /questions/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessQuestion(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<QuestionResponse>> patchQuestion( @PathVariable UUID id, @RequestBody @Valid UpdateQuestionRequest request )`

### SubjectController
- **Base Path**: `/subjects`

#### `[POST] /subjects`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<SubjectResponse>> createSubject(@RequestBody @Valid CreateSubjectRequest request)`

#### `[GET] /subjects`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<SubjectResponse>>> getAllSubjects( @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size)`

#### `[GET] /subjects/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<SubjectResponse>> getSubjectById(@PathVariable UUID id)`

#### `[PUT] /subjects/{id}`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<SubjectResponse>> updateSubject( @PathVariable UUID id, @RequestBody @Valid UpdateSubjectRequest request )`

#### `[PATCH] /subjects/{id}`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<SubjectResponse>> patchSubject( @PathVariable UUID id, @RequestBody @Valid UpdateSubjectRequest request )`

#### `[DELETE] /subjects/{id}`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> deleteSubject(@PathVariable UUID id)`

### SubmissionController
- **Base Path**: `/submissions`

#### `[POST] /submissions`
- **Authentication / Security Rule**: `@sec.isAnyRole()`
- **Method Signature**: `public ResponseEntity<BaseResponse<SubmissionResponseDTO>> submit(@RequestBody @Valid SubmissionRequestDTO dto)`

#### `[GET] /submissions/{id}`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessSubmission(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<SubmissionResponseDTO>> getSubmission(@org.springframework.web.bind.annotation.PathVariable UUID id)`

### SubtopicController
- **Base Path**: `/subtopics`

#### `[POST] /subtopics`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<SubtopicResponse>> createSubtopic(@RequestBody @Valid CreateSubtopicRequest request)`

#### `[GET] /subtopics`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<SubtopicResponse>>> getAllSubtopics(`

#### `[GET] /subtopics/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<SubtopicResponse>> getSubtopicById(@PathVariable UUID id)`

#### `[GET] /subtopics/topic/{topicId}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<SubtopicResponse>>> getSubtopicsByTopic( @PathVariable UUID topicId,`

#### `[PUT] /subtopics/{id}`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<SubtopicResponse>> updateSubtopic( @PathVariable UUID id, @RequestBody @Valid UpdateSubtopicRequest request )`

#### `[PATCH] /subtopics/{id}`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<SubtopicResponse>> patchSubtopic( @PathVariable UUID id, @RequestBody @Valid UpdateSubtopicRequest request )`

#### `[DELETE] /subtopics/{id}`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> deleteSubtopic(@PathVariable UUID id)`

### TestCaseController
- **Base Path**: `/test-cases`

#### `[POST] /test-cases`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestCaseResponse>> createTestCase(@RequestBody @Valid CreateTestCaseRequest dto)`

#### `[GET] /test-cases`
- **Authentication / Security Rule**: `Public / PermitAll`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<TestCaseResponse>>> getAllTestCases( @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size )`

#### `[GET] /test-cases/{id}`
- **Authentication / Security Rule**: `Public / PermitAll`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestCaseResponse>> getTestCaseById(@PathVariable UUID id)`

#### `[PATCH] /test-cases/update/{id}`
- **Authentication / Security Rule**: `Public / PermitAll`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestCaseResponse>> patchTestCase(@PathVariable UUID id, @RequestBody @Valid PatchTestCaseRequest dto)`

#### `[DELETE] /test-cases/delete/{id}`
- **Authentication / Security Rule**: `Public / PermitAll`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> deleteTestCase(@PathVariable UUID id)`

### TestController
- **Base Path**: `/tests`

#### `[POST] /tests`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestResponse>> createTest(@RequestBody @Valid CreateTestRequest request)`

#### `[GET] /tests`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<TestResponse>>> getAllTests( @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size )`

#### `[GET] /tests/{id}`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessTest(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestResponse>> getTestById(@PathVariable UUID id)`

#### `[PUT] /tests/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessTest(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestResponse>> updateTest( @PathVariable UUID id, @RequestBody @Valid UpdateTestRequest request )`

#### `[PATCH] /tests/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessTest(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestResponse>> patchTest( @PathVariable UUID id, @RequestBody @Valid UpdateTestRequest request )`

#### `[PATCH] /tests/{id}/inactive`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessTest(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> inactiveTest(@PathVariable UUID id)`

#### `[GET] /tests/inactive`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<List<TestResponse>>> getInactiveTests()`

#### `[PATCH] /tests/{id}/active`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessTest(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> activateTest(@PathVariable UUID id)`

### TestQuestionController
- **Base Path**: `/test-questions`

#### `[POST] /test-questions`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestQuestionResponse>> createTestQuestion( @RequestBody @Valid CreateTestQuestionRequest request )`

#### `[POST] /test-questions/bulk`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<List<TestQuestionResponse>>> bulkCreateTestQuestions( @RequestBody List<@Valid CreateTestQuestionRequest> requests )`

#### `[GET] /test-questions/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestQuestionResponse>> getTestQuestionById(@PathVariable UUID id)`

#### `[GET] /test-questions`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<TestQuestionResponse>>> getAllTestQuestions( @RequestParam(required = false) UUID testId, @RequestParam(required = false) UUID questionId, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size )`

#### `[GET] /test-questions/test/{testId}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessTest(#testId)`
- **Method Signature**: `public ResponseEntity<BaseResponse<List<TestQuestionDetailResponse>>> getTestQuestionsByTestIdDetailed( @PathVariable UUID testId )`

#### `[GET] /test-questions/test/{testId}/grouped`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessTest(#testId)`
- **Method Signature**: `public ResponseEntity<BaseResponse<Map<String, List<TestQuestionDetailResponse>>>> getGroupedQuestions( @PathVariable UUID testId )`

#### `[PUT] /test-questions/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestQuestionResponse>> updateTestQuestion( @PathVariable UUID id, @RequestBody @Valid UpdateTestQuestionRequest request )`

#### `[PATCH] /test-questions/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestQuestionResponse>> patchTestQuestion( @PathVariable UUID id, @RequestBody @Valid UpdateTestQuestionRequest request )`

#### `[DELETE] /test-questions/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> deleteTestQuestion(@PathVariable UUID id)`

### TestResultController
- **Base Path**: `/test-results`

#### `[POST] /test-results`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestResultResponse>> calculateAndSaveTestResult( @RequestBody @Valid CreateTestResultDTO request )`

#### `[GET] /test-results/{id}`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessTestResult(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestResultResponse>> getTestResultById(@PathVariable UUID id)`

#### `[GET] /test-results/session/{sessionId}`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessSession(#sessionId)`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestResultResponse>> getTestResultBySessionId(@PathVariable UUID sessionId)`

### TestScheduleController
- **Base Path**: `/test-schedules`

#### `[POST] /test-schedules`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestScheduleResponse>> createSchedule( @RequestBody @Valid CreateTestScheduleRequest request )`

#### `[GET] /test-schedules`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<TestScheduleResponse>>> getAllSchedules( @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size )`

#### `[GET] /test-schedules/{id}`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessSchedule(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestScheduleResponse>> getScheduleById( @PathVariable UUID id )`

#### `[PATCH] /test-schedules/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessSchedule(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestScheduleResponse>> patchSchedule( @PathVariable UUID id, @RequestBody @Valid PatchTestScheduleRequest request )`

#### `[DELETE] /test-schedules/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessSchedule(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> deleteSchedule(@PathVariable UUID id)`

### TestSessionController
- **Base Path**: `/test-sessions`

#### `[POST] /test-sessions`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestSessionResponse>> createSession( @RequestBody @Valid CreateTestSessionRequest request )`

#### `[POST] /test-sessions/start`
- **Authentication / Security Rule**: `@sec.isCandidate()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestSessionResponse>> startSession( @RequestBody @Valid StartTestSessionRequest request )`

#### `[GET] /test-sessions`
- **Authentication / Security Rule**: `@sec.isAnyRole()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<TestSessionResponse>>> getAllSessions( @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size )`

#### `[GET] /test-sessions/{id}`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessSession(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestSessionResponse>> getSessionById(@PathVariable UUID id)`

#### `[GET] /test-sessions/{id}/paper`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessSession(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestSessionPaperResponse>> getSessionPaper(@PathVariable UUID id)`

#### `[PATCH] /test-sessions/{id}`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessSession(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<TestSessionResponse>> patchSession( @PathVariable UUID id, @RequestBody @Valid PatchTestSessionRequest request )`

#### `[POST] /test-sessions/{id}/submit`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessSession(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> submitTest(@PathVariable UUID id)`

#### `[DELETE] /test-sessions/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessSession(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> deleteSession(@PathVariable UUID id)`

### TopicController
- **Base Path**: `/topics`

#### `[POST] /topics`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TopicResponse>> createTopic(@RequestBody @Valid CreateTopicRequest request)`

#### `[GET] /topics`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<TopicResponse>>> getAllTopics(`

#### `[GET] /topics/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TopicResponse>> getTopicById(@PathVariable UUID id)`

#### `[GET] /topics/subject/{subjectId}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<TopicResponse>>> getTopicsBySubject( @PathVariable UUID subjectId,`

#### `[PUT] /topics/{id}`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TopicResponse>> updateTopic( @PathVariable UUID id, @RequestBody @Valid UpdateTopicRequest request )`

#### `[PATCH] /topics/{id}`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<TopicResponse>> patchTopic( @PathVariable UUID id, @RequestBody @Valid UpdateTopicRequest request )`

#### `[DELETE] /topics/{id}`
- **Authentication / Security Rule**: `@sec.isSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> deleteTopic(@PathVariable UUID id)`

### UserController
- **Base Path**: `/users`

#### `[GET] /users`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin()`
- **Method Signature**: `public ResponseEntity<BaseResponse<Page<UserResponse>>> getUsers( @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size)`

#### `[GET] /users/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessUser(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<UserResponse>> getUserById(@PathVariable UUID id)`

#### `[PATCH] /users/{id}`
- **Authentication / Security Rule**: `@sec.isAnyRole() and @authorizationService.canAccessUser(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<UserResponse>> patchUser( @PathVariable UUID id, @RequestBody @Valid UpdateUserRequestPatch request )`

#### `[DELETE] /users/{id}`
- **Authentication / Security Rule**: `@sec.isAdminOrSuperAdmin() and @authorizationService.canAccessUser(#id)`
- **Method Signature**: `public ResponseEntity<BaseResponse<String>> deleteUser(@PathVariable UUID id)`

#### `[PUT] /users/{id}`
- **Authentication / Security Rule**: `Public / PermitAll`
- **Method Signature**: `// public ResponseEntity<BaseResponse<UserResponse>> putUser( // @PathVariable UUID id, // @RequestBody @Valid UpdateUserRequest request // )`

## 4. Request / Response Data Transfer Objects (DTO)
This section catalogs all DTO models used in the REST API. Look at the field names and validation tags to understand request payload constraints.

### `AuthResponse` (Folder: `DTO/Auth`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `accessToken` | `String` | None | Same as field name |
| `tokenType` | `String` | None (Default value exists) | Same as field name |
| `expiresIn` | `Long` | None | Same as field name |
| `user` | `UserData` | None | Same as field name |

#### Inner Class: `AuthResponse.UserData`
| Field Name | Type | Validations / Modifiers |
|------------|------|-------------------------|
| `id` | `UUID` | None |
| `name` | `String` | None |
| `email` | `String` | None |
| `role` | `String` | None |
| `phoneNumber` | `String` | None |
| `organisationData` | `OrganisationData` | None |

#### Inner Class: `AuthResponse.OrganisationData`
| Field Name | Type | Validations / Modifiers |
|------------|------|-------------------------|
| `id` | `UUID` | None |
| `name` | `String` | None |
| `logoUrl` | `String` | None |

### `LoginRequest` (Folder: `DTO/Auth`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `email` | `String` | NotBlank(message = "Email is required"), Email (message = "Invalid email format") | Same as field name |
| `password` | `String` | NotBlank(message = "Password is required") | Same as field name |

### `RegisterRequest` (Folder: `DTO/Auth`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `name` | `String` | NotBlank(message = "Name is required") | Same as field name |
| `email` | `String` | NotBlank(message = "Email is required"), Email(message = "Invalid email format") | Same as field name |
| `password` | `String` | NotBlank(message = "Password is required"), Size(min = 8, message = "Password must be at least 8 characters") | Same as field name |
| `phoneNumber` | `String` | None | Same as field name |
| `role` | `Role` | None (Default value exists) | Same as field name |
| `organisationId` | `UUID` | NotNull(message = "Organisation ID is required") | `organisation_id` |

### `ResetPasswordRequest` (Folder: `DTO/Auth`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `oldPassword` | `String` | NotBlank(message = "Old password is required") | Same as field name |
| `newPassword` | `String` | NotBlank(message = "New password cannot be empty"), Size(min = 8, message = "New password must be at least 8 characters long") | Same as field name |

### `BulkUploadResult` (Folder: `DTO/Candidate`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `totalRows` | `int` | None | Same as field name |
| `successCount` | `int` | None | Same as field name |
| `failCount` | `int` | None | Same as field name |
| `rows` | `List<BulkUploadRowResult>` | None | Same as field name |

### `BulkUploadRowResult` (Folder: `DTO/Candidate`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `rowNumber` | `int` | None | Same as field name |
| `email` | `String` | None | Same as field name |
| `status` | `String` | None | Same as field name |
| `errorMessage` | `String` | None | Same as field name |

### `CandidateInvitationResponse` (Folder: `DTO/Candidate`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `scheduleId` | `UUID` | None | Same as field name |
| `candidateId` | `UUID` | None | Same as field name |
| `token` | `String` | None | Same as field name |
| `status` | `InvitationStatus` | None | Same as field name |
| `sentAt` | `LocalDateTime` | None | Same as field name |

### `CandidateResponse` (Folder: `DTO/Candidate`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `userId` | `UUID` | None | Same as field name |
| `name` | `String` | None | Same as field name |
| `email` | `String` | None | Same as field name |
| `phoneNumber` | `String` | None | Same as field name |
| `organisation` | `OrganisationData` | None | Same as field name |
| `extraFields` | `Map<String, Object>` | None | Same as field name |
| `isStale` | `boolean` | None | Same as field name |
| `lastUpdated` | `LocalDateTime` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `updatedAt` | `LocalDateTime` | None | Same as field name |

#### Inner Class: `CandidateResponse.OrganisationData`
| Field Name | Type | Validations / Modifiers |
|------------|------|-------------------------|
| `id` | `UUID` | None |
| `name` | `String` | None |

### `CreateCandidateInvitationRequest` (Folder: `DTO/Candidate`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `scheduleId` | `UUID` | NotNull(message = "Schedule id is required") | Same as field name |
| `candidateId` | `UUID` | NotNull(message = "Candidate id is required") | Same as field name |
| `candidateEmail` | `String` | None | Same as field name |

### `CreateCandidateRequest` (Folder: `DTO/Candidate`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `name` | `String` | NotBlank(message = "Name is required") | Same as field name |
| `email` | `String` | NotBlank(message = "Email is required"), Email(message = "Invalid email format") | Same as field name |
| `password` | `String` | NotBlank(message = "Password is required"), Size(min = 8, message = "Password must be at least 8 characters") | Same as field name |
| `phoneNumber` | `String` | None | Same as field name |
| `extraFields` | `Map<String, Object>` | None | Same as field name |
| `organisationId` | `UUID` | NotNull(message = "Organisation ID is required") | `organisation_id` |

### `PatchCandidateInvitationRequest` (Folder: `DTO/Candidate`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `status` | `InvitationStatus` | NotNull(message = "Invitation status is required") | Same as field name |

### `UpdateCandidateRequest` (Folder: `DTO/Candidate`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `name` | `String` | None | Same as field name |
| `email` | `String` | None | Same as field name |
| `phoneNumber` | `String` | None | Same as field name |
| `extraFields` | `Map<String, Object>` | None | Same as field name |

### `CodeExecutionRequestDTO` (Folder: `DTO/CodeExecution`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `submissionId` | `UUID` | None | Same as field name |
| `language` | `String` | None | Same as field name |
| `sourceCode` | `String` | None | Same as field name |
| `input` | `String` | None | Same as field name |
| `runAllTestCases` | `boolean` | None | Same as field name |

### `CodeExecutionResponseDTO` (Folder: `DTO/CodeExecution`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `status` | `String` | None | Same as field name |
| `stdout` | `String` | None | Same as field name |
| `stderr` | `String` | None | Same as field name |
| `execTimeMs` | `Long` | None | Same as field name |
| `judge0Token` | `String` | None | Same as field name |
| `compileOutput` | `String` | None | Same as field name |
| `totalTestCases` | `int` | None | Same as field name |
| `passedTestCases` | `int` | None | Same as field name |
| `testCaseResults` | `List<TestCaseResultDTO>` | None | Same as field name |
| `memoryKb` | `Long` | None | Same as field name |

### `CodeRunRequest` (Folder: `DTO/CodeExecution`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `sessionId` | `UUID` | NotNull(message = "Session id is required") | Same as field name |
| `questionId` | `UUID` | NotNull(message = "Question id is required") | Same as field name |
| `language` | `String` | NotBlank(message = "Language is required") | Same as field name |
| `sourceCode` | `String` | NotBlank(message = "Source code is required") | Same as field name |
| `input` | `String` | None | Same as field name |

### `CodeRunResponseDTO` (Folder: `DTO/CodeExecution`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `testCaseId` | `UUID` | None | Same as field name |
| `stdout` | `String` | None | Same as field name |
| `stderr` | `String` | None | Same as field name |
| `compileOutput` | `String` | None | Same as field name |
| `status` | `String` | None | Same as field name |
| `execTimeMs` | `Long` | None | Same as field name |
| `expectedOutput` | `String` | None | Same as field name |

### `CodingSubmissionResultDTO` (Folder: `DTO/CodeExecution`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `submissionId` | `UUID` | None | Same as field name |
| `testCasesPassed` | `Integer` | None | Same as field name |
| `testCasesTotal` | `Integer` | None | Same as field name |
| `scoreAwarded` | `Double` | None | Same as field name |
| `maxScore` | `Double` | None | Same as field name |
| `execTimeMs` | `Integer` | None | Same as field name |
| `status` | `String` | None | Same as field name |

### `PlaygroundRequest` (Folder: `DTO/CodeExecution`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `language` | `String` | NotNull(message = "Question id is required"), NotBlank(message = "Language is required") | Same as field name |
| `sourceCode` | `String` | NotBlank(message = "Source code is required") | Same as field name |
| `input` | `String` | None | Same as field name |

### `TestCaseResultDTO` (Folder: `DTO/CodeExecution`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `status` | `String` | None | Same as field name |
| `stdout` | `String` | None | Same as field name |
| `actualOutput` | `String` | None | Same as field name |
| `stderr` | `String` | None | Same as field name |
| `compileOutput` | `String` | None | Same as field name |
| `execTimeMs` | `Long` | None | Same as field name |
| `memoryKb` | `Integer` | None | Same as field name |
| `passed` | `boolean` | None | Same as field name |
| `expectedOutput` | `String` | None | Same as field name |
| `input` | `String` | None | Same as field name |

### `CreateTestCaseRequest` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `input` | `String` | None | Same as field name |
| `expectedOutput` | `String` | NotBlank(message = "Expected output is required") | Same as field name |
| `sample` | `Boolean` | None | Same as field name |
| `weight` | `Float` | Min(value = 0, message = "Weight must be non-negative") | Same as field name |
| `codingQuestionId` | `UUID` | NotNull(message = "Coding question id is required") | Same as field name |
| `explanation` | `String` | None | Same as field name |

### `CreateTestDto` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `createdById` | `UUID` | None | Same as field name |
| `title` | `String` | None | Same as field name |
| `description` | `String` | None | Same as field name |
| `durationMins` | `int` | None | Same as field name |
| `difficulty` | `Difficulty` | None | Same as field name |
| `instructions` | `Map<String, Object>` | None | Same as field name |
| `status` | `TestStatus` | None | Same as field name |
| `passMark` | `int` | None | Same as field name |

### `CreateTestQuestionDto` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `testId` | `UUID` | None | Same as field name |
| `questionId` | `UUID` | None | Same as field name |
| `orderIndex` | `int` | None | Same as field name |
| `marks` | `int` | None | Same as field name |

### `CreateTestScheduleDto` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `testId` | `UUID` | None | Same as field name |
| `createdById` | `UUID` | None | Same as field name |
| `startTime` | `LocalDateTime` | None | Same as field name |
| `endTime` | `LocalDateTime` | None | Same as field name |
| `status` | `ScheduleStatus` | None | Same as field name |

### `CreateTestScheduleRequest` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `testId` | `UUID` | NotNull | Same as field name |
| `startTime` | `LocalDateTime` | NotNull | Same as field name |
| `endTime` | `LocalDateTime` | NotNull | Same as field name |
| `maxCandidates` | `Integer` | None | Same as field name |
| `status` | `ScheduleStatus` | None | Same as field name |

### `CreateOrganisationRequest` (Folder: `DTO/Organisation`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `name` | `String` | NotBlank(message = "Name is required") | Same as field name |
| `logoUrl` | `String` | None | Same as field name |

### `OrganisationResponse` (Folder: `DTO/Organisation`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `name` | `String` | None | Same as field name |
| `logoUrl` | `String` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `updatedAt` | `LocalDateTime` | None | Same as field name |

### `UpdateOrganisationRequest` (Folder: `DTO/Organisation`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `name` | `String` | None | Same as field name |
| `logoUrl` | `String` | None | Same as field name |

### `PatchTestCaseRequest` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `input` | `String` | None | Same as field name |
| `expectedOutput` | `String` | None | Same as field name |
| `sample` | `Boolean` | None | Same as field name |
| `weight` | `Float` | Min(value = 0, message = "Weight must be non-negative") | Same as field name |
| `codingQuestionId` | `UUID` | None | Same as field name |
| `explanation` | `String` | None | Same as field name |

### `PatchTestScheduleRequest` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `testId` | `UUID` | None | Same as field name |
| `startTime` | `LocalDateTime` | None | Same as field name |
| `endTime` | `LocalDateTime` | None | Same as field name |
| `maxCandidates` | `Integer` | Min(value = 1, message = "Max candidates must be at least 1") | Same as field name |
| `status` | `ScheduleStatus` | None | Same as field name |

### `CodingQuestionResponse` (Folder: `DTO/Question`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `title` | `String` | None | Same as field name |
| `difficulty` | `String` | None | Same as field name |
| `constraints` | `String` | None | Same as field name |
| `memoryLimitMb` | `Integer` | None | Same as field name |
| `timeLimitSecs` | `Integer` | None | Same as field name |
| `sampleExplanation` | `String` | None | Same as field name |
| `codeTemplate` | `Map<String, Object>` | None | Same as field name |
| `examples` | `List<Map<String, Object>>` | None | Same as field name |
| `hints` | `List<String>` | None | Same as field name |
| `tags` | `List<String>` | None | Same as field name |

### `CreateCodingQuestionRequest` (Folder: `DTO/Question`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `title` | `String` | NotBlank(message = "Title is required") | Same as field name |
| `difficulty` | `String` | NotBlank(message = "Difficulty is required") | Same as field name |
| `constraints` | `String` | None | Same as field name |
| `memoryLimitMb` | `Integer` | Min(value = 1, message = "Memory limit must be at least 1 MB") | Same as field name |
| `timeLimitSecs` | `Integer` | Min(value = 1, message = "Time limit must be at least 1 second") | Same as field name |
| `sampleExplanation` | `String` | None | Same as field name |
| `codeTemplate` | `Map<String, Object>` | NotNull(message = "Code template is required") | Same as field name |
| `examples` | `List<Map<String, Object>>` | None | Same as field name |
| `hints` | `List<String>` | None | Same as field name |
| `tags` | `List<String>` | None | Same as field name |

### `CreateMcqQuestionRequest` (Folder: `DTO/Question`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `mcqType` | `McqType` | NotNull(message = "MCQ type is required") | Same as field name |
| `multipleCorrect` | `Boolean` | NotNull(message = "multipleCorrect is required") | Same as field name |
| `shuffleOptions` | `Boolean` | NotNull(message = "shuffleOptions is required") | Same as field name |
| `mcqOptions` | `List<Map<String, Object>>` | None | Same as field name |

### `CreateQuestionRequest` (Folder: `DTO/Question`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `subjectId` | `UUID` | NotNull(message = "Subject is required") | Same as field name |
| `topicId` | `UUID` | None | Same as field name |
| `subtopicId` | `UUID` | None | Same as field name |
| `questionType` | `QuestionType` | NotNull(message = "Question type is required") | Same as field name |
| `prompt` | `String` | NotBlank(message = "Prompt is required") | Same as field name |
| `marks` | `int` | Min(value = 1, message = "Marks must be at least 1") | Same as field name |
| `visibility` | `QuestionVisibility` | NotNull(message = "Visibility is required") | Same as field name |

### `McqQuestionResponse` (Folder: `DTO/Question`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `mcqType` | `McqType` | None | Same as field name |
| `multipleCorrect` | `Boolean` | None | Same as field name |
| `shuffleOptions` | `Boolean` | None | Same as field name |
| `mcqOptions` | `List<Map<String, Object>>` | None | Same as field name |

### `QuestionResponse` (Folder: `DTO/Question`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `subjectId` | `UUID` | None | Same as field name |
| `topicId` | `UUID` | None | Same as field name |
| `subtopicId` | `UUID` | None | Same as field name |
| `questionType` | `QuestionType` | None | Same as field name |
| `visibility` | `QuestionVisibility` | None | Same as field name |
| `organisationId` | `UUID` | None | Same as field name |
| `prompt` | `String` | None | Same as field name |
| `marks` | `int` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `updatedAt` | `LocalDateTime` | None | Same as field name |

### `UpdateCodingQuestionRequest` (Folder: `DTO/Question`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `title` | `String` | None | Same as field name |
| `difficulty` | `String` | None | Same as field name |
| `constraints` | `String` | None | Same as field name |
| `memoryLimitMb` | `Integer` | None | Same as field name |
| `timeLimitSecs` | `Integer` | None | Same as field name |
| `sampleExplanation` | `String` | None | Same as field name |
| `codeTemplate` | `Map<String, Object>` | None | Same as field name |
| `examples` | `List<Map<String, Object>>` | None | Same as field name |
| `hints` | `List<String>` | None | Same as field name |
| `tags` | `List<String>` | None | Same as field name |

### `UpdateMcqQuestionRequest` (Folder: `DTO/Question`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `mcqType` | `McqType` | None | Same as field name |
| `multipleCorrect` | `Boolean` | None | Same as field name |
| `shuffleOptions` | `Boolean` | None | Same as field name |
| `mcqOptions` | `List<Map<String, Object>>` | None | Same as field name |

### `UpdateQuestionRequest` (Folder: `DTO/Question`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `subjectId` | `UUID` | None | Same as field name |
| `topicId` | `UUID` | None | Same as field name |
| `subtopicId` | `UUID` | None | Same as field name |
| `prompt` | `String` | None | Same as field name |
| `questionType` | `QuestionType` | None | Same as field name |
| `marks` | `Integer` | None | Same as field name |
| `visibility` | `QuestionVisibility` | None | Same as field name |

### `CreateSubjectRequest` (Folder: `DTO/Subject`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `name` | `String` | NotBlank(message = "Subject name is required") | Same as field name |

### `SubjectResponse` (Folder: `DTO/Subject`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `name` | `String` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `updatedAt` | `LocalDateTime` | None | Same as field name |

### `UpdateSubjectRequest` (Folder: `DTO/Subject`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `name` | `String` | None | Same as field name |

### `SubmissionRequestDTO` (Folder: `DTO/Submission`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `sessionId` | `UUID` | NotNull(message = "Session id is required") | Same as field name |
| `questionId` | `UUID` | NotNull(message = "Question id is required") | Same as field name |
| `answerText` | `String` | None | Same as field name |
| `selectedOptionIds` | `List<UUID>` | None | Same as field name |

### `SubmissionResponseDTO` (Folder: `DTO/Submission`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `sessionId` | `UUID` | None | Same as field name |
| `questionId` | `UUID` | None | Same as field name |
| `answerText` | `String` | None | Same as field name |
| `submittedAt` | `LocalDateTime` | None | Same as field name |
| `questionType` | `QuestionType` | None | Same as field name |
| `status` | `SubmissionStatus` | None | Same as field name |

### `TestAnswerSubmissionRequest` (Folder: `DTO/Submission`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `sessionId` | `UUID` | NotNull(message = "Session id is required") | Same as field name |
| `questionId` | `UUID` | NotNull(message = "Question id is required") | Same as field name |
| `selectedOptionIds` | `List<UUID>` | None | Same as field name |
| `answerText` | `String` | None | Same as field name |
| `sourceCode` | `String` | None | Same as field name |
| `language` | `String` | None | Same as field name |

### `CreateSubtopicRequest` (Folder: `DTO/Subtopic`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `topicId` | `UUID` | NotNull(message = "Topic is required") | Same as field name |
| `name` | `String` | NotBlank(message = "Subtopic name is required") | Same as field name |

### `SubtopicResponse` (Folder: `DTO/Subtopic`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `topicId` | `UUID` | None | Same as field name |
| `name` | `String` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `updatedAt` | `LocalDateTime` | None | Same as field name |

### `UpdateSubtopicRequest` (Folder: `DTO/Subtopic`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `topicId` | `UUID` | None | Same as field name |
| `name` | `String` | None | Same as field name |

### `TestCaseDto` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `input` | `String` | None | Same as field name |
| `expectedOutput` | `String` | None | Same as field name |
| `sample` | `Boolean` | None | Same as field name |
| `weight` | `Float` | None | Same as field name |
| `codingQuestionId` | `UUID` | None | Same as field name |
| `explanation` | `String` | None | Same as field name |

### `TestCaseResponse` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `input` | `String` | None | Same as field name |
| `expectedOutput` | `String` | None | Same as field name |
| `sample` | `boolean` | None | Same as field name |
| `weight` | `float` | None | Same as field name |
| `codingQuestionId` | `UUID` | None | Same as field name |
| `explanation` | `String` | None | Same as field name |

### `BulkAddTestQuestionsRequest` (Folder: `DTO/TestQuestion`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `testId` | `UUID` | NotNull(message = "Test ID is required") | Same as field name |
| `questionIds` | `List<UUID>` | None | Same as field name |
| `startOrderIndex` | `Integer` | None | Same as field name |
| `defaultMarks` | `Integer` | None | Same as field name |

### `CreateTestQuestionRequest` (Folder: `DTO/TestQuestion`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `testId` | `UUID` | NotNull(message = "Test is required") | Same as field name |
| `questionId` | `UUID` | NotNull(message = "Question is required") | Same as field name |
| `orderIndex` | `Integer` | NotNull(message = "Order index is required") | Same as field name |
| `marks` | `Integer` | NotNull(message = "Marks are required") | Same as field name |
| `sectionName` | `String` | None | Same as field name |

### `UpdateTestQuestionRequest` (Folder: `DTO/TestQuestion`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `testId` | `UUID` | None | Same as field name |
| `questionId` | `UUID` | None | Same as field name |
| `orderIndex` | `Integer` | None | Same as field name |
| `marks` | `Integer` | None | Same as field name |
| `sectionName` | `String` | None | Same as field name |

### `CreateTestResultDTO` (Folder: `DTO/TestResult`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `sessionId` | `UUID` | None | Same as field name |
| `candidateId` | `UUID` | None | Same as field name |

### `TestResultResponse` (Folder: `DTO/TestResult`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `testSessionId` | `UUID` | None | Same as field name |
| `candidateId` | `UUID` | None | Same as field name |
| `totalScore` | `double` | None | Same as field name |
| `maxScore` | `double` | None | Same as field name |
| `percentage` | `double` | None | Same as field name |
| `passed` | `boolean` | None | Same as field name |
| `evaluatedAt` | `LocalDateTime` | None | Same as field name |
| `reportBucketLink` | `String` | None | Same as field name |

### `TestScheduleResponse` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `testId` | `UUID` | None | Same as field name |
| `createdById` | `UUID` | None | Same as field name |
| `startTime` | `LocalDateTime` | None | Same as field name |
| `endTime` | `LocalDateTime` | None | Same as field name |
| `maxCandidates` | `Integer` | None | Same as field name |
| `status` | `ScheduleStatus` | None | Same as field name |

### `CreateTestSessionRequest` (Folder: `DTO/TestSession`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `testId` | `UUID` | NotNull | Same as field name |
| `scheduleId` | `UUID` | NotNull | Same as field name |
| `candidateId` | `UUID` | NotNull | Same as field name |
| `ipAddress` | `String` | None | Same as field name |

### `PatchTestSessionRequest` (Folder: `DTO/TestSession`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `refreshToken` | `String` | None | Same as field name |
| `expiresAt` | `LocalDateTime` | None | Same as field name |
| `startedAt` | `LocalDateTime` | None | Same as field name |
| `endedAt` | `LocalDateTime` | None | Same as field name |
| `timerRemainingSecs` | `Integer` | Min(value = 0, message = "Timer remaining seconds must be non-negative") | Same as field name |
| `status` | `TestSessionStatus` | None | Same as field name |
| `fullscreenViolations` | `Integer` | Min(value = 0, message = "Fullscreen violations must be non-negative") | Same as field name |

### `StartTestSessionRequest` (Folder: `DTO/TestSession`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `invitationId` | `UUID` | NotNull | Same as field name |
| `ipAddress` | `String` | None | Same as field name |

### `TestSessionPaperResponse` (Folder: `DTO/TestSession`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `sessionId` | `UUID` | None | Same as field name |
| `scheduleId` | `UUID` | None | Same as field name |
| `testId` | `UUID` | None | Same as field name |
| `candidateId` | `UUID` | None | Same as field name |
| `status` | `TestSessionStatus` | None | Same as field name |
| `startedAt` | `LocalDateTime` | None | Same as field name |
| `endedAt` | `LocalDateTime` | None | Same as field name |
| `timerRemainingSecs` | `Integer` | None | Same as field name |
| `paper` | `Object` | None | Same as field name |

### `TestSessionResponse` (Folder: `DTO/TestSession`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `testId` | `UUID` | None | Same as field name |
| `scheduleId` | `UUID` | None | Same as field name |
| `candidateId` | `UUID` | None | Same as field name |
| `refreshToken` | `String` | None | Same as field name |
| `expiresAt` | `LocalDateTime` | None | Same as field name |
| `ipAddress` | `String` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `startedAt` | `LocalDateTime` | None | Same as field name |
| `endedAt` | `LocalDateTime` | None | Same as field name |
| `timerRemainingSecs` | `Integer` | None | Same as field name |
| `status` | `TestSessionStatus` | None | Same as field name |
| `fullscreenViolations` | `Integer` | None | Same as field name |

### `CreateTestRequest` (Folder: `DTO/Test`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `title` | `String` | NotBlank(message = "Title is required") | Same as field name |
| `description` | `String` | None | Same as field name |
| `durationMins` | `Integer` | NotNull(message = "Duration is required") | Same as field name |
| `difficulty` | `Difficulty` | None | Same as field name |
| `instructions` | `Map<String, Object>` | None | Same as field name |
| `status` | `TestStatus` | NotNull(message = "Status is required") | Same as field name |
| `passMark` | `Integer` | NotNull(message = "Pass mark is required") | Same as field name |
| `questions` | `List<TestQuestionRequest>` | None | Same as field name |

### `TestQuestionDetailResponse` (Folder: `DTO/Test`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `testId` | `UUID` | None | Same as field name |
| `question` | `QuestionResponse` | None | Same as field name |
| `orderIndex` | `Integer` | None | Same as field name |
| `marks` | `Integer` | None | Same as field name |
| `sectionName` | `String` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `updatedAt` | `LocalDateTime` | None | Same as field name |

### `TestQuestionRequest` (Folder: `DTO/Test`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `questionId` | `UUID` | NotNull(message = "Question is required") | Same as field name |
| `orderIndex` | `Integer` | NotNull(message = "Order index is required") | Same as field name |
| `marks` | `Integer` | NotNull(message = "Marks are required") | Same as field name |

### `TestQuestionResponse` (Folder: `DTO/Test`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `testId` | `UUID` | None | Same as field name |
| `questionId` | `UUID` | None | Same as field name |
| `orderIndex` | `Integer` | None | Same as field name |
| `marks` | `Integer` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `updatedAt` | `LocalDateTime` | None | Same as field name |

### `TestResponse` (Folder: `DTO/Test`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `createdById` | `UUID` | None | Same as field name |
| `title` | `String` | None | Same as field name |
| `description` | `String` | None | Same as field name |
| `durationMins` | `Integer` | None | Same as field name |
| `difficulty` | `Difficulty` | None | Same as field name |
| `instructions` | `Map<String, Object>` | None | Same as field name |
| `status` | `TestStatus` | None | Same as field name |
| `passMark` | `Integer` | None | Same as field name |
| `questions` | `List<TestQuestionResponse>` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `updatedAt` | `LocalDateTime` | None | Same as field name |
| `isActive` | `Boolean` | None | Same as field name |
| `organisationId` | `UUID` | None | Same as field name |

### `UpdateTestRequest` (Folder: `DTO/Test`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `title` | `String` | None | Same as field name |
| `description` | `String` | None | Same as field name |
| `durationMins` | `Integer` | None | Same as field name |
| `difficulty` | `Difficulty` | None | Same as field name |
| `instructions` | `Map<String, Object>` | None | Same as field name |
| `status` | `TestStatus` | None | Same as field name |
| `passMark` | `Integer` | None | Same as field name |
| `questions` | `List<TestQuestionRequest>` | None | Same as field name |

### `CreateTopicRequest` (Folder: `DTO/Topic`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `subjectId` | `UUID` | NotNull(message = "Subject is required") | Same as field name |
| `name` | `String` | NotBlank(message = "Topic name is required") | Same as field name |

### `TopicResponse` (Folder: `DTO/Topic`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `subjectId` | `UUID` | None | Same as field name |
| `name` | `String` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `updatedAt` | `LocalDateTime` | None | Same as field name |

### `UpdateTopicRequest` (Folder: `DTO/Topic`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `subjectId` | `UUID` | None | Same as field name |
| `name` | `String` | None | Same as field name |

### `UpdateTestDto` (Folder: `DTO/`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `title` | `String` | None | Same as field name |
| `description` | `String` | None | Same as field name |
| `durationMins` | `Integer` | None | Same as field name |
| `difficulty` | `Difficulty` | None | Same as field name |
| `instructions` | `Map<String, Object>` | None | Same as field name |
| `status` | `TestStatus` | None | Same as field name |
| `passMark` | `Integer` | None | Same as field name |

### `CreateUserRequest` (Folder: `DTO/User`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `name` | `String` | NotBlank(message = "Name is required") | Same as field name |
| `email` | `String` | NotBlank(message = "Email is required"), Email(message = "Invalid email format") | Same as field name |
| `password` | `String` | NotBlank(message = "Password is required"), Size(min = 8, message = "Password must be at least 8 characters") | Same as field name |
| `phoneNumber` | `String` | None | Same as field name |
| `organisationId` | `UUID` | NotNull(message = "Organisation ID is required") | `organisation_id` |

### `UpdateUserRequest` (Folder: `DTO/User`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `name` | `String` | NotBlank(message = "Name is required") | Same as field name |
| `email` | `String` | NotBlank(message = "Email is required"), Email(message = "Invalid email format") | Same as field name |
| `password` | `String` | NotBlank(message = "Password is required"), Size(min = 8, message = "Password must be at least 8 characters") | Same as field name |
| `phoneNumber` | `String` | NotBlank | Same as field name |

### `UpdateUserRequestPatch` (Folder: `DTO/User`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `name` | `String` | None | Same as field name |
| `email` | `String` | Email(message = "Invalid email format") | Same as field name |
| `password` | `String` | Size(min = 8, message = "Password must be at least 8 characters") | Same as field name |
| `phoneNumber` | `String` | None | Same as field name |

### `UserResponse` (Folder: `DTO/User`)
| Field Name | Type | Validations / Modifiers | JSON Alias |
|------------|------|-------------------------|------------|
| `id` | `UUID` | None | Same as field name |
| `name` | `String` | None | Same as field name |
| `email` | `String` | None | Same as field name |
| `phoneNumber` | `String` | None | Same as field name |
| `role` | `Role` | None | Same as field name |
| `organisation` | `OrganisationData` | None | Same as field name |
| `createdAt` | `LocalDateTime` | None | Same as field name |
| `updatedAt` | `LocalDateTime` | None | Same as field name |

#### Inner Class: `UserResponse.OrganisationData`
| Field Name | Type | Validations / Modifiers |
|------------|------|-------------------------|
| `id` | `UUID` | None |
| `name` | `String` | None |

## 5. Database Schema & JPA Entity Mapping
This section contains the database tables, schema structures, primary keys, nullability rules, and cross-table relationships mapped in Hibernate.

### Entity: `BaseEntity` (Table: `baseentity`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `createdAt` | `createdAt` | `LocalDateTime` | Yes | No | None |
| `updatedAt` | `updatedAt` | `LocalDateTime` | Yes | No | None |

### Entity: `Candidate` (Table: `candidates`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `user` | `user` | `User` | Yes | No | `OneToOne(fetch = FetchType.LAZY, optional = false)` |
| `organisation` | `organisation` | `Organisation` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `extraFields` | `extra_fields` | `Map<String, Object>` | Yes | No | None |
| `isStale` | `is_stale` | `boolean` | Yes | No | None |
| `lastUpdated` | `last_updated` | `LocalDateTime` | Yes | No | None |

### Entity: `CandidateInvitation` (Table: `candidate_invitations`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `schedule` | `schedule` | `TestSchedule` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `candidate` | `candidate` | `Candidate` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `token` | `token` | `String` | No | No | None |
| `status` | `status` | `InvitationStatus` | No | No | None |
| `sentAt` | `sent_at` | `LocalDateTime` | Yes | No | None |

### Entity: `CodeExecutionRun` (Table: `code_execution_runs`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `question` | `question` | `Question` | Yes | No | `ManyToOne(optional = false)` |
| `session` | `session` | `TestSession` | Yes | No | `ManyToOne(optional = false)` |
| `testCase` | `testCase` | `TestCases` | Yes | No | `ManyToOne(optional = false)` |
| `submission` | `submission` | `Submission` | Yes | No | `ManyToOne(optional = false)` |
| `sourceCode` | `source_code` | `String` | Yes | No | None |
| `language` | `language` | `String` | Yes | No | None |
| `judge0Token` | `judge0_token` | `String` | Yes | No | None |
| `status` | `status` | `CodeRunStatus` | Yes | No | None |
| `stdout` | `stdout` | `String` | Yes | No | None |
| `stderr` | `stderr` | `String` | Yes | No | None |
| `compileOutput` | `compile_output` | `String` | Yes | No | None |
| `execTimeMs` | `exec_time_ms` | `Long` | Yes | No | None |
| `createdAt` | `created_at` | `LocalDateTime` | Yes | No | None |

### Entity: `CodingQuestion` (Table: `coding_questions`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `questionId` | `question_id` | `UUID` | Yes | **YES** | None |
| `question` | `question` | `Question` | Yes | No | `OneToOne(fetch = FetchType.LAZY, optional = false)` |
| `title` | `title` | `String` | No | No | None |
| `difficulty` | `difficulty` | `Difficulty` | Yes | No | None |
| `codeTemplates` | `code_templates` | `Map<String, Object>` | Yes | No | None |
| `constraints` | `constraints` | `String` | Yes | No | None |
| `memoryLimitMB` | `memory_limit_mb` | `Integer` | Yes | No | None |
| `timeLimitSecs` | `time_limit_secs` | `Integer` | Yes | No | None |
| `sampleExplanation` | `sample_explanation` | `String` | Yes | No | None |
| `examples` | `examples` | `Map<String, Object>` | Yes | No | None |
| `hints` | `hints` | `Map<String, Object>` | Yes | No | None |
| `tags` | `tags` | `List<String>` | Yes | No | None |
| `testCases` | `testCases` | `List<TestCases>` | Yes | No | `OneToMany(mappedBy = "codingQuestion", cascade = CascadeType.ALL, orphanRemoval = true)` |

### Entity: `CodingSubmissionResult` (Table: `coding_submission_result`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `submission` | `submission` | `Submission` | Yes | No | `OneToOne` |
| `testCasesPassed` | `test_cases_passed` | `Integer` | Yes | No | None |
| `testCasesTotal` | `test_cases_total` | `Integer` | Yes | No | None |
| `scoreAwarded` | `score_awarded` | `Double` | Yes | No | None |
| `maxScore` | `max_score` | `Double` | Yes | No | None |
| `execTimeMs` | `exec_time_ms` | `Integer` | Yes | No | None |
| `status` | `status` | `CodingSubmissionStatus` | Yes | No | None |
| `judge0Tokens` | `judge0_tokens` | `List<String>` | Yes | No | None |
| `createdAt` | `created_at` | `LocalDateTime` | Yes | No | None |

### Entity: `DeadLetterQueueRecord` (Table: `dead_letter_queue`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `submission` | `submission` | `Submission` | Yes | No | `OneToOne(fetch = FetchType.LAZY, optional = false)` |
| `failureReason` | `failure_reason` | `String` | Yes | No | None |
| `errorDetails` | `error_details` | `String` | Yes | No | None |
| `attemptCount` | `attempt_count` | `int` | No | No | None |
| `failedAt` | `failed_at` | `LocalDateTime` | No | No | None |

### Entity: `FailedExecutionRecord` (Table: `failed_execution_records`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `submission` | `submission` | `Submission` | Yes | No | `OneToOne(fetch = FetchType.LAZY, optional = false)` |
| `attemptCount` | `attempt_count` | `int` | No | No | None |
| `lastError` | `last_error` | `String` | Yes | No | None |
| `lastAttemptedAt` | `last_attempted_at` | `LocalDateTime` | Yes | No | None |
| `createdAt` | `created_at` | `LocalDateTime` | Yes | No | None |

### Entity: `Judge0Pending` (Table: `judge0_pending`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `submission` | `submission` | `Submission` | Yes | No | `ManyToOne(fetch = FetchType.LAZY)` |
| `token` | `token` | `String` | No | No | None |
| `status` | `status` | `Judge0PendingStatus` | No | No | None |
| `retryCount` | `retry_count` | `int` | No | No | None |
| `maxRetries` | `max_retries` | `int` | No | No | None |
| `createdAt` | `created_at` | `LocalDateTime` | No | No | None |
| `nextPollAt` | `next_poll_at` | `LocalDateTime` | No | No | None |
| `lastError` | `last_error` | `String` | Yes | No | None |
| `callbackUrl` | `callback_url` | `String` | Yes | No | None |

### Entity: `LogEntity` (Table: `logentity`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | No | None |
| `level` | `level` | `String` | Yes | No | None |
| `message` | `message` | `String` | Yes | No | None |
| `timestamp` | `timestamp` | `LocalDateTime` | Yes | No | None |

### Entity: `McqOption` (Table: `mcqoption`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | No | None |
| `text` | `text` | `String` | Yes | No | None |
| `isCorrect` | `isCorrect` | `Boolean` | Yes | No | None |
| `imageUrl` | `imageUrl` | `String` | Yes | No | None |
| `displayOrder` | `displayOrder` | `Integer` | Yes | No | None |

### Entity: `McqQuestion` (Table: `mcq_questions`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `questionId` | `questionId` | `UUID` | Yes | **YES** | None |
| `question` | `question` | `Question` | Yes | No | `OneToOne(fetch = FetchType.LAZY, optional = false)` |
| `mcqType` | `mcqType` | `McqType` | No | No | None |
| `multipleCorrect` | `multipleCorrect` | `Boolean` | No | No | None |
| `shuffleOptions` | `shuffleOptions` | `Boolean` | No | No | None |
| `metadata` | `metadata` | `Map<String, Object>` | Yes | No | None |
| `options` | `options` | `List<McqOption>` | Yes | No | None |

### Entity: `Organisation` (Table: `organisations`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `name` | `name` | `String` | No | No | None |
| `logoUrl` | `logoUrl` | `String` | Yes | No | None |

### Entity: `Question` (Table: `questions`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `version` | `version` | `Long` | No | No | None |
| `type` | `type` | `QuestionType` | No | No | None |
| `prompt` | `prompt` | `String` | No | No | None |
| `marks` | `marks` | `Integer` | No | No | None |
| `visibility` | `visibility` | `QuestionVisibility` | No | No | None |
| `organisation` | `organisation` | `Organisation` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `subject` | `subject` | `Subjects` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `topic` | `topic` | `Topics` | Yes | No | `ManyToOne(fetch = FetchType.LAZY)` |
| `subtopic` | `subtopic` | `Subtopics` | Yes | No | `ManyToOne(fetch = FetchType.LAZY)` |
| `codingQuestion` | `codingQuestion` | `CodingQuestion` | Yes | No | `OneToOne(mappedBy = "question", cascade = CascadeType.ALL)` |
| `mcqQuestion` | `mcqQuestion` | `McqQuestion` | Yes | No | `OneToOne(mappedBy = "question", cascade = CascadeType.ALL)` |

### Entity: `QuestionScore` (Table: `question_scores`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `submission` | `submission` | `Submission` | Yes | No | `OneToOne(optional = false)` |
| `scoreAwarded` | `score_awarded` | `Float` | No | No | None |
| `maxScore` | `max_score` | `Float` | No | No | None |
| `autoGraded` | `auto_graded` | `Boolean` | No | No | None |

### Entity: `QuestionVersion` (Table: `question_versions`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `question` | `question` | `Question` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `version` | `version` | `int` | No | No | None |
| `prompt` | `prompt` | `String` | No | No | None |
| `marks` | `marks` | `int` | No | No | None |
| `questionType` | `question_type` | `String` | No | No | None |
| `payload` | `payload` | `JsonNode` | No | No | None |
| `createdBy` | `createdBy` | `User` | Yes | No | `ManyToOne(fetch = FetchType.LAZY)` |
| `createdAt` | `created_at` | `LocalDateTime` | No | No | None |

### Entity: `Subjects` (Table: `subjects`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `name` | `name` | `String` | No | No | None |
| `topics` | `topics` | `List<Topics>` | Yes | No | `OneToMany(mappedBy = "subject", cascade = CascadeType.ALL)` |
| `questions` | `questions` | `List<Question>` | Yes | No | `OneToMany(mappedBy = "subject", cascade = CascadeType.ALL)` |

### Entity: `Submission` (Table: `submissions`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `version` | `version` | `Long` | No | No | None |
| `session` | `session` | `TestSession` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `question` | `question` | `Question` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `answerText` | `answerText` | `String` | Yes | No | None |
| `submittedAt` | `submitted_at` | `LocalDateTime` | No | No | None |
| `questionType` | `question_type` | `QuestionType` | No | No | None |
| `status` | `status` | `SubmissionStatus` | No | No | None |
| `gradingLanguage` | `grading_language` | `String` | Yes | No | None |
| `gradingAttemptCount` | `grading_attempt_count` | `int` | No | No | None |
| `questionVersion` | `questionVersion` | `QuestionVersion` | Yes | No | `ManyToOne(fetch = FetchType.LAZY)` |

### Entity: `Subtopics` (Table: `subtopics`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `name` | `name` | `String` | No | No | None |
| `topic` | `topic` | `Topics` | Yes | No | `ManyToOne` |

### Entity: `TestCases` (Table: `test_cases`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `input` | `input` | `String` | Yes | No | None |
| `expectedOutput` | `expected_output` | `String` | No | No | None |
| `isSample` | `is_sample` | `boolean` | Yes | No | None |
| `weight` | `weight` | `double` | Yes | No | None |
| `explanation` | `explanation` | `String` | Yes | No | None |
| `codingQuestion` | `codingQuestion` | `CodingQuestion` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |

### Entity: `TestQuestions` (Table: `testquestions`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `test` | `test` | `Tests` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `question` | `question` | `Question` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `orderIndex` | `order_index` | `int` | No | No | None |
| `marks` | `marks` | `int` | No | No | None |
| `sectionName` | `section_name` | `String` | Yes | No | None |

### Entity: `TestResult` (Table: `testresult`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `version` | `version` | `Long` | No | No | None |
| `testSession` | `testSession` | `TestSession` | Yes | No | `OneToOne(fetch = FetchType.LAZY, optional = false)` |
| `candidate` | `candidate` | `Candidate` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `totalScore` | `total_score` | `double` | No | No | None |
| `maxScore` | `max_score` | `double` | No | No | None |
| `percentage` | `percentage` | `double` | No | No | None |
| `passed` | `is_passed` | `boolean` | No | No | None |
| `evaluatedAt` | `evaluated_at` | `LocalDateTime` | No | No | None |
| `reportBucketLink` | `report_bucket_link` | `String` | Yes | No | None |

### Entity: `TestSchedule` (Table: `test_schedules`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `test` | `test` | `Tests` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `createdBy` | `createdBy` | `User` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `organisation` | `organisation` | `Organisation` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `startTime` | `start_time` | `LocalDateTime` | No | No | None |
| `endTime` | `end_time` | `LocalDateTime` | No | No | None |
| `maxCandidates` | `max_candidates` | `Integer` | Yes | No | None |
| `status` | `status` | `ScheduleStatus` | No | No | None |

### Entity: `TestSession` (Table: `test_sessions`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `test` | `test` | `Tests` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `schedule` | `schedule` | `TestSchedule` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `candidate` | `candidate` | `Candidate` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `refreshToken` | `refresh_token` | `String` | Yes | No | None |
| `expiresAt` | `expires_at` | `LocalDateTime` | Yes | No | None |
| `ipAddress` | `ip_address` | `String` | Yes | No | None |
| `startedAt` | `started_at` | `LocalDateTime` | Yes | No | None |
| `endedAt` | `ended_at` | `LocalDateTime` | Yes | No | None |
| `timerRemainingSecs` | `timer_remaining_secs` | `Integer` | Yes | No | None |
| `status` | `status` | `TestSessionStatus` | No | No | None |
| `fullscreenViolations` | `fullscreen_violations` | `Integer` | Yes | No | None |
| `submissions` | `submissions` | `List<Submission>` | Yes | No | `OneToMany(mappedBy = "session")` |

### Entity: `TestSnapshot` (Table: `testsnapshot`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `schedule` | `schedule` | `TestSchedule` | Yes | No | `OneToOne(fetch = FetchType.LAZY, optional = false)` |
| `test` | `test` | `Tests` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `lockedAt` | `locked_at` | `LocalDateTime` | No | No | None |
| `payload` | `payload` | `JsonNode` | No | No | None |

### Entity: `Tests` (Table: `tests`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `createdBy` | `createdBy` | `User` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `organisation` | `organisation` | `Organisation` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
| `title` | `title` | `String` | No | No | None |
| `description` | `description` | `String` | Yes | No | None |
| `durationMins` | `duration_mins` | `int` | No | No | None |
| `difficulty` | `difficulty` | `Difficulty` | Yes | No | None |
| `instructions` | `instructions` | `Map<String, Object>` | Yes | No | None |
| `status` | `status` | `TestStatus` | No | No | None |
| `passMark` | `pass_mark` | `int` | No | No | None |
| `testQuestions` | `testQuestions` | `List<TestQuestions>` | Yes | No | `OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)` |
| `isActive` | `is_active` | `Boolean` | Yes | No | None |

### Entity: `Topics` (Table: `topics`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `name` | `name` | `String` | No | No | None |
| `subject` | `subject` | `Subjects` | Yes | No | `ManyToOne` |
| `questions` | `questions` | `List<Question>` | Yes | No | `OneToMany(mappedBy = "topic", cascade = CascadeType.ALL)` |

### Entity: `User` (Table: `user`)
| Field (Java) | DB Column Name | Data Type | Nullable | Primary Key | Relationship |
|--------------|----------------|-----------|----------|-------------|--------------|
| `id` | `id` | `UUID` | Yes | **YES** | None |
| `name` | `name` | `String` | No | No | None |
| `email` | `email` | `String` | No | No | None |
| `role` | `role` | `Role` | No | No | None |
| `phoneNumber` | `phone_number` | `String` | Yes | No | None |
| `passwordHash` | `password_hash` | `String` | No | No | None |
| `passwordProvider` | `password_provider` | `PasswordProvider` | No | No | None |
| `organisation` | `organisation` | `Organisation` | Yes | No | `ManyToOne(fetch = FetchType.LAZY, optional = false)` |
