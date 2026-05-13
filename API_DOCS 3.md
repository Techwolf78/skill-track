# RxOne API Documentation

This document reflects the current controllers, DTOs, security rules, Jackson configuration, and Judge0-backed coding flow in the codebase as of 2026-05-12.

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

1. Client creates a `Submission`
2. Client sends `submissionId`, source code, and language to `/api/code/execute`
3. Backend submits the source to Judge0
4. Backend polls Judge0 until the run finishes
5. Backend compares Judge0 `stdout` against stored `test_cases.expected_output`
6. Backend returns aggregated execution results to the client

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
| POST | `/questions` | `ADMIN` or `SUPERADMIN` | Create MCQ or coding question. Uses polymorphic DTOs based on `questionType`. |
| GET | `/questions` | JWT | Returns polymorphic `QuestionResponse` (MCQ or Coding). Optional filters: `subjectId`, `topicId`, `subtopicId` |
| GET | `/questions/{id}` | JWT | Fetch one question (polymorphic response) |
| PUT | `/questions/{id}` | JWT | Update question. Uses polymorphic `UpdateQuestionRequest`. |
| PATCH | `/questions/{id}` | JWT | Patch question. Uses polymorphic `UpdateQuestionRequest`. |
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

There is currently no `GET /submissions`, `GET /submissions/{id}`, or update route.

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
| POST | `/api/code/execute` | JWT | Runs a submission against Judge0 and stored test cases |

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

Notes:

- `subject_id` is required by DTO validation
- For coding questions, `codeTemplate` is required
- `codingQuestionId` used later for test cases is the same UUID as the created base question ID

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

### 2a. Get Grouped Test Questions for a Test

```http
GET /test-questions/test/55555555-5555-5555-5555-555555555555/grouped
```

Response shape:

```json
{
  "success": true,
  "data": {
    "MCQ": [
      {
        "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "testId": "55555555-5555-5555-5555-555555555555",
        "orderIndex": 0,
        "marks": 5,
        "sectionName": "MCQ",
        "question": {
          "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          "questionType": "MCQ",
          "title": "Basic Java",
          "difficulty": "EASY",
          "prompt": "Which keyword creates an object?",
          "marks": 5,
          "mcqOptions": [
            {
              "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
              "text": "new",
              "isCorrect": true,
              "imageUrl": null,
              "displayOrder": 1
            }
          ]
        }
      }
    ],
    "Coding": [
      {
        "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
        "testId": "55555555-5555-5555-5555-555555555555",
        "orderIndex": 5,
        "marks": 20,
        "sectionName": "Coding",
        "question": {
          "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
          "questionType": "CODING",
          "title": "Sum Two Numbers",
          "difficulty": "EASY",
          "prompt": "Return the sum of two integers.",
          "marks": 20
        }
      }
    ],
    "Ungrouped": []
  }
}
```

Grouping behavior:

- Uses `sectionName` as the map key
- Preserves question order within each section
- Routes entries with `sectionName = null` into `Ungrouped`

Hidden evaluation test case:

```json
{
  "codingQuestionId": "44444444-4444-4444-4444-444444444444",
  "input": "-10 25",
  "expectedOutput": "15",
  "sample": false,
  "weight": 2,
  "explanation": "Mixed sign values"
}
```

### 3. Create a Test Schedule

```http
POST /test-schedules
```

```json
{
  "testId": "55555555-5555-5555-5555-555555555555",
  "startTime": "2026-05-11T10:00:00",
  "endTime": "2026-05-11T12:00:00",
  "maxCandidates": 100
}
```

Note: `status` in the create DTO is ignored by the service on create; new schedules are stored as `SCHEDULED`.

### 4. Create a Test Session

```http
POST /test-sessions
```

```json
{
  "testId": "55555555-5555-5555-5555-555555555555",
  "scheduleId": "66666666-6666-6666-6666-666666666666",
  "candidateId": "77777777-7777-7777-7777-777777777777",
  "ipAddress": "127.0.0.1"
}
```

Response shape:

```json
{
  "success": true,
  "data": {
    "id": "88888888-8888-8888-8888-888888888888",
    "testId": "55555555-5555-5555-5555-555555555555",
    "scheduleId": "66666666-6666-6666-6666-666666666666",
    "candidateId": "77777777-7777-7777-7777-777777777777",
    "status": "ACTIVE",
    "fullscreenViolations": 0
  }
}
```

### 5. Create a Submission

```http
POST /submissions
```

```json
{
  "sessionId": "88888888-8888-8888-8888-888888888888",
  "questionId": "44444444-4444-4444-4444-444444444444",
  "answerText": "public class Main { public static void main(String[] args) throws Exception { java.util.Scanner sc = new java.util.Scanner(System.in); int a = sc.nextInt(); int b = sc.nextInt(); System.out.println(a + b); } }",
  "selectedOptionId": null,
  "final": true
}
```

Submission response:

```json
{
  "success": true,
  "data": {
    "id": "99999999-9999-9999-9999-999999999999",
    "sessionId": "88888888-8888-8888-8888-888888888888",
    "questionId": "44444444-4444-4444-4444-444444444444",
    "answerText": "public class Main { ... }",
    "final": true,
    "submittedAt": "2026-05-11T10:30:00"
  }
}
```

### 6. Execute the Submission Through Judge0

Run only sample cases:

```http
POST /api/code/execute
```

```json
{
  "submissionId": "99999999-9999-9999-9999-999999999999",
  "language": "java",
  "sourceCode": "public class Main { public static void main(String[] args) throws Exception { java.util.Scanner sc = new java.util.Scanner(System.in); int a = sc.nextInt(); int b = sc.nextInt(); System.out.println(a + b); } }",
  "runAllTestCases": false
}
```

Run all stored test cases:

```json
{
  "submissionId": "99999999-9999-9999-9999-999999999999",
  "language": "java",
  "sourceCode": "public class Main { ... }",
  "runAllTestCases": true
}
```

Run custom stdin without using stored cases:

```json
{
  "submissionId": "99999999-9999-9999-9999-999999999999",
  "language": "python",
  "sourceCode": "a, b = map(int, input().split())\nprint(a + b)",
  "input": "10 20",
  "runAllTestCases": false
}
```

Execution response:

```json
{
  "status": "ACCEPTED",
  "stdout": "5\n",
  "stderr": null,
  "execTimeMs": 42,
  "judge0Token": null,
  "compileOutput": null,
  "totalTestCases": 2,
  "passedTestCases": 2,
  "memoryKb": 12340,
  "testCaseResults": [
    {
      "status": "ACCEPTED",
      "stdout": "5\n",
      "actualOutput": "5\n",
      "stderr": null,
      "compileOutput": null,
      "execTimeMs": 42,
      "memoryKb": 12340,
      "passed": true,
      "expectedOutput": "5",
      "input": "2 3"
    }
  ]
}
```

How execution behaves:

- `runAllTestCases=true`: uses every stored test case for the coding question
- `runAllTestCases=false` with `input` present: runs a one-off custom input
- `runAllTestCases=false` with no `input`: runs only stored test cases where `sample=true`
- Status mapping:
  - Judge0 `3` -> `ACCEPTED`
  - `4` -> `WRONG_ANSWER`
  - `5` -> `TIME_LIMIT_EXCEEDED`
  - `6` -> `COMPILATION_ERROR`
  - `7` to `12` -> `RUNTIME_ERROR`
  - `13` -> `INTERNAL_ERROR`

## Current Limitations and Quirks

- You can create a submission and execute it, but there is no retrieval API for submissions yet. There is no `GET /submissions/{id}` route.
- There is no API to fetch historical `CodeExecutionRun` records.
- `CodeExecutionResponseDTO` has `judge0Token` and top-level `compileOutput` fields, but `CodeExecutionService` does not currently populate them.
- Per-test-case `compileOutput` is populated from Judge0 when present.
- `QuestionResponse` has a `codeTemplate` field, but `QuestionMapper` does not currently map `CodingQuestion.codeTemplates` into it.
- `QuestionResponse.codeTemplate` is populated for coding questions from `CodingQuestion.codeTemplates`.
- `QuestionResponse.title` and `difficulty` are only present for coding questions.
- `POST`, `PUT`, and `PATCH /questions` all use `questionType` for polymorphism.
- `DELETE /questions/{id}` returns `200 OK` with a success message, not `204`.
- CandidateInvitationController does not have explicit `@PreAuthorize` decorators; JWT authentication is enforced globally via SecurityConfig for all routes except `/auth/**` and `GET /candidate-invitations/validate/{token}`.
