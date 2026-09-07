# API Endpoint Audit & Architecture Remediation TODO

> **Audit Context**: Tracing data mismatches, pagination cutoffs (Spring Boot default `size=20`), client-side in-memory filtering anti-patterns, and N+1 query loops across the Skill-Track platform.

---

> [!CAUTION]
> **Data Truncation Risk**: Spring Boot controllers using `Pageable pageable` default to returning only 20 records (`size=20`) if no size parameter is explicitly provided. Any frontend component calling these endpoints without pagination parameters and doing `.filter()` or `.find()` in memory will silently drop records #21 and beyond.

> [!WARNING]
> **Candidate Data Isolation Risk**: Candidate dashboard pages (`Dashboard.tsx`, `MyAssessments.tsx`, `ResultsReports.tsx`) currently call `testService.getAllSessions()` (retrieves all test sessions from all candidates across the system) and `testService.getAllTests()` (triggers `403 Forbidden` for non-admin tokens).

---

## 📋 Remediation Checklist (TODO)

### Phase 1: Critical Test Edit & Test Card Counts (Immediate)
- [ ] **DT1 Test Schedule Cutoff Fix**: Update [test-service.ts](file:///d:/Gryphon/skill-track/src/lib/test-service.ts#L1204-L1207) (`getAllTestSchedules`) to pass `?size=1000` so schedules #21+ are not truncated.
- [ ] **Test Card Candidate Count Fix**: Update [NewAdminTests.tsx](file:///d:/Gryphon/skill-track/src/pages/New-Admin/NewAdminTests.tsx#L69-L85) and [Tests.tsx](file:///d:/Gryphon/skill-track/src/pages/Admin/Tests.tsx#L85-L95) to pass `?size=1000` to `GET /candidate-invitations`.
- [ ] **Recent Tests Schedule Table**: Update [RecentTestsTable.tsx](file:///d:/Gryphon/skill-track/src/components/dashboard/RecentTestsTable.tsx#L56) to request `GET /candidate-invitations?size=1000`.
- [ ] **Test Edit Active Schedule Selection**: In [NewAdminTestEdit.tsx](file:///d:/Gryphon/skill-track/src/pages/New-Admin/NewAdminTestEdit.tsx#L407-L426), sort schedules by recency (`startTime` / `createdAt` desc) so the active Sept 5–6 schedule is selected rather than the oldest Sept 4 schedule.
- [ ] **Multi-Schedule Invitation Aggregation**: Ensure [NewAdminTestEdit.tsx](file:///d:/Gryphon/skill-track/src/pages/New-Admin/NewAdminTestEdit.tsx#L500-L530) aggregates candidate invitations across all schedules belonging to the test using [getInvitationsBySchedule](file:///d:/Gryphon/skill-track/src/lib/candidate-service.ts#L322-L359).
- [ ] **Candidate Status & Session Mapping**: In [NewAdminTestEdit.tsx](file:///d:/Gryphon/skill-track/src/pages/New-Admin/NewAdminTestEdit.tsx#L987-L998) & row rendering, check session status (`SUBMITTED`, `EVALUATED`, `IN_PROGRESS`) from `scoreEntry?.session?.status` so submitted candidates are not hidden under filter states.

---

### Phase 2: SuperAdmin & Single Schedule Views
- [ ] **SuperAdmin Single Schedule Details**: In [TestScheduleDetails.tsx](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/TestScheduleDetails.tsx#L58-L74), replace global `GET /candidate-invitations` and global `getCandidates()` with `candidateService.getInvitationsBySchedule(id)`.
- [ ] **SuperAdmin Schedule List Badges**: In [TestSchedules.tsx](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/TestSchedules.tsx#L116), update `GET /candidate-invitations` to `?size=1000` to prevent schedule candidate counts from truncating at 20.
- [ ] **Admin TestsEdit Schedule Lookup**: In [TestsEdit.tsx](file:///d:/Gryphon/skill-track/src/pages/Admin/TestsEdit.tsx#L1338-L1370), ensure schedule fetching uses `?size=1000` and sorts by active window.
- [ ] **Eliminate Loop Flooding in Invite Histories**:
  - In [InvitedCandidatesHistory.tsx](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/InvitedCandidatesHistory.tsx#L75-L84): Remove the `schedules.map(async s => getTestById(s.testId))` N+1 request loop.
  - In [InviteCandidates.tsx](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/InviteCandidates.tsx#L120-L128): Batch or resolve tests via schedule associations.

---

### Phase 3: Candidate Portal Security & Isolation
- [ ] **Remove Global Session Scans**:
  - In [Dashboard.tsx](file:///d:/Gryphon/skill-track/src/pages/Candidate/Dashboard.tsx#L63-L75): Stop calling `getAllSessions()` and `getAllTests()`. Replace with candidate-scoped queries.
  - In [MyAssessments.tsx](file:///d:/Gryphon/skill-track/src/pages/Candidate/MyAssessments.tsx#L56-L67): Remove `getAllSessions()` and `getAllTests()`.
  - In [ResultsReports.tsx](file:///d:/Gryphon/skill-track/src/pages/Candidate/ResultsReports.tsx#L59-L70): Remove `getAllSessions()` and `getAllTests()`.
  - In [Certificates.tsx](file:///d:/Gryphon/skill-track/src/pages/Candidate/Certificates.tsx#L45) & [Notifications.tsx](file:///d:/Gryphon/skill-track/src/pages/Candidate/Notifications.tsx#L60): Remove `getAllTests()`.
- [ ] **Fix 403 Forbidden for Candidate Test Titles**: Use individual `getTestById(testId)` (permitted under candidate session authorization) rather than calling the admin-only `GET /tests`.

---

### Phase 4: False In-Page Filtering & Collection Optimizations
- [ ] **Fix In-Page Candidate Filtering**: In [SuperAdminCandidates.tsx](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/SuperAdminCandidates.tsx#L335-L343), send search and organization filters directly to `getCandidatesPage(page, size, search, orgId)` instead of applying `.filter()` solely against the current page of 10 items.
- [ ] **Fix User Management Candidate Drop**: In [user-service.ts](file:///d:/Gryphon/skill-track/src/lib/user-service.ts#L36-L47) and [Users.tsx](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/Users.tsx#L107-L115), request `GET /users?size=1000` or pass `?role!=CANDIDATE` so staff accounts on page 2+ are not hidden.
- [ ] **Fix Organisation Truncation**: In [organisation-service.ts](file:///d:/Gryphon/skill-track/src/lib/organisation-service.ts#L54-L68), ensure `GET /organisations` requests `?size=1000`.
- [ ] **Fix `getSessionsByTestId`**: In [test-service.ts](file:///d:/Gryphon/skill-track/src/lib/test-service.ts#L1261-L1264), replace the full `getAllSessions()` download with a query-parameterized call or dedicated endpoint.

---

### Phase 5: Long-Term Backend API Contracts (Target State)
- [ ] **Backend Test DTO Aggregations**: Add `candidateCount: number` directly into `TestResponse` returned by `GET /tests`, avoiding the need for the frontend to fetch all invitations to display card badges.
- [ ] **Scoped Query Parameters on Spring Boot Collections**:
  - `GET /test-schedules?testId={testId}`: Returns schedules filtered by test on the database level.
  - `GET /candidate-invitations?scheduleId={scheduleId}` and `GET /candidate-invitations?testId={testId}`.
  - `GET /candidates?organisationId={orgId}&search={query}`.
- [ ] **Candidate-Isolated Endpoints**:
  - `GET /candidates/me/sessions`: Returns strictly the authenticated candidate's test sessions.
  - `GET /candidates/me/results`: Returns only results belonging to the logged-in candidate.

---

# Detailed Audit Findings Matrix

## 1. Global Endpoints Filtered In-Memory on the Client

| Endpoint | File & Lines | Current Implementation | Flaw & Consequence |
| :--- | :--- | :--- | :--- |
| `GET /test-schedules` | [test-service.ts:1205](file:///d:/Gryphon/skill-track/src/lib/test-service.ts#L1205)<br>[NewAdminTestEdit.tsx:384, 504](file:///d:/Gryphon/skill-track/src/pages/New-Admin/NewAdminTestEdit.tsx#L384)<br>[TestsEdit.tsx:1338, 1367](file:///d:/Gryphon/skill-track/src/pages/Admin/TestsEdit.tsx#L1338) | Calls `GET /test-schedules` without size parameters, then runs `allSchedules.filter(s => s.testId === id)`. | **Direct root cause of "Test Not Scheduled Yet".** DB has 24 schedules; DT1 schedules are #21–#24 on page 2. Client gets empty array. |
| `GET /candidate-invitations` | [NewAdminTests.tsx:73](file:///d:/Gryphon/skill-track/src/pages/New-Admin/NewAdminTests.tsx#L73)<br>[Tests.tsx:88](file:///d:/Gryphon/skill-track/src/pages/Admin/Tests.tsx#L88)<br>[RecentTestsTable.tsx:56](file:///d:/Gryphon/skill-track/src/components/dashboard/RecentTestsTable.tsx#L56)<br>[TestSchedules.tsx:116](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/TestSchedules.tsx#L116) | Fetches all system-wide invitations to compute counts for cards via `counts[testId] = ...`. | **Direct root cause of "0 candidates" on test card.** Truncates at 20 items. Invitations for newer tests on page 2 evaluate to 0. |
| `GET /candidate-invitations` | [TestScheduleDetails.tsx:59](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/TestScheduleDetails.tsx#L59) | On a single schedule view (`id`), calls `GET /candidate-invitations` and does `.filter(inv => inv.scheduleId === id)`. | Ignores the existing `GET /candidate-invitations/schedule/{id}` endpoint. If invitations are past index 20, the schedule displays 0 candidates. |
| `GET /test-sessions` | [test-service.ts:1261](file:///d:/Gryphon/skill-track/src/lib/test-service.ts#L1261) (`getSessionsByTestId`) | `const allSessions = await getAllSessions(); return allSessions.filter(s => s.testId === testId);` | Reads only page 0 (20 sessions) of the whole database. Tests with sessions on page 2 return empty array. |
| `GET /test-sessions` | [Dashboard.tsx:64, 74](file:///d:/Gryphon/skill-track/src/pages/Candidate/Dashboard.tsx#L64)<br>[MyAssessments.tsx:57, 66](file:///d:/Gryphon/skill-track/src/pages/Candidate/MyAssessments.tsx#L57)<br>[ResultsReports.tsx:60, 69](file:///d:/Gryphon/skill-track/src/pages/Candidate/ResultsReports.tsx#L60) | Candidate pages call `getAllSessions()` and filter by `candidateId === myId`. | **Major privacy leak & data bug.** Exposes all session records to candidate's network tab; drops candidate sessions past item 20, triggering mock demo data. |
| `GET /tests` | [Dashboard.tsx:65](file:///d:/Gryphon/skill-track/src/pages/Candidate/Dashboard.tsx#L65)<br>[MyAssessments.tsx:58](file:///d:/Gryphon/skill-track/src/pages/Candidate/MyAssessments.tsx#L58)<br>[ResultsReports.tsx:61](file:///d:/Gryphon/skill-track/src/pages/Candidate/ResultsReports.tsx#L61)<br>[Certificates.tsx:45](file:///d:/Gryphon/skill-track/src/pages/Candidate/Certificates.tsx#L45) | Candidate pages call `getAllTests()` to look up test names and topics. | Backend endpoint requires admin privileges (`@sec.isAdminOrSuperAdmin()`), resulting in a **403 Forbidden** error. |
| `GET /users` | [user-service.ts:38](file:///d:/Gryphon/skill-track/src/lib/user-service.ts#L38)<br>[Users.tsx:109, 112](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/Users.tsx#L109) | Calls `GET /users` without size params, then filters out `user.role === "CANDIDATE"` on client. | If candidates fill the first 20 records, admins and trainers on subsequent pages are never displayed. |
| `GET /organisations` | [organisation-service.ts:56](file:///d:/Gryphon/skill-track/src/lib/organisation-service.ts#L56) | Calls `GET /organisations` without size or page parameters. | Truncates at 20 organizations if backend returns a paginated envelope. |

---

## 2. N+1 Request Flooding Loops

1. **Reports Session Result Flood** ([Reports.tsx:170–185](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/Reports.tsx#L170-L185))
   - Fetches all sessions, then runs `evaluatedSessions.map(async s => getResultBySessionId(s.id))`.
   - **Impact**: Fires 100–500 simultaneous requests on initial page load, causing database connection pool exhaustion and backend CPU spikes.
2. **Schedule Test Mapping Loop** ([InvitedCandidatesHistory.tsx:75–84](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/InvitedCandidatesHistory.tsx#L75-L84) & [InviteCandidates.tsx:120–128](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/InviteCandidates.tsx#L120-L128))
   - Iterates over all schedules and fires `testService.getTestById(schedule.testId)` for each item individually.
3. **Candidate Details Waterfall** ([NewAdminTestEdit.tsx:526–555](file:///d:/Gryphon/skill-track/src/pages/New-Admin/NewAdminTestEdit.tsx#L526-L555) & [TestsEdit.tsx:1400–1415](file:///d:/Gryphon/skill-track/src/pages/Admin/TestsEdit.tsx#L1400-L1415))
   - For every candidate in the table, makes up to 3 individual HTTP calls (`/details`, `/test-results/session/{sessionId}`, and `/test-sessions/{sessionId}`).

---

## 3. False In-Page Filtering

- **Single-Page Filtering Bug** ([SuperAdminCandidates.tsx:335](file:///d:/Gryphon/skill-track/src/pages/SuperAdmin/SuperAdminCandidates.tsx#L335))
  - Uses `candidateService.getCandidatesPage(page, 10)` for server pagination.
  - Applies search and organisation filter in memory:
    ```ts
    const candidates = allCandidates.filter((candidate) => {
      const matchesOrg = selectedOrganisation === "all" || candidate.organisation.id === selectedOrganisation;
      return matchesSearch && matchesOrg;
    });
    ```
  - **Impact**: Only searches across the 10 candidates currently loaded on the active page. Searching for a candidate on page 3 while on page 1 yields "No candidates found".
