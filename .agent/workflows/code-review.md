---
description: Automated AI code review using Alibaba OpenCodeReview in Delegation Mode (Zero API Key configuration required)
---

# AI Code Review Workflow (OpenCodeReview + Antigravity)

This workflow runs an automated, high-precision code review on your codebase or Git diffs using **Alibaba's OpenCodeReview (`ocr`)** in **Delegation Mode**. It uses deterministic diff & rule scaffolding while running LLM analysis through Antigravity's active session without requiring paid third-party API keys.

---

## Review Scope Options

When triggering this workflow, select the desired scope:
1. **Working Tree Changes (Default)**: Staged, unstaged, and untracked changes in the current workspace.
2. **Branch Comparison**: Compare current branch against `main` or another target branch.
3. **Specific Commit**: Review changes in a given commit hash.
4. **Full File Scan**: Static audit of a specific file or directory.

---

## Execution Steps

### 1. Extract Deterministic Diffs & Metadata
Run the `ocr delegate` CLI tool (using `npx` so global installation is optional):

```bash
# For uncommitted working directory changes
npx -y @alibaba-group/open-code-review delegate preview

# Or for branch comparisons:
npx -y @alibaba-group/open-code-review delegate preview --from main --to HEAD
```

*(If `ocr` cannot be reached or in offline environments, fallback to standard `git status -s` and `git diff`)*

### 2. Fetch Targeted Rulesets
For the modified files identified in Step 1, retrieve Alibaba's domain rules:

```bash
npx -y @alibaba-group/open-code-review delegate rule <changed-file-paths>
```

### 3. Deep Contextual Inspection
For each identified file:
- Read surrounding context and full file contents where necessary (to avoid surface-level diff hallucinations).
- Trace callers, imports, and state dependencies across the project.
- Check against critical vulnerability classes:
  - **Null / Undefined Pointer Exceptions**: Missing guards, optional chaining risks.
  - **Thread Safety / Concurrency / Race Conditions**: Async state mutations, cleanup in `useEffect`, unhandled Promises.
  - **Security Flaws**: XSS, SQL injection, insecure storage of secrets/tokens, unvalidated input.
  - **Resource / Memory Leaks**: Event listeners, timers, web sockets without cleanup.
  - **Performance & Over-engineering**: Unnecessary re-renders, heavyweight bundle inclusions, violation of Ponytail principles.

### 4. Generate Structured Review Output

Present the review in a clean, categorized format:

```markdown
### 🛡️ Code Review Summary
- **Files Reviewed**: `x` files
- **Issues Found**: `Critical: 0 | Warning: 2 | Suggestion: 1`

---

#### 🚨 Critical Issues
- **[File](file:///path/to/file#L10-L15)**: Issue explanation and proposed fix.

#### ⚠️ Warnings / Reliability Risks
- **[File](file:///path/to/file#L45-L50)**: Issue explanation and mitigation.

#### 💡 Optimization & Style Improvements
- **[File](file:///path/to/file#L80-L85)**: Recommended improvement.

---

#### ✅ Verdict & Next Steps
- Brief summary indicating whether the code is safe to merge or needs fixes.
```
