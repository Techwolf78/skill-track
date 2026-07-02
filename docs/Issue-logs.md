# RxOne Frontend Client (Skill-Track) Issue Log & Remediation Tracker

> Architecture Remediation · Technical Debt · Production Hardening · Sprint Planning

---

## Project Overview

| Field              | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Project            | Skill-Track — Frontend Client-Side Portal                    |
| Stack              | React 18 · TypeScript · Vite · TailwindCSS · Zustand · React Query · TFJS |
| Architecture Style | Component-Based Single Page Application (SPA)                |
| Current Status     | Active Development (Audit Reconciled)                        |
| Review Type        | Production Readiness Audit Review                            |
| Document Purpose   | Production Readiness Reconciled Engineering Tracker          |

---

# Severity Summary (Reconciled)

| Severity | Count |
| -------- | ----- |
| Critical | 7     |
| High     | 9     |
| Medium   | 11    |
| Low      | 4     |
| Total    | 31    |

---

# Production Readiness Verdict

## CAUTION / NOT READY FOR PRODUCTION
Blocking issues regarding registration route deadlocks, mobile browser restrictions, candidate results query failures, and offline synchronization need validation before the first production deployment.

---

# Status Definitions

| Status      | Meaning                    |
| ----------- | -------------------------- |
| OPEN        | Identified but not started |
| IN_PROGRESS | Active work underway       |
| BLOCKED     | Waiting on dependency      |
| DONE        | Fully remediated           |
| CLOSED      | Verified and resolved      |
| DEFERRED    | Intentionally postponed    |
| WONT_FIX    | Accepted risk              |

---

# Severity Definitions

| Severity | Meaning                                                   |
| -------- | --------------------------------------------------------- |
| CRITICAL | Security breach / data integrity / production outage risk |
| HIGH     | Significant reliability or scalability issue              |
| MEDIUM   | Technical debt or maintainability issue                   |
| LOW      | Minor cleanup or optimization                             |

---

# Issue Index

| ID | Issue Title | Category | Severity | Assigned To | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| ST-001 | Login Page Infinite Redirect Loop | Authentication | CRITICAL | — | 4h | CLOSED |
| ST-002 | Case-Sensitive Imports Crashing Builds on Vercel | Deployment | HIGH | — | 3h | CLOSED |
| ST-003 | Hardcoded Backend Base URLs in Axios Instance | Configuration | HIGH | — | 4h | CLOSED |
| ST-004 | Heavy In-Bundle TensorFlow / Xenova ML Weights | Performance | CRITICAL | — | 12h | OPEN |
| ST-005 | Periodic Webcam Snapshots Not Syncing to Backend | Proctored Exam | HIGH | — | 8h | CLOSED |
| ST-006 | Lack of Mobile and Tablet Device Blocking | UX / Diagnostics | HIGH | — | 6h | OPEN |
| ST-007 | Missing Rate Limit (429) UI Interceptor & Overlay | Security / UX | MEDIUM | — | 4h | CLOSED |
| ST-008 | CPU Spikes from Un-Throttled Local AI Detection | Performance | HIGH | — | 10h | CLOSED |
| ST-009 | Proctoring Level Wrongly Defaulting to HIGH | Proctored Exam | HIGH | — | 4h | CLOSED |
| ST-010 | Failed Scorecard Downloads from Random Blob Names | Business Logic | LOW | — | 2h | CLOSED |
| ST-011 | Temporal Dead Zone in Dashboard Data Init | Code Quality | MEDIUM | — | 3h | CLOSED |
| ST-012 | Sync of Database-Backed Logs Deprecation | Observability | MEDIUM | — | 5h | CLOSED |
| ST-013 | Missing Offline Queue for Proctoring Violations | Resilience | CRITICAL | — | 10h | CLOSED |
| ST-014 | Lack of Client-Side Pagination on Question Bank | Performance | MEDIUM | — | 8h | CLOSED |
| ST-015 | Uncaught Query Failures Crashing Dashboard UI | Reliability | HIGH | — | 6h | CLOSED |
| ST-016 | Hardcoded Role Definitions throughout Component Tree | Architecture | MEDIUM | — | 8h | OPEN |
| ST-017 | Missing Request Correlation IDs in Header Interceptor | Observability | LOW | — | 3h | OPEN |
| ST-018 | Lack of Input Sanitization on CSV/Excel Bulk Parsers | Security | CRITICAL | — | 8h | OPEN |
| ST-019 | Non-Debounced MCQ Auto-Save Request Flooding | Performance | HIGH | — | 5h | CLOSED |
| ST-020 | Absence of Real-Time Connection Loss Alert | UX / Resilience | MEDIUM | — | 6h | OPEN |
| ST-021 | Missing Unit Tests for Cryptographic State Storage | Testing | MEDIUM | — | 12h | CLOSED |
| ST-022 | Security Logout API Sync | Authentication | MEDIUM | — | 4h | CLOSED |
| ST-023 | Inefficient Tailwind Class Nesting causing CSS bloat | Performance | LOW | — | 4h | OPEN |
| ST-024 | Expired Test Invitation Token Exposes Session | Security | CRITICAL | — | 6h | OPEN |
| ST-025 | Missing Error Boundary Layout for Code Execution | Reliability | MEDIUM | — | 5h | CLOSED |
| ST-026 | Public Registration Endpoint Deleted on Backend | Authentication | CRITICAL | — | 8h | OPEN |
| ST-027 | Organisation Query & Creation Deadlock | Security | CRITICAL | — | 6h | OPEN |
| ST-028 | Candidate Results Page Triggers 403 on Global Test Query | Authorization | HIGH | — | 5h | OPEN |
| ST-029 | Ignored Answers Dictionary Payload on Session Submit | Data Integrity | MEDIUM | — | 4h | OPEN |
| ST-030 | Proctoring Violation Schema Code Redundancy | Code Quality | MEDIUM | — | 3h | OPEN |
| ST-031 | Missing Client-Side Correlation ID Generator | Observability | LOW | — | 2h | OPEN |

---

# Reconciled Detailed Cards

### ST-001 — Login Page Infinite Redirect Loop

Ticket ID:        ST-001
Title:            Login Page Infinite Redirect Loop
Category:         Authentication
Severity:         CRITICAL
Effort Est.:      4h
Area:             Authentication / Router
Component:        apiClient / Login.tsx
Sprint / Phase:   Pre-Sprint / Immediate

Description:
Axios response interceptor captures 401 Unauthorized errors and redirects users to `/login`. However, if the login request itself fails with a 401, or if the user is already on the `/login` route, the interceptor re-triggered the redirect loop, freezing the browser.

Recommended Fix:
Exclude the `/login` route and the `/auth/login` endpoint from triggering redirect logic in the response interceptor.

Status:           CLOSED
Resolution Notes: Added conditions `!isLoginPage` and `!isLoginRequest` inside the `apiClient.ts` interceptor before setting `window.location.href`.

---

### ST-002 — Case-Sensitive Imports Crashing Builds on Vercel

Ticket ID:        ST-002
Title:            Case-Sensitive Imports Crashing Builds on Vercel
Category:         Deployment
Severity:         HIGH
Effort Est.:      3h
Area:             Build / CI
Component:        App.tsx
Sprint / Phase:   Sprint 1

Description:
Import paths for proctored pages and test folders contained casing mismatches (e.g., importing `pages/test/...` as `pages/Test/...`). Local development succeeded on case-insensitive file systems (Windows/macOS), but production deployments on case-sensitive Linux builders failed.

Recommended Fix:
Enforce lowercase conventions on routes and matching import directories.

Status:           CLOSED
Resolution Notes: Standardized all imports to lowercase folders in `App.tsx` and resolved case-sensitive Vercel build compilation errors.

---

### ST-003 — Hardcoded Backend Base URLs in Axios Instance

Ticket ID:        ST-003
Title:            Hardcoded Backend Base URLs in Axios Instance
Category:         Configuration
Severity:         HIGH
Effort Est.:      4h
Area:             Deployment / Ops
Component:        apiClient
Sprint / Phase:   Pre-Sprint

Description:
Backend API URL was hardcoded to `/api` or localhost, restricting the build's ability to interface with staging, production, or multi-tenant VPS environments.

Recommended Fix:
Define `VITE_API_BASE_URL` using environment variables via Vite's `import.meta.env` system.

Status:           CLOSED
Resolution Notes: Configured `const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";` in `src/lib/api-client.ts`.

---

### ST-004 — Heavy In-Bundle TensorFlow / Xenova ML Weights

Ticket ID:        ST-004
Title:            Heavy In-Bundle TensorFlow / Xenova ML Weights
Category:         Performance
Severity:         CRITICAL
Effort Est.:      12h
Area:             UX / Network
Component:        objectDetector / llmDetector
Sprint / Phase:   Sprint 2

Description:
Including heavy machine learning weights locally inside the app assets results in slow initial page loads, high data egress bills, and potential client-side browser crashes during network contention.

Recommended Fix:
Delegate model weight downloads to high-speed public CDNs and load models asynchronously only when the test diagnostic onboarding check begins.

Status:           OPEN
Tags:             #performance #ai #cdn

---

### ST-005 — Periodic Webcam Snapshots Not Syncing to Backend

Ticket ID:        ST-005
Title:            Periodic Webcam Snapshots Not Syncing to Backend
Category:         Proctored Exam
Severity:         HIGH
Effort Est.:      8h
Area:             Proctoring / Data Sync
Component:        proctoringService / ProctoringProvider
Sprint / Phase:   Sprint 1

Description:
Periodic 60-second webcam snapshots captured during proctoring were saved locally in the browser's `localStorage` but never pushed to the remote server, risking audit trail loss if the user cleared storage or closed the tab.

Recommended Fix:
Develop `submitBatchSnapshots` inside `proctoringService` and run a background worker to push accumulated snapshots periodically.

Status:           CLOSED
Resolution Notes: Implemented `submitBatchSnapshots` endpoint integrations and synced camera frames as structured payloads to `/test-sessions/{sessionId}/snapshots/batch`.

---

### ST-006 — Lack of Mobile and Tablet Device Blocking

Ticket ID:        ST-006
Title:            Lack of Mobile and Tablet Device Blocking
Category:         UX / Diagnostics
Severity:         HIGH
Effort Est.:      6h
Area:             Device Compatibility
Component:        TestAccess / EnvironmentCheck
Sprint / Phase:   Sprint 2

Description:
Mobile and tablet browsers do not support desktop proctoring features like `getDisplayMedia` (screen sharing) and tab/devtools interceptors, leading to infinite loading states or silent crashes.

Recommended Fix:
Integrate a user-agent device parser inside `TestAccess` and display a hard blocking layout instructing candidates to switch to a desktop or laptop device.

Status:           OPEN
Tags:             #compatibility #ux #proctoring

---

### ST-007 — Missing Rate Limit (429) UI Interceptor & Overlay

Ticket ID:        ST-007
Title:            Missing Rate Limit (429) UI Interceptor & Overlay
Category:         Security / UX
Severity:         MEDIUM
Effort Est.:      4h
Area:             UX / Error Handling
Component:        apiClient / Toaster
Sprint / Phase:   Sprint 1

Description:
If a candidate or administrator triggers API rate limiting, requests failed silently or threw generic network errors. There was no user-facing lock to prevent button mashing spamming.

Recommended Fix:
Intercept `429 Too Many Requests` in the Axios response layer, parse `Retry-After` headers, and render a persistent, counting-down toast to block submission actions during cooldowns.

Status:           CLOSED
Resolution Notes: Added a 429 handler in `apiClient.ts` that triggers an updating Sonner countdown toast and blocks user interaction.

---

### ST-008 — CPU Spikes from Un-Throttled Local AI Detection

Ticket ID:        ST-008
Title:            CPU Spikes from Un-Throttled Local AI Detection
Category:         Performance
Severity:         HIGH
Effort Est.:      10h
Area:             Proctoring / Clientside Performance
Component:        objectDetector / CameraPreview
Sprint / Phase:   Sprint 1

Description:
TensorFlow object detection executing on high-resolution camera feeds without frame rate constraints induced thermal throttling and browser freezes on low-spec client computers.

Recommended Fix:
Throttle detection loops (e.g., object detection to every 5s, face checks to 1.5s), downscale the canvas feed, and convert to grayscale to reduce compute cycles.

Status:           CLOSED
Resolution Notes: Optimized the proctoring engine with adaptive throttling, reducing heavy model execution lag.

---

### ST-009 — Proctoring Level Wrongly Defaulting to HIGH

Ticket ID:        ST-009
Title:            Proctoring Level Wrongly Defaulting to HIGH
Category:         Proctored Exam
Severity:         HIGH
Effort Est.:      4h
Area:             Logic / Configuration
Component:        TestAccess / sessionLogic
Sprint / Phase:   Sprint 1

Description:
Assessments configured with no proctoring (level `NONE`) wrongly inherited `HIGH` level controls during onboarding, forcing candidates to go through webcam diagnostics and screen shares.

Recommended Fix:
Read and respect the proctoring level value returned in the `test-sessions` metadata.

Status:           CLOSED
Resolution Notes: Fixed the onboarding wizard state variables to dynamically adjust steps based on the actual session proctoring level.

---

### ST-013 — Missing Offline Queue for Proctoring Violations

Ticket ID:        ST-013
Title:            Missing Offline Queue for Proctoring Violations
Category:         Resilience
Severity:         CRITICAL
Effort Est.:      10h
Area:             Data Integrity / Network
Component:        violationStorage / ProctoringProvider
Sprint / Phase:   Sprint 1

Description:
If a candidate's internet disconnected temporarily, proctoring violations (tab switches, camera outages) were dropped instead of queued, creating data gaps for remote examiners.

Recommended Fix:
Store violations locally in `localStorage` when offline. Listen to the `online` window event and flush cached violations to the server on reconnect.

Status:           CLOSED
Resolution Notes: Engineered `violationStorage.ts` to capture offline events, saving them locally and flushing them automatically once network connectivity is restored.

---

### ST-014 — Lack of Client-Side Pagination on Question Bank

Ticket ID:        ST-014
Title:            Lack of Client-Side Pagination on Question Bank
Category:         Performance
Severity:         MEDIUM
Effort Est.:      8h
Area:             UI / Performance
Component:        QuestionBank / SubjectBulkUpload
Sprint / Phase:   Sprint 1

Description:
Loading large banks of MCQ and coding questions without pagination caused extreme layout rendering lag and high DOM node overhead in Admin dashboards.

Recommended Fix:
Introduce native pagination controls (Prev, Next, Page Numbers) with configurable page sizes.

Status:           CLOSED
Resolution Notes: Refactored Admin and Superadmin QuestionBank views with server-supported and client-rendered table pagination.

---

### ST-026 — Public Registration Endpoint Deleted on Backend

Ticket ID:        ST-026
Title:            Public Registration Endpoint Deleted on Backend
Category:         Authentication
Severity:         CRITICAL
Effort Est.:      8h
Area:             Authentication / Security
Component:        Register.tsx / authService.ts
Sprint / Phase:   Sprint 2

Description:
The frontend `Register.tsx` page submits admin registration requests to `/auth/register`. However, the backend removed the public register endpoint entirely in the Security Configuration to close tenant security gaps. Users attempting to register on the frontend will receive `404 Not Found` or `405 Method Not Allowed`.

Recommended Fix:
Disable the public admin registration form, or transition the registration flow to use secure admin-invite links or token-signed registrations.

Status:           OPEN
Tags:             #security #authentication

---

### ST-027 — Organisation Query & Creation Deadlock

Ticket ID:        ST-027
Title:            Organisation Query & Creation Deadlock
Category:         Security
Severity:         CRITICAL
Effort Est.:      6h
Area:             Authentication / Access Control
Component:        Register.tsx / organisationService.ts
Sprint / Phase:   Sprint 2

Description:
During public registration, the frontend attempts to query `/organisations` to display the selector list and allow creation of a new organisation. However, the backend secures these endpoints under `@PreAuthorize("@sec.isAdminOrSuperAdmin()")` (for GET) and `@PreAuthorize("@sec.isSuperAdmin()")` (for POST). Consequently, unauthenticated users are locked out from fetching or creating organisations, resulting in a registration deadlock.

Recommended Fix:
Either allow unauthenticated creation of organisations during signed bootstraps, or remove organisation creation and listing from the public registration flow, relying on pre-provisioned administrator accounts.

Status:           OPEN
Tags:             #security #multi-tenancy #deadlock

---

### ST-028 — Candidate Dashboard Test Query 403

Ticket ID:        ST-028
Title:            Candidate Dashboard Test Query 403
Category:         Authorization
Severity:         HIGH
Effort Est.:      5h
Area:             Candidate Portal
Component:        ResultsReports.tsx / testService.ts
Sprint / Phase:   Sprint 2

Description:
The candidate's `ResultsReports.tsx` page fetches the global list of all tests (`testService.getAllTests()`) to map details such as test titles. However, the backend restricts the `GET /tests` endpoint to admins (`@PreAuthorize("@sec.isAdminOrSuperAdmin()")`). This returns a `403 Forbidden` error, blocking the candidate dashboard from displaying test history.

Recommended Fix:
Modify the candidate dashboard to retrieve test details individually using `/tests/{id}` (which permits candidates with valid session associations), or use a dedicated candidate-level history API endpoint.

Status:           OPEN
Tags:             #authorization #api #candidate-portal

---

### ST-029 — Ignored Answers Dictionary Payload on Session Submit

Ticket ID:        ST-029
Title:            Ignored Answers Dictionary Payload on Session Submit
Category:         Data Integrity
Severity:         MEDIUM
Effort Est.:      4h
Area:             Exam Submission
Component:        TestInterface.tsx / testService.ts
Sprint / Phase:   Sprint 2

Description:
Upon test completion, the frontend `submitSession` method sends a request body containing the `answers` dictionary to `POST /test-sessions/{id}/submit`. However, the backend `submitTest` endpoint ignores this body payload entirely and only triggers session status closure. Unsaved answers that were not already flushed individually to `/submissions` during the test will be lost.

Recommended Fix:
Remove the redundant `answers` payload from the submit API call on the frontend. Ensure the frontend blocks submission until the local offline answer queue has been fully flushed to `POST /submissions`.

Status:           OPEN
Tags:             #data-integrity #submissions

---

### ST-030 — Proctoring Violation Schema Code Redundancy

Ticket ID:        ST-030
Title:            Proctoring Violation Schema Code Redundancy
Category:         Code Quality
Severity:         MEDIUM
Effort Est.:      3h
Area:             Proctoring Engine
Component:        violationQueue.ts / violationStorage.ts
Sprint / Phase:   Sprint 2

Description:
The codebase maintains two conflicting proctoring violation mapping files. `src/lib/proctoring/violationQueue.ts` implements a minimal schema (`type` and `timestamp`) which misses crucial properties required by the backend `ViolationRequest` DTO. In contrast, `src/proctoring/storage/violationStorage.ts` maps the complete payload structure including `clientEventId`, `severity`, and `evidence`.

Recommended Fix:
Deprecate and delete `violationQueue.ts` to prevent code drift and ensure all parts of the application use the consolidated `ViolationStore` and `violationStorage.ts` for synchronizing proctoring data.

Status:           OPEN
Tags:             #code-quality #proctoring #refactoring

---

### ST-031 — Missing Client-Side Correlation ID Generator

Ticket ID:        ST-031
Title:            Missing Client-Side Correlation ID Generator
Category:         Observability
Severity:         LOW
Effort Est.:      2h
Area:             Observability
Component:        apiClient.ts
Sprint / Phase:   Sprint 3

Description:
While the backend is equipped to process, track, and log transaction traces using the `X-Correlation-ID` header, the frontend Axios configuration does not automatically generate or append a client-side correlation UUID. This leaves error tracking disconnected between candidate interactions and server logs.

Recommended Fix:
Update the Axios request interceptor inside `apiClient.ts` to generate a unique correlation ID per session or request, appending it as a request header. Include the correlation ID in user-facing error dialogs to aid support teams in log matching.

Status:           OPEN
Tags:             #observability #tracing
