/* Ported from src/app/design/brand/item.tsx. Fictional patients. */

import {
  Badge,
  Button,
  ChevronRight,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
  Phone,
} from "westchase-gi";

export function AGroupOfLines() {
  return (
    <ItemGroup className="w-full max-w-2xl gap-0">
      <Item variant="outline">
        <ItemMedia variant="icon">
          <Phone />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Maria Alvarez</ItemTitle>
          <ItemDescription>Prefers a morning call · (813) 555-0142</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Badge variant="attention">New</Badge>
          <Button variant="outline" size="sm">
            Record
            <ChevronRight data-icon="inline-end" />
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemMedia variant="icon">
          <Phone />
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
  );
}

export function SizesAndVariants() {
  return (
    <ItemGroup className="w-full max-w-2xl">
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
  );
}
