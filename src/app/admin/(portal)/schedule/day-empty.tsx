import Link from "next/link";

import { Plus, Users } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/* The day before the practice has any providers (issue #351; Figma S5,
   no-providers frames): the hours stay, and a card says how days arrive.
   An admin can add the first provider from here; the front desk is told
   who can. */

export function DayEmpty({ admin }: Readonly<{ admin: boolean }>) {
  return (
    <Empty className="wgi-dayview-empty">
      <EmptyHeader className="wgi-dayview-empty-header">
        <EmptyMedia variant="icon" className="wgi-dayview-empty-disc" aria-hidden="true">
          <Users width={22} height={22} />
        </EmptyMedia>
        <EmptyTitle className="wgi-dayview-empty-title">No providers yet</EmptyTitle>
        <EmptyDescription className="wgi-dayview-empty-text">
          {admin
            ? "Add a provider and their weekly hours. Their days appear here, and their open times become bookable."
            : "Days appear here once an admin adds providers and their hours in Settings."}
        </EmptyDescription>
      </EmptyHeader>
      {admin ? (
        <EmptyContent className="wgi-dayview-empty-content">
          <Link
            href="/admin/settings/providers?add=1"
            className={buttonVariants({ className: "wgi-dayview-empty-add" })}
          >
            <Plus width={16} height={16} aria-hidden="true" />
            Add a provider
          </Link>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
