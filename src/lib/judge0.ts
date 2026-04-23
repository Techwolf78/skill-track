/**
 * Production-Ready Judge0 Integration
 * LeetCode-Level Coding Execution Engine
 * Supports: Arrays, Trees, LinkedLists, Graphs, Strings, Design Problems
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum ProblemType {
  ARRAY = "array",
  STRING = "string",
  TREE = "tree",
  LINKED_LIST = "linkedlist",
  GRAPH = "graph",
  DYNAMIC_PROGRAMMING = "dp",
  DESIGN = "design",
  BACKTRACKING = "backtracking",
  BIT_MANIPULATION = "bitmask",
  MATH = "math",
}

export enum Difficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

export enum ExecutionStatus {
  ACCEPTED = "Accepted",
  WRONG_ANSWER = "Wrong Answer",
  TIME_LIMIT_EXCEEDED = "Time Limit Exceeded",
  RUNTIME_ERROR = "Runtime Error",
  COMPILE_ERROR = "Compilation Error",
  MEMORY_LIMIT_EXCEEDED = "Memory Limit Exceeded",
  PENDING = "Pending",
  IN_QUEUE = "In Queue",
  PROCESSING = "Processing",
}

/**
 * Maps raw compiler/runtime errors to user-friendly hints
 */
export function mapFriendlyError(error: string, lang: string): string {
  if (!error) return "";

  const err = error.toLowerCase();

  // Java specific
  if (lang === "java") {
    if (err.includes("class, interface, or enum expected")) {
      return "Hint: It looks like your code is missing a class wrapper. Ensure your code is inside 'class Solution { ... }'.";
    }
    if (err.includes("cannot find symbol") && err.includes("class solution")) {
      return "Hint: The test runner couldn't find your 'Solution' class. Make sure your class is named exactly 'Solution'.";
    }
    if (err.includes("cannot find symbol") && err.includes("method")) {
      return "Hint: The function name in your code doesn't match what the system is looking for. Check the 'Function Name' in the problem statement.";
    }
  }

  // C++ specific
  if (lang === "cpp") {
    if (err.includes("'string' was not declared") || err.includes("'string' does not name a type")) {
      return "Hint: In C++, use lowercase 'string' (not 'String').";
    }
    if (err.includes("was not declared in this scope")) {
      return "Hint: You are using a variable or function that hasn't been defined yet.";
    }
  }

  // Python specific
  if (lang.includes("python")) {
    if (err.includes("indentationerror")) {
      return "Hint: Check your code's indentation. Python relies on consistent spacing/tabs.";
    }
    if (err.includes("nameerror")) {
      return "Hint: You are using a variable that hasn't been defined.";
    }
  }

  // JavaScript specific
  if (lang === "javascript") {
    if (err.includes("is not defined")) {
      return "Hint: A variable or function you're using hasn't been defined.";
    }
  }

  // General
  if (err.includes("stackoverflowerror") || err.includes("recursion depth exceeded")) {
    return "Hint: Your code might have infinite recursion. Check your base cases.";
  }

  return "";
}

export enum Language {
  PYTHON = "python3",
  JAVASCRIPT = "javascript",
  JAVA = "java",
  CPP = "cpp",
}

// Language ID mapping for Judge0
export const LANGUAGE_MAP: Record<string, number> = {
  python3: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
};

/**
 * Robustly infer function metadata from code snippets
 */
export function inferMetadataFromSnippets(
  snippets: { code: string; langSlug: string }[],
): QuestionMetadata {
  // Try Java first as it has strong typing
  const javaSnippet = snippets?.find((s) => s.langSlug === "java")?.code || "";
  const javaMatch = javaSnippet.match(
    /public\s+([\w[\]<>]+)\s+(\w+)\s*\(([^)]*)\)/,
  );

  if (javaMatch) {
    const returnType = javaMatch[1];
    const functionName = javaMatch[2];
    const paramsRaw = javaMatch[3]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const parameterTypes = paramsRaw.map((p) => {
      const parts = p.split(/\s+/);
      return {
        name: parts[parts.length - 1],
        type: parts.slice(0, parts.length - 1).join(" "),
      };
    });

    return {
      functionName,
      parameterTypes,
      returnType: { type: returnType },
      category: ProblemType.ARRAY,
    };
  }

  // Try C++
  const cppSnippet = snippets?.find((s) => s.langSlug === "cpp")?.code || "";
  const cppMatch = cppSnippet.match(
    /(\w+(?:<[^>]+>)?[\s&*]*)\s+(\w+)\s*\(([^)]*)\)/,
  );

  if (cppMatch) {
    const returnType = cppMatch[1].trim();
    const functionName = cppMatch[2].trim();
    const paramsRaw = cppMatch[3]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const parameterTypes = paramsRaw.map((p) => {
      // Robust C++ parameter split: type [&/*] name
      // Match the last word as the name, everything before as type
      const match = p.match(/^(.*?)\s*([&*]*\s*\w+)$/);
      if (match) {
        let type = match[1].trim();
        const namePart = match[2].trim();

        if (namePart.startsWith("&") || namePart.startsWith("*")) {
          type += namePart[0];
          const name = namePart.substring(1).trim();
          return { name, type: type.trim() };
        }
        return { name: namePart, type: type.trim() };
      }
      return { name: "arg", type: p };
    });

    return {
      functionName,
      parameterTypes,
      returnType: { type: returnType },
      category: ProblemType.ARRAY,
    };
  }

  // Try Python
  const pythonSnippet =
    snippets?.find((s) => s.langSlug === "python3" || s.langSlug === "python")
      ?.code || "";
  const pyMatch = pythonSnippet.match(/def\s+(\w+)\s*\(([^)]+)\)/);

  if (pyMatch) {
    const functionName = pyMatch[1];
    const paramsRaw = pyMatch[2]
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p !== "self");
    const parameterTypes = paramsRaw.map((p) => ({
      name: p.split(":")[0].trim(),
      type: "auto",
    }));

    return {
      functionName,
      parameterTypes:
        parameterTypes.length > 0
          ? parameterTypes
          : [{ name: "input", type: "string" }],
      returnType: { type: "auto" },
      category: ProblemType.ARRAY,
    };
  }

  // Fallback to JS
  const jsSnippet =
    snippets?.find((s) => s.langSlug === "javascript")?.code || "";
  const funcMatch =
    jsSnippet.match(/var\s+(\w+)\s*=\s*function\s*\(([^)]+)\)/) ||
    jsSnippet.match(/function\s+(\w+)\s*\(([^)]+)\)/);
  const functionName = funcMatch ? funcMatch[1] : "solution";
  const params = funcMatch
    ? funcMatch[2]
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : ["input"];

  return {
    functionName,
    parameterTypes: params.map((p) => ({ name: p, type: "string" })),
    returnType: { type: "string" },
    category: ProblemType.ARRAY,
  };
}

const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com";
const env =
  typeof import.meta !== "undefined"
    ? (import.meta as unknown as { env: Record<string, string> }).env
    : undefined;
const globalObj = globalThis as unknown as {
  process?: { env?: Record<string, string> };
};
const RAPIDAPI_KEY =
  env?.VITE_RAPIDAPI_KEY ||
  env?.RAPIDAPI_KEY ||
  globalObj.process?.env?.VITE_RAPIDAPI_KEY ||
  globalObj.process?.env?.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "judge0-ce.p.rapidapi.com";

function encodeBase64(input: string): string {
  if (typeof btoa === "function") {
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf-8").toString("base64");
  }

  throw new Error("Base64 encoding is not available in this environment.");
}

function decodeBase64(input: string): string {
  if (typeof atob === "function") {
    const binary = atob(input);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "base64").toString("utf-8");
  }

  throw new Error("Base64 decoding is not available in this environment.");
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface SubmissionResponse {
  token?: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: StatusDetails;
  time: string | null;
  memory: number | null;
  cpu_time?: string | null;
  wall_time?: string | null;
  exit_code?: number | null;
  signal?: number | null;
  created_at?: string;
  finished_at?: string;
}

export interface StatusDetails {
  id: number;
  description: string;
}

export interface QuestionMetadata {
  functionName: string;
  parameterTypes: ParamType[];
  returnType: ReturnType;
  category: ProblemType;
  difficulty?: Difficulty;
  timeLimit?: number; // in milliseconds
  memoryLimit?: number; // in MB
  description?: string;
  examples?: TestCase[];
  constraints?: string[];
  tags?: string[];
}

export interface ParamType {
  name: string;
  type: string; // 'TreeNode', 'ListNode', 'int[]', 'string', etc.
  description?: string;
}

export interface ReturnType {
  type: string;
  description?: string;
}

export interface TestCase {
  input: Record<string, unknown>;
  expected: unknown;
  explanation?: string;
}

export interface ExecutionResult {
  accepted: boolean;
  status: ExecutionStatus;
  output: unknown;
  expectedOutput?: unknown;
  message: string;
  executionTime: string | null;
  memory: number | null;
  stderr: string | null;
  compileOutput: string | null;
  token: string;
}

export interface BatchExecutionResult {
  results: ExecutionResult[];
  totalTime: number;
  passedCount: number;
  failedCount: number;
}

// ============================================================================
// DATA STRUCTURE DEFINITIONS
// ============================================================================

export class TreeNode {
  val: number;
  left: TreeNode | null = null;
  right: TreeNode | null = null;

  constructor(
    val: number = 0,
    left: TreeNode | null = null,
    right: TreeNode | null = null,
  ) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

export class ListNode {
  val: number;
  next: ListNode | null = null;

  constructor(val: number = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

export class Node {
  val: number;
  neighbors: Node[] = [];

  constructor(val: number = 0, neighbors: Node[] = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}

// ============================================================================
// COMMON UTILITIES & HELPERS
// ============================================================================

/**
 * Builds a TreeNode from array representation
 * Example: [3,9,20,null,null,15,7] -> TreeNode
 */
export function buildTree(data: unknown): TreeNode | null {
  if (!data || (Array.isArray(data) && data.length === 0)) return null;

  const arr = Array.isArray(data) ? data : [data];
  if (arr[0] === null || arr[0] === undefined) return null;

  const root = new TreeNode(arr[0] as number);
  const queue: TreeNode[] = [root];
  let i = 1;

  while (queue.length > 0 && i < arr.length) {
    const curr = queue.shift()!;

    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
      curr.left = new TreeNode(arr[i] as number);
      queue.push(curr.left);
    }
    i++;

    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
      curr.right = new TreeNode(arr[i] as number);
      queue.push(curr.right);
    }
    i++;
  }

  return root;
}

/**
 * Builds a ListNode from array representation
 * Example: [1,2,3] -> ListNode
 */
export function buildList(data: unknown): ListNode | null {
  if (!data || (Array.isArray(data) && data.length === 0)) return null;

  const arr = Array.isArray(data) ? data : [data];
  if (arr[0] === null || arr[0] === undefined) return null;

  const head = new ListNode(arr[0] as number);
  let curr = head;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] !== null && arr[i] !== undefined) {
      curr.next = new ListNode(arr[i] as number);
      curr = curr.next;
    }
  }

  return head;
}

/**
 * Converts TreeNode to array representation for output
 */
export function treeToArray(root: TreeNode | null): (number | null)[] {
  if (!root) return [];

  const result: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [root];

  while (queue.length > 0) {
    const node = queue.shift();
    if (node === null) {
      result.push(null);
    } else {
      result.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    }
  }

  // Remove trailing nulls
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop();
  }

  return result;
}

/**
 * Converts ListNode to array representation for output
 */
export function listToArray(head: ListNode | null): number[] {
  const result: number[] = [];
  let curr = head;

  while (curr) {
    result.push(curr.val);
    curr = curr.next;
  }

  return result;
}

/**
 * Deep equality check for objects/arrays
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(objA[key], objB[key]));
  }

  return false;
}

// ============================================================================
// LANGUAGE WRAPPERS
// ============================================================================

const WRAPPERS: Record<
  Language,
  (code: string, metadata: QuestionMetadata) => string
> = {
  // ========== PYTHON WRAPPER ==========
  [Language.PYTHON]: (code: string, metadata: QuestionMetadata): string => `
import sys
import json
import collections
import math
import heapq
from collections import defaultdict, deque, Counter
from typing import Optional, List, Dict, Tuple

# ============ DATA STRUCTURES ============
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

# ============ UTILITIES ============
def build_tree(data):
    if not data or data == "[]": return None
    if isinstance(data, str):
        data = json.loads(data)
    if not data or data[0] is None: return None
    
    root = TreeNode(data[0])
    queue = deque([root])
    i = 1
    while queue and i < len(data):
        curr = queue.popleft()
        if i < len(data) and data[i] is not None:
            curr.left = TreeNode(data[i])
            queue.append(curr.left)
        i += 1
        if i < len(data) and data[i] is not None:
            curr.right = TreeNode(data[i])
            queue.append(curr.right)
        i += 1
    return root

def build_list(data):
    if not data: return None
    if isinstance(data, str):
        data = json.loads(data)
    if not data or data[0] is None: return None
    
    head = ListNode(data[0])
    curr = head
    for i in range(1, len(data)):
        if data[i] is not None:
            curr.next = ListNode(data[i])
            curr = curr.next
    return head

def tree_to_array(root):
    if not root: return []
    result = []
    queue = deque([root])
    while queue:
        node = queue.popleft()
        if node is None:
            result.append(None)
        else:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
    while result and result[-1] is None:
        result.pop()
    return result

def list_to_array(head):
    result = []
    curr = head
    while curr:
        result.append(curr.val)
        curr = curr.next
    return result

def serialize(data):
    if isinstance(data, TreeNode):
        return tree_to_array(data)
    if isinstance(data, ListNode):
        return list_to_array(data)
    return data

# ============ USER CODE ============
${code}

# ============ DRIVER CODE ============
if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        try:
            data = json.loads(line)
            sol = Solution()
            func = getattr(sol, "${metadata.functionName}")
            result = None
            
            # Handle different parameter types
            param_types = [p['type'] for p in ${JSON.stringify(metadata.parameterTypes)}]
            param_names = [p['name'] for p in ${JSON.stringify(metadata.parameterTypes)}]
            
            if len(param_types) == 1:
                if param_types[0] == 'TreeNode':
                    root = build_tree(data)
                    result = func(root)
                elif param_types[0] == 'ListNode':
                    head = build_list(data)
                    result = func(head)
                else:
                    result = func(data)
            else:
                # Multiple parameters
                args = []
                for i, p_type in enumerate(param_types):
                    val = None
                    if isinstance(data, dict):
                        val = data.get(param_names[i])
                    elif isinstance(data, list) and i < len(data):
                        val = data[i]
                    else:
                        val = data

                    if p_type == 'TreeNode':
                        args.append(build_tree(val))
                    elif p_type == 'ListNode':
                        args.append(build_list(val))
                    else:
                        args.append(val)
                result = func(*args)
            
            print(json.dumps(serialize(result)))
        except Exception as e:
            print(f"ERROR: {str(e)}", file=sys.stderr)
            sys.exit(1)
`,

  // ========== JAVASCRIPT WRAPPER ==========
  [Language.JAVASCRIPT]: (code: string, metadata: QuestionMetadata): string => `
const fs = require('fs');

// ============ DATA STRUCTURES ============
class TreeNode {
    constructor(val = 0, left = null, right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

class Node {
    constructor(val = 0, neighbors = []) {
        this.val = val;
        this.neighbors = neighbors;
    }
}

// ============ UTILITIES ============
function buildTree(data) {
    if (!data || data.length === 0) return null;
    const root = new TreeNode(data[0]);
    const queue = [root];
    let i = 1;
    while (queue.length > 0 && i < data.length) {
        const curr = queue.shift();
        if (i < data.length && data[i] !== null) {
            curr.left = new TreeNode(data[i]);
            queue.push(curr.left);
        }
        i++;
        if (i < data.length && data[i] !== null) {
            curr.right = new TreeNode(data[i]);
            queue.push(curr.right);
        }
        i++;
    }
    return root;
}

function buildList(data) {
    if (!data || data.length === 0) return null;
    const head = new ListNode(data[0]);
    let curr = head;
    for (let i = 1; i < data.length; i++) {
        if (data[i] !== null) {
            curr.next = new ListNode(data[i]);
            curr = curr.next;
        }
    }
    return head;
}

function treeToArray(root) {
    if (!root) return [];
    const result = [];
    const queue = [root];
    while (queue.length > 0) {
        const node = queue.shift();
        if (node === null) {
            result.push(null);
        } else {
            result.push(node.val);
            queue.push(node.left);
            queue.push(node.right);
        }
    }
    while (result.length > 0 && result[result.length - 1] === null) {
        result.pop();
    }
    return result;
}

function listToArray(head) {
    const result = [];
    let curr = head;
    while (curr) {
        result.push(curr.val);
        curr = curr.next;
    }
    return result;
}

function serialize(data) {
    if (data instanceof TreeNode) return treeToArray(data);
    if (data instanceof ListNode) return listToArray(data);
    return data;
}

// ============ USER CODE ============
${code}

// ============ DRIVER CODE ============
const input = fs.readFileSync(0, 'utf-8');
if (input !== undefined && input !== null) {
    try {
        const trimmedInput = input.trim();
        if (!trimmedInput) {
            process.exit(0);
        }
        const data = JSON.parse(trimmedInput);
        
        // Handle User Code Format (Class vs Function vs Global)
        let solver;
        if (typeof Solution !== 'undefined') {
            solver = new Solution();
        } else if (typeof ${metadata.functionName} === 'function') {
            solver = { "${metadata.functionName}": ${metadata.functionName} };
        } else if (global && typeof global["${metadata.functionName}"] === 'function') {
            solver = { "${metadata.functionName}": global["${metadata.functionName}"] };
        } else {
            // Last resort: check if the function exists in global scope
            const globalFunc = eval("typeof ${metadata.functionName} !== 'undefined' ? ${metadata.functionName} : null");
            if (globalFunc) {
                solver = { "${metadata.functionName}": globalFunc };
            } else {
                throw new Error('Could not find function ${metadata.functionName} or class Solution');
            }
        }

        let result;
        const paramTypes = ${JSON.stringify(metadata.parameterTypes.map((p) => p.type))};
        const func = solver["${metadata.functionName}"] || solver.${metadata.functionName};
        
        if (!func || typeof func !== 'function') {
            throw new Error(\`Function \${metadata.functionName} is not a valid function\`);
        }

        if (paramTypes.length === 1) {
            if (paramTypes[0] === 'TreeNode') {
                const root = buildTree(data);
                result = func.call(solver, root);
            } else if (paramTypes[0] === 'ListNode') {
                const head = buildList(data);
                result = func.call(solver, head);
            } else {
                result = func.call(solver, data);
            }
        } else {
            const args = paramTypes.map((type, idx) => {
                const paramName = ${JSON.stringify(metadata.parameterTypes.map((p) => p.name))}[idx];
                const val = (data && typeof data === 'object' && !Array.isArray(data)) 
                    ? data[paramName] 
                    : (Array.isArray(data) ? data[idx] : data);

                if (type === 'TreeNode') return buildTree(val);
                if (type === 'ListNode') return buildList(val);
                return val;
            });
            result = func.call(solver, ...args);
        }
        
        process.stdout.write(JSON.stringify(serialize(result)));
    } catch (e) {
        process.stderr.write('ERROR: ' + e.message + '\\n' + e.stack);
        process.exit(1);
    }
    }
  `,

  // ========== JAVA WRAPPER ==========
  // ============ JAVA WRAPPER (COMPLETE VERSION) ==========
  [Language.JAVA]: (code: string, metadata: QuestionMetadata): string => {
    // Extract imports from user code to place at top
    const importRegex = /^\s*import\s+.*;/gm;
    const userImports = code.match(importRegex) || [];
    const userCode = code.replace(importRegex, "").trim();

    return `
${userImports.join("\n")}
import java.util.*;
import java.util.stream.*;
import java.util.function.*;
import java.lang.reflect.*;

// ============ DATA STRUCTURES ============
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class Node {
    public int val;
    public List<Node> neighbors;
    public Node() {
        val = 0;
        neighbors = new ArrayList<Node>();
    }
    public Node(int _val) {
        val = _val;
        neighbors = new ArrayList<Node>();
    }
    public Node(int _val, ArrayList<Node> _neighbors) {
        val = _val;
        neighbors = _neighbors;
    }
}

// ============ JSON PARSER (Minimal) ============
class JsonParser {
    private int i;
    private String s;
    public static Object parse(String s) { 
        if (s == null || s.trim().isEmpty()) return null;
        return new JsonParser(s.trim()).parseValue(); 
    }
    private JsonParser(String s) { this.s = s; i = 0; }
    private Object parseValue() {
        skip();
        if (i >= s.length()) return null;
        char c = s.charAt(i);
        if (c == '{') return parseObject();
        if (c == '[') return parseArray();
        if (c == '"') return parseString();
        if (c == 't' && s.startsWith("true", i)) { i += 4; return true; }
        if (c == 'f' && s.startsWith("false", i)) { i += 5; return false; }
        if (c == 'n' && s.startsWith("null", i)) { i += 4; return null; }
        return parseNumber();
    }
    private Map<String, Object> parseObject() {
        Map<String, Object> map = new LinkedHashMap<>();
        i++; // skip {
        while (i < s.length()) {
            skip();
            if (s.charAt(i) == '}') { i++; break; }
            String key = parseString();
            skip(); 
            if (s.charAt(i) == ':') i++; // skip :
            map.put(key, parseValue());
            skip();
            if (i < s.length() && s.charAt(i) == ',') i++;
        }
        return map;
    }
    private List<Object> parseArray() {
        List<Object> list = new ArrayList<>();
        i++; // skip [
        while (i < s.length()) {
            skip();
            if (s.charAt(i) == ']') { i++; break; }
            list.add(parseValue());
            skip();
            if (i < s.length() && s.charAt(i) == ',') i++;
        }
        return list;
    }
    private String parseString() {
        i++; // skip "
        StringBuilder sb = new StringBuilder();
        while (i < s.length() && s.charAt(i) != '"') {
            if (s.charAt(i) == '\\\\' && i + 1 < s.length()) {
                i++; // skip \\
            }
            sb.append(s.charAt(i));
            i++;
        }
        if (i < s.length()) i++; // skip "
        return sb.toString();
    }
    private Number parseNumber() {
        int start = i;
        while (i < s.length() && "0123456789+-.eE".indexOf(s.charAt(i)) >= 0) i++;
        String res = s.substring(start, i);
        try {
            if (res.contains(".") || res.contains("e") || res.contains("E")) return Double.parseDouble(res);
            return Long.parseLong(res);
        } catch (Exception e) { return 0; }
    }
    private void skip() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }
    
    public static String toJson(Object o) {
        if (o == null) return "null";
        if (o instanceof String) return "\\"" + o + "\\"";
        if (o instanceof List) {
            List<?> list = (List<?>) o;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < list.size(); i++) {
                sb.append(toJson(list.get(i)));
                if (i < list.size() - 1) sb.append(",");
            }
            return sb.append("]").toString();
        }
        if (o instanceof int[]) return Arrays.toString((int[]) o);
        if (o instanceof long[]) return Arrays.toString((long[]) o);
        if (o instanceof Object[]) return Arrays.deepToString((Object[]) o);
        return String.valueOf(o);
    }
}

// ============ UTILITIES ============
class Utils {
    
    static TreeNode buildTree(Object data) {
        if (data == null) return null;
        
        List<Object> arr;
        if (data instanceof List) {
            arr = (List<Object>) data;
        } else if (data instanceof String) {
            String str = (String) data;
            if (str.trim().isEmpty() || str.equals("[]") || str.equals("null")) return null;
            Object parsed = JsonParser.parse(str);
            if (parsed instanceof List) arr = (List<Object>) parsed;
            else return null;
        } else {
            return null;
        }
        
        if (arr == null || arr.isEmpty() || arr.get(0) == null) return null;
        
        TreeNode root = new TreeNode(((Number) arr.get(0)).intValue());
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        int i = 1;
        
        while (!queue.isEmpty() && i < arr.size()) {
            TreeNode curr = queue.poll();
            
            if (i < arr.size() && arr.get(i) != null) {
                curr.left = new TreeNode(((Number) arr.get(i)).intValue());
                queue.add(curr.left);
            }
            i++;
            
            if (i < arr.size() && arr.get(i) != null) {
                curr.right = new TreeNode(((Number) arr.get(i)).intValue());
                queue.add(curr.right);
            }
            i++;
        }
        
        return root;
    }
    
    static ListNode buildList(Object data) {
        if (data == null) return null;
        
        List<Object> arr;
        if (data instanceof List) {
            arr = (List<Object>) data;
        } else if (data instanceof String) {
            String str = (String) data;
            if (str.trim().isEmpty() || str.equals("[]")) return null;
            Object parsed = JsonParser.parse(str);
            if (parsed instanceof List) arr = (List<Object>) parsed;
            else return null;
        } else {
            return null;
        }
        
        if (arr == null || arr.isEmpty() || arr.get(0) == null) return null;
        
        ListNode head = new ListNode(((Number) arr.get(0)).intValue());
        ListNode curr = head;
        for (int i = 1; i < arr.size(); i++) {
            if (arr.get(i) != null) {
                curr.next = new ListNode(((Number) arr.get(i)).intValue());
                curr = curr.next;
            }
        }
        return head;
    }
    
    static Object serialize(Object data) {
        if (data instanceof TreeNode) {
            return treeToArray((TreeNode) data);
        }
        if (data instanceof ListNode) {
            return listToArray((ListNode) data);
        }
        if (data instanceof int[]) {
            return data; // Let JsonParser handle array format
        }
        if (data instanceof Object[]) {
            return data;
        }
        return data;
    }
    
    static List<Integer> treeToArray(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        if (root == null) return result;
        
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node == null) {
                result.add(null);
            } else {
                result.add(node.val);
                queue.add(node.left);
                queue.add(node.right);
            }
        }
        
        while (!result.isEmpty() && result.get(result.size() - 1) == null) {
            result.remove(result.size() - 1);
        }
        return result;
    }
    
    static List<Integer> listToArray(ListNode head) {
        List<Integer> result = new ArrayList<>();
        ListNode curr = head;
        while (curr != null) {
            result.add(curr.val);
            curr = curr.next;
        }
        return result;
    }
    
    static Object parseValue(Object value, String targetType) {
        if (value == null) return null;
        
        switch (targetType) {
            case "TreeNode":
                return buildTree(value);
            case "ListNode":
                return buildList(value);
            case "int":
                if (value instanceof Number) return ((Number) value).intValue();
                break;
            case "long":
                if (value instanceof Number) return ((Number) value).longValue();
                break;
            case "double":
                if (value instanceof Number) return ((Number) value).doubleValue();
                break;
            case "boolean":
                if (value instanceof Boolean) return value;
                break;
            case "String":
                return String.valueOf(value);
            case "int[]":
                if (value instanceof List) {
                    List<Number> list = (List<Number>) value;
                    int[] res = new int[list.size()];
                    for (int i = 0; i < list.size(); i++) res[i] = list.get(i).intValue();
                    return res;
                }
                break;
            case "long[]":
                if (value instanceof List) {
                    List<Number> list = (List<Number>) value;
                    long[] res = new long[list.size()];
                    for (int i = 0; i < list.size(); i++) res[i] = list.get(i).longValue();
                    return res;
                }
                break;
            default:
                if (targetType.startsWith("List") || targetType.startsWith("int[]")) {
                    return value;
                }
        }
        return value;
    }
}

// ============ USER CODE ============
${userCode}

// ============ DRIVER CODE ============
public class Main {
    @SuppressWarnings("unchecked")
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        StringBuilder inputBuilder = new StringBuilder();
        while (sc.hasNextLine()) {
            inputBuilder.append(sc.nextLine());
        }
        
        String input = inputBuilder.toString().trim();
        if (input.isEmpty()) {
            return;
        }
        
        try {
            Solution sol = new Solution();
            String functionName = "${metadata.functionName}";
            
            ${metadata.parameterTypes
              .map((p, idx) => `String paramType${idx} = "${p.type}";`)
              .join("\n            ")}
            
            Object result;
            int paramCount = ${metadata.parameterTypes.length};
            Object testInput = JsonParser.parse(input);
            
            if (paramCount == 1) {
                Object parsedInput = Utils.parseValue(testInput, paramType0);
                java.lang.reflect.Method method = Solution.class.getMethod(functionName, getClassForType(paramType0));
                result = method.invoke(sol, parsedInput);
            } else {
                Object[] argsArr = new Object[paramCount];
                Class<?>[] paramClasses = new Class[paramCount];
                
                if (testInput instanceof Map) {
                    Map<String, Object> inputMap = (Map<String, Object>) testInput;
                    ${metadata.parameterTypes
                      .map(
                        (p, idx) => `
                    argsArr[${idx}] = Utils.parseValue(inputMap.get("${p.name}"), paramType${idx});
                    paramClasses[${idx}] = getClassForType(paramType${idx});
                    `,
                      )
                      .join("")}
                } else if (testInput instanceof List) {
                    List<Object> inputList = (List<Object>) testInput;
                    ${metadata.parameterTypes
                      .map(
                        (p, idx) => `
                    argsArr[${idx}] = Utils.parseValue(inputList.get(${idx}), paramType${idx});
                    paramClasses[${idx}] = getClassForType(paramType${idx});
                    `,
                      )
                      .join("")}
                }
                
                java.lang.reflect.Method method = Solution.class.getMethod(functionName, paramClasses);
                result = method.invoke(sol, argsArr);
            }
            
            if (result != null) {
                System.out.println(JsonParser.toJson(Utils.serialize(result)));
            } else {
                System.out.println("null");
            }
            
        } catch (Exception e) {
            Throwable cause = e.getCause();
            System.err.println("Runtime Error: " + (cause != null ? cause.getMessage() : e.getMessage()));
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    private static Class<?> getClassForType(String type) {
        switch (type) {
            case "TreeNode": return TreeNode.class;
            case "ListNode": return ListNode.class;
            case "int": return int.class;
            case "int[]": return int[].class;
            case "long": return long.class;
            case "long[]": return long[].class;
            case "double": return double.class;
            case "boolean": return boolean.class;
            case "String": return String.class;
            default: return Object.class;
        }
    }
}
`;
  },
  // ========== C++ WRAPPER ==========

  [Language.CPP]: (code: string, metadata: QuestionMetadata): string => {
    const functionName = metadata.functionName || "solve";

    // Type normalization helper
    const getCppType = (type: string) => {
      type = type.trim();
      if (type === "String" || type === "string") return "string";
      if (type === "int[]" || type === "vector<int>") return "vector<int>";
      if (type === "string[]" || type === "vector<string>")
        return "vector<string>";
      if (type === "boolean" || type === "bool") return "bool";
      if (type === "TreeNode") return "TreeNode*";
      if (type === "ListNode") return "ListNode*";
      if (type === "long" || type === "long long") return "long long";
      return type;
    };

    const getParserCall = (type: string, name: string) => {
      const cppType = getCppType(type);
      if (cppType === "int") return `parser.parseIntValue(parsed["${name}"])`;
      if (cppType === "long long")
        return `parser.parseLongValue(parsed["${name}"])`;
      if (cppType === "double")
        return `parser.parseDoubleValue(parsed["${name}"])`;
      if (cppType === "bool") return `parser.parseBoolValue(parsed["${name}"])`;
      if (cppType === "string")
        return `parser.parseStringValue(parsed["${name}"])`;
      if (cppType === "vector<int>")
        return `parser.parseIntArray(parsed["${name}"])`;
      if (cppType === "vector<string>")
        return `parser.parseStringArray(parsed["${name}"])`;
      if (cppType === "vector<vector<int>>")
        return `parser.parseInt2DArray(parsed["${name}"])`;
      if (cppType === "TreeNode*") return `parser.parseTree(parsed["${name}"])`;
      if (cppType === "ListNode*") return `parser.parseList(parsed["${name}"])`;
      return `parser.parseStringValue(parsed["${name}"])`;
    };

    const paramDeclarations = metadata.parameterTypes
      .map((p) => {
        return `    ${getCppType(p.type)} ${p.name} = ${getParserCall(
          p.type,
          p.name,
        )};`;
      })
      .join("\n");

    const paramNames = metadata.parameterTypes.map((p) => p.name).join(", ");

    return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>
#include <sstream>
#include <queue>
#include <stack>
#include <map>
#include <set>
#include <cmath>
#include <functional>
#include <iomanip>

using namespace std;

// ============ DATA STRUCTURES ============
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

// ============ JSON PARSER ============
class JsonParser {
private:
    string json;
    size_t pos;

    void skipWhitespace() {
        while (pos < json.length() && (isspace(json[pos]) || json[pos] == '\\n' || json[pos] == '\\r')) pos++;
    }

    string parseRawValue() {
        skipWhitespace();
        size_t start = pos;
        if (pos >= json.length()) return "";
        
        if (json[pos] == '"') {
            pos++;
            while (pos < json.length() && (json[pos] != '"' || json[pos-1] == '\\\\')) pos++;
            if (pos < json.length()) pos++;
        } else if (json[pos] == '[' || json[pos] == '{') {
            int depth = 0;
            char open = json[pos], close = (open == '[' ? ']' : '}');
            do {
                if (json[pos] == open) depth++;
                else if (json[pos] == close) depth--;
                pos++;
            } while (pos < json.length() && depth > 0);
        } else {
            while (pos < json.length() && !isspace(json[pos]) && json[pos] != ',' && json[pos] != ']' && json[pos] != '}') pos++;
        }
        return json.substr(start, pos - start);
    }

public:
    JsonParser(const string& s) : json(s), pos(0) {}

    map<string, string> parseObject() {
        map<string, string> res;
        skipWhitespace();
        if (pos >= json.length() || json[pos] != '{') return res;
        pos++;
        while (pos < json.length()) {
            skipWhitespace();
            if (json[pos] == '}') { pos++; break; }
            string key = parseStringValue(parseRawValue());
            skipWhitespace();
            if (json[pos] == ':') pos++;
            res[key] = parseRawValue();
            skipWhitespace();
            if (json[pos] == ',') pos++;
        }
        return res;
    }

    vector<string> parseArray(string s) {
        vector<string> res;
        if (s.empty() || s[0] != '[') return res;
        JsonParser p(s);
        p.pos++; 
        while (p.pos < p.json.length()) {
            p.skipWhitespace();
            if (p.json[p.pos] == ']') { p.pos++; break; }
            res.push_back(p.parseRawValue());
            p.skipWhitespace();
            if (p.json[p.pos] == ',') p.pos++;
        }
        return res;
    }

    int parseIntValue(string s) { return s.empty() || s == "null" ? 0 : stoi(s); }
    long long parseLongValue(string s) { return s.empty() || s == "null" ? 0 : stoll(s); }
    double parseDoubleValue(string s) { return s.empty() || s == "null" ? 0.0 : stod(s); }
    bool parseBoolValue(string s) { return s == "true"; }
    string parseStringValue(string s) {
        if (s.length() >= 2 && s.front() == '"' && s.back() == '"') return s.substr(1, s.length() - 2);
        return s;
    }

    vector<int> parseIntArray(string s) {
        vector<string> raw = parseArray(s);
        vector<int> res;
        for (const string& r : raw) res.push_back(parseIntValue(r));
        return res;
    }

    vector<string> parseStringArray(string s) {
        vector<string> raw = parseArray(s);
        vector<string> res;
        for (const string& r : raw) res.push_back(parseStringValue(r));
        return res;
    }

    vector<vector<int>> parseInt2DArray(string s) {
        vector<string> raw = parseArray(s);
        vector<vector<int>> res;
        for (const string& r : raw) res.push_back(parseIntArray(r));
        return res;
    }

    ListNode* parseList(string s) {
        vector<int> vals = parseIntArray(s);
        if (vals.empty()) return nullptr;
        ListNode* head = new ListNode(vals[0]);
        ListNode* curr = head;
        for (size_t i = 1; i < vals.size(); i++) {
            curr->next = new ListNode(vals[i]);
            curr = curr->next;
        }
        return head;
    }

    TreeNode* parseTree(string s) {
        vector<string> raw = parseArray(s);
        if (raw.empty() || raw[0] == "null") return nullptr;
        TreeNode* root = new TreeNode(stoi(raw[0]));
        queue<TreeNode*> q;
        q.push(root);
        size_t i = 1;
        while (!q.empty() && i < raw.size()) {
            TreeNode* curr = q.front(); q.pop();
            if (i < raw.size() && raw[i] != "null") {
                curr->left = new TreeNode(stoi(raw[i]));
                q.push(curr->left);
            }
            i++;
            if (i < raw.size() && raw[i] != "null") {
                curr->right = new TreeNode(stoi(raw[i]));
                q.push(curr->right);
            }
            i++;
        }
        return root;
    }
};

// ============ SERIALIZER ============
class Serializer {
public:
    static string toString(int v) { return to_string(v); }
    static string toString(long long v) { return to_string(v); }
    static string toString(double v) { 
        stringstream ss; ss << fixed << setprecision(5) << v; 
        string s = ss.str();
        s.erase(s.find_last_not_of('0') + 1, string::npos);
        if (s.back() == '.') s.pop_back();
        return s;
    }
    static string toString(bool v) { return v ? "true" : "false"; }
    static string toString(const string& v) { return "\\"" + v + "\\""; }
    
    template<typename T>
    static string toString(const vector<T>& v) {
        string res = "[";
        for (size_t i = 0; i < v.size(); i++) {
            res += toString(v[i]);
            if (i < v.size() - 1) res += ",";
        }
        return res + "]";
    }

    static string toString(ListNode* head) {
        string res = "[";
        while (head) {
            res += to_string(head->val);
            if (head->next) res += ",";
            head = head->next;
        }
        return res + "]";
    }

    static string toString(TreeNode* root) {
        if (!root) return "[]";
        vector<string> res;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            TreeNode* curr = q.front(); q.pop();
            if (curr) {
                res.push_back(to_string(curr->val));
                q.push(curr->left);
                q.push(curr->right);
            } else {
                res.push_back("null");
            }
        }
        while (!res.empty() && res.back() == "null") res.pop_back();
        string s = "[";
        for (size_t i = 0; i < res.size(); i++) {
            s += res[i];
            if (i < res.size() - 1) s += ",";
        }
        return s + "]";
    }
};

// ============ USER CODE ============
${code}

// ============ DRIVER CODE ============
int main() {
    string line;
    if (!getline(cin, line) || line.empty()) return 0;
    JsonParser parser(line);
    map<string, string> parsed = parser.parseObject();
    
    if (parsed.empty() && line.length() > 0 && line[0] != '{') {
        ${metadata.parameterTypes.length === 1 ? `parsed["${metadata.parameterTypes[0].name}"] = line;` : ''}
    }

${paramDeclarations}

    Solution sol;
    auto result = sol.${functionName}(${paramNames});
    cout << Serializer::toString(result) << endl;
    return 0;
}
    `;
  },
};

// ============================================================================
// JUDGE0 API CLIENT
// ============================================================================

interface FetchOptions {
  retries?: number;
  retryDelay?: number;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  fetchOptions: FetchOptions = {},
) {
  const { retries = 3, retryDelay = 1000 } = fetchOptions;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status >= 500 || response.status === 429) {
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
          continue;
        }
      }
      return response;
    } catch (error) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed after ${retries} retries`);
}

export async function createSubmission(
  sourceCode: string,
  language: Language | number,
  metadata: QuestionMetadata,
  stdin?: string,
): Promise<string> {
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY environment variable not set");
  }

  let languageId: number;
  let languageSlug: string | undefined;

  if (typeof language === "number") {
    languageId = language;
    languageSlug = Object.keys(LANGUAGE_MAP).find(
      (key) => LANGUAGE_MAP[key] === languageId,
    );
  } else {
    languageSlug = language;
    languageId = LANGUAGE_MAP[language];
  }

  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const wrapper = languageSlug ? WRAPPERS[languageSlug as Language] : undefined;

  // Safe metadata fallback
  const safeMetadata: QuestionMetadata = {
    functionName: metadata.functionName || "solve",
    parameterTypes: metadata.parameterTypes || [
      { name: "input", type: "string" },
    ],
    returnType: metadata.returnType || { type: "string" },
    category: metadata.category || ProblemType.ARRAY,
  };

  const finalCode = wrapper ? wrapper(sourceCode, safeMetadata) : sourceCode;

  const options = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
    body: JSON.stringify({
      source_code: encodeBase64(finalCode),
      language_id: languageId,
      stdin: stdin ? encodeBase64(stdin) : undefined,
      base64_encoded: true,
      fields: "*",
    }),
  };

  const response = await fetchWithRetry(
    `${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`,
    options,
    { retries: 3 },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create submission: ${response.status} - ${errorText}`,
    );
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

export async function getSubmission(
  token: string,
): Promise<SubmissionResponse> {
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY environment variable not set");
  }

  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
  };

  const response = await fetchWithRetry(
    `${JUDGE0_URL}/submissions/${token}?base64_encoded=true&fields=*`,
    options,
    { retries: 3 },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch submission: ${response.status}`);
  }

  interface Judge0Response {
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
    message: string | null;
    status: StatusDetails;
    time: string | null;
    memory: number | null;
    [key: string]: unknown;
  }

  const data = (await response.json()) as Judge0Response;

  return {
    ...data,
    stdout: data.stdout ? decodeBase64(data.stdout) : null,
    stderr: data.stderr ? decodeBase64(data.stderr) : null,
    compile_output: data.compile_output
      ? decodeBase64(data.compile_output)
      : null,
    message: data.message ? decodeBase64(data.message) : null,
    token,
  } as SubmissionResponse;
}

export async function pollSubmission(
  token: string,
  options: { interval?: number; maxRetries?: number } = {},
): Promise<SubmissionResponse> {
  const { interval = 2000, maxRetries = 30 } = options;

  for (let i = 0; i < maxRetries; i++) {
    const result = await getSubmission(token);
    // Status IDs: 1 (In Queue), 2 (Processing)
    if (result.status.id > 2) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Submission polling timed out after ${maxRetries} attempts`);
}

/**
 * Prepares stdin by wrapping raw input into JSON based on metadata if needed
 */
export function prepareStdin(
  input: string,
  metadata: QuestionMetadata,
): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // If it's already a JSON object, return as is
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  // If we have metadata, try to wrap positional arguments into a JSON object
  if (metadata.parameterTypes.length > 1) {
    try {
      // Very basic split for [arr] val1 val2
      // This is a heuristic for legacy test cases
      const parts: string[] = [];
      let current = "";
      let bracketDepth = 0;

      for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];
        if (char === "[" || char === "{") bracketDepth++;
        if (char === "]" || char === "}") bracketDepth--;

        if (char === " " && bracketDepth === 0) {
          if (current) parts.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      if (current) parts.push(current);

      if (parts.length === metadata.parameterTypes.length) {
        const obj: Record<string, unknown> = {};
        metadata.parameterTypes.forEach((p, idx) => {
          try {
            obj[p.name] = JSON.parse(parts[idx]);
          } catch {
            // Fallback for raw strings/numbers
            const val = parts[idx];
            if (val === "true") obj[p.name] = true;
            else if (val === "false") obj[p.name] = false;
            else if (!isNaN(Number(val))) obj[p.name] = Number(val);
            else obj[p.name] = val;
          }
        });
        return JSON.stringify(obj);
      }
    } catch (e) {
      console.warn("Failed to wrap positional input:", e);
    }
  }

  return trimmed;
}

export async function createBatchSubmissions(
  sourceCode: string,
  language: Language | number,
  metadata: QuestionMetadata,
  inputs: string[],
): Promise<string[]> {
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY environment variable not set");
  }

  let languageId: number;
  let languageSlug: string | undefined;

  if (typeof language === "number") {
    languageId = language;
    languageSlug = Object.keys(LANGUAGE_MAP).find(
      (key) => LANGUAGE_MAP[key] === languageId,
    );
  } else {
    languageSlug = language;
    languageId = LANGUAGE_MAP[language];
  }

  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const wrapper = languageSlug ? WRAPPERS[languageSlug as Language] : undefined;

  // Safe metadata fallback
  const safeMetadata: QuestionMetadata = {
    functionName: metadata.functionName || "solve",
    parameterTypes: metadata.parameterTypes || [
      { name: "input", type: "string" },
    ],
    returnType: metadata.returnType || { type: "string" },
    category: metadata.category || ProblemType.ARRAY,
  };

  const finalCode = wrapper ? wrapper(sourceCode, safeMetadata) : sourceCode;
  const encodedCode = encodeBase64(finalCode);

  const submissions = inputs.map((stdin) => ({
    source_code: encodedCode,
    language_id: languageId,
    stdin: encodeBase64(prepareStdin(stdin, safeMetadata)),
    base64_encoded: true,
    fields: "*",
  }));

  const options = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
    body: JSON.stringify({ submissions }),
  };

  const response = await fetchWithRetry(
    `${JUDGE0_URL}/submissions/batch?base64_encoded=true`,
    options,
    { retries: 3 },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create batch submission: ${response.status} - ${errorText}`,
    );
  }

  const data = (await response.json()) as { token: string }[];
  return data.map((item) => item.token);
}

export async function getBatchSubmissions(
  tokens: string[],
): Promise<SubmissionResponse[]> {
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY environment variable not set");
  }

  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
  };

  const response = await fetchWithRetry(
    `${JUDGE0_URL}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true&fields=*`,
    options,
    { retries: 3 },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch batch submissions: ${response.status}`);
  }

  interface Judge0BatchItem {
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
    message: string | null;
    status: StatusDetails;
    time: string | null;
    memory: number | null;
    [key: string]: unknown;
  }

  const data = (await response.json()) as { submissions: Judge0BatchItem[] };

  return data.submissions.map(
    (submission, index) =>
      ({
        ...submission,
        stdout: submission.stdout ? decodeBase64(submission.stdout) : null,
        stderr: submission.stderr ? decodeBase64(submission.stderr) : null,
        compile_output: submission.compile_output
          ? decodeBase64(submission.compile_output)
          : null,
        message: submission.message ? decodeBase64(submission.message) : null,
        token: tokens[index],
      }) as SubmissionResponse,
  );
}

export async function pollBatchSubmissions(
  tokens: string[],
  options: { interval?: number; maxRetries?: number } = {},
): Promise<SubmissionResponse[]> {
  const { interval = 2000, maxRetries = 30 } = options;

  for (let i = 0; i < maxRetries; i++) {
    const results = await getBatchSubmissions(tokens);
    const allFinished = results.every((res) => res.status.id > 2);
    if (allFinished) {
      return results;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    `Batch submission polling timed out after ${maxRetries} attempts`,
  );
}

// ============================================================================
// HIGH-LEVEL EXECUTION API
// ============================================================================

/**
 * Execute a single test case
 */
export async function executeSingleTest(
  sourceCode: string,
  language: Language,
  metadata: QuestionMetadata,
  testInput: Record<string, unknown>,
): Promise<ExecutionResult> {
  const stdin = JSON.stringify(
    metadata.parameterTypes.length === 1
      ? testInput[metadata.parameterTypes[0].name]
      : testInput,
  );

  try {
    const token = await createSubmission(sourceCode, language, metadata, stdin);
    const result = await pollSubmission(token);

    const status = getExecutionStatus(result.status.description);
    const accepted = status === ExecutionStatus.ACCEPTED;

    let output: unknown;
    try {
      output = result.stdout ? JSON.parse(result.stdout) : null;
    } catch {
      output = result.stdout;
    }

    return {
      accepted,
      status,
      output,
      message:
        result.stderr || result.compile_output || result.message || "Success",
      executionTime: result.time,
      memory: result.memory,
      stderr: result.stderr,
      compileOutput: result.compile_output,
      token,
    };
  } catch (error) {
    return {
      accepted: false,
      status: ExecutionStatus.RUNTIME_ERROR,
      output: null,
      message: error instanceof Error ? error.message : "Unknown error",
      executionTime: null,
      memory: null,
      stderr: null,
      compileOutput: null,
      token: "",
    };
  }
}

/**
 * Execute multiple test cases
 */
export async function executeMultipleTests(
  sourceCode: string,
  language: Language,
  metadata: QuestionMetadata,
  testCases: TestCase[],
): Promise<BatchExecutionResult> {
  const inputs = testCases.map((tc) => JSON.stringify(tc.input));

  try {
    const tokens = await createBatchSubmissions(
      sourceCode,
      language,
      metadata,
      inputs,
    );
    const results = await pollBatchSubmissions(tokens);

    const executionResults: ExecutionResult[] = results.map((result, index) => {
      const status = getExecutionStatus(result.status.description);
      let output: unknown;
      try {
        output = result.stdout ? JSON.parse(result.stdout) : null;
      } catch {
        output = result.stdout;
      }

      const expected = testCases[index].expected;
      const accepted =
        status === ExecutionStatus.ACCEPTED && deepEqual(output, expected);

      return {
        accepted,
        status,
        output,
        expectedOutput: expected,
        message:
          result.stderr || result.compile_output || result.message || "Success",
        executionTime: result.time,
        memory: result.memory,
        stderr: result.stderr,
        compileOutput: result.compile_output,
        token: result.token || "",
      };
    });

    const passedCount = executionResults.filter((r) => r.accepted).length;
    const failedCount = executionResults.length - passedCount;
    const totalTime = executionResults.reduce((sum, r) => {
      const time = r.executionTime ? parseFloat(r.executionTime) : 0;
      return sum + time;
    }, 0);

    return {
      results: executionResults,
      totalTime,
      passedCount,
      failedCount,
    };
  } catch (error) {
    throw new Error(
      `Batch execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getExecutionStatus(description: string): ExecutionStatus {
  const desc = description.toLowerCase();

  if (desc.includes("accepted") || desc.includes("right answer")) {
    return ExecutionStatus.ACCEPTED;
  }
  if (desc.includes("wrong answer")) {
    return ExecutionStatus.WRONG_ANSWER;
  }
  if (desc.includes("time limit")) {
    return ExecutionStatus.TIME_LIMIT_EXCEEDED;
  }
  if (desc.includes("runtime error")) {
    return ExecutionStatus.RUNTIME_ERROR;
  }
  if (desc.includes("compilation error")) {
    return ExecutionStatus.COMPILE_ERROR;
  }
  if (desc.includes("memory limit")) {
    return ExecutionStatus.MEMORY_LIMIT_EXCEEDED;
  }
  if (desc.includes("processing") || desc.includes("queue")) {
    return ExecutionStatus.PENDING;
  }

  return ExecutionStatus.PENDING;
}

/**
 * Format metadata for display
 */
export function formatMetadata(metadata: QuestionMetadata): string {
  return `
Function: ${metadata.functionName}
Parameters: ${metadata.parameterTypes.map((p) => `${p.name}: ${p.type}`).join(", ")}
Return Type: ${metadata.returnType.type}
Category: ${metadata.category}
Difficulty: ${metadata.difficulty || "N/A"}
${metadata.description ? `Description: ${metadata.description}` : ""}
${metadata.constraints ? `Constraints: ${metadata.constraints.join(", ")}` : ""}
  `.trim();
}

/**
 * Generate test case JSON
 */
export function generateTestInput(
  metadata: QuestionMetadata,
  ...args: unknown[]
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  metadata.parameterTypes.forEach((param, index) => {
    input[param.name] = args[index];
  });
  return input;
}

export default {
  LANGUAGE_MAP,
  LANGUAGE: Language,
  PROBLEM_TYPE: ProblemType,
  DIFFICULTY: Difficulty,
  EXECUTION_STATUS: ExecutionStatus,
  // Data structures
  TreeNode,
  ListNode,
  Node,
  // Utilities
  buildTree,
  buildList,
  treeToArray,
  listToArray,
  deepEqual,
  // API
  createSubmission,
  getSubmission,
  pollSubmission,
  createBatchSubmissions,
  getBatchSubmissions,
  pollBatchSubmissions,
  // High-level
  executeSingleTest,
  executeMultipleTests,
  // Helpers
  formatMetadata,
  generateTestInput,
};
