import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { processTelemetry } from "./telemetry.ts";

// Fixed protocol vectors: the processor must send the keyed, domain-separated
// First-hop digest to the throttle RPC, never the address itself.
test("telemetry hashes the trusted first hop before recording an event over the RPC transport", async (t) => {
  const calls = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    calls.push({ path: request.url, body: JSON.parse(Buffer.concat(chunks).toString()) });
    if (
      request.url !== "/rest/v1/rpc/portal_check_intake_rate_limit" &&
      request.url !== "/rest/v1/rpc/portal_record_analytics_event"
    ) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" }).end("true");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const previous = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "telemetry-test-key";

  for (const [headers, digest] of [
    [
      { "x-vercel-forwarded-for": "2001:db8::AB, 203.0.113.8", "x-forwarded-for": "203.0.113.7" },
      "12d6a4326314f2c3b52dd8f8c7d53eed719a70539fd26349ed89895f3433f37a",
    ],
    [
      { "x-forwarded-for": "203.0.113.7, 203.0.113.8" },
      "6506a8310020ea980f9641baee26b19643b8a53779810796e8ecdb207a56866b",
    ],
    [{}, "962460e64f8c4da866eb55d12f79b72c1b148cd8f1825b9af7b90172a825e134"],
  ]) {
    calls.length = 0;
    assert.deepEqual(
      await processTelemetry(
        { event: "page_view", routeTemplate: "/", locale: "en", deviceClass: "desktop" },
        new Headers(headers),
      ),
      { status: 204 },
    );
    assert.deepEqual(calls, [
      {
        path: "/rest/v1/rpc/portal_check_intake_rate_limit",
        body: { p_client_hash: digest, p_limit: 300, p_window_seconds: 600 },
      },
      {
        path: "/rest/v1/rpc/portal_record_analytics_event",
        body: {
          p_event: "page_view",
          p_route_template: "/",
          p_locale: "en",
          p_device_class: "desktop",
        },
      },
    ]);
  }
});
