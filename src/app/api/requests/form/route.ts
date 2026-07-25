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
  return typeof value === "string" ? value : undefined;
}

function refererPath(request: Request): string | undefined {
  const referer = request.headers.get("referer");
  if (!referer) return undefined;

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
  if (formLocale && isLocale(formLocale)) return formLocale;

  const pathLocale = sourcePath?.split("/").filter(Boolean)[0];
  return pathLocale && isLocale(pathLocale) ? pathLocale : "en";
}

export async function POST(request: Request) {
  const fallbackSourcePath = refererPath(request);
  let rawInput: unknown = null;
  let locale: Locale = receiptLocale(undefined, fallbackSourcePath);

  try {
    const formData = await request.formData();
    const formLocale = stringValue(formData, "locale");
    const sourcePath =
      stringValue(formData, "sourcePath") || fallbackSourcePath || "/";
    locale = receiptLocale(formLocale, sourcePath);
    rawInput = {
      name: stringValue(formData, "name"),
      phone: stringValue(formData, "phone"),
      email: stringValue(formData, "email"),
      location: stringValue(formData, "location"),
      time: stringValue(formData, "time"),
      message: stringValue(formData, "message"),
      locale,
      sourcePath,
      [HONEYPOT_FIELD]: stringValue(formData, HONEYPOT_FIELD),
    };
  } catch {
    // A malformed body lands on the truthful failure receipt.
  }

  const result = await processIntake(rawInput, request.headers, true);
  const destination = new URL(receiptPath(locale), request.url);
  if (result.receiptToken) {
    destination.searchParams.set("receipt", result.receiptToken);
  } else if (!result.response.ok) {
    destination.searchParams.set("failure", "1");
  }

  // Route-handler redirect() uses 307 and would replay this POST. A 303
  // explicitly completes the POST/redirect/GET flow without putting patient
  // fields in the destination URL.
  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "no-store",
      Location: destination.toString(),
    },
  });
}
