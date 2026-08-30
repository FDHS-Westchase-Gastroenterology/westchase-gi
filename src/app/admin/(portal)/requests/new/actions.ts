"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/portal/auth";
import { STAFF_REQUEST_FIELDS, staffRequestInputSchema } from "@/lib/portal/contracts";
import type {
  CreateStaffRequestActionState,
  StaffRequestDraft,
  StaffRequestField,
} from "@/lib/portal/contracts";
import { serviceClient } from "@/lib/portal/server";

const idempotencyKeySchema = z.uuid();
const requestIdSchema = z.uuid();
const stringSchema = z.string();

export async function createStaffRequest(
  previousState: Readonly<CreateStaffRequestActionState>,
  formData: FormData,
): Promise<CreateStaffRequestActionState> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  void previousState;

  const stringValue = (field: StaffRequestField): string => {
    const value = formData.get(field);
    const parsed = stringSchema.safeParse(value);
    return parsed.success ? parsed.data : "";
  };
  const values: StaffRequestDraft = {
    name: stringValue("name"),
    phone: stringValue("phone"),
    email: stringValue("email"),
    location: stringValue("location"),
    time: stringValue("time"),
    message: stringValue("message"),
  };
  const input = staffRequestInputSchema.safeParse(values);
  const idempotencyKey = idempotencyKeySchema.safeParse(formData.get("idempotencyKey"));

  if (!input.success || !idempotencyKey.success) {
    const fieldErrors: Partial<Record<StaffRequestField, string>> = {};
    if (!input.success) {
      const tree = z.treeifyError(input.error);
      for (const field of STAFF_REQUEST_FIELDS) {
        const error = tree.properties?.[field]?.errors[0];
        if (error !== undefined) fieldErrors[field] = error;
      }
    }
    return {
      status: "error",
      code: "validation",
      values,
      idempotencyKey: idempotencyKey.success ? idempotencyKey.data : null,
      fieldErrors,
    };
  }

  const validatedIdempotencyKey = idempotencyKey.data;

  let result;
  try {
    result = await serviceClient().rpc("portal_create_staff_request", {
      p_actor_email: session.email.trim().toLowerCase(),
      p_idempotency_key: validatedIdempotencyKey,
      p_request: {
        name: input.data.name,
        phone: input.data.phone,
        email: input.data.email === "" ? null : input.data.email,
        location: input.data.location,
        preferred_time: input.data.time,
        message:
          input.data.message === undefined || input.data.message === "" ? null : input.data.message,
      },
    });
  } catch {
    return {
      status: "error",
      code: "unavailable",
      values,
      idempotencyKey: validatedIdempotencyKey,
    };
  }

  if (result.error) {
    return {
      status: "error",
      code: result.error.code === "23505" ? "conflict" : "unavailable",
      values,
      idempotencyKey: validatedIdempotencyKey,
    };
  }

  const requestId = requestIdSchema.safeParse(result.data);
  if (!requestId.success) {
    return {
      status: "error",
      code: "unavailable",
      values,
      idempotencyKey: validatedIdempotencyKey,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  // A dialog caller has a page worth staying on, so it gets the new id back
  // Instead of a redirect that would throw its context away.
  if (formData.get("stayHere") === "1") {
    return { status: "created", requestId: requestId.data, name: input.data.name };
  }
  return redirect(`/admin/requests/${requestId.data}?created=1`);
}
