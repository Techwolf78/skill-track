# RxOne API Documentation

This document reflects the current API surface and authorization behavior after the tenant isolation and endpoint authorization changes.

## Base URL

`http://localhost:8080`

## Authentication and Authorization

### Public routes

- `POST /auth/register`
- `POST /auth/login`
- `POST /candidate-invitations/validate`

### JWT-protected routes

Every other route requires `Authorization: Bearer ***

### Role model

- `SUPERADMIN`
  - global access
  - bypasses organisation ownership checks
- `ADMIN`
  - access limited to own organisation resources
  - can also read public assets
- `CANDIDATE`
  - access limited to own invitations, sessions, submissions, and results

### Public taxonomy policy

- `Subjects`, `Topics`, and `Subtopics` are global public taxonomy records
- read access: `ADMIN`, `SUPERADMIN`
- mutate access: `SUPERADMIN` only

### Question visibility model

Questions now have explicit visibility:

- `PUBLIC`
  - visible to `ADMIN` and `SUPERADMIN`
  - usable across organisations
  - only `SUPERADMIN` can create, update, or delete public questions
- `ORG_OWNED`
  - visible only to owning organisation admins and `SUPERADMIN`
  - only owning organisation admins and `SUPERADMIN` can mutate them

For non-superadmin question queries, the backend uses explicit JPQL visibility filters rather than Spring Data method naming.

## Response Envelope

All endpoints return `BaseResponse<T>`.

### Standard response

```json
{
  "success": true,
  "status": 200,
  "message": "Request completed successfully",
  "data": {},
  "errorCode": null,
  "errors": null,
  "timestamp": "2026-05-19T10:00:00Z",
  "path": "/api/example"
}
```

### Paginated response

List endpoints that support pagination return a `Page<T>` object inside the `data` field:

```json
{
  "success": true,
  "status": 200,
  "message": null,
  "data": {
    "content": [
      { ... item 1 ... },
      { ... item 2 ... }
    ],
    "totalElements": 100,
    "totalPages": 5,
    "number": 0,
    "size": 20,
    "sort": { "sorted": false, "unsorted": true, "empty": true },
    "first": true,
    "last": false,
    "empty": false
  },
  "errorCode": null,
  "errors": null,
  "timestamp": "...",
  "path": "/endpoint?page=0&size=20"
}
```

All paginated endpoints accept the following query parameters:

| Parameter | Default | Description |
|---|---|---|
| `page` | `0` | Zero-based page index |
| `size` | `20` | Page size (items per page) |

Any endpoint that returns a list with `?page=` and `?size=` query params uses this pagination envelope.

### Common error codes

- `BAD_REQUEST`
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `ACCESS_DENIED`
- `RESOURCE_NOT_FOUND`
- `CONFLICT`
- `INTERNAL_SERVER_ERROR`

## Error behavior

### 401 Unauthorized

- missing JWT
- invalid JWT
- expired JWT

### 403 Forbidden

- valid JWT but role not allowed
- valid JWT but resource belongs to another organisation or candidate

### 400 Bad Request

- malformed request payload
- binding/relationship validation failure
- invitation/session/test/question mismatch

### 409 Conflict

- duplicate result creation
- state conflicts

## Route Inventory

Paginated endpoints are marked with a ✓ in the Paginated column. All paginated endpoints accept `?page=0&size=20` query parameters.

### Auth

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Registration flow |
| POST | `/auth/login` | Public | Returns JWT auth payload |
| PATCH | `/auth/reset-password` | Authenticated | Requires JWT |

### Admin

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/admin/users` | `ADMIN`, `SUPERADMIN` | Creates a user with requested role constraints |

### Users

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| GET | `/users` | `ADMIN`, `SUPERADMIN` | ✓ | `SUPERADMIN` sees all; `ADMIN` sees own organisation only |
| GET | `/users/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped by organisation unless `SUPERADMIN` |
| PATCH | `/users/{id}` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | | Candidate can patch own user; admin scoped by organisation |
| DELETE | `/users/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped by organisation unless `SUPERADMIN` |

### Organisations

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| GET | `/organisations` | `ADMIN`, `SUPERADMIN` | ✓ | `ADMIN` gets only own organisation; `SUPERADMIN` gets all |
| POST | `/organisations` | `SUPERADMIN` | | Create organisation |
| GET | `/organisations/{id}` | `ADMIN`, `SUPERADMIN` | | `ADMIN` can only read own organisation |
| PATCH | `/organisations/{id}` | `ADMIN`, `SUPERADMIN` | | `ADMIN` can only update own organisation |

### Candidates

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/candidates` | `ADMIN`, `SUPERADMIN` | | Creates candidate plus linked user |
| GET | `/candidates` | `ADMIN`, `SUPERADMIN` | ✓ | `ADMIN` sees own organisation only |
| POST | `/candidates/bulk-upload` | `ADMIN`, `SUPERADMIN` | | Upload file field `file`; rows cannot assign cross-org candidates |
| PATCH | `/candidates/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped by organisation unless `SUPERADMIN` |
| DELETE | `/candidates/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped by organisation unless `SUPERADMIN` |

### Candidate Invitations

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/candidate-invitations` | `ADMIN`, `SUPERADMIN` | | Requires `scheduleId` and either `candidateId` or `candidateEmail`; candidate and schedule must belong to same organisation |
| GET | `/candidate-invitations` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | ✓ | Candidate sees own invitations only; admin scoped by organisation |
| GET | `/candidate-invitations/{id}` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | | Scoped to owner candidate or organisation |
| PATCH | `/candidate-invitations/{id}` | `ADMIN`, `SUPERADMIN` | | Status update path |
| DELETE | `/candidate-invitations/{id}` | `ADMIN`, `SUPERADMIN` | | Delete invitation |
| POST | `/candidate-invitations/validate` | Public | | Validates invitation token; accepts JSON with `id` and `token`, returns `CandidateAuthResponse` |

### Subjects

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/subjects` | `SUPERADMIN` | | Create global subject |
| GET | `/subjects` | `ADMIN`, `SUPERADMIN` | ✓ | Read global taxonomy |
| GET | `/subjects/{id}` | `ADMIN`, `SUPERADMIN` | | Read one subject |
| PUT | `/subjects/{id}` | `SUPERADMIN` | | Full update |
| PATCH | `/subjects/{id}` | `SUPERADMIN` | | Partial update |
| DELETE | `/subjects/{id}` | `SUPERADMIN` | | Delete global subject |

### Topics

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/topics` | `SUPERADMIN` | | Create global topic |
| GET | `/topics` | `ADMIN`, `SUPERADMIN` | ✓ | Read global taxonomy |
| GET | `/topics/{id}` | `ADMIN`, `SUPERADMIN` | | Read one topic |
| GET | `/topics/subject/{subjectId}` | `ADMIN`, `SUPERADMIN` | ✓ | List by subject |
| PUT | `/topics/{id}` | `SUPERADMIN` | | Full update |
| PATCH | `/topics/{id}` | `SUPERADMIN` | | Partial update |
| DELETE | `/topics/{id}` | `SUPERADMIN` | | Delete global topic |

### Subtopics

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/subtopics` | `SUPERADMIN` | | Create global subtopic |
| GET | `/subtopics` | `ADMIN`, `SUPERADMIN` | ✓ | Read global taxonomy |
| GET | `/subtopics/{id}` | `ADMIN`, `SUPERADMIN` | | Read one subtopic |
| GET | `/subtopics/topic/{topicId}` | `ADMIN`, `SUPERADMIN` | ✓ | List by topic |
| PUT | `/subtopics/{id}` | `SUPERADMIN` | | Full update |
| PATCH | `/subtopics/{id}` | `SUPERADMIN` | | Partial update |
| DELETE | `/subtopics/{id}` | `SUPERADMIN` | | Delete global subtopic |

### Questions

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/questions` | `ADMIN`, `SUPERADMIN` | | Create MCQ or coding question; requires `questionType`; supports `visibility` |
| GET | `/questions` | `ADMIN`, `SUPERADMIN` | ✓ | Non-superadmin sees `PUBLIC` + own `ORG_OWNED`; optional `subjectId`, `topicId`, `subtopicId` filters; paginated via `page`, `size` |
| GET | `/questions/{id}` | `ADMIN`, `SUPERADMIN` | | Visibility-scoped |
| PUT | `/questions/{id}` | `ADMIN`, `SUPERADMIN` | | Requires `questionType`; public question mutation is `SUPERADMIN` only |
| PATCH | `/questions/{id}` | `ADMIN`, `SUPERADMIN` | | Requires `questionType`; public question mutation is `SUPERADMIN` only |
| DELETE | `/questions/{id}` | `ADMIN`, `SUPERADMIN` | | Public question deletion is `SUPERADMIN` only |

### Tests

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/tests` | `ADMIN`, `SUPERADMIN` | | Created in caller organisation unless `SUPERADMIN` logic is extended later |
| GET | `/tests` | `ADMIN`, `SUPERADMIN` | ✓ | `ADMIN` sees own organisation only |
| GET | `/tests/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped by organisation unless `SUPERADMIN` |
| PUT | `/tests/{id}` | `ADMIN`, `SUPERADMIN` | | Assigned questions must be public or same-organisation |
| PATCH | `/tests/{id}` | `ADMIN`, `SUPERADMIN` | | Assigned questions must be public or same-organisation |
| PATCH | `/tests/{id}/inactive` | `ADMIN`, `SUPERADMIN` | | Soft deactivate |
| GET | `/tests/inactive` | `ADMIN`, `SUPERADMIN` | | Scoped by organisation unless `SUPERADMIN` |
| PATCH | `/tests/{id}/active` | `ADMIN`, `SUPERADMIN` | | Reactivate |

### Test Questions

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/test-questions` | `ADMIN`, `SUPERADMIN` | | Add one question to a test |
| POST | `/test-questions/bulk` | `ADMIN`, `SUPERADMIN` | | Bulk add |
| GET | `/test-questions/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped to linked test's organisation |
| GET | `/test-questions` | `ADMIN`, `SUPERADMIN` | ✓ | Optional `testId`/`questionId` filters; scoped to caller's organisation |
| GET | `/test-questions/test/{testId}` | `ADMIN`, `SUPERADMIN` | | Scoped to test's organisation |
| GET | `/test-questions/test/{testId}/grouped` | `ADMIN`, `SUPERADMIN` | | Scoped to test's organisation |
| PUT | `/test-questions/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped to linked test's organisation |
| PATCH | `/test-questions/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped to linked test's organisation |
| DELETE | `/test-questions/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped to linked test's organisation |

### Test Schedules

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/test-schedules` | `ADMIN`, `SUPERADMIN` | | Schedule org derived from test org |
| GET | `/test-schedules` | `ADMIN`, `SUPERADMIN` | ✓ | `ADMIN` sees own organisation only |
| GET | `/test-schedules/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped by organisation unless `SUPERADMIN` |
| PATCH | `/test-schedules/{id}` | `ADMIN`, `SUPERADMIN` | | Patched test must stay in same organisation |
| DELETE | `/test-schedules/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped by organisation unless `SUPERADMIN` |

### Test Sessions

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/test-sessions` | `ADMIN`, `SUPERADMIN` | | Compatibility/admin path; requires consistent candidate + schedule + test binding |
| POST | `/test-sessions/start` | `CANDIDATE` | | Candidate start-test flow; accepts invitation reference and derives session fields from invitation |
| GET | `/test-sessions` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | ✓ | Candidate sees own only; admin scoped by organisation |
| GET | `/test-sessions/{id}` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | | Candidate own only; admin scoped by organisation |
| PATCH | `/test-sessions/{id}` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | | Candidate own only; admin scoped by organisation |
| POST | `/test-sessions/{id}/submit` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | | Submit test session |
| DELETE | `/test-sessions/{id}` | `ADMIN`, `SUPERADMIN` | | Candidate cannot delete sessions |

### Submissions

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/submissions` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | Session must be accessible; question must belong to the session test |
| GET | `/submissions/{id}` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | Candidate own only; admin scoped by organisation |

### Test Results

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/test-results` | `ADMIN`, `SUPERADMIN` | Candidate cannot create results |
| GET | `/test-results/{id}` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | Candidate own only; admin scoped by organisation |
| GET | `/test-results/session/{sessionId}` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | Candidate own only; admin scoped by organisation |

### Test Cases

| Method | Path | Access | Paginated | Notes |
|---|---|---|---|---|
| POST | `/test-cases` | `ADMIN`, `SUPERADMIN` | | Scoped to linked coding question's organisation |
| GET | `/test-cases` | `ADMIN`, `SUPERADMIN` | ✓ | Filtered by caller's organisation |
| GET | `/test-cases/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped to linked coding question's organisation |
| PATCH | `/test-cases/update/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped to linked coding question's organisation |
| DELETE | `/test-cases/delete/{id}` | `ADMIN`, `SUPERADMIN` | | Scoped to linked coding question's organisation |

### Code Execution

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/code/execute/run` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | Requires accessible session and question bound to the session test |
| POST | `/api/code/execute/submit` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | Creates coding submission only after session/question validation |
| GET | `/api/code/execute/submit/{submissionId}/result` | `CANDIDATE`, `ADMIN`, `SUPERADMIN` | Candidate own only; admin scoped by organisation |
| POST | `/api/code/execute/playground` | `ADMIN`, `SUPERADMIN` | Playground restricted to admin roles |

## Important Request and Response Changes

### Questions

#### Request: `CreateQuestionRequest` / `UpdateQuestionRequest`
`CreateQuestionRequest` and `UpdateQuestionRequest` now support `visibility`.

Example:
```json
{
  "subject_id": "11111111-1111-1111-1111-111111111111",
  "questionType": "MCQ",
  "prompt": "What is 2+2?",
  "marks": 5,
  "visibility": "ORG_OWNED"
}
```

Rules:
- Omit or send `ORG_OWNED` for organisation-owned questions.
- Only `SUPERADMIN` can send `PUBLIC` (creates global public questions).

#### Response: `QuestionResponse`
The returned question payload now includes the question visibility and its owning organisation:
- `visibility` (String: `"PUBLIC"` or `"ORG_OWNED"`)
- `organisationId` (UUID, null for public questions)

### Candidates Bulk Upload

`POST /candidates/bulk-upload` now returns a structured `BulkUploadResult` in the response envelope's `data` field, rather than a generic status string.

#### Response DTOs:

##### `BulkUploadResult`
```json
{
  "totalRows": 10,
  "successCount": 8,
  "failCount": 2,
  "rows": [
    {
      "rowNumber": 1,
      "email": "candidate1@example.com",
      "status": "SUCCESS",
      "errorMessage": null
    },
    {
      "rowNumber": 2,
      "email": "candidate2@org.com",
      "status": "FAILED",
      "errorMessage": "Candidate belongs to another organisation"
    }
  ]
}
```

- `totalRows` (int): Total rows processed from the uploaded file.
- `successCount` (int): Number of successfully registered/imported candidates.
- `failCount` (int): Number of rows that failed validation or insertion.
- `rows` (Array of `BulkUploadRowResult`): Row-by-row breakdown of the upload operation.

##### `BulkUploadRowResult`
- `rowNumber` (int): 1-indexed row number in the spreadsheet/CSV.
- `email` (String): Candidate email address.
- `status` (String): `"SUCCESS"` or `"FAILED"`.
- `errorMessage` (String): Explanation of the failure, or `null` if successful.

### Submissions

The submission payload is structured via `SubmissionRequestDTO`.

#### Request: `SubmissionRequestDTO`
```json
{
  "sessionId": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  "questionId": "ffffffff-ffff-ffff-ffff-ffffffffffff",
  "answerText": "print('hello')",
  "selectedOptionIds": [
    "00000000-0000-0000-0000-000000000000"
  ]
}
```

- `sessionId` (UUID): Active test session ID.
- `questionId` (UUID): Question ID being answered.
- `answerText` (String): Source code (for coding questions) or text answer.
- `selectedOptionIds` (Array of UUIDs): Selected option IDs (for MCQ questions).

### Candidate session start

Candidate clients should use:

```http
POST /test-sessions/start
```

```json
{
  "invitationId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "ipAddress": "203.0.113.10"
}
```

The backend derives:

- candidate
- schedule
- test
- organisation scope

The candidate must not send raw `candidateId`, `scheduleId`, or `testId` on this path.

### Admin compatibility session create

The existing admin path still exists:

```http
POST /test-sessions
```

```json
{
  "testId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "scheduleId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "candidateId": "dddddddd-dddd-dddd-dddd-dddddddddddd",
  "ipAddress": "203.0.113.10"
}
```

This path is now restricted to `ADMIN` and `SUPERADMIN` and still validates that all linked resources belong together.

## Coding and Submission Behavior

### `/submissions`

- MCQ submissions are auto-graded immediately
- coding submissions stay `PENDING_GRADING` for async grading (submitted to Judge0, then polled asynchronously)
- question must belong to the session test
- candidate users can only submit against their own session

### `/api/code/execute/run`

- quick run against sample test cases
- requires valid session ownership
- question must belong to the session test

### `/api/code/execute/submit`

- creates a coding submission at `PENDING_GRADING` status
- requires valid session ownership
- question must belong to the session test
- result must be polled through `/api/code/execute/submit/{submissionId}/result`

## Pagination

All list endpoints returned paginated responses accept these query parameters:

```
GET /endpoint?page=0&size=20
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | int | 0 | Zero-based page index |
| `size` | int | 20 | Number of items per page |

The response `data` field contains a Spring `Page` object:

| Field | Type | Description |
|---|---|---|
| `content` | array | The items for this page |
| `totalElements` | long | Total number of items across all pages |
| `totalPages` | int | Total number of pages |
| `number` | int | Current page number (zero-based) |
| `size` | int | Current page size |
| `first` | boolean | Whether this is the first page |
| `last` | boolean | Whether this is the last page |

## Current Notes

- The candidate start-test path is the intended frontend flow.
- The admin raw session-create path is retained for compatibility and operational use.
