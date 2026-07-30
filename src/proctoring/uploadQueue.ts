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
    const attempt = async (): Promise<void> => {
      // Step 1: Presign upload URL from backend
      const res = await fetch(
        `/api/test-sessions/${this.sessionId}/evidence/presign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evidenceType: item.evidenceType,
            ...(item.violationType ? { violationType: item.violationType } : {}),
          }),
        }
      );
      if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
      const raw = await res.json();
      const payload = raw?.data ?? raw;
      const signedUrl: string = payload.signedUploadUrl || payload.url || "";
      const storagePath: string = payload.storagePath || "";
      if (!signedUrl) throw new Error("No signedUploadUrl returned from presign");

      // Step 2: PUT binary JPEG directly to Supabase Storage
      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
        body: item.buffer,
      });
      if (!putRes.ok) throw new Error(`Storage PUT failed: ${putRes.status}`);

      // Step 3: Confirm evidence record in DB
      await fetch(
        `/api/test-sessions/${this.sessionId}/evidence/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath,
            evidenceType: item.evidenceType,
            capturedAt: item.capturedAt,
            fileSizeBytes: item.buffer.byteLength,
          }),
        }
      );
    };

    // Exponential backoff retry (1s, 2s, 4s)
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
