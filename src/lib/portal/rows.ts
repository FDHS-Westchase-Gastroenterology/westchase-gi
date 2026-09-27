import "server-only";

import type { Json } from "@/lib/json";
import type { StaffRole } from "@/lib/portal/contracts";

/** Row shapes mirrored from supabase/migrations. Narrow queries pass Pick<>
 * so the claimed type never exceeds the columns actually selected. */

export interface StaffProfileRow {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: StaffRole;
  active: boolean;
  onboarded_at: string | null;
  portal_tour_dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecipientRow {
  id: string;
  email: string;
  label: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Json;
  at: string;
  source: string | null;
  correlation_id: string | null;
  created_at: string;
  updated_at: string;
}
