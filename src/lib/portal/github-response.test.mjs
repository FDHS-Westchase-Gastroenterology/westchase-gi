import assert from "node:assert/strict";
import test from "node:test";

import { GitHubApiError, readGitHubResponse } from "./github-response.ts";

/* How the portal reads GitHub's answers: the status travels with the body,
   an empty success body is data null, and a non-JSON body or a failing
   status becomes a typed error rather than a thrown surprise. */

function response(status, body, contentType = "application/json") {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

test("a JSON success keeps its status and its parsed body", async () => {
  const read = await readGitHubResponse(response(201, JSON.stringify({ id: 7 })));
  assert.deepEqual(read, { status: 201, data: { id: 7 } });
});

test("an empty success body reads as null data", async () => {
  const read = await readGitHubResponse(response(204, null));
  assert.deepEqual(read, { status: 204, data: null });
});

test("a body that is not JSON is an invalid-response error", async () => {
  await assert.rejects(
    readGitHubResponse(response(200, "<html>", "text/html")),
    (error) => error instanceof GitHubApiError && error.kind === "invalid_response",
  );
});

test("a failing status becomes a GitHubApiError that carries the status", async () => {
  for (const status of [403, 422, 500]) {
    await assert.rejects(
      readGitHubResponse(response(status, JSON.stringify({ message: "no" }))),
      (error) => error instanceof GitHubApiError && error.status === status,
    );
  }
});
