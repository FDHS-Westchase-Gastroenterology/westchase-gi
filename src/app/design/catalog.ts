/* The component census the gallery renders, one row per shadcn registry item
   (DESIGN.md "Component tiers"). `adoption` is the tier's standing:

   - adapted   a brand recipe exists in src/components/ui/ (the after)
   - pending   registry item with no brand adaptation yet; the bridge alone
               paints it — adopt it with a real consumer and a design pass
   - declined  fit-checked and kept out; the note names what it would regress
   - none      no product need today (the chat family)

   Slugs match the registry item name; `example` names the vendored stock
   demo in src/components/stock/examples/ when one exists. */

export type Adoption = "adapted" | "pending" | "declined" | "none";

export type Family =
  | "Actions"
  | "Forms"
  | "Data display"
  | "Navigation"
  | "Overlays"
  | "Feedback"
  | "Layout"
  | "Chat";

export interface CatalogEntry {
  readonly slug: string;
  readonly name: string;
  readonly family: Family;
  readonly adoption: Adoption;
  readonly note: string;
  readonly example?: string;
}

const NO_CONSUMER = "No consumer today; adopt with the first surface that renders it.";

export const catalog: readonly CatalogEntry[] = [
  // Actions
  {
    slug: "button",
    name: "Button",
    family: "Actions",
    adoption: "adapted",
    note: "Three decoupled axes — variant (paint), size (44px floor), motion (wgi, commit, shadcn, none). Recipe in button-variants.ts is server-safe for anchor CTAs.",
    example: "button-example",
  },
  {
    slug: "button-group",
    name: "Button Group",
    family: "Actions",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "button-group-example",
  },
  {
    slug: "toggle",
    name: "Toggle",
    family: "Actions",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "toggle-example",
  },
  {
    slug: "toggle-group",
    name: "Toggle Group",
    family: "Actions",
    adoption: "pending",
    note: "Candidate for the audit filters (recent-work-controls.tsx) and any 2–7 option set.",
    example: "toggle-group-example",
  },
  {
    slug: "kbd",
    name: "Kbd",
    family: "Actions",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "kbd-example",
  },
  // Forms
  {
    slug: "input",
    name: "Input",
    family: "Forms",
    adoption: "adapted",
    note: "The committed field recipe: white paper, 1.5px line-2 hairline, brand radius-sm, teal focus, 44px floor.",
    example: "input-example",
  },
  {
    slug: "textarea",
    name: "Textarea",
    family: "Forms",
    adoption: "adapted",
    note: "Same field recipe as Input, content-following height.",
    example: "textarea-example",
  },
  {
    slug: "native-select",
    name: "Native Select",
    family: "Forms",
    adoption: "adapted",
    note: "Patient-facing selects keep the native element — the OS picker on a phone beats a scripted listbox for this audience.",
    example: "native-select-example",
  },
  {
    slug: "field",
    name: "Field",
    family: "Forms",
    adoption: "adapted",
    note: "Every form lays out through FieldGroup + Field; labels, descriptions and errors are slots, never ad-hoc markup.",
    example: "field-example",
  },
  {
    slug: "label",
    name: "Label",
    family: "Forms",
    adoption: "adapted",
    note: "Adopted as generated; Field wears it.",
    example: "label-example",
  },
  {
    slug: "select",
    name: "Select",
    family: "Forms",
    adoption: "pending",
    note: "Portal-only candidate (staff role pickers). Patient forms stay on Native Select.",
    example: "select-example",
  },
  {
    slug: "combobox",
    name: "Combobox",
    family: "Forms",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "combobox-example",
  },
  {
    slug: "checkbox",
    name: "Checkbox",
    family: "Forms",
    adoption: "pending",
    note: "Candidate for the print chooser's scope set.",
    example: "checkbox-example",
  },
  {
    slug: "radio-group",
    name: "Radio Group",
    family: "Forms",
    adoption: "pending",
    note: "Candidate for the portal's choice lists (.portal-choice-*), which hand-roll the checked indicator today.",
    example: "radio-group-example",
  },
  {
    slug: "switch",
    name: "Switch",
    family: "Forms",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "switch-example",
  },
  {
    slug: "slider",
    name: "Slider",
    family: "Forms",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "slider-example",
  },
  {
    slug: "input-group",
    name: "Input Group",
    family: "Forms",
    adoption: "pending",
    note: "Buttons and addons inside a field belong here, never a raw Input beside a Button.",
    example: "input-group-example",
  },
  {
    slug: "input-otp",
    name: "Input OTP",
    family: "Forms",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "input-otp-example",
  },
  {
    slug: "calendar",
    name: "Calendar",
    family: "Forms",
    adoption: "pending",
    note: "portal-calendar.tsx hand-rolls a month grid with roving focus and a month-turn animation; a react-day-picker adoption would inherit both and must keep the day-pick settle.",
    example: "calendar-example",
  },
  // Data display
  {
    slug: "badge",
    name: "Badge",
    family: "Data display",
    adoption: "adapted",
    note: "The stamp. `variant` is required and named for meaning (attention, current, settled, quiet) so the color law is executable; stamps do not animate.",
    example: "badge-example",
  },
  {
    slug: "card",
    name: "Card",
    family: "Data display",
    adoption: "adapted",
    note: "Adopted as generated; the brand card surfaces (.card, .card-lined) still live in global CSS and are the next extraction.",
    example: "card-example",
  },
  {
    slug: "table",
    name: "Table",
    family: "Data display",
    adoption: "adapted",
    note: "The audit recipe: hairline rows, tracked uppercase heads, px-5 rhythm. Consumers own their scroll region.",
    example: "table-example",
  },
  {
    slug: "item",
    name: "Item",
    family: "Data display",
    adoption: "adapted",
    note: "Adopted as generated; the Home sheet's rows compose it.",
    example: "item-example",
  },
  {
    slug: "avatar",
    name: "Avatar",
    family: "Data display",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "avatar-example",
  },
  {
    slug: "empty",
    name: "Empty",
    family: "Data display",
    adoption: "pending",
    note: "Candidate for .portal-empty-state and .portal-queue-empty.",
    example: "empty-example",
  },
  {
    slug: "skeleton",
    name: "Skeleton",
    family: "Data display",
    adoption: "declined",
    note: "The authored skeletons (portal-loading, portal-modal-skeleton) are structured shapes with one sweep; a generic pulse would be a recipe downgrade.",
    example: "skeleton-example",
  },
  {
    slug: "spinner",
    name: "Spinner",
    family: "Data display",
    adoption: "pending",
    note: "Pending buttons compose Spinner + data-icon + disabled; there is no isLoading prop.",
    example: "spinner-example",
  },
  {
    slug: "progress",
    name: "Progress",
    family: "Data display",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "progress-example",
  },
  {
    slug: "chart",
    name: "Chart",
    family: "Data display",
    adoption: "pending",
    note: "The bridge maps chart-1…5 onto navy, teal, amber-deep, teal-ink, ink. Aggregate, PHI-free evidence only (PRODUCT.md).",
    example: "chart-example",
  },
  {
    slug: "aspect-ratio",
    name: "Aspect Ratio",
    family: "Data display",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "aspect-ratio-example",
  },
  {
    slug: "separator",
    name: "Separator",
    family: "Data display",
    adoption: "adapted",
    note: "Adopted as generated; the hairline is --color-line through the bridge.",
    example: "separator-example",
  },
  // Navigation
  {
    slug: "breadcrumb",
    name: "Breadcrumb",
    family: "Navigation",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "breadcrumb-example",
  },
  {
    slug: "navigation-menu",
    name: "Navigation Menu",
    family: "Navigation",
    adoption: "pending",
    note: "The patient Header hand-rolls its menu; a candidate once the patient site re-charters.",
    example: "navigation-menu-example",
  },
  {
    slug: "sidebar",
    name: "Sidebar",
    family: "Navigation",
    adoption: "pending",
    note: "The portal task index (.portal-sidebar-*, .portal-nav-*) is hand-rolled; the bridge already maps the sidebar tokens onto navy.",
    example: "sidebar-example",
  },
  {
    slug: "tabs",
    name: "Tabs",
    family: "Navigation",
    adoption: "pending",
    note: "In-page panel switching only. Route navigation (SettingsTabs, the queue filters) keeps nav + aria-current link semantics.",
    example: "tabs-example",
  },
  {
    slug: "pagination",
    name: "Pagination",
    family: "Navigation",
    adoption: "pending",
    note: "Candidate for the queue and audit pagers.",
    example: "pagination-example",
  },
  {
    slug: "menubar",
    name: "Menubar",
    family: "Navigation",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "menubar-example",
  },
  {
    slug: "command",
    name: "Command",
    family: "Navigation",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "command-example",
  },
  // Overlays
  {
    slug: "dialog",
    name: "Dialog",
    family: "Overlays",
    adoption: "declined",
    note: "PortalModal keeps the native <dialog> top layer: overlay/display transitions, ::backdrop, origin-aware growth, nesting. A portalled Dialog cannot transition the overlay property.",
    example: "dialog-example",
  },
  {
    slug: "alert-dialog",
    name: "Alert Dialog",
    family: "Overlays",
    adoption: "declined",
    note: "Same finding as Dialog; the portal's confirmations ride PortalModal.",
    example: "alert-dialog-example",
  },
  {
    slug: "sheet",
    name: "Sheet",
    family: "Overlays",
    adoption: "pending",
    note: "Candidate for the patient Header's mobile menu drawer.",
    example: "sheet-example",
  },
  {
    slug: "drawer",
    name: "Drawer",
    family: "Overlays",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "drawer-example",
  },
  {
    slug: "popover",
    name: "Popover",
    family: "Overlays",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "popover-example",
  },
  {
    slug: "hover-card",
    name: "Hover Card",
    family: "Overlays",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "hover-card-example",
  },
  {
    slug: "tooltip",
    name: "Tooltip",
    family: "Overlays",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "tooltip-example",
  },
  {
    slug: "dropdown-menu",
    name: "Dropdown Menu",
    family: "Overlays",
    adoption: "pending",
    note: "Candidate for the portal account menu, a native <details> today.",
    example: "dropdown-menu-example",
  },
  {
    slug: "context-menu",
    name: "Context Menu",
    family: "Overlays",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "context-menu-example",
  },
  // Feedback
  {
    slug: "alert",
    name: "Alert",
    family: "Feedback",
    adoption: "pending",
    note: "Callouts use Alert; candidate for the notice banner and the request-form alerts.",
    example: "alert-example",
  },
  {
    slug: "toast",
    name: "Toast",
    family: "Feedback",
    adoption: "pending",
    note: "portal-feedback.tsx is a static status line — one message per page, moved into focus — which is a deliberate stance, not a gap. Toast is for the patient site if ever.",
    example: "toast-example",
  },
  {
    slug: "sonner",
    name: "Sonner",
    family: "Feedback",
    adoption: "declined",
    note: "Radix-era toaster; Base UI projects use Toast. Vendored for completeness only.",
    example: "sonner-example",
  },
  // Layout
  {
    slug: "accordion",
    name: "Accordion",
    family: "Layout",
    adoption: "pending",
    note: "Candidate for the release briefing sections.",
    example: "accordion-example",
  },
  {
    slug: "collapsible",
    name: "Collapsible",
    family: "Layout",
    adoption: "pending",
    note: "The Home sheet's unfolding bands (.portal-line-reveal) hand-roll this with grid-template-rows.",
    example: "collapsible-example",
  },
  {
    slug: "scroll-area",
    name: "Scroll Area",
    family: "Layout",
    adoption: "declined",
    note: "Windowed groups keep the platform scrollbar and overscroll-behavior: contain — scroll has mass, not decoration.",
    example: "scroll-area-example",
  },
  {
    slug: "resizable",
    name: "Resizable",
    family: "Layout",
    adoption: "pending",
    note: NO_CONSUMER,
    example: "resizable-example",
  },
  {
    slug: "carousel",
    name: "Carousel",
    family: "Layout",
    adoption: "declined",
    note: "The hero is static (practice decision 2026-07-07). The testimonial rail is a scroll-snap row, not a carousel.",
    example: "carousel-example",
  },
  {
    slug: "direction",
    name: "Direction",
    family: "Layout",
    adoption: "pending",
    note: "The RTL provider for Base UI parts. Arabic is a first-class locale, so any adopted overlay or menu must render inside it.",
  },
  // Chat
  {
    slug: "attachment",
    name: "Attachment",
    family: "Chat",
    adoption: "none",
    note: "Chat family; the practice's differentiator is a staffed human line, never a bot.",
    example: "attachment-example",
  },
  {
    slug: "bubble",
    name: "Bubble",
    family: "Chat",
    adoption: "none",
    note: "Chat family. Its registry example needs the Vercel AI SDK and is not vendored.",
  },
  {
    slug: "marker",
    name: "Marker",
    family: "Chat",
    adoption: "none",
    note: "Chat family. Its registry example needs the Vercel AI SDK and is not vendored.",
  },
  {
    slug: "message",
    name: "Message",
    family: "Chat",
    adoption: "none",
    note: "Chat family. Its registry example needs the Vercel AI SDK and is not vendored.",
  },
  {
    slug: "message-scroller",
    name: "Message Scroller",
    family: "Chat",
    adoption: "none",
    note: "Chat family. Its registry example needs the Vercel AI SDK and is not vendored.",
  },
  {
    slug: "questionnaire",
    name: "Questionnaire",
    family: "Chat",
    adoption: "none",
    note: "Chat family. Its registry example needs the Vercel AI SDK and is not vendored.",
  },
];

export const families: readonly Family[] = [
  "Actions",
  "Forms",
  "Data display",
  "Navigation",
  "Overlays",
  "Feedback",
  "Layout",
  "Chat",
];

export const adoptionLabel = {
  adapted: "Brand-adapted",
  pending: "Stock through the bridge",
  declined: "Fit-checked, kept out",
  none: "No product need",
} satisfies Record<Adoption, string>;

export function findEntry(slug: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.slug === slug);
}
