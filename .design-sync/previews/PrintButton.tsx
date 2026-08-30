/* Wraps Button with window.print(); used at the top of every printable prep
   and education page. */
import { PrintButton } from "westchase-gi";
export function Default() {
  return <PrintButton label="Print these instructions" />;
}
