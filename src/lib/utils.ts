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

