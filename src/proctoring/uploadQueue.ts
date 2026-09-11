/**
 * uploadQueue.ts
 *
 * Async proctoring evidence upload queue.
 * Flow per item:
 *   1. POST /test-sessions/{sessionId}/evidence/presign  → { signedUploadUrl, storagePath }
 *   2. PUT  {signedUploadUrl}   with JPEG ArrayBuffer
 *   3. POST /test-sessions/{sessionId}/evidence/confirm → done
 *
 * Rules:
 *   - Max 3 parallel uploads
 *   - Retry failed uploads up to 3 times with exponential backoff
 *   - In-memory queue (flushed on submit)
 */
import { apiClient } from "@/lib/api-client";

function getEndpointUrl(path: string): string {
  const base = (apiClient.defaults.baseURL || "").replace(/\/+$/, "");
  const cleanPath = path.startsWith("/api/") ? path.replace(/^\/api/, "") : path;
  if (base.startsWith("http")) {
    return `${base}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export interface QueueItem {
  buffer: ArrayBuffer;
  evidenceType: "AUDIT_FRAME" | "VIOLATION_FRAME";
  violationType?: string;
  capturedAt: number;
  retries?: number;
}

const MAX_PARALLEL = 3;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

export class UploadQueue {
  private queue: QueueItem[] = [];
  private inFlight = 0;
  private sessionId: string;
  private onStatusChange?: (pending: number, inFlight: number) => void;

  constructor(
    sessionId: string,
    onStatusChange?: (pending: number, inFlight: number) => void
  ) {
    this.sessionId = sessionId;
    this.onStatusChange = onStatusChange;
  }

  enqueue(item: Omit<QueueItem, "retries">): void {
    this.queue.push({ ...item, retries: 0 });
    this.notify();
    this.drain();
  }

  private notify(): void {
    this.onStatusChange?.(this.queue.length, this.inFlight);
  }

  private async drain(): Promise<void> {
    while (this.inFlight < MAX_PARALLEL && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.inFlight++;
      this.notify();

      this.upload(item)
        .catch((err) => {
          console.warn("[UploadQueue] Evidence upload failed:", err);
          if ((item.retries ?? 0) < MAX_RETRIES) {
            const nextRetries = (item.retries ?? 0) + 1;
            const delay = BASE_RETRY_DELAY_MS * Math.pow(2, nextRetries - 1);
            setTimeout(() => {
              this.queue.push({ ...item, retries: nextRetries });
              this.drain();
            }, delay);
          }
        })
        .finally(() => {
          this.inFlight--;
          this.notify();
          this.drain();
        });
    }
  }

  private async upload(item: QueueItem): Promise<void> {
    const attempt = async (): Promise<void> => {
      const token = localStorage.getItem("token");
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // Step 1: Presign upload URL from backend with deterministic idempotency key
      console.log(`[UploadQueue] Presigning evidence upload for type: ${item.evidenceType}...`);
      const presignKey = `ev_presign_${this.sessionId}_${item.capturedAt}_${item.evidenceType}`;
      const res = await fetch(
        getEndpointUrl(`/test-sessions/${this.sessionId}/evidence/presign`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": presignKey,
            "X-Idempotency-Key": presignKey,
            ...authHeaders,
          },
          body: JSON.stringify({
            evidenceType: item.evidenceType,
            ...(item.violationType ? { violationType: item.violationType } : {}),
          }),
        }
      );
      if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
      const raw = await res.json();
      const payload = raw?.data ?? raw;
      console.log(`[UploadQueue] Presign response payload:`, payload);
      const signedUrl: string = payload.signedUploadUrl || payload.url || "";
      const storagePath: string = payload.storagePath || "";
      if (!signedUrl) throw new Error("No signedUploadUrl returned from presign");

      console.log(`[UploadQueue] Full Presigned URL (for path only):\n${signedUrl}`);
      console.log(`[UploadQueue] S3 Storage Target Key:\n${storagePath}`);
      console.log(`[UploadQueue] Uploading JPEG buffer via backend proxy...`);

      // Step 2: Proxy upload via backend (avoids browser→S3 CORS)
      const encodedPath = encodeURIComponent(storagePath);
      const proxyRes = await fetch(
        getEndpointUrl(`/test-sessions/${this.sessionId}/evidence/upload-proxy?path=${encodedPath}&contentType=image%2Fjpeg`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            ...authHeaders,
          },
          body: item.buffer,
        }
      );
      if (!proxyRes.ok) throw new Error(`Proxy upload failed: ${proxyRes.status}`);
      console.log(`[UploadQueue] Proxy upload success! Image stored at: ${storagePath}`);


      // Step 3: Confirm evidence record in DB with deterministic key
      console.log(`[UploadQueue] Confirming evidence with backend path: ${storagePath}...`);
      const confirmKey = `ev_confirm_${this.sessionId}_${item.capturedAt}_${item.evidenceType}`;
      const confirmRes = await fetch(
        getEndpointUrl(`/test-sessions/${this.sessionId}/evidence/confirm`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": confirmKey,
            "X-Idempotency-Key": confirmKey,
            ...authHeaders,
          },
          body: JSON.stringify({
            storagePath,
            evidenceType: item.evidenceType,
            capturedAt: item.capturedAt,
            fileSizeBytes: item.buffer.byteLength,
          }),
        }
      );
      if (!confirmRes.ok) throw new Error(`Confirm failed: ${confirmRes.status}`);
      const confirmData = await confirmRes.json().catch(() => null);
      console.log(`[UploadQueue] Confirm response from backend:`, confirmData);
    };

    let lastErr: unknown;
    for (let attempt_n = 0; attempt_n <= MAX_RETRIES; attempt_n++) {
      try {
        await attempt();
        return;
      } catch (err) {
        lastErr = err;
        if (attempt_n < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt_n));
        }
      }
    }
    console.error(`[UploadQueue] Failed after ${MAX_RETRIES} retries for ${item.evidenceType}:`, lastErr);
  }

  /** Flush all remaining items — call on test submit */
  async flush(): Promise<void> {
    const remaining = [...this.queue];
    this.queue = [];
    await Promise.allSettled(remaining.map((item) => this.upload(item)));
  }

  get pendingCount() {
    return this.queue.length + this.active;
  }
}
