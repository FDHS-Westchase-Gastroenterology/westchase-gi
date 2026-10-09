// Shared date input policy for the surfaces that pick a day: the record card
// On Home and the patient booking card on Schedule. The server re-validates
// Every resolved instant regardless.

const NY_DAY_INPUT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: "America/New_York",
});

/** Practice-local "today" shifted by whole days, as a `<input type="date">` value. */
export function practiceLocalDay(offsetDays: number): string {
  const todayEt = NY_DAY_INPUT.format(new Date());
  const shifted = new Date(Date.parse(`${todayEt}T00:00:00Z`) + offsetDays * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}
