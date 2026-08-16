import { jsonSchema } from "@/lib/json";
import type { Json } from "@/lib/json";

export class GitHubApiError extends Error {
  constructor(
    readonly status: number | null,
    readonly kind: "provider" | "invalid_response" = "provider",
  ) {
    super("GitHub API request failed");
  }
}

export async function readGitHubResponse(
  response: Response,
): Promise<{ status: number; data: Json }> {
  if (!response.ok) throw new GitHubApiError(response.status);
  if (response.status === 204) return { status: response.status, data: null };

  const body = await response.text();
  if (!body) return { status: response.status, data: null };

  try {
    return { status: response.status, data: jsonSchema.parse(JSON.parse(body)) };
  } catch {
    throw new GitHubApiError(null, "invalid_response");
  }
}
