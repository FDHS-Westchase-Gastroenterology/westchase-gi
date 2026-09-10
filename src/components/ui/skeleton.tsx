import { cn } from "cn";

/*
 * Brand adaptation of the shadcn Skeleton (registry source at
 * src/components/stock/skeleton.tsx, provenance in stock/MANIFEST.json).
 *
 * WHAT CHANGED: the registry's `animate-pulse`. Tailwind's pulse is a two
 * second ease-in-out breath, a temperament the motion registry does not
 * carry, and DESIGN.md "Motion" does not allow inventing one at the call
 * site. The stillness is also the honest shape here: the only consumer
 * reads one record out of the local database behind a sheet whose own
 * entrance runs 440ms, so the placeholder is usually gone before the sheet
 * has finished arriving. A block that starts breathing for eighty
 * milliseconds is noise, not reassurance.
 *
 * Sole importer today: src/app/admin/(portal)/(home)/full-record-sheet.tsx.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
