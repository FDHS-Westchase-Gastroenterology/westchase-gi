/* ResizableHandle is the separator between two Panels — it has no standalone
   render, so it is previewed inside a ResizablePanelGroup. */

import {
  StockResizableHandle as ResizableHandle,
  StockResizablePanel as ResizablePanel,
  StockResizablePanelGroup as ResizablePanelGroup,
} from "westchase-gi";

export function WithHandle() {
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-48 w-full max-w-md rounded-lg border"
    >
      <ResizablePanel defaultSize={55}>
        <div className="flex h-full items-center justify-center p-6 text-sm">Request queue</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={45}>
        <div className="flex h-full items-center justify-center p-6 text-sm">Detail</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export function Plain() {
  return (
    <ResizablePanelGroup
      direction="vertical"
      className="h-48 w-full max-w-md rounded-lg border"
    >
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-6 text-sm">Notes</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-6 text-sm">Audit trail</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
