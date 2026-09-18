export interface DocCodeSnippet {
  language: string;
  code: string;
  filename?: string;
}

export interface DocParamRow {
  name: string;
  type: string;
  default?: string;
  description: string;
}

export interface DocSubSection {
  heading: string;
  subheading?: string;
  body?: string[];
  callout?: {
    type: "note" | "warning" | "tip" | "danger" | "success";
    title: string;
    text: string;
  };
  table?: {
    headers: string[];
    rows: string[][];
  };
  paramsTable?: DocParamRow[];
  codeSnippets?: DocCodeSnippet[];
}

export interface DocArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  readTime: string;
  updatedAt: string;
  tags: string[];
  content: {
    summary: string;
    quickReference?: {
      headers: string[];
      rows: string[][];
    };
    sections: DocSubSection[];
  };
}

export interface DocSection {
  id: string;
  title: string;
  badge?: string;
  articles: DocArticle[];
}

export const DOCS_DATA: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    badge: "Core",
    articles: [
      {
        id: "overview-arch",
        title: "Platform Architecture & Topology",
        slug: "architecture-overview",
        description: "Technical blueprint of Gryphon 360 distributed microservices, state machines, and real-time execution engines.",
        category: "Getting Started",
        readTime: "10 min read",
        updatedAt: "2026-08-01",
        tags: ["Architecture", "Infrastructure", "Microservices", "Security", "High Availability"],
        content: {
          summary: "Gryphon 360 is an ultra-low latency, multi-tenant automated skill evaluation and proctoring platform designed to evaluate tens of thousands of concurrent candidates with zero degradation under peak national load.",
          quickReference: {
            headers: ["Tier Layer", "Technology", "Protocol / Spec", "Scaling Profile"],
            rows: [
              ["Edge Client", "React 18 + TypeScript + Vite + WebGL", "HTTPS / WSS / WebRTC", "Client-side compute offload"],
              ["Ingestion Gateway", "Anycast CDN & Load Balancer", "TLS 1.3 / HTTP/2 & WebSockets", "Global multi-region anycast routing"],
              ["Core Services", "Spring Boot / Java 21 LTS", "REST + GraphQL + Spring Security", "Stateless horizontal autoscaling"],
              ["State Store & Cache", "In-Memory Cache & Session Store", "RESP protocol (In-memory)", "Sub-millisecond session state locks"],
              ["Primary DB", "PostgreSQL (Multi-AZ + Read Replicas)", "ACID Row Level Security (RLS)", "Partitioned by tenant_id & test_id"],
              ["Execution Workers", "Isolated Sandbox Container Pool", "Ephemeral container runtime", "Auto-scaled dedicated worker pools"]
            ]
          },
          sections: [
            {
              heading: "Core Architecture Topology",
              subheading: "Four-tier decoupled distribution",
              body: [
                "Gryphon 360 separates compute-intensive client proctoring analysis, candidate test evaluation, and secure code compilation into isolated layers to ensure fault tolerance.",
                "1. Client Edge Layer: Handles Monaco Editor runtime, real-time media streams, WebGL neural vision inference, and telemetry packet signing.",
                "2. Application Gateway & Auth Cluster: Handles JWT token verification, rate-limiting token buckets, tenant routing, and biometric snapshot authorization.",
                "3. Core Assessment State Machine: Persists assessment lifecycle transitions (SCHEDULED -> IN_PROGRESS -> SUBMITTED -> EVALUATED) in PostgreSQL with atomic session lock guards.",
                "4. Isolated Execution Sandboxes: Executes candidate source code inside ephemeral, zero-network sandboxes with strict CPU, memory, and syscall constraints."
              ],
              callout: {
                type: "tip",
                title: "Stateless Session Architecture",
                text: "All assessment sessions maintain write-through state snapshots. Even if a candidate's internet disconnects, their exact code editor state, proctoring timeline, and timer synchronization resume instantly upon reconnecting."
              }
            },
            {
              heading: "Session State Transition Matrix",
              subheading: "Formal lifecycle specification for test attempts",
              body: [
                "Every candidate test attempt transitions through deterministic states managed by the state-machine engine. Invalid state transitions are rejected with HTTP 409 Conflict."
              ],
              table: {
                headers: ["Current State", "Trigger Event", "Target State", "Guard Conditions", "Side Effects"],
                rows: [
                  ["CREATED", "Candidate verifies Magic Link / OTP", "INITIALIZING", "Within schedule access window & valid token", "Issues session JWT, allocates session state"],
                  ["INITIALIZING", "Webcam & system checks pass", "IN_PROGRESS", "Biometric baseline confirmed", "Starts test timer, logs start audit event"],
                  ["IN_PROGRESS", "Candidate submits test", "SUBMITTED", "All mandatory sections completed or time limit elapsed", "Triggers asynchronous evaluation worker"],
                  ["IN_PROGRESS", "Critical proctoring strikes exceeded", "DISQUALIFIED", "Proctor strikes >= max_strikes threshold", "Revokes session token, captures final snapshot"],
                  ["IN_PROGRESS", "Schedule window expires", "AUTO_SUBMITTED", "now() >= schedule.endTime + grace_period", "Forces test finalization with current state"],
                  ["SUBMITTED", "Async evaluation worker finishes", "COMPLETED", "All coding & MCQ scores tabulated", "Generates final scorecard and verified certificate"]
                ]
              }
            }
          ]
        }
      },
      {
        id: "quickstart-guide",
        title: "Enterprise Onboarding Workflow",
        slug: "quickstart-guide",
        description: "Step-by-step master workflow for provisioning organizations, role policies, and test schedules.",
        category: "Getting Started",
        readTime: "8 min read",
        updatedAt: "2026-08-01",
        tags: ["Workflow", "Organisations", "RBAC", "Provisioning"],
        content: {
          summary: "Step-by-step master administrative guide to configuring enterprise tenants, assigning granular RBAC roles, assembling multi-subject assessment blueprints, and dispatching candidate invitation batches.",
          quickReference: {
            headers: ["Step", "Action Item", "Admin Panel View", "Output Generated"],
            rows: [
              ["01", "Provision Organization", "SuperAdmin > Organisations", "Unique Tenant Workspace & Data Partition"],
              ["02", "Configure Admin Users", "SuperAdmin > Users & RBAC", "Encrypted Credentials & Invite Email"],
              ["03", "Build Subject Blueprint", "Admin > Question Bank", "Subject Taxonomies & Tagged Problem Sets"],
              ["04", "Assemble Test Structure", "Admin > Test Create", "Timer Rules, Negative Marking & Cutoffs"],
              ["05", "Set Proctoring Policy", "Admin > Test Edit > Proctoring", "Webcam, Gaze Tracking & Max Tab Switches"],
              ["06", "Dispatch Batch Invites", "Admin > Invite Candidates", "Unique Magic URLs & OTP Access Codes"]
            ]
          },
          sections: [
            {
              heading: "Step 1: Multi-Tenant Organization Registration",
              subheading: "Database isolation and workspace initialization",
              body: [
                "Navigate to SuperAdmin > Organisations. Each organization is an isolated workspace with its own candidate directory, custom question library, and dedicated assessment settings.",
                "Organization codes must be unique alphanumeric identifiers which form the tenant partition key in the database."
              ],
              callout: {
                type: "note",
                title: "Row-Level Security (RLS)",
                text: "PostgreSQL multi-tenancy is enforced at the database level. Cross-tenant data access is strictly isolated."
              }
            },
            {
              heading: "Step 2: RBAC Matrix & Role Permissions",
              subheading: "Role hierarchy and administrative scope",
              body: [
                "Gryphon 360 enforces a hierarchical RBAC permission tree. Users can be assigned one or more roles within their organization."
              ],
              table: {
                headers: ["Role Name", "Scope", "Permissions", "Access URL"],
                rows: [
                  ["SUPERADMIN", "Global (All Tenants)", "Manage organizations, global question bank, cloud settings, system audit logs", "/superadmin"],
                  ["ADMIN", "Tenant Workspace", "Create tests, manage subjects, schedule assessments, view candidate reports, live proctoring", "/admin"],
                  ["EVALUATOR", "Assigned Tests", "Review subjective answers, grade coding problem recordings, override proctoring flags", "/admin/evaluations"],
                  ["CANDIDATE", "Individual Attempt", "Take scheduled tests, access practice sandbox, download performance certificates", "/candidate"]
                ]
              }
            }
          ]
        }
      },
      {
        id: "browser-compatibility",
        title: "Browser & Hardware Compatibility",
        slug: "browser-compatibility",
        description: "Minimum hardware specifications, supported browsers (Chrome, Firefox, Safari, Edge), and WebGL/WebRTC capabilities.",
        category: "Getting Started",
        readTime: "5 min read",
        updatedAt: "2026-08-01",
        tags: ["Browsers", "WebRTC", "Compatibility", "Hardware"],
        content: {
          summary: "Gryphon 360 is engineered to execute client-side neural inference across 99.4% of modern personal computing devices without requiring any extension or software download.",
          quickReference: {
            headers: ["Browser", "Minimum Version", "WebGL 2.0", "WebRTC Streams", "Status"],
            rows: [
              ["Google Chrome", "Version 90+", "Supported", "Supported", "Fully Validated (Recommended)"],
              ["Microsoft Edge (Chromium)", "Version 90+", "Supported", "Supported", "Fully Validated"],
              ["Mozilla Firefox", "Version 88+", "Supported", "Supported", "Validated"],
              ["Apple Safari (macOS / iOS)", "Version 14.1+", "Supported", "Supported", "Validated"],
              ["Opera / Brave", "Latest Chromium", "Supported", "Supported", "Validated"]
            ]
          },
          sections: [
            {
              heading: "Candidate System Preflight Check Protocol",
              subheading: "Automated 5-point client validation before question reveal",
              body: [
                "Before accessing questions, candidate devices must clear an automated 5-point hardware check: (1) Webcam video pipeline at 30 FPS, (2) Audio RMS microphone input, (3) WebGL 2.0 tensor acceleration, (4) Bandwidth check >= 250 kbps, (5) Fullscreen lock support.",
                "If any test fails (e.g. webcam blocked in Chrome permissions), the UI displays step-by-step resolution badges directly in the viewport."
              ]
            },
            {
              heading: "Hardware Sizing Guidelines",
              subheading: "Minimum client specifications for smooth neural model execution",
              table: {
                headers: ["Component", "Minimum Requirement", "Recommended Spec"],
                rows: [
                  ["Processor (CPU)", "Dual-Core 2.0 GHz (Intel i3 / Ryzen 3 / Apple M1)", "Quad-Core 2.4 GHz (Intel i5/i7 / Ryzen 5 / Apple M2)"],
                  ["System Memory (RAM)", "4.0 GB Available Memory", "8.0 GB or higher"],
                  ["Display Resolution", "1280 x 720 (720p HD)", "1920 x 1080 (1080p FHD)"],
                  ["Network Bandwidth", "512 kbps upload & download", "2.0 Mbps+ continuous fiber/4G"]
                ]
              }
            }
          ]
        }
      },
      {
        id: "security-compliance",
        title: "Security, Encryption & Privacy",
        slug: "security-compliance",
        description: "SOC 2 Type II, ISO 27001, GDPR compliance, end-to-end telemetry encryption, and ephemeral storage lifecycles.",
        category: "Getting Started",
        readTime: "7 min read",
        updatedAt: "2026-08-01",
        tags: ["SOC2", "GDPR", "Encryption", "Security"],
        content: {
          summary: "Gryphon 360 adheres to strict global data privacy standards, guaranteeing candidate biometric safety through local edge processing and zero perpetual video storage.",
          sections: [
            {
              heading: "Zero-Knowledge Biometric Processing",
              subheading: "Why client-side inference protects privacy and complies with GDPR",
              body: [
                "Unlike legacy platforms that stream and store continuous video footage of candidates in cloud buckets, Gryphon 360 processes face landmarks entirely in browser RAM using WebGL tensors.",
                "Only mathematical confidence scalars and timestamped anomaly snapshots are retained for post-exam auditing, with automated 30-day data purging policies."
              ],
              callout: {
                type: "success",
                title: "GDPR Article 9 & 32 Compliance",
                text: "Because raw facial biometric embeddings are never stored on permanent database disks, candidate biometric data cannot be compromised in any potential data breach."
              }
            },
            {
              heading: "Data Encryption Standards",
              body: [
                "1. Data in Transit: TLS 1.3 enforced across all HTTP/2 API calls, WebSockets, and WebRTC channels with HSTS Preload.",
                "2. Data at Rest: AES-256 GCM encryption on database disk volumes and violation snapshot stores.",
                "3. Token Signing: RS256 cryptographic signatures on all candidate and administrator session tokens."
              ]
            }
          ]
        }
      }
    ]
  },
  {
    id: "proctoring-engine",
    title: "AI Proctoring & Anti-Cheat",
    badge: "Computer Vision",
    articles: [
      {
        id: "proctoring-specs",
        title: "Edge Computer Vision & Heuristics",
        slug: "proctoring-engine-specs",
        description: "Algorithmic specification of client-side 468-point 3D Face Mesh inference, iris gaze tracking, and object classification.",
        category: "AI Proctoring",
        readTime: "12 min read",
        updatedAt: "2026-08-01",
        tags: ["FaceDetection", "MediaPipe", "Computer Vision", "Anti-Cheat"],
        content: {
          summary: "Gryphon 360 utilizes zero-latency edge inference via WebGL-accelerated neural networks inside the candidate browser, guaranteeing privacy compliance while detecting integrity breaches in sub-200ms cycles.",
          quickReference: {
            headers: ["Violation Rule", "Detector Engine", "Threshold / Parameter", "Default Penalty", "Resolution Action"],
            rows: [
              ["No Face Detected", "AI Facial Detection Tensor", "> 2.5s missing face", "-10.0 pts", "On-screen warning chime + webcam snapshot"],
              ["Multiple Faces", "MediaPipe 3D Mesh", "2+ meshes with conf > 0.80", "-15.0 pts / incident", "Red alert snapshot + SuperAdmin live flag"],
              ["Gaze Deviation", "Iris landmark ray-tracing", "Yaw > 28° or Pitch > 22° for > 3.0s", "-4.0 pts", "Yellow flag indicator in session audit log"],
              ["Mobile Device In Frame", "Object Detection Engine", "'cell phone' class with conf > 0.72", "-25.0 pts / frame", "Critical violation snapshot + strike + SMS alert"],
              ["Window Blur / Tab Switch", "HTML5 Page Visibility API", "document.hidden === true", "-8.0 pts / switch", "Full-screen lock overlay + strike count banner"],
              ["Audio Anomaly / Voice", "Web Audio API FFT Analyser", "Frequency 300Hz-3.4kHz > -24 dBFS", "-5.0 pts", "10-second ambient audio clip captured"]
            ]
          },
          sections: [
            {
              heading: "Iris Landmark Vector & Gaze Tracking",
              subheading: "Mathematical eye vector calculation",
              body: [
                "The proctoring engine extracts 468 facial landmark coordinates in real-time. Gaze vector calculation measures the Euclidean distance between the center iris pupil landmarks relative to the medial and lateral canthi.",
                "If the calculated gaze angle deviates past ±28° horizontally or ±22° vertically for longer than 3,000ms continuously, a GAZE_ANOMALY incident is registered."
              ]
            },
            {
              heading: "Integrity Trust Score Algorithm",
              subheading: "Non-linear decay penalty formula",
              body: [
                "Every assessment starts with an Integrity Trust Score of 100.0%. As violations occur, points are deducted with exponential severity weighting for repeat offenses.",
                "Trust Score Formula: Score = max(0, 100 - SUM(weight * confidence * (1 + 0.25 * occurrence_index)))"
              ],
              callout: {
                type: "warning",
                title: "Automated Disqualification Safeguard",
                text: "If an assessment's Trust Score falls below 50.0% or tab-switches exceed the test blueprint limit, the session is placed in AUTO_LOCKED state pending administrative review."
              }
            }
          ]
        }
      },
      {
        id: "dual-camera-proctoring",
        title: "Secondary Mobile & 360° Room Sync",
        slug: "dual-camera-proctoring",
        description: "QR-code instant pairing system allowing candidates' smartphones to act as secondary environmental cameras.",
        category: "AI Proctoring",
        readTime: "7 min read",
        updatedAt: "2026-08-01",
        tags: ["WebRTC", "Mobile Sync", "Dual Camera", "Room Scan"],
        content: {
          summary: "Secondary camera syncing eliminates peripheral blind spots by capturing candidate side-profile, keyboard hand placement, and room perimeter in real-time WebRTC streams.",
          sections: [
            {
              heading: "QR Pairing Handshake Protocol",
              subheading: "Zero-app smartphone browser streaming pipeline",
              body: [
                "1. Laptop screen renders an ephemeral cryptographically salted QR code containing a one-time WebRTC room token.",
                "2. Candidate scans the QR with any standard smartphone browser without installing any mobile application.",
                "3. A peer-to-peer WebRTC MediaStream is negotiated via STUN/TURN relays.",
                "4. Secondary stream streams 720p 15fps side-profile video straight into the SuperAdmin proctoring cockpit."
              ]
            }
          ]
        }
      }
    ]
  },
  {
    id: "dsa-ide-runner",
    title: "DSA Code Engine & Sandbox",
    badge: "Monaco / Sandbox",
    articles: [
      {
        id: "ide-runtime-env",
        title: "Compiler Specs & Execution Limits",
        slug: "dsa-ide-sandboxing",
        description: "Comprehensive runtime specifications, compiler flags, memory barriers, and system call filtering across 25+ programming languages.",
        category: "Code Engine",
        readTime: "9 min read",
        updatedAt: "2026-08-01",
        tags: ["Monaco IDE", "Compilers", "C++", "Java", "Python", "Rust", "Go"],
        content: {
          summary: "Gryphon 360 incorporates Microsoft Monaco Editor paired with ultra-low latency sandboxed worker nodes supporting 25+ programming languages with automated hidden test case diffing.",
          quickReference: {
            headers: ["Language", "Compiler / Engine", "Optimization Flag", "Default CPU Limit", "Memory Cap"],
            rows: [
              ["C++ (20)", "GCC 13.2 / Clang 17", "-O3 -std=c++20", "1.0 second", "256 MB"],
              ["Java (21 LTS)", "OpenJDK 21 Hotspot", "-XX:+UseG1GC -Xmx384m", "2.0 seconds", "512 MB"],
              ["Python 3", "CPython 3.12.3", "-O -B (bytecode off)", "3.0 seconds", "256 MB"],
              ["JavaScript (ES2024)", "Node.js 20.14 LTS", "--max-old-space-size=256", "2.0 seconds", "256 MB"],
              ["TypeScript (5.4)", "tsc + Node.js 20.x", "--target ES2022", "2.5 seconds", "256 MB"],
              ["Go (1.22)", "gc standard compiler", "-gcflags=-N -l", "1.5 seconds", "256 MB"],
              ["Rust (2021)", "rustc 1.78 stable", "--opt-level=3", "1.0 second", "256 MB"],
              ["SQL (PostgreSQL)", "PostgreSQL 16 engine", "EXPLAIN ANALYZE ON", "2.0 seconds", "128 MB"]
            ]
          },
          sections: [
            {
              heading: "Sandbox Security & Isolation Barriers",
              subheading: "Linux cgroups v2, seccomp, and network isolation",
              body: [
                "To prevent untrusted candidate code from executing fork bombs, memory denial-of-service, or network exfiltration, our sandboxes enforce strict security profiles:",
                "1. Network Disabled: Containers run with zero external network access. Sockets return EPERM instantly.",
                "2. Memory OOM Guards: Hard memory caps terminate processes exceeding limits with exit code 137 (Memory Limit Exceeded).",
                "3. Process Limits: Fork bombs are neutralized via strict process limits.",
                "4. Read-Only Root Filesystem: Candidate code can only write to ephemeral in-memory storage."
              ]
            }
          ]
        }
      },
      {
        id: "monaco-editor-features",
        title: "Monaco IDE Keybindings & Anti-Paste",
        slug: "monaco-editor-features",
        description: "Monaco code editor customization, syntax highlighting, autocompletion, paste interception, and keystroke replay logging.",
        category: "Code Engine",
        readTime: "6 min read",
        updatedAt: "2026-08-01",
        tags: ["Monaco", "IDE", "Anti-Paste", "Keystroke"],
        content: {
          summary: "The candidate IDE features customized VS Code keybindings, IntelliSense autocomplete, bracket matching, and cryptographic keystroke replay.",
          sections: [
            {
              heading: "Clipboard Interception & Keystroke Velocity",
              body: [
                "External paste operations from outside the test browser are blocked. All typing is recorded with timestamped keystroke deltas to graph typing velocity and flag sudden 500-character code dumps.",
                "Evaluators can hit 'Replay Keystrokes' on candidate submissions to watch character-by-character coding evolution and detect AI-generated snippet injection."
              ]
            }
          ]
        }
      }
    ]
  },
  {
    id: "question-bank-schemas",
    title: "Question Bank & Taxonomies",
    badge: "Data Specs",
    articles: [
      {
        id: "question-schema-json",
        title: "JSON & Excel Schema Specification",
        slug: "question-bank-schemas",
        description: "Standardized schemas for importing MCQs, Algorithmic Coding Problems, and Subjective Case Studies.",
        category: "Question Bank",
        readTime: "8 min read",
        updatedAt: "2026-08-01",
        tags: ["Schema", "Question Bank", "Bulk Upload", "Excel", "JSON"],
        content: {
          summary: "Learn how to format question banks for instantaneous validation and bulk ingestion into Gryphon 360 with automated test case verification.",
          sections: [
            {
              heading: "MCQ Bulk Upload Excel Columns",
              subheading: "Mandatory spreadsheet columns for Excel uploads",
              table: {
                headers: ["Column Header", "Type", "Allowed Values / Format", "Example"],
                rows: [
                  ["Title", "String", "Brief question summary", "Time Complexity of Quicksort"],
                  ["Description", "String (Markdown)", "Full question prompt", "What is the average time complexity of randomized quicksort?"],
                  ["Subject", "String", "Must match registered subject name", "Data Structures & Algorithms"],
                  ["Difficulty", "Enum", "EASY, MEDIUM, HARD, EXPERT", "MEDIUM"],
                  ["Score", "Integer", "1 to 100", "10"],
                  ["Option A", "String", "First answer option", "O(N log N)"],
                  ["Option B", "String", "Second answer option", "O(N^2)"],
                  ["Option C", "String", "Third answer option", "O(N)"],
                  ["Option D", "String", "Fourth answer option", "O(log N)"],
                  ["Correct Option", "String", "A, B, C, or D", "A"],
                  ["Explanation", "String", "Optional post-test explanation", "Randomized pivot guarantees O(N log N) expected time."]
                ]
              }
            }
          ]
        }
      },
      {
        id: "taxonomy-bloom",
        title: "Bloom's Taxonomy & Psychometrics",
        slug: "taxonomy-bloom-irt",
        description: "Cognitive level classification (Remember to Create), discrimination index (D), and difficulty calibration (p-value).",
        category: "Question Bank",
        readTime: "8 min read",
        updatedAt: "2026-08-01",
        tags: ["Bloom", "IRT", "Psychometrics", "Calibration"],
        content: {
          summary: "Gryphon 360 classifies every question against Bloom's 6 cognitive levels and continuously calibrates difficulty p-value and discrimination index D based on candidate historical performance.",
          sections: [
            {
              heading: "Cognitive Levels Classification",
              body: [
                "Questions are mapped across REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, and CREATE to generate balanced multi-dimensional candidate scorecards.",
                "Discrimination Index (D): Measures question quality. Questions with D < 0.20 are flagged for revision."
              ]
            }
          ]
        }
      }
    ]
  }
];
