/* Deterministic randomness and America/New_York clock helpers shared by the demo generator.
   The same seed and reference time always produce the same dataset. */

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
const ZONE = "America/New_York";

const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function nyParts(ms) {
  return Object.fromEntries(parts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
}

function offsetMinutes(ms) {
  const p = nyParts(ms);
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms) / MIN;
}

/** Instant for a clinic-local date and minute of the day. */
export function ny(date, minute) {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minute);
  return guess - offsetMinutes(guess - offsetMinutes(guess) * MIN) * MIN;
}

export function nyDate(ms) {
  const p = nyParts(ms);
  return `${p.year}-${p.month}-${p.day}`;
}

export function nyMinute(ms) {
  const p = nyParts(ms);
  return +p.hour * 60 + +p.minute;
}

/** Whole-second ISO timestamp, the precision the portal writes. */
export const iso = (ms) =>
  new Date(Math.round(ms / 1000) * 1000).toISOString().replace(".000Z", "+00:00");

export function addDays(date, n) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const weekday = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();

export const daysBetween = (a, b) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY);

export function clockLabel(ms) {
  const m = nyMinute(ms);
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export const dayLabel = (ms) =>
  new Date(ms).toLocaleDateString("en-US", {
    timeZone: ZONE,
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });

/** Text seeds hash to a 32-bit integer so `--seed spring-demo` works as well as `--seed 42`. */
export function seedNumber(seed) {
  const text = String(seed);
  if (/^\d+$/.test(text)) return Number(text) | 0;
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h | 0;
}

/** Mulberry32 plus the draw helpers the generator uses. */
export function createRandom(seed) {
  let state = seedNumber(seed);
  function rnd() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const chance = (p) => rnd() < p;
  function weighted(entries) {
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = rnd() * total;
    for (const [value, w] of entries) if ((r -= w) < 0) return value;
    return entries.at(-1)[0];
  }
  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function uuid() {
    const b = Array.from({ length: 16 }, () => ri(0, 255));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  return { rnd, ri, pick, chance, weighted, shuffle, uuid };
}
