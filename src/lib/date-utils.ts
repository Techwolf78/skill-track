/**
 * Unified date and time utilities for handling backend LocalDateTime strings
 * and consistent display across the application.
 */

/**
 * Safely formats a backend LocalDateTime string (e.g. "2026-09-15T14:30:00")
 * into a localized, human-readable date & time.
 */
export function formatDateTime(
  dateStr?: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr || dateStr.trim() === "" || dateStr === "null" || dateStr === "undefined") {
    return "—";
  }

  try {
    // If the string contains no time component (e.g. "2026-09-15"), append default time to avoid UTC midnight shift
    const normalizedStr = dateStr.includes("T")
      ? dateStr
      : `${dateStr}T00:00:00`;

    const date = new Date(normalizedStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    return date.toLocaleString("en-US", options || defaultOptions);
  } catch {
    return dateStr;
  }
}

/**
 * Formats date portion only (e.g. "15 Sep 2026").
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return formatDateTime(dateStr, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats time portion only (e.g. "02:30 PM").
 */
export function formatTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return formatDateTime(dateStr, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Parses a backend ISO string into separate { date: "YYYY-MM-DD", time: "HH:mm" } parts.
 */
export function parseBackendDateTime(isoStr?: string | null): { date: string; time: string } {
  if (!isoStr) {
    return { date: "", time: "" };
  }

  const clean = isoStr.trim();
  if (clean.includes("T")) {
    const [datePart, timePart] = clean.split("T");
    const timeClean = timePart ? timePart.slice(0, 5) : "00:00";
    return { date: datePart || "", time: timeClean };
  }

  // If only date is provided
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return { date: clean, time: "00:00" };
  }

  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
      };
    }
  } catch {
    // ignore
  }

  return { date: "", time: "" };
}

/**
 * Combines date (YYYY-MM-DD) and time (HH:mm) into standard backend LocalDateTime string (YYYY-MM-DDTHH:mm:ss).
 */
export function toBackendDateTime(dateStr: string, timeStr?: string): string {
  if (!dateStr) return "";
  const cleanDate = dateStr.trim();
  let cleanTime = (timeStr || "00:00").trim();

  // If time has only HH:mm, append :00
  if (/^\d{2}:\d{2}$/.test(cleanTime)) {
    cleanTime = `${cleanTime}:00`;
  } else if (!/^\d{2}:\d{2}:\d{2}$/.test(cleanTime)) {
    cleanTime = "00:00:00";
  }

  return `${cleanDate}T${cleanTime}`;
}
