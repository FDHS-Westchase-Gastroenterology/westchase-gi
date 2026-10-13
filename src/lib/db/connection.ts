import "server-only";

/** The postgres.js options this app derives from one connection URL. */
export interface ConnectionSettings {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  readonly ssl: "require" | false;
  /** Transaction-mode poolers cannot keep a prepared statement between transactions. */
  readonly prepare: boolean;
  readonly max: number;
  readonly idle_timeout: number;
  readonly connect_timeout: number;
}

const POOLER_HOST_SUFFIX = ".pooler.supabase.com";
const POOLER_PORT = 6543;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The Supabase project a URL names, when it names one: the pooler's `postgres.<ref>` user,
 * the direct `db.<ref>.supabase.co` host, or the API's `<ref>.supabase.co` host.
 */
export function supabaseProjectRef(url: Readonly<URL>): string | null {
  const user = /^postgres\.([a-z0-9]+)$/u.exec(decodeURIComponent(url.username));
  if (user !== null) return user[1];
  const host = /^(?:db\.)?([a-z0-9]+)\.supabase\.co$/u.exec(url.hostname);
  return host === null ? null : host[1];
}

/**
 * Parses `POSTGRES_URL` into postgres.js options. Query parameters are read, not forwarded:
 * `sslmode=disable` turns TLS off and `connect_timeout` is kept; the pooler hints Supabase and
 * Vercel append (`pgbouncer`, `supa`) are dropped. A Supavisor transaction pooler (its host
 * or port 6543) gets no prepared statements and a small pool, since each serverless instance
 * holds its own.
 *
 * When both this URL and `NEXT_PUBLIC_SUPABASE_URL` name a Supabase project, they must name the
 * same one, so data and sign-in never come from different databases.
 */
export function connectionSettings(
  postgresUrl: string,
  supabaseUrl: string | undefined,
): ConnectionSettings {
  const url = new URL(postgresUrl);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("POSTGRES_URL must be a postgres:// or postgresql:// URL");
  }
  const databaseRef = supabaseProjectRef(url);
  const apiRef =
    supabaseUrl === undefined || supabaseUrl === ""
      ? null
      : supabaseProjectRef(new URL(supabaseUrl));
  if (databaseRef !== null && apiRef !== null && databaseRef !== apiRef) {
    throw new Error("POSTGRES_URL and NEXT_PUBLIC_SUPABASE_URL name different Supabase projects");
  }

  const port = url.port === "" ? 5432 : Number(url.port);
  const pooled = url.hostname.endsWith(POOLER_HOST_SUFFIX) || port === POOLER_PORT;
  const sslmode = url.searchParams.get("sslmode");
  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  const connectTimeout = Number(url.searchParams.get("connect_timeout") ?? "10");
  return {
    host: url.hostname,
    port,
    database: decodeURIComponent(url.pathname.slice(1)) || "postgres",
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: sslmode === "disable" || (loopback && sslmode === null) ? false : "require",
    prepare: !pooled,
    max: pooled ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: Number.isInteger(connectTimeout) && connectTimeout > 0 ? connectTimeout : 10,
  };
}
