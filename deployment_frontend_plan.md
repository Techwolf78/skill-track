# RxOne MVP Deployment & Assessment Report — Frontend (Client-Side)

This report details the readiness, specifications, limitations, rate limits, optimizations, and connection/dependency details for deploying the RxOne frontend client (`skill-track`) to a live production environment.

---

## 1. Executive Summary & Production Readiness
The frontend client includes a highly sophisticated, resource-optimized proctoring suite, a secure invitation validation gateway, and responsive admin/candidate dashboards. 

* **Status:** **REASONS FOR CAUTION** (Ready for deployment pending configuration adjustments, asset optimization, and integration of error/rate-limiting visual overlays).

---

## 2. Core Frontend Features in the MVP

### 2.1 Candidate Onboarding Gateway (`TestAccess.tsx`)
* **Verification Checks:** Validates candidate tokens via UUID format and queries `GET /candidate-invitations/validate/{token}`.
* **Hardware Diagnostics:** Orchestrated via `EnvironmentCheck.tsx`. Checks and requests hardware permissions for:
  - Webcam accessibility.
  - Microphone accessibility.
  - Fullscreen display mode capability.
* **Access Control:** Blocks candidate entry into the test interface if any of the hardware or permissions checks fail.

### 2.2 Proctored Exam Interface (`TestInterface.tsx`)
* **Active Proctoring Orchestrator:** Powered by `ProctoringProvider.tsx` React context.
* **Cheat Prevention Restrictions:**
  - **DevTools / Keystroke Blocking:** Disables `F12`, `Ctrl+Shift+I/J/C`, `Cmd+Alt+I`.
  - **Clipboard Blocking:** Disables right-clicks, copy, paste, and cut (`Ctrl+C/V/X`). Intercepts `PrintScreen` to clear the clipboard (`navigator.clipboard.writeText("")`).
  - **Hard 3-Strikes Tab Policy:** Debounced window focus and blur listeners. Warning toasts display on Strike 1 & 2. The 3rd tab switch triggers auto-submission of the assessment.
  - **Strict Fullscreen Enforcement:** Exiting fullscreen initiates a 10-second warning countdown. Failure to return triggers auto-submission.
* **Webcam Snapshots Auditing:**
  - Background worker captures a visual frame every **60 seconds**.
  - Renders to a miniature canvas (`160x120`), applies a grayscale filter (reducing memory footprint by ~66%), and compresses as a 50% quality JPEG.
  - Persists rolling queue (maximum 20 snapshots, ~40KB total) in `localStorage` under `rxone_camera_snapshots_${sessionId}` to avoid browser quota exceptions.

### 2.3 Client-Side Artificial Intelligence (AI)
* **Object Detector (`objectDetector.ts`):** Runs a local **TensorFlow COCO-SSD** model. Runs on a throttled loop (every 5 seconds) to scan the feed for prohibited devices (e.g. `cell phone`, `book`, `laptop`, `tablet`).
* **Behavior Classifier (`llmDetector.ts`):** Employs Xenova's `@xenova/transformers` (`distilbert-base-uncased-finetuned-sst-2-english`) locally inside the browser to analyze sequence patterns of student actions and detect anomalous behaviors.

### 2.4 Resilient Sync Queue (`violationStorage.ts`)
* **Tiered Network Synchronization:**
  - **Immediate Upload:** Critical/High violations (e.g. DevTools detection, Tab switches) are immediately POSTed to the backend. If a violation is flagged, a grayscale visual proof is captured, compressed to JPEG (~3KB base64), and uploaded as evidence.
  - **Deferred Upload:** Low/Medium warnings are accumulated locally and bulk uploaded right before test submission.
  - **Offline Resilience:** If network connectivity drops, unsynced violations are cached in `localStorage`. An online reconnect listener (`window.addEventListener('online', ...)`) flushes them to the backend API automatically once connection recovers.

---

## 3. Crucial Gaps & Recommended Additions for Live Release
To ensure the candidate experience is seamless and secure on live, the following changes are required:

1. **Externalize API Base URL Configurations:**
   - **Issue:** Currently, endpoints are routed via a relative path or hardcoded local proxy config.
   - **Fix:** Create a `.env.production` file defining `VITE_API_BASE_URL` pointing to the live API gateway. Configure Axios (`apiClient`) to set its `baseURL` using `import.meta.env.VITE_API_BASE_URL`.
2. **CDN-Based TensorFlow & Xenova Model Loading:**
   - **Issue:** Loading heavy ML models (COCO-SSD weights and Xenova models) directly from the application origin or local bundle can result in long download times and high bandwidth charges when hundreds of candidates start simultaneously.
   - **Fix:** Pre-cache models using a Service Worker, or configure the libraries to load model weights from a public, high-speed CDN (like jsDelivr or Cloudflare CDN).
3. **Webcam Auditing Snapshot Syncing:**
   - **Issue:** The periodic 60-second webcam snapshots are saved in the client's local storage but are not currently pushed to the server. If a candidate closes the window or finishes, these audit logs are lost.
   - **Fix:** Implement a background batch-upload worker that flushes stored snapshots to `POST /test-sessions/{sessionId}/snapshots/batch` every 5 minutes and clears local storage on successful sync.
4. **Mobile & Tablet Browser Block:**
   - **Issue:** The screen-sharing API (`getDisplayMedia`) is unsupported on mobile browsers (Safari iOS, Chrome Android). Attempting to take the test on a smartphone will freeze the onboarding wizard.
   - **Fix:** Add a user-agent device check during the invitation gateway. Block access on mobile devices and instruct the candidate to use a laptop or desktop computer with a working webcam/mic.

---

## 4. Frontend Rate Limits & Optimizations
* **Axios Interceptor for 429 Errors:**
  - Create a global Axios interceptor that captures HTTP `429 Too Many Requests` responses.
  - Surface a user-friendly countdown timer toast using the Sonner provider to prevent the candidate from clicking "Run Code" or "Submit Code" repeatedly.
* **Dynamic AI Processing Degradation:**
  - Object detection (COCO-SSD) runs every 5 seconds, and face-mesh runs every 1.5 seconds.
  - On low-end candidate devices, this can cause CPU spikes. Implement a monitor that measures the frame processing time; if it exceeds 1 second, increase the intervals (e.g., run COCO-SSD every 10 seconds) to maintain browser responsiveness.

---

## 5. Connections & Dependencies

### 5.1 Connection Config (CORS & CSRF)
* **Axios credentials configuration:**
  ```typescript
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  ```
  This must match the live backend's CORS origin whitelisting and double-submit CSRF cookie pattern configuration.

### 5.2 Key Dependencies
* **Core React:** `react` & `react-dom` (v18.3.1), `react-router-dom` (v6.30.1) for routing.
* **State & Queries:** `@tanstack/react-query` (v5.83.0) for server state; `zustand` (v5.0.13) for local client state.
* **AI/ML Suite:** `@tensorflow/tfjs`, `@tensorflow-models/coco-ssd` for object detection; `@xenova/transformers` for NLP sequence checks.
* **UI & Animation:** `framer-motion` for animated violation alerts, `lucide-react` for iconography, and Shadcn UI components (Radix primitives).
