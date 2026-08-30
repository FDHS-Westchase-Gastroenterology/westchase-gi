import { ChevronRightIcon, PhoneIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";

import { Example, ExampleWrapper } from "./example";

/* Item is adopted as generated; the Home sheet composes its rows from it.
   Fictional patients. */

export default function BrandItemExample() {
  return (
    <ExampleWrapper className="lg:grid-cols-1">
      <Example title="A group of lines">
        <ItemGroup className="gap-0">
          <Item variant="outline">
            <ItemMedia variant="icon">
              <PhoneIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Maria Alvarez</ItemTitle>
              <ItemDescription>Prefers a morning call · (813) 555-0142</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Badge variant="attention">New</Badge>
              <Button variant="outline" size="sm">
                Record
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </ItemActions>
          </Item>
          <ItemSeparator />
          <Item variant="outline">
            <ItemMedia variant="icon">
              <PhoneIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Daniel Nguyen</ItemTitle>
              <ItemDescription>Call again Tuesday · (813) 555-0187</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Badge variant="current">Contacted</Badge>
            </ItemActions>
          </Item>
        </ItemGroup>
      </Example>
      <Example title="Sizes and variants">
        <ItemGroup>
          <Item variant="muted" size="sm">
            <ItemContent>
              <ItemTitle>Muted, small</ItemTitle>
            </ItemContent>
          </Item>
          <Item size="xs">
            <ItemContent>
              <ItemTitle>Default, extra small</ItemTitle>
            </ItemContent>
          </Item>
        </ItemGroup>
      </Example>
    </ExampleWrapper>
  );
}
