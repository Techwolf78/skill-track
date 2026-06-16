# RxOne Backend API Specification

Last verified: 2026-06-15.

Updated from the current Spring Boot controllers, DTOs, security configuration, and validation rules in this repository.

This document is intended for frontend integration. It lists every active controller endpoint, request and response shapes, auth requirements, status behavior, rate limits, pagination, enums, and key workflow rules.

Verification scope:

- Controllers: `src/main/java/com/gryphon/rxone/controller`
- DTOs: `src/main/java/com/gryphon/rxone/DTO`
- Security/public route rules: `src/main/java/com/gryphon/rxone/config/SecurityConfig.java`
- Role helper rules: `src/main/java/com/gryphon/rxone/security/SecurityExpressions.java`
- Actuator/health note: checked for controller-owned mappings outside the controller package.

## 1. Base Contract

### Base URL

Use the deployed API host provided by backend/devops. For local development, the application normally runs on:

```text
http://localhost:8080
```

All paths in this document are relative to the API host.

### Content Types

Most endpoints:

```http
Content-Type: application/json
Accept: application/json
```

Bulk candidate upload:

```http
Content-Type: multipart/form-data
```

Scorecard PDF endpoint:

```http
Accept: application/pdf
```

### Authentication

JWT is stateless. Send this header on all protected endpoints:

```http
Authorization: Bearer <accessToken>
```

Public endpoints:

| Method | Path |
|---|---|
| `POST` | `/auth/register` |
| `POST` | `/auth/login` |
| `POST` | `/candidate-invitations/validate` |
| `POST` | `/api/code/execute/callback` |

Every other controller endpoint requires a valid JWT.

### Roles

| Role | Meaning |
|---|---|
| `SUPERADMIN` | Global access. Can create organisations, mutate public taxonomy, and create/update/delete public questions. |
| `ADMIN` | Organisation-scoped access. Can manage own organisation tests, candidates, schedules, sessions, questions, and results. |
| `CANDIDATE` | Candidate-scoped access. Can validate invitations, start sessions, view own session/test paper, submit answers/code, and read own results. |
| `GUEST` | Enum exists, but active protected APIs are not designed around guest access. |
| `TRAINER` | Enum exists, but `SecurityExpressions.isAnyRole()` currently only includes `ADMIN`, `SUPERADMIN`, and `CANDIDATE`. |

### JSON Envelope

Almost all JSON endpoints return `BaseResponse<T>`:

```json
{
  "success": true,
  "status": 200,
  "message": "Request completed successfully",
  "data": {},
  "errorCode": null,
  "errors": null,
  "timestamp": "2026-06-10T10:00:00Z",
  "path": null,
  "correlationId": null
}
```

Notes:

- Success responses are often built without `path` and `correlationId`.
- Error responses include `path`; global exception errors include `correlationId`.
- `POST /api/code/execute/callback` returns empty `200 OK` with no envelope.
- `GET /test-results/session/{sessionId}/scorecard` returns a PDF binary response, not a JSON envelope.
- Rate-limit responses are raw JSON, not `BaseResponse`.

### Error Envelope

Standard error example:

```json
{
  "success": false,
  "status": 422,
  "message": "Validation failed",
  "data": null,
  "errorCode": "VALIDATION_ERROR",
  "errors": {
    "email": "Invalid email format"
  },
  "timestamp": "2026-06-10T10:00:00Z",
  "path": "/auth/register",
  "correlationId": "4d0d5f61-4e5e-4a12-b9d8-0a8e0e29fb28"
}
```

Common statuses:

| HTTP | `errorCode` | When |
|---|---|---|
| `400` | `BAD_REQUEST` | Invalid state, malformed relationship, unsupported file, invalid business rule. |
| `401` | `UNAUTHORIZED` | Missing/invalid token or invalid credentials/invitation token. |
| `403` | `ACCESS_DENIED` | Authenticated user cannot access role/resource. |
| `404` | `RESOURCE_NOT_FOUND` | Entity does not exist. |
| `409` | `CONFLICT` | Duplicate data, optimistic lock conflict, immutable/unsafe operation. |
| `422` | `VALIDATION_ERROR` | Bean validation failures from DTO annotations. |
| `429` | Raw rate-limit JSON | Auth/code execution rate limit exceeded. |
| `503` | `JUDGE0_UNAVAILABLE` | Judge0 circuit breaker/fallback. |
| `500` | `INTERNAL_SERVER_ERROR` | Unhandled server error. |

### Correlation ID

The backend accepts and returns:

```http
X-Correlation-ID: <uuid-or-client-generated-id>
```

If omitted, the backend generates one and returns it in the response header.

### Pagination

Paginated endpoints return Spring `Page<T>` inside `data`.

Default pagination varies:

| Endpoint family | Default size |
|---|---:|
| `/subjects`, `/topics`, `/subtopics`, `/topics/subject/{id}`, `/subtopics/topic/{id}` | `10` |
| Most other paginated endpoints | `20` |

Query params:

| Param | Type | Default | Notes |
|---|---|---:|---|
| `page` | integer | `0` | Zero-based page index. |
| `size` | integer | family default | Page size. |
| `sort` | string | none | Spring pageable endpoints may accept `sort=field,asc`; only use after backend confirmation for a field. |

Page response shape:

```json
{
  "content": [],
  "pageable": {},
  "totalElements": 0,
  "totalPages": 0,
  "last": true,
  "size": 20,
  "number": 0,
  "sort": {},
  "first": true,
  "numberOfElements": 0,
  "empty": true
}
```

### CORS and CSRF

- Allowed origins are configured by `app.cors.allowed-origins`.
- Allowed methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, `PATCH`.
- Allowed headers: `Authorization`, `Content-Type`, `Cache-Control`, `X-Requested-With`.
- Exposed headers: `Authorization`.
- Credentials are allowed.
- CSRF is disabled by default with `app.csrf.enabled:false`.
- If CSRF is enabled later, `/auth/**` is ignored by CSRF, but other state-changing endpoints may require the CSRF cookie/header flow.

### Rate Limits

Auth endpoints:

- Applies to `/auth/login` and `/auth/register`.
- Limit: 5 attempts per minute per IP.
- Response: `429`, `Retry-After: 60`.

Code execution endpoints:

- Applies to `/api/code/execute/run` and `/api/code/execute/submit`.
- Limit: 10 requests per minute per authenticated user per `sessionId` when `sessionId` is present.
- Response: `429`, `Retry-After: 60`.

Raw rate-limit response:

```json
{
  "status": 429,
  "error": "Too Many Requests",
  "message": "Code execution limit: 10 requests/minute. Try again in 60 seconds."
}
```

## 2. Endpoint Catalog

There are 104 active controller endpoints as of the 2026-06-15 source scan. No extra controller-owned routes were found outside `src/main/java/com/gryphon/rxone/controller`.

### Auth

| Method | Path | Access | Request | Response |
|---|---|---|---|---|
| `POST` | `/auth/register` | Public | `RegisterRequest` | `201 BaseResponse<AuthResponse>` |
| `POST` | `/auth/login` | Public | `LoginRequest` | `200 BaseResponse<AuthResponse>` |
| `PATCH` | `/auth/reset-password` | Authenticated | `ResetPasswordRequest` | `200 BaseResponse<AuthResponse>` |

Important:

- `RegisterRequest.role` exists but the service always creates `Role.CANDIDATE`.
- Registration requires an existing `organisationId`.
- `reset-password` only supports `PasswordProvider.LOCAL`.

### Admin

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/admin/users` | `ADMIN`, `SUPERADMIN` | `CreateUserRequest` | `role: Role` required | `200 BaseResponse<String>` |
| `GET` | `/admin/audit-logs` | `ADMIN`, `SUPERADMIN` | none | `actor`, `start`, `end`, `page`, `size` | `200 BaseResponse<Page<AuditLog>>` |


Important:

- Non-superadmin cannot create `SUPERADMIN`.
- Non-superadmin cannot create a user for a different organisation.

### Users

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `GET` | `/users` | `ADMIN`, `SUPERADMIN` | none | `page`, `size` | `200 BaseResponse<Page<UserResponse>>` |
| `GET` | `/users/{id}` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<UserResponse>` |
| `PATCH` | `/users/{id}` | Any active role, scoped | `UpdateUserRequestPatch` | none | `200 BaseResponse<UserResponse>` |
| `DELETE` | `/users/{id}` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<String>` |

Scope:

- `SUPERADMIN` can read all users.
- `ADMIN` is limited to own organisation.
- A candidate can patch only their own linked user via `canAccessUser`.

### Organisations

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `GET` | `/organisations` | `ADMIN`, `SUPERADMIN` | none | `page`, `size` | `200 BaseResponse<Page<OrganisationResponse>>` |
| `POST` | `/organisations` | `SUPERADMIN` | `CreateOrganisationRequest` | none | `200 BaseResponse<OrganisationResponse>` |
| `GET` | `/organisations/{id}` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<OrganisationResponse>` |
| `PATCH` | `/organisations/{id}` | `ADMIN`, `SUPERADMIN`, scoped | `UpdateOrganisationRequest` | none | `200 BaseResponse<OrganisationResponse>` |

Scope:

- `ADMIN` can access only own organisation.
- `SUPERADMIN` can access all.

### Candidates

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/candidates` | `ADMIN`, `SUPERADMIN` | `CreateCandidateRequest` | none | `200 BaseResponse<String>` |
| `GET` | `/candidates` | `ADMIN`, `SUPERADMIN` | none | `page`, `size` | `200 BaseResponse<Page<CandidateResponse>>` |
| `GET` | `/candidates/me` | `CANDIDATE` | none | none | `200 BaseResponse<CandidateResponse>` |
| `POST` | `/candidates/bulk-upload` | `ADMIN`, `SUPERADMIN` | multipart `file` | none | `200 BaseResponse<BulkUploadResult>` |
| `PATCH` | `/candidates/{id}` | Scoped candidate access | `UpdateCandidateRequest` | none | `200 BaseResponse<CandidateResponse>` |
| `DELETE` | `/candidates/{id}` | Scoped candidate access | none | none | `200 BaseResponse<String>` |
| `GET` | `/candidates/me/insights` | `CANDIDATE` | none | none | `200 BaseResponse<CandidateInsightResponse>` |
| `GET` | `/candidates/{id}/insights` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<CandidateInsightResponse>` |


Bulk upload:

- Field name must be `file`.
- Allowed extensions: `.xlsx`, `.xls`, `.csv`.
- Max file size: 10 MB.
- Max rows: 10,000.
- CSV/XLS columns are positional:
  - column 1: `name`
  - column 2: `email`
  - column 3: `password`
  - column 4: `phoneNumber`
  - column 5: `organisationId`
  - column 6: `extraFields.college`
  - column 7: `extraFields.course`
  - column 8: `extraFields.year`
  - column 9: `extraFields.skills`
- First CSV/Excel row is treated as header and skipped.

### Candidate Invitations

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/candidate-invitations` | `ADMIN`, `SUPERADMIN` | `CreateCandidateInvitationRequest` | none | `200 BaseResponse<CandidateInvitationResponse>` |
| `GET` | `/candidate-invitations` | `ADMIN`, `SUPERADMIN`, `CANDIDATE` | none | `page`, `size` | `200 BaseResponse<Page<CandidateInvitationResponse>>` |
| `GET` | `/candidate-invitations/{id}` | Any active role, scoped | none | none | `200 BaseResponse<CandidateInvitationResponse>` |
| `PATCH` | `/candidate-invitations/{id}` | `ADMIN`, `SUPERADMIN`, scoped | `PatchCandidateInvitationRequest` | none | `200 BaseResponse<CandidateInvitationResponse>` |
| `DELETE` | `/candidate-invitations/{id}` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<String>` |
| `POST` | `/candidate-invitations/validate` | Public | `ValidateInvitationRequest` | none | `200 BaseResponse<CandidateAuthResponse>` |

Important:

- DTO currently marks `candidateId` required, but service also supports `candidateEmail` if `candidateId` is null. For reliable frontend use, send `candidateId`.
- Candidate and schedule must belong to the same organisation.
- `inviteLink` in response is relative: `/tests/access/{invitationId}/{token}`.
- Validation accepts only `PENDING` or `ACCEPTED` invitations.
- Validating a `PENDING` invitation changes it to `ACCEPTED`.
- If schedule `endTime` has passed, validation marks invitation `EXPIRED` and returns unauthorized.

### Subjects

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/subjects` | `SUPERADMIN` | `CreateSubjectRequest` | none | `200 BaseResponse<SubjectResponse>` |
| `GET` | `/subjects` | `ADMIN`, `SUPERADMIN` | none | `page`, `size` default `10` | `200 BaseResponse<Page<SubjectResponse>>` |
| `GET` | `/subjects/{id}` | `ADMIN`, `SUPERADMIN` | none | none | `200 BaseResponse<SubjectResponse>` |
| `PUT` | `/subjects/{id}` | `SUPERADMIN` | `UpdateSubjectRequest` | none | `200 BaseResponse<SubjectResponse>` |
| `PATCH` | `/subjects/{id}` | `SUPERADMIN` | `UpdateSubjectRequest` | none | `200 BaseResponse<SubjectResponse>` |
| `DELETE` | `/subjects/{id}` | `SUPERADMIN` | none | none | `200 BaseResponse<String>` |

### Topics

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/topics` | `SUPERADMIN` | `CreateTopicRequest` | none | `200 BaseResponse<TopicResponse>` |
| `GET` | `/topics` | `ADMIN`, `SUPERADMIN` | none | `page`, `size`, `sort` | `200 BaseResponse<Page<TopicResponse>>` |
| `GET` | `/topics/{id}` | `ADMIN`, `SUPERADMIN` | none | none | `200 BaseResponse<TopicResponse>` |
| `GET` | `/topics/subject/{subjectId}` | `ADMIN`, `SUPERADMIN` | none | `page`, `size`, `sort` | `200 BaseResponse<Page<TopicResponse>>` |
| `PUT` | `/topics/{id}` | `SUPERADMIN` | `UpdateTopicRequest` | none | `200 BaseResponse<TopicResponse>` |
| `PATCH` | `/topics/{id}` | `SUPERADMIN` | `UpdateTopicRequest` | none | `200 BaseResponse<TopicResponse>` |
| `DELETE` | `/topics/{id}` | `SUPERADMIN` | none | none | `200 BaseResponse<String>` |

### Subtopics

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/subtopics` | `SUPERADMIN` | `CreateSubtopicRequest` | none | `200 BaseResponse<SubtopicResponse>` |
| `GET` | `/subtopics` | `ADMIN`, `SUPERADMIN` | none | `page`, `size`, `sort` | `200 BaseResponse<Page<SubtopicResponse>>` |
| `GET` | `/subtopics/{id}` | `ADMIN`, `SUPERADMIN` | none | none | `200 BaseResponse<SubtopicResponse>` |
| `GET` | `/subtopics/topic/{topicId}` | `ADMIN`, `SUPERADMIN` | none | `page`, `size`, `sort` | `200 BaseResponse<Page<SubtopicResponse>>` |
| `PUT` | `/subtopics/{id}` | `SUPERADMIN` | `UpdateSubtopicRequest` | none | `200 BaseResponse<SubtopicResponse>` |
| `PATCH` | `/subtopics/{id}` | `SUPERADMIN` | `UpdateSubtopicRequest` | none | `200 BaseResponse<SubtopicResponse>` |
| `DELETE` | `/subtopics/{id}` | `SUPERADMIN` | none | none | `200 BaseResponse<String>` |

### Questions

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/questions` | `ADMIN`, `SUPERADMIN` | `CreateQuestionRequest` polymorphic | none | `200 BaseResponse<QuestionResponse>` |
| `GET` | `/questions` | `ADMIN`, `SUPERADMIN` | none | `subjectId`, `topicId`, `subtopicId`, `page`, `size` | `200 BaseResponse<Page<QuestionResponse>>` |
| `GET` | `/questions/{id}` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<QuestionResponse>` |
| `PUT` | `/questions/{id}` | `ADMIN`, `SUPERADMIN`, scoped | `UpdateQuestionRequest` polymorphic | none | `200 BaseResponse<QuestionResponse>` |
| `PATCH` | `/questions/{id}` | `ADMIN`, `SUPERADMIN`, scoped | `UpdateQuestionRequest` polymorphic | none | `200 BaseResponse<QuestionResponse>` |
| `DELETE` | `/questions/{id}` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<String>` |

Important:

- `questionType` controls polymorphic request/response subtype: `MCQ` or `CODING`.
- `visibility` is required on create.
- `PUBLIC` questions can be created/updated/deleted only by `SUPERADMIN`.
- `ORG_OWNED` questions are scoped to the current user's organisation.
- `ADMIN` sees `PUBLIC` plus own `ORG_OWNED` questions.
- Delete is blocked if the question is linked to a non-`DRAFT` test, has submissions, or has code execution runs.
- Non-superadmin update is blocked when linked to a non-`DRAFT` test.

### Tests

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/tests` | `ADMIN`, `SUPERADMIN` | `CreateTestRequest` | none | `200 BaseResponse<TestResponse>` |
| `GET` | `/tests` | `ADMIN`, `SUPERADMIN` | none | `page`, `size` | `200 BaseResponse<Page<TestResponse>>` |
| `GET` | `/tests/{id}` | Any active role, scoped | none | none | `200 BaseResponse<TestResponse>` |
| `PUT` | `/tests/{id}` | `ADMIN`, `SUPERADMIN`, scoped | `UpdateTestRequest` | none | `200 BaseResponse<TestResponse>` |
| `PATCH` | `/tests/{id}` | `ADMIN`, `SUPERADMIN`, scoped | `UpdateTestRequest` | none | `200 BaseResponse<TestResponse>` |
| `PATCH` | `/tests/{id}/inactive` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<String>` |
| `GET` | `/tests/inactive` | `ADMIN`, `SUPERADMIN` | none | none | `200 BaseResponse<List<TestResponse>>` |
| `PATCH` | `/tests/{id}/active` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<String>` |

Important:

- `durationMins` must be greater than zero.
- `passMark` must be zero or greater.
- Inline `questions` must not contain duplicate `questionId` or duplicate `orderIndex`.
- `orderIndex` must be zero or greater.
- Test question `marks` must be zero or greater.
- An org-owned question cannot be assigned to a test from a different organisation.

### Test Questions

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/test-questions` | `ADMIN`, `SUPERADMIN` | `CreateTestQuestionRequest` | none | `200 BaseResponse<TestQuestionResponse>` |
| `POST` | `/test-questions/bulk` | `ADMIN`, `SUPERADMIN` | `CreateTestQuestionRequest[]` | none | `200 BaseResponse<List<TestQuestionResponse>>` |
| `GET` | `/test-questions/{id}` | `ADMIN`, `SUPERADMIN` | none | none | `200 BaseResponse<TestQuestionResponse>` |
| `GET` | `/test-questions` | `ADMIN`, `SUPERADMIN` | none | `testId`, `questionId`, `page`, `size` | `200 BaseResponse<Page<TestQuestionResponse>>` |
| `GET` | `/test-questions/test/{testId}` | `ADMIN`, `SUPERADMIN`, test scoped | none | none | `200 BaseResponse<List<TestQuestionDetailResponse>>` |
| `GET` | `/test-questions/test/{testId}/grouped` | `ADMIN`, `SUPERADMIN`, test scoped | none | none | `200 BaseResponse<Map<String,List<TestQuestionDetailResponse>>>` |
| `PUT` | `/test-questions/{id}` | `ADMIN`, `SUPERADMIN` | `UpdateTestQuestionRequest` | none | `200 BaseResponse<TestQuestionResponse>` |
| `PATCH` | `/test-questions/{id}` | `ADMIN`, `SUPERADMIN` | `UpdateTestQuestionRequest` | none | `200 BaseResponse<TestQuestionResponse>` |
| `DELETE` | `/test-questions/{id}` | `ADMIN`, `SUPERADMIN` | none | none | `200 BaseResponse<String>` |

Important:

- `POST /test-questions/bulk` accepts a raw array of `CreateTestQuestionRequest`, not `BulkAddTestQuestionsRequest`.
- Duplicate question within a test returns conflict.
- Duplicate order index within a test returns conflict.

### Test Schedules

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/test-schedules` | `ADMIN`, `SUPERADMIN` | `CreateTestScheduleRequest` | none | `200 BaseResponse<TestScheduleResponse>` |
| `GET` | `/test-schedules` | `ADMIN`, `SUPERADMIN` | none | `page`, `size` | `200 BaseResponse<Page<TestScheduleResponse>>` |
| `GET` | `/test-schedules/{id}` | Any active role, scoped | none | none | `200 BaseResponse<TestScheduleResponse>` |
| `PATCH` | `/test-schedules/{id}` | `ADMIN`, `SUPERADMIN`, scoped | `PatchTestScheduleRequest` | none | `200 BaseResponse<TestScheduleResponse>` |
| `DELETE` | `/test-schedules/{id}` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<String>` |

Important:

- Schedule organisation is derived from the linked test.
- Patching `testId` must keep the same organisation.
- The schedule entity now also stores `proctoringProfile` and `proctoringConfigOverride` internally, but current schedule create/patch DTOs do not expose those fields.

### Test Sessions

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/test-sessions` | `ADMIN`, `SUPERADMIN` | `CreateTestSessionRequest` | none | `200 BaseResponse<TestSessionResponse>` |
| `POST` | `/test-sessions/start` | `CANDIDATE` | `StartTestSessionRequest` | none | `200 BaseResponse<TestSessionResponse>` |
| `GET` | `/test-sessions` | Any active role | none | `page`, `size` | `200 BaseResponse<Page<TestSessionResponse>>` |
| `GET` | `/test-sessions/{id}` | Any active role, scoped | none | none | `200 BaseResponse<TestSessionResponse>` |
| `GET` | `/test-sessions/{id}/paper` | Any active role, scoped | none | none | `200 BaseResponse<TestSessionPaperResponse>` |
| `PATCH` | `/test-sessions/{id}` | Any active role, scoped | `PatchTestSessionRequest` | none | `200 BaseResponse<TestSessionResponse>` |
| `POST` | `/test-sessions/{id}/submit` | Any active role, scoped | none | none | `200 BaseResponse<String>` |
| `DELETE` | `/test-sessions/{id}` | `ADMIN`, `SUPERADMIN`, scoped | none | none | `200 BaseResponse<String>` |

Candidate flow:

1. `POST /candidate-invitations/validate` to get candidate JWT.
2. `POST /test-sessions/start` with `invitationId`.
3. `GET /test-sessions/{id}/proctoring-config` to initialize monitoring rules when proctoring is enabled.
4. `GET /test-sessions/{id}/paper`.
5. During the session, send proctoring telemetry through `/test-sessions/{id}/violations`, `/violations/batch`, and `/snapshots/batch` as needed.
6. Submit answers through `/submissions` and coding code through `/api/code/execute/*`.
7. `POST /test-sessions/{id}/submit`.
8. Poll `GET /test-results/session/{sessionId}`.

Important:

- Starting a session creates or reuses a test snapshot for the schedule.
- A candidate cannot start another `ACTIVE`, `INACTIVE`, or `SUBMITTED` session for the same schedule.
- When submitting a test, unanswered MCQs are auto-created with zero score.
- For coding questions, latest accepted code run may be promoted into a grading submission.

### Proctoring

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `GET` | `/test-sessions/{sessionId}/proctoring-config` | `CANDIDATE`, session scoped | none | none | `200 BaseResponse<ProctoringConfigDto>` |
| `POST` | `/test-sessions/{sessionId}/violations` | `CANDIDATE`, session scoped | `ViolationRequest` | none | `200 BaseResponse<String>` |
| `POST` | `/test-sessions/{sessionId}/violations/batch` | `CANDIDATE`, session scoped | `ViolationBatchRequest` | none | `200 BaseResponse<String>` |
| `POST` | `/test-sessions/{sessionId}/snapshots/batch` | `CANDIDATE`, session scoped | `SnapshotBatchRequest` | none | `200 BaseResponse<String>` |
| `GET` | `/admin/sessions/{sessionId}/proctoring-summary` | `ADMIN`, `SUPERADMIN`, session scoped | none | `page`, `size` default `20` | `200 BaseResponse<ProctoringSummaryResponse>` |

Important:

- `GET /test-sessions/{sessionId}/proctoring-config` resolves the effective config by merging the linked schedule's profile config and per-schedule override config.
- Default effective config is:
  - `camera: false`
  - `audio: false`
  - `tabSwitch: true`
  - `devtools: false`
  - `screenShare: false`
  - `objectDetection: false`
  - `llmDetector: false`
  - `maxTabSwitches: 2`
  - `snapshotIntervalSecs: 60`
  - `violationThresholds: { "look_away": 3, "multi_face": 2 }`
- Config merging accepts both snake_case and camelCase keys for several fields, including `tab_switch` or `tabSwitch`, `screen_share` or `screenShare`, and `snapshot_interval_secs` or `snapshotIntervalSecs`.
- Violation ingestion is idempotent by `clientEventId` per session. Duplicate event IDs are silently ignored and still return success.
- `ViolationRequest.type` and `ViolationRequest.severity` are converted with `Enum.valueOf(...)` after uppercasing. Unsupported values return `400 BAD_REQUEST`.
- If `ViolationRequest.evidence` is present and non-blank, the backend stores it as a `VIOLATION` snapshot linked to the created event.
- Snapshot batch ingestion stores `AUDIT` snapshots only. There is currently no per-item bean validation on `SnapshotEntry`.

### Submissions

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/submissions` | Any active role, scoped | `SubmissionRequestDTO` | none | `200 BaseResponse<SubmissionResponseDTO>` |
| `GET` | `/submissions/{id}` | Any active role, scoped | none | none | `200 BaseResponse<SubmissionResponseDTO>` |

Important:

- Question must be attached to the session's test.
- Session must be accessible by the current user.
- Expired sessions reject submissions.
- MCQ submissions must send `selectedOptionIds`; sending `answerText` for MCQ returns bad request.
- MCQs are graded immediately.
- Coding submissions move to `PENDING_GRADING` and are graded asynchronously.

### Test Results

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/test-results` | `ADMIN`, `SUPERADMIN` | `CreateTestResultDTO` | none | `200 BaseResponse<TestResultResponse>` or `202 BaseResponse<null>` |
| `GET` | `/test-results/{id}` | Any active role, scoped | none | none | `200 BaseResponse<TestResultResponse>` |
| `GET` | `/test-results/session/{sessionId}` | Any active role, session scoped | none | none | `200 BaseResponse<TestResultResponse>` or `202 BaseResponse<null>` |
| `GET` | `/test-results/session/{sessionId}/scorecard` | Any active role, session scoped | none | none | `200 application/pdf` or `404` |

Important:

- `POST /test-results` may return `202` with `data: null` if session is not terminal or grading is still in progress.
- `GET /test-results/session/{sessionId}` may return `202` with `data: null` until grading is ready.
- Scorecard is a binary PDF response with `Content-Disposition: inline`.

### Test Cases

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/test-cases` | `ADMIN`, `SUPERADMIN` | `CreateTestCaseRequest` | none | `200 BaseResponse<TestCaseResponse>` |
| `GET` | `/test-cases` | `ADMIN`, `SUPERADMIN` | none | `codingQuestionId`, `page`, `size` | `200 BaseResponse<Page<TestCaseResponse>>` |
| `GET` | `/test-cases/{id}` | `ADMIN`, `SUPERADMIN` | none | none | `200 BaseResponse<TestCaseResponse>` |
| `PATCH` | `/test-cases/update/{id}` | `ADMIN`, `SUPERADMIN` | `PatchTestCaseRequest` | none | `200 BaseResponse<TestCaseResponse>` |
| `DELETE` | `/test-cases/delete/{id}` | `ADMIN`, `SUPERADMIN` | none | none | `200 BaseResponse<String>` |

Important:

- Test cases belong to coding questions.
- `codingQuestionId` filter is optional on list.

### Code Execution

| Method | Path | Access | Request | Query | Response |
|---|---|---|---|---|---|
| `POST` | `/api/code/execute/run` | Any active role, scoped | `CodeRunRequest` | none | `200 BaseResponse<List<CodeRunResponseDTO>>` |
| `POST` | `/api/code/execute/submit` | Any active role, scoped | `CodeRunRequest` | none | `202 BaseResponse<UUID>` |
| `GET` | `/api/code/execute/submit/{submissionId}/result` | Any active role, submission scoped | none | none | `200 BaseResponse<CodingSubmissionResultDTO>` or `202 BaseResponse<null>` |
| `POST` | `/api/code/execute/playground` | `ADMIN`, `SUPERADMIN` | `PlaygroundRequest` | none | `200 BaseResponse<List<CodeRunResponseDTO>>` |
| `POST` | `/api/code/execute/callback` | Public | Judge0 callback payload | none | `200` empty body |

Important:

- `/run` executes code for quick feedback against sample/custom test input.
- `/submit` creates a coding submission and starts async grading. Poll result endpoint using returned submission UUID.
- Question must be a coding question.
- Question must be attached to the session test.
- `/playground` is admin-only and does not require a session.
- Callback is for Judge0/backend integration, not normal frontend use.

## 3. DTO Schemas

Types:

- `UUID` values are strings.
- `LocalDateTime` values are ISO-8601 strings, normally without timezone unless backend serializes otherwise.
- `Map<String,Object>` can contain arbitrary JSON object data.

### Auth DTOs

`RegisterRequest`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Not blank. |
| `email` | string | yes | Valid email. |
| `password` | string | yes | Minimum 8 chars. |
| `phoneNumber` | string | no | Normalized server-side. |
| `role` | `Role` | no | Defaults to `GUEST`, but service creates `CANDIDATE`. |
| `organisationId` or `organisation_id` | UUID | yes | `JsonAlias` supports snake case. |

`LoginRequest`

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |
| `password` | string | yes |

`ResetPasswordRequest`

| Field | Type | Required | Notes |
|---|---|---|---|
| `oldPassword` | string | yes | Not blank. |
| `newPassword` | string | yes | Minimum 8 chars; cannot match old password. |

`AuthResponse`

| Field | Type |
|---|---|
| `accessToken` | string |
| `tokenType` | string, usually `Bearer` |
| `expiresIn` | long milliseconds |
| `user.id` | UUID |
| `user.name` | string |
| `user.email` | string |
| `user.role` | string |
| `user.phoneNumber` | string |
| `user.organisationData.id` | UUID |
| `user.organisationData.name` | string |
| `user.organisationData.logoUrl` | string |

### User DTOs

`CreateUserRequest`

| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `email` | string | yes |
| `password` | string | yes, min 8 |
| `phoneNumber` | string | no |
| `organisationId` or `organisation_id` | UUID | yes |

`UpdateUserRequestPatch`

| Field | Type | Required |
|---|---|---|
| `name` | string | no |
| `email` | string | no, valid email if present |
| `password` | string | no, min 8 if present |
| `phoneNumber` | string | no |

`UserResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `name` | string |
| `email` | string |
| `phoneNumber` | string |
| `role` | `Role` |
| `organisation.id` | UUID |
| `organisation.name` | string |
| `createdAt` | datetime |
| `updatedAt` | datetime |

### Organisation DTOs

`CreateOrganisationRequest`

| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `logoUrl` | string | no |

`UpdateOrganisationRequest`

| Field | Type | Required |
|---|---|---|
| `name` | string | no |
| `logoUrl` | string | no |

`OrganisationResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `name` | string |
| `logoUrl` | string |
| `createdAt` | datetime |
| `updatedAt` | datetime |

### Candidate DTOs

`CreateCandidateRequest`

| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `email` | string | yes |
| `password` | string | yes, min 8 |
| `phoneNumber` | string | no |
| `extraFields` | object | no |
| `organisationId` or `organisation_id` | UUID | yes |

`UpdateCandidateRequest`

| Field | Type | Required |
|---|---|---|
| `name` | string | no |
| `email` | string | no |
| `phoneNumber` | string | no |
| `extraFields` | object | no |

`CandidateResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `userId` | UUID |
| `name` | string |
| `email` | string |
| `phoneNumber` | string |
| `organisation.id` | UUID |
| `organisation.name` | string |
| `extraFields` | object |
| `isStale` | boolean |
| `lastUpdated` | datetime |
| `createdAt` | datetime |
| `updatedAt` | datetime |

`BulkUploadResult`

| Field | Type |
|---|---|
| `totalRows` | integer |
| `successCount` | integer |
| `failCount` | integer |
| `rows` | `BulkUploadRowResult[]` |

`BulkUploadRowResult`

| Field | Type |
|---|---|
| `rowNumber` | integer |
| `email` | string |
| `status` | `SUCCESS` or `FAILED` |
| `errorMessage` | string/null |

`CandidateInsightResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `candidateId` | UUID |
| `totalEvals` | integer |
| `totalTests` | integer |
| `overallPercentile` | double |
| `trends` | array of doubles |
| `monthlyTrend` | object (key: yyyy-MM, value: double) |
| `topicBreakdown` | object (key: topic, value: double) |
| `strongTopics` | array of strings |
| `weakTopics` | array of strings |
| `commPercentile` | double |
| `commTrend` | object (key: topic, value: double) |
| `improvementAreas` | array of strings |
| `lastComputed` | datetime |

### Candidate Invitation DTOs

`CreateCandidateInvitationRequest`

| Field | Type | Required | Notes |
|---|---|---|---|
| `scheduleId` | UUID | yes | Schedule to invite for. |
| `candidateId` | UUID | yes by DTO | Send this for reliable validation. |
| `candidateEmail` | string | no | Service fallback if `candidateId` is null, but DTO currently marks `candidateId` required. |

`PatchCandidateInvitationRequest`

| Field | Type | Required |
|---|---|---|
| `status` | `InvitationStatus` | yes |

`ValidateInvitationRequest`

| Field | Type | Required |
|---|---|---|
| `id` | UUID | yes |
| `token` | string | yes |

`CandidateInvitationResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `scheduleId` | UUID |
| `candidateId` | UUID |
| `token` | string |
| `status` | `InvitationStatus` |
| `sentAt` | datetime |
| `inviteLink` | string |

`CandidateAuthResponse`

| Field | Type |
|---|---|
| `accessToken` | string |
| `tokenType` | string |
| `expiresIn` | long milliseconds |

### Taxonomy DTOs

`CreateSubjectRequest`

| Field | Type | Required |
|---|---|---|
| `name` | string | yes |

`UpdateSubjectRequest`

| Field | Type | Required |
|---|---|---|
| `name` | string | no |

`SubjectResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `name` | string |
| `createdAt` | datetime |
| `updatedAt` | datetime |

`CreateTopicRequest`

| Field | Type | Required |
|---|---|---|
| `subject_id` | UUID | yes |
| `name` | string | yes |

`UpdateTopicRequest`

| Field | Type | Required |
|---|---|---|
| `subject_id` | UUID | no |
| `name` | string | no |

`TopicResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `subjectId` | UUID |
| `name` | string |
| `createdAt` | datetime |
| `updatedAt` | datetime |

`CreateSubtopicRequest`

| Field | Type | Required |
|---|---|---|
| `topic_id` | UUID | yes |
| `name` | string | yes |

`UpdateSubtopicRequest`

| Field | Type | Required |
|---|---|---|
| `topic_id` | UUID | no |
| `name` | string | no |

`SubtopicResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `topicId` | UUID |
| `name` | string |
| `createdAt` | datetime |
| `updatedAt` | datetime |

### Question DTOs

Question request and response DTOs are polymorphic by `questionType`.

Common create fields:

| Field | Type | Required | JSON name |
|---|---|---|---|
| `subjectId` | UUID | yes | `subject_id` |
| `topicId` | UUID | no | `topic_id` |
| `subtopicId` | UUID | no | `subtopic_id` |
| `questionType` | `QuestionType` | yes | `questionType` |
| `prompt` | string | yes | `prompt` |
| `marks` | integer | yes, min 1 | `marks` |
| `difficulty` | `Difficulty` | no | `difficulty` |
| `visibility` | `QuestionVisibility` | yes | `visibility` |

Common update fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `subject_id` | UUID | no | `PUT` clears subject if omitted because service sets null; `PATCH` only changes if present. |
| `topic_id` | UUID | no | Same behavior as subject. |
| `subtopic_id` | UUID | no | Same behavior as subject. |
| `questionType` | `QuestionType` | required by `PUT`, optional by `PATCH` | Controls subtype. |
| `prompt` | string | required by `PUT`, optional by `PATCH` | |
| `marks` | integer | required by `PUT`, optional by `PATCH` | |
| `difficulty` | `Difficulty` | no | |
| `visibility` | `QuestionVisibility` | no | |

`CreateMcqQuestionRequest`

| Field | Type | Required |
|---|---|---|
| common create fields | see above | yes/no as above |
| `mcqType` | `McqType` | yes |
| `multipleCorrect` | boolean | yes |
| `shuffleOptions` | boolean | yes |
| `mcqOptions` | object array | yes, non-empty |

MCQ option object:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Optional on update; backend preserves provided id or generates one. |
| `text` | string | Optional depending on question style. |
| `isCorrect` | boolean | At least one option must have `true`. |
| `imageUrl` | string | Optional for image MCQs. |
| `displayOrder` | integer | Optional. |

`CreateCodingQuestionRequest`

| Field | Type | Required |
|---|---|---|
| common create fields | see above | yes/no as above |
| `title` | string | yes |
| `constraints` | string | no |
| `memoryLimitMb` | integer | no, min 1 if present |
| `timeLimitSecs` | integer | no, min 1 if present |
| `sampleExplanation` | string | no |
| `codeTemplate` | object | yes |
| `examples` | object array | no |
| `hints` | string array | no |
| `tags` | string array | no |

`QuestionResponse` common fields:

| Field | Type |
|---|---|
| `id` | UUID |
| `subjectId` | UUID |
| `subjectName` | string |
| `topicId` | UUID |
| `topicName` | string |
| `subtopicId` | UUID |
| `subtopicName` | string |
| `questionType` | `QuestionType` |
| `visibility` | `QuestionVisibility` |
| `organisationId` | UUID/null |
| `prompt` | string |
| `marks` | integer |
| `difficulty` | `Difficulty` |
| `createdAt` | datetime |
| `updatedAt` | datetime |

`McqQuestionResponse` adds:

| Field | Type |
|---|---|
| `mcqType` | `McqType` |
| `multipleCorrect` | boolean |
| `shuffleOptions` | boolean |
| `mcqOptions` | object array |

`CodingQuestionResponse` adds:

| Field | Type |
|---|---|
| `title` | string |
| `constraints` | string |
| `memoryLimitMb` | integer |
| `timeLimitSecs` | integer |
| `sampleExplanation` | string |
| `codeTemplate` | object |
| `examples` | object array |
| `hints` | string array |
| `tags` | string array |

### Test DTOs

`CreateTestRequest`

| Field | Type | Required |
|---|---|---|
| `title` | string | yes |
| `description` | string | no |
| `durationMins` | integer | yes |
| `difficulty` | `Difficulty` | no |
| `instructions` | object | no |
| `status` | `TestStatus` | yes |
| `passMark` | integer | yes |
| `questions` | `TestQuestionRequest[]` | no |

`UpdateTestRequest`

| Field | Type | Required |
|---|---|---|
| `title` | string | no |
| `description` | string | no |
| `durationMins` | integer | no |
| `difficulty` | `Difficulty` | no |
| `instructions` | object | no |
| `status` | `TestStatus` | no |
| `passMark` | integer | no |
| `questions` | `TestQuestionRequest[]` | no |

`TestQuestionRequest`

| Field | Type | Required |
|---|---|---|
| `questionId` | UUID | yes |
| `orderIndex` | integer | yes |
| `marks` | integer | yes |

`TestResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `createdById` | UUID |
| `title` | string |
| `description` | string |
| `durationMins` | integer |
| `difficulty` | `Difficulty` |
| `instructions` | object |
| `status` | `TestStatus` |
| `passMark` | integer |
| `questions` | `TestQuestionResponse[]` |
| `createdAt` | datetime |
| `updatedAt` | datetime |
| `isActive` | boolean |
| `organisationId` | UUID |

### Test Question DTOs

`CreateTestQuestionRequest`

| Field | Type | Required |
|---|---|---|
| `testId` | UUID | yes |
| `questionId` | UUID | yes |
| `orderIndex` | integer | yes |
| `marks` | integer | yes |
| `sectionName` | string | no |

`UpdateTestQuestionRequest`

| Field | Type | Required |
|---|---|---|
| `testId` | UUID | no |
| `questionId` | UUID | no |
| `orderIndex` | integer | no |
| `marks` | integer | no |
| `sectionName` | string | no |

`TestQuestionResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `testId` | UUID |
| `questionId` | UUID |
| `orderIndex` | integer |
| `marks` | integer |
| `createdAt` | datetime |
| `updatedAt` | datetime |

`TestQuestionDetailResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `testId` | UUID |
| `question` | `QuestionResponse` |
| `orderIndex` | integer |
| `marks` | integer |
| `sectionName` | string |
| `createdAt` | datetime |
| `updatedAt` | datetime |

### Schedule DTOs

`CreateTestScheduleRequest`

| Field | Type | Required |
|---|---|---|
| `testId` | UUID | yes |
| `startTime` | datetime | yes |
| `endTime` | datetime | yes |
| `maxCandidates` | integer | no |
| `status` | `ScheduleStatus` | no |

`PatchTestScheduleRequest`

| Field | Type | Required |
|---|---|---|
| `testId` | UUID | no |
| `startTime` | datetime | no |
| `endTime` | datetime | no |
| `maxCandidates` | integer | no, min 1 if present |
| `status` | `ScheduleStatus` | no |

`TestScheduleResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `testId` | UUID |
| `createdById` | UUID |
| `startTime` | datetime |
| `endTime` | datetime |
| `maxCandidates` | integer |
| `status` | `ScheduleStatus` |

Note:

- Although the underlying entity now has `proctoringProfile` and `proctoringConfigOverride`, those fields are not currently returned by `TestScheduleResponse`.

### Proctoring DTOs

`ProctoringConfigDto`

| Field | Type |
|---|---|
| `camera` | boolean |
| `audio` | boolean |
| `tabSwitch` | boolean |
| `devtools` | boolean |
| `screenShare` | boolean |
| `objectDetection` | boolean |
| `llmDetector` | boolean |
| `maxTabSwitches` | integer |
| `snapshotIntervalSecs` | integer |
| `violationThresholds` | `Record<string, integer>` |

`ViolationRequest`

| Field | Type | Required | Notes |
|---|---|---|---|
| `clientEventId` | UUID | yes | Also accepts JSON key `id` via `@JsonAlias`. |
| `type` | string | yes | Expected enum values map to `ProctoringEventType`. |
| `timestamp` | long | effectively yes | Epoch milliseconds. No `@NotNull`, so omitted values deserialize to `0`. |
| `severity` | string | yes | Expected enum values map to `ProctoringEventSeverity`. |
| `evidence` | string | no | Usually base64 image data or similar evidence payload. |
| `metadata` | object | no | Arbitrary JSON object. |

`ViolationBatchRequest`

| Field | Type | Required |
|---|---|---|
| `violations` | `ViolationRequest[]` | yes |

`SnapshotBatchRequest`

| Field | Type | Required | Notes |
|---|---|---|---|
| `snapshots` | `SnapshotEntry[]` | yes | List itself is required. |

`SnapshotEntry`

| Field | Type | Required | Notes |
|---|---|---|---|
| `timestamp` | long | no bean validation | Epoch milliseconds. Missing values deserialize to `0`. |
| `image` | string | no bean validation | Stored as snapshot image data. |

`ProctoringSummaryResponse`

| Field | Type |
|---|---|
| `trustScore` | `TrustScoreDto` |
| `events` | `Page<ProctoringEventDto>` |

`TrustScoreDto`

| Field | Type |
|---|---|
| `id` | UUID/null |
| `score` | number |
| `flagsCount` | integer |
| `isMalpractice` | boolean |
| `reviewedBy` | UUID/null |
| `reviewedAt` | datetime/null |
| `updatedAt` | datetime/null |

If a trust score record does not exist yet, the summary returns defaults of `score: 100.0`, `flagsCount: 0`, and `isMalpractice: false`.

`ProctoringEventDto`

| Field | Type |
|---|---|
| `id` | UUID |
| `eventType` | string |
| `severity` | string/null |
| `occurredAt` | datetime |
| `metadata` | object/null |
| `syncedAt` | datetime |

### Session DTOs

`CreateTestSessionRequest`

| Field | Type | Required |
|---|---|---|
| `testId` | UUID | yes |
| `scheduleId` | UUID | yes |
| `candidateId` | UUID | yes |
| `ipAddress` | string | no |

`StartTestSessionRequest`

| Field | Type | Required |
|---|---|---|
| `invitationId` | UUID | yes |
| `ipAddress` | string | no |

`PatchTestSessionRequest`

| Field | Type | Required |
|---|---|---|
| `refreshToken` | string | no |
| `expiresAt` | datetime | no |
| `startedAt` | datetime | no |
| `endedAt` | datetime | no |
| `timerRemainingSecs` | integer | no, min 0 |
| `status` | `TestSessionStatus` | no |
| `fullscreenViolations` | integer | no, min 0 |

`TestSessionResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `testId` | UUID |
| `scheduleId` | UUID |
| `candidateId` | UUID |
| `refreshToken` | string |
| `expiresAt` | datetime |
| `ipAddress` | string |
| `createdAt` | datetime |
| `startedAt` | datetime |
| `endedAt` | datetime |
| `timerRemainingSecs` | integer |
| `status` | `TestSessionStatus` |
| `fullscreenViolations` | integer |

`TestSessionPaperResponse`

| Field | Type |
|---|---|
| `sessionId` | UUID |
| `scheduleId` | UUID |
| `testId` | UUID |
| `candidateId` | UUID |
| `status` | `TestSessionStatus` |
| `startedAt` | datetime |
| `endedAt` | datetime |
| `timerRemainingSecs` | integer |
| `paper` | object |

### Submission DTOs

`SubmissionRequestDTO`

| Field | Type | Required | Notes |
|---|---|---|---|
| `sessionId` | UUID | yes | |
| `questionId` | UUID | yes | Must be attached to session test. |
| `answerText` | string | no | Use for coding/text. Do not use for MCQ. |
| `selectedOptionIds` | UUID array | no | Required for MCQ answers. |

`SubmissionResponseDTO`

| Field | Type |
|---|---|
| `id` | UUID |
| `sessionId` | UUID |
| `questionId` | UUID |
| `answerText` | string |
| `submittedAt` | datetime |
| `questionType` | `QuestionType` |
| `status` | `SubmissionStatus` |

### Test Result DTOs

`CreateTestResultDTO`

| Field | Type | Required by validation |
|---|---|---|
| `sessionId` | UUID | no annotation, but needed |
| `candidateId` | UUID | no annotation, but candidate must match session candidate if provided |

`TestResultResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `testSessionId` | UUID |
| `candidateId` | UUID |
| `totalScore` | number |
| `maxScore` | number |
| `percentage` | number |
| `passed` | boolean |
| `evaluatedAt` | datetime |
| `reportBucketLink` | string |

### Test Case DTOs

`CreateTestCaseRequest`

| Field | Type | Required |
|---|---|---|
| `input` | string | no |
| `expectedOutput` | string | yes |
| `sample` | boolean | no |
| `weight` | number | no, min 0 |
| `codingQuestionId` | UUID | yes |
| `explanation` | string | no |

`PatchTestCaseRequest`

| Field | Type | Required |
|---|---|---|
| `input` | string | no |
| `expectedOutput` | string | no |
| `sample` | boolean | no |
| `weight` | number | no, min 0 |
| `codingQuestionId` | UUID | no |
| `explanation` | string | no |

`TestCaseResponse`

| Field | Type |
|---|---|
| `id` | UUID |
| `input` | string |
| `expectedOutput` | string |
| `sample` | boolean |
| `weight` | number |
| `codingQuestionId` | UUID |
| `explanation` | string |

### Code Execution DTOs

`CodeRunRequest`

| Field | Type | Required |
|---|---|---|
| `sessionId` | UUID | yes |
| `questionId` | UUID | yes |
| `language` | string | yes |
| `sourceCode` | string | yes |
| `input` | string | no |

`PlaygroundRequest`

| Field | Type | Required |
|---|---|---|
| `questionId` | UUID | yes |
| `language` | string | yes |
| `sourceCode` | string | yes |
| `input` | string | no |
| `runAll` | boolean | no |

`CodeRunResponseDTO`

| Field | Type |
|---|---|
| `testCaseId` | UUID |
| `stdout` | string |
| `stderr` | string |
| `compileOutput` | string |
| `status` | string, maps to `CodeRunStatus` |
| `execTimeMs` | long |
| `expectedOutput` | string |

`CodingSubmissionResultDTO`

| Field | Type |
|---|---|
| `submissionId` | UUID |
| `testCasesPassed` | integer |
| `testCasesTotal` | integer |
| `scoreAwarded` | number |
| `maxScore` | number |
| `execTimeMs` | integer |
| `status` | string, maps to `CodingSubmissionStatus` or `FAILED` status text |

## 4. Enums

```text
CheckpointStatus: IN_PROGRESS, COMPLETED, FAILED
CodeRunStatus: ACCEPTED, WRONG_ANSWER, COMPILE_ERROR, RUNTIME_ERROR, TLE, ERROR
CodingSubmissionStatus: ACCEPTED, PARTIAL, WRONG_ANSWER, COMPILE_ERROR, TLE, ERROR
Difficulty: EASY, MEDIUM, HARD
ExecutionStatus: QUEUED, PROCESSING, ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, COMPILATION_ERROR, RUNTIME_ERROR, INTERNAL_ERROR
InvitationStatus: PENDING, ACCEPTED, EXPIRED
Judge0PendingStatus: SUBMITTED, PROCESSING, COMPLETED, FAILED
McqType: SINGLE_CORRECT, MULTIPLE_CORRECT, TRUE_FALSE, IMAGE_SINGLE_CORRECT, IMAGE_MULTIPLE_CORRECT, ASSERTION_REASON, FILL_IN_THE_BLANK
PasswordProvider: LOCAL, GOOGLE
ProctoringEventSeverity: LOW, MEDIUM, HIGH, CRITICAL
ProctoringEventType: TAB_SWITCH, LOOK_AWAY, MULTI_FACE, DEVTOOLS, SCREEN_RECORD, SUSPICIOUS_AUDIO, OBJECT_DETECTED
QuestionType: MCQ, CODING
QuestionVisibility: PUBLIC, ORG_OWNED
Role: ADMIN, SUPERADMIN, CANDIDATE, GUEST, TRAINER
ScheduleStatus: SCHEDULED, LIVE, COMPLETED
SnapshotType: VIOLATION, AUDIT
SubmissionStatus: PENDING, GRADED, PENDING_GRADING, FAILED
TestSessionStatus: ACTIVE, SUBMITTED, FLAGGED, TERMINATED, INACTIVE, EVALUATED
TestStatus: DRAFT, PUBLISHED, ARCHIVED
```

## 5. Request Examples

### Login

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### Create Candidate

```json
{
  "name": "Asha Candidate",
  "email": "asha@example.com",
  "password": "password123",
  "phoneNumber": "+919999999999",
  "organisation_id": "11111111-1111-1111-1111-111111111111",
  "extraFields": {
    "college": "ABC College",
    "course": "BTech",
    "year": "2026",
    "skills": "Java, SQL"
  }
}
```

### Validate Invitation

```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "token": "invitation-token-from-link"
}
```

### Start Candidate Session

```json
{
  "invitationId": "22222222-2222-2222-2222-222222222222",
  "ipAddress": "203.0.113.10"
}
```

### Get Effective Proctoring Config

```http
GET /test-sessions/ffffffff-ffff-ffff-ffff-ffffffffffff/proctoring-config
Authorization: Bearer <candidateAccessToken>
```

Example `data`:

```json
{
  "camera": true,
  "audio": false,
  "tabSwitch": true,
  "devtools": true,
  "screenShare": false,
  "objectDetection": true,
  "llmDetector": false,
  "maxTabSwitches": 2,
  "snapshotIntervalSecs": 60,
  "violationThresholds": {
    "look_away": 3,
    "multi_face": 2
  }
}
```

### Ingest Proctoring Violation

```json
{
  "clientEventId": "12121212-3434-5656-7878-909090909090",
  "type": "LOOK_AWAY",
  "timestamp": 1781517600000,
  "severity": "MEDIUM",
  "evidence": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  "metadata": {
    "durationMs": 3200,
    "tabHiddenCount": 1
  }
}
```

### Ingest Snapshot Batch

```json
{
  "snapshots": [
    {
      "timestamp": 1781517600000,
      "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
    }
  ]
}
```

### Create MCQ Question

```json
{
  "subject_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "topic_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "subtopic_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "questionType": "MCQ",
  "prompt": "Which values are prime?",
  "marks": 2,
  "difficulty": "EASY",
  "visibility": "ORG_OWNED",
  "mcqType": "MULTIPLE_CORRECT",
  "multipleCorrect": true,
  "shuffleOptions": true,
  "mcqOptions": [
    {
      "text": "2",
      "isCorrect": true,
      "displayOrder": 1
    },
    {
      "text": "4",
      "isCorrect": false,
      "displayOrder": 2
    }
  ]
}
```

### Create Coding Question

```json
{
  "subject_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "topic_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "subtopic_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "questionType": "CODING",
  "prompt": "Write a function that adds two integers.",
  "marks": 10,
  "difficulty": "EASY",
  "visibility": "ORG_OWNED",
  "title": "Add Two Numbers",
  "constraints": "Inputs are integers.",
  "memoryLimitMb": 128,
  "timeLimitSecs": 2,
  "sampleExplanation": "Return the sum.",
  "codeTemplate": {
    "java": "class Main { public static void main(String[] args) { } }"
  },
  "examples": [
    {
      "input": "2 3",
      "output": "5"
    }
  ],
  "hints": ["Read from stdin"],
  "tags": ["math", "warmup"]
}
```

### Create Test With Inline Questions

```json
{
  "title": "Java Basics Assessment",
  "description": "MCQ plus coding screening test",
  "durationMins": 60,
  "difficulty": "MEDIUM",
  "instructions": {
    "allowTabSwitch": false,
    "showTimer": true
  },
  "status": "DRAFT",
  "passMark": 40,
  "questions": [
    {
      "questionId": "dddddddd-dddd-dddd-dddd-dddddddddddd",
      "orderIndex": 0,
      "marks": 5
    }
  ]
}
```

### Schedule Test

```json
{
  "testId": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  "startTime": "2026-06-10T09:00:00",
  "endTime": "2026-06-10T11:00:00",
  "maxCandidates": 100,
  "status": "SCHEDULED"
}
```

### Submit MCQ Answer

```json
{
  "sessionId": "ffffffff-ffff-ffff-ffff-ffffffffffff",
  "questionId": "dddddddd-dddd-dddd-dddd-dddddddddddd",
  "selectedOptionIds": [
    "99999999-9999-9999-9999-999999999999"
  ]
}
```

### Run Coding Question

```json
{
  "sessionId": "ffffffff-ffff-ffff-ffff-ffffffffffff",
  "questionId": "88888888-8888-8888-8888-888888888888",
  "language": "java",
  "sourceCode": "class Main { public static void main(String[] args) { System.out.println(5); } }",
  "input": "2 3"
}
```

### Submit Coding Question

```http
POST /api/code/execute/submit
```

```json
{
  "sessionId": "ffffffff-ffff-ffff-ffff-ffffffffffff",
  "questionId": "88888888-8888-8888-8888-888888888888",
  "language": "java",
  "sourceCode": "class Main { public static void main(String[] args) { System.out.println(5); } }"
}
```

Response `data` is the submission ID:

```json
{
  "success": true,
  "status": 200,
  "message": "Request completed successfully",
  "data": "77777777-7777-7777-7777-777777777777"
}
```

Then poll:

```http
GET /api/code/execute/submit/77777777-7777-7777-7777-777777777777/result
```

### Calculate Result

```json
{
  "sessionId": "ffffffff-ffff-ffff-ffff-ffffffffffff",
  "candidateId": "66666666-6666-6666-6666-666666666666"
}
```

If result is not ready:

```json
{
  "success": true,
  "status": 202,
  "message": "Test result not yet available. Grading may still be in progress.",
  "data": null
}
```

## 6. Recommended Frontend Flows

### Admin Setup Flow

1. Login as admin/superadmin.
2. Create taxonomy: subjects, topics, subtopics.
3. Create questions.
4. Create tests and link questions.
5. Create test schedule.
6. Create/import candidates.
7. Create candidate invitations.

### Candidate Test Flow

1. Candidate opens invite link containing invitation id and token.
2. Frontend calls `POST /candidate-invitations/validate`.
3. Store returned candidate `accessToken`.
4. Call `POST /test-sessions/start`.
5. Call `GET /test-sessions/{id}/proctoring-config` if the frontend needs to initialize candidate-side monitoring rules.
6. Call `GET /test-sessions/{id}/paper`.
7. During the active test, send proctoring telemetry through `/test-sessions/{id}/violations`, `/violations/batch`, and `/snapshots/batch` as needed.
8. For MCQ answers call `POST /submissions`.
9. For coding:
   - call `POST /api/code/execute/run` for quick run,
   - call `POST /api/code/execute/submit` for final coding submission,
   - poll `GET /api/code/execute/submit/{submissionId}/result`.
10. Call `POST /test-sessions/{id}/submit`.
11. Poll `GET /test-results/session/{sessionId}` until status is `200`.
12. Optionally open/download `GET /test-results/session/{sessionId}/scorecard`.

### Result Polling Behavior

Treat `202` with `data: null` as "not ready yet":

- `POST /test-results`
- `GET /test-results/session/{sessionId}`
- `GET /api/code/execute/submit/{submissionId}/result`

## 7. Frontend Integration Warnings

- Use `organisation_id`, `subject_id`, `topic_id`, and `subtopic_id` where DTOs use `@JsonProperty` or `@JsonAlias`; responses use camelCase.
- `POST /test-questions/bulk` takes a raw array, not an object wrapper.
- `GET /test-results/session/{sessionId}/scorecard` is not JSON.
- Code execution submit returns `202` but the envelope `status` field may still be `200` because `BaseResponse.success(data)` was used.
- Auth/code rate-limit responses do not follow the `BaseResponse` schema.
- Do not expose `/api/code/execute/callback` in normal frontend UI.
- `CreateCandidateInvitationRequest` has a mismatch: DTO requires `candidateId`, service supports `candidateEmail` fallback. Prefer `candidateId`.
- For MCQ submissions, send `selectedOptionIds`, not `answerText`.
- For question create/update, `questionType` must match the payload subtype.
- `PUT /questions/{id}` behaves like a full update and may clear taxonomy IDs when omitted; use `PATCH` for partial updates.
- Admin/superadmin endpoints are organisation-scoped unless the caller is `SUPERADMIN`.
- Proctoring config is readable through `/test-sessions/{sessionId}/proctoring-config`, but schedule CRUD APIs do not currently expose or mutate the underlying `proctoringProfile` or `proctoringConfigOverride` fields.
- Proctoring violation ingestion deduplicates by `clientEventId` per session and still returns success for duplicates, so the frontend should not assume every success created a new event.

## 8. Controller Verification Checklist

The endpoint catalog above was verified against these active controller classes on 2026-06-15:

| Controller | Base path | Endpoint count |
|---|---|---:|
| `AuthController` | `/auth` | 3 |
| `AdminController` | `/admin` | 1 |
| `AuditLogController` | `/admin/audit-logs` | 1 |
| `UserController` | `/users` | 4 |
| `OrganisationController` | `/organisations` | 4 |
| `CandidateController` | `/candidates` | 8 |
| `CandidateInvitationController` | `/candidate-invitations` | 6 |
| `SubjectController` | `/subjects` | 6 |
| `TopicController` | `/topics` | 7 |
| `SubtopicController` | `/subtopics` | 7 |
| `QuestionController` | `/questions` | 6 |
| `TestController` | `/tests` | 8 |
| `TestQuestionController` | `/test-questions` | 9 |
| `TestScheduleController` | `/test-schedules` | 5 |
| `TestSessionController` | `/test-sessions` | 8 |
| `ProctoringController` | none | 5 |
| `SubmissionController` | `/submissions` | 2 |
| `TestResultController` | `/test-results` | 4 |
| `TestCaseController` | `/test-cases` | 5 |
| `CodeExecutionController` | `/api/code/execute` | 5 |

Total: 104 active controller endpoints.

## 9. Actuator Note

The project includes `spring-boot-starter-actuator` and a custom `judge0` health indicator. No controller-owned actuator route is defined in `src/main/java/com/gryphon/rxone/controller`, and the source scan did not find another application controller package with additional routes. Current `SecurityConfig` permits only `/auth/**`, `POST /candidate-invitations/validate`, and `/api/code/execute/callback`; all other paths require authentication unless actuator security is configured elsewhere in deployment.
