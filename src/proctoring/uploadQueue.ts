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

import { apiClient } from "../lib/api-client";

export interface QueueItem {
  buffer: ArrayBuffer;
  evidenceType: "AUDIT_FRAME" | "VIOLATION_FRAME";
  violationType?: string;
  capturedAt: number;
  retries?: number;
}

const MAX_PARALLEL = 3;
const MAX_RETRIES = 3;

export class UploadQueue {
  private queue: QueueItem[] = [];
  private active = 0;
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  enqueue(item: QueueItem) {
    this.queue.push({ ...item, retries: 0 });
    this.drain();
  }

  private drain() {
    while (this.active < MAX_PARALLEL && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.active++;
      this.upload(item).finally(() => {
        this.active--;
        this.drain();
      });
    }
  }

  private async upload(item: QueueItem): Promise<void> {
    const retries = item.retries ?? 0;
    try {
      // Step 1 — get presigned upload URL from backend
      const presignRes = await apiClient.post<{
        data: { signedUploadUrl: string; storagePath: string };
      }>(`/test-sessions/${this.sessionId}/evidence/presign`, {
        evidenceType: item.evidenceType,
        violationType: item.violationType ?? null,
      });
      const { signedUploadUrl, storagePath } = presignRes.data.data;

      // Step 2 — PUT blob directly to Supabase (no backend routing of binary data)
      const blob = new Blob([item.buffer], { type: "image/jpeg" });
      await fetch(signedUploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "image/jpeg" },
      });

      // Step 3 — confirm with backend so it saves path to PostgreSQL
      await apiClient.post(`/test-sessions/${this.sessionId}/evidence/confirm`, {
        storagePath,
        evidenceType: item.evidenceType,
        violationType: item.violationType ?? null,
        capturedAt: item.capturedAt,
        fileSizeBytes: item.buffer.byteLength,
      });

      console.log(`✅ Evidence uploaded: ${storagePath}`);
    } catch (err) {
      if (retries < MAX_RETRIES) {
        const delay = 2000 * Math.pow(2, retries); // 2s, 4s, 8s
        console.warn(`⚠️ Evidence upload failed (attempt ${retries + 1}/${MAX_RETRIES}). Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        this.queue.unshift({ ...item, retries: retries + 1 });
        this.drain();
      } else {
        console.error("❌ Evidence upload permanently failed after max retries:", err);
      }
    }
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
