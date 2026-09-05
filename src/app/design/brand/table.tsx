import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Example, ExampleWrapper } from "./example";

/* The audit recipe: hairline rows, tracked uppercase heads, tabular
   numerals for times and counts. Fictional patients. */

interface Row {
  readonly name: string;
  readonly status: "attention" | "current" | "settled" | "quiet";
  readonly label: string;
  readonly when: string;
  readonly phone: string;
}

const rows: readonly Row[] = [
  {
    name: "Maria Alvarez",
    status: "attention",
    label: "New",
    when: "8:12 am",
    phone: "(813) 555-0142",
  },
  {
    name: "Daniel Nguyen",
    status: "current",
    label: "Contacted",
    when: "Yesterday",
    phone: "(813) 555-0187",
  },
  {
    name: "Grace Kim",
    status: "settled",
    label: "Scheduled",
    when: "Aug 27",
    phone: "(813) 555-0119",
  },
  {
    name: "Omar Haddad",
    status: "quiet",
    label: "Closed",
    when: "Aug 21",
    phone: "(813) 555-0163",
  },
];

export default function BrandTableExample() {
  return (
    <ExampleWrapper className="lg:grid-cols-1">
      <Example title="Appointment requests">
        <div
          role="region"
          aria-label="Appointment requests"
          tabIndex={0}
          className="w-full overflow-x-auto"
        >
          <Table>
            <TableCaption>
              Four requests, one per line. Counts and times use tabular numerals.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-semibold text-ink">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant={row.status}>{row.label}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{row.when}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <a href={`tel:${row.phone}`} className="link-plain">
                      {row.phone}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Example>
    </ExampleWrapper>
  );
}
