import type { ComponentType } from "react";

import { ClipboardCheck, Download, Mail, MapPin, User, Users } from "@/components/icons";

/* The Settings window's panes (issue #352), in the three groups its sidebar shows. */

const SETTINGS_ROOT = "/admin/settings";

interface SettingsPane {
  readonly href: string;
  readonly label: string;
  readonly icon: ComponentType<{ readonly className?: string }>;
}

export const SETTINGS_GROUPS: readonly {
  readonly label: string;
  readonly items: readonly SettingsPane[];
}[] = [
  {
    label: "Schedule",
    items: [
      { href: "/admin/settings/providers", label: "Providers", icon: Users },
      {
        href: "/admin/settings/appointment-types",
        label: "Appointment types",
        icon: ClipboardCheck,
      },
      { href: "/admin/settings/locations", label: "Locations", icon: MapPin },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/admin/settings/staff", label: "Staff access", icon: User },
      { href: "/admin/settings/notifications", label: "Notifications", icon: Mail },
    ],
  },
  {
    label: "About",
    items: [{ href: "/admin/settings/software", label: "Software", icon: Download }],
  },
];
export const SETTINGS_PANES = SETTINGS_GROUPS.flatMap((group) => group.items);

export function inSettings(pathname: string): boolean {
  return pathname === SETTINGS_ROOT || pathname.startsWith(`${SETTINGS_ROOT}/`);
}
