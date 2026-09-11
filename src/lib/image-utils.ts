// src/lib/image-utils.ts
// Utility functions for resolving, validating, and proxying question and evidence image assets.

import { apiClient } from "./api-client";

const DUMMY_PLACEHOLDER_REGEX = /^(question\s*image|option\s*\d+|none|null|undefined|image|asset|placeholder)$/i;

function getProxyPrefix(): string {
  const base = (apiClient.defaults.baseURL || "").replace(/\/+$/, "");
  if (base.startsWith("http")) {
    return `${base}/questions/assets/proxy`;
  }
  return `/api/questions/assets/proxy`;
}

/**
 * Resolves a raw image URL / storage path / base64 string to a reliable browser URL.
 * Automatically routes S3 / external assets through the backend asset proxy
 * to prevent CORS, SSL certificate, and private port (e.g. 10445) load failures.
 */
export function resolveImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed || DUMMY_PLACEHOLDER_REGEX.test(trimmed)) {
    return null;
  }

  // 1. Data URLs (Base64) & Local Object URLs (Blob)
  if (trimmed.startsWith("data:image/") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  // 2. Raw un-prefixed Base64 data
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("/") &&
    trimmed.length > 100 &&
    !trimmed.includes(" ")
  ) {
    return `data:image/jpeg;base64,${trimmed}`;
  }

  // 3. Already routed through backend proxy
  if (trimmed.includes("/questions/assets/proxy") || trimmed.includes("/snapshots/proxy")) {
    return trimmed;
  }

  const proxyPrefix = getProxyPrefix();

  // 4. Absolute HTTP / HTTPS URLs (e.g. Airtel S3 cloud, MinIO, AWS S3)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // If it's a known external storage URL (e.g. Airtel S3 on port 10445, MinIO, or rxone-store)
    // route it through the backend proxy so candidate and admin browsers can load it reliably without CORS
    if (
      trimmed.includes("cloud.airtel.in") ||
      trimmed.includes(":10445") ||
      trimmed.includes("rxone-store") ||
      trimmed.includes("s3.") ||
      trimmed.includes("minio")
    ) {
      return `${proxyPrefix}?url=${encodeURIComponent(trimmed)}`;
    }
    return trimmed;
  }

  // 5. Relative paths (e.g. /public/question-assets/... or public/question-assets/...)
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("/api/")) {
      const base = (apiClient.defaults.baseURL || "").replace(/\/+$/, "");
      return base.startsWith("http") ? `${base}${trimmed.replace(/^\/api/, "")}` : trimmed;
    }
    const base = (apiClient.defaults.baseURL || "").replace(/\/+$/, "");
    return base.startsWith("http") ? `${base}${trimmed}` : `/api${trimmed}`;
  }

  if (trimmed.startsWith("public/") || trimmed.startsWith("tests/")) {
    return `${proxyPrefix}?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

/**
 * Checks if a string looks like a valid image URL or base64 data.
 */
export function isValidImageUrl(rawUrl?: string | null): boolean {
  return resolveImageUrl(rawUrl) !== null;
}
