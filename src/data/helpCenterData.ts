export interface HelpCodeSnippet {
  language: string;
  code: string;
  filename?: string;
}

export interface HelpParamRow {
  name: string;
  type: string;
  default?: string;
  description: string;
}

export interface HelpSubSection {
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
  paramsTable?: HelpParamRow[];
  codeSnippets?: HelpCodeSnippet[];
}

export interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  category:
    | "candidate"
    | "recruiter"
    | "university"
    | "proctoring"
    | "compilers";
  categoryLabel: string;
  readTime: string;
  updatedAt: string;
  popular?: boolean;
  tags: string[];
  content: {
    summary: string;
    quickReference?: {
      headers: string[];
      rows: string[][];
    };
    sections: HelpSubSection[];
  };
}

export interface HelpCategory {
  id: "candidate" | "recruiter" | "university" | "proctoring" | "compilers";
  label: string;
  badge: string;
  iconName: string;
  description: string;
  articleCount: number;
}

export interface ErrorCodeItem {
  code: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  symptom: string;
  rootCause: string;
  resolutionSteps: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category:
    | "General"
    | "Candidates"
    | "Recruiters"
    | "Proctoring"
    | "Coding Engine"
    | "Security & Privacy";
  tags: string[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "candidate",
    label: "Candidates & Students",
    badge: "Test Takers",
    iconName: "GraduationCap",
    description:
      "Test access, Monaco IDE guide, proctoring rules, and scorecards.",
    articleCount: 5,
  },
  {
    id: "recruiter",
    label: "Recruiters & Evaluators",
    badge: "Hiring Teams",
    iconName: "Briefcase",
    description:
      "Question bank authoring, Excel bulk uploads, and test scheduling.",
    articleCount: 4,
  },
  {
    id: "university",
    label: "Colleges & Universities",
    badge: "Institutions",
    iconName: "Building2",
    description:
      "Department rosters, high-load semester exams, and faculty grading.",
    articleCount: 2,
  },
  {
    id: "proctoring",
    label: "AI Proctoring & Anti-Cheat",
    badge: "Integrity AI",
    iconName: "ShieldAlert",
    description: "Edge 3D face mesh, gaze heuristics, and 3-strike tab policy.",
    articleCount: 2,
  },
  {
    id: "compilers",
    label: "Coding & Compilers",
    badge: "Language Specs",
    iconName: "Code2",
    description:
      "Supported compilers, CPU/memory limits, and custom test cases.",
    articleCount: 3,
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // CANDIDATE ARTICLES
  {
    id: "cand-preflight-guide",
    title: "System Requirements, Browser Permissions & Setup Guide",
    slug: "candidate-system-requirements-browser-setup",
    description:
      "Official device guidelines: supported browsers (Chrome, Edge, Firefox), camera/microphone permissions, and minimum network bandwidth.",
    category: "candidate",
    categoryLabel: "Candidates & Students",
    readTime: "4 min read",
    updatedAt: "2026-08-15",
    popular: true,
    tags: [
      "System Setup",
      "Webcam",
      "Microphone",
      "Browser Permissions",
      "Bandwidth",
    ],
    content: {
      summary:
        "Before entering any proctored assessment, candidates must clear our automated 5-point diagnostic. This ensures your browser, camera, audio, and network meet all testing standards so you experience zero interruptions.",
      quickReference: {
        headers: [
          "Diagnostic Check",
          "Minimum Standard",
          "Recommended",
          "Auto-Remediation",
        ],
        rows: [
          [
            "Webcam Video Stream",
            "640x480 @ 15 FPS",
            "1280x720 (720p) @ 30 FPS",
            "Grant browser camera permissions in address bar (lock icon)",
          ],
          [
            "Microphone RMS Level",
            "> -45 dBFS input signal",
            "Clean directional mic (built-in or USB)",
            "Select correct default recording device in OS settings",
          ],
          [
            "GPU / WebGL 2.0",
            "WebGL 2.0 context enabled",
            "Hardware Acceleration ON",
            "Enable 'Use hardware acceleration when available' in Chrome",
          ],
          [
            "Network Latency & Bandwidth",
            "< 250ms RTT / 256 kbps",
            "< 60ms RTT / 2.0 Mbps+",
            "Disconnect VPNs, proxies, and pause background downloads",
          ],
          [
            "Fullscreen & Display",
            "1024x768 resolution",
            "1920x1080 FHD display",
            "Allow Fullscreen prompt when prompted on start",
          ],
        ],
      },
      sections: [
        {
          heading: "Step-by-Step Diagnostic Protocol",
          body: [
            "1. Camera Access: Click 'Allow' when your browser asks for camera permissions. Ensure your face is centered in the oval bounding box with balanced room lighting.",
            "2. Microphone Test: Speak aloud to verify the volume meter responds dynamically. Avoid noisy environments with loud background chatter.",
            "3. WebGL Tensor Acceleration: The platform executes lightweight AI face-mesh models directly in your browser RAM using WebGL 2.0. No video footage is ever uploaded to external cloud storage.",
            "4. Network Latency Ping: The system pings our nearest Anycast edge gateway to verify packet round-trip time (RTT) is under 200ms.",
            "5. Fullscreen Mode Lock: Entering the test will lock the viewport into fullscreen mode to protect test integrity.",
          ],
          callout: {
            type: "tip",
            title: "Quick Permission Fix in Chrome & Edge",
            text: "If camera or microphone access is blocked, click the 'Tune / Padlock' icon on the left side of your browser URL address bar, toggle Camera and Microphone to 'Allow', and refresh the page.",
          },
        },
      ],
    },
  },
  {
    id: "cand-magic-link-otp",
    title: "Accessing Your Test via Magic Link, Token or 6-Digit OTP",
    slug: "candidate-magic-link-otp-access",
    description:
      "How to authenticate using secure 1-click Magic Links, plaintext invite tokens, or 6-digit cryptographic OTPs sent via email.",
    category: "candidate",
    categoryLabel: "Candidates & Students",
    readTime: "5 min read",
    updatedAt: "2026-08-10",
    popular: true,
    tags: ["Magic Link", "OTP", "Invitations", "Access Token", "Passwordless"],
    content: {
      summary:
        "Gryphon 360 features passwordless, high-security authentication. Candidates receive an invitation email containing a direct 1-click Magic Link and a backup 6-digit OTP code.",
      sections: [
        {
          heading: "Option 1: Direct Magic Link Access",
          body: [
            "Open your invitation email from 'Gryphon 360 Assessments' and click 'Start Assessment'.",
            "The magic link contains an encrypted 64-character token (`/test/access/{invitationId}/{token}`).",
            "The backend performs constant-time verification and issues your secure Candidate JWT session instantly.",
          ],
        },
        {
          heading: "Option 2: 6-Digit OTP Code Verification",
          body: [
            "If you are using a different device or opening the test URL directly, enter your registered email address and request an OTP.",
            "A 6-digit cryptographic code (valid for 15 minutes) is dispatched to your inbox.",
            "Enter the 6-digit code to unlock your test session.",
          ],
          callout: {
            type: "warning",
            title: "Rate Limiting Safeguard",
            text: "OTP requests are limited to 1 per 60 seconds (max 5 per 30 minutes) to prevent inbox flooding. Verification allows up to 10 attempts before a 15-minute temporary security cooldown.",
          },
        },
      ],
    },
  },
  {
    id: "cand-monaco-ide-guide",
    title: "Monaco Code Editor & Coding Assessment Guide",
    slug: "candidate-monaco-code-editor-guide",
    description:
      "Complete guide to Monaco IDE keybindings, multi-language switching (C++, Java, Python, TS, Go, Rust), custom test case runner, and anti-paste safeguards.",
    category: "candidate",
    categoryLabel: "Candidates & Students",
    readTime: "7 min read",
    updatedAt: "2026-08-01",
    popular: true,
    tags: [
      "Monaco IDE",
      "Coding",
      "Compiler",
      "Keybindings",
      "Test Cases",
      "Python",
      "Java",
      "C++",
    ],
    content: {
      summary:
        "Our coding environment is powered by the Microsoft Monaco Editor (the core engine behind VS Code), providing high-speed autocompletion, bracket matching, syntax highlighting, and instant multi-language compilation.",
      quickReference: {
        headers: [
          "Action / Feature",
          "Windows / Linux Shortcut",
          "macOS Shortcut",
          "Description",
        ],
        rows: [
          [
            "Run Code (Sample Cases)",
            "Ctrl + Enter",
            "Cmd + Enter",
            "Compiles code against public sample test cases",
          ],
          [
            "Submit Solution",
            "Ctrl + Shift + Enter",
            "Cmd + Shift + Enter",
            "Evaluates solution against all hidden weighted test cases",
          ],
          [
            "Toggle Comment",
            "Ctrl + /",
            "Cmd + /",
            "Comments or uncomments selected lines",
          ],
          [
            "Format Code",
            "Shift + Alt + F",
            "Shift + Option + F",
            "Auto-formats code indentation and spacing",
          ],
          [
            "Multi-Cursor Selection",
            "Alt + Click / Ctrl + D",
            "Option + Click / Cmd + D",
            "Places secondary cursors or selects next occurrence",
          ],
          [
            "Command Palette",
            "F1",
            "F1",
            "Opens Monaco editor commands and settings",
          ],
        ],
      },
      sections: [
        {
          heading: "Compiling & Running Custom Test Cases",
          body: [
            "1. Select your preferred programming language from the top-right dropdown (e.g. C++20, Java 21, Python 3.12, TypeScript, Go 1.22, Rust 2021).",
            "2. Implement your solution inside the provided function stub without modifying driver harness signatures.",
            "3. Click 'Run Code' or press Ctrl+Enter to test against sample inputs. You can also switch to the 'Custom Input' tab to supply your own custom standard input (`stdin`).",
            "4. Review the stdout, execution time (ms), and memory usage (MB) returned by the sandbox.",
          ],
          callout: {
            type: "danger",
            title: "Clipboard Anti-Paste Restriction",
            text: "External paste operations from outside the test browser are disabled. All typing velocity is analyzed in real time. Sudden large code insertions will trigger an integrity flag for evaluator review.",
          },
        },
      ],
    },
  },
  {
    id: "cand-proctoring-strikes",
    title: "Proctoring Rules, Warning Overlays & 3-Strike Tab Switch Policy",
    slug: "candidate-proctoring-rules-strikes",
    description:
      "Detailed explanation of automated integrity checks: 3-strike tab switch policy, looking away alerts, multiple faces in frame, and cell phone detection.",
    category: "candidate",
    categoryLabel: "Candidates & Students",
    readTime: "6 min read",
    updatedAt: "2026-08-12",
    popular: true,
    tags: [
      "Proctoring",
      "Tab Switch",
      "Strikes",
      "Anti-Cheat",
      "Integrity",
      "Trust Score",
    ],
    content: {
      summary:
        "Understand how the AI proctoring engine monitors exam integrity and learn how to avoid accidental strikes or automated disqualification during your test.",
      quickReference: {
        headers: [
          "Behavior / Event",
          "Trigger Criteria",
          "Warning Action",
          "Penalty on Trust Score",
        ],
        rows: [
          [
            "Tab Switch / Window Blur",
            "Exiting fullscreen or switching browser tabs",
            "Warning overlay banner (Strike X/3)",
            "-8.0 pts per switch (Auto-submit on Strike 3)",
          ],
          [
            "Looking Away / Gaze Drift",
            "Gaze deviated > 28° for > 3.0s continuously",
            "Yellow warning chime + snapshot",
            "-4.0 pts per incident",
          ],
          [
            "Face Missing",
            "No face detected in webcam for > 2.5s",
            "Red warning banner 'Please face the camera'",
            "-10.0 pts per incident",
          ],
          [
            "Multiple Faces Present",
            "2 or more faces detected with conf > 80%",
            "Red violation toast + snapshot",
            "-15.0 pts per incident",
          ],
          [
            "Mobile Phone Detected",
            "Cell phone / tablet detected by AI vision",
            "Critical violation snapshot + SMS flag",
            "-25.0 pts per incident",
          ],
        ],
      },
      sections: [
        {
          heading: "The 3-Strike Tab Switch Rule",
          body: [
            "• Strike 1: You will receive a fullscreen warning modal displaying 'Tab Switch Violation 1 of 3'. You must click 'Return to Assessment'.",
            "• Strike 2: A second warning modal will appear with a 10-second countdown reminder.",
            "• Strike 3: On the third tab switch, the system will instantly lock the exam, execute an auto-submission of your current answers, and mark the session as `AUTO_SUBMITTED`.",
          ],
          callout: {
            type: "warning",
            title: "Disable Popups & Notifications",
            text: "Before starting your exam, turn on 'Do Not Disturb' mode in your operating system and close background messaging apps (Slack, WhatsApp, Teams, Discord) to avoid accidental focus loss.",
          },
        },
      ],
    },
  },
  {
    id: "cand-scorecard-certs",
    title: "Accessing Scorecards, Topic Breakdowns & Verified Certificates",
    slug: "candidate-scorecard-certificate-guide",
    description:
      "How to review comprehensive scorecards, percentile rankings, Bloom's taxonomy performance, and download cryptographically verifiable PDF certificates.",
    category: "candidate",
    categoryLabel: "Candidates & Students",
    readTime: "4 min read",
    updatedAt: "2026-08-05",
    tags: [
      "Scorecard",
      "Certificates",
      "Results",
      "Percentile",
      "PDF Download",
    ],
    content: {
      summary:
        "After submitting your assessment, view your detailed score summary, subject-wise strengths, coding test case achievements, and download your official certificate.",
      sections: [
        {
          heading: "Scorecard Components",
          body: [
            "1. Overall Score & Percentage: Total marks scored vs maximum marks with pass/fail threshold indication.",
            "2. Section & Subject Breakdown: Granular accuracy metrics across quantitative, logical, verbal, and programming topics.",
            "3. Coding Test Case Matrix: Visibility into sample vs hidden test cases passed, execution speed benchmarks, and memory efficiency.",
            "4. Verified Digital Certificate: High-resolution PDF with QR verification code that recruiters can scan to authenticate credentials.",
          ],
        },
      ],
    },
  },

  // RECRUITER & EVALUATOR ARTICLES
  {
    id: "rec-test-creation-blueprint",
    title: "Assessment Blueprint Builder & Section Timer Configuration",
    slug: "recruiter-assessment-blueprint-builder",
    description:
      "How to assemble multi-subject tests, set section-level timers, negative marking, randomized question pools, and cutoff thresholds.",
    category: "recruiter",
    categoryLabel: "Recruiters & Evaluators",
    readTime: "8 min read",
    updatedAt: "2026-08-14",
    popular: true,
    tags: [
      "Test Builder",
      "Blueprint",
      "Cutoffs",
      "Section Timers",
      "Negative Marking",
      "Randomization",
    ],
    content: {
      summary:
        "Learn how to build tailored skill assessments using our intuitive blueprint builder, combining MCQs, coding challenges, and subjective case studies.",
      sections: [
        {
          heading: "Configuring Test Parameters",
          body: [
            "1. General Settings: Test title, instructions, total duration (minutes), passing cutoff percentage, and overall difficulty rating.",
            "2. Section Allocation: Divide assessments into isolated timed sections (e.g. Section A: Aptitude [20 mins], Section B: DSA Coding [40 mins]).",
            "3. Question Selection: Pull questions dynamically from your private organization question bank or our curated global library of 10,000+ validated items.",
            "4. Shuffling & Randomization: Enable option shuffling and question order randomization to ensure no two candidates receive the identical question sequence.",
          ],
        },
        {
          heading: "Immutable Schedule Snapshotting",
          body: [
            "When an assessment drive is scheduled, Gryphon 360 automatically freezes all questions and test cases into an immutable snapshot.",
            "Even if team members subsequently edit questions in the master question bank, live candidate sessions execute strictly against the locked snapshot.",
          ],
        },
      ],
    },
  },
  {
    id: "rec-excel-bulk-upload",
    title: "Bulk Question Bank Upload via Excel & JSON",
    slug: "recruiter-excel-bulk-question-upload",
    description:
      "Formatting standards for uploading 5,000+ MCQs or coding problems using Excel (.xlsx) or JSON with automated test case harness injection.",
    category: "recruiter",
    categoryLabel: "Recruiters & Evaluators",
    readTime: "7 min read",
    updatedAt: "2026-08-08",
    tags: [
      "Excel Upload",
      "Question Bank",
      "Bulk Ingestion",
      "JSON Schema",
      "Validation",
    ],
    content: {
      summary:
        "Seamlessly import entire question banks with automated cell validation, formula sanitization, and LaTeX math expression support.",
      quickReference: {
        headers: [
          "Column Header",
          "Mandatory",
          "Format / Allowed Values",
          "Example",
        ],
        rows: [
          [
            "title",
            "Yes",
            "Plain text summary",
            "Binary Tree Level Order Traversal",
          ],
          [
            "prompt",
            "Yes",
            "Markdown / LaTeX string",
            "Given the `root` of a binary tree, return its level order traversal.",
          ],
          [
            "subject_name",
            "Yes",
            "Registered Subject string",
            "Data Structures & Algorithms",
          ],
          ["difficulty", "Yes", "EASY, MEDIUM, HARD, EXPERT", "MEDIUM"],
          ["marks", "Yes", "Positive integer (1 to 100)", "20"],
          ["option_a", "Yes (MCQ)", "Plain text / LaTeX", "O(V + E)"],
          ["option_b", "Yes (MCQ)", "Plain text / LaTeX", "O(V log E)"],
          [
            "correct_option",
            "Yes (MCQ)",
            "A, B, C, or D (or comma-separated)",
            "A",
          ],
          [
            "explanation",
            "No",
            "Markdown text",
            "BFS traversal visits every node and edge once.",
          ],
        ],
      },
      sections: [
        {
          heading: "Formula Injection Protection",
          body: [
            "Our upload parser automatically sanitizes cell inputs starting with `=`, `+`, `-`, or `@` to neutralize spreadsheet formula execution vulnerabilities.",
            "Rows with syntax errors or missing required fields are isolated and returned in a downloadable error audit sheet with exact row numbers.",
          ],
        },
      ],
    },
  },
  {
    id: "rec-candidate-batch-dispatch",
    title: "Batch Candidate Ingestion & Invitation Dispatching",
    slug: "recruiter-candidate-batch-invitations",
    description:
      "High-throughput candidate CSV ingestion (up to 10,000 rows/file), chunked batch persistence (500/chunk), and automated transactional email dispatch.",
    category: "recruiter",
    categoryLabel: "Recruiters & Evaluators",
    readTime: "6 min read",
    updatedAt: "2026-08-06",
    tags: [
      "Bulk Upload",
      "Invitations",
      "Batch Dispatch",
      "CSV",
      "Email Automation",
    ],
    content: {
      summary:
        "Upload thousands of candidate profiles in seconds. The system validates MIME types, strips path traversal, deduplicates email addresses in-memory, and dispatches magic invite links.",
      sections: [
        {
          heading: "High-Throughput Chunked Persistence",
          body: [
            "1. Upload CSV/XLSX at Admin > Candidate Management > Bulk Upload.",
            "2. The server processes records in buffered memory batches of 500 rows with periodic cache clears to guarantee sub-2 second ingestion even for 5,000 candidates.",
            "3. Existing duplicate emails are detected via bulk index queries and skipped without aborting valid rows.",
            "4. Transactional emails with unique Magic Links and OTPs are queued for instant delivery.",
          ],
        },
      ],
    },
  },
  {
    id: "rec-keystroke-playback-analytics",
    title: "Candidate Integrity Scorecard & Keystroke Replay Review",
    slug: "recruiter-keystroke-replay-integrity-review",
    description:
      "How evaluators use character-by-character keystroke replay playback and biometric timeline audits to verify genuine candidate code creation.",
    category: "recruiter",
    categoryLabel: "Recruiters & Evaluators",
    readTime: "5 min read",
    updatedAt: "2026-08-11",
    tags: [
      "Keystroke Replay",
      "AI Proctoring",
      "Integrity Audit",
      "Scorecards",
      "Anti-AI",
    ],
    content: {
      summary:
        "Review candidate code construction character-by-character with visual velocity timelines to distinguish between human problem-solving and pasted AI-generated snippets.",
      sections: [
        {
          heading: "Features of Keystroke Replay",
          body: [
            "• Typing Velocity Graph: Plots characters typed per minute over time. Sudden vertical spikes (e.g. 400 characters appearing in 100ms) are flagged automatically.",
            "• Backspace & Refactoring Heatmap: Highlights logical iteration, debugging steps, and syntax corrections.",
            "• Synchronized Biometric Timeline: View webcam snapshot captures aligned precisely with violation timestamps and tab switch events.",
          ],
        },
      ],
    },
  },

  // UNIVERSITY & INSTITUTION ARTICLES
  {
    id: "univ-semester-exams-scale",
    title: "Conducting High-Concurrency University Semester Exams",
    slug: "university-high-concurrency-semester-exams",
    description:
      "Operational playbook for scheduling and monitoring 2,000+ concurrent student exams with zero database degradation and 100% offline auto-recovery.",
    category: "university",
    categoryLabel: "Colleges & Universities",
    readTime: "9 min read",
    updatedAt: "2026-08-16",
    popular: true,
    tags: ["Universities", "Concurrency", "High Load", "Exam Operations"],
    content: {
      summary:
        "Gryphon 360 is engineered to withstand massive exam start spikes where thousands of students launch tests within the identical 60-second window.",
      sections: [
        {
          heading: "Concurrency Safeguards & Architecture",
          body: [
            "1. Two-Stage Concurrency Guard: Non-locking pre-checks filter invalid requests before acquiring database locks, preventing connection pool starvation.",
            "2. In-Memory Session State: Candidate timers, active question pointers, and telemetry heartbeats are maintained in fast in-memory keys.",
            "3. Client-Side Offline Buffering: If campus Wi-Fi fluctuates, candidate code edits and proctoring telemetry are buffered in browser `localStorage` and synchronized automatically upon reconnecting.",
          ],
        },
      ],
    },
  },
  {
    id: "univ-faculty-evaluation-workflow",
    title: "Department Rosters & Faculty Grading Workflows",
    slug: "university-faculty-grading-workflows",
    description:
      "Organizing students by branch/department, assigning faculty evaluators to subjective coding papers, and moderating proctoring flags.",
    category: "university",
    categoryLabel: "Colleges & Universities",
    readTime: "6 min read",
    updatedAt: "2026-08-04",
    tags: [
      "Faculty",
      "Departments",
      "Grading",
      "Subjective Evaluation",
      "Moderation",
    ],
    content: {
      summary:
        "Manage multi-faculty evaluation pipelines with granular role-based permissions and subjective answer rubrics.",
      sections: [
        {
          heading: "Evaluation Features",
          body: [
            "• Department Tagging: Group candidates by Department (CSE, ECE, Mech), Semester, or Section.",
            "• Evaluator Assignment: Distribute candidate submissions among faculty members for double-blind subjective evaluation.",
            "• Proctor Flag Override: Faculty can inspect flagged snapshots (e.g. false positive looking away) and adjust the integrity trust score.",
          ],
        },
      ],
    },
  },

  // AI PROCTORING & INTEGRITY ARTICLES
  {
    id: "proc-face-gaze-specs",
    title: "Edge 3D Face Mesh & Iris Gaze Tracking Specifications",
    slug: "proctoring-face-mesh-gaze-specifications",
    description:
      "Algorithmic specification of 468-point facial landmark tracking, iris gaze vector estimation (yaw ±28°, pitch ±22°), and multi-face detection.",
    category: "proctoring",
    categoryLabel: "AI Proctoring & Compliance",
    readTime: "8 min read",
    updatedAt: "2026-08-15",
    popular: true,
    tags: [
      "Computer Vision",
      "MediaPipe",
      "Face Mesh",
      "Iris Tracking",
      "Gaze Heuristics",
    ],
    content: {
      summary:
        "Our AI proctoring engine runs locally inside the candidate's browser using WebGL-accelerated neural networks, ensuring millisecond response times without streaming video feeds to external servers.",
      quickReference: {
        headers: [
          "Detection Model",
          "Inference Cycle",
          "Trigger Threshold",
          "Penalty Weight",
        ],
        rows: [
          [
            "MediaPipe 468-Point Face Mesh",
            "Every 1,500ms (throttled)",
            "Face missing > 2.5s / 2+ faces > 0.80 conf",
            "-10.0 pts (missing) / -15.0 pts (multi)",
          ],
          [
            "Iris Gaze Vector Ray-Tracing",
            "Real-time vector calculation",
            "Yaw > 28° or Pitch > 22° for > 3.0s",
            "-4.0 pts per incident",
          ],
          [
            "Object Classification AI",
            "Every 5,000ms",
            "'cell phone' class > 0.72 confidence",
            "-25.0 pts (critical violation)",
          ],
          [
            "Web Speech / FFT Audio",
            "Continuous voice isolation",
            "Human speech 300Hz-3.4kHz > -24 dBFS",
            "-5.0 pts per voice incident",
          ],
        ],
      },
      sections: [
        {
          heading: "How Iris Gaze Vector Calculation Works",
          body: [
            "The model measures Euclidean distances between center pupil landmarks (points 468, 473) relative to eye corner landmarks (canthi).",
            "A gaze ratio between 0.35 and 0.65 represents direct eye contact with the screen. Ratios outside this window sustained for longer than 3,000ms log a `LOOK_AWAY` incident.",
          ],
        },
      ],
    },
  },
  {
    id: "proc-gdpr-privacy-zero-knowledge",
    title: "Zero-Knowledge Biometric Architecture & GDPR Compliance",
    slug: "proctoring-gdpr-privacy-compliance",
    description:
      "Why client-side edge inference protects student privacy: zero perpetual video recording storage, local RAM processing, and automated 30-day snapshot purging.",
    category: "proctoring",
    categoryLabel: "AI Proctoring & Compliance",
    readTime: "5 min read",
    updatedAt: "2026-08-09",
    tags: ["GDPR", "ISO 27001", "Privacy", "Zero-Knowledge", "Data Security"],
    content: {
      summary:
        "Gryphon 360 adheres to strict global data privacy standards (GDPR Article 9 & 32, ISO 27001). We never store raw webcam video recordings on cloud disks.",
      sections: [
        {
          heading: "Privacy Safeguards",
          body: [
            "1. Local RAM Inference: Facial landmarks and eye vectors are calculated directly in browser RAM and discarded after each frame.",
            "2. Anomaly Snapshots Only: Only short mathematical anomaly metadata and periodic encrypted grayscale verification snapshots are retained.",
            "3. Automated Purge Lifecycles: All test attempt evidence snapshots are automatically permanently erased after 30 days.",
          ],
        },
      ],
    },
  },

  // CODING ENVIRONMENT & COMPILERS
  {
    id: "comp-supported-languages",
    title: "Supported Programming Languages & Compiler Specifications",
    slug: "coding-supported-languages-compilers",
    description:
      "Complete list of 25+ supported programming languages, compiler versions, standard libraries, and optimization flags.",
    category: "compilers",
    categoryLabel: "Coding & Compilers",
    readTime: "7 min read",
    updatedAt: "2026-08-17",
    popular: true,
    tags: ["C++", "Java", "Python", "TypeScript", "Go", "Rust", "Compilers"],
    content: {
      summary:
        "Gryphon 360 provides ultra-low latency execution across 25+ programming languages inside secure sandboxes with automated diff checking.",
      quickReference: {
        headers: [
          "Language",
          "Compiler / Engine",
          "Optimization",
          "Default CPU Time",
          "Memory Cap",
        ],
        rows: [
          [
            "C++ (20)",
            "GCC 13.2 / Clang 17",
            "-O3 -std=c++20",
            "1.0 second",
            "256 MB",
          ],
          [
            "Java (21 LTS)",
            "OpenJDK 21 Hotspot",
            "-XX:+UseG1GC -Xmx384m",
            "2.0 seconds",
            "512 MB",
          ],
          [
            "Python 3",
            "CPython 3.12.3",
            "-O -B (bytecode off)",
            "3.0 seconds",
            "256 MB",
          ],
          [
            "JavaScript (ES2024)",
            "Node.js 20 LTS",
            "--max-old-space-size=256",
            "2.0 seconds",
            "256 MB",
          ],
          [
            "TypeScript (5.4)",
            "tsc + Node.js 20.x",
            "--target ES2022",
            "2.5 seconds",
            "256 MB",
          ],
          [
            "Go (1.22)",
            "gc standard compiler",
            "-gcflags=-N -l",
            "1.5 seconds",
            "256 MB",
          ],
          [
            "Rust (2021)",
            "rustc 1.78 stable",
            "--opt-level=3",
            "1.0 second",
            "256 MB",
          ],
          [
            "SQL (PostgreSQL)",
            "PostgreSQL 16 Engine",
            "EXPLAIN ANALYZE ON",
            "2.0 seconds",
            "128 MB",
          ],
        ],
      },
      sections: [
        {
          heading: "Standard Library Support",
          body: [
            "All modern standard libraries (e.g. C++ STL, Java Collections Framework, Python itertools/collections/math, JavaScript ESNext) are fully available in the runtime environment.",
            "External internet access is disabled during execution to guarantee deterministic and secure scoring.",
          ],
        },
      ],
    },
  },
  {
    id: "comp-execution-limits",
    title: "Execution Time, Memory Limits & Error Status Codes",
    slug: "coding-execution-limits-error-statuses",
    description:
      "Understanding CPU time constraints (1.0s to 3.0s), memory bounds (256 MB), and error statuses like Time Limit Exceeded (TLE) and Memory Limit Exceeded (MLE).",
    category: "compilers",
    categoryLabel: "Coding & Compilers",
    readTime: "6 min read",
    updatedAt: "2026-08-13",
    tags: ["TLE", "MLE", "Compilation Error", "Runtime Error", "Limits"],
    content: {
      summary:
        "Learn how the code execution engine measures execution duration and memory consumption against hidden test cases.",
      quickReference: {
        headers: [
          "Status Code",
          "Status Name",
          "Typical Cause",
          "Recommended Fix",
        ],
        rows: [
          [
            "AC (Accepted)",
            "Passed",
            "Correct output matching all test cases",
            "No action needed",
          ],
          [
            "WA (Wrong Answer)",
            "Failed Output",
            "Output does not match expected result",
            "Check edge cases and logic",
          ],
          [
            "TLE (Time Limit Exceeded)",
            "Timeout (> 2.0s)",
            "Infinite loop or slow algorithm",
            "Optimize algorithmic complexity",
          ],
          [
            "MLE (Memory Limit Exceeded)",
            "Out of Memory (> 256MB)",
            "Excessive memory allocation",
            "Reduce auxiliary space",
          ],
          [
            "CE (Compilation Error)",
            "Build Failure",
            "Syntax error or missing semicolon",
            "Review compiler error output",
          ],
          [
            "RTE (Runtime Error)",
            "Crash / Segfault",
            "Array index out of bounds / null pointer",
            "Check array boundaries & pointers",
          ],
        ],
      },
      sections: [
        {
          heading: "Algorithmic Complexity Guidelines",
          body: [
            "For arrays of size $N \\le 10^5$, aim for an $O(N)$ or $O(N \\log N)$ solution. An $O(N^2)$ brute-force approach will exceed the 2.0s execution limit.",
          ],
        },
      ],
    },
  },
  {
    id: "comp-custom-test-cases",
    title: "Testing Solutions with Custom Input & Edge Cases",
    slug: "coding-custom-input-testing-guide",
    description:
      "How candidates can supply custom standard input (stdin) to test algorithms against edge cases, boundary values, and custom arrays before submitting.",
    category: "compilers",
    categoryLabel: "Coding & Compilers",
    readTime: "5 min read",
    updatedAt: "2026-08-11",
    tags: ["Custom Input", "stdin", "Testing", "Edge Cases", "Debugging"],
    content: {
      summary:
        "Validate your code against custom boundary test cases before final submission using the Monaco editor Custom Input tab.",
      sections: [
        {
          heading: "How to Use Custom Input",
          body: [
            "1. In the coding editor, toggle the 'Custom Input' checkbox below the problem description.",
            "2. Enter your test input matching the problem's expected input format (e.g. array size followed by elements).",
            "3. Click 'Run Code' (or press Ctrl + Enter).",
            "4. Inspect the standard output (stdout) and verify your algorithm handles single-element arrays, negative numbers, and boundary values correctly.",
          ],
        },
      ],
    },
  },
];

export const ERROR_CODES_DATA: ErrorCodeItem[] = [
  {
    code: "ERR_WEBCAM_DENIED",
    category: "Preflight & Hardware",
    severity: "HIGH",
    title: "Webcam Access Denied by Browser",
    description:
      "The browser or operating system has denied camera permission to the assessment page.",
    symptom:
      "Preflight hardware check fails with 'Camera blocked' message, or video feed remains pitch black.",
    rootCause:
      "Browser permissions set to 'Block', OS privacy settings restricting camera access, or camera is in use by another app (Zoom, Teams).",
    resolutionSteps: [
      "Click the Padlock / Tune icon in the browser address bar (left of the URL).",
      "Ensure 'Camera' is set to 'Allow'.",
      "Close any background applications using your webcam (Zoom, Microsoft Teams, Skype, Google Meet).",
      "Refresh the page and re-run the Preflight Diagnostic Check.",
    ],
  },
  {
    code: "ERR_TAB_STRIKE_EXCEEDED",
    category: "Proctoring & Anti-Cheat",
    severity: "CRITICAL",
    title: "Maximum Tab Switch Strikes Exceeded",
    description:
      "Candidate has exited fullscreen or switched browser tabs 3 times during the exam.",
    symptom:
      "Test interface auto-locks with message 'Assessment Auto-Submitted due to integrity violation'.",
    rootCause:
      "Browser focus lost 3 separate times, triggering automated exam finalization.",
    resolutionSteps: [
      "The exam has been automatically submitted. Your recorded answers up to the point of lock are saved.",
      "If this was caused by an unexpected OS popup or technical glitch, contact your test administrator or institution faculty.",
      "Administrators can review the timestamped audit log in Admin > Proctoring Dashboard to evaluate potential re-attempts.",
    ],
  },
  {
    code: "ERR_MAGIC_TOKEN_EXPIRED",
    category: "Authentication",
    severity: "MEDIUM",
    title: "Invitation Token or Magic Link Expired",
    description:
      "The 15-minute validity window for the magic link or OTP token has elapsed.",
    symptom:
      "Candidate sees 'Invitation link expired or invalid' when clicking the test URL.",
    rootCause:
      "Magic links and OTPs expire after 15 minutes to protect assessment security.",
    resolutionSteps: [
      "On the test welcome screen, click 'Request New Access Link'.",
      "Enter your registered email address.",
      "Check your inbox for a fresh Magic Link and 6-digit OTP code (dispatched within 30 seconds).",
    ],
  },
  {
    code: "ERR_CODE_TIMEOUT",
    category: "Code Execution",
    severity: "MEDIUM",
    title: "Time Limit Exceeded (TLE) in Code Execution",
    description:
      "Candidate source code exceeded the CPU execution time limit (typically 2.0 seconds).",
    symptom:
      "Code runner returns 'Status: Time Limit Exceeded (124)' with 0 test cases passed.",
    rootCause:
      "Infinite loops, sub-optimal algorithmic complexity (e.g. O(N^2) instead of O(N log N)), or unclosed standard input loops.",
    resolutionSteps: [
      "Verify while loops and recursion base cases have proper termination conditions.",
      "Optimize data structures (e.g. use HashMaps instead of nested linear scans).",
      "Ensure code does not wait indefinitely for standard input.",
    ],
  },
  {
    code: "ERR_RATE_LIMIT_EXCEEDED",
    category: "API & Gateway",
    severity: "MEDIUM",
    title: "HTTP 429 Too Many Requests",
    description:
      "API request threshold exceeded on candidate authentication or code submission gateway.",
    symptom:
      "UI displays 'Too many requests. Please wait Xs before retrying' countdown toast.",
    rootCause:
      "Rapid repeated button clicks or exceeding rate limits (e.g., max 5 OTP requests per 30 minutes).",
    resolutionSteps: [
      "Wait for the on-screen countdown timer to expire (typically 30 to 60 seconds).",
      "Avoid spamming submit buttons; the platform employs client-side request deduplication.",
      "Once the timer reaches zero, retry your action.",
    ],
  },
  {
    code: "ERR_BANDWIDTH_LOW",
    category: "Network & Connection",
    severity: "LOW",
    title: "Network Latency High or Unstable",
    description:
      "Network round-trip latency exceeds 350ms or bandwidth is below 256 kbps.",
    symptom:
      "Warning badge 'Unstable Network Connection' appears in test header.",
    rootCause:
      "Slow Wi-Fi, active VPN/proxy, or high background bandwidth usage (video streaming/downloads).",
    resolutionSteps: [
      "Disconnect active VPNs or enterprise proxy tunnels.",
      "Pause any heavy file downloads, torrents, or video streams on your local network.",
      "Move closer to your Wi-Fi router or connect via wired Ethernet if available.",
    ],
  },
  {
    code: "ERR_DEVTOOLS_OPEN",
    category: "Proctoring & Anti-Cheat",
    severity: "HIGH",
    title: "Developer Tools or Console Inspection Detected",
    description:
      "Browser window dimensions indicate browser developer tools or console inspection panels are open.",
    symptom:
      "Warning overlay 'Developer Tools Detected' prompts immediate closure.",
    rootCause: "F12, Inspect Element, or developer console active.",
    resolutionSteps: [
      "Close the Developer Tools / Inspect Element panel immediately.",
      "Press F12 or click the Close (X) button on the developer dock.",
      "Click 'Resume Assessment' to return to fullscreen mode.",
    ],
  },
];

export const FAQ_DATA: FaqItem[] = [
  // ── 1. CAMERA & WEBCAM PERMISSIONS ─────────────────────────────────────────
  {
    id: "faq-cam-1",
    question: "How do I grant camera and microphone permissions in my browser?",
    answer:
      "When you open your test link, your browser will prompt you with a permission popup. Click 'Allow'. If you accidentally blocked it, click the Padlock or Tune icon on the left side of your browser address bar, set Camera and Microphone to 'Allow', and refresh the page.",
    category: "Proctoring",
    tags: [
      "Camera Permission",
      "Camera",
      "Permission",
      "Webcam",
      "Microphone",
      "Browser Permissions",
      "Padlock",
      "Chrome",
      "Edge",
      "Safari",
    ],
  },
  {
    id: "faq-cam-2",
    question: "Why is my camera screen black or saying 'Camera Blocked / Not Found'?",
    answer:
      "This usually happens if another application (like Zoom, Microsoft Teams, Google Meet, or Skype) is currently using your webcam. Close all other video apps, ensure browser camera permissions are set to 'Allow', and click 'Retry Camera Check'.",
    category: "Proctoring",
    tags: [
      "Camera Permission",
      "Camera",
      "Permission",
      "Black Screen",
      "Webcam Error",
      "Zoom",
      "Teams",
      "Video Stream",
    ],
  },
  {
    id: "faq-cam-3",
    question: "Can I use an external USB webcam or laptop built-in camera?",
    answer:
      "Yes. You can use any working built-in webcam or external USB camera supporting 720p or standard VGA resolution. Ensure your face is centered in the oval preview box with balanced room lighting.",
    category: "Proctoring",
    tags: [
      "Camera Permission",
      "Camera",
      "Permission",
      "Webcam",
      "Hardware",
      "USB Camera",
      "Lighting",
      "Integrated Camera",
    ],
  },
  {
    id: "faq-cam-4",
    question: "Why does the diagnostic check fail with 'Low Light' or 'Face Not Detected'?",
    answer:
      "Our AI edge face-mesh requires clear facial illumination. Avoid sitting with bright windows directly behind you (backlighting). Turn on a desk lamp facing you, remove dark sunglasses, and look directly at the webcam screen.",
    category: "Proctoring",
    tags: [
      "Camera Permission",
      "Camera",
      "Permission",
      "Low Light",
      "Lighting",
      "Face Detection",
      "Webcam",
      "Diagnostic",
    ],
  },
  {
    id: "faq-cam-5",
    question: "How do I fix camera permissions on macOS (Safari, Chrome, or Edge)?",
    answer:
      "On macOS, go to Apple menu > System Settings > Privacy & Security > Camera. Ensure the toggle switch next to Google Chrome, Microsoft Edge, or Safari is turned ON. Restart your browser and reload the test link.",
    category: "Proctoring",
    tags: [
      "Camera Permission",
      "Camera",
      "Permission",
      "macOS",
      "Apple",
      "Safari",
      "Mac System Settings",
      "Webcam",
    ],
  },
  {
    id: "faq-cam-6",
    question: "Can I wear prescription glasses, religious headwear, or hearing aids during proctored tests?",
    answer:
      "Yes. Standard prescription eyeglasses, religious headwear (such as turbans, hijabs, or yarmulkes), and medical hearing aids are fully permitted. Please ensure your eyes and facial contours remain visible to the webcam without heavy reflections.",
    category: "Proctoring",
    tags: [
      "Camera Permission",
      "Camera",
      "Permission",
      "Glasses",
      "Hijab",
      "Turban",
      "Religious Headwear",
      "Accessibility",
      "Hearing Aid",
    ],
  },

  // ── 2. INTERNET & AUTO-SAVE RESILIENCE ───────────────────────────────────────
  {
    id: "faq-net-1",
    question: "What happens if my internet connection drops during an exam?",
    answer:
      "Do not panic! Gryphon 360 uses an Offline-First Resilience Architecture. All your selected answers, essay drafts, and code edits are automatically saved in real time on your device. When your internet reconnects, the system automatically synchronizes your progress with the server with zero data loss.",
    category: "Candidates",
    tags: [
      "Internet Disconnection",
      "Internet",
      "Disconnection",
      "Network",
      "Auto-Save",
      "Offline",
      "Wi-Fi",
      "Sync",
    ],
  },
  {
    id: "faq-net-2",
    question: "What is the minimum internet speed required to take an assessment?",
    answer:
      "A standard internet connection with at least 512 kbps upload and download speed is sufficient. Because our AI face-monitoring runs directly inside your browser without uploading heavy video streams, bandwidth usage is extremely light.",
    category: "Candidates",
    tags: [
      "Internet Disconnection",
      "Internet",
      "Disconnection",
      "Bandwidth",
      "Speed",
      "Low Data",
      "Network",
      "Mbps",
    ],
  },
  {
    id: "faq-net-3",
    question: "If I refresh the browser page, will my exam timer and answers reset?",
    answer:
      "No. Your timer is continuously synchronized with the central server, and all your answered questions remain saved. When you refresh, the exam resumes exactly where you left off.",
    category: "Candidates",
    tags: [
      "Internet Disconnection",
      "Internet",
      "Disconnection",
      "Refresh",
      "Timer",
      "Auto-Save",
      "Resume",
      "Reload",
    ],
  },
  {
    id: "faq-net-4",
    question: "What should I do if the screen shows 'Connection Lost / Offline Mode'?",
    answer:
      "Keep your browser tab open and do not close the window. You can continue typing code or answering questions. The system will continuously attempt auto-reconnection in the background and flash a green 'Back Online' banner once restored.",
    category: "Candidates",
    tags: [
      "Internet Disconnection",
      "Internet",
      "Disconnection",
      "Offline Mode",
      "Connection Lost",
      "Reconnecting",
      "Network Error",
    ],
  },
  {
    id: "faq-net-5",
    question: "Can I switch from Wi-Fi to a Mobile Hotspot if my broadband disconnects?",
    answer:
      "Yes. You can switch to a backup Wi-Fi hotspot or mobile data connection. The platform detects network route changes gracefully and re-establishes your session token within 2 seconds without invalidating your test attempt.",
    category: "Candidates",
    tags: [
      "Internet Disconnection",
      "Internet",
      "Disconnection",
      "Hotspot",
      "Mobile Data",
      "Broadband",
      "Network Switch",
    ],
  },
  {
    id: "faq-net-6",
    question: "Will I get extra compensation time if there is an extended power or network outage?",
    answer:
      "If you experience a prolonged outage, contact your test administrator or university coordinator. Administrators have live dashboard controls to grant individualized time extensions or reset attempt windows for affected candidates.",
    category: "Candidates",
    tags: [
      "Internet Disconnection",
      "Internet",
      "Disconnection",
      "Time Extension",
      "Power Outage",
      "Coordinator",
      "Compensation Time",
    ],
  },

  // ── 3. TEST RULES, FULLSCREEN & TAB SWITCH POLICY ─────────────────────────────
  {
    id: "faq-rules-1",
    question: "Why does the test require Fullscreen Mode?",
    answer:
      "Fullscreen mode provides an immersive, distraction-free environment and ensures fair testing for all candidates. Exiting fullscreen or minimizing your browser window will trigger an integrity warning.",
    category: "Proctoring",
    tags: [
      "Test Rules & Window",
      "Test Rules",
      "Window",
      "Fullscreen",
      "Anti-Cheat",
      "Integrity",
      "Focus",
    ],
  },
  {
    id: "faq-rules-2",
    question: "How does the tab switch and window exit policy work?",
    answer:
      "Candidates are allowed up to 3 tab switch warnings. On the first two occurrences, a warning dialog is shown on your screen. If you switch tabs or leave the exam window a third time, the assessment is automatically submitted to maintain exam integrity.",
    category: "Proctoring",
    tags: [
      "Test Rules & Window",
      "Test Rules",
      "Window",
      "Tab Switch",
      "Strikes",
      "Auto-Submit",
      "Warnings",
      "Violations",
    ],
  },
  {
    id: "faq-rules-3",
    question: "Can I copy and paste text, formulas, or code during the assessment?",
    answer:
      "Clipboard copy-paste shortcuts (Ctrl+C, Ctrl+V, Cmd+C, Cmd+V) and right-click context menus are disabled inside the secure test interface to protect test integrity and prevent accidental external paste actions.",
    category: "Candidates",
    tags: [
      "Test Rules & Window",
      "Test Rules",
      "Window",
      "Copy Paste",
      "Clipboard",
      "Shortcuts",
      "Rules",
      "Anti-Paste",
    ],
  },
  {
    id: "faq-rules-4",
    question: "Can I use dual monitors or external display screens during a proctored test?",
    answer:
      "No. For proctored tests, external monitors, secondary displays, and projectors must be unplugged before launching the test. The pre-test diagnostic will detect secondary screens and prompt you to disconnect them.",
    category: "Candidates",
    tags: [
      "Test Rules & Window",
      "Test Rules",
      "Window",
      "Dual Monitors",
      "Screens",
      "HDMI",
      "Display",
      "Second Screen",
    ],
  },
  {
    id: "faq-rules-5",
    question: "What should I do if a background app popup or notification triggers a strike?",
    answer:
      "Before starting your exam, turn on 'Do Not Disturb' (Focus Assist on Windows / Focus Mode on Mac) and close background messaging apps like Slack, Teams, WhatsApp, and Discord. If a single false flag occurs, return to fullscreen immediately; proctors review video snapshots before taking any grading action.",
    category: "Proctoring",
    tags: [
      "Test Rules & Window",
      "Test Rules",
      "Window",
      "Popups",
      "Notifications",
      "Focus Assist",
      "Slack",
      "Do Not Disturb",
    ],
  },
  {
    id: "faq-rules-6",
    question: "Can I use rough scratch paper, pens, or an on-screen calculator during aptitude tests?",
    answer:
      "Yes. Blank physical scratch sheets and pens are permitted for mathematical calculations. For tests requiring calculation, an official on-screen scientific/basic calculator is integrated directly into the testing header.",
    category: "Candidates",
    tags: [
      "Test Rules & Window",
      "Test Rules",
      "Window",
      "Scratch Paper",
      "Calculator",
      "Rough Sheet",
      "Aptitude",
      "Math",
    ],
  },

  // ── 4. LOGIN, ACCESS CODES & 6-DIGIT OTP ──────────────────────────────────────
  {
    id: "faq-auth-1",
    question: "How do I access my test using the invite link or 6-digit OTP?",
    answer:
      "Click the 'Start Assessment' link inside your invitation email. If prompted, enter the 6-digit OTP code sent to your registered email address. This unlocks your test session instantly without needing a password.",
    category: "Candidates",
    tags: [
      "Login & Access Code",
      "Login",
      "Access Code",
      "OTP",
      "Magic Link",
      "Invitation",
      "Passwordless",
    ],
  },
  {
    id: "faq-auth-2",
    question: "What should I do if my magic link or access code has expired?",
    answer:
      "On the test access screen, click 'Resend Access Code' or 'Request New Link'. Enter your registered email address, and a fresh 6-digit OTP code valid for 15 minutes will be sent to your inbox immediately.",
    category: "Candidates",
    tags: [
      "Login & Access Code",
      "Login",
      "Access Code",
      "Expired Link",
      "Resend OTP",
      "Token",
      "Timeout",
    ],
  },
  {
    id: "faq-auth-3",
    question: "I didn't receive my test invitation email or OTP. What should I check?",
    answer:
      "First, check your Spam, Junk, and Promotions folders for an email from 'Gryphon 360 Assessments'. If you still don't see it, ensure you are searching for the exact email address you used during test registration, or contact your test coordinator.",
    category: "General",
    tags: [
      "Login & Access Code",
      "Login",
      "Access Code",
      "Spam",
      "Missing Email",
      "OTP",
      "Invitations",
      "Inbox",
    ],
  },
  {
    id: "faq-auth-4",
    question: "Why does the screen say 'Access Code Invalid' or 'Candidate Not Found'?",
    answer:
      "Double-check that you typed the 6-digit OTP code correctly without trailing spaces. Make sure you are using the exact email address where you received the invitation. If the issue persists, request a new OTP code.",
    category: "Candidates",
    tags: [
      "Login & Access Code",
      "Login",
      "Access Code",
      "Invalid Code",
      "Candidate Not Found",
      "Error",
      "Authentication",
    ],
  },
  {
    id: "faq-auth-5",
    question: "Can I log in from multiple devices or open the test in multiple browser tabs?",
    answer:
      "No. Gryphon 360 enforces a single-session security policy. Opening the assessment in a second tab or separate device will invalidate the previous session and trigger a security lockout.",
    category: "Candidates",
    tags: [
      "Login & Access Code",
      "Login",
      "Access Code",
      "Multiple Tabs",
      "Multiple Devices",
      "Session Conflict",
      "Single Login",
    ],
  },
  {
    id: "faq-auth-6",
    question: "How early should I log in before the scheduled test start time?",
    answer:
      "We recommend opening your test link 10 to 15 minutes before the scheduled start time. This allows you to complete the 5-point hardware diagnostic (camera, mic, network speed, browser check) with zero rush.",
    category: "Candidates",
    tags: [
      "Login & Access Code",
      "Login",
      "Access Code",
      "Start Time",
      "Early Login",
      "Diagnostic",
      "Pre-flight",
    ],
  },

  // ── 5. SCORECARD, RESULTS & CERTIFICATES ─────────────────────────────────────
  {
    id: "faq-score-1",
    question: "When and where do I receive my exam scorecard and results?",
    answer:
      "Once you submit your assessment, auto-evaluated sections (MCQs, coding test cases, quantitative aptitude) are scored instantly. Your comprehensive scorecard and verifiable PDF certificate are generated automatically and sent to your email or available on your candidate dashboard.",
    category: "Candidates",
    tags: [
      "Scorecard & Results",
      "Scorecard",
      "Results",
      "Score",
      "Evaluation",
      "Report",
      "Performance",
    ],
  },
  {
    id: "faq-score-2",
    question: "How are test scores, percentiles, and accuracy percentages calculated?",
    answer:
      "Scores are calculated based on positive marks assigned to each question, minus negative penalties (if configured by the test administrator). Coding problems award partial marks based on the proportion of passed test cases. Percentiles benchmark your score against all candidates in the batch.",
    category: "Candidates",
    tags: [
      "Scorecard & Results",
      "Scorecard",
      "Results",
      "Accuracy",
      "Percentile",
      "Negative Marking",
      "Partial Marks",
      "Calculation",
    ],
  },
  {
    id: "faq-score-3",
    question: "Can I download a verifiable PDF certificate of completion?",
    answer:
      "Yes. If your test includes digital certification, you can download a cryptographically signed PDF certificate featuring your name, date, verification QR code, and score breakdown from your candidate portal.",
    category: "Candidates",
    tags: [
      "Scorecard & Results",
      "Scorecard",
      "Results",
      "Certificate",
      "PDF Download",
      "Verification",
      "QR Code",
      "Credentials",
    ],
  },
  {
    id: "faq-score-4",
    question: "How can recruiters or universities verify my certificate authenticity?",
    answer:
      "Every certificate includes a tamper-proof QR code and unique Credential ID. Scanning the QR code links directly to Gryphon 360's public verification ledger (`/verify/{certificateId}`) confirming issuing institution and authentic score records.",
    category: "Candidates",
    tags: [
      "Scorecard & Results",
      "Scorecard",
      "Results",
      "Verification",
      "QR Verification",
      "Recruiters",
      "Authenticity",
    ],
  },
  {
    id: "faq-score-5",
    question: "Why are subjective or essay section scores not shown immediately?",
    answer:
      "Subjective coding designs, case studies, and long-form written responses are assigned to designated faculty evaluators for manual rubric grading. Once faculty finalize evaluation, your total aggregate scorecard will be published.",
    category: "Candidates",
    tags: [
      "Scorecard & Results",
      "Scorecard",
      "Results",
      "Subjective",
      "Essay",
      "Faculty Grading",
      "Pending Review",
    ],
  },
  {
    id: "faq-score-6",
    question: "What should I do if I believe there is an error in my scorecard or question evaluation?",
    answer:
      "You can submit a review request through the Help Center Support Ticket form. Select 'Scorecard / Results Inquiry', enter your Test ID and candidate email, and our academic support team will review your submission audit log.",
    category: "Candidates",
    tags: [
      "Scorecard & Results",
      "Scorecard",
      "Results",
      "Dispute",
      "Score Correction",
      "Support Ticket",
      "Review",
    ],
  },

  // ── 6. PRIVACY & SECURITY ────────────────────────────────────────────────────
  {
    id: "faq-priv-1",
    question: "Is my webcam video recorded or stored on any server?",
    answer:
      "No. Gryphon 360 uses a Zero-Knowledge Edge AI Architecture. Face mesh analysis and gaze monitoring run 100% locally inside your browser memory. We never stream or store full raw video recordings on our cloud servers, ensuring full candidate privacy under GDPR and the Indian DPDP Act 2023.",
    category: "Security & Privacy",
    tags: [
      "Privacy & Security",
      "Privacy",
      "Security",
      "GDPR",
      "Biometrics",
      "Webcam Privacy",
      "Zero-Knowledge",
      "Data Protection",
    ],
  },
  {
    id: "faq-priv-2",
    question: "Can recruiters or examiners access my personal files or browsing history?",
    answer:
      "No. Gryphon 360 runs strictly within standard browser security sandboxes. It has zero access to your personal files, hard drive, private folders, browser history, or other running applications.",
    category: "Security & Privacy",
    tags: [
      "Privacy & Security",
      "Privacy",
      "Security",
      "Sandbox",
      "File Access",
      "Browser Sandbox",
      "Permissions",
    ],
  },
  {
    id: "faq-priv-3",
    question: "How is my personal information (email, phone, college ID) protected?",
    answer:
      "All candidate records and test submissions are encrypted in transit via TLS 1.3 and at rest with AES-256 bank-grade encryption in secure data centers. Candidate data is never shared or sold to third parties.",
    category: "Security & Privacy",
    tags: [
      "Privacy & Security",
      "Privacy",
      "Security",
      "Encryption",
      "AES-256",
      "TLS 1.3",
      "Data Protection",
      "Confidentiality",
    ],
  },
  {
    id: "faq-priv-4",
    question: "How long are proctoring snapshots and exam telemetry logs retained?",
    answer:
      "In accordance with ISO 27001 and GDPR data minimization standards, proctoring snapshots and telemetry audit logs are automatically permanently purged from our storage after 30 days.",
    category: "Security & Privacy",
    tags: [
      "Privacy & Security",
      "Privacy",
      "Security",
      "Data Retention",
      "Purge",
      "30 Days",
      "ISO 27001",
      "Compliance",
    ],
  },
  {
    id: "faq-priv-5",
    question: "Does Gryphon 360 use AI to automatically disqualify candidates without human review?",
    answer:
      "No. Our AI proctoring engine only flags potential anomalies (such as gaze drift or tab switches). Final integrity scores and disciplinary actions are strictly determined by authorized human faculty or hiring managers after reviewing timestamped audit evidence.",
    category: "Security & Privacy",
    tags: [
      "Privacy & Security",
      "Privacy",
      "Security",
      "Human in the Loop",
      "Disqualification",
      "AI Review",
      "Fairness",
    ],
  },

  // ── 7. PLATFORM, COMPILERS & MULTI-DOMAIN TESTS ──────────────────────────────
  {
    id: "faq-domain-1",
    question: "Does Gryphon 360 support non-technical tests like Finance, Marketing, and HR?",
    answer:
      "Yes! Gryphon 360 is built for all student domains including Finance, Business Analytics, Marketing, Human Resources, Aptitude, Subjective Case Studies, and Engineering/Coding assessments.",
    category: "General",
    tags: [
      "Finance",
      "Marketing",
      "Business",
      "Non-Technical",
      "Aptitude",
      "Multi-Domain",
      "MBA",
      "Human Resources",
    ],
  },
  {
    id: "faq-domain-2",
    question: "What programming languages are supported in coding assessments?",
    answer:
      "Gryphon 360 supports 25+ programming languages including C++20, Java 21, Python 3.12, JavaScript (Node.js), TypeScript, Go, Rust, C#, PHP, and SQL, with a custom test case execution sandbox.",
    category: "Coding Engine",
    tags: [
      "Coding",
      "Languages",
      "Java",
      "Python",
      "C++",
      "Compilers",
      "TypeScript",
      "Rust",
      "SQL",
    ],
  },
  {
    id: "faq-domain-3",
    question: "Can I take proctored assessments on a mobile phone or tablet?",
    answer:
      "For proctored assessments, a laptop or desktop computer with Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari is required. Mobile devices do not support the desktop fullscreen lock and edge face-mesh detection required for secure exams.",
    category: "General",
    tags: [
      "Mobile",
      "Device",
      "Laptop",
      "System Requirements",
      "Browsers",
      "Tablet",
      "Smartphone",
    ],
  },
  {
    id: "faq-domain-4",
    question: "How do recruiters upload question banks and invite candidates in bulk?",
    answer:
      "Recruiters can upload standardized Excel/CSV question templates with automated cell validation and dispatch batch email invitations with magic links to 5,000+ candidates in seconds.",
    category: "Recruiters",
    tags: [
      "Recruiters",
      "Bulk Upload",
      "Excel",
      "Question Bank",
      "Batch Invite",
      "CSV",
      "Hiring Teams",
    ],
  },
  {
    id: "faq-domain-5",
    question: "Which browser extensions should I disable before launching the exam?",
    answer:
      "We recommend disabling third-party translation extensions, ad blockers, popup blockers, and AI copilot sidebar extensions that might trigger unexpected window focus changes or block test script assets.",
    category: "General",
    tags: [
      "Browser Extensions",
      "AdBlock",
      "Copilot",
      "Chrome Extensions",
      "Troubleshooting",
    ],
  },
];

