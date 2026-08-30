/* MessageScroller keeps a conversation pinned to the newest message and offers
   a jump-to-latest button. No vendored demo (chat family), so this composes it
   with real Bubbles.

   NB: Bubble paints its BubbleContent child, not itself — bare text renders
   unstyled. */

import {
  StockBubble as Bubble,
  StockBubbleContent as BubbleContent,
  StockMessageScroller as MessageScroller,
  StockMessageScrollerContent as MessageScrollerContent,
  StockMessageScrollerProvider as MessageScrollerProvider,
  StockMessageScrollerViewport as MessageScrollerViewport,
} from "westchase-gi";

const turns = [
  ["start", "Hi — is the Lutz office open on Fridays?"],
  ["end", "Yes, Monday through Friday, 8:00 am to 4:30 pm."],
  ["start", "Great. Can I get a prep sheet for a Sutab prep?"],
  ["end", "Sending it to this number now."],
];

export function PinnedToLatest() {
  return (
    <MessageScrollerProvider>
      <MessageScroller className="h-56 w-full max-w-md">
        <MessageScrollerViewport>
          <MessageScrollerContent className="flex flex-col gap-2 p-2">
            {turns.map(([align, text]) => (
              <Bubble key={text} align={align} variant={align === "start" ? "muted" : "default"}>
                <BubbleContent>{text}</BubbleContent>
              </Bubble>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
