"use client"

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"

import { useContext, useMemo, useRef } from "react"

import { AccordionMotionContext, AccordionSpringPanel } from "./accordion/motion"

import { cn } from "cn"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI props include React refs and DOM event types; the wrapper does not mutate them.
function Accordion({ className, keepMounted = false, hiddenUntilFound = false, onValueChange, ...props }: Readonly<AccordionPrimitive.Root.Props>) {
  const activation = useRef({ sequence: 0, instant: true });
  const context = useMemo(() => ({ keepMounted, hiddenUntilFound, activation }), [keepMounted, hiddenUntilFound]);
  return (
    <AccordionMotionContext value={context}>
    <AccordionPrimitive.Root
      data-slot="accordion"
      onValueChange={(value, details) => {
        const event = details.event;
        activation.current = { sequence: activation.current.sequence + 1, instant: !(event instanceof MouseEvent && event.detail > 0) };
        onValueChange?.(value, details);
        if (details.isCanceled) activation.current.instant = true;
      }}
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
    </AccordionMotionContext>
  )
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI props include React refs and DOM event types; the wrapper does not mutate them.
function AccordionItem({ className, ...props }: Readonly<AccordionPrimitive.Item.Props>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b", className)}
      {...props}
    />
  )
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI props include React refs and DOM event types; the wrapper does not mutate them.
function AccordionTrigger({
  className,
  children,
  ...props
}: Readonly<AccordionPrimitive.Trigger.Props>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-[color,box-shadow] duration-150 outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon data-slot="accordion-trigger-icon" className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden" />
        <ChevronUpIcon data-slot="accordion-trigger-icon" className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI props include React refs and DOM event types; the wrapper does not mutate them.
function AccordionContent({
  className,
  children,
  render,
  keepMounted,
  hiddenUntilFound,
  ...props
}: Readonly<AccordionPrimitive.Panel.Props>) {
  const context = useContext(AccordionMotionContext);
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden text-sm"
      {...props}
      keepMounted
      hiddenUntilFound={false}
      render={(elementProps, state) => (
        <AccordionSpringPanel
          elementProps={elementProps}
          state={state}
          render={render}
          keepMounted={keepMounted ?? context.keepMounted}
          hiddenUntilFound={hiddenUntilFound ?? context.hiddenUntilFound}
        />
      )}
    >
      <div
        className={cn(
          "pt-0 pb-2.5 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
