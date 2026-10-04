import { BOOKING_INTERVAL_MINUTES } from "@/lib/portal/scheduling/settings-contracts";

/** "15 minutes", "1 hour", "1 hour 30 minutes", "8 hours". */
export function intervalLength(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${String(hours)} ${hours === 1 ? "hour" : "hours"}`);
  if (rest > 0 || hours === 0) parts.push(`${String(rest)} minutes`);
  return parts.join(" ");
}

/** "every hour", "every 45 minutes", "every 1 hour 30 minutes". */
export function intervalEvery(minutes: number): string {
  return minutes === 60 ? "every hour" : `every ${intervalLength(minutes)}`;
}

/** The minutes an admin typed, when they are an interval the practice can keep; else null. */
export function parseInterval(text: string): number | null {
  if (!/^\d+$/u.test(text.trim())) return null;
  const minutes = Number(text);
  const { min, max, step } = BOOKING_INTERVAL_MINUTES;
  return minutes >= min && minutes <= max && minutes % step === 0 ? minutes : null;
}
