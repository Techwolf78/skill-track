# RxOne — Complete Frontend UI & API Specification Report

**CONFIDENTIAL — INTERNAL USE ONLY**  
**Document Version:** 1.2 · Updated: May 2026  
**Purpose:** Comprehensive field-by-field, button-by-button catalog of the frontend pages mapped strictly to the modernized Spring Boot API, payload validation constraints, and error codes.

---

## 1. High-Level Architectural Integrations

### 1.1 Stateless JWT Authentication
- **Token Management**: Login requests yield an `AuthResponse` containing `accessToken`, `expiresIn`, and user info. The frontend stores this token in `localStorage`.
- **Request Interceptor**: The Axios client (`apiClient`) intercepts all outbound HTTP requests to append the `Authorization: Bearer <token>` header, except for stateless login and registration paths.
- **Session Expiration / 401 Unauthorized**: The Axios response interceptor intercepts `401 Unauthorized` responses, clears local token storage, and triggers redirects or prompt resets.

### 1.2 CSRF Double-Submit Protection
- **Double-Submit Pattern**: When `app.csrf.enabled` is set to `true`, the backend places an `XSRF-TOKEN` cookie (with `httpOnly=false`) in the client browser.
- **Client Configuration**: The frontend Axios client is configured to support the double-submit pattern across state-changing HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`):
  ```typescript
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  ```
- **Exclusion Route Rules**: All public and initial stateless authentication endpoints matching `/auth/**` do not perform CSRF checks.

### 1.3 Asynchronous Code Execution and Grading
- **Immediate Execution ("Run Code")**: Calls `POST /api/code/execute/run` with `sessionId`, `questionId`, `language`, and `sourceCode`. The response returns test case execution details immediately.
- **Asynchronous Solution Submission**: Clicking "Submit Code" fires `POST /api/code/execute/submit`. This returns a `submissionId` representing the queued task.
- **Grading Result Polling**: The UI polls `GET /api/code/execute/submit/{submissionId}/result` every 2 seconds (up to 30 times / 60 seconds max duration) until the response status changes from `PENDING` or `PROCESSING` to a final evaluation status (e.g. `ACCEPTED`, `WRONG_ANSWER`, `COMPILATION_ERROR`).

### 1.4 Session-Backed Snapshot Workflow (Test Security)
- **Security Lockout**: Direct candidate test paper resource fetching is deprecated and disabled. Candidates cannot query questions via `/tests/{testId}`.
- **Session-Backed Retrieval**: Candidates must obtain a session by presenting a validated token, start the session to capture a snapshot of the exam, and fetch the snapshot via `GET /test-sessions/{sessionId}/paper`.

---

## 2. Page-by-Page Specifications & Field Mapping

### 2.1 Candidate Invitation Gateway (`src/pages/test/TestAccess.tsx`)
- **Route**: `/test/access/:token`
- **Description**: Secure landing gateway for candidate validation and proctored environment onboarding.
- **Interactive Elements & Buttons**:
  - **"Accept and Start Diagnostic Check" Button**: Submits invitation validation and launches the system device onboarding check.
- **API Mappings**:
  - `GET /candidate-invitations/validate/{token}`: Called on load. Returns `CandidateInvitationResponse`.
  - `POST /test-sessions/start`: Dispatched once verified, sending `{ invitationId, ipAddress }`. Returns a `TestSessionResponse`.
- **Validations**:
  - Invitee token format (UUID).
  - Status must be `PENDING`. Returns user-friendly error if invitation is `EXPIRED` or `ACCEPTED` already.

### 2.2 Proctored Candidate Test Interface (`src/pages/test/TestInterface.tsx`)
- **Route**: `/test/:testId/session/:sessionId`
- **Description**: Full-screen proctored assessment environment. Enforces security policies and renders exam content.
- **Interactive Elements**:
  - **"Previous / Next Question"**: Navigates questions index.
  - **"Flag Question" Button**: Tags current question as marked for review (stored locally).
  - **"Save MCQ Answer"**: For MCQ questions, selects option and calls backend submissions handler.
  - **"Run Code"**: Runs solution against public sample test cases.
  - **"Submit Code"**: Queues solution for asynchronous grading.
  - **"Submit Test"**: Prompts submit confirmation dialog, then shuts down session.
- **API Mappings**:
  - `GET /test-sessions/{sessionId}`: Verifies session state on load.
  - `GET /test-sessions/{sessionId}/paper`: Fetches question snapshots for rendering.
  - `POST /submissions`: Saves MCQ answers: `{ sessionId, questionId, selectedOptionIds: [optionId] }`.
  - `POST /api/code/execute/run`: Handles temporary compilation runs.
  - `POST /api/code/execute/submit`: Queues coding submissions.
  - `GET /api/code/execute/submit/{submissionId}/result`: Polling endpoint for compiler results.
  - `POST /test-sessions/{sessionId}/submit`: Closes session and transitions state to `SUBMITTED`.
- **Violations & Security Policies**:
  - **DevTools / Keystroke Block**: Intercepts `F12`, `Ctrl+Shift+I/J/C`, `Cmd+Alt+I`. Blocks copy/paste/cut (`Ctrl+C/V/X`). Blocks `PrintScreen` and clears clipboard.
  - **Strict Fullscreen Enforcement**: Exiting fullscreen triggers a warning dialog with a 10-second countdown. Failure to return to fullscreen triggers auto-submit.
  - **3-Strikes Tab Switch**: Window blur / tab switch triggers `TAB_SWITCH` violation. Warns on strike 1 and 2, auto-submits on strike 3.

### 2.3 Candidate Submission Confirmation (`src/pages/test/TestResults.tsx`)
- **Route**: `/test/:testId/results`
- **Description**: Confirmation screen shown after candidate submits test or is auto-submitted.
- **Interactive Elements**:
  - **"Back to Login" Button**: Redirects to the login route.

### 2.4 Administrative Login & Registration (`src/pages/Login.tsx`, `src/pages/Register.tsx`)
- **Routes**: `/login`, `/register`
- **Interactive Elements**:
  - **"Login" Button**: Authenticates Admin/Superadmin/Trainer credentials.
  - **"Verify Code" Button**: Permits candidate entry using invitation tokens.
  - **"Register" Button**: Admin registration.
- **API Mappings**:
  - `POST /auth/login`: `{ email, password }` yields `AuthResponse`.
  - `POST /auth/register`: `{ name, email, password, phoneNumber, organisationId }`.
- **Validation Constraints**:
  - **Email**: Not blank, valid RFC 5322 format pattern.
  - **Password**: Not blank, minimum 8 characters constraint.
  - **Organisation ID**: Valid organization UUID required for registration.

### 2.5 Admin / Superadmin Dashboard (`src/pages/Admin/Dashboard.tsx`)
- **Route**: `/admin/dashboard` or `/superadmin/dashboard`
- **Description**: General analytics panel displaying assessment metrics, live session tracking, and user lists.
- **API Mappings**:
  - `GET /test-sessions`: Fetches all ongoing and completed sessions.
  - `GET /test-schedules`: Retrieves schedules context.
  - `GET /candidates`: Displays candidates directory.

### 2.6 Manage Assessments / Tests (`src/pages/Admin/Tests.tsx`, `src/pages/Admin/TestCreate.tsx`)
- **Routes**: `/admin/tests`, `/admin/tests/create`, `/admin/tests/edit/:id`
- **Interactive Elements**:
  - **"Create Test"**: Submits new assessment metadata form.
  - **"Toggle Active/Inactive"**: Modifies test publishing status.
- **API Mappings**:
  - `GET /tests`: Lists all tests (paginated).
  - `POST /tests`: Creates test: `{ title, description, durationMins, difficulty, passMark }`.
  - `PATCH /tests/{id}`: Patches test fields.
  - `PATCH /tests/{id}/active`: Activates test.
  - `PATCH /tests/{id}/inactive`: Deactivates test.

### 2.7 Organisation Management (`src/pages/SuperAdmin/Organisations.tsx`)
- **Route**: `/superadmin/organisations`
- **Description**: Superadmin-only panel managing tenant isolated organizations.
- **API Mappings**:
  - `GET /organisations`: Lists all organizations.
  - `POST /organisations`: `{ name, logoUrl }`.
  - `PATCH /organisations/{id}`: Updates name or logo.

---

## 3. General API Envelope and Error Mapping

### 3.1 BaseResponse Envelope Structure
All responses returned by the Spring Boot backend conform to the standard `BaseResponse<T>` structure:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "errorCode": null,
  "errors": null
}
```
If an operation fails, `success` is set to `false`, and error details are populated:
```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errorCode": "VALIDATION_ERROR",
  "errors": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

### 3.2 Error Interceptor Parsing Logic
The frontend `apiClient` maps backend error payloads to friendly UI notifications inside its response interceptor:
- **Field Validation Failures (`data.errors`)**: Iterates through the error map and forms a multi-line notification list (e.g. `field: error description`).
- **Standard Backend Exceptions (`data.errorCode`)**: Maps backend error codes (e.g., `CANDIDATE_NOT_FOUND`, `INVITATION_EXPIRED`) to contextual helper messages.
- **Access Control Forbidden (403)**: Shows a warning notification if permission check fails.
- **Token Expired / Invalid (401)**: Wipes local storage credentials and redirects cleanly to the login screen.
