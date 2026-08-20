/**
 * idempotency.ts
 *
 * Centralized operation ID and Idempotency-Key generator / request hash utility.
 */
import { v4 as uuidv4 } from "uuid";

// Simple djb2 string hash algorithm for payload hashing
export function hashPayload(data: unknown): string {
  if (data === undefined || data === null) return "null";
  let str = "";
  try {
    str = typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    str = String(data);
  }
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Generate a unique idempotency key for an operation.
 * @param operationPrefix Optional domain prefix (e.g., 'sub', 'code_run', 'ans')
 * @returns A unique operation key string
 */
export function generateIdempotencyKey(operationPrefix?: string): string {
  const uuid = uuidv4();
  return operationPrefix ? `${operationPrefix}_${uuid}` : uuid;
}

/**
 * Generate a deterministic request hash from method, URL, and payload.
 */
export function createRequestFingerprint(
  method: string,
  url: string,
  data?: unknown
): string {
  const normalizedMethod = method.toUpperCase().trim();
  const normalizedUrl = url.toLowerCase().split("?")[0].trim();
  const payloadHash = hashPayload(data);
  return `${normalizedMethod}:${normalizedUrl}:${payloadHash}`;
}

/**
 * In-memory registry for locking active in-flight requests on the client.
 *
 * When a duplicate request fires while one is already in-flight, the API
 * interceptor returns the same cached Promise so only one network round-trip
 * is ever made for structurally identical concurrent mutations.
 */
const activeRequestsLock = new Map<string, Promise<unknown>>();

export function getActiveRequestLock<T>(fingerprint: string): Promise<T> | undefined {
  return activeRequestsLock.get(fingerprint) as Promise<T> | undefined;
}

export function setActiveRequestLock<T>(fingerprint: string, promise: Promise<T>): void {
  activeRequestsLock.set(fingerprint, promise);
}

export function releaseActiveRequestLock(fingerprint: string): void {
  activeRequestsLock.delete(fingerprint);
}
