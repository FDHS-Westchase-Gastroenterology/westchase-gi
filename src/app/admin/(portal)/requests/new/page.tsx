import { randomUUID } from "node:crypto";

import { z } from "zod";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { requireRole } from "@/lib/portal/auth";
import { STAFF_REQUEST_SOURCE_PATH } from "@/lib/portal/contracts";

import { StaffRequestForm } from "./staff-request-form";

function firstParam(value: Readonly<string | string[] | undefined>): string | null {
  const parsed = z.union([z.string(), z.array(z.string())]).safeParse(value);
  if (!parsed.success) return null;
  if (Array.isArray(parsed.data)) return parsed.data.at(0) ?? null;
  return parsed.data;
}

export default async function NewStaffRequestPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ from?: string | string[] }>;
}>) {
  await requireRole("staff");
  const fromAppointments = firstParam((await searchParams).from) === "appointments";
  const returnHref = fromAppointments ? "/admin/requests" : "/admin";
  const returnLabel = fromAppointments ? "Back to Appointments" : "Back to Home";
  const permalink = fromAppointments
    ? `${STAFF_REQUEST_SOURCE_PATH}?from=appointments`
    : STAFF_REQUEST_SOURCE_PATH;

  return (
    <section aria-labelledby="new-request-heading" className="portal-request-create">
      <PortalPageHeader
        back={{ href: returnHref, label: returnLabel }}
        title={<span id="new-request-heading">Add patient request</span>}
        description="For a call, walk-in, or message that needs appointment follow-up. This adds a New request to the same Appointments work stack."
      />

      <StaffRequestForm
        idempotencyKey={randomUUID()}
        permalink={permalink}
        returnHref={returnHref}
        returnLabel={
          fromAppointments ? "Cancel and return to Appointments" : "Cancel and return Home"
        }
      />
    </section>
  );
}
