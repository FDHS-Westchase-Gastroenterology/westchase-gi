import Link from "next/link";

import { Plus, Users } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";

/* The day before the practice has any providers (issue #351; Figma S5,
   no-providers frames): the hours stay, and a card says how days arrive.
   An admin can add the first provider from here; the front desk is told
   who can. */

export function DayEmpty({ admin }: Readonly<{ admin: boolean }>) {
  return (
    <div className="wgi-dayview-empty">
      <span className="wgi-dayview-empty-disc" aria-hidden="true">
        <Users width={22} height={22} />
      </span>
      <h2 className="wgi-dayview-empty-title">No providers yet</h2>
      {admin ? (
        <>
          <p className="wgi-dayview-empty-text">
            Add a provider and their weekly hours. Their days appear here, and their open times
            become bookable.
          </p>
          <Link
            href="/admin/settings/providers?add=1"
            className={buttonVariants({ className: "wgi-dayview-empty-add" })}
          >
            <Plus width={16} height={16} aria-hidden="true" />
            Add a provider
          </Link>
        </>
      ) : (
        <p className="wgi-dayview-empty-text">
          Days appear here once an admin adds providers and their hours in Settings.
        </p>
      )}
    </div>
  );
}
