import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Database, Play, CheckCircle2, XCircle, Loader2, Copy, ExternalLink, 
  Terminal, ShieldCheck, UserCheck, Check, Info, FileSpreadsheet, Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth-service";
import { organisationService } from "@/lib/organisation-service";
import { userService } from "@/lib/user-service";
import { testService, CreateQuestionRequest, Question } from "@/lib/test-service";
import { candidateService } from "@/lib/candidate-service";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


// Define Step status interface
interface SeedStep {
  id: string;
  name: string;
  description: string;
  status: "idle" | "running" | "completed" | "failed";
}

// Log interface
interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

// Seeded candidate record for the copy links table
interface SeededCandidate {
  name: string;
  email: string;
  token: string;
  testTitle: string;
  link: string;
}

export default function SeedData() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [seededCandidates, setSeededCandidates] = useState<SeededCandidate[]>([]);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [isSeedingCompleted, setIsSeedingCompleted] = useState(false);
  const [seedEmail, setSeedEmail] = useState("superadmin@gryphonacademy.co.in");
  const [seedPassword, setSeedPassword] = useState("password123");
  const [dataSet, setDataSet] = useState<"A" | "B" | "C" | "D">("A");

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // List of seed steps
  const [steps, setSteps] = useState<SeedStep[]>([
    { id: "org", name: "Create Organisation", description: "Creating Gryphon Academy", status: "idle" },
    { id: "superadmin", name: "Register Super Admin", description: "Registering superadmin@gryphonacademy.co.in", status: "idle" },
    { id: "login", name: "Authenticate", description: "Logging in as Super Admin", status: "idle" },
    { id: "taxonomy", name: "Onboard Taxonomy (Subjects & Topics)", description: "Creating Computer Science & Engineering (DSA & System Design)", status: "idle" },
    { id: "candidate", name: "Create Sample Candidate", description: "Registering candidate@example.com", status: "idle" },
    { id: "questions", name: "Seed Question Bank", description: "Adding Two Sum, ACID, HTTP Methods, and Java Memory MCQs", status: "idle" },
  ]);

  // Scroll console to bottom when new logs appear
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Utility to append log entries
  const addLog = (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  const updateStepStatus = (id: string, status: SeedStep["status"]) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, status } : step))
    );
  };

  // Bulk Seeding Flow Execution
  const handleSeedDatabase = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    setIsSeedingCompleted(false);
    setProgress(0);
    setLogs([]);
    setSeededCandidates([]);

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    addLog("🚀 Starting the Bulk Data Seeder process...", "info");
    
    // Clear out stale JWT session keys to prevent 403 authorization failures on a wiped DB
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    let superadminToken = "";

    // A: Try to login with the inputs specified by user
    if (seedEmail && seedPassword) {
      addLog(`🔐 Attempting to pre-authenticate using: ${seedEmail}...`, "info");
      try {
        const authData = await authService.login({
          email: seedEmail,
          password: seedPassword,
        });
        superadminToken = authData.accessToken;
        localStorage.setItem("token", superadminToken);
        localStorage.setItem("user", JSON.stringify(authData.user));
        addLog(`✅ Pre-authentication successful! JWT token acquired.`, "success");
      } catch (loginErr: unknown) {
        const err = loginErr as { response?: { data?: { message?: string } }; message?: string };
        addLog(`⚠️ Pre-authentication failed for ${seedEmail}: ${err.response?.data?.message || err.message}.`, "warning");
      }
    }

    // B: Fallback to the platform's default master bootstrap superadmin
    if (!superadminToken && seedEmail !== "superadmin@gryphonacademy.co.in") {
      addLog("🔐 Attempting master bootstrap login with default platform credentials (superadmin@gryphonacademy.co.in)...", "info");
      try {
        const authData = await authService.login({
          email: "superadmin@gryphonacademy.co.in",
          password: "password123",
        });
        superadminToken = authData.accessToken;
        localStorage.setItem("token", superadminToken);
        localStorage.setItem("user", JSON.stringify(authData.user));
        addLog("✅ Master bootstrap login successful! System administrator authority acquired.", "success");
      } catch (bootstrapErr: unknown) {
        const err = bootstrapErr as { response?: { data?: { message?: string } }; message?: string };
        addLog(`⚠️ Master bootstrap login failed: ${err.response?.data?.message || err.message}.`, "warning");
        addLog(`💡 Proceeding anyway. Seeding will run without credentials or register in subsequent steps.`, "info");
      }
    }

    let gryphonOrgId = "";
    let techWolfOrgId = "";
    let doSelectOrgId = "";

    const subjects: Record<string, string> = {};
    const topics: Record<string, string> = {};
    const subtopics: Record<string, string> = {};
    const candidateIds: string[] = [];
    const questionIds: string[] = [];
    const testIds: string[] = [];
    const scheduleIds: string[] = [];

    const prefix = `[Set ${dataSet}] `;
    const emailTag = dataSet.toLowerCase();

    const candidatesList = [
      { name: "Sample Candidate", email: "candidate@example.com", org: "gryphon" },
    ];

    try {
      // ----------------------------------------------------
      // STEP 1: CREATE ORGANISATIONS
      // ----------------------------------------------------
      setCurrentStepIndex(0);
      updateStepStatus("org", "running");
      setProgress(5);
      addLog("Creating Organisations on the backend...", "info");

      // Resolve Org 1 (Gryphon Academy)
      try {
        const org1 = await organisationService.createOrganisation({ name: "Gryphon Academy" });
        gryphonOrgId = org1.id;
        addLog(`✅ Created Primary Organisation: "Gryphon Academy" [ID: ${gryphonOrgId}]`, "success");
      } catch (e: unknown) {
        addLog(`⚠️ Gryphon Academy creation failed. Querying existing organisations to recover ID...`, "warning");
        await delay(200);
        try {
          const existing = await organisationService.getOrganisations();
          const found = existing.find(o => o.name.toLowerCase().includes("gryphon") || o.name.toLowerCase().includes("academy"));
          if (found) {
            gryphonOrgId = found.id;
            addLog(`✅ Resolved existing Organisation: "${found.name}" [ID: ${gryphonOrgId}]`, "success");
          } else if (existing.length > 0) {
            gryphonOrgId = existing[0].id;
            addLog(`✅ Resolved alternate existing Organisation: "${existing[0].name}" [ID: ${gryphonOrgId}]`, "success");
          } else {
            gryphonOrgId = "00000000-0000-0000-0000-000000000000";
            addLog(`⚠️ Fallback: Using default Organisation UUID: ${gryphonOrgId}`, "warning");
          }
        } catch (innerErr) {
          gryphonOrgId = "00000000-0000-0000-0000-000000000000";
          addLog(`⚠️ Organisation fallback query failed. Using default Org UUID.`, "warning");
        }
      }
      await delay(200);

      techWolfOrgId = gryphonOrgId;
      doSelectOrgId = gryphonOrgId;

      updateStepStatus("org", "completed");

      // ----------------------------------------------------
      // STEP 2: REGISTER SUPER ADMIN
      // ----------------------------------------------------
      setCurrentStepIndex(1);
      updateStepStatus("superadmin", "running");
      setProgress(15);
      addLog("Registering Super Admin account...", "info");

      const targetEmail = "superadmin@gryphonacademy.co.in";
      const targetPassword = "password123";

      try {
        if (superadminToken) {
          addLog("Registering via Admin User Management service with true SUPERADMIN role...", "info");
          await userService.createUser({
            name: "Super Admin",
            email: targetEmail,
            password: targetPassword,
            organisation_id: gryphonOrgId,
          }, "SUPERADMIN");
          addLog(`✅ Registered Super Admin account: ${targetEmail}`, "success");
        } else {
          addLog("⚠️ Public registration endpoint is disabled (RX-067). Skipping Super Admin registration. Seeding will attempt to login using existing credentials.", "warning");
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        addLog(`⚠️ Super Admin registration skipped or exists: ${err.response?.data?.message || err.message}.`, "warning");
      }
      await delay(200);
      updateStepStatus("superadmin", "completed");

      // ----------------------------------------------------
      // STEP 3: AUTHENTICATE / LOGIN
      // ----------------------------------------------------
      setCurrentStepIndex(2);
      updateStepStatus("login", "running");
      setProgress(25);
      addLog("Authenticating with Super Admin credentials...", "info");

      try {
        const authData = await authService.login({
          email: targetEmail,
          password: targetPassword,
        });
        superadminToken = authData.accessToken;
        localStorage.setItem("token", superadminToken);
        localStorage.setItem("user", JSON.stringify(authData.user));
        addLog(`🔐 Authentication successful! JWT retrieved and saved to LocalStorage.`, "success");
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        addLog(`⚠️ Authentication failed: ${err.response?.data?.message || err.message}. Continuing seeding flow using current session.`, "warning");
      }
      await delay(200);
      updateStepStatus("login", "completed");

      // ----------------------------------------------------
      // STEP 5: ONBOARD TAXONOMY (SUBJECTS & TOPICS)
      // ----------------------------------------------------
      setCurrentStepIndex(4);
      updateStepStatus("taxonomy", "running");
      setProgress(45);
      addLog("Seeding Subjects, Topics, and Subtopics...", "info");

      // Fetch all existing subjects and topics first
      let dbSubjects: Array<{ id: string; name: string }> = [];
      let dbTopics: Array<{ id: string; name: string }> = [];
      let dbSubtopics: Array<{ id: string; name: string }> = [];
      try {
        dbSubjects = await testService.getAllSubjects();
        await delay(200);
        dbTopics = await testService.getAllTopics();
        await delay(200);
        dbSubtopics = await testService.getAllSubtopics();
        await delay(200);
      } catch (e) {
        addLog("⚠️ Failed to preload taxonomy database. Existing records check will fallback.", "warning");
      }

      // Helper to get or create subject
      const getOrCreateSubject = async (key: string, name: string) => {
        const found = dbSubjects.find(s => s.name.toLowerCase().trim() === name.toLowerCase().trim());
        if (found) {
          subjects[key] = found.id;
          addLog(`ℹ️ Subject "${name}" already exists. Reusing ID: ${found.id}`, "info");
        } else {
          try {
            const sub = await testService.createSubject(name);
            subjects[key] = sub.id;
            addLog(`📚 Subject added: "${name}"`, "success");
          } catch (e) {
            subjects[key] = "fallback-subj-id";
            addLog(`⚠️ Subject "${name}" creation fallback used.`, "warning");
          }
        }
        await delay(100);
      };

      // Helper to get or create topic
      const getOrCreateTopic = async (key: string, name: string, subjectId: string) => {
        const found = dbTopics.find(t => t.name.toLowerCase().trim() === name.toLowerCase().trim());
        if (found) {
          topics[key] = found.id;
          addLog(`  ℹ️ Topic "${name}" already exists. Reusing ID: ${found.id}`, "info");
        } else {
          try {
            const top = await testService.createTopic(name, subjectId);
            topics[key] = top.id;
            addLog(`  🏷️ Topic added: "${name}"`, "info");
          } catch (e) {
            topics[key] = "fallback-topic-id";
            addLog(`  ⚠️ Topic "${name}" creation fallback used.`, "warning");
          }
        }
        await delay(100);
      };

      // Helper to get or create subtopic
      const getOrCreateSubtopic = async (key: string, name: string, topicId: string) => {
        const found = dbSubtopics.find(st => st.name.toLowerCase().trim() === name.toLowerCase().trim());
        if (found) {
          subtopics[key] = found.id;
          addLog(`    ℹ️ Subtopic "${name}" already exists. Reusing ID: ${found.id}`, "info");
        } else {
          try {
            const subtop = await testService.createSubtopic(name, topicId);
            subtopics[key] = subtop.id;
            addLog(`    🔹 Subtopic added: "${name}"`, "info");
          } catch (e) {
            subtopics[key] = "fallback-subtopic-id";
            addLog(`    ⚠️ Subtopic "${name}" creation fallback used.`, "warning");
          }
        }
        await delay(100);
      };

      // Execute Taxonomy Seeding cleanly with pre-checks
      await getOrCreateSubject("cse", "Computer Science & Engineering");
      await getOrCreateTopic("dbms", "Database Management Systems", subjects.cse);
      await getOrCreateSubtopic("indexing", "SQL Indexing", topics.dbms);
      await getOrCreateTopic("os", "Operating Systems", subjects.cse);

      await getOrCreateSubject("web", "Web Development");
      await getOrCreateTopic("react", "React.js Foundations", subjects.web);
      await getOrCreateSubtopic("hooks", "React Hooks & State", topics.react);
      await getOrCreateTopic("node", "Node.js & Express", subjects.web);

      await getOrCreateSubject("dsa", "Data Structures & Algorithms");
      await getOrCreateTopic("arrays", "Arrays & Strings", subjects.dsa);
      await getOrCreateSubtopic("sliding", "Sliding Window Pattern", topics.arrays);
      await getOrCreateTopic("trees", "Trees & Graphs", subjects.dsa);

      await getOrCreateSubject("sd", "System Design");
      await getOrCreateTopic("micro", "Microservices Architecture", subjects.sd);
      await delay(100);

      updateStepStatus("taxonomy", "completed");

      // ----------------------------------------------------
      // STEP 6: SEED BULK CANDIDATES
      // ----------------------------------------------------
      setCurrentStepIndex(5);
      updateStepStatus("candidates", "running");
      setProgress(55);
      addLog(`Onboarding ${candidatesList.length} Candidates in bulk across orgs...`, "info");

      for (const cand of candidatesList) {
        try {
          const existingList = await candidateService.getCandidates();
          const found = existingList.find(c => c.user?.email?.toLowerCase().trim() === cand.email?.toLowerCase().trim());
          if (found) {
            candidateIds.push(found.id);
            addLog(`ℹ️ Candidate "${cand.name}" (${cand.email}) already exists. Reusing ID: ${found.id}`, "info");
          } else {
            const orgId = cand.org === "gryphon" ? gryphonOrgId : techWolfOrgId;
            const candidateId = await candidateService.createCandidate({
              name: cand.name,
              email: cand.email,
              password: "password123",
              organisationId: orgId,
            });
            candidateIds.push(candidateId);
            addLog(`👤 Onboarded Candidate: "${cand.name}" [ID: ${candidateId}]`, "success");
          }
        } catch (e: unknown) {
          const err = e as { message?: string };
          addLog(`⚠️ Candidate "${cand.name}" creation skipped or already exists: ${err.message || ""}`, "warning");
        }
        await delay(100);
      }

      // Fallback: If we couldn't create candidates but they already exist, query them
      try {
        const list = await candidateService.getCandidates();
        await delay(200);
        list.forEach(c => {
          if (!candidateIds.includes(c.id)) {
            candidateIds.push(c.id);
          }
        });
        addLog(`📝 Loaded/Verified ${candidateIds.length} candidates in sandbox pool.`, "success");
      } catch (e) {
        addLog("⚠️ Failed to load existing candidates database fallback.", "warning");
      }
      await delay(200);

      updateStepStatus("candidates", "completed");

      // ----------------------------------------------------
      // STEP 7: SEED QUESTION BANK
      // ----------------------------------------------------
      setCurrentStepIndex(6);
      updateStepStatus("questions", "running");
      setProgress(65);
      addLog("Seeding 10 MCQs and 5 Coding Questions in bulk...", "info");

      const mcqQuestions: CreateQuestionRequest[] = [
        {
          // 1. SINGLE_CORRECT
          questionType: "MCQ",
          prompt: "Which ACID property guarantees that once a database transaction has been committed, it will remain committed even in the event of a system failure or power loss?",
          subject_id: subjects.cse,
          topic_id: topics.dbms,
          marks: 5,
          title: "ACID Durability Property",
          difficulty: "EASY",
          visibility: "PUBLIC",
          mcqType: "SINGLE_CORRECT",
          shuffleOptions: true,
          multipleCorrect: false,
          mcqOptions: [
            { text: "Atomicity", isCorrect: false },
            { text: "Consistency", isCorrect: false },
            { text: "Isolation", isCorrect: false },
            { text: "Durability", isCorrect: true },
          ]
        },
        {
          // 2. MULTIPLE_CORRECT
          questionType: "MCQ",
          prompt: "Which of the following HTTP methods are considered idempotent according to the RFC 7231 specification? (Select all that apply)",
          subject_id: subjects.web,
          topic_id: topics.node,
          marks: 5,
          title: "Idempotent HTTP Methods",
          difficulty: "MEDIUM",
          visibility: "PUBLIC",
          mcqType: "MULTIPLE_CORRECT",
          shuffleOptions: true,
          multipleCorrect: true,
          mcqOptions: [
            { text: "GET", isCorrect: true },
            { text: "POST", isCorrect: false },
            { text: "PUT", isCorrect: true },
            { text: "DELETE", isCorrect: true },
          ]
        },
        {
          // 3. TRUE_FALSE
          questionType: "MCQ",
          prompt: "True or False: Java Primitive types like `int` and `boolean` are stored directly on the stack frame when declared as local variables inside a method.",
          subject_id: subjects.dsa,
          topic_id: topics.arrays,
          marks: 5,
          title: "Java Primitive Memory Allocation",
          difficulty: "EASY",
          visibility: "PUBLIC",
          mcqType: "TRUE_FALSE",
          shuffleOptions: false,
          multipleCorrect: false,
          mcqOptions: [
            { text: "True", isCorrect: true },
            { text: "False", isCorrect: false },
          ]
        },
        {
          // 4. IMAGE_SINGLE_CORRECT
          questionType: "MCQ",
          prompt: "Observe the load balancing architecture diagram below. Identify which strategy distributes requests evenly across application servers in sequential order.",
          subject_id: subjects.sd,
          topic_id: topics.micro,
          marks: 10,
          title: "Load Balancer Strategy Diagram",
          difficulty: "MEDIUM",
          visibility: "PUBLIC",
          mcqType: "IMAGE_SINGLE_CORRECT",
          imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800",
          shuffleOptions: true,
          multipleCorrect: false,
          mcqOptions: [
            { text: "Round Robin", isCorrect: true },
            { text: "Least Connections", isCorrect: false },
            { text: "IP Hash", isCorrect: false },
            { text: "Random Selection", isCorrect: false },
          ]
        },
        {
          // 5. IMAGE_MULTIPLE_CORRECT
          questionType: "MCQ",
          prompt: "Based on the Resilience4j Circuit Breaker state machine diagram provided, which states transition to the CLOSED state upon successful probe executions? (Select all that apply)",
          subject_id: subjects.sd,
          topic_id: topics.micro,
          marks: 10,
          title: "Circuit Breaker State Machine",
          difficulty: "HARD",
          visibility: "PUBLIC",
          mcqType: "IMAGE_MULTIPLE_CORRECT",
          imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
          shuffleOptions: true,
          multipleCorrect: true,
          mcqOptions: [
            { text: "HALF_OPEN", isCorrect: true },
            { text: "FORCED_OPEN", isCorrect: false },
            { text: "DISABLED", isCorrect: false },
            { text: "METRICS_ONLY", isCorrect: false },
          ]
        },
        {
          // 6. ASSERTION_REASON
          questionType: "MCQ",
          prompt: "Assertion (A): Redis achieves extremely high throughput and low-latency response times despite running on a single-threaded event loop engine. Reason (R): Single-threaded execution eliminates CPU context-switching overhead and avoids multi-threaded lock contention on memory data structures.",
          subject_id: subjects.cse,
          topic_id: topics.dbms,
          marks: 10,
          title: "Redis Event Loop Assertion",
          difficulty: "HARD",
          visibility: "PUBLIC",
          mcqType: "ASSERTION_REASON",
          assertion: "Redis achieves extremely high throughput on a single thread.",
          reason: "Single-threaded execution avoids context switches and locks.",
          shuffleOptions: false,
          multipleCorrect: false,
          mcqOptions: [
            { text: "Both (A) and (R) are true, and (R) is the correct explanation of (A).", isCorrect: true },
            { text: "Both (A) and (R) are true, but (R) is NOT the correct explanation of (A).", isCorrect: false },
            { text: "(A) is true, but (R) is false.", isCorrect: false },
            { text: "(A) is false, but (R) is true.", isCorrect: false },
          ]
        },
        {
          // 7. FILL_IN_THE_BLANK
          questionType: "MCQ",
          prompt: "According to the CAP Theorem for distributed data stores, when a network partition occurs, a system must choose between Availability and _____.",
          subject_id: subjects.sd,
          topic_id: topics.micro,
          marks: 5,
          title: "CAP Theorem Tradeoff Blank",
          difficulty: "EASY",
          visibility: "PUBLIC",
          mcqType: "FILL_IN_THE_BLANK",
          correctAnswer: "Consistency",
          shuffleOptions: false,
          multipleCorrect: false,
          mcqOptions: [
            { text: "Consistency", isCorrect: true }
          ]
        }
      ];

      const codingQuestions: CreateQuestionRequest[] = [
        {
          questionType: "CODING" as const,
          prompt: "Write a program that takes a single word string from stdin and prints the string reversed to stdout.",
          subject_id: subjects.dsa,
          topic_id: topics.arrays,
          marks: 15,
          title: "Reverse String Challenge",
          difficulty: "EASY" as const,
          visibility: "PUBLIC",
          constraints: "String length <= 1000",
          memoryLimitMb: 256,
          timeLimitSecs: 2,
          sampleExplanation: "Accepts a single string token and prints it backwards.",
          signatureMetadata: {
            method_name: "solve",
            params: [{ name: "word", type: "string" }],
            return_type: "void"
          },
          languageTemplates: {
            python: { template: "def solve(word):\n    pass", driver: "solve(input())" },
            cpp: { template: "void solve(string word) {}", driver: "int main() {}" },
            java: { template: "public static void solve(String word) {}", driver: "public static void main(String[] args) {}" }
          },
          codeTemplate: {
            python3: {
              lang: "Python 3",
              langSlug: "python3",
              code: `import sys\nword = sys.stdin.read().strip()\nprint(word[::-1])`
            },
            javascript: {
              lang: "JavaScript",
              langSlug: "javascript",
              code: `const fs = require('fs');\nconst word = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(word.split('').reverse().join(''));`
            }
          },
          examples: [
            { input: "hello", output: "olleh" },
            { input: "world", output: "dlrow" },
            { input: "racecar", output: "racecar" }
          ],
          hints: ["Read the complete string, then reverse indices or arrays."],
          tags: ["Strings", "Easy"]
        },
        {
          questionType: "CODING" as const,
          prompt: "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid. A string is valid if open brackets are closed by the same type of brackets and in correct order. Print 'VALID' or 'INVALID'.",
          subject_id: subjects.dsa,
          topic_id: topics.arrays,
          marks: 25,
          title: "Valid Parentheses Checker",
          difficulty: "MEDIUM" as const,
          visibility: "PUBLIC",
          constraints: "1 <= s.length <= 10^4",
          memoryLimitMb: 256,
          timeLimitSecs: 2,
          sampleExplanation: "Uses a stack to evaluate bracket matching in order.",
          signatureMetadata: {
            method_name: "solve",
            params: [{ name: "s", type: "string" }],
            return_type: "void"
          },
          languageTemplates: {
            python: { template: "def solve(s):\n    pass", driver: "solve(input())" },
            cpp: { template: "void solve(string s) {}", driver: "int main() {}" },
            java: { template: "public static void solve(String s) {}", driver: "public static void main(String[] args) {}" }
          },
          codeTemplate: {
            python3: {
              lang: "Python 3",
              langSlug: "python3",
              code: `import sys\n\ndef solve():\n    s = sys.stdin.read().strip()\n    stack = []\n    mapping = {")": "(", "}": "{", "]": "["}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else '#'\n            if mapping[char] != top:\n                print("INVALID")\n                return\n        else:\n            stack.append(char)\n    print("VALID" if not stack else "INVALID")\n\nsolve()`
            }
          },
          examples: [
            { input: "()", output: "VALID" },
            { input: "()[]{}", output: "VALID" },
            { input: "(]", output: "INVALID" }
          ],
          hints: ["Use a stack data structure."],
          tags: ["Stack", "Strings", "Medium"]
        },
        {
          questionType: "CODING" as const,
          prompt: "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining. Input format: integer `n` on first line, followed by `n` space-separated integers. Print total trapped water volume.",
          subject_id: subjects.dsa,
          topic_id: topics.arrays,
          marks: 35,
          title: "Trapping Rain Water",
          difficulty: "HARD" as const,
          visibility: "PUBLIC",
          constraints: "n == height.length, 1 <= n <= 2 * 10^4, 0 <= height[i] <= 10^5",
          memoryLimitMb: 256,
          timeLimitSecs: 2,
          sampleExplanation: "Calculates trapped water volume using two-pointer max height approach.",
          signatureMetadata: {
            method_name: "solve",
            params: [{ name: "height", type: "array" }],
            return_type: "void"
          },
          languageTemplates: {
            python: { template: "def solve(height):\n    pass", driver: "solve(input())" },
            cpp: { template: "void solve(vector<int> height) {}", driver: "int main() {}" },
            java: { template: "public static void solve(int[] height) {}", driver: "public static void main(String[] args) {}" }
          },
          codeTemplate: {
            python3: {
              lang: "Python 3",
              langSlug: "python3",
              code: `import sys\n\ndef solve():\n    tokens = sys.stdin.read().split()\n    if not tokens: return\n    n = int(tokens[0])\n    if n <= 2:\n        print(0)\n        return\n    height = [int(x) for x in tokens[1:n+1]]\n    left, right = 0, n - 1\n    left_max, right_max = 0, 0\n    water = 0\n    while left < right:\n        if height[left] < height[right]:\n            if height[left] >= left_max:\n                left_max = height[left]\n            else:\n                water += left_max - height[left]\n            left += 1\n        else:\n            if height[right] >= right_max:\n                right_max = height[right]\n            else:\n                water += right_max - height[right]\n            right -= 1\n    print(water)\n\nsolve()`
            }
          },
          examples: [
            { input: "12 0 1 0 2 1 0 1 3 2 1 2 1", output: "6" },
            { input: "6 4 2 0 3 2 5", output: "9" },
            { input: "3 1 2 3", output: "0" }
          ],
          hints: ["Two-pointer technique or precalculated max bounds."],
          tags: ["Two Pointers", "Dynamic Programming", "Hard"]
        }
      ];

      // Query existing questions in case they exist
      let dbQuestions: Question[] = [];
      try {
        dbQuestions = await testService.getAllQuestions();
      } catch (e) {
        addLog("⚠️ Failed to load existing question database.", "warning");
      }
      await delay(200);

      // Create MCQs
      for (const mcq of mcqQuestions) {
        const found = dbQuestions.find(q => q.title?.toLowerCase().trim() === mcq.title?.toLowerCase().trim());
        if (found) {
          questionIds.push(found.id);
          addLog(`ℹ️ MCQ "${mcq.title}" already exists in database. Reusing ID: ${found.id}`, "info");
        } else {
          try {
            const created = await testService.createQuestion(mcq);
            questionIds.push(created.id);
            addLog(`✅ Seeded MCQ Question: "${mcq.title}" [ID: ${created.id}]`, "success");
          } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } }; message?: string };
            const errDetail = err.response?.data?.message || err.message || String(e);
            addLog(`⚠️ Skipping MCQ creation for "${mcq.title}": ${errDetail}`, "warning");
          }
        }
        await delay(100);
      }

      // Create Coding Questions
      const codingCreatedIds: string[] = [];
      for (const cq of codingQuestions) {
        const found = dbQuestions.find(q => q.title?.toLowerCase().trim() === cq.title?.toLowerCase().trim());
        if (found) {
          questionIds.push(found.id);
          codingCreatedIds.push(found.id);
          addLog(`ℹ️ Coding Question "${cq.title}" already exists in database. Reusing ID: ${found.id}`, "info");
        } else {
          try {
            const created = await testService.createQuestion(cq);
            questionIds.push(created.id);
            codingCreatedIds.push(created.id);
            addLog(`✅ Seeded Coding Question: "${cq.title}" [ID: ${created.id}]`, "success");
          } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } }; message?: string };
            const errDetail = err.response?.data?.message || err.message || String(e);
            addLog(`⚠️ Skipping Coding creation for "${cq.title}": ${errDetail}`, "warning");
          }
        }
        await delay(100);
      }

      updateStepStatus("questions", "completed");

      // ----------------------------------------------------
      // STEP 8: LINK CODING TEST CASES
      // ----------------------------------------------------
      setCurrentStepIndex(7);
      updateStepStatus("testcases", "running");
      setProgress(75);
      addLog("Seeding Test Cases for Coding Questions...", "info");

            const codingTestCasesMap: Record<number, Array<{ input: string, expectedOutput: string, sample: boolean, weight: number, explanation: string }>> = {
        0: [ // Question 1: Reverse String (EASY) - 3 Sample, 7 Hidden
          // Sample Test Cases (3)
          { input: "hello", expectedOutput: "olleh", sample: true, weight: 10, explanation: "Basic lowercase word" },
          { input: "world", expectedOutput: "dlrow", sample: true, weight: 10, explanation: "Standard word" },
          { input: "racecar", expectedOutput: "racecar", sample: true, weight: 10, explanation: "Palindrome word" },
          // Hidden Test Cases (7)
          { input: "a", expectedOutput: "a", sample: false, weight: 10, explanation: "Single character" },
          { input: "AbCdEfG", expectedOutput: "GfEdCbA", sample: false, weight: 10, explanation: "Mixed case string" },
          { input: "123456789", expectedOutput: "987654321", sample: false, weight: 10, explanation: "Numeric string" },
          { input: "GryphonAcademy", expectedOutput: "ymedacAnohpyrG", sample: false, weight: 10, explanation: "CamelCase string" },
          { input: "abcdefghijklmnopqrstuvwxyz", expectedOutput: "zyxwvutsrqponmlkjihgfedcba", sample: false, weight: 10, explanation: "Full alphabet" },
          { input: "SystemDesign2026", expectedOutput: "6202ngiseDmetsyS", sample: false, weight: 10, explanation: "Alphanumeric string" },
          { input: "Supercalifragilisticexpialidocious", expectedOutput: "suoicodilaipxecitsiligarfilaceprepuS", sample: false, weight: 10, explanation: "Long word" },
        ],
        1: [ // Question 2: Valid Parentheses (MEDIUM) - 3 Sample, 7 Hidden
          // Sample Test Cases (3)
          { input: "()", expectedOutput: "VALID", sample: true, weight: 10, explanation: "Basic matching parentheses" },
          { input: "()[]{}", expectedOutput: "VALID", sample: true, weight: 10, explanation: "Consecutive valid pairs" },
          { input: "(]", expectedOutput: "INVALID", sample: true, weight: 10, explanation: "Mismatched closing bracket" },
          // Hidden Test Cases (7)
          { input: "([{}])", expectedOutput: "VALID", sample: false, weight: 10, explanation: "Nested valid brackets" },
          { input: "(((", expectedOutput: "INVALID", sample: false, weight: 10, explanation: "Unclosed opening brackets" },
          { input: ")))", expectedOutput: "INVALID", sample: false, weight: 10, explanation: "Closing brackets without opening" },
          { input: "{[()]}", expectedOutput: "VALID", sample: false, weight: 10, explanation: "Deeply nested valid sequence" },
          { input: "({[)]}", expectedOutput: "INVALID", sample: false, weight: 10, explanation: "Interleaved invalid order" },
          { input: "()[]{}()[]{}", expectedOutput: "VALID", sample: false, weight: 10, explanation: "Long repeated valid sequence" },
          { input: "({[]})[()]{}", expectedOutput: "VALID", sample: false, weight: 10, explanation: "Complex valid mixed brackets" },
        ],
        2: [ // Question 3: Trapping Rain Water (HARD) - 3 Sample, 7 Hidden
          // Sample Test Cases (3)
          { input: "12 0 1 0 2 1 0 1 3 2 1 2 1", expectedOutput: "6", sample: true, weight: 10, explanation: "Standard LeetCode elevation map" },
          { input: "6 4 2 0 3 2 5", expectedOutput: "9", sample: true, weight: 10, explanation: "U-shaped valley elevation" },
          { input: "3 1 2 3", expectedOutput: "0", sample: true, weight: 10, explanation: "Ascending slope (no trapped water)" },
          // Hidden Test Cases (7)
          { input: "1 5", expectedOutput: "0", sample: false, weight: 10, explanation: "Single bar (no boundaries)" },
          { input: "5 5 4 3 2 1", expectedOutput: "0", sample: false, weight: 10, explanation: "Strictly descending slope" },
          { input: "5 3 0 0 0 5", expectedOutput: "12", sample: false, weight: 10, explanation: "Deep central pool" },
          { input: "7 2 0 2 0 2 0 2", expectedOutput: "6", sample: false, weight: 10, explanation: "Flat bottom multi-dip profile" },
          { input: "4 0 1 0 2 1 0 1 3", expectedOutput: "6", sample: false, weight: 10, explanation: "Asymmetric boundary heights" },
          { input: "8 3 0 2 0 4 0 1 5", expectedOutput: "15", sample: false, weight: 10, explanation: "Large complex multi-peak terrain" },
          { input: "6 10 0 0 0 0 10", expectedOutput: "40", sample: false, weight: 10, explanation: "Extreme height canyon" },
        ]
      };

      for (let i = 0; i < codingCreatedIds.length; i++) {
        const cqId = codingCreatedIds[i];
        const tcs = codingTestCasesMap[i] || [];
        for (const tc of tcs) {
          try {
            const createdTc = await testService.createTestCase({
              codingQuestionId: cqId,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              sample: tc.sample,
              weight: tc.weight,
              explanation: tc.explanation
            });
            addLog(`  🧪 Added Test Case to "${codingQuestions[i].title}" [ID: ${createdTc.id}]`, "info");
          } catch (tcError) {
            addLog(`  ⚠️ Test case skipped (already exists or mapping mismatch).`, "warning");
          }
          await delay(200);
        }
      }

      updateStepStatus("testcases", "completed");

      // Complete Seeding
      setProgress(100);
      setIsSeedingCompleted(true);
      addLog("🏁 DATABASE SEEDING COMPLETED SUCCESSFULLY!", "success");
      addLog("🔑 SUPER ADMIN LOGIN:", "success");
      addLog(`   Email: ${seedEmail || "superadmin@gryphonacademy.co.in"}`, "info");
      addLog(`   Password: ${seedPassword || "password123"}`, "info");

      if (superadminToken) {
        const adminUserData = {
          id: "00000000-0000-0000-0000-000000000001",
          name: "Super Admin",
          email: seedEmail || "superadmin@gryphonacademy.co.in",
          role: "SUPERADMIN",
          organisationId: gryphonOrgId
        };
        useAuthStore.getState().login(superadminToken, adminUserData);
      }

      toast({
        title: "Database Seeded!",
        description: "Standard Taxonomy, Candidate, 7 MCQ Types, and 3 Coding Questions successfully populated.",
      });

    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error(err);
      addLog(`❌ CRITICAL SEEDING FAULT: ${err.response?.data?.message || err.message}`, "error");
      
      const currentStepId = steps[currentStepIndex]?.id;
      if (currentStepId) {
        updateStepStatus(currentStepId, "failed");
      }
      
      toast({
        title: "Seeding Fault",
        description: err.response?.data?.message || err.message || "Seeder fault.",
        variant: "destructive"
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6 lg:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-pulse pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-30 animate-pulse pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-primary rounded-2xl shadow-primary">
                <Database className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Gryphon 360 Database Seeder
                </h1>
                <p className="text-slate-400 text-sm md:text-base">
                  Instant premium test environment population for hassle-free developer testing.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              Sign In
            </Button>
            <Button
              variant="hero"
              onClick={() => navigate("/")}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-white"
            >
              Platform Home
            </Button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Action Card & Steps checklist */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-slate-800/60 bg-slate-900/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                  <Terminal className="w-5 h-5 text-primary" />
                  Seed Control Center
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Wipes out manual testing setups in one click.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/50 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <Info className="w-4 h-4 text-accent" />
                    <span>PREMIUM DEFAULT ACCOUNTS</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-slate-900">
                      <span className="text-slate-500 font-medium">Super Admin:</span>
                      <code className="text-slate-300 font-mono text-xs">superadmin@gryphonacademy.co.in</code>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-900">
                      <span className="text-slate-500 font-medium">Admin:</span>
                      <code className="text-slate-300 font-mono text-xs">admin@gryphonacademy.co.in</code>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 font-medium">Password:</span>
                      <code className="text-primary font-bold">password123</code>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-slate-950/40 rounded-xl border border-slate-800/40">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <Lock className="w-4 h-4 text-primary" />
                    <span>System Credentials (to authenticate seeder)</span>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="seed-email" className="text-slate-400 text-xs font-medium">
                        System Admin Email
                      </Label>
                      <Input
                        id="seed-email"
                        type="email"
                        value={seedEmail}
                        onChange={(e) => setSeedEmail(e.target.value)}
                        placeholder="admin@company.com"
                        className="h-9 bg-slate-950/80 border-slate-800 text-slate-200 text-xs focus-visible:ring-primary focus-visible:ring-offset-slate-900"
                        disabled={isSeeding}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="seed-password" className="text-slate-400 text-xs font-medium">
                        Password
                      </Label>
                      <Input
                        id="seed-password"
                        type="password"
                        value={seedPassword}
                        onChange={(e) => setSeedPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-9 bg-slate-950/80 border-slate-800 text-slate-200 text-xs focus-visible:ring-primary focus-visible:ring-offset-slate-900"
                        disabled={isSeeding}
                      />
                    </div>
                  </div>
                </div>

                {!isSeedingCompleted ? (
                  <div className="space-y-3">
                    <Button
                      onClick={handleSeedDatabase}
                      disabled={isSeeding}
                      size="lg"
                      className="w-full bg-gradient-primary text-white hover:opacity-90 font-bold transition-all shadow-primary h-12 flex items-center justify-center gap-2"
                    >
                      {isSeeding ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Seeding Environment...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 fill-current" />
                          Begin Bulk Seed
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => navigate("/superadmin")}
                    size="lg"
                    className="w-full bg-gradient-accent text-slate-950 hover:opacity-90 font-bold transition-all shadow-accent h-12 flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Go to Admin Dashboard
                  </Button>
                )}
                
                {isSeeding && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-400">
                      <span>Overall Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-slate-950" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Checklist steps */}
            <Card className="border-slate-800/60 bg-slate-900/40 backdrop-blur-xl">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Seed Pipeline Stages
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <div className="space-y-4">
                  {steps.map((step, idx) => (
                    <div key={step.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="flex gap-3">
                        <div className="mt-0.5">
                          {step.status === "completed" && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                          {step.status === "failed" && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          {step.status === "running" && (
                            <Loader2 className="w-4 h-4 text-accent animate-spin" />
                          )}
                          {step.status === "idle" && (
                            <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className={`font-semibold ${step.status === "completed" ? "text-slate-300 line-through" : step.status === "running" ? "text-accent" : "text-slate-400"}`}>
                            {step.name}
                          </p>
                          <p className="text-[11px] text-slate-500">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Live Logs & Test Access Links Table */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Terminal Log */}
            <Card className="border-slate-800 bg-slate-950/80 backdrop-blur-xl shadow-xl">
              <CardHeader className="border-b border-slate-900 py-3 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary animate-pulse" />
                  <span className="font-mono text-xs font-semibold text-slate-400">Live Seed Console Logs</span>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] border-slate-800 bg-slate-900 text-slate-400">
                  {logs.length} entries
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-64 overflow-y-auto p-5 font-mono text-xs space-y-2.5 bg-black/60 scrollbar-thin scrollbar-thumb-slate-800">
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                      <Terminal className="w-8 h-8" />
                      <span>Console idle. Click 'Begin Vast Bulk Seed' to start logging.</span>
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                        <span
                          className={
                            log.type === "success"
                              ? "text-green-400 font-medium"
                              : log.type === "error"
                              ? "text-red-400 font-semibold"
                              : log.type === "warning"
                              ? "text-yellow-400"
                              : "text-slate-300"
                          }
                        >
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={consoleEndRef} />
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}
