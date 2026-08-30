/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/navigation-menu-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: NavigationMenuBasic */

"use client"

import * as React from "react"
import Link from "next/link"


import { StockNavigationMenu as NavigationMenu, StockNavigationMenuContent as NavigationMenuContent, StockNavigationMenuItem as NavigationMenuItem, StockNavigationMenuLink as NavigationMenuLink, StockNavigationMenuList as NavigationMenuList, StockNavigationMenuTrigger as NavigationMenuTrigger, stockNavigationMenuTriggerStyle as navigationMenuTriggerStyle } from "westchase-gi";
import { CircleAlertIcon } from "lucide-react"

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Alert Dialog",
    href: "/docs/primitives/alert-dialog",
    description:
      "A modal dialog that interrupts the user with important content and expects a response.",
  },
  {
    title: "Hover Card",
    href: "/docs/primitives/hover-card",
    description:
      "For sighted users to preview content available behind a link.",
  },
  {
    title: "Progress",
    href: "/docs/primitives/progress",
    description:
      "Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.",
  },
  {
    title: "Scroll-area",
    href: "/docs/primitives/scroll-area",
    description: "Visually or semantically separates content.",
  },
  {
    title: "Tabs",
    href: "/docs/primitives/tabs",
    description:
      "A set of layered sections of content—known as tab panels—that are displayed one at a time.",
  },
  {
    title: "Tooltip",
    href: "/docs/primitives/tooltip",
    description:
      "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
  },
]


export function NavigationMenuBasic() {
  return (
    <Example title="Basic">
      <NavigationMenu defaultOpen>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="w-96">
                <ListItem href="/docs" title="Introduction">
                  Re-usable components built with Tailwind CSS.
                </ListItem>
                <ListItem href="/docs/installation" title="Installation">
                  How to install dependencies and structure your app.
                </ListItem>
                <ListItem href="/docs/primitives/typography" title="Typography">
                  Styles for headings, paragraphs, lists...etc
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Components</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                {components.map((component) => (
                  <ListItem
                    key={component.title}
                    title={component.title}
                    href={component.href}
                  >
                    {component.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>With Icon</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[200px]">
                <li>
                  <NavigationMenuLink
                    render={
                      <Link href="#" className="flex-row items-center gap-2" />
                    }
                  >
                    <CircleAlertIcon
                    />
                    Backlog
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    render={
                      <Link href="#" className="flex-row items-center gap-2" />
                    }
                  >
                    <CircleAlertIcon
                    />
                    To Do
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    render={
                      <Link href="#" className="flex-row items-center gap-2" />
                    }
                  >
                    <CircleAlertIcon
                    />
                    Done
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              render={<Link href="/docs" />}
              className={navigationMenuTriggerStyle()}
            >
              Documentation
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </Example>
  )
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink render={<Link href={href} />}>
        <div className="flex flex-col gap-1 style-vega:text-sm style-nova:text-sm style-lyra:text-xs style-maia:text-sm style-mira:text-xs style-luma:text-sm">
          <div className="leading-none font-medium">{title}</div>
          <div className="line-clamp-2 text-muted-foreground">{children}</div>
        </div>
      </NavigationMenuLink>
    </li>
  )
}

/* Local stand-in for the registry demo frame (src/components/stock/examples/
   example.tsx), which is gallery-only code. Same slots, no dependencies. */
function Example({ title, children, className = "" }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      {title ? (
        <div className="px-1.5 py-2 text-xs font-medium text-muted-foreground">{title}</div>
      ) : null}
      <div className={"flex min-w-0 flex-col items-start gap-6 rounded-xl bg-card p-6 text-foreground " + className}>
        {children}
      </div>
    </div>
  );
}
