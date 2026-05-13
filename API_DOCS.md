# RxOne API Documentation

This document reflects the current controllers, DTOs, security rules, Jackson configuration, and Judge0-backed coding flow in the codebase as of 2026-05-13.

## Base URL

`http://localhost:8080`

## Authentication

- Public routes:
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /candidate-invitations/validate/{token}`
- JWT-required auth route:
  - `PATCH /auth/reset-password`
- Every other route requires `Authorization: Bearer <jwt>`
- Method-level role checks are enforced with `@PreAuthorize(...)`

Example header:

```http
Authorization: Bearer <jwt-token>
```

## Response Conventions

Most routes return `BaseResponse<T>`:

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {},
  "errorCode": null,
  "errors": null,
  "timestamp": "2026-05-11T10:00:00Z"
}
```

All endpoints consistently return `BaseResponse<T>`. No exceptions in the current implementation.

## Serialization Configuration

The application registers a custom `ObjectMapper` bean in [JacksonConfig.java](D:/Gryphon/rxone/src/main/java/com/gryphon/rxone/config/JacksonConfig.java).

- Bean name: default Spring `ObjectMapper`
- Current behavior: `new ObjectMapper()` with no extra modules or custom serializers registered here
- Impact: JSON mapping for MCQ option lists and coding-question JSON fields is handled through the shared mapper injected into services

### Polymorphic Type Handling for Questions

**Important:** When creating or updating questions, the `questionType` field **MUST** be included in the request body. Jackson uses this field to determine which concrete subclass to deserialize:

- `"questionType": "MCQ"` → deserializes to `CreateMcqQuestionRequest` / `UpdateMcqQuestionRequest`
- `"questionType": "CODING"` → deserializes to `CreateCodingQuestionRequest` / `UpdateCodingQuestionRequest`

If `questionType` is missing, deserialization will fail with:
```
HttpMessageNotReadableException: JSON parse error: Could not resolve subtype of [simple type, class com.gryphon.rxone.DTO.Question.CreateQuestionRequest]: missing type id property 'questionType'
```

**Always include `"questionType"` in your request, even when using UPDATE/PATCH operations.**

## Judge0 Integration

The coding execution flow is wired to Judge0 through `Judge0Service`.

- Base URL: `https://judge0-ce.p.rapidapi.com`
- Headers:
  - `X-RapidAPI-Key: ${JUDGE0_API_KEY}`
  - `X-RapidAPI-Host: judge0-ce.p.rapidapi.com`
- Supported language keys:
  - `java` -> `62`
  - `python` -> `71`
  - `cpp` -> `54`
  - `javascript` -> `63`
- Any unknown language currently falls back to Java (`62`)

Execution flow:

1. Client sends `sessionId`, `questionId`, source code, and language to `/api/code/execute/run` for quick feedback (ephemeral, no submission row created).
2. For final grading, client sends the same payload to `/api/code/execute/submit`.
3. Backend creates a `Submission` with status `PENDING` and returns the `submissionId`.
4. Backend starts an asynchronous batch execution against ALL test cases using **Virtual Threads**.
5. Once complete, backend updates the `Submission` status to `GRADED` and saves aggregated results to `coding_submission_result`.
6. Client polls `/api/code/execute/submit/{submissionId}/result` until results are ready.

## Route Inventory

### Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | DTO accepts `role`, but service creates a candidate user |
| POST | `/auth/login` | Public | Returns auth payload |
| PATCH | `/auth/reset-password` | JWT | Local-password users only |

### Admin

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/admin/users?role=ADMIN` | `ADMIN` or `SUPERADMIN` | Creates user in requested role |

### Users

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users` | JWT | `SUPERADMIN` sees all; others are organisation-scoped |
| GET | `/users/{id}` | JWT | Returns one user |
| PATCH | `/users/{id}` | JWT | DTO accepts `name`, `email`, `password`, and `phoneNumber` for patching
| DELETE | `/users/{id}` | `ADMIN` or `SUPERADMIN` | Returns `204 No Content` |

### Organisations

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/organisations` | `ADMIN` or `SUPERADMIN` | Returns all organisations |
| POST | `/organisations` | `ADMIN` or `SUPERADMIN` | Creates organisation |
| GET | `/organisations/{id}` | JWT | Returns one organisation |
| PATCH | `/organisations/{id}` | `ADMIN` or `SUPERADMIN` | Missing fields can be written as `null` |

### Candidates

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/candidates` | `ADMIN` or `SUPERADMIN` | Creates candidate plus linked user |
| GET | `/candidates` | `ADMIN` or `SUPERADMIN` | Returns raw `Candidate` entities |
| POST | `/candidates/bulk-upload` | `ADMIN` or `SUPERADMIN` | `multipart/form-data`, file field name is `file` |
| PATCH | `/candidates/{id}` | `ADMIN` or `SUPERADMIN` | Partial update |
| DELETE | `/candidates/{id}` | `ADMIN` or `SUPERADMIN` | Returns success message |

### Candidate Invitations

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/candidate-invitations` | JWT | Requires `scheduleId` and either `candidateId` or `candidateEmail` |
| GET | `/candidate-invitations` | JWT | List invitations |
| GET | `/candidate-invitations/{id}` | JWT | Fetch one invitation |
| PATCH | `/candidate-invitations/{id}` | JWT | Currently supports status updates |
| DELETE | `/candidate-invitations/{id}` | JWT | Deletes invitation |
| GET | `/candidate-invitations/validate/{token}` | Public | Validates invitation token unless expired |

### Subjects

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/subjects` | `ADMIN` or `SUPERADMIN` | Create subject |
| GET | `/subjects` | JWT | List subjects |
| GET | `/subjects/{id}` | JWT | Fetch one subject |
| PUT | `/subjects/{id}` | JWT | Full update |
| PATCH | `/subjects/{id}` | JWT | Partial update |
| DELETE | `/subjects/{id}` | `ADMIN` or `SUPERADMIN` | Returns `204 No Content` |

### Topics

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/topics` | `ADMIN` or `SUPERADMIN` | Create topic |
| GET | `/topics` | JWT | List topics |
| GET | `/topics/{id}` | JWT | Fetch one topic |
| GET | `/topics/subject/{subjectId}` | JWT | List by subject |
| PUT | `/topics/{id}` | JWT | Full update |
| PATCH | `/topics/{id}` | JWT | Partial update |
| DELETE | `/topics/{id}` | `ADMIN` or `SUPERADMIN` | Returns `204 No Content` |

### Subtopics

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/subtopics` | `ADMIN` or `SUPERADMIN` | Create subtopic |
| GET | `/subtopics` | JWT | List subtopics |
| GET | `/subtopics/{id}` | JWT | Fetch one subtopic |
| GET | `/subtopics/topic/{topicId}` | JWT | List by topic |
| PUT | `/subtopics/{id}` | JWT | Full update |
| PATCH | `/subtopics/{id}` | JWT | Partial update |
| DELETE | `/subtopics/{id}` | `ADMIN` or `SUPERADMIN` | Returns `204 No Content` |

### Questions

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/questions` | `ADMIN` or `SUPERADMIN` | Create MCQ or coding question. **REQUIRED:** `questionType` must be included as `"MCQ"` or `"CODING"` for polymorphic deserialization. Uses polymorphic DTOs based on `questionType`. |
| GET | `/questions` | JWT | Returns polymorphic `QuestionResponse` (MCQ or Coding). Optional filters: `subjectId`, `topicId`, `subtopicId` |
| GET | `/questions/{id}` | JWT | Fetch one question (polymorphic response) |
| PUT | `/questions/{id}` | JWT | Update question. **REQUIRED:** `questionType` must be included. Uses polymorphic `UpdateQuestionRequest`. |
| PATCH | `/questions/{id}` | JWT | Patch question. **REQUIRED:** `questionType` must be included. Uses polymorphic `UpdateQuestionRequest`. |
| DELETE | `/questions/{id}` | `ADMIN` or `SUPERADMIN` | Returns `200 OK` with success message |

### Tests

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/tests` | `ADMIN` or `SUPERADMIN` | Create test |
| GET | `/tests` | JWT | List active tests returned by service |
| GET | `/tests/{id}` | JWT | Fetch one test |
| PUT | `/tests/{id}` | JWT | Full update |
| PATCH | `/tests/{id}` | JWT | Partial update |
| PATCH | `/tests/{id}/inactive` | `ADMIN` or `SUPERADMIN` | Soft-deactivate test |
| GET | `/tests/inactive` | JWT | List inactive tests |
| PATCH | `/tests/{id}/active` | `ADMIN` or `SUPERADMIN` | Reactivate test |

There is currently no `DELETE /tests/{id}` route in the controller.

### Test Questions

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/test-questions` | `ADMIN` or `SUPERADMIN` | Add one question to a test |
| POST | `/test-questions/bulk` | `ADMIN` or `SUPERADMIN` | Accepts `List<CreateTestQuestionRequest>` |
| GET | `/test-questions/{id}` | JWT | Fetch one link |
| GET | `/test-questions` | JWT | Optional filters: `testId`, `questionId` |
| GET | `/test-questions/test/{testId}` | JWT | Detailed question payloads for a test |
| GET | `/test-questions/test/{testId}/grouped` | JWT | Returns detailed question payloads grouped by `sectionName`; `null` sections are returned under `Ungrouped` |
| PUT | `/test-questions/{id}` | JWT | Full update |
| PATCH | `/test-questions/{id}` | JWT | Partial update |
| DELETE | `/test-questions/{id}` | `ADMIN` or `SUPERADMIN` | Returns `204 No Content` |

### Test Schedules

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/test-schedules` | JWT | Creates schedule for a test |
| GET | `/test-schedules` | JWT | List schedules |
| GET | `/test-schedules/{id}` | JWT | Fetch one schedule |
| PATCH | `/test-schedules/{id}` | JWT | Partial update |
| DELETE | `/test-schedules/{id}` | JWT | Deletes schedule |

### Test Sessions

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/test-sessions` | JWT | Creates active session for candidate and schedule |
| GET | `/test-sessions` | JWT | List sessions |
| GET | `/test-sessions/{id}` | JWT | Fetch one session |
| PATCH | `/test-sessions/{id}` | JWT | Update timer, status, refresh token, flags |
| DELETE | `/test-sessions/{id}` | JWT | Deletes session |

### Submissions

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/submissions` | JWT | Creates submission for a session/question pair |
| GET | `/submissions/{id}` | JWT | Fetch one submission. |


### Test Cases

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/test-cases` | JWT | Creates test case for a coding question |
| GET | `/test-cases` | JWT | Lists all test cases |
| GET | `/test-cases/{id}` | JWT | Fetch one test case |
| PATCH | `/test-cases/update/{id}` | JWT | Partial update |
| DELETE | `/test-cases/delete/{id}` | JWT | Returns plain success string |

### Code Execution

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/code/execute/run` | JWT | Run code against sample test cases only. Ephemeral run, only writes to `code_execution_runs`. |
| POST | `/api/code/execute/submit` | JWT | Submit code for final grading. Async process, creates a `Submission` with status `PENDING`. |
| GET | `/api/code/execute/submit/{submissionId}/result` | JWT | Fetch the graded result for a submission. Returns `202` if still pending. |

## Key Request and Response Samples

### 1. Create a Coding Question

Use `questionType: "CODING"`. The request is polymorphic; fields like `codeTemplate` and `examples` are specific to `CODING` type.

```http
POST /questions
```

```json
{
  "subject_id": "11111111-1111-1111-1111-111111111111",
  "topic_id": "22222222-2222-2222-2222-222222222222",
  "subtopic_id": "33333333-3333-3333-3333-333333333333",
  "questionType": "CODING",
  "prompt": "Return the sum of two integers.",
  "marks": 20,
  "title": "Sum Two Numbers",
  "difficulty": "EASY",
  "constraints": "Inputs fit in 32-bit signed integer range.",
  "memoryLimitMb": 256,
  "timeLimitSecs": 2,
  "sampleExplanation": "Read two integers and print their sum.",
  "codeTemplate": {
    "java": "import java.util.*; public class Main { public static void main(String[] args) { Scanner sc = new Scanner(System.in); int a = sc.nextInt(); int b = sc.nextInt(); System.out.println(a + b); } }",
    "python": "a, b = map(int, input().split())\nprint(a + b)"
  },
  "examples": [
    {
      "input": "2 3",
      "output": "5"
    }
  ],
  "hints": [
    "Read both integers from stdin",
    "Print only the sum"
  ],
  "tags": [
    "math",
    "implementation"
  ]
}
```

### 1.5. Create an MCQ Question

Use `questionType: "MCQ"`. The request uses polymorphic deserialization. Fields like `mcqOptions`, `mcqType`, and `multipleCorrect` are specific to `MCQ` type.

```http
POST /questions
```

```json
{
  "subject_id": "11111111-1111-1111-1111-111111111111",
  "topic_id": "22222222-2222-2222-2222-222222222222",
  "subtopic_id": "33333333-3333-3333-3333-333333333333",
  "questionType": "MCQ",
  "prompt": "What is 2+2?",
  "marks": 5,
  "mcqType": "SINGLE_SELECT",
  "multipleCorrect": false,
  "shuffleOptions": true,
  "mcqOptions": [
    {
      "text": "3",
      "isCorrect": false
    },
    {
      "text": "4",
      "isCorrect": true
    },
    {
      "text": "5",
      "isCorrect": false
    }
  ]
}
```

### 2. Add Test Cases for the Coding Question

Sample test case:

```http
POST /test-cases
```

```json
{
  "codingQuestionId": "44444444-4444-4444-4444-444444444444",
  "input": "2 3",
  "expectedOutput": "5",
  "sample": true,
  "weight": 1,
  "explanation": "Basic positive integers"
}
```

### 2.5. Update a Question (with `questionType`)

When updating a question, **you must include the `questionType` field** for polymorphic deserialization to work correctly.

```http
PUT /questions/44444444-4444-4444-4444-444444444444
```

```json
{
  "subject_id": "11111111-1111-1111-1111-111111111111",
  "topic_id": "22222222-2222-2222-2222-222222222222",
  "questionType": "MCQ",
  "prompt": "What is 2+3?",
  "marks": 10,
  "mcqType": "SINGLE_SELECT",
  "multipleCorrect": false,
  "shuffleOptions": false,
  "mcqOptions": [
    {
      "text": "4",
      "isCorrect": false
    },
    {
      "text": "5",
      "isCorrect": true
    }
  ]
}
```

### 4. Run Code (Sample Test Cases Only)

Quick feedback during coding. Runs only `sample=true` test cases. Does NOT create a `Submission` record.

```http
POST /api/code/execute/run
```

```json
{
  "sessionId": "88888888-8888-8888-8888-888888888888",
  "questionId": "44444444-4444-4444-4444-444444444444",
  "language": "java",
  "sourceCode": "public class Main { public static void main(String[] args) throws Exception { java.util.Scanner sc = new java.util.Scanner(System.in); int a = sc.nextInt(); int b = sc.nextInt(); System.out.println(a + b); } }"
}
```

Response (List of results):

```json
{
  "success": true,
  "data": [
    {
      "testCaseId": "11111111-1111-1111-1111-111111111111",
      "stdout": "5\n",
      "stderr": null,
      "compileOutput": null,
      "status": "ACCEPTED",
      "execTimeMs": 42,
      "expectedOutput": "5"
    }
  ]
}
```

### 5. Submit Code (All Test Cases — Async Grading)

Final submission. Runs ALL test cases (sample + hidden). Creates a `Submission` with status `PENDING`.

```http
POST /api/code/execute/submit
```

Response (`202 Accepted`):

```json
{
  "success": true,
  "data": "99999999-9999-9999-9999-999999999999"
}
```

### 6. Get Submission Result

Poll this endpoint using the `submissionId` from the submit response.

```http
GET /api/code/execute/submit/99999999-9999-9999-9999-999999999999/result
```

Response (when complete):

```json
{
  "success": true,
  "data": {
    "submissionId": "99999999-9999-9999-9999-999999999999",
    "testCasesPassed": 10,
    "testCasesTotal": 10,
    "scoreAwarded": 20.0,
    "maxScore": 20.0,
    "execTimeMs": 450,
    "status": "ACCEPTED"
  }
}
```

## Current Limitations and Quirks

- `/run` is ephemeral and only intended for candidates to test their code.
- `/submit` is asynchronous to prevent long-running HTTP connections.
- Status mapping from Judge0 is now more granular:
  - `3` -> `ACCEPTED`
  - `4` -> `WRONG_ANSWER`
  - `5` -> `TLE`
  - `6` -> `COMPILE_ERROR`
  - `7-12` -> `RUNTIME_ERROR`
- Score is calculated proportionally based on the number of passed test cases and the question's `marks`.
