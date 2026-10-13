import "server-only";

/** Where the app's database is, and the Supabase API it must agree with when that is set. */
export interface DatabaseSource {
  readonly postgresUrl: string;
  readonly supabaseUrl: string | undefined;
}

/**
 * The server has no database to connect to. The message is what `database()` logs, so a deploy
 * without one can be diagnosed: the variable's name, never a value.
 */
export class DatabaseNotConfigured extends Error {
  override readonly name = "DatabaseNotConfigured";
}

type Environment = Readonly<Partial<Record<string, string>>>;

function setting(env: Environment, name: string): string | undefined {
  const value = env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
}

/**
 * The one place the app learns where its database is. On Supabase that is `POSTGRES_URL`, with
 * `NEXT_PUBLIC_SUPABASE_URL` so `connectionSettings` can refuse a pair that names two projects.
 * Hosting the app elsewhere replaces this body (a Secrets Manager secret, or an IAM token through
 * postgres.js's `password` callback) and no caller changes.
 *
 * Read when the first statement needs it, never at import, so a build or a page that reads no
 * data works without it. Without `POSTGRES_URL` it throws `DatabaseNotConfigured` and nothing
 * connects.
 */
export function databaseSource(env: Environment = process.env): DatabaseSource {
  const postgresUrl = setting(env, "POSTGRES_URL");
  if (postgresUrl === undefined) {
    throw new DatabaseNotConfigured("POSTGRES_URL is not set");
  }
  return { postgresUrl, supabaseUrl: setting(env, "NEXT_PUBLIC_SUPABASE_URL") };
}
