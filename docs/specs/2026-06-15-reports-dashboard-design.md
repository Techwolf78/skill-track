# Design Specification: Reports & Analytics Dashboard Redesign (Approach 1)

**Date:** 2026-06-15  
**Feature:** Reports & Analytics Dashboard  
**Status:** Approved  

---

## 1. Problem Statement
The current **Reports & Analytics** page is designed primarily as a low-level debugging inspector for candidate test sessions. It suffers from the following key issues:
- **No Real Analytics:** While mock data for top performers, batch metrics, and topic-wise breakdown is defined, it is completely omitted from the UI.
- **Cluttered Debugging UI:** Low-level operations (direct UUID queries, manual polling, force-grading) are presented upfront, which degrades UX.
- **Performance Bug (Infinite Loop):** The `useEffect` that hydates results for candidate sessions has `sessionStates` in its dependency array. As session states update from `IDLE` to `SUCCESS` or `ERROR`, the effect re-runs, initiating a loop of redundant network requests.
- **Missing Filters:** Admins cannot search or filter candidate records by name, email, or status.

---

## 2. Proposed Solution (Approach 1: Tabbed Executive Dashboard)
We will rebuild the Reports page using a three-tab layout that separates business insights from technical administration.

### Tab 1: Overview Analytics (Executive View)
Renders a visual dashboard summarizing test metrics:
1. **Summary Metric Cards:**
   - Total Candidates Onboarded (with icon and secondary sub-info)
   - Average Score (with comparative progress bar)
   - Pass Rate (with comparative progress bar)
   - Completion Rate
2. **Top Performers Card:** Displays a table of the top scoring candidates.
3. **Batch Performance Card:** Displays comparative metrics across colleges and departments.
4. **Topic-Wise Breakdown Card:** Evaluates concept strength (Algorithms, DBMS, etc.) using difficulty indicators.

### Tab 2: Candidate Inspector (Operation View)
Provides an interactive search-and-inspect panel:
- **Schedule Selector:** An easy-to-use search dropdown selector for test schedules.
- **Candidate Search Bar:** Real-time client-side search filtering by candidate name or email.
- **Session Filter badges:** Quick filters to display sessions by status (All, Active, Submitted, Evaluated, Expired).
- **Session Results Table:** Clean layout listing candidates, session status, result badges, and an interactive actions menu.
  - *Actions available:* Fetch/Poll status, View PDF scorecard, Force Grade.

### Tab 3: Technical Debug (Developer/Admin View)
A dedicated area for direct database queries:
- Query results/status by pasting direct Session UUIDs.
- Force-grade specific session and candidate combinations manually.

---

## 3. Architecture & Data Flow
- **Data Hydration:** Initial loading fetches all test schedules, candidates, and sessions in parallel via `Promise.all`.
- **Session Result Hydration:** When a schedule is selected:
  - We fetch the results for its associated sessions asynchronously.
  - To prevent infinite loops, we will run the hydration check only when the selected schedule ID changes or when session lists are refreshed, and we will reference a ref or use functional state updates to avoid dependency conflicts.
- **Manual Actions:** Manual triggers (Fetch/Poll, Force Grade) update individual session states in `sessionStates` safely.

---

## 4. Component Layout
We will use `@/components/ui/card`, `@/components/ui/tabs`, `lucide-react` icons, and standard Tailwind CSS styling:
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

---

## 5. Testing Plan
1. **Layout & Responsiveness:** Verify desktop and mobile layouts.
2. **Search & Filters:** Verify search bar correctly filters candidate table rows by name and email.
3. **Infinite Fetch Loop Verification:** Monitor browser network inspector to verify that selecting a schedule sends exactly one fetch request per session and does not cause a continuous polling loop.
4. **Action Triggers:** Verify "Fetch/Poll", "View PDF", and "Force Grade" function correctly and update the UI states dynamically.
