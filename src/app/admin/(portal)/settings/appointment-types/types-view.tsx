"use client";

import { cn } from "cn";
import { Reorder, useDragControls, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { RefObject } from "react";

import { initialsOf } from "@/app/admin/(portal)/schedule/week-calendar";
import { BookingIntervalBand } from "@/app/admin/(portal)/settings/appointment-types/booking-interval";
import { DeleteTypeDialog } from "@/app/admin/(portal)/settings/appointment-types/delete-type-dialog";
import { TypeEditorDialog } from "@/app/admin/(portal)/settings/appointment-types/type-editor-dialog";
import type { EditorField } from "@/app/admin/(portal)/settings/appointment-types/type-editor-dialog";
import { shortName } from "@/app/admin/(portal)/settings/settings-model";
import { useSettingsCommand } from "@/app/admin/(portal)/settings/use-settings-command";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Ellipsis, GripVertical } from "@/components/icons";
import { TypeIcon } from "@/components/patterns/type-icon";
import { Menu, MenuContent, MenuGroup, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { base } from "@/lib/motion";
import type {
  SchedulingSettings,
  SettingsProvider,
  SettingsType,
} from "@/lib/portal/scheduling/settings-contracts";

/* Appointment types (issue #352, Figma St3): the types staff choose from
   when booking, in the order the booking form lists them. A row's grip
   reorders it, by drag or from the keyboard (Space picks it up, the arrows
   move it, Space drops it, Escape puts it back); the switch turns a type off
   for new bookings while the appointments already made keep it; the •••
   menu renames, edits or deletes. Every change applies as it is made and
   confirms in the Undo toast. Staff read the list; admins change it. */

const AVATAR_CAP = 4;

function ordinal(position: number): string {
  const tens = position % 100;
  if (tens >= 11 && tens <= 13) return `${String(position)}th`;
  const suffix = ["th", "st", "nd", "rd"][position % 10] ?? "th";
  return `${String(position)}${suffix}`;
}

function placeIn(order: readonly string[], id: string): string {
  return `${ordinal(order.indexOf(id) + 1)} of ${String(order.length)}`;
}

/** "All providers", "Dr. Chang, Dr. Awad", or "No one yet". */
/** Who sees a type: "All providers", "Dr. Chang, Dr. Awad", or past two names
    "Dr. Chang, Dr. Awad +2" on screen with every name for a screen reader. */
function seenByLine(seenBy: readonly SettingsProvider[], providers: readonly SettingsProvider[]) {
  if (seenBy.length === 0) return { shown: "No one yet", spoken: null };
  const seen = new Set(seenBy.map((provider) => provider.id));
  const bookable = providers.filter((provider) => provider.bookable);
  if (bookable.length > 1 && bookable.every((provider) => seen.has(provider.id)))
    return { shown: "All providers", spoken: null };
  const names = seenBy.map((provider) => shortName(provider.name));
  if (names.length <= 2) return { shown: names.join(", "), spoken: null };
  return {
    shown: `${names.slice(0, 2).join(", ")} +${String(names.length - 2)}`,
    spoken: names.join(", "),
  };
}

interface Lifted {
  readonly id: string;
  /** The order when the row was picked up, which Escape restores. */
  readonly from: readonly string[];
  readonly by: "pointer" | "keyboard";
}

export function TypesView({
  settings,
  editing,
}: Readonly<{
  settings: SchedulingSettings;
  editing: { readonly typeId: string | null; readonly field: EditorField } | null;
}>) {
  const send = useSettingsCommand();
  const reducedMotion = useReducedMotion() === true;
  const { types, providers, canEdit } = settings;
  const serverKey = types.map((type) => type.id).join(",");
  /* The order on screen: the server's until a row moves, then the moved
     order until the server's next read lands. */
  const [order, setOrder] = useState<readonly string[]>(() => types.map((type) => type.id));
  const [seenKey, setSeenKey] = useState(serverKey);
  const [lifted, setLifted] = useState<Lifted | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [deleting, setDeleting] = useState<SettingsType | null>(null);
  const [grips] = useState(() => new Map<string, HTMLButtonElement>());
  const groupRef = useRef<HTMLUListElement>(null);
  if (seenKey !== serverKey) {
    setSeenKey(serverKey);
    setOrder(types.map((type) => type.id));
  }
  const byId = new Map(types.map((type) => [type.id, type]));
  const shown = order.flatMap((id) => {
    const type = byId.get(id);
    return type === undefined ? [] : [type];
  });
  const editingType =
    editing?.typeId === null || editing === null ? undefined : byId.get(editing.typeId);

  function nameOf(id: string) {
    return byId.get(id)?.name ?? "That type";
  }

  function commitMove(id: string, from: readonly string[], to: readonly string[]) {
    const before = from.indexOf(id);
    const after = to.indexOf(id);
    const type = byId.get(id);
    if (type === undefined || before === after) return;
    const command = {
      kind: "reorder_appointment_types",
      id,
      expectedVersion: type.version,
    } as const;
    void send(
      { ...command, position: after + 1 },
      {
        undo: {
          headline: `${type.name} moved`,
          detail: `${placeIn(to, id)} when booking.`,
          inverse: { ...command, position: before + 1 },
          slot: `order:${id}`,
        },
      },
    ).then((outcome) => {
      if (!outcome.ok) setOrder(types.map((each) => each.id));
    });
  }

  function refocus(id: string) {
    /* Moving a row moves its element, which drops focus in some browsers. */
    requestAnimationFrame(() => {
      grips.get(id)?.focus();
    });
  }

  function pickUp(id: string) {
    setLifted({ id, from: order, by: "keyboard" });
    setAnnouncement(
      `${nameOf(id)} picked up, ${placeIn(order, id)}. Use the arrow keys to move it, Space to drop it, Escape to cancel.`,
    );
  }

  function drop(id: string) {
    if (lifted === null) return;
    setLifted(null);
    setAnnouncement(`${nameOf(id)} dropped, ${placeIn(order, id)}.`);
    commitMove(id, lifted.from, order);
  }

  function cancel(id: string) {
    if (lifted === null) return;
    setOrder(lifted.from);
    setLifted(null);
    setAnnouncement(`${nameOf(id)} put back, ${placeIn(lifted.from, id)}.`);
    refocus(id);
  }

  function step(id: string, by: number) {
    const at = order.indexOf(id);
    const to = Math.min(Math.max(at + by, 0), order.length - 1);
    if (to === at) return;
    const next = order.filter((each) => each !== id);
    next.splice(to, 0, id);
    setOrder(next);
    setAnnouncement(`${nameOf(id)}, ${placeIn(next, id)}.`);
    refocus(id);
  }

  /** A key on a row's grip; true when the list used it. */
  function gripKey(key: string, id: string): boolean {
    const keyboardLifted = lifted?.by === "keyboard" && lifted.id === id;
    if (key === " " || key === "Enter") {
      if (keyboardLifted) drop(id);
      else if (lifted === null) pickUp(id);
      return true;
    }
    if (keyboardLifted && (key === "ArrowUp" || key === "ArrowDown")) {
      step(id, key === "ArrowUp" ? -1 : 1);
      return true;
    }
    if (keyboardLifted && key === "Escape") {
      cancel(id);
      return true;
    }
    return false;
  }

  return (
    <div className="wgi-settings mt-6 flex flex-col gap-4">
      <p className="text-[0.875rem] leading-5 text-(--wgi-muted-ink)">
        Staff choose from these when booking, in this order. Each type&apos;s length decides how
        much of the day it takes.
      </p>
      <BookingIntervalBand practice={settings.practice} canEdit={canEdit} send={send} />
      <div className="settings-types" data-tour="appointment-types">
        <div aria-hidden="true" className="settings-types-head">
          <span />
          <span>Type</span>
          <span>Seen by</span>
          <span>In use</span>
        </div>
        <Reorder.Group
          ref={groupRef}
          as="ul"
          axis="y"
          values={[...order]}
          onReorder={(next: readonly string[]) => {
            setOrder(next);
          }}
          aria-label="Appointment types, in booking order"
          className="settings-types-list"
        >
          {shown.map((type) => (
            <TypeRow
              key={type.id}
              type={type}
              providers={providers}
              canEdit={canEdit}
              send={send}
              constraints={groupRef}
              lifted={lifted?.id === type.id}
              instant={reducedMotion || lifted?.by === "keyboard"}
              gripRef={(grip) => {
                if (grip === null) grips.delete(type.id);
                else grips.set(type.id, grip);
              }}
              onGripKey={(key) => gripKey(key, type.id)}
              onGripLeave={() => {
                if (lifted?.by === "keyboard") drop(type.id);
              }}
              onDragStart={() => {
                setLifted({ id: type.id, from: order, by: "pointer" });
              }}
              onDragEnd={() => {
                if (lifted === null) return;
                setLifted(null);
                commitMove(type.id, lifted.from, order);
              }}
              onDelete={() => {
                setDeleting(type);
              }}
            />
          ))}
        </Reorder.Group>
        {types.length === 0 ? (
          <p className="p-4 text-[0.8125rem] text-(--wgi-muted-ink)">No appointment types yet.</p>
        ) : null}
      </div>
      <p id="types-reorder-help" hidden>
        Press Space to pick up a type, the arrow keys to move it, Space to drop it and Escape to
        cancel.
      </p>
      <p aria-live="assertive" className="sr-only">
        {announcement}
      </p>
      {editing !== null && canEdit && (editing.typeId === null || editingType !== undefined) ? (
        <TypeEditorDialog
          key={editingType?.id ?? "new"}
          type={editingType ?? null}
          field={editing.field}
          providers={providers}
          send={send}
        />
      ) : null}
      {deleting === null ? null : (
        <DeleteTypeDialog
          type={deleting}
          send={send}
          onClose={() => {
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function TypeRow({
  type,
  providers,
  canEdit,
  send,
  constraints,
  lifted,
  instant,
  gripRef,
  onGripKey,
  onGripLeave,
  onDragStart,
  onDragEnd,
  onDelete,
}: Readonly<{
  type: SettingsType;
  providers: readonly SettingsProvider[];
  canEdit: boolean;
  send: SettingsSend;
  constraints: RefObject<HTMLUListElement | null>;
  lifted: boolean;
  instant: boolean;
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- a ref callback receives the DOM element, which cannot be made readonly
  gripRef: (grip: HTMLButtonElement | null) => void;
  onGripKey: (key: string) => boolean;
  /** Focus moved from the grip to somewhere else. */
  onGripLeave: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDelete: () => void;
}>) {
  const router = useRouter();
  const controls = useDragControls();
  /* The switch shows the change at once; the server's answer replaces it
     when the type's version moves on. */
  const [seenVersion, setSeenVersion] = useState(type.version);
  const [active, setActive] = useState(type.active);
  if (seenVersion !== type.version) {
    setSeenVersion(type.version);
    setActive(type.active);
  }
  const seenSet = new Set(type.providerIds);
  const seenBy = providers.filter((provider) => seenSet.has(provider.id));
  const seenLine = seenByLine(seenBy, providers);
  const length = `${String(type.durationMinutes)} min`;
  const line = active
    ? type.description === null
      ? length
      : `${length} · ${type.description}`
    : `${length} · Turned off. Booked appointments keep this type.`;

  function setInUse(next: boolean) {
    setActive(next);
    const command = {
      kind: "set_appointment_type_active",
      id: type.id,
      expectedVersion: type.version,
    } as const;
    void send(
      { ...command, active: next },
      {
        undo: {
          headline: next ? `${type.name} turned on` : `${type.name} turned off`,
          detail: next ? null : "Staff can't book it. Booked appointments keep this type.",
          inverse: { ...command, active: !next },
          slot: `active:${type.id}`,
        },
      },
    ).then((outcome) => {
      if (!outcome.ok) setActive(type.active);
    });
  }

  function edit(field: EditorField) {
    router.push(`?type=${encodeURIComponent(type.id)}&field=${field}`, { scroll: false });
  }

  return (
    <Reorder.Item
      as="li"
      value={type.id}
      dragListener={false}
      dragControls={controls}
      dragConstraints={constraints}
      dragElastic={0.12}
      transition={instant ? { duration: 0 } : base}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-testid="appointment-type-row"
      className={cn("settings-type-row", lifted && "is-lifted", !active && "is-off")}
    >
      <span className="settings-type-grip-cell">
        {canEdit ? (
          <button
            ref={gripRef}
            type="button"
            className="settings-type-grip"
            aria-label={`Move ${type.name}`}
            aria-describedby="types-reorder-help"
            aria-pressed={lifted}
            onPointerDown={(event) => {
              event.preventDefault();
              controls.start(event);
            }}
            onKeyDown={(event) => {
              if (onGripKey(event.key)) event.preventDefault();
            }}
            onBlur={(event) => {
              /* A row moving under the keyboard blurs with no next target; only a real
                 move of focus elsewhere drops it. */
              if (event.relatedTarget !== null) onGripLeave();
            }}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </span>
      <span className="flex min-w-0 items-center gap-4">
        <span aria-hidden="true" className="settings-type-tile">
          <TypeIcon icon={type.icon} className="size-[1.125rem]" />
        </span>
        <span className="min-w-0">
          <span className="settings-type-name block truncate">{type.name}</span>
          <span className="block truncate text-[0.8125rem] leading-[1.125rem] text-(--wgi-muted-ink)">
            {line}
          </span>
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2.5">
        {seenBy.length === 0 ? null : (
          <span aria-hidden="true" className="flex shrink-0">
            {seenBy.slice(0, AVATAR_CAP).map((provider) => (
              <span key={provider.id} className="settings-type-avatar">
                {initialsOf(provider.name)}
              </span>
            ))}
          </span>
        )}
        <span
          aria-hidden={seenLine.spoken === null ? undefined : true}
          className="truncate text-[0.8125rem] text-(--wgi-muted-ink)"
        >
          {seenLine.shown}
        </span>
        {seenLine.spoken === null ? null : <span className="sr-only">{seenLine.spoken}</span>}
      </span>
      <span className="flex items-center">
        <Switch
          checked={active}
          disabled={!canEdit}
          aria-label={`${type.name} in use`}
          onCheckedChange={(next) => {
            setInUse(next);
          }}
        />
      </span>
      <span className="flex items-center justify-center">
        {canEdit ? (
          <Menu>
            <MenuTrigger className="settings-row-more" aria-label={`More for ${type.name}`}>
              <Ellipsis aria-hidden="true" width={15} height={15} />
            </MenuTrigger>
            <MenuContent align="end" className="min-w-56">
              <MenuGroup>
                <MenuItem
                  onClick={() => {
                    edit("name");
                  }}
                >
                  Rename
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    edit("details");
                  }}
                >
                  Edit length and details
                </MenuItem>
                {type.used ? (
                  <MenuItem disabled className="max-w-64 whitespace-normal">
                    Appointments have used this type. Turn it off instead of deleting it.
                  </MenuItem>
                ) : (
                  <MenuItem onClick={onDelete}>Delete</MenuItem>
                )}
              </MenuGroup>
            </MenuContent>
          </Menu>
        ) : null}
      </span>
    </Reorder.Item>
  );
}
