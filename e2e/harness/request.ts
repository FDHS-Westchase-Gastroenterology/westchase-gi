/**
 * API request fixture. Replaces `@playwright/test`'s APIRequestContext with a
 * fetch implementation bound to the harness base URL. Deterministic, no
 * browser involved — these are plain HTTP calls.
 */

import { jsonSchema } from "../../src/lib/json";
import type { Json } from "../../src/lib/json";

export interface RequestOptions {
  readonly headers?: Readonly<Record<string, string>>;
  readonly data?: unknown;
  readonly params?: Readonly<Record<string, string>>;
  readonly maxRedirects?: number;
}

export interface TestResponse {
  url: string;
  status(): number;
  ok(): boolean;
  headers(): Readonly<Record<string, string>>;
  text(): Promise<string>;
  json(): Promise<Json>;
}

export interface RequestFixture {
  get(path: string, options?: RequestOptions): Promise<TestResponse>;
  post(path: string, options?: RequestOptions): Promise<TestResponse>;
  patch(path: string, options?: RequestOptions): Promise<TestResponse>;
  put(path: string, options?: RequestOptions): Promise<TestResponse>;
  delete(path: string, options?: RequestOptions): Promise<TestResponse>;
  dispose(): Promise<void>;
  fetch(
    path: string,
    options?: Readonly<RequestOptions & { readonly method?: string }>,
  ): Promise<TestResponse>;
}

export function createRequestContext(options: {
  readonly baseURL?: string;
  readonly extraHTTPHeaders?: Readonly<Record<string, string>>;
}): RequestFixture {
  const baseURL = options.baseURL ?? "http://127.0.0.1:3100";

  async function fetchRaw(
    path: string,
    requestOptions: Readonly<RequestOptions & { readonly method?: string }>,
  ) {
    const method = requestOptions.method ?? "GET";
    const url = new URL(path, baseURL);
    for (const [key, value] of Object.entries(requestOptions.params ?? {})) {
      url.searchParams.set(key, value);
    }
    const headers = {
      ...(requestOptions.headers ?? {}),
      ...(options.extraHTTPHeaders ?? {}),
    };
    const headerNames = new Set([
      ...Object.keys(requestOptions.headers ?? {}),
      ...Object.keys(options.extraHTTPHeaders ?? {}),
    ]);
    const hasBody = requestOptions.data !== undefined;
    if (hasBody && !headerNames.has("content-type") && !headerNames.has("Content-Type")) {
      headers["content-type"] = "application/json";
    }
    const redirect = requestOptions.maxRedirects === 0 ? "manual" : "follow";
    return fetch(url, {
      method,
      headers,
      redirect,
      body: hasBody ? JSON.stringify(requestOptions.data) : undefined,
    });
  }

  function toTestResponse(response: globalThis.Response, finalUrl: string): TestResponse {
    const headerRecord: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headerRecord[key] = value;
    });
    return {
      url: finalUrl,
      status: () => response.status,
      ok: () => response.ok,
      headers: () => headerRecord,
      async text() {
        return response.text();
      },
      json: async () => jsonSchema.parseAsync(await response.json()),
    };
  }

  const fixture: RequestFixture = {
    async fetch(path, requestOptions) {
      const response = await fetchRaw(path, requestOptions ?? {});
      return toTestResponse(response, response.url || new URL(path, baseURL).toString());
    },
    async get(path, requestOptions) {
      return fixture.fetch(path, { ...requestOptions, method: "GET" });
    },
    async post(path, requestOptions) {
      return fixture.fetch(path, { ...requestOptions, method: "POST" });
    },
    async patch(path, requestOptions) {
      return fixture.fetch(path, { ...requestOptions, method: "PATCH" });
    },
    async put(path, requestOptions) {
      return fixture.fetch(path, { ...requestOptions, method: "PUT" });
    },
    async delete(path, requestOptions) {
      return fixture.fetch(path, { ...requestOptions, method: "DELETE" });
    },
    async dispose() {},
  };
  return fixture;
}

/** `playwright.request.newContext(...)` shim used by a few specs. */
export const playwrightRequestShim = {
  newContext(options: {
    readonly baseURL?: string;
    readonly extraHTTPHeaders?: Readonly<Record<string, string>>;
  }) {
    return createRequestContext(options);
  },
};
