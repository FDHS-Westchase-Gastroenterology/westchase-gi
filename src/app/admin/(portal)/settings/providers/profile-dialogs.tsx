"use client";

import Link from "next/link";
import { useState } from "react";

import { dayHref } from "@/app/admin/(portal)/schedule/week-calendar";
import { ConflictList } from "@/app/admin/(portal)/settings/needs-new-time";
import {
  appointmentCount,
  settingsFailureMessage,
} from "@/app/admin/(portal)/settings/settings-model";
import { SettingsSheet } from "@/app/admin/(portal)/settings/settings-sheet";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  SettingsConflict,
  SettingsProvider,
} from "@/lib/portal/scheduling/settings-contracts";

/* A provider's name and credentials, and retiring them (issue #352). Both
   open from the ••• menu beside the provider's name. Retiring takes them
   off the schedule and out of booking, keeping their hours, time off and
   types for a restore; while appointments are still booked with them it
   lists those instead, each linked to its day. */

export function ProfileDialog({
  provider,
  send,
  onClose,
}: Readonly<{
  provider: SettingsProvider;
  send: SettingsSend;
  onClose: () => void;
}>) {
  const [name, setName] = useState(provider.name);
  const [credentials, setCredentials] = useState(provider.credentials ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const valid = name.trim() !== "";

  async function save() {
    if (!valid) return;
    setPending(true);
    setError(null);
    const command = {
      kind: "set_provider_profile",
      id: provider.id,
      expectedVersion: provider.profileVersion,
      bookable: provider.bookable,
    } as const;
    try {
      const outcome = await send(
        {
          ...command,
          name: name.trim(),
          credentials: credentials.trim() === "" ? null : credentials.trim(),
        },
        {
          quiet: true,
          undo: {
            headline: `${name.trim()} saved`,
            detail: null,
            inverse: { ...command, name: provider.name, credentials: provider.credentials },
          },
        },
      );
      if (outcome.ok) onClose();
      else setError(settingsFailureMessage(outcome.code));
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSheet
      title="Name and credentials"
      testId="provider-profile-dialog"
      busy={pending}
      onClose={onClose}
      onSubmit={() => {
        void save();
      }}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            data-glass="secondary"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" data-glass="primary" disabled={pending || !valid}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <FieldGroup>
        <Field data-invalid={!valid || undefined}>
          <FieldLabel htmlFor="provider-profile-name">Name</FieldLabel>
          <Input
            id="provider-profile-name"
            data-initial-focus
            required
            maxLength={120}
            autoComplete="off"
            aria-invalid={!valid}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          {valid ? null : <FieldError>Enter their name as patients see it.</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="provider-profile-credentials">Credentials</FieldLabel>
          <Input
            id="provider-profile-credentials"
            maxLength={120}
            autoComplete="off"
            placeholder="MD, Gastroenterology"
            value={credentials}
            onChange={(event) => {
              setCredentials(event.target.value);
            }}
          />
        </Field>
        {error === null ? null : (
          <p role="alert" className="settings-notice">
            {error}
          </p>
        )}
      </FieldGroup>
    </SettingsSheet>
  );
}

export function RetireDialog({
  provider,
  send,
  onClose,
}: Readonly<{
  provider: SettingsProvider;
  send: SettingsSend;
  onClose: () => void;
}>) {
  const [blocked, setBlocked] = useState<readonly SettingsConflict[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function retire() {
    setPending(true);
    setError(null);
    const command = { id: provider.id, expectedVersion: provider.profileVersion } as const;
    try {
      const outcome = await send(
        { ...command, kind: "retire_provider" },
        {
          quiet: true,
          undo: {
            headline: `${provider.name} is retired`,
            detail: null,
            inverse: { ...command, kind: "restore_provider" },
          },
        },
      );
      if (outcome.ok) onClose();
      else if (outcome.code === "schedule_in_use" && outcome.conflicts !== undefined)
        setBlocked(outcome.conflicts);
      else setError(settingsFailureMessage(outcome.code));
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSheet
      title={blocked === null ? `Retire ${provider.name}?` : `${provider.name} still has bookings`}
      testId="retire-provider-dialog"
      busy={pending}
      onClose={onClose}
      onSubmit={() => {
        if (blocked === null) void retire();
        else onClose();
      }}
      footer={
        blocked === null ? (
          <>
            <Button
              type="button"
              variant="outline"
              data-glass="secondary"
              data-initial-focus
              disabled={pending}
              onClick={onClose}
            >
              Keep {provider.name}
            </Button>
            <button
              type="submit"
              disabled={pending}
              className="portal-confirm-dialog-destructive min-h-11 disabled:opacity-60"
            >
              {pending ? "Retiring…" : "Retire"}
            </button>
          </>
        ) : (
          <Button type="submit" data-glass="primary" data-initial-focus>
            Done
          </Button>
        )
      }
    >
      {blocked === null ? (
        <div className="flex flex-col gap-3">
          <p className="text-[0.875rem] leading-5 text-(--wgi-name-ink)">
            They leave the schedule and can&apos;t be booked. Their hours, time off and appointment
            types are kept, so they can be restored.
          </p>
          {error === null ? null : (
            <p role="alert" className="settings-notice">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[0.875rem] leading-5 text-(--wgi-name-ink)">
            {appointmentCount(blocked.length)} {blocked.length === 1 ? "is" : "are"} still booked
            with them. Move {blocked.length === 1 ? "it" : "them"} to another provider or cancel{" "}
            {blocked.length === 1 ? "it" : "them"}, then retire {provider.name}.
          </p>
          <ConflictList conflicts={blocked} />
          <Link
            href={dayHref(blocked[0]?.date ?? null)}
            className="settings-text-command self-start"
          >
            Open the first day on the schedule
          </Link>
        </div>
      )}
    </SettingsSheet>
  );
}
