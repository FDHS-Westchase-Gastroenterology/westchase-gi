import { serviceClient } from "@/lib/portal/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PreviewReadiness = {
  ready: boolean;
  migrationVersions: string[] | null;
  commitSha: string | null;
  pullRequestId: string | null;
};

function response(body: PreviewReadiness, status: 200 | 503) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * A PHI-free probe for the PR-only deployment check. It proves that this
 * deployment can call the database migration ledger through its server-only
 * service connection; CI compares it to the exact committed migration set.
 */
export async function GET() {
  try {
    const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
    const pullRequestId = process.env.VERCEL_GIT_PULL_REQUEST_ID?.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const developmentRef =
      process.env.PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF?.trim();
    const productionRef = process.env.SUPABASE_PROJECT_REF_PROD?.trim();
    const productionUrl = process.env.SUPABASE_URL_PROD?.trim();
    if (
      process.env.VERCEL_ENV !== "preview" ||
      !commitSha ||
      !pullRequestId ||
      !supabaseUrl ||
      !developmentRef ||
      !productionRef ||
      !productionUrl
    ) {
      return response(
        {
          ready: false,
          migrationVersions: null,
          commitSha: null,
          pullRequestId: null,
        },
        503,
      );
    }

    const activeUrl = new URL(supabaseUrl);
    const activeRef = activeUrl.hostname.endsWith(".supabase.co")
      ? activeUrl.hostname.slice(0, -".supabase.co".length)
      : "";
    const disposableLocal =
      developmentRef === "local" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(activeUrl.hostname);
    if (
      !disposableLocal &&
      (activeUrl.protocol !== "https:" ||
        !activeRef ||
        activeRef === developmentRef ||
        activeRef === productionRef ||
        activeUrl.origin === new URL(productionUrl).origin)
    ) {
      return response(
        {
          ready: false,
          migrationVersions: null,
          commitSha,
          pullRequestId,
        },
        503,
      );
    }

    const { data, error } = await serviceClient().rpc(
      "portal_preview_schema_readiness",
    );
    if (
      error ||
      !Array.isArray(data) ||
      !data.every((version) => typeof version === "string" && /^\d{14}$/.test(version))
    ) {
      return response(
        { ready: false, migrationVersions: null, commitSha, pullRequestId },
        503,
      );
    }

    return response(
      { ready: true, migrationVersions: data, commitSha, pullRequestId },
      200,
    );
  } catch {
    return response(
      {
        ready: false,
        migrationVersions: null,
        commitSha: null,
        pullRequestId: null,
      },
      503,
    );
  }
}
