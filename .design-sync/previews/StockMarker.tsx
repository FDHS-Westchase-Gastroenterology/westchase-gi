/* The registry's Marker (timeline/annotation rule). No vendored demo; composed
   from the component's own API. */

import {
  StockMarker as Marker,
  StockMarkerContent as MarkerContent,
  StockMarkerIcon as MarkerIcon,
} from "westchase-gi";
import { CheckIcon } from "lucide-react";

export function Variants() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Marker variant="default">
        <MarkerIcon>
          <CheckIcon />
        </MarkerIcon>
        <MarkerContent>Prep instructions sent</MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>Today</MarkerContent>
      </Marker>
      <Marker variant="border">
        <MarkerContent>Appointment confirmed</MarkerContent>
      </Marker>
    </div>
  );
}
