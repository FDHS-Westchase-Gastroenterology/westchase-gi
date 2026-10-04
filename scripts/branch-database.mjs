import { execFileSync } from "node:child_process";

/**
 * Runs one read query against a hosted Preview Branch and returns its rows.
 *
 * Refuses anything but a branch-scoped connection for `ref`: the direct host
 * `db.<ref>.supabase.co`, or the shared pooler with the `postgres.<ref>` user.
 * The pooler's transaction port (6543) is moved to session mode (5432) so
 * prepared statements work from GitHub-hosted runners, which have no IPv6
 * route to the direct host.
 */
export function queryBranchDatabase({ ref, query }) {
  const dbUrl = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!dbUrl) {
    throw new Error(
      "Missing required environment variable: POSTGRES_URL or POSTGRES_URL_NON_POOLING",
    );
  }
  const parsedUrl = new URL(dbUrl);
  const direct = parsedUrl.hostname === `db.${ref}.supabase.co`;
  const pooler =
    parsedUrl.hostname.endsWith(".pooler.supabase.com") &&
    decodeURIComponent(parsedUrl.username) === `postgres.${ref}`;
  if (process.env.SUPABASE_PREVIEW_BRANCH !== "1" || !(direct || pooler)) {
    throw new Error("Database verification is Preview-Branch-only");
  }
  if (pooler && parsedUrl.port === "6543") {
    parsedUrl.port = "5432";
  }

  try {
    return JSON.parse(
      execFileSync(
        "supabase",
        ["db", "query", "--db-url", parsedUrl.toString(), "--agent=no", "--output", "json", query],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    );
  } catch {
    throw new Error("Preview Branch database verification query failed");
  }
}
