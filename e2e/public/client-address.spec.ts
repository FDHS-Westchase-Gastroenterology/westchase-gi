import { test, expect } from "@playwright/test";

import { clientAddress } from "../../src/lib/portal/client-address";

/* Intake and telemetry rate limits key on clientAddress, so a client that can
   choose the address can dodge them. Off Vercel, a load balancer in append
   mode adds the peer address to the right of whatever the client sent; the
   leading entries are the client's own. Every row sets both variables
   (undefined removes one) and states the expected address as a literal. The
   addresses are documentation ranges (RFC 5737, RFC 3849). */

const VARIABLES = ["TRUSTED_PROXY_HOPS", "VERCEL"] as const;
type Variable = (typeof VARIABLES)[number];

interface AddressRow {
  readonly title: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly hops?: string;
  readonly vercel?: string;
  readonly expected: string | null;
}

const ROWS: readonly AddressRow[] = [
  {
    title: "a spoofed leading X-Forwarded-For entry is ignored",
    headers: { "x-forwarded-for": "203.0.113.66, 198.51.100.7" },
    expected: "198.51.100.7",
  },
  {
    title: "a single entry is the peer the load balancer saw",
    headers: { "x-forwarded-for": "198.51.100.7" },
    expected: "198.51.100.7",
  },
  {
    title: "X-Vercel-Forwarded-For is ignored off Vercel",
    headers: { "x-vercel-forwarded-for": "203.0.113.66", "x-forwarded-for": "198.51.100.7" },
    expected: "198.51.100.7",
  },
  {
    title: "X-Vercel-Forwarded-For alone off Vercel gives no address",
    headers: { "x-vercel-forwarded-for": "203.0.113.66" },
    expected: null,
  },
  {
    title: "two hops take the second entry from the right",
    headers: { "x-forwarded-for": "203.0.113.66, 198.51.100.7, 192.0.2.10" },
    hops: "2",
    expected: "198.51.100.7",
  },
  {
    title: "fewer entries than hops take the leftmost",
    headers: { "x-forwarded-for": "198.51.100.7" },
    hops: "2",
    expected: "198.51.100.7",
  },
  {
    title: "an empty TRUSTED_PROXY_HOPS means one hop",
    headers: { "x-forwarded-for": "203.0.113.66, 198.51.100.7" },
    hops: "",
    expected: "198.51.100.7",
  },
  {
    title: "whitespace around entries is trimmed",
    headers: { "x-forwarded-for": "  203.0.113.66 ,   198.51.100.7  " },
    expected: "198.51.100.7",
  },
  {
    title: "IPv6 entries are returned as sent",
    headers: { "x-forwarded-for": "2001:db8::66, 2001:db8::7" },
    expected: "2001:db8::7",
  },
  {
    title: "no header gives no address",
    headers: {},
    expected: null,
  },
  {
    title: "an empty header gives no address",
    headers: { "x-forwarded-for": "" },
    expected: null,
  },
  {
    title: "on Vercel the first X-Vercel-Forwarded-For entry wins",
    headers: { "x-vercel-forwarded-for": "198.51.100.7", "x-forwarded-for": "192.0.2.10" },
    vercel: "1",
    expected: "198.51.100.7",
  },
  {
    title: "on Vercel without X-Vercel-Forwarded-For the first X-Forwarded-For entry wins",
    headers: { "x-forwarded-for": "198.51.100.7, 192.0.2.10" },
    vercel: "1",
    expected: "198.51.100.7",
  },
];

const INVALID_HOPS = ["0", "-1", "1.5", "two", " 1"] as const;

function setVariable(name: Variable, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function addressWith(row: AddressRow): string | null {
  const saved = VARIABLES.map((name) => [name, process.env[name]] as const);
  try {
    setVariable("TRUSTED_PROXY_HOPS", row.hops);
    setVariable("VERCEL", row.vercel);
    return clientAddress(new Headers(row.headers));
  } finally {
    for (const [name, value] of saved) setVariable(name, value);
  }
}

test.describe("client address resists a spoofed X-Forwarded-For", () => {
  for (const row of ROWS) {
    test(row.title, () => {
      expect(addressWith(row)).toBe(row.expected);
    });
  }

  for (const hops of INVALID_HOPS) {
    test(`TRUSTED_PROXY_HOPS="${hops}" throws`, () => {
      expect(() =>
        addressWith({
          title: "invalid hops",
          headers: { "x-forwarded-for": "198.51.100.7" },
          hops,
          expected: null,
        }),
      ).toThrow("TRUSTED_PROXY_HOPS must be a positive integer");
    });
  }
});
