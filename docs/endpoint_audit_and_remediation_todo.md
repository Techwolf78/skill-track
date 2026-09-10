# API Endpoint Audit & Architecture Remediation

> **Status**: All phases remediated, verified, and active. Data mismatches, Spring Boot pagination defaults (`size=1000`), client-side in-memory drop bugs, and legacy duplicate files have been resolved.

---

## 📋 Remediation Status (Completed)

### Phase 1: Critical Test Edit & Test Card Counts (✅ Completed)
- [x] **Test Schedule Cutoff Fix**: [test-service.ts](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/lib/test-service.ts) (`getAllTestSchedules`) supports parameterized `testId` and `size=1000`.
- [x] **Test Card Candidate Count Fix**: [NewAdminTests.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/New-Admin/NewAdminTests.tsx) and [NewAdminHome.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/New-Admin/NewAdminHome.tsx) pass `?size=1000` to `GET /candidate-invitations` and map test takers accurately.
- [x] **Recent Tests Schedule Table**: [RecentTestsTable.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/components/dashboard/RecentTestsTable.tsx) requests `GET /candidate-invitations?size=1000`.
- [x] **Test Edit Active Schedule Selection**: In [NewAdminTestEdit.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/New-Admin/NewAdminTestEdit.tsx), passes `testId` to `getAllTestSchedules` and sorts schedules by recency (`startTime` / `createdAt` desc).
- [x] **Multi-Schedule Invitation Aggregation**: [NewAdminTestEdit.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/New-Admin/NewAdminTestEdit.tsx) aggregates candidate invitations across all schedules belonging to the test using [getInvitationsBySchedule](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/lib/candidate-service.ts).
- [x] **Candidate Status & Session Mapping**: In [NewAdminTestEdit.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/New-Admin/NewAdminTestEdit.tsx), displays session status (`SUBMITTED`, `EVALUATED`, `IN_PROGRESS`) from `scoreEntry?.session?.status`.

---

### Phase 2: SuperAdmin & Single Schedule Views (✅ Completed)
- [x] **SuperAdmin Single Schedule Details**: In [TestScheduleDetails.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/SuperAdmin/TestScheduleDetails.tsx), uses `candidateService.getInvitationsBySchedule(id)` for schedule-specific data.
- [x] **SuperAdmin Schedule List Badges**: In [TestSchedules.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/SuperAdmin/TestSchedules.tsx), requests `GET /candidate-invitations?size=1000`.
- [x] **Eliminate Loop Flooding in Invite Histories**:
  - In [InvitedCandidatesHistory.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/SuperAdmin/InvitedCandidatesHistory.tsx): Deduplicated lookups to eliminate redundant requests and passed `?size=1000`.
  - In [InviteCandidates.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/SuperAdmin/InviteCandidates.tsx): Deduplicated `testId` lookups before fetching and passed `?size=1000`.

---

### Phase 3: Candidate Portal Security & Isolation (✅ Completed)
- [x] **Remove Global Session Scans**:
  - In [Dashboard.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/Candidate/Dashboard.tsx): Removed `getAllTests()` and scoped sessions to the candidate.
  - In [MyAssessments.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/Candidate/MyAssessments.tsx): Removed `getAllTests()` and used scoped sessions.
  - In [ResultsReports.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/Candidate/ResultsReports.tsx): Removed `getAllTests()` and used scoped sessions.
  - In [Certificates.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/Candidate/Certificates.tsx) & [Notifications.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/Candidate/Notifications.tsx): Removed `getAllTests()`.
- [x] **Test Title Resolution**: Individual `getTestById(testId)` calls used per session under candidate authorization.

---

### Phase 4: Database-Level Filtering & Pagination (✅ Completed)
- [x] **Database Candidate Search & Org Filter**: In [SuperAdminCandidates.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/SuperAdmin/SuperAdminCandidates.tsx), search query and organization filter are sent directly to `getCandidatesPage(page, size, search, orgId)` for database-level evaluation.
- [x] **User Management Role Filter**: In [user-service.ts](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/lib/user-service.ts) and [Users.tsx](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/pages/SuperAdmin/Users.tsx), passes `excludeRole=CANDIDATE` and `size=1000`.
- [x] **Organisation Querying**: In [organisation-service.ts](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/lib/organisation-service.ts), supports `search` and `size=1000`.
- [x] **Test Querying (`getAllTests`)**: In [test-service.ts](file:///c:/Users/Lenovo/Desktop/GA-Projects/skill-track/src/lib/test-service.ts), requests `?page=0&size=1000` so tests beyond index 20 (e.g. "developer test 15") are delivered.

---

### Phase 5: Legacy Codebase Cleanup (✅ Completed)
- [x] Removed 8 unused legacy duplicate files from `src/pages/Admin/`.
- [x] Removed legacy `TestAccess.tsx` and backup files from `src/pages/test/`.
- [x] Preserved all active dialogs (`BulkUploadCandidates`, `EditCandidateDialog`, `DeleteConfirmDialog`) and `ProctoringDashboard`.
- [x] Updated all primary brand colors to Blue (`#4353a4`) and active badges to Emerald Green (`#10B981`).

