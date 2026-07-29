import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const LIST_USERS_PER_PAGE = 200;
const LIST_USERS_MAX_PAGES = 20;

/**
 * email → display name for every staff profile ever recorded (active or not,
 * so historical note/outcome attribution still resolves).
 */
export async function fetchStaffNameMap(
  db: SupabaseClient,
): Promise<ReadonlyMap<string, string>> {
  try {
    const { data, error } = await db
      .from("staff_profiles")
      .select("email, display_name");

    if (error || !data) return new Map();

    const map = new Map<string, string>();
    for (const row of data) {
      const email =
        typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
      const displayName =
        typeof row.display_name === "string" ? row.display_name.trim() : "";
      if (!email || !displayName) continue;
      map.set(email, displayName);
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * user_id → last_sign_in_at (ISO string) for the given staff user ids,
 * from existing Auth admin state. Missing users and users who never signed
 * in map to null. `readFailed` distinguishes a failed Auth read from a
 * truthful set of empty results — "no sign-ins yet" and "could not check"
 * are different truths, so the caller can say which.
 */
export async function fetchLastSignInMap(
  db: SupabaseClient,
  userIds: readonly string[],
): Promise<{ map: ReadonlyMap<string, string | null>; readFailed: boolean }> {
  if (userIds.length === 0) return { map: new Map(), readFailed: false };

  const nullMap = (): Map<string, string | null> => {
    const map = new Map<string, string | null>();
    for (const id of userIds) map.set(id, null);
    return map;
  };

  try {
    const wanted = new Set(userIds);
    const map = nullMap();
    let found = 0;

    for (let page = 1; page <= LIST_USERS_MAX_PAGES; page += 1) {
      const { data, error } = await db.auth.admin.listUsers({
        page,
        perPage: LIST_USERS_PER_PAGE,
      });

      if (error) return { map: nullMap(), readFailed: true };

      const users = data?.users ?? [];
      for (const user of users) {
        if (!wanted.has(user.id)) continue;
        map.set(user.id, user.last_sign_in_at ?? null);
        found += 1;
      }

      if (found >= wanted.size) break;
      if (users.length < LIST_USERS_PER_PAGE) break;
    }

    return { map, readFailed: false };
  } catch {
    return { map: nullMap(), readFailed: true };
  }
}

/**
 * Presentation helper shared by every surface: the display name when known,
 * the raw email otherwise (external/maintenance actors are not in
 * staff_profiles, and showing their email remains honest).
 */
export function displayNameOrEmail(
  nameMap: ReadonlyMap<string, string>,
  email: string,
): string {
  const key = email.trim().toLowerCase();
  const name = nameMap.get(key);
  return name && name.length > 0 ? name : email;
}
