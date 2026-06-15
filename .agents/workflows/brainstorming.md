---
name: brainstorming
description: Use this before building, modifying, or adding any feature. First understand the project, clarify requirements, propose options, then create an approved design before implementation.
---

# Brainstorming Workflow for Antigravity

Before writing code or changing files, first convert the user’s idea into a clear design.

## Hard Rule

Do not implement anything immediately.

Before coding, you must:

1. Understand the existing project.
2. Ask clarifying questions if needed.
3. Propose 2–3 possible approaches.
4. Recommend the best approach.
5. Present a clear design.
6. Wait for user approval.
7. Only then move to implementation planning.

Even small changes need a short design first.

## Required Flow

### 1. Explore the project

Check the current files, folders, docs, and existing patterns.

Understand:

- Current architecture
- Relevant components/files
- Existing conventions
- Possible risks or dependencies

### 2. Clarify the request

Ask only one question at a time.

Prefer multiple-choice questions when possible.

Focus on:

- Goal
- Scope
- Constraints
- Success criteria
- UI/UX expectations
- Data or API behavior
- Edge cases

### 3. Propose options

Give 2–3 approaches.

For each approach, explain:

- What it does
- Pros
- Cons
- When to use it

Then clearly recommend one option.

### 4. Present the design

Create a concise design covering:

- Architecture
- Components/files affected
- Data flow
- UI behavior
- Error handling
- Testing plan
- Rollback or safety considerations if relevant

Ask the user to approve before continuing.

### 5. Write the design spec

After approval, create a design document at:

```txt
docs/specs/YYYY-MM-DD-feature-name-design.md
```
