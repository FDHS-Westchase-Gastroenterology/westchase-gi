import { serviceClient } from "@/lib/portal/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

function projectRefFromUrl(value: string | undefined): string | null {
  if (value === undefined || value === "") return null;

  try {
    const url = new URL(value);
    const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname);
    return url.protocol === "https:" ? (match?.[1] ?? null) : null;
  } catch {
    return null;
  }
}

function response(body: Readonly<Record<string, boolean | string | null>>, status: number) {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

function clientKeyIsSafe(): boolean {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const clientKey =
    publishableKey !== undefined && publishableKey !== "" ? publishableKey : anonKey;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  return (
    clientKey !== undefined &&
    clientKey !== "" &&
    !clientKey.startsWith("sb_secret_") &&
    (serviceKey === undefined || clientKey !== serviceKey)
  );
}

/**
 * A non-secret deployment attestation for the PR integration gate. Production
 * does not expose this route. Preview returns success only when every declared
 * project reference agrees and the deployed app can read the branch-only
 * workflow columns that previously exposed a stale Vercel database binding.
 */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return response({ ok: false }, 404);
  }

  const urlProjectRef = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() ?? null;
  const branchProjectRef = process.env.SUPABASE_BRANCH_PROJECT_REF?.trim() ?? null;
  const refsAgree =
    urlProjectRef !== null &&
    projectRef === urlProjectRef &&
    branchProjectRef === urlProjectRef &&
    process.env.SUPABASE_PREVIEW_BRANCH === "1";
  const safeClientKey = clientKeyIsSafe();

  if (!refsAgree || !safeClientKey) {
    return response(
      {
        ok: false,
        projectRef: urlProjectRef,
        gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        clientKeySafe: safeClientKey,
        schemaCompatible: false,
      },
      503,
    );
  }

  try {
    const requests = await serviceClient().from("requests").select("id,appointment_at").limit(1);
    const transitions = await serviceClient()
      .from("request_transitions")
      .select("id,call_again_at,appointment_at")
      .limit(1);
    const schemaCompatible = requests.error === null && transitions.error === null;

    return response(
      {
        ok: schemaCompatible,
        projectRef: urlProjectRef,
        gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        clientKeySafe: safeClientKey,
        schemaCompatible,
      },
      schemaCompatible ? 200 : 503,
    );
  } catch {
    return response(
      {
        ok: false,
        projectRef: urlProjectRef,
        gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        clientKeySafe: safeClientKey,
        schemaCompatible: false,
      },
      503,
    );
  }
}
