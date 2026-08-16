type E2ETargetEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * @param {E2ETargetEnvironment} env
 * @param {string[]} names
 */
function first(env: E2ETargetEnvironment, ...names: readonly string[]) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}

/**
 * @param {E2ETargetEnvironment} env
 * @param {string} label
 * @param {string[]} names
 */
function required(env: E2ETargetEnvironment, label: string, ...names: readonly string[]) {
  const value = first(env, ...names);
  if (value !== undefined && value !== "") return value;
  throw new Error(`E2E safety check failed: missing ${label}`);
}

/** @param {string} value @param {string} label */
function safeUrl(value: string, label: string) {
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      throw new Error();
    }
    return url;
  } catch {
    throw new Error(`E2E safety check failed: invalid ${label}`);
  }
}

/** @param {E2ETargetEnvironment} env */
export function assertSafeE2ETarget(env: E2ETargetEnvironment) {
  const projectRef = required(
    env,
    "development project reference",
    "SUPABASE_DEV_PROJECT_REF",
    "SUPABASE_PROJECT_REF",
  );
  const allowedRef = required(
    env,
    "explicit Playwright project allowlist",
    "PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF",
  );
  const targetUrl = safeUrl(
    required(env, "Supabase URL", "NEXT_PUBLIC_SUPABASE_URL"),
    "Supabase URL",
  );

  const hosted = targetUrl.hostname.endsWith(".supabase.co");
  const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  const loopback = loopbackHosts.has(targetUrl.hostname);
  if (!hosted && !loopback) {
    throw new Error(
      "E2E safety check failed: only matching Supabase or explicit local targets are allowed",
    );
  }

  const productionRef = hosted
    ? required(
        env,
        "Production project reference",
        "SUPABASE_PROD_PROJECT_REF",
        "SUPABASE_PROJECT_REF_PROD",
      )
    : first(env, "SUPABASE_PROD_PROJECT_REF", "SUPABASE_PROJECT_REF_PROD");
  if (productionRef !== undefined && productionRef !== "" && projectRef === productionRef) {
    throw new Error("E2E safety check failed: Production project rejected");
  }

  const productionUrlValue = hosted
    ? required(
        env,
        "Production URL",
        "SUPABASE_PROD_URL",
        "SUPABASE_URL_PROD",
      )
    : first(env, "SUPABASE_PROD_URL", "SUPABASE_URL_PROD");
  if (
    productionUrlValue !== undefined &&
    productionUrlValue !== "" &&
    targetUrl.origin === safeUrl(productionUrlValue, "Production URL").origin
  ) {
    throw new Error("E2E safety check failed: Production URL rejected");
  }

  if (projectRef !== allowedRef) {
    throw new Error(
      "E2E safety check failed: target is not the explicitly allowlisted project",
    );
  }

  if (hosted) {
    if (
      targetUrl.protocol !== "https:" ||
      targetUrl.hostname !== `${projectRef}.supabase.co`
    ) {
      throw new Error(
        "E2E safety check failed: hosted URL does not match the project reference",
      );
    }
    return;
  }

  if (!loopback || projectRef !== "local") {
    throw new Error(
      "E2E safety check failed: only matching Supabase or explicit local targets are allowed",
    );
  }
}
