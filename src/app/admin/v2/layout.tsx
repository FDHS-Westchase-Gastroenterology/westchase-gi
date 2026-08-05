// Staff portal v2 prototype — direction contract (issue #220).
//
// THESIS: the queue IS the day sheet — position on the page is the
// attention system. Refuses the SaaS admin table with status chips and
// KPI cards.
// OWN-WORLD: ruled paper page on a mint-washed desk; navy ink, teal pen,
// amber margin flags, stamped terminal states; Public Sans with tabular
// figures; a left attention gutter on every row.
// STORY: staff open Today, see whom to call in working order, act with
// the four real verbs, and the ledger records every fact append-only —
// corrections strike through, never erase.
// FIRST VIEWPORT: the day head (date + attention summary) over ruled
// sections in working order: Call back, New requests, Needs a decision.
// The primary action is the first row itself.
// FORM: Day sheet ledger — candidate 3 of 7, own single-page staging,
// seed key 0064b225.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/portal/auth";
import { logoutAction } from "@/app/admin/actions";
import { PrototypeProvider } from "./prototype/store";
import { OpeningSheet, V2Shell } from "./shell";
import { publicSans } from "./fonts";
import "./daysheet.css";

export const metadata: Metadata = {
  title: "Staff portal v2 prototype | Westchase Gastroenterology",
  robots: { index: false, follow: false },
};

export default async function V2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/admin/login");

  return (
    <div className={`ds min-h-dvh ${publicSans.variable}`}>
      <PrototypeProvider
        viewer={session.displayName}
        fallback={<OpeningSheet viewer={session.displayName} />}
      >
        <V2Shell
          viewer={session.displayName}
          role={session.role}
          signOut={logoutAction}
        >
          {children}
        </V2Shell>
      </PrototypeProvider>
    </div>
  );
}
