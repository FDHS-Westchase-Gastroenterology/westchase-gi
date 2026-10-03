import Link from "next/link";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import type { EditorField } from "@/app/admin/(portal)/settings/appointment-types/type-editor-dialog";
import { TypesView } from "@/app/admin/(portal)/settings/appointment-types/types-view";
import { Plus } from "@/components/icons";
import { requireRole } from "@/lib/portal/auth";
import { readSchedulingSettings } from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";

import "@/app/admin/(portal)/settings/settings.css";

/* Settings › Appointment types (issue #352, Figma St3): what staff book,
   in the order they choose from, each type's length, icon and the
   providers who see it. Staff read it; admins change it, each change
   applied as it is made. */
export default async function SettingsAppointmentTypesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ add?: string; type?: string; field?: string }>;
}>) {
  const session = await requireRole("staff");
  const [settings, params] = await Promise.all([
    readSchedulingSettings(serviceClient(), session.id),
    searchParams,
  ]);
  if (!settings.ok) throw new Error(`Settings read failed: ${settings.code}`);
  const field: EditorField = params.field === "details" ? "details" : "name";
  const editing =
    params.add === "1"
      ? { typeId: null, field }
      : params.type === undefined
        ? null
        : { typeId: params.type, field };

  return (
    <>
      <PortalPageHeader
        title="Appointment types"
        actions={
          settings.canEdit ? (
            <Link href="?add=1" scroll={false} className="wgi-settings-command">
              <Plus aria-hidden="true" className="size-4" />
              Add type
            </Link>
          ) : null
        }
      />
      <TypesView settings={settings} editing={editing} />
    </>
  );
}
