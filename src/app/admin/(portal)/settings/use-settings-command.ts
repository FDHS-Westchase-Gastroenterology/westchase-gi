"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { applySettingsCommand } from "@/app/admin/(portal)/settings/schedule-actions";
import { settingsFailureMessage } from "@/app/admin/(portal)/settings/settings-model";
import { showUndoToast } from "@/components/ui/undo-toast";
import type {
  SettingsCommand,
  SettingsCommandOutcome,
} from "@/lib/portal/scheduling/settings-contracts";

/* Settings applies each change as it is made (issue #352), so a quick run of
   edits — two ends of a bar, then the day's location — must land in order on
   the versions they build on. Every command goes through one queue: it waits
   for the one before it, and its expected version is the newest this page has
   seen for that row, from the server's last answer or the props, whichever is
   later. A change that can be reversed confirms in the shared Undo toast,
   whose Undo is the inverse command sent through the same queue. */

export interface SettingsUndo {
  /** "Infusion therapy is turned off". */
  readonly headline: string;
  /** What the change means, or null. */
  readonly detail: string | null;
  /** The command that puts it back. Its expected version is filled in when it is sent. */
  readonly inverse: SettingsCommand;
  /** A run of edits to one thing ("hours:<provider>"): a new toast in the slot replaces the
      last one, whose Undo the new toast's inverse already covers one step back. */
  readonly slot?: string;
}

export interface SendOptions {
  readonly undo?: SettingsUndo;
  /** Say failures in a toast (the default), or leave them to the caller. */
  readonly quiet?: boolean;
}

const UNREACHABLE = "Settings couldn't be reached. Try again.";

function withVersion(command: SettingsCommand, known: ReadonlyMap<string, number>) {
  if (!("expectedVersion" in command) || command.id === null || command.expectedVersion === null)
    return command;
  const latest = known.get(command.id);
  return latest !== undefined && latest > command.expectedVersion
    ? { ...command, expectedVersion: latest }
    : command;
}

export type SettingsSend = ReturnType<typeof useSettingsCommand>;

export function useSettingsCommand() {
  const router = useRouter();
  const [known] = useState(() => new Map<string, number>());
  const queue = useRef<Promise<unknown> | undefined>(undefined);
  const [slots] = useState(() => new Map<string, string | number>());

  async function run(command: SettingsCommand): Promise<SettingsCommandOutcome> {
    const next = (queue.current ?? Promise.resolve()).then(
      async (): Promise<SettingsCommandOutcome> => {
        try {
          const outcome = await applySettingsCommand({
            idempotencyKey: crypto.randomUUID(),
            command: withVersion(command, known),
          });
          if (outcome.ok) known.set(outcome.id, outcome.version);
          return outcome;
        } catch {
          return { ok: false, code: "unavailable" };
        }
      },
    );
    queue.current = next;
    return next;
  }

  /** Sends one change; says a refusal and re-reads the page. */
  async function send(
    command: SettingsCommand,
    options: Readonly<SendOptions> = {},
  ): Promise<SettingsCommandOutcome> {
    const outcome = await run(command);
    if (!outcome.ok) {
      if (options.quiet !== true)
        toast.error(
          outcome.code === "unavailable" ? UNREACHABLE : settingsFailureMessage(outcome.code),
        );
      router.refresh();
      return outcome;
    }
    if (outcome.dryRun === true) return outcome;
    const { undo } = options;
    if (undo !== undefined) {
      const previous = undo.slot === undefined ? undefined : slots.get(undo.slot);
      if (previous !== undefined) toast.dismiss(previous);
      const id = showUndoToast({
        headline: undo.headline,
        detail: undo.detail,
        undo: async () => {
          const reversed = await run(undo.inverse);
          return reversed.ok
            ? { ok: true, message: "Undone." }
            : {
                ok: false,
                message:
                  reversed.code === "unavailable"
                    ? UNREACHABLE
                    : settingsFailureMessage(reversed.code),
              };
        },
        onSettled: () => {
          router.refresh();
        },
      });
      if (undo.slot !== undefined) slots.set(undo.slot, id);
    }
    router.refresh();
    return outcome;
  }

  return send;
}
