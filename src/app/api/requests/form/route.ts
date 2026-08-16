import type { Json } from "@/lib/json";
import {
  HONEYPOT_FIELD,
  receiptPath,
} from "@/lib/portal/contracts";
import { processIntake } from "@/lib/portal/intake";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/site";

export const runtime = "nodejs";

function stringValue(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (value === null || value instanceof File) return undefined;
  return value;
}

function refererPath(request: Request): string | undefined {
  const referer = request.headers.get("referer");
  if (referer === null || referer === "") return undefined;

  try {
    return new URL(referer).pathname;
  } catch {
    return undefined;
  }
}

function receiptLocale(
  formLocale: string | undefined,
  sourcePath: string | undefined,
): Locale {
  if (formLocale !== undefined && formLocale !== "" && isLocale(formLocale)) {
    return formLocale;
  }

  const pathLocale =
    sourcePath === undefined || sourcePath === ""
      ? undefined
      : sourcePath.split("/").find((segment) => segment !== "");
  return pathLocale !== undefined &&
    pathLocale !== "" &&
    isLocale(pathLocale)
    ? pathLocale
    : "en";
}

export async function POST(request: Request) {
  const fallbackSourcePath = refererPath(request);
  let rawInput: Json | null = null;
  let locale: Locale = receiptLocale(undefined, fallbackSourcePath);

  try {
    const formData = await request.formData();
    const formLocale = stringValue(formData, "locale");
    const formSourcePath = stringValue(formData, "sourcePath");
    const sourcePath =
      formSourcePath !== undefined && formSourcePath !== ""
        ? formSourcePath
        : fallbackSourcePath !== undefined && fallbackSourcePath !== ""
          ? fallbackSourcePath
          : "/";
    locale = receiptLocale(formLocale, sourcePath);
    rawInput = {
      name: stringValue(formData, "name") ?? null,
      phone: stringValue(formData, "phone") ?? null,
      email: stringValue(formData, "email") ?? null,
      location: stringValue(formData, "location") ?? null,
      time: stringValue(formData, "time") ?? null,
      message: stringValue(formData, "message") ?? null,
      locale,
      sourcePath,
      [HONEYPOT_FIELD]: stringValue(formData, HONEYPOT_FIELD) ?? null,
    };
  } catch {
    // A malformed body lands on the truthful failure receipt.
  }

  const result = await processIntake(rawInput, request.headers, true);
  const destination = new URL(receiptPath(locale), request.url);
  if (result.receiptToken !== undefined && result.receiptToken !== "") {
    destination.searchParams.set("receipt", result.receiptToken);
  } else if (!result.response.ok) {
    destination.searchParams.set("failure", "1");
  }

  // Route-handler redirect() uses 307 and would replay this POST. A 303
  // Explicitly completes the POST/redirect/GET flow without putting patient
  // Fields in the destination URL.
  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "no-store",
      Location: destination.toString(),
    },
  });
}
