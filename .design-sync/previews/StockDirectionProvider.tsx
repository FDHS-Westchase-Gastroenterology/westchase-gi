/* DirectionProvider sets the reading direction for every Base UI component
   beneath it. It renders no markup of its own, so the card shows the effect:
   the same content in ltr and rtl. The practice serves Arabic, so this is a
   real concern here, not a demo curiosity. */

import {
  StockDirectionProvider as DirectionProvider,
  StockButton as Button,
  StockInputGroup as InputGroup,
  StockInputGroupAddon as InputGroupAddon,
  StockInputGroupInput as InputGroupInput,
} from "westchase-gi";

export function LeftToRight() {
  return (
    <DirectionProvider direction="ltr">
      <div dir="ltr" className="flex w-full max-w-sm items-center gap-2">
        <InputGroup>
          <InputGroupInput placeholder="Search" />
          <InputGroupAddon align="inline-end">
            <Button size="sm">Go</Button>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </DirectionProvider>
  );
}

export function RightToLeft() {
  return (
    <DirectionProvider direction="rtl">
      <div dir="rtl" className="flex w-full max-w-sm items-center gap-2">
        <InputGroup>
          <InputGroupInput placeholder="بحث" />
          <InputGroupAddon align="inline-end">
            <Button size="sm">تم</Button>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </DirectionProvider>
  );
}
