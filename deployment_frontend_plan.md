# Frontend Production Deployment & Optimization Plan

**Application**: RxOne SkillTrack Client (`skill-track`)  
**Target Host**: Vercel / Cloudflare Pages / Static CDN  
**Backend API Gateway**: `https://api.yourdomain.com` (Airtel Cloud VM 1)

---

## 1. Executive Summary

The React 18 + Vite frontend is production-ready, featuring client-side WebGL neural proctoring, a Monaco IDE sandbox runner, offline violation syncing, and candidate onboarding preflight checks.

---

## 2. Environment Configuration (`.env.production`)

Create `.env.production` in the root of the frontend project:

```env
# Point directly to your Airtel Cloud backend public domain / IP
VITE_API_BASE_URL=https://api.yourdomain.com

# WebSocket feed endpoint for real-time live proctoring
VITE_WS_BASE_URL=wss://api.yourdomain.com

# Production Mode
VITE_APP_ENV=production
```

In your Axios / API Client setup (`src/lib/api.ts` or `src/lib/axios.ts`):
```typescript
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8081",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
```

---

## 3. Build & Deployment Steps

### Option A: Deploy to Vercel (Recommended)
1. Install Vercel CLI (or connect GitHub repository):
   ```bash
   npm i -g vercel
   vercel
   ```
2. Set Environment Variables in Vercel Project Settings:
   * `VITE_API_BASE_URL` = `https://api.yourdomain.com`
   * `VITE_WS_BASE_URL` = `wss://api.yourdomain.com`
3. Configure `vercel.json` for React Single Page Application (SPA) routing:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

### Option B: Build Static Bundle
To build locally for custom Nginx / S3 / Airtel Object Storage hosting:
```bash
npm run build
```
This produces the optimized production bundle inside the `dist/` directory.

---

## 4. Key Client-Side Optimizations & Security

### 4.1 Client-Side AI Proctoring (Zero Cloud Bandwidth Cost)
* **TensorFlow BlazeFace & COCO-SSD**:
  - Neural models execute locally in the candidate's browser using **WebGL GPU acceleration**.
  - Camera frames are analyzed at **160x120 grayscale**, requiring negligible CPU and 0 MB of continuous cloud video egress bandwidth.
* **Proctoring Rules**:
  - **3-Strikes Tab Policy**: Auto-submits on 3rd external tab switch.
  - **Fullscreen Enforcement**: 10-second countdown to return to fullscreen.
  - **Anti-Cheat Shortcuts**: Blocks `F12`, `Ctrl+Shift+I`, `Ctrl+C/V/X`, right-click context menu, and clears the clipboard on `PrintScreen`.

### 4.2 Resilient Offline Sync Queue (`violationStorage.ts`)
* If candidate's internet disconnects temporarily:
  - Critical incidents and code progress are safely cached in browser `localStorage`.
  - A reconnect listener (`window.addEventListener('online', ...)`) automatically flushes queued violation batches to the backend once connectivity returns.

### 4.3 Mobile & Tablet Safeguard
* Displays an immediate warning overlay blocking smartphone access because mobile browsers lack desktop screen-sharing APIs (`getDisplayMedia`). Instructs candidates to switch to a laptop or PC.

---

## 5. Deployment Verification Checklist

- [ ] `.env.production` contains valid `VITE_API_BASE_URL=https://api.yourdomain.com`.
- [ ] Backend CORS on Airtel VM 1 allows `https://your-frontend-app.vercel.app` and custom domain.
- [ ] SPA rewrite rules configured (`/index.html` fallback on all 404s).
- [ ] Preflight hardware checks (Webcam, Mic, Fullscreen) pass in candidate flow.
- [ ] Real-time Proctoring feeds connect over `wss://api.yourdomain.com`.
