import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ANALYTICS_EVENTS,
  TELEMETRY_CLIENT_HASH_DOMAIN,
  TELEMETRY_ROUTE_TEMPLATES,
  telemetryEventSchema,
} from "../telemetry.ts";

const INTAKE_CLIENT_HASH_DOMAIN = "wgi:intake-rate-limit:client:v1\0";

const FROZEN_EVENTS = [
  "page_view",
  "form_view",
  "form_submit",
  "form_success",
  "form_failure",
  "form_unknown",
  "form_throttled",
  "cta_tap_call",
  "cta_tap_text",
  "cta_tap_patient_portal",
  "cta_tap_hushforms",
  "cta_tap_review",
  "chooser_shown",
  "chooser_accepted_hint",
  "chooser_switched",
  "chooser_kept_current",
  "chooser_dismissed",
  "banner_dismissed",
  "doc_download",
  "doc_request_by_text",
];

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function slugFieldsIn(dirRelative) {
  const dir = join(root, dirRelative);
  const files = readdirSync(dir).filter(
    (name) => name.endsWith(".ts") && name !== "index.ts" && name !== "types.ts",
  );
  const slugs = [];
  const re = /slug:\s*"([^"]+)"/g;
  for (const file of files) {
    const source = readFileSync(join(dir, file), "utf8");
    for (const match of source.matchAll(re)) {
      slugs.push(match[1]);
    }
  }
  return slugs;
}

function documentIds() {
  const source = readFileSync(join(root, "lib/documents.ts"), "utf8");
  return [...source.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]);
}

test("valid payload parses", () => {
  const parsed = telemetryEventSchema.safeParse({
    event: "page_view",
    routeTemplate: "/",
    locale: "en",
    deviceClass: "desktop",
  });
  assert.equal(parsed.success, true);
});

test("unknown event rejected", () => {
  const parsed = telemetryEventSchema.safeParse({
    event: "page_click",
    routeTemplate: "/",
    locale: "en",
    deviceClass: "desktop",
  });
  assert.equal(parsed.success, false);
});

test("non-allowlisted route template rejected", () => {
  const parsed = telemetryEventSchema.safeParse({
    event: "page_view",
    routeTemplate: "/admin/requests",
    locale: "en",
    deviceClass: "desktop",
  });
  assert.equal(parsed.success, false);
});

test("route template containing query string rejected", () => {
  const parsed = telemetryEventSchema.safeParse({
    event: "page_view",
    routeTemplate: "/appointment?ref=1",
    locale: "en",
    deviceClass: "desktop",
  });
  assert.equal(parsed.success, false);
});

test("bad locale rejected", () => {
  const parsed = telemetryEventSchema.safeParse({
    event: "page_view",
    routeTemplate: "/",
    locale: "fr",
    deviceClass: "desktop",
  });
  assert.equal(parsed.success, false);
});

test("bad device class rejected", () => {
  const parsed = telemetryEventSchema.safeParse({
    event: "page_view",
    routeTemplate: "/",
    locale: "en",
    deviceClass: "watch",
  });
  assert.equal(parsed.success, false);
});

test("allowlist integrity", () => {
  for (const template of TELEMETRY_ROUTE_TEMPLATES) {
    assert.ok(
      template.startsWith("/") || template.startsWith("documents:"),
      `unexpected template prefix: ${template}`,
    );
    assert.ok(!template.includes("admin"), `admin leaked: ${template}`);
    assert.notEqual(template, "/review");
  }

  const prepSlugs = slugFieldsIn("lib/content/preps");
  for (const slug of prepSlugs) {
    assert.ok(
      TELEMETRY_ROUTE_TEMPLATES.includes(`/procedure-prep/${slug}`),
      `missing prep slug: ${slug}`,
    );
  }

  const educationSlugs = slugFieldsIn("lib/content/education");
  for (const slug of educationSlugs) {
    assert.ok(
      TELEMETRY_ROUTE_TEMPLATES.includes(`/patient-education/${slug}`),
      `missing education slug: ${slug}`,
    );
  }

  const blogSlugs = slugFieldsIn("lib/content/blog");
  for (const slug of blogSlugs) {
    assert.ok(TELEMETRY_ROUTE_TEMPLATES.includes(`/blog/${slug}`), `missing blog slug: ${slug}`);
  }

  for (const id of documentIds()) {
    assert.ok(TELEMETRY_ROUTE_TEMPLATES.includes(`documents:${id}`), `missing document id: ${id}`);
  }
});

test("event enum matches the frozen 20-value list exactly", () => {
  assert.deepEqual([...ANALYTICS_EVENTS], FROZEN_EVENTS);
  assert.equal(ANALYTICS_EVENTS.length, 20);
});

test("telemetry HMAC domain differs from intake and yields 64-hex", () => {
  assert.notEqual(TELEMETRY_CLIENT_HASH_DOMAIN, INTAKE_CLIENT_HASH_DOMAIN);
  assert.equal(TELEMETRY_CLIENT_HASH_DOMAIN, "wgi:telemetry-rate-limit:client:v1\0");
  const hash = createHmac("sha256", "unit-test-key")
    .update(TELEMETRY_CLIENT_HASH_DOMAIN)
    .update("missing")
    .digest("hex");
  assert.match(hash, /^[0-9a-f]{64}$/);
});
