import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { LocationsView } from "@/app/admin/(portal)/settings/locations/locations-view";
import { requireRole } from "@/lib/portal/auth";
import { readSchedulingSettings } from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";

import "@/app/admin/(portal)/settings/settings.css";

/* Settings › Locations (issue #352, Figma St5): the practice's offices,
   their addresses, office hours, who works at each and the days each is
   closed. Staff read it; admins change it, each change applied as it is
   made. */
export default async function SettingsLocationsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ edit?: string }>;
}>) {
  const session = await requireRole("staff");
  const [settings, params] = await Promise.all([
    readSchedulingSettings(serviceClient(), session.id),
    searchParams,
  ]);
  if (!settings.ok) throw new Error(`Settings read failed: ${settings.code}`);

  return (
    <>
      <PortalPageHeader title="Locations" />
      <LocationsView settings={settings} editingId={params.edit ?? null} />
    </>
  );
}
