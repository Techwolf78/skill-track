# 🏛️ Gryphon 360 (RxOne) — Comprehensive System Architecture & Technical Defense Blueprint

**Target Audience**: Executive IT & Engineering Team, Senior Architecture Reviewers, and Technical Consultants (Zersys)  
**System Specification**: Enterprise Spring Boot 3/4 (Java 21 Virtual Threads) + PostgreSQL 16 + Redis 7.2 + AWS SES + React 18 / TypeScript  
**Document Classification**: Confidential Engineering Specification & Meeting Preparation  

---

## 📌 Executive Summary

Gryphon 360 (RxOne) is a high-concurrency, enterprise-grade proctored assessment platform engineered for multi-disciplinary testing (Engineering, Coding, Finance, Business Analytics, Management, and Corporate Hiring).

This document details the **System Architecture**, **Technology Stack Justifications**, **Database Structure**, **Enterprise Security & Privacy Safeguards**, and the **Strategy & Questions for the Consultation Meeting with Zersys**.

---

## 1. 🏗️ Tiered System Architecture Breakdown

### 🔹 Tier 1: Client & Ingress Tier
- **Candidate Assessment Portal (`React 18 + TypeScript + Vite`)**:
  - Delivers dynamic assessment sessions, rich text prompts, and Monaco multi-language code editor.
  - **Edge AI Proctoring**: Client-side face mesh, eye gaze anomaly detection, and tab focus tracking via WebAssembly/WebGL (MediaPipe & TensorFlow.js).
  - **Offline-First Resilience**: Buffered IndexedDB/LocalStorage state syncing automatically in the background with exponential backoff.
- **Admin & Evaluator Dashboard (`React 18 + Shadcn UI`)**:
  - Test authoring, question bank taxonomy management, candidate bulk invitation, live proctoring fleet monitoring, and verifiable PDF certificate generation.
- **Edge Gateway (`Nginx on VM 1: Port 443`)**:
  - TLS 1.3 cryptographic termination with Let's Encrypt certificates.
  - Rate limiting (100 req/s/IP) and Layer-7 DDoS defense.
  - Reverse proxy routing for `/api/*` requests to Spring Boot (`127.0.0.1:8081`).

---

### 🔹 Tier 2: Application & Microservices Layer (VM 1: 4 vCPU, 16 GB RAM)
- **Core Application Server (`Java 21 + Spring Boot 3/4`)**:
  - **Virtual Threads (Project Loom)**: Handles high-concurrency I/O and simultaneous submissions with sub-millisecond thread scheduling.
  - **Spring Security 6**: Stateless JWT authentication with refresh token rotation, permission-based RBAC (`SUPER_ADMIN`, `ORG_ADMIN`, `EVALUATOR`, `CANDIDATE`), and CORS security headers.
  - **Idempotency Engine**: Enforces cryptographic request fingerprinting via Redis mutex locks to eliminate duplicate submissions under network latency.
- **In-Memory Cache & Session Broker (`Redis 7.2`)**:
  - Active candidate session timers, live progress buffers, rate-limiting tokens, and JWT revocation blacklists.
- **Isolated Code Compilation Fleet (`Judge0 / Docker Engine`)**:
  - Secure multi-language compilation (Java, Python, C++, TypeScript, Go, Rust).
  - Strict sandboxing with Linux `cgroups v2`, `seccomp-bpf` syscall filters, memory limits (256MB), CPU execution quotas (2000ms), and disabled network egress.

---

### 🔹 Tier 3: Database & Storage Layer (VM 2: 2 vCPU, 8 GB RAM)
- **Primary Relational Database (`PostgreSQL 16`)**:
  - Full ACID transactional integrity for test submissions, marks aggregation, and audit logs.
  - **Network Isolation**: Accessible strictly via the cloud provider's internal private VPC subnet (`<VM1_PRIVATE_IP>/32`) with `SCRAM-SHA-256` password encryption; zero internet-facing ports.
  - Flexible `JSONB` column indexing for dynamic question options, coding metadata, and sectional rules.
- **Automated Backup Storage (300 GB)**:
  - Nightly automated encrypted Gzip database dumps with Point-in-Time Recovery (PITR).
- **Cloud Object Storage (S3-Compatible)**:
  - Encrypted storage for proctoring photo snapshots, audio incident recordings, and pre-rendered PDF scorecards accessible only via time-limited presigned URLs.

---

### 🔹 Tier 4: Enterprise Communications Gateway
- **AWS SES (Amazon Simple Email Service — Asia Pacific Mumbai `ap-south-1`)**:
  - 100% cryptographic authentication (`DKIM 2048-bit`, `SPF: v=spf1 include:amazonses.com ~all`, `DMARC: v=DMARC1; p=quarantine`).
  - High-throughput transactional dispatch of exam invitations, 6-digit OTPs, and automated scorecard PDFs with 99.99% direct inbox delivery.

---

## 2. 💻 Core Technologies & Enterprise Justifications

| Component | Selected Technology | Why We Chose This (Technical Justification) |
|---|---|---|
| **Frontend Core** | **React 18 + TypeScript + Vite** | • **Zero Runtime Type Errors**: Strict TypeScript ensures data integrity for complex multi-section tests.<br/>• **Fast Bundling**: Vite builds optimized, minified chunks for fast load times even on low-bandwidth college campus Wi-Fi.<br/>• **Virtual DOM & React State**: Handles complex UI (Monaco code editor, rich test timer, question palette, live webcam canvas) without UI lag. |
| **Design System** | **Tailwind CSS + Shadcn UI (Radix)** | • **Zero Runtime CSS Overhead**: Utilities are purged at build time into a lightweight CSS file.<br/>• **WAI-ARIA Accessibility**: Radix UI components provide fully accessible keyboard navigation and screen-reader support.<br/>• **Consistent Enterprise Aesthetic**: Apple/iOS-grade clean aesthetics matching enterprise SaaS benchmarks. |
| **Client-Side AI Proctoring** | **MediaPipe Face Mesh + TensorFlow.js (WASM / WebGL)** | • **100% Privacy Preservation**: Biometric face mesh inference runs strictly inside the candidate's browser engine using WebAssembly/WebGL. Zero raw video streams leave the candidate's device.<br/>• **Zero Server Video Ingestion Costs**: No expensive WebRTC streaming media servers needed.<br/>• **Low Latency Anomaly Detection**: Real-time 3D gaze tracking, multi-face alerts, and tab-switch detection at 30-60 FPS locally. |
| **Backend Core** | **Java 21 + Spring Boot 3/4** | • **Enterprise Performance & Concurrency**: High-throughput virtual threads (Project Loom) handle thousands of concurrent test submissions with sub-millisecond CPU scheduling.<br/>• **Type-Safe Enterprise Architecture**: Mature Dependency Injection, Spring Security, Hibernate ORM, and resilient transaction management.<br/>• **Battle-Tested Reliability**: Standard of choice across global banking (BFSI), Fortune 500, and government examination systems. |
| **In-Memory Cache & Lock** | **Redis 7.2** | • **Sub-millisecond Session State**: Candidate timers, question progress, and heartbeats are cached in RAM to prevent database query bottlenecks.<br/>• **Distributed Locks & Idempotency**: Guarantees a candidate cannot double-submit answers or game the timer through network replays.<br/>• **Rate Limiting**: Protects login and submission endpoints against abuse. |
| **Primary Database** | **PostgreSQL 16** | • **Strict ACID Transactions**: Guarantees zero lost answers, exact score calculations, and consistent question state.<br/>• **JSONB Support**: Allows flexible storage of dynamic question formats (coding, MCQs, psychometric, subjective, file uploads) in a single schema.<br/>• **Row-Level Security (RLS) & SCRAM-SHA-256**: High-grade cryptographic authentication and tenant isolation. |
| **Email & Notification Gateway** | **AWS SES (Mumbai ap-south-1)** | • **99.99% Deliverability**: Full DKIM, SPF, and DMARC cryptographic domain authentication ensuring test links reach candidate inboxes, not spam folders.<br/>• **Local Data Residency**: Mumbai `ap-south-1` gateway delivers lowest latency in India and complies with local data residency laws.<br/>• **Cost Efficiency**: High-volume transactional dispatch at ~$0.10 per 1,000 emails. |
| **Code Execution Fleet** | **Judge0 Sandbox / Docker Containers** | • **Sandboxed Compilation**: Multi-language support (Java, Python, C++, TS, Go) running inside isolated Linux containers.<br/>• **Security Caps**: Strict CPU time limits, RAM memory quotas, blocked syscalls (seccomp), and disabled network access to prevent malicious code exploits. |

---

## 3. 🗄️ Database Architecture & Entity Map (All 36 Production Tables)

The database schema is organized across 6 functional sub-domains:

### 1. Multi-Tenant & Access Domain
- `organisations`: Multi-tenant account records, logo URLs, and custom settings.
- `users`: Administrator, evaluator, and candidate login credentials, BCrypt password hashes, and JWT versions.
- `candidates`: Candidate profiles, register numbers, departments, and custom attributes.
- `audit_logs`: Immutable tenant audit trail capturing admin actions, IP addresses, and before/after diffs.

### 2. Question Bank & Taxonomy Domain
- `subjects`: Top-level subjects (e.g., Computer Science, Quantitative Aptitude, Finance).
- `topics`: Mid-level topic groupings (e.g., Data Structures, Corporate Finance).
- `subtopics`: Granular subtopic categories (e.g., Binary Trees, Capital Budgeting).
- `questions`: Core question prompt, difficulty, marks, image attachments, and tags.
- `mcq_questions` & `mcq_options`: Single/multiple choice configurations, options, and correctness flags.
- `coding_questions` & `test_cases`: Memory limits, CPU time quotas, template stubs, and hidden/sample test cases.
- `question_versions`: Immutable audit snapshots of historical question revisions.

### 3. Test Composition & Scheduling Domain
- `tests`: Test configuration, pass marks, duration, sectional rules, and instructions.
- `test_questions`: Order index, allocated marks, and negative marking rules.
- `test_snapshots`: Version-locked test definitions ensuring live tests cannot be altered mid-exam.
- `proctoring_profiles`: Configurable integrity policies (webcam, mic, screen share, tab limits, auto-submit).
- `test_schedules`: Time-windowed assessment slots for candidate cohorts.
- `candidate_invitations`: Unique cryptographic test access tokens, OTPs, and validity timestamps.

### 4. Candidate Session & Submission Domain
- `test_sessions`: Live candidate session state, remaining timer, client IP, user agent, and status (`IN_PROGRESS`, `SUBMITTED`, `TERMINATED`).
- `submissions`: Encrypted answer buffers, code submissions, client timestamps, and save versions.
- `question_attempt_timings`: Real-time tracking of time spent and visit counts per question.
- `question_scores`: Evaluated points, maximum scores, and auto-grading flags.
- `code_execution_runs`: Sandbox run history, stdout/stderr, compilation output, and run group IDs.
- `judge0_pending`: Asynchronous callback tokens and webhook secrets for sandbox jobs.
- `coding_submission_results`: Aggregated test case results, runtime latency, and execution statuses.

### 5. Evaluation & Reporting Domain
- `test_results`: Final computed percentage, percentile ranking, pass status, and S3 scorecard links.
- `schedule_percentiles`: Pre-calculated score-to-percentile lookup tables for the cohort.
- `grading_batch_checkpoints`: Resilient checkpoint tracking for background batch-grading workers.

### 6. AI Proctoring, Biometrics & Resilience Domain
- `proctoring_events`: Anomaly events (tab switches, multi-face detections, missing face, audio spikes).
- `candidate_snapshots`: Encrypted S3 photo evidence captured periodically or on violation triggers.
- `trust_scores`: Dynamic integrity score (0–100%) with penalty deduction breakdown.
- `candidate_insights`: Multi-dimensional skill radar scores and speed-vs-accuracy competency metrics.
- `dead_letter_queue_records`: Quarantined background processing errors.
- `failed_execution_records`: Retry attempt logs and stack traces.
- `shedlock`: Distributed locking mechanism across clustered application instances.

---

## 4. 🌐 Complete Swagger / REST Controller Endpoint Catalog

| Controller Class | Base Route | Key Operations & Endpoints | Security Scope |
|---|---|---|---|
| **AuthController** | `/auth` | `POST /auth/login`, `POST /auth/verify-otp`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout` | `PermitAll` / `Authenticated` |
| **UserController** | `/users` | `GET /users?size=1000`, `POST /users`, `PUT /users/{id}`, `DELETE /users/{id}` | `ORG_ADMIN`, `SUPER_ADMIN` |
| **OrganisationController** | `/organisations` | `GET /organisations`, `POST /organisations`, `PUT /organisations/{id}/settings` | `SUPER_ADMIN`, `ORG_ADMIN` |
| **TaxonomyController** | `/subjects`, `/topics`, `/subtopics` | `GET /subjects`, `POST /subjects`, `GET /topics/{id}/subtopics`, `POST /subtopics` | `ORG_ADMIN` |
| **QuestionController** | `/questions` | `GET /questions?page=0&size=100`, `POST /questions`, `POST /questions/validate-driver` | `ORG_ADMIN` |
| **TestController** | `/tests`, `/test-questions` | `GET /tests?size=1000`, `POST /tests`, `POST /tests/{id}/publish`, `POST /test-questions/bulk` | `ORG_ADMIN`, `EVALUATOR` |
| **TestScheduleController** | `/test-schedules` | `GET /test-schedules/by-test/{id}`, `POST /test-schedules`, `PUT /test-schedules/{id}/extend` | `ORG_ADMIN` |
| **CandidateInvitationController** | `/candidate-invitations` | `POST /candidate-invitations/send-bulk`, `GET /candidate-invitations/validate/{token}` | `ORG_ADMIN` / `PermitAll` |
| **TestSessionController** | `/test-sessions` | `POST /test-sessions/start`, `POST /test-sessions/{id}/heartbeat`, `POST /test-sessions/{id}/save-answer`, `POST /test-sessions/{id}/submit` | `CANDIDATE` |
| **SubmissionController** | `/submissions` | `POST /submissions/code-run`, `POST /submissions/code-submit` (via Judge0) | `CANDIDATE` |
| **ProctoringController** | `/proctoring` | `POST /proctoring/violations`, `POST /proctoring/snapshots`, `GET /proctoring/live-feed/{scheduleId}` | `CANDIDATE`, `ORG_ADMIN` |
| **TestResultController** | `/test-results`, `/admin/reports` | `GET /test-results/by-schedule/{id}`, `GET /test-results/{id}/certificate`, `GET /admin/reports/analytics` | `ORG_ADMIN`, `CANDIDATE` |
| **ActuatorController** | `/actuator` | `GET /actuator/health`, `GET /actuator/metrics`, `GET /actuator/prometheus` | `SUPER_ADMIN`, `Internal` |

---

## 5. 🛡️ Enterprise Security & Data Integrity Proof Points

When high-end enterprise clients ask: *"How do you guarantee our data won't leak?"*, provide these 5 assurances:

1. **Zero Raw Video Storage (Edge-Only AI)**:  
   Unlike older platforms that stream raw student webcams to cloud servers (risking biometric data leaks), our AI models run **directly inside the student's browser via WebAssembly**. Only lightweight, encrypted anomaly metadata is logged.
2. **Bank-Grade Encryption (AES-256 & TLS 1.3)**:  
   All data in transit is encrypted using TLS 1.3 with HSTS headers. All databases, Redis persistence files, and backups are encrypted at rest with AES-256.
3. **Private Subnet Architecture**:  
   The database server has **no public IP address**. It is strictly unreachable from the internet and can only communicate with the application server over a private internal VPC network using `SCRAM-SHA-256`.
4. **Anti-Question-Leak Forensics**:  
   - Context menus, text selection, clipboard copy/paste (`Ctrl+C`, `Ctrl+V`), and DevTools inspection are locked down.
   - Dynamic invisible watermarking overlays the candidate's email and IP address across questions, making unauthorized phone camera photos immediately traceable.
5. **Offline-First Network Resilience**:  
   Student answers and code are automatically encrypted in browser memory and local storage. If their Wi-Fi drops, they continue uninterrupted; an automatic background sync worker commits their answers the moment connectivity resumes.

---

## 6. 🎯 Strategic Questions to Ask Zersys (Consultant Meeting)

To maximize the ROI of the consultation session with Zersys, ask these targeted technical questions:

### 🔹 Topic 1: High-Concurrency Spike Handling
> *"When 5,000 to 10,000 candidates simultaneously submit in the final 60 seconds of a national test drive, what HikariCP connection pool tuning on Spring Boot and Redis batch queuing strategy do you recommend to prevent database lock contention?"*

### 🔹 Topic 2: Enterprise Security & Compliance Roadmap
> *"For onboarding Tier-1 enterprise and BFSI clients, what specific penetration testing (VAPT) scopes and compliance certifications (SOC 2 Type II, ISO 27001, Indian DPDP Act 2023) should we prioritize first?"*

### 🔹 Topic 3: High Availability (HA) & Disaster Recovery (DR)
> *"What PostgreSQL replication and failover topology (e.g., Streaming Replication with PgBouncer / Patroni) would you advise to maintain an RTO under 2 minutes and near-zero RPO?"*

### 🔹 Topic 4: Code Sandbox Hardening
> *"What kernel-level sandbox isolation policies (gVisor vs seccomp-bpf filters, cgroups v2, and network namespace dropping) do you recommend for our multi-language code compilation engine to prevent container breakouts or fork bombs?"*

### 🔹 Topic 5: Edge WAF & DDoS Shielding
> *"Do you recommend placing Cloudflare Enterprise or AWS WAF in front of our Nginx gateway for Layer 7 DDoS mitigation, bot defense, and IP rate limiting?"*

---

## 7. 🥋 Defensive Q&A: Winning Answers for Client Technical Inquiries

- **"Why Java / Spring Boot instead of Node.js or Python?"**  
  *Answer:* Java 21 with Virtual Threads provides strict thread isolation, true CPU multi-threading, and enterprise ACID transactions needed for high-concurrency exam submissions without the event-loop blocking risks of single-threaded engines.
- **"What if a student loses internet during the exam?"**  
  *Answer:* The platform uses an Offline-First Resilience Architecture. Keystrokes and answers are buffered locally in encrypted storage and auto-synced with exponential backoff once the network reconnects.
- **"Where is our data stored?"**  
  *Answer:* Hosted strictly in Tier-3/Tier-4 data centers in India with AWS SES Mumbai (`ap-south-1`), ensuring 100% compliance with CERT-In and the Indian DPDP Act 2023.

---
*Maintained and verified by Gryphon 360 Core Engineering.*
