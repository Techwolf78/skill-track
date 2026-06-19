# Backend API Specification - Question Model Extensions & Mock Data

This document specifies the required extensions to the backend `Question` DTOs and database models to support business/corporate/aptitude domain taxonomies, cognitive mapping levels (Bloom's Taxonomy), advanced sandbox formats, and psychometric calibration metrics.

It also details the JSON payloads for the 5 mock questions that have been removed from the frontend. Once the backend has been updated to support these schemas, these questions can be seeded and served dynamically via the backend.

---

## 1. Required Schema & Field Extensions

To support the full question bank capabilities in the enterprise dashboard, the `Question` resource needs to persist and return the following additional properties:

### A. Core Taxonomies and Formatting

*   **`domain`** (Enum / String)
    *   *Allowed values:* `"ENGINEERING"`, `"BUSINESS"`, `"APTITUDE"`, `"CORPORATE"`
    *   *Description:* Classifies the candidate stream or client domain type.
*   **`cognitiveLevel`** (Enum / String)
    *   *Allowed values:* `"REMEMBER"`, `"UNDERSTAND"`, `"APPLY"`, `"ANALYZE"`, `"EVALUATE"`, `"CREATE"`
    *   *Description:* Cognitive level mapped as per Bloom's Taxonomy.
*   **`format`** (Enum / String)
    *   *Allowed values:* `"MCQ"`, `"CODING"`, `"SQL"`, `"SPREADSHEET"`, `"SJT"`, `"SUBJECTIVE"`
    *   *Description:* The format of execution/simulation for the candidate.

### B. Psychometric Calibration Metrics (Optional / Nullable)

> [!NOTE]
> Since these are computed metrics based on candidate performance over time, they should be **optional or nullable** in the database schema and DTOs. For newly created questions, these will default to `null` or a default value, and will be calibrated later once candidates start solving them.

*   **`p_value`** (Decimal / Double, Nullable)
    *   *Description:* The difficulty index of the question (proportion of candidates solving it correctly). Ranges from `0.0` to `1.0`. Defaults to `null` or `0.5` for new questions.
*   **`discrimination_index`** (Decimal / Double, Nullable)
    *   *Description:* The discrimination index ($D$), which measures how well the question distinguishes high-performing candidates from low-performing ones. Ranges from `-1.0` to `1.0`. Defaults to `null` or `0.35` for new questions.
*   **`avg_time_seconds`** (Integer, Nullable)
    *   *Description:* The average time taken by candidates to solve the question. Defaults to `null` or a default based on complexity.
*   **`status`** (Enum / String, Optional)
    *   *Allowed values:* `"ACTIVE"`, `"UNDER_REVIEW"`, `"QUARANTINED"`
    *   *Description:* The moderation state of the question. Defaults to `"ACTIVE"`.

---

## 2. API Response Body / DTO Structure

The REST endpoint `GET /questions` and `GET /questions/{id}` should return a response schema similar to the following JSON structure:

```json
{
  "id": "string (UUID)",
  "title": "string",
  "prompt": "string",
  "questionType": "MCQ | CODING",
  "subject_id": "string",
  "topic_id": "string",
  "subtopic_id": "string",
  "marks": 10,
  "difficulty": "EASY | MEDIUM | HARD",
  "domain": "BUSINESS | ENGINEERING | APTITUDE | CORPORATE",
  "cognitiveLevel": "REMEMBER | UNDERSTAND | APPLY | ANALYZE | EVALUATE | CREATE",
  "format": "MCQ | CODING | SQL | SPREADSHEET | SJT | SUBJECTIVE",
  "p_value": 0.42,
  "discrimination_index": 0.37,
  "avg_time_seconds": 162,
  "status": "ACTIVE | UNDER_REVIEW | QUARANTINED",
  "tags": ["string"],
  "mcqType": "SINGLE_CORRECT | MULTIPLE_CORRECT | ...",
  "mcqOptions": [
    {
      "text": "string",
      "isCorrect": true
    }
  ]
}
```

---

## 3. Extracted Mock Questions (JSON Payloads)

Below is the list of 5 questions extracted from the frontend static mock data. These can be inserted directly into your SQL/NoSQL seeds.

```json
[
  {
    "id": "mock-mba-1",
    "questionType": "MCQ",
    "prompt": "Based on the provided Q3 financial statements for Gryphon Corp, compute the Weighted Average Cost of Capital (WACC) given a cost of equity of 12%, cost of debt of 6%, debt-to-equity ratio of 0.8, and a corporate tax rate of 25%.",
    "title": "WACC & Capital Structure Evaluation",
    "subjectId": "finance-subj",
    "marks": 15,
    "difficulty": "HARD",
    "domain": "BUSINESS",
    "cognitiveLevel": "EVALUATE",
    "format": "SPREADSHEET",
    "p_value": 0.34,
    "discrimination_index": 0.49,
    "avg_time_seconds": 495,
    "status": "ACTIVE",
    "tags": ["MBA", "Finance", "WACC", "Valuation"],
    "mcqType": "SINGLE_CORRECT",
    "mcqOptions": [
      { "text": "8.73%", "isCorrect": false },
      { "text": "9.15%", "isCorrect": false },
      { "text": "8.67%", "isCorrect": true },
      { "text": "10.20%", "isCorrect": false }
    ]
  },
  {
    "id": "mock-corp-1",
    "questionType": "MCQ",
    "prompt": "A key corporate client is furious about a 3-hour dashboard service outage. They demand immediate refund policies and are threatening to terminate their contract on public channels. According to Gryphon CRM's Crisis Response policy, what is the most appropriate initial communication path?",
    "title": "Client Outage & Conflict Resolution",
    "subjectId": "corp-comm",
    "marks": 10,
    "difficulty": "MEDIUM",
    "domain": "CORPORATE",
    "cognitiveLevel": "APPLY",
    "format": "SJT",
    "p_value": 0.68,
    "discrimination_index": 0.42,
    "avg_time_seconds": 210,
    "status": "ACTIVE",
    "tags": ["Soft Skills", "Client Management", "Conflict Resolution", "SJT"],
    "mcqType": "SINGLE_CORRECT",
    "mcqOptions": [
      { "text": "Send a defensive response explaining that network outages are covered under the SLA's force majeure clause.", "isCorrect": false },
      { "text": "Acknowledge the impact immediately, express empathy, state the issue resolution status, and transition to a private communication channel.", "isCorrect": true },
      { "text": "Offer a 50% discount immediately on the public thread to pacify the client publicly.", "isCorrect": false },
      { "text": "Decline public communication and flag the account for automatic legal review without response.", "isCorrect": false }
    ]
  },
  {
    "id": "mock-eng-1",
    "questionType": "CODING",
    "prompt": "Optimize the following database join query to run in O(N log N) time using a temporary index or Hash-Join layout. Your code template should take dynamic data arrays representing user relations and output the matched key-pair indexes.",
    "title": "SQL Query Hash-Join Optimization",
    "subjectId": "dbms-subj",
    "marks": 20,
    "difficulty": "HARD",
    "domain": "ENGINEERING",
    "cognitiveLevel": "ANALYZE",
    "format": "SQL",
    "p_value": 0.42,
    "discrimination_index": 0.38,
    "avg_time_seconds": 360,
    "status": "ACTIVE",
    "tags": ["Engineering", "Database", "SQL Optimization", "Hash-Join"]
  },
  {
    "id": "mock-bba-1",
    "questionType": "MCQ",
    "prompt": "In a local retail branch survey, Gryphon Apparel found that raising prices by 5% led to a 12% drop in quantity demanded. Calculate the Price Elasticity of Demand (PED) and classify the elasticity type.",
    "title": "Price Elasticity & Revenue Strategy",
    "subjectId": "economics-subj",
    "marks": 5,
    "difficulty": "EASY",
    "domain": "BUSINESS",
    "cognitiveLevel": "UNDERSTAND",
    "format": "MCQ",
    "p_value": 0.82,
    "discrimination_index": 0.31,
    "avg_time_seconds": 105,
    "status": "ACTIVE",
    "tags": ["BBA", "Microeconomics", "PED", "Pricing"],
    "mcqType": "SINGLE_CORRECT",
    "mcqOptions": [
      { "text": "PED = 2.4; Elastic", "isCorrect": true },
      { "text": "PED = 0.42; Inelastic", "isCorrect": false },
      { "text": "PED = -2.4; Unitary Elastic", "isCorrect": false },
      { "text": "PED = 1.0; Perfect Elasticity", "isCorrect": false }
    ]
  },
  {
    "id": "mock-apt-1",
    "questionType": "MCQ",
    "prompt": "A training batch of 150 college graduates has 80 candidates fluent in Python, 60 fluent in Java, and 30 fluent in both languages. How many graduates in the cohort are fluent in neither Python nor Java?",
    "title": "Logical Deductions: Set Intersection",
    "subjectId": "aptitude-subj",
    "marks": 5,
    "difficulty": "EASY",
    "domain": "APTITUDE",
    "cognitiveLevel": "APPLY",
    "format": "MCQ",
    "p_value": 0.89,
    "discrimination_index": 0.35,
    "avg_time_seconds": 75,
    "status": "ACTIVE",
    "tags": ["Aptitude", "Logical Reasoning", "Venn Diagrams", "Placement Core"],
    "mcqType": "SINGLE_CORRECT",
    "mcqOptions": [
      { "text": "10 candidates", "isCorrect": false },
      { "text": "40 candidates", "isCorrect": true },
      { "text": "20 candidates", "isCorrect: false },
      { "text": "30 candidates", "isCorrect: false }
    ]
  }
]
```
