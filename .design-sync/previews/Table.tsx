/* Ported from src/app/design/brand/table.tsx: hairline rows, tracked uppercase
   heads, tabular numerals for times and counts. Fictional patients. */

import {
  Badge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "westchase-gi";

const rows = [
  { name: "Maria Alvarez", status: "attention", label: "New", when: "8:12 am", phone: "(813) 555-0142" },
  { name: "Daniel Nguyen", status: "current", label: "Contacted", when: "Yesterday", phone: "(813) 555-0187" },
  { name: "Grace Kim", status: "settled", label: "Scheduled", when: "Aug 27", phone: "(813) 555-0119" },
  { name: "Omar Haddad", status: "quiet", label: "Closed", when: "Aug 21", phone: "(813) 555-0163" },
] as const;

export function AppointmentRequests() {
  return (
    <div className="w-full overflow-x-auto">
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
          {rows.map((r) => (
            <TableRow key={r.name}>
              <TableCell>{r.name}</TableCell>
              <TableCell>
                <Badge variant={r.status}>{r.label}</Badge>
              </TableCell>
              <TableCell>{r.when}</TableCell>
              <TableCell className="text-right">{r.phone}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function Minimal() {
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead className="text-right">Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Monday – Thursday</TableCell>
            <TableCell className="text-right">8:00 am – 5:00 pm</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Friday</TableCell>
            <TableCell className="text-right">8:00 am – 12:00 pm</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
