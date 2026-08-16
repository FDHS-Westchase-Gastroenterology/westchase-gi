// The beacon transport: sendBeacon first, a keepalive fetch when the
// Platform lacks it. Never blocking, fails silently — telemetry must never
// Cost a patient anything (I6; counts are directional, not forensic).

const TELEMETRY_ENDPOINT = "/api/telemetry";

export function postBeacon(payload: string) {
  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(TELEMETRY_ENDPOINT, blob)) return;
  } catch {
    // SendBeacon unavailable or threw — fall through to keepalive fetch.
  }
  try {
    void fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Telemetry is best-effort by design.
    });
  } catch {
    // Never let telemetry break the page that carries it.
  }
}
