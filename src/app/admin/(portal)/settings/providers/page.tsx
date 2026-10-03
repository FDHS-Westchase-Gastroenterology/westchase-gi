import Link from "next/link";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { ProvidersView } from "@/app/admin/(portal)/settings/providers/providers-view";
import { Plus } from "@/components/icons";
import { requireRole } from "@/lib/portal/auth";
import { readSchedulingSettings } from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";

import "@/app/admin/(portal)/settings/settings.css";

/* Settings › Providers (issue #352, Figma St1 and St2): who takes
   appointments, their weekly hours, time off and the types they see. Staff
   read it; admins change it, each change applied as it is made. */
export default async function SettingsProvidersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ provider?: string; add?: string }>;
}>) {
  const session = await requireRole("staff");
  const [settings, params] = await Promise.all([
    readSchedulingSettings(serviceClient(), session.id),
    searchParams,
  ]);
  if (!settings.ok) throw new Error(`Settings read failed: ${settings.code}`);

  return (
    <>
      <PortalPageHeader
        title="Providers"
        actions={
          settings.canEdit ? (
            <Link href="?add=1" scroll={false} className="wgi-settings-command">
              <Plus aria-hidden="true" className="size-4" />
              Add provider
            </Link>
          ) : null
        }
      />
      <ProvidersView
        settings={settings}
        initialId={params.provider ?? null}
        adding={params.add === "1" && settings.canEdit}
      />
    </>
  );
}
