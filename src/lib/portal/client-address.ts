/**
 * The client's address as the outermost proxy we run saw it, or null when no
 * proxy reported one. Rate limits key on it, so a client must not be able to
 * choose it.
 *
 * On Vercel (VERCEL=1) the edge overwrites X-Forwarded-For and sets
 * X-Vercel-Forwarded-For to the same single address, so the first entry is
 * the client. Anywhere else the client can send either header with any
 * value. A load balancer in its default append mode adds the address it
 * accepted the connection from to the right of whatever arrived, so
 * TRUSTED_PROXY_HOPS (default 1) counts the proxies we run in front of the
 * app and the client's address is the entry that many from the right. With
 * fewer entries than hops the leftmost entry is used. X-Vercel-Forwarded-For
 * is ignored off Vercel, because nothing there removes a client's copy.
 */
export function clientAddress(headers: Headers): string | null {
  if (process.env.VERCEL === "1") {
    const forwardedFor = headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for");
    return nonEmpty(forwardedFor?.split(",", 1)[0]);
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor === null) return null;
  const entries = forwardedFor.split(",");
  return nonEmpty(entries[Math.max(entries.length - trustedProxyHops(), 0)]);
}

/**
 * TRUSTED_PROXY_HOPS, unset or empty meaning 1. Any other value that is not a
 * positive integer throws: a mistyped count would otherwise put every client
 * in a bucket chosen by the wrong rule without any error.
 */
function trustedProxyHops(): number {
  const configured = process.env.TRUSTED_PROXY_HOPS;
  if (configured === undefined || configured === "") return 1;
  if (!/^[1-9]\d*$/.test(configured)) {
    throw new Error(`TRUSTED_PROXY_HOPS must be a positive integer; got "${configured}"`);
  }
  return Number(configured);
}

function nonEmpty(entry: string | undefined): string | null {
  const trimmed = entry?.trim();
  return trimmed === undefined || trimmed === "" ? null : trimmed;
}
