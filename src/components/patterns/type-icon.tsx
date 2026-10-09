import { cn } from "cn";
import {
  ActivityIcon,
  ClipboardCheckIcon,
  DropletIcon,
  FileTextIcon,
  HistoryIcon,
  MicroscopeIcon,
  PillIcon,
  StethoscopeIcon,
  SyringeIcon,
  UserPlusIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AppointmentTypeIcon } from "@/lib/portal/scheduling/contracts";

/* An appointment type's icon (issue #352, Figma St3): the fixed Lucide set
   in APPOINTMENT_TYPE_ICONS, chosen per type in Settings and drawn wherever
   the type is named — the Appointment types list, the Day view's blocks and
   the Week view's blocks. Icons, not colors, because a block's color already
   means its status. Decorative beside the type's name, so it is hidden from
   assistive tech; the size and ink come from the caller. */

const ICONS = {
  "user-plus": UserPlusIcon,
  history: HistoryIcon,
  stethoscope: StethoscopeIcon,
  "clipboard-check": ClipboardCheckIcon,
  syringe: SyringeIcon,
  droplet: DropletIcon,
  microscope: MicroscopeIcon,
  pill: PillIcon,
  activity: ActivityIcon,
  "file-text": FileTextIcon,
} as const satisfies Record<AppointmentTypeIcon, LucideIcon>;
export function TypeIcon({
  icon,
  className,
}: Readonly<{
  icon: AppointmentTypeIcon;
  className?: string;
}>) {
  const Icon = ICONS[icon];
  return <Icon aria-hidden="true" strokeWidth={2} className={cn("shrink-0", className)} />;
}
