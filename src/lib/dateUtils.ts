import { format, formatDistanceToNow } from "date-fns";

/**
 * Shared date formatting for every portal. Previously each page picked its own
 * format (raw ISO strings, toLocaleString, four different date-fns patterns).
 */

/** "7 days ago" / "in 3 hours" — for recency indicators. */
export function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

/** "Oct 3, 2026" — for compact date displays. */
export function shortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

/** "Oct 3, 2026, 2:45 PM" — for timestamps shown to the minute. */
export function fullDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy h:mm a");
  } catch {
    return dateStr;
  }
}
