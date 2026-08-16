import "server-only";

/** Row shapes mirrored from supabase/migrations. Narrow queries pass Pick<>
 * so the claimed type never exceeds the columns actually selected. */

export type StaffRole = "admin" | "staff";

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
