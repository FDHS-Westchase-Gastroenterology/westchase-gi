"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { showModalWithInitialFocus } from "@/app/admin/(portal)/settings/open-dialog";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Check } from "@/components/icons";
import { TypeIcon } from "@/components/patterns/type-icon";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { APPOINTMENT_TYPE_ICONS } from "@/lib/portal/scheduling/contracts";
import type { AppointmentTypeIcon } from "@/lib/portal/scheduling/contracts";
import type { SettingsProvider, SettingsType } from "@/lib/portal/scheduling/settings-contracts";

/* Add or edit an appointment type (issue #352, Figma St3). The header's Add
   type and a row's ••• menu open this modal through the address (?add=1,
   ?type=<id>&field=name|details), so Back closes it. A type is its name,
   icon, length, a line on what it is for, and the providers who see it when
   booking. Buffers are kept as they are; a new type starts with none. */

export type EditorField = "name" | "details";

const LENGTHS = [10, 15, 20, 30, 40, 45, 60, 75, 90, 120] as const;

const ICON_NAMES = {
  "user-plus": "New patient",
  history: "History",
  stethoscope: "Stethoscope",
  "clipboard-check": "Clipboard",
  syringe: "Syringe",
  droplet: "Droplet",
  microscope: "Microscope",
  pill: "Pill",
  activity: "Activity",
  "file-text": "Document",
} as const satisfies Record<AppointmentTypeIcon, string>;

function isIcon(value: string | undefined): value is AppointmentTypeIcon {
  return APPOINTMENT_TYPE_ICONS.some((icon) => icon === value);
}

function keepFocusInDialog(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    ),
  );
  const first = controls.at(0);
  const last = controls.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function TypeEditorDialog({
  type,
  field,
  providers,
  send,
}: Readonly<{
  type: SettingsType | null;
  field: EditorField;
  providers: readonly SettingsProvider[];
  send: SettingsSend;
}>) {
  const router = useRouter();
  const [name, setName] = useState(() => type?.name ?? "");
  const [icon, setIcon] = useState<AppointmentTypeIcon>(() => type?.icon ?? "stethoscope");
  const [length, setLength] = useState(() => type?.durationMinutes ?? 30);
  const [description, setDescription] = useState(() => type?.description ?? "");
  const [providerIds, setProviderIds] = useState<readonly string[]>(
    () =>
      type?.providerIds ??
      providers.flatMap((provider) => (provider.bookable ? [provider.id] : [])),
  );
  const [pending, setPending] = useState(false);
  const lengths = LENGTHS.some((minutes) => minutes === length)
    ? LENGTHS
    : [...LENGTHS, length].toSorted((a, b) => a - b);
  const valid = name.trim() !== "";
  const title = type === null ? "Add type" : `Edit ${type.name}`;

  function leave() {
    const address = new URL(window.location.href);
    for (const key of ["add", "type", "field"]) address.searchParams.delete(key);
    router.replace(`${address.pathname}${address.search}`, { scroll: false });
  }

  async function save() {
    if (!valid) return;
    setPending(true);
    const values = {
      name: name.trim(),
      durationMinutes: length,
      icon,
      description: description.trim() === "" ? null : description.trim(),
      providerIds,
    };
    try {
      const outcome =
        type === null
          ? await send({
              kind: "save_appointment_type",
              id: null,
              expectedVersion: null,
              bufferBeforeMinutes: 0,
              bufferAfterMinutes: 0,
              ...values,
            })
          : await send(
              {
                kind: "save_appointment_type",
                id: type.id,
                expectedVersion: type.version,
                bufferBeforeMinutes: type.bufferBeforeMinutes,
                bufferAfterMinutes: type.bufferAfterMinutes,
                ...values,
              },
              {
                undo: {
                  headline: `${values.name} saved`,
                  detail: null,
                  inverse: {
                    kind: "save_appointment_type",
                    id: type.id,
                    expectedVersion: type.version,
                    name: type.name,
                    durationMinutes: type.durationMinutes,
                    bufferBeforeMinutes: type.bufferBeforeMinutes,
                    bufferAfterMinutes: type.bufferAfterMinutes,
                    icon: type.icon,
                    description: type.description,
                    providerIds: type.providerIds,
                  },
                  slot: `type:${type.id}`,
                },
              },
            );
      if (outcome.ok) leave();
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={(dialog) => {
        if (dialog !== null && !dialog.open) showModalWithInitialFocus(dialog);
      }}
      aria-modal="true"
      aria-labelledby="type-editor-title"
      data-testid="type-editor-dialog"
      className="portal-confirm-dialog settings-type-editor"
      onKeyDown={keepFocusInDialog}
      onClickCapture={(event) => {
        event.currentTarget.toggleAttribute("data-instant", event.detail === 0);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.currentTarget.toggleAttribute("data-instant", true);
        if (!pending) leave();
      }}
    >
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="portal-confirm-dialog-body">
          <div className="portal-confirm-dialog-heading">
            <h2 id="type-editor-title" className="portal-confirm-dialog-title">
              {title}
            </h2>
            <button
              type="button"
              disabled={pending}
              className="portal-confirm-dialog-close"
              onClick={leave}
            >
              Close
            </button>
          </div>
          <FieldGroup className="wgi-settings">
            <Field>
              <FieldLabel htmlFor="type-name-input">Name</FieldLabel>
              <Input
                id="type-name-input"
                data-initial-focus={field === "name" || undefined}
                required
                maxLength={120}
                autoComplete="off"
                placeholder="Procedure consult"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </Field>
            <Field>
              <FieldLabel id="type-icon-label">Icon</FieldLabel>
              <ToggleGroup
                value={[icon]}
                aria-labelledby="type-icon-label"
                className="flex-wrap gap-1.5"
                onValueChange={(next: readonly string[]) => {
                  const [chosen] = next;
                  if (isIcon(chosen)) setIcon(chosen);
                }}
              >
                {APPOINTMENT_TYPE_ICONS.map((choice) => (
                  <ToggleGroupItem
                    key={choice}
                    value={choice}
                    aria-label={ICON_NAMES[choice]}
                    className="settings-icon-choice"
                  >
                    <TypeIcon icon={choice} className="size-[1.125rem]" />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="type-length-input">Length</FieldLabel>
              <NativeSelect
                id="type-length-input"
                data-initial-focus={field === "details" || undefined}
                value={String(length)}
                onChange={(event) => {
                  setLength(Number(event.target.value));
                }}
              >
                {lengths.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min
                  </option>
                ))}
              </NativeSelect>
              <FieldDescription>How much of the day a booking of this type takes.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="type-description-input">What it is for</FieldLabel>
              <Textarea
                id="type-description-input"
                maxLength={200}
                rows={2}
                placeholder="Before a colonoscopy or upper endoscopy."
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
              />
            </Field>
            <Field>
              <FieldLabel id="type-providers-label">Seen by</FieldLabel>
              <ToggleGroup
                multiple
                value={[...providerIds]}
                aria-labelledby="type-providers-label"
                className="flex-wrap"
                onValueChange={(next: readonly string[]) => {
                  setProviderIds(next);
                }}
              >
                {providers.map((provider) => (
                  <ToggleGroupItem
                    key={provider.id}
                    value={provider.id}
                    className="settings-type-pill"
                  >
                    <Check aria-hidden="true" className="settings-type-pill-check size-3.5" />
                    {provider.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>Only these providers can be booked for it.</FieldDescription>
            </Field>
          </FieldGroup>
        </div>
        <div className="portal-confirm-dialog-actions">
          <Button type="button" variant="outline" disabled={pending} onClick={leave}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || pending}>
            {pending ? "Saving…" : type === null ? "Add type" : "Save"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
