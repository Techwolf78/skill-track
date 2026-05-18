# RxOne API Documentation

This document reflects the current controllers, DTOs, security rules, Jackson configuration, exception/response refactoring, Bean Validation, and Judge0-backed coding flow in the codebase as of 2026-05-18.

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

**Error Handling:**
- Missing or invalid JWT → **401 Unauthorized** with `errorCode: "UNAUTHORIZED"`
- Valid JWT but insufficient role → **403 Forbidden** with `errorCode: "ACCESS_DENIED"`
- Expired JWT → **401 Unauthorized** with `errorCode: "UNAUTHORIZED"`

Example header:

```http
Authorization: Bearer <jwt-token>
```

## Response Conventions

All endpoints return the standardized `BaseResponse<T>` wrapper:

```json
{
  "success": true,
  "status": 200,
  "message": "Request completed successfully",
  "data": {},
  "errorCode": null,
  "errors": null,
  "timestamp": "2026-05-18T10:00:00Z",
  "path": "/api/endpoint"
}
```

### BaseResponse Structure

| Field | Type | Description |
|---|---|---|
| `success` | boolean | `true` for successful responses; `false` for errors |
| `status` | int | HTTP status code (200, 400, 401, 403, 404, 409, 500, etc.) |
| `message` | string | Human-readable message describing the response |
| `data` | T | Response payload (null for errors or no-data responses) |
| `errorCode` | string | Machine-readable error identifier (e.g., `"RESOURCE_NOT_FOUND"`) |
| `errors` | object | Validation field map for 400 errors; otherwise null |
| `timestamp` | string | ISO-8601 timestamp when the response was generated |
| `path` | string | The request URI path |

### Success Response Example

```json
{
  "success": true,
  "status": 200,
  "message": "User retrieved successfully",
  "data": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "errorCode": null,
  "errors": null,
  "timestamp": "2026-05-18T10:15:30Z",
  "path": "/api/users/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

## Error Handling and HTTP Status Codes

The application implements centralized exception handling through `GlobalExceptionHandler` (a Spring `@RestControllerAdvice`). All errors are returned in the `BaseResponse<T>` format with appropriate HTTP status codes.

### Supported HTTP Status Codes

| Status | Code | Description | Error Code |
|---|---|---|---|
| 400 | Bad Request | Invalid request data, validation failures, or malformed input | `BAD_REQUEST`, `VALIDATION_ERROR` |
| 401 | Unauthorized | Missing, invalid, or expired JWT; authentication failed | `UNAUTHORIZED` |
| 403 | Forbidden | Valid authentication but insufficient permissions (role-based access control failure) | `ACCESS_DENIED` |
| 404 | Not Found | Resource does not exist | `RESOURCE_NOT_FOUND` |
| 409 | Conflict | Business logic violation (e.g., duplicate record, state conflict) | `CONFLICT` |
| 500 | Internal Server Error | Unexpected server error, external service failures (e.g., Judge0, database) | `INTERNAL_SERVER_ERROR` |

### Custom Exceptions

The application provides reusable custom exceptions for consistent error handling:

#### ResourceNotFoundException
Thrown when a requested resource (user, question, test, etc.) does not exist.

```java
throw new ResourceNotFoundException("Question with id xxxxxxxx not found");
```

Returns: **404 Not Found** with `errorCode: "RESOURCE_NOT_FOUND"`

#### BadRequestException
Thrown for invalid input, malformed requests, or business rule violations.

```java
throw new BadRequestException("Invalid question type");
```

Returns: **400 Bad Request** with `errorCode: "BAD_REQUEST"`

#### UnauthorizedException
Thrown when authentication is missing or invalid in application logic.

```java
throw new UnauthorizedException("Invalid or expired token");
```

Returns: **401 Unauthorized** with `errorCode: "UNAUTHORIZED"`

#### ConflictException
Thrown for business logic conflicts (e.g., duplicate records, state conflicts).

```java
throw new ConflictException("A user with this email already exists");
```

Returns: **409 Conflict** with `errorCode: "CONFLICT"`

### Error Response Examples

#### 404 Not Found

```json
{
  "success": false,
  "status": 404,
  "message": "Question with id 99999999-9999-9999-9999-999999999999 not found",
  "data": null,
  "errorCode": "RESOURCE_NOT_FOUND",
  "errors": null,
  "timestamp": "2026-05-18T10:20:45Z",
  "path": "/api/questions/99999999-9999-9999-9999-999999999999"
}
```

#### 400 Bad Request (Validation Failure)

```json
{
  "success": false,
  "status": 400,
  "message": "Validation failed",
  "data": null,
  "errorCode": "VALIDATION_ERROR",
  "errors": {
    "email": "must be a valid email address",
    "name": "must not be empty",
    "phoneNumber": "must match pattern"
  },
  "timestamp": "2026-05-18T10:21:00Z",
  "path": "/api/users"
}
```

#### 401 Unauthorized (Missing/Invalid JWT)

```json
{
  "success": false,
  "status": 401,
  "message": "Authentication required",
  "data": null,
  "errorCode": "UNAUTHORIZED",
  "errors": null,
  "timestamp": "2026-05-18T10:22:15Z",
  "path": "/api/users"
}
```

#### 403 Forbidden (Insufficient Permissions)

```json
{
  "success": false,
  "status": 403,
  "message": "Access denied",
  "data": null,
  "errorCode": "ACCESS_DENIED",
  "errors": null,
  "timestamp": "2026-05-18T10:23:00Z",
  "path": "/api/admin/users"
}
```

#### 409 Conflict (Business Logic Violation)

```json
{
  "success": false,
  "status": 409,
  "message": "A user with email test@example.com already exists",
  "data": null,
  "errorCode": "CONFLICT",
  "errors": null,
  "timestamp": "2026-05-18T10:24:30Z",
  "path": "/api/users"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "status": 500,
  "message": "Internal server error",
  "data": null,
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errors": null,
  "timestamp": "2026-05-18T10:25:45Z",
  "path": "/api/code/execute/submit"
}
```

### Spring Security Error Handling

- **Invalid or Missing JWT**: Intercepted by `CustomAuthenticationEntryPoint` → **401 Unauthorized**
- **Role-Based Access Control Failures** (`@PreAuthorize` violations): Intercepted by `CustomAccessDeniedHandler` → **403 Forbidden**
- **JWT Processing Errors** (invalid signature, expired, malformed): Handled by `JwtAuthenticationFilter` → **401 Unauthorized**

### Bean Validation

The application uses **Jakarta Bean Validation** with Hibernate Validator. Add `@NotNull`, `@NotEmpty`, `@Email`, `@Pattern`, etc. to request DTOs:

```java
public class CreateUserRequest {
    @NotNull(message = "name is required")
    private String name;

    @Email(message = "must be a valid email address")
    private String email;

    @Pattern(regexp = "^\\d{10}$", message = "must be 10 digits")
    private String phoneNumber;
}
```

Validation failures return **400 Bad Request** with a field-level `errors` map.

## Build and Dependencies

### Key Dependencies

- **Spring Boot 4.0.6** with Spring Security
- **JWT** (jjwt-api, jjwt-impl, jjwt-jackson) for token-based authentication
- **Jakarta Bean Validation API** with **spring-boot-starter-validation** for declarative input validation
- **PostgreSQL** for data persistence
- **Flyway** for database migrations
- **Apache POI** for file uploads (Excel support)
- **Judge0 CE API** for remote code execution (via RestClient)

The `spring-boot-starter-validation` dependency provides Hibernate Validator, enabling bean validation annotations in request DTOs.

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
| POST | `/submissions` | JWT | Creates submission for a session/question pair. MCQ submissions are auto-graded immediately; coding submissions remain PENDING for async grading. |
| GET | `/submissions/{id}` | JWT | Fetch one submission. |

#### Submission Behavior by Question Type

**MCQ Submissions:**
- `selectedOptionIds` (List of UUID) **REQUIRED** - the list of selected MCQ option IDs
- Auto-graded and immediately marked as `status: "GRADED"`
- Score calculated based on:
  - **Single-Select MCQ**: Correct if exactly one option is selected and matches the correct option
  - **Multiple-Select MCQ**: Correct if all selected options exactly match all correct options
- Score is either full marks (if correct) or 0 (if incorrect)

**Coding Submissions:**
- `answerText` **REQUIRED** - the source code
- Status set to `"PENDING"` for async grading
- Client must poll `/api/code/execute/submit/{submissionId}/result` for results

#### Submission Request DTO

```java
{
  "sessionId": "UUID",           // UUID of the test session
  "questionId": "UUID",           // UUID of the question
  "answerText": "string",         // Required for CODING questions; ignored for MCQ
  "selectedOptionIds": []         // Required for MCQ questions; List<UUID> of selected option IDs
}
```

#### Submission Response DTO

```java
{
  "id": "UUID",                   // Unique submission identifier
  "sessionId": "UUID",            // Associated test session
  "questionId": "UUID",           // Associated question
  "answerText": "string",         // The submitted answer (JSON for MCQ, code for CODING)
  "submittedAt": "LocalDateTime", // ISO-8601 timestamp of submission
  "questionType": "MCQ|CODING",   // Type of question
  "status": "PENDING|GRADED"      // PENDING (coding, awaiting Judge0 grading) or GRADED (MCQ auto-graded)
}
```


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
| POST | `/api/code/execute/run` | JWT | Run code against sample test cases only (requires `sessionId` and `questionId`). Ephemeral run, only writes to `code_execution_runs`. |
| POST | `/api/code/execute/submit` | JWT | Submit code for final grading against ALL test cases (requires `sessionId` and `questionId`). Async process, creates a `Submission` with status `PENDING`. Returns `submissionId`. |
| GET | `/api/code/execute/submit/{submissionId}/result` | JWT | Poll for grading result. Returns `202 Accepted` if still pending, `200 OK` when complete. |
| POST | `/api/code/execute/playground` | JWT | **Playground mode**: Run code with custom input WITHOUT session/question requirements. No persistence. Perfect for practice/testing. |

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
      "isCorrect": false,
      "imageUrl": null,
      "displayOrder": 1
    },
    {
      "text": "4",
      "isCorrect": true,
      "imageUrl": null,
      "displayOrder": 2
    },
    {
      "text": "5",
      "isCorrect": false,
      "imageUrl": null,
      "displayOrder": 3
    }
  ]
}
```

**MCQ Option Fields:**
- `text` (string): The option text/label
- `isCorrect` (boolean): Whether this is a correct answer
- `imageUrl` (string, optional): URL to an image for visual options
- `displayOrder` (integer): Order in which the option is displayed

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
      "isCorrect": false,
      "imageUrl": null,
      "displayOrder": 1
    },
    {
      "text": "5",
      "isCorrect": true,
      "imageUrl": null,
      "displayOrder": 2
    }
  ]
}
```

### 3. MCQ Submission (Auto-Graded)

For multiple-choice questions, send the selected option IDs. The submission is auto-graded immediately.

```http
POST /submissions
```

**Request (Single-Select MCQ):**
```json
{
  "sessionId": "88888888-8888-8888-8888-888888888888",
  "questionId": "44444444-4444-4444-4444-444444444444",
  "selectedOptionIds": [
    "55555555-5555-5555-5555-555555555555"
  ]
}
```

**Request (Multiple-Select MCQ):**
```json
{
  "sessionId": "88888888-8888-8888-8888-888888888888",
  "questionId": "44444444-4444-4444-4444-444444444444",
  "selectedOptionIds": [
    "55555555-5555-5555-5555-555555555555",
    "66666666-6666-6666-6666-666666666666"
  ]
}
```

**Response (Immediately GRADED):**
```json
{
  "success": true,
  "status": 201,
  "message": "Request completed successfully",
  "data": {
    "id": "99999999-9999-9999-9999-999999999999",
    "sessionId": "88888888-8888-8888-8888-888888888888",
    "questionId": "44444444-4444-4444-4444-444444444444",
    "answerText": "[\"55555555-5555-5555-5555-555555555555\"]",
    "submittedAt": "2026-05-18T10:35:00Z",
    "questionType": "MCQ",
    "status": "GRADED"
  },
  "errorCode": null,
  "errors": null,
  "timestamp": "2026-05-18T10:35:00Z",
  "path": "/api/submissions"
}
```

### 3.5. Coding Submission (Async Grading)

For coding questions, send the source code. A `Submission` is created with status `PENDING`, and grading happens asynchronously.

```http
POST /submissions
```

```json
{
  "sessionId": "88888888-8888-8888-8888-888888888888",
  "questionId": "44444444-4444-4444-4444-444444444444",
  "answerText": "public class Main { public static void main(String[] args) throws Exception { java.util.Scanner sc = new java.util.Scanner(System.in); int a = sc.nextInt(); int b = sc.nextInt(); System.out.println(a + b); } }"
}
```

**Response (PENDING - Async Grading):**
```json
{
  "success": true,
  "status": 201,
  "message": "Request completed successfully",
  "data": {
    "id": "99999999-9999-9999-9999-999999999999",
    "sessionId": "88888888-8888-8888-8888-888888888888",
    "questionId": "44444444-4444-4444-4444-444444444444",
    "answerText": "public class Main { ... }",
    "submittedAt": "2026-05-18T10:36:00Z",
    "questionType": "CODING",
    "status": "PENDING"
  },
  "errorCode": null,
  "errors": null,
  "timestamp": "2026-05-18T10:36:00Z",
  "path": "/api/submissions"
}
```

**What happens next:**
1. Backend asynchronously executes the code against ALL test cases for the question
2. Results are aggregated and stored in `coding_submission_result`
3. Submission status updates to `GRADED` upon completion
4. Client polls `/api/code/execute/submit/{submissionId}/result` for the final result

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

### 7. Playground Mode (Practice/Testing)

Run code without session or question requirements. Useful for practice environments.

```http
POST /api/code/execute/playground
```

```json
{
  "language": "java",
  "sourceCode": "public class Main { public static void main(String[] args) { System.out.println(\"Hello, World!\"); } }",
  "input": ""
}
```

Response:

```json
{
  "success": true,
  "data": {
    "stdout": "Hello, World!\n",
    "stderr": null,
    "compileOutput": null,
    "status": "ACCEPTED",
    "execTimeMs": 42
  }
}
```

## Submission Endpoints Clarification

The RxOne API provides two different submission flows for test sessions and code execution:

### Test Session Submission Flow
**Endpoint:** `POST /submissions` (in Route Inventory → Submissions)

Used when candidates are taking a test with a defined session:
- **MCQ Questions**: Auto-graded immediately, returns `status: "GRADED"` with scores calculated
- **Coding Questions**: Marked as `status: "PENDING"`, requires polling `/api/code/execute/submit/{submissionId}/result` for async results
- Links submission to a test session and tracks all answers taken during the test
- Integrates with QuestionScore tracking for overall test performance

### Granular Code Execution Flow
**Endpoints:** `POST /api/code/execute/run` and `POST /api/code/execute/submit` (in Route Inventory → Code Execution)

Used for direct code execution without a test session context:
- `/run`: Quick feedback on sample test cases only, ephemeral (no Submission created)
- `/submit`: Full grading on all test cases, creates a Submission, async results via polling

**When to use each:**
- **During Tests**: Use `/submissions` endpoint with sessionId
- **Playground/Practice**: Use `/api/code/execute/playground` endpoint
- **Direct Grading**: Use `/api/code/execute/submit` endpoint

## Current Limitations and Quirks

- `/run` is ephemeral and only intended for candidates to test their code.
- `/submit` is asynchronous to prevent long-running HTTP connections.
- **MCQ Auto-Grading**: MCQ submissions via `/submissions` endpoint are immediately graded and return `status: "GRADED"`. Scoring is all-or-nothing (full marks if all selected options match correct options, zero if any mismatch).
- **Coding Async Grading**: Coding submissions via `/submissions` endpoint return `status: "PENDING"` and require polling for results. Score is calculated proportionally based on passed test cases.
- **Answer Format**: For MCQ submissions, `answerText` is JSON-serialized as an array of option UUIDs: `["uuid1", "uuid2"]`. For coding submissions, `answerText` contains the source code.
- Status mapping from Judge0 is now more granular:
  - `3` -> `ACCEPTED`
  - `4` -> `WRONG_ANSWER`
  - `5` -> `TLE`
  - `6` -> `COMPILE_ERROR`
  - `7-12` -> `RUNTIME_ERROR`
- Score is calculated proportionally based on the number of passed test cases and the question's `marks`.