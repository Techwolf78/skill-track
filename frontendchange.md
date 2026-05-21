# Frontend Changes

## Candidate Test Flow

The candidate test-taking flow must change to use session-backed paper delivery.

Old flow:
1. login as candidate
2. load invitation/schedule/test
3. read live test/question resources
4. start or continue test

New flow:
1. login as candidate
2. `GET /candidate-invitations`
3. `POST /test-sessions/start`
4. `GET /test-sessions/{sessionId}/paper`
5. render the test from the returned paper payload
6. submit answers against that session

Do not rely on direct candidate reads of authoring resources during test-taking.

---

## New Endpoint To Use

### Start session

`POST /test-sessions/start`

Request body:

```json
{
  "invitationId": "uuid",
  "ipAddress": "optional string"
}
```

Use this instead of trying to create a session through admin session-create APIs.

### Fetch paper

`GET /test-sessions/{id}/paper`

Use the returned `sessionId` from `POST /test-sessions/start`.

This endpoint is candidate-accessible for the candidate's own session and is now the source of truth for rendering the paper.

---

## Stop Using These For Candidate Test Rendering

Do not use these endpoints to render the candidate test paper:
- direct `questions` reads
- direct `mcq` option reads
- direct `test_cases` reads

`GET /tests/{id}` may still work temporarily in some session/invitation-bound cases, but treat that as transition-only. The frontend should move fully to `GET /test-sessions/{id}/paper`.

---

## Paper Response Expectations

The paper endpoint returns snapshot-based content. Use it to render:
- test title
- instructions
- duration
- ordered questions
- marks
- MCQ options
- coding content
- visible sample test cases

Do not expect:
- correct answers
- hidden test cases
- scores at test-taking time
- final grading results on submit

---

## Submission Behavior Change

Submission is no longer the point where final scoring is guaranteed.

Frontend behavior:
- after submit, show a confirmation state
- do not assume final score is available immediately
- do not expect candidate result visibility until HR/admin generates the report

Suggested submit confirmation text:
- "Test submitted successfully, your responses have been recorded"

---

## Access / Authorization Expectations

### Candidate

Candidate can:
- read own invitations
- start own session from invitation
- read own session paper
- submit own answers

Candidate cannot:
- read admin authoring resources directly
- create arbitrary sessions
- access another candidate's session or paper

### Admin / Superadmin

Admin and superadmin can still access operational/support endpoints according to backend policy.

---

## Frontend Migration Checklist

1. Replace candidate paper rendering calls with `GET /test-sessions/{id}/paper`
2. Make sure candidate start action calls `POST /test-sessions/start`
3. Stop depending on live question/option/test-case endpoints for candidate test-taking
4. Update submit UX so it does not expect immediate final result data
5. Treat `GET /tests/{id}` candidate usage as temporary and remove it after paper endpoint migration
