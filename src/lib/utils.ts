import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTimeframeCutoff(tf: string): Date {
  const now = new Date();
  if (tf === "24H") {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (tf === "7D") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (tf === "30D") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (tf === "YTD") {
    return new Date(now.getFullYear(), 0, 1);
  }
  return new Date(0);
}

/**
 * Strips HTML tags and unescapes common HTML entities from a string.
 */
export function stripHtml(input?: string | null): string {
  if (!input) return "";
  return input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/"\s*([^"]*?)\s*"/g, '"$1"')
    .replace(/\s+/g, " ")
    .trim();
}




