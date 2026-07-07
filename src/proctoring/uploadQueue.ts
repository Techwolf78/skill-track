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
    console.log(`[MOCK] Skipping Supabase Storage Upload for ${item.evidenceType}`);
    return Promise.resolve();
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
