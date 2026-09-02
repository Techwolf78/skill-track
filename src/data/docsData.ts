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
        description: "Exhaustive technical blueprint of RxOne SkillTrack distributed microservices, state machines, and real-time execution engines.",
        category: "Getting Started",
        readTime: "12 min read",
        updatedAt: "2026-06-30",
        tags: ["Architecture", "Infrastructure", "Microservices", "Security", "High Availability"],
        content: {
          summary: "RxOne SkillTrack is an ultra-low latency, multi-tenant automated skill evaluation and proctoring platform designed to evaluate tens of thousands of concurrent candidates with sub-15ms database query response and 0% degradation under peak national load.",
          quickReference: {
            headers: ["Tier Layer", "Technology", "Protocol / Spec", "Scaling Profile"],
            rows: [
              ["Edge Client", "React 18 + TypeScript + Vite + WebGL", "HTTPS / WSS / WebRTC", "Client-side compute offload"],
              ["Ingestion Gateway", "Envoy Proxy + Anycast CDN", "TLS 1.3 / HTTP/2 & gRPC", "Global multi-region anycast routing"],
              ["Core Services", "Spring Boot 4 / Java 21 LTS", "REST + GraphQL + Spring Security", "Stateless horizontal pod autoscaling (HPA)"],
              ["State Store & Cache", "Redis 7 Cluster + DragonflyDB", "RESP protocol (In-memory)", "Sub-millisecond session state locks"],
              ["Primary DB", "PostgreSQL 16 (Multi-AZ + Read Replicas)", "ACID Row Level Security (RLS)", "Partitioned by tenant_id & test_id"],
              ["Execution Workers", "Judge0 Sandbox / Linux cgroups v2", "Isolated gVisor container runtime", "Auto-scaled dedicated worker pools"]
            ]
          },
          sections: [
            {
              heading: "Core Architecture Topology",
              subheading: "Four-tier decoupled microservice distribution",
              body: [
                "RxOne separates compute-intensive client proctoring analysis, candidate test evaluation, and secure code compilation into sovereign layers to ensure fault isolation.",
                "1. Client Edge Layer: Handles Monaco Editor runtime, real-time media streams, WebGL BlazeFace neural inference, and telemetry packet signing.",
                "2. Application Gateway & Auth Cluster: Handles JWT token verification, Rate-limiting token buckets, tenant routing, and biometric snapshot authorization.",
                "3. Core Assessment State Machine: Persists assessment lifecycle transitions (SCHEDULED -> IN_PROGRESS -> SUBMITTED -> EVALUATED) in PostgreSQL with atomic Redis lock guards.",
                "4. Isolated Execution Sandboxes: Executes untrusted candidate source code inside ephemeral, zero-network Docker / gVisor sandboxes with strict CPU, memory, and syscall constraints."
              ],
              callout: {
                type: "tip",
                title: "Stateless Worker Architecture",
                text: "All assessment sessions are stored with write-through snapshots into distributed Redis clusters. Even if a candidate's internet disconnects for 15 minutes, their exact code editor state, proctoring timeline, and timer synchronization resume instantly upon reconnecting."
              }
            },
            {
              heading: "Session State Transition Matrix",
              subheading: "Formal lifecycle specification for test attempts",
              body: [
                "Every candidate test attempt transitions through deterministic states managed by the Spring Boot state-machine engine. Any invalid state transition (e.g. attempting to submit an already TERMINATED session) is rejected with HTTP 409 Conflict."
              ],
              table: {
                headers: ["Current State", "Trigger Event", "Target State", "Guard Conditions", "Side Effects"],
                rows: [
                  ["CREATED", "Candidate scans QR / verifies OTP", "INITIALIZING", "Within schedule access window & valid token", "Issues session JWT, allocates Redis bucket"],
                  ["INITIALIZING", "Webcam & system checks pass", "IN_PROGRESS", "Biometric baseline & screen share confirmed", "Starts test timer, logs start audit event"],
                  ["IN_PROGRESS", "Candidate submits test", "SUBMITTED", "All mandatory sections completed or time limit elapsed", "Triggers asynchronous evaluation worker"],
                  ["IN_PROGRESS", "Critical proctoring strikes exceeded", "DISQUALIFIED", "Proctor strikes >= max_strikes threshold", "Revokes session token, captures final snapshot"],
                  ["IN_PROGRESS", "Schedule window expires", "AUTO_SUBMITTED", "now() >= schedule.endTime + grace_period", "Forces test finalization with current state"],
                  ["SUBMITTED", "Async evaluation worker finishes", "COMPLETED", "All coding & MCQ scores tabulated", "Emits assessment.completed webhook"]
                ]
              }
            },
            {
              heading: "High-Throughput Telemetry Ingestion",
              subheading: "Edge packet structure and HMAC verification",
              body: [
                "Candidate browsers stream telemetry heartbeats every 5,000ms over encrypted WebSockets. Packets contain candidate landmark vectors, active application focus state, ambient acoustic decibels, and network RTT latency."
              ],
              paramsTable: [
                { name: "sessionId", type: "string (UUIDv4)", default: "required", description: "Unique active session identifier allocated at initialization." },
                { name: "timestamp", type: "integer (epoch ms)", default: "Date.now()", description: "UTC timestamp from high-resolution monotonic performance clock." },
                { name: "faceConfidence", type: "float (0.0 - 1.0)", default: "1.0", description: "TensorFlow BlazeFace model bounding box inference confidence." },
                { name: "faceCount", type: "integer", default: "1", description: "Total distinct facial landmark meshes identified in current camera frame." },
                { name: "gazeYaw", type: "float (degrees)", default: "0.0", description: "Horizontal head pose rotation angle (-90° to +90°)." },
                { name: "gazePitch", type: "float (degrees)", default: "0.0", description: "Vertical head pose elevation angle (-90° to +90°)." },
                { name: "tabBlurCount", type: "integer", default: "0", description: "Cumulative count of window blur / visibilityState:hidden events." },
                { name: "audioRmsLevel", type: "float (dBFS)", default: "-60.0", description: "Root-mean-square microphone acoustic power in candidate room." }
              ],
              codeSnippets: [
                {
                  language: "typescript",
                  filename: "telemetry_packet.ts",
                  code: `export interface ProctorTelemetryPacket {
  sessionId: string;
  candidateId: string;
  testId: string;
  sequenceNumber: number;
  timestamp: number;
  biometrics: {
    faceCount: number;
    faceConfidence: number;
    headPose: { yaw: number; pitch: number; roll: number };
    audioRmsDb: number;
    detectedObjects: Array<{ label: string; confidence: number }>;
  };
  system: {
    isFullscreen: boolean;
    hasFocus: boolean;
    activeTabUrl?: string;
    batteryLevel?: number;
    networkRttMs: number;
  };
  signature: string; // HMAC-SHA256 signature calculated with session secret
}`
                },
                {
                  language: "bash",
                  filename: "health_check.sh",
                  code: `# Verify Gateway and Redis Cluster health
curl -X GET "https://api.rxone.io/v1/system/health" \\
  -H "Authorization: Bearer rx_live_sec_99481827491" \\
  -H "Content-Type: application/json"

# Response:
# {
#   "status": "UP",
#   "cluster": "prod-ap-south-1",
#   "activeSessions": 14280,
#   "dbLatencyMs": 3.4,
#   "redisRttMs": 0.8,
#   "judge0QueueDepth": 12
# }`
                }
              ]
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
        updatedAt: "2026-06-28",
        tags: ["Workflow", "Organisations", "RBAC", "Provisioning"],
        content: {
          summary: "Step-by-step master administrative guide to configuring enterprise tenants, assigning granular RBAC roles, assembling multi-subject assessment blueprints, and dispatching candidate invitation batches.",
          quickReference: {
            headers: ["Step", "Action Item", "Admin Panel View", "Output Generated"],
            rows: [
              ["01", "Provision Organization", "SuperAdmin > Organisations", "Unique Tenant Workspace & RLS Partition"],
              ["02", "Configure Admin Users", "SuperAdmin > Users & RBAC", "Encrypted Credentials & Invite Email"],
              ["03", "Build Subject Blueprint", "Admin > Question Bank", "Subject Taxonomies & Tagged Problem Sets"],
              ["04", "Assemble Test Structure", "Admin > Test Create", "Timer Rules, Negative Marking & Cutoffs"],
              ["05", "Set Proctoring Policy", "Admin > Test Edit > Proctoring", "Webcam, Iris Tracking & Max Tab Switches"],
              ["06", "Dispatch Batch Invites", "Admin > Invite Candidates", "Unique Magic URLs & QR Code Passports"]
            ]
          },
          sections: [
            {
              heading: "Step 1: Multi-Tenant Organization Registration",
              subheading: "Database isolation and workspace initialization",
              body: [
                "Navigate to SuperAdmin > Organisations. Each organization is an isolated sovereign workspace with its own candidate directory, custom question library, dedicated webhook routing, and custom subdomain.",
                "Organization codes must be unique alphanumeric identifiers (e.g. `TCS`, `INFY`, `ACCENTURE`) which form the tenant partition key in the database."
              ],
              callout: {
                type: "note",
                title: "Row-Level Security (RLS)",
                text: "PostgreSQL multi-tenancy is enforced at the database kernel level via SET LOCAL app.current_org_id = ?. Cross-tenant data leaks are physically impossible even in custom SQL queries."
              }
            },
            {
              heading: "Step 2: RBAC Matrix & Role Permissions",
              subheading: "Role hierarchy and administrative scope",
              body: [
                "RxOne enforces a hierarchical RBAC permission tree. Users can be assigned one or more roles within their organization."
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
            },
            {
              heading: "Step 3: Test Creation & Proctoring Policy Formulation",
              subheading: "Fine-tuning strictness and threshold parameters",
              body: [
                "When creating a test, administrators configure test duration, section-level time limits, randomized question pools, and proctoring strictness tiers.",
                "Strictness Tiers: (1) Lenient (Practice / Mock exams with warnings only), (2) Standard (Campus hiring with 5 tab-switch limit), (3) High-Security National (Immediate auto-lock on mobile detection or dual face presence)."
              ]
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
        updatedAt: "2026-06-22",
        tags: ["Browsers", "WebRTC", "Compatibility", "Hardware"],
        content: {
          summary: "RxOne is engineered to execute client-side neural inference across 99.4% of modern personal computing devices without requiring any extension or software download.",
          quickReference: {
            headers: ["Browser", "Minimum Version", "WebGL 2.0", "WebRTC Streams", "Status"],
            rows: [
              ["Google Chrome", "Version 90+", "Supported", "Supported", "Fully Validated (Recommended)"],
              ["Microsoft Edge (Chromium)", "Version 90+", "Supported", "Supported", "Fully Validated"],
              ["Mozilla Firefox", "Version 88+", "Supported", "Supported", "Validated"],
              ["Apple Safari (macOS / iOS)", "Version 14.1+", "Supported", "Supported", "Validated"],
              ["Opera / Brave", "Latest Chromium", "Supported", "Supported", "Validated (Disable Shield for WebRTC)"]
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
        updatedAt: "2026-06-24",
        tags: ["SOC2", "GDPR", "Encryption", "Security"],
        content: {
          summary: "RxOne adheres to strict global data privacy standards, guaranteeing candidate biometric safety through local edge processing and zero perpetual video storage.",
          sections: [
            {
              heading: "Zero-Knowledge Biometric Processing",
              subheading: "Why client-side inference protects privacy and complies with GDPR",
              body: [
                "Unlike legacy platforms that stream and store continuous video footage of candidates in cloud buckets, RxOne processes face landmarks entirely in browser RAM using WebGL tensors.",
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
                "1. Data in Transit: TLS 1.3 enforced across all HTTP/2 API calls, WebSockets, and WebRTC Datachannels with HSTS Preload.",
                "2. Data at Rest: AES-256 GCM encryption on PostgreSQL disk volumes and Amazon S3 violation snapshot stores.",
                "3. Token Signing: RS256 asymmetric cryptographic signatures on all candidate and administrator session tokens."
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
        readTime: "14 min read",
        updatedAt: "2026-06-29",
        tags: ["TensorFlow", "BlazeFace", "CocoSSD", "Computer Vision", "Anti-Cheat"],
        content: {
          summary: "RxOne utilizes zero-latency edge inference via WebGL-accelerated neural networks inside the candidate browser, guaranteeing privacy compliance while detecting integrity breaches in sub-200ms cycles.",
          quickReference: {
            headers: ["Violation Rule", "Detector Engine", "Threshold / Parameter", "Default Penalty", "Resolution Action"],
            rows: [
              ["No Face Detected", "BlazeFace Bounding Tensor", "> 2.5s missing face", "-10.0 pts", "On-screen warning chime + webcam snapshot"],
              ["Multiple Faces", "MediaPipe 3D Mesh", "2+ meshes with conf > 0.80", "-15.0 pts / incident", "Red alert snapshot + SuperAdmin live flag"],
              ["Gaze Deviation", "Iris landmark ray-tracing", "Yaw > 28° or Pitch > 22° for > 3.0s", "-4.0 pts", "Yellow flag indicator in session audit log"],
              ["Mobile Device In Frame", "Coco-SSD Object Detection", "'cell phone' class with conf > 0.72", "-25.0 pts / frame", "Critical violation snapshot + strike + SMS alert"],
              ["Window Blur / Tab Switch", "HTML5 Page Visibility API", "document.hidden === true", "-8.0 pts / switch", "Full-screen lock overlay + strike count banner"],
              ["Audio Anomaly / Voice", "Web Audio API FFT Analyser", "Frequency 300Hz-3.4kHz > -24 dBFS", "-5.0 pts", "10-second ambient audio clip captured"]
            ]
          },
          sections: [
            {
              heading: "Iris Landmark Vector & Gaze Tracking",
              subheading: "Mathematical eye vector calculation",
              body: [
                "The proctoring engine extracts 468 facial landmark coordinates in real-time. Gaze vector calculation measures the Euclidean distance between the center iris pupil landmarks (points 468, 473) relative to the medial and lateral canthi (eye corner landmarks 33, 133, 362, 263).",
                "If the calculated gaze angle deviates past ±28° horizontally or ±22° vertically for longer than 3,000ms continuously, a GAZE_ANOMALY incident is registered."
              ],
              paramsTable: [
                { name: "gaze_yaw_threshold", type: "float (degrees)", default: "28.0", description: "Horizontal yaw angle tolerance before triggering gaze drift." },
                { name: "gaze_pitch_threshold", type: "float (degrees)", default: "22.0", description: "Vertical pitch angle tolerance before triggering gaze drift." },
                { name: "gaze_duration_ms", type: "integer (ms)", default: "3000", description: "Consecutive milliseconds looking away before incident logging." },
                { name: "face_absence_grace_ms", type: "integer (ms)", default: "2500", description: "Permissible grace period when a candidate sneezes or adjusts seat." }
              ],
              codeSnippets: [
                {
                  language: "python",
                  filename: "gaze_estimation_formula.py",
                  code: `import numpy as np

def calculate_gaze_ratio(eye_landmarks: np.ndarray, pupil_landmark: np.ndarray) -> float:
    """
    Computes horizontal gaze ratio across left/right eye bounds.
    ratio < 0.35: Looking far Left
    ratio > 0.65: Looking far Right
    0.35 <= ratio <= 0.65: Looking straight at display
    """
    left_canthus = eye_landmarks[0]
    right_canthus = eye_landmarks[1]
    
    total_eye_width = np.linalg.norm(right_canthus - left_canthus)
    pupil_dist_from_left = np.linalg.norm(pupil_landmark - left_canthus)
    
    return pupil_dist_from_left / (total_eye_width + 1e-6)`
                }
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
        updatedAt: "2026-06-25",
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
      },
      {
        id: "audio-telemetry",
        title: "Audio Acoustic & Voice Detection",
        slug: "audio-acoustic-detection",
        description: "Real-time FFT audio spectrum analysis detecting whispered conversations, second person voices, and acoustic anomalies.",
        category: "AI Proctoring",
        readTime: "6 min read",
        updatedAt: "2026-06-21",
        tags: ["Audio", "FFT", "Microphone", "Acoustics"],
        content: {
          summary: "Continuous Fourier Transform (FFT) analysis isolates human speech frequencies (300Hz - 3400Hz) from background fan/keyboard typing noise.",
          sections: [
            {
              heading: "Voice Band Spectral Filtering",
              body: [
                "Ambient noise like keyboard typing and laptop cooling fans are filtered using a high-pass Butterworth filter, isolating human speech harmonics.",
                "When human vocal formant frequencies exceed -24 dBFS for more than 2,000ms, an encrypted 10-second audio snippet is captured for evaluator review."
              ]
            }
          ]
        }
      },
      {
        id: "live-proctoring-matrix",
        title: "Live Proctoring Cockpit Operations",
        slug: "live-proctoring-cockpit",
        description: "SuperAdmin cockpit capabilities for live grid monitoring of 1,000+ candidate webcams with real-time risk sorting.",
        category: "AI Proctoring",
        readTime: "8 min read",
        updatedAt: "2026-06-27",
        tags: ["SuperAdmin", "Live Grid", "Cockpit", "Operations"],
        content: {
          summary: "The Live Proctoring Cockpit organizes thousands of live candidate feeds with automated risk-level prioritization.",
          sections: [
            {
              heading: "Automated Incident Escalation",
              body: [
                "Candidates experiencing multiple strikes are dynamically elevated to the top of the SuperAdmin live matrix with highlighted red borders.",
                "Proctors can broadcast 1-on-1 audio warnings, pause an exam, request a 360° room scan, or disqualify fraudulent test-takers with a single click."
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
    badge: "Judge0 / gVisor",
    articles: [
      {
        id: "ide-runtime-env",
        title: "Compiler Specs & Execution Limits",
        slug: "dsa-ide-sandboxing",
        description: "Comprehensive runtime specifications, compiler flags, memory barriers, and system call filtering across 25+ programming languages.",
        category: "Code Engine",
        readTime: "11 min read",
        updatedAt: "2026-06-28",
        tags: ["Monaco IDE", "Judge0", "C++", "Java", "Python", "Rust", "Go"],
        content: {
          summary: "RxOne incorporates Microsoft Monaco Editor paired with ultra-low latency gVisor sandboxed worker nodes supporting 25+ programming languages with automated hidden test case diffing.",
          quickReference: {
            headers: ["Language", "Compiler / Engine", "Optimization Flag", "Default CPU Limit", "Memory Cap", "Judge0 ID"],
            rows: [
              ["C++ (20)", "GCC 13.2 / Clang 17", "-O3 -std=c++20", "1.0 second", "256 MB", "54"],
              ["Java (21 LTS)", "OpenJDK 21 Hotspot", "-XX:+UseG1GC -Xmx384m", "2.0 seconds", "512 MB", "62"],
              ["Python 3", "CPython 3.12.3", "-O -B (bytecode off)", "3.0 seconds", "256 MB", "71"],
              ["JavaScript (ES2024)", "Node.js 20.14 LTS", "--max-old-space-size=256", "2.0 seconds", "256 MB", "63"],
              ["TypeScript (5.4)", "tsc + Node.js 20.x", "--target ES2022", "2.5 seconds", "256 MB", "74"],
              ["Go (1.22)", "gc standard compiler", "-gcflags=-N -l", "1.5 seconds", "256 MB", "60"],
              ["Rust (2021)", "rustc 1.78 stable", "--opt-level=3", "1.0 second", "256 MB", "73"],
              ["SQL (PostgreSQL)", "PostgreSQL 16 engine", "EXPLAIN ANALYZE ON", "2.0 seconds", "128 MB", "82"]
            ]
          },
          sections: [
            {
              heading: "Sandbox Security & Isolation Barriers",
              subheading: "Linux cgroups v2, seccomp, and network isolation",
              body: [
                "To prevent malicious candidate code from executing fork bombs, memory denial-of-service, or outbound socket exfiltration, Judge0 enforces strict container security profiles:",
                "1. Network Disabled: Containers are created with --net=none. All socket syscalls (connect, socket, bind) return EPERM instantly.",
                "2. Memory OOM Guards: Hard memory caps terminate processes exceeding limits with exit code 137 (SIGKILL / Memory Limit Exceeded).",
                "3. Process / Thread Limits: Fork bombs are neutralized via pids.max = 32.",
                "4. Read-Only Root Filesystem: Candidate code can only write to an ephemeral in-memory /tmp limited to 16 MB."
              ]
            },
            {
              heading: "Executing Submissions via REST API",
              subheading: "Direct submission payload and synchronous evaluation",
              body: [
                "You can programmatically submit candidate code, pass custom standard input, and assert output correctness using our Judge0 REST API gateway."
              ],
              paramsTable: [
                { name: "source_code", type: "string (utf-8 / base64)", default: "required", description: "Candidate source code string to compile and evaluate." },
                { name: "language_id", type: "integer", default: "required", description: "Target compiler ID (e.g. 71 for Python 3.12, 54 for C++20)." },
                { name: "stdin", type: "string", default: "empty", description: "Standard input provided to the process." },
                { name: "expected_output", type: "string", default: "optional", description: "Correct expected standard output string for automated diff evaluation." },
                { name: "cpu_time_limit", type: "float (seconds)", default: "2.0", description: "Maximum allowable CPU time in seconds before SIGXCPU." },
                { name: "memory_limit", type: "integer (KB)", default: "262144", description: "Maximum memory allocation in Kilobytes (default: 256MB)." }
              ],
              codeSnippets: [
                {
                  language: "bash",
                  filename: "submit_code.sh",
                  code: `curl -X POST "https://judge0.rxone.io/submissions?base64_encoded=false&wait=true" \\
  -H "X-Auth-Token: rx_live_judge0_token_98471" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source_code": "import sys, json\\ndef solve():\\n    lines = sys.stdin.read().splitlines()\\n    nums = list(map(int, lines[0].split()))\\n    print(sum(nums))\\nsolve()",
    "language_id": 71,
    "stdin": "10 20 30 40",
    "expected_output": "100",
    "cpu_time_limit": 2.0,
    "memory_limit": 262144
  }'`
                }
              ]
            }
          ]
        }
      },
      {
        id: "driver-template-preflight",
        title: "Driver Templates & Preflight Check",
        slug: "driver-templates-preflight",
        description: "Authoring-time driver verification, multi-language stubs, and hidden test case harness injection.",
        category: "Code Engine",
        readTime: "8 min read",
        updatedAt: "2026-06-29",
        tags: ["Preflight", "Drivers", "Test Harness", "Validation"],
        content: {
          summary: "Preflight validation compiles and executes reference solutions against custom driver templates across all enabled languages prior to publishing questions.",
          sections: [
            {
              heading: "Automated Preflight Pipeline",
              body: [
                "When an admin saves a coding question, the backend automatically dispatches test executions across C++, Java, Python, and TypeScript to verify that driver harnesses parse inputs and format outputs without syntax errors.",
                "Driver harnesses automatically wrap candidate functions with standard I/O deserializers (e.g. converting string input '[2,7,11,15]' into int[] in Java or vector<int> in C++)."
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
        updatedAt: "2026-06-23",
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
        updatedAt: "2026-06-20",
        tags: ["Schema", "Question Bank", "Bulk Upload", "Excel", "JSON"],
        content: {
          summary: "Learn how to format question banks for instantaneous validation and bulk ingestion into RxOne with automated test case verification.",
          sections: [
            {
              heading: "Algorithmic Coding Problem Schema",
              subheading: "Structure for automated compiler evaluation problems",
              body: [
                "Coding questions must include starter templates (code_stubs), language-specific drivers, and test cases with is_hidden visibility flags."
              ],
              codeSnippets: [
                {
                  language: "json",
                  filename: "coding_question_schema.json",
                  code: `{
  "title": "Median of Two Sorted Arrays",
  "difficulty": "HARD",
  "domain": "ENGINEERING",
  "subject_code": "CS_DSA",
  "cognitive_level": "ANALYZE",
  "score": 50,
  "tags": ["Array", "Binary Search", "Divide and Conquer"],
  "time_limit_ms": 1500,
  "memory_limit_mb": 256,
  "description_markdown": "Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return the median of the two sorted arrays.",
  "code_stubs": {
    "cpp": "class Solution {\\npublic:\\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\\n    }\\n};",
    "python": "class Solution:\\n    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\\n        pass"
  },
  "test_cases": [
    { "input": "[1,3]\\n[2]", "expected_output": "2.00000", "is_hidden": false, "weight": 20 },
    { "input": "[1,2]\\n[3,4]", "expected_output": "2.50000", "is_hidden": false, "weight": 20 },
    { "input": "[0,0]\\n[0,0]", "expected_output": "0.00000", "is_hidden": true, "weight": 30 },
    { "input": "[]\\n[1]", "expected_output": "1.00000", "is_hidden": true, "weight": 30 }
  ]
}`
                }
              ]
            },
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
        readTime: "9 min read",
        updatedAt: "2026-06-26",
        tags: ["Bloom", "IRT", "Psychometrics", "Calibration"],
        content: {
          summary: "RxOne classifies every question against Bloom's 6 cognitive levels and continuously calibrates difficulty p-value and discrimination index D based on candidate historical performance.",
          sections: [
            {
              heading: "Cognitive Levels Classification",
              body: [
                "Questions are mapped across REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, and CREATE to generate balanced multi-dimensional candidate scorecards.",
                "Discrimination Index (D): Measures question quality (D = (Upper 27% Correct - Lower 27% Correct) / N). Questions with D < 0.20 are flagged for revision."
              ]
            }
          ]
        }
      },
      {
        id: "bulk-upload-guide",
        title: "Excel Bulk Upload & Validation",
        slug: "excel-bulk-upload-guide",
        description: "Master template guide for uploading 5,000+ MCQs via Excel (.xlsx) with instant validation error logs.",
        category: "Question Bank",
        readTime: "6 min read",
        updatedAt: "2026-06-24",
        tags: ["Excel", "Bulk Upload", "Spreadsheet", "Validation"],
        content: {
          summary: "Upload thousands of questions simultaneously with automatic cell validation, duplicate detection, and LaTeX formula support.",
          sections: [
            {
              heading: "Uploading Question Banks via XLSX",
              body: [
                "Download the standard RxOne XLSX template from SuperAdmin > Question Bank > Import Questions. Fill in subject codes, options, and correct answers before uploading.",
                "Validation reports show exact row-number errors if any option is empty or subject code does not exist."
              ]
            }
          ]
        }
      }
    ]
  },
  {
    id: "rest-api-webhooks",
    title: "REST APIs & Webhooks",
    badge: "Developer API",
    articles: [
      {
        id: "api-reference",
        title: "REST Endpoints & Authentication",
        slug: "api-reference",
        description: "Complete HTTP reference for candidate dispatch, real-time proctoring telemetry feeds, and results webhooks.",
        category: "REST API",
        readTime: "10 min read",
        updatedAt: "2026-06-30",
        tags: ["REST", "API", "Webhooks", "JSON", "HMAC"],
        content: {
          summary: "Seamlessly integrate RxOne into your enterprise HRMS, LMS (Canvas, Blackboard, Moodle), or internal recruiting portals using our REST endpoints and cryptographically signed webhooks.",
          quickReference: {
            headers: ["HTTP Method", "Path", "Description", "Auth Role"],
            rows: [
              ["POST", "/api/v1/auth/login", "Authenticate administrative user and receive JWT session", "Public"],
              ["GET", "/api/v1/organisations", "Retrieve all tenant organizations", "SUPERADMIN"],
              ["POST", "/api/v1/tests", "Create new test blueprint with proctoring sensitivity", "ADMIN / SUPERADMIN"],
              ["POST", "/api/v1/tests/:testId/schedules", "Schedule new candidate assessment drive", "ADMIN / SUPERADMIN"],
              ["POST", "/api/v1/invitations/bulk", "Batch dispatch candidate assessment invites via email/SMS", "ADMIN"],
              ["GET", "/api/v1/results/:candidateId", "Retrieve comprehensive scorecard and code submissions", "ADMIN / EVALUATOR"],
              ["GET", "/api/v1/proctoring/:sessionId/audit", "Export granular timeline of all biometric flags & snapshots", "ADMIN / SUPERADMIN"],
              ["POST", "/api/v1/webhooks/subscribe", "Register webhook listener for real-time lifecycle events", "ADMIN / SUPERADMIN"]
            ]
          },
          sections: [
            {
              heading: "Authentication & Header Convention",
              body: [
                "All administrative requests must supply an API Secret Key generated in SuperAdmin > Settings > API Keys.",
                "Header: Authorization: Bearer rx_live_sec_****************"
              ],
              paramsTable: [
                { name: "Authorization", type: "Header string", default: "required", description: "Bearer token with live API key format rx_live_sec_..." },
                { name: "X-Organisation-Id", type: "Header UUID", default: "optional", description: "Explicit organization scope (mandatory when using SuperAdmin master key)." },
                { name: "Content-Type", type: "Header string", default: "application/json", description: "MIME type for request bodies." }
              ],
              codeSnippets: [
                {
                  language: "typescript",
                  filename: "create_assessment_drive.ts",
                  code: `import axios from 'axios';

const RXONE_API_KEY = process.env.RXONE_SECRET_KEY;

export async function scheduleAssessmentDrive() {
  const response = await axios.post(
    'https://api.rxone.io/v1/tests/test_8947291a/schedules',
    {
      title: "Graduate SDE-1 Hiring Assessment 2026",
      startTime: "2026-08-01T09:00:00Z",
      endTime: "2026-08-01T21:00:00Z",
      durationMinutes: 90,
      proctoringConfig: {
        webcamRequired: true,
        screenShareRequired: true,
        aiFaceTracking: true,
        maxTabSwitches: 3
      },
      candidateEmails: ["alex.dev@mit.edu", "sara.lee@stanford.edu"]
    },
    {
      headers: {
        Authorization: \`Bearer \${RXONE_API_KEY}\`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Schedule Created. Total Invitations Queued:', response.data.invitationsCount);
}`
                }
              ]
            }
          ]
        }
      },
      {
        id: "webhook-event-catalog",
        title: "Webhook Events & HMAC Verification",
        slug: "webhook-event-catalog",
        description: "Event catalog (assessment.completed, proctor.violation, candidate.registered) and cryptographic SHA-256 HMAC verification.",
        category: "REST API",
        readTime: "7 min read",
        updatedAt: "2026-06-27",
        tags: ["Webhooks", "HMAC", "Events", "Integrations"],
        content: {
          summary: "Receive instant server-to-server push notifications when candidates start tests, commit critical cheating strikes, or submit their scorecards.",
          sections: [
            {
              heading: "Verifying Webhook Signatures",
              body: [
                "Every webhook payload includes the header X-RxOne-Signature: sha256=... computed using your webhook signing secret.",
                "Always verify the HMAC before parsing the payload to prevent man-in-the-middle spoofing."
              ],
              codeSnippets: [
                {
                  language: "typescript",
                  filename: "verify_webhook.ts",
                  code: `import crypto from 'crypto';

export function verifyRxOneWebhook(rawBody: string, signatureHeader: string, secretKey: string): boolean {
  const calculatedSig = 'sha256=' + crypto
    .createHmac('sha256', secretKey)
    .update(rawBody, 'utf8')
    .digest('hex');
    
  return crypto.timingSafeEqual(Buffer.from(calculatedSig), Buffer.from(signatureHeader));
}`
                }
              ]
            }
          ]
        }
      }
    ]
  },
  {
    id: "deployment-cloud",
    title: "Airtel Cloud Infrastructure",
    badge: "Cloud Setup",
    articles: [
      {
        id: "airtel-cloud-setup",
        title: "Airtel Cloud 2-VM Setup & Sizing",
        slug: "airtel-cloud-setup",
        description: "Official Airtel Cloud (Xtelify) 2-VM deployment architecture: App Server (ccs.xlarge) + Database (ccs.large).",
        category: "Infrastructure",
        readTime: "7 min read",
        updatedAt: "2026-08-18",
        tags: ["Airtel Cloud", "Ubuntu", "PostgreSQL", "Spring Boot", "Redis", "Nginx"],
        content: {
          summary: "RxOne runs on an efficient, high-performance 2-VM architecture hosted on Airtel Cloud (Xtelify Limited) with dedicated PostgreSQL database, in-memory Redis caching, and automated 300GB backup storage.",
          quickReference: {
            headers: ["Server Node", "Assigned Workload", "Hardware Spec", "Airtel SKU", "Monthly Cost"],
            rows: [
              ["VM 1: App Server", "Spring Boot 4 + Redis 7 + Nginx SSL", "4 vCPU, 16 GB RAM, 100 GB SSD", "ccs.xlarge", "₹9,960"],
              ["VM 2: Database", "Dedicated PostgreSQL 16 DB Server", "2 vCPU, 8 GB RAM, 100 GB SSD", "ccs.Large_2vCPU_8Gb", "₹5,290"],
              ["Backup Storage", "Automated Daily DB Dumps", "300 GB Cloud Storage", "bac.activate", "₹2,640"],
              ["Object Storage", "Candidate Snapshots & Recordings", "250 GB S3 Storage", "objsto.stalow", "₹450"],
              ["Public IP", "Static IPv4 for Ingress Gateway", "1 Static IP", "internet.publicip", "₹264"]
            ]
          },
          sections: [
            {
              heading: "Airtel Cloud Architecture Topology",
              subheading: "Clean 2-tier decoupled compute and database distribution",
              body: [
                "1. VM 1 (App Server): Hosts the Spring Boot 4 application (port 8081), local high-speed Redis 7 instance (port 6379), and Nginx reverse proxy with automated Let's Encrypt SSL.",
                "2. VM 2 (Database Server): Dedicated PostgreSQL 16 node protected by UFW firewall, accepting connections strictly from VM 1's private IP."
              ],
              callout: {
                type: "success",
                title: "Fixed Monthly Commercials",
                text: "Total monthly commitment: ₹18,370.24 + 18% GST = ₹21,676.88 under PO Ref GA/26-27/IT/04."
              }
            },
            {
              heading: "Step-by-Step Setup Guide",
              subheading: "Database setup on VM 2 and Spring Boot service on VM 1",
              body: [
                "Step 1 (VM 2): Install PostgreSQL 16, create the rxone database, and allow inbound traffic from VM 1 private IP in pg_hba.conf.",
                "Step 2 (VM 1): Install Java 21 LTS, Redis, Nginx, and configure /etc/rxone/rxone.env with database credentials.",
                "Step 3 (VM 1): Create systemd service /etc/systemd/system/rxone.service for auto-restart on boot and configure Nginx proxy."
              ],
              codeSnippets: [
                {
                  language: "env",
                  filename: "/etc/rxone/rxone.env",
                  code: `SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8081

# Database (pointing to VM 2 Private IP)
SPRING_DATASOURCE_URL=jdbc:postgresql://<VM2_PRIVATE_IP>:5432/rxone
SPRING_DATASOURCE_USERNAME=rxone_user
SPRING_DATASOURCE_PASSWORD=YourStrongDbPassword123

# In-Memory Redis Cache (VM 1 localhost)
SPRING_DATA_REDIS_HOST=127.0.0.1
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=YourStrongRedisPassword123

JWT_SECRET=your_super_secret_jwt_key_here`
                }
              ]
            }
          ]
        }
      }
    ]
  }
];

