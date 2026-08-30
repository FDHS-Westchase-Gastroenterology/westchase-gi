/* The registry's chat Bubble. No vendored demo exists — MANIFEST.json excludes
   the chat-family examples because upstream's versions need the Vercel AI SDK,
   so this composition is written from the component's own API.

   NB: every bubbleVariants class targets `*:data-[slot=bubble-content]`, so the
   paint lands on a BubbleContent CHILD — a bare text child renders unstyled. */

import {
  StockBubble as Bubble,
  StockBubbleContent as BubbleContent,
  StockBubbleGroup as BubbleGroup,
} from "westchase-gi";

export function Conversation() {
  return (
    <BubbleGroup className="w-full max-w-md">
      <Bubble align="start" variant="muted">
        <BubbleContent>Hi — I need to reschedule my colonoscopy for next week.</BubbleContent>
      </Bubble>
      <Bubble align="end">
        <BubbleContent>Happy to help. Is Tuesday morning at the Westchase office workable?</BubbleContent>
      </Bubble>
      <Bubble align="start" variant="muted">
        <BubbleContent>Tuesday works. Thank you!</BubbleContent>
      </Bubble>
    </BubbleGroup>
  );
}

export function Variants() {
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <Bubble variant="default"><BubbleContent>default</BubbleContent></Bubble>
      <Bubble variant="secondary"><BubbleContent>secondary</BubbleContent></Bubble>
      <Bubble variant="outline"><BubbleContent>outline</BubbleContent></Bubble>
      <Bubble variant="muted"><BubbleContent>muted</BubbleContent></Bubble>
      <Bubble variant="tinted"><BubbleContent>tinted</BubbleContent></Bubble>
      <Bubble variant="ghost"><BubbleContent>ghost</BubbleContent></Bubble>
      <Bubble variant="destructive"><BubbleContent>destructive</BubbleContent></Bubble>
    </div>
  );
}
