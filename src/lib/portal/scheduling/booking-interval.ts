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

/** Where openings start on the practice clock: "on the hour", "at :00 and :30",
    "at :00, :15, :30 and :45", or "every 90 minutes from midnight" when the
    marks do not repeat each hour. */
export function clockMarks(minutes: number): string {
  if (minutes === 60) return "on the hour";
  if (60 % minutes !== 0) return `${intervalEvery(minutes)} from midnight`;
  const marks: string[] = [];
  for (let minute = 0; minute < 60; minute += minutes)
    marks.push(`:${String(minute).padStart(2, "0")}`);
  const last = marks.pop() ?? "";
  return `at ${marks.join(", ")} and ${last}`;
}
