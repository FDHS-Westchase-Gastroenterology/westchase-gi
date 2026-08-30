import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/* Brand adaptation of the shadcn Table (DESIGN.md "Component system"):
 * the portal's audit recipe — line-bordered rows, uppercase muted
 * headers, px-5 rhythm — baked into the slots. Server-safe on purpose
 * (plain elements, no client hooks). The generated version wrapped the
 * table in an overflow container; consumers here own their scroll
 * wrappers (a focusable region with an aria label scrolls better than a
 * bare div), and one toggles `hidden md:table` on the element itself,
 * so the container was dropped rather than doubled. */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-left text-[0.9rem]", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "text-[0.8rem] tracking-[0.06em] text-muted-ink uppercase [&_tr]:border-b",
        className,
      )}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={cn("border-b border-line", className)} {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("px-5 py-3.5 align-middle font-bold whitespace-nowrap", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td data-slot="table-cell" className={cn("px-5 py-3 align-middle", className)} {...props} />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-[0.88rem] text-muted-ink", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
