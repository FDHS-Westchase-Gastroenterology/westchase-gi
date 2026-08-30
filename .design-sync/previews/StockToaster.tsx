/* Toaster is the viewport that renders queued toasts — it paints nothing until
   one is added, so a bare mount screenshots empty.

   Toasts must be queued AFTER the manager is subscribed, which happens on
   mount; adding at module scope is dropped. The effect below queues real office
   copy on mount, which is the honest way to see the mounted state in a still
   frame. `timeout={0}` keeps them from auto-dismissing before the capture. */

import * as React from "react";
import { StockToaster as Toaster, stockCreateToastManager } from "westchase-gi";

const manager = stockCreateToastManager();

export function Mounted() {
  React.useEffect(() => {
    manager.add({
      title: "Request sent",
      description: "The office will call you within one business day.",
    });
    manager.add({
      title: "Prep instructions texted",
      description: "Sent to (813) 555-0142.",
    });
  }, []);

  return (
    /* Toaster PORTALS to document.body, so no wrapper — not even a transformed
       containing block — can pull it back into a grid cell. cfg.overrides gives
       it cardMode:"single" instead, which is the supported answer for
       fixed/portal content. */
    <div className="relative min-h-64 w-full max-w-md">
      <Toaster toastManager={manager} timeout={0} />
    </div>
  );
}
