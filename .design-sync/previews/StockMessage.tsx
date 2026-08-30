/* The registry's chat Message. No vendored demo (the chat examples need the
   Vercel AI SDK and are excluded from the stock tier), so this is composed from
   the components' own APIs.

   NB: Message, MessageContent and MessageAvatar are LAYOUT primitives — they
   carry no surface of their own. The registry pairs them with Bubble, which is
   what paints the message. A MessageContent holding bare text renders as
   unstyled prose. */

import {
  StockAvatar as Avatar,
  StockAvatarFallback as AvatarFallback,
  StockBubble as Bubble,
  StockBubbleContent as BubbleContent,
  StockMessage as Message,
  StockMessageAvatar as MessageAvatar,
  StockMessageContent as MessageContent,
  StockMessageFooter as MessageFooter,
  StockMessageGroup as MessageGroup,
  StockMessageHeader as MessageHeader,
} from "westchase-gi";

export function Thread() {
  return (
    <MessageGroup className="w-full max-w-lg gap-4">
      <Message align="start">
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>FD</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>Front desk</MessageHeader>
          <Bubble variant="muted">
            <BubbleContent>
              Your prep instructions are ready — would you like them by text?
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>

      <Message align="end">
        <MessageContent>
          <Bubble align="end">
            <BubbleContent>Yes please, to this number.</BubbleContent>
          </Bubble>
          <MessageFooter>Delivered 9:14 am</MessageFooter>
        </MessageContent>
      </Message>
    </MessageGroup>
  );
}
