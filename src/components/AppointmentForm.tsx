"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { site, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";
import {
  HONEYPOT_FIELD,
  INTAKE_API,
  INTAKE_NOJS_ACTION,
  type IntakeResponse,
} from "@/lib/portal/contracts";
import { Check, MessageSquare, Phone } from "./icons";

type AppointmentFormProps = { locale: Locale; dict: Dictionary };

type Errors = Partial<Record<"name" | "phone" | "email", string>>;

// idle: form ready · submitting: POST in flight · success: durable acceptance
// confirmed by the server · failure: the server refused or could not save ·
// unknown: no readable response came back, so the truth is unknowable here.
type Status = "idle" | "submitting" | "success" | "failure" | "unknown";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FETCH_TIMEOUT_MS = 20_000;

/** Call/text recovery pair used by both the success card and problem alert. */
function ContactActions({ dict }: { dict: Dictionary }) {
  return (
    <>
      <a href={site.phone.href} className="btn btn-navy">
        <Phone className="h-4 w-4" /> {dict.common.callUs}
      </a>
      <a href={site.textLine.href} className="btn btn-outline">
        <MessageSquare className="h-4 w-4" /> {dict.common.textUs}
      </a>
    </>
  );
}

function SuccessCard({ dict }: { dict: Dictionary }) {
  const f = dict.appointment.form;
  return (
    <div
      role="status"
      aria-live="polite"
      className="card flex flex-col items-center p-8 text-center sm:p-12"
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-mint)] text-[var(--color-teal-ink)]">
        <Check className="h-7 w-7" />
      </span>
      <h2 className="h3 mt-5 font-[var(--font-display)]">{f.doneHeading}</h2>
      <p className="mt-3 max-w-md text-[var(--color-body)]">{f.doneBody}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ContactActions dict={dict} />
      </div>
    </div>
  );
}

type ProblemAlertProps = {
  dict: Dictionary;
  status: "failure" | "unknown";
  alertRef: React.RefObject<HTMLDivElement | null>;
};

function ProblemAlert({ dict, status, alertRef }: ProblemAlertProps) {
  const f = dict.appointment.form;
  return (
    <div
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      className="mb-6 rounded-[var(--radius-sm)] border border-[var(--color-amber-deep)] bg-[var(--color-amber-soft)] p-5 outline-none"
    >
      <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
        {status === "unknown" ? f.unknownHeading : f.failHeading}
      </h2>
      <p className="mt-2 text-[0.95rem] text-[var(--color-ink)]">
        {status === "unknown" ? f.unknownBody : f.failBody}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <ContactActions dict={dict} />
      </div>
    </div>
  );
}

export function AppointmentForm({ locale, dict }: AppointmentFormProps) {
  const f = dict.appointment.form;
  const pathname = usePathname();
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const alertRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Testability marker: E2E waits for hydration before driving the JS path
  // (a pre-hydration click legitimately takes the native no-JS fallback).
  // Direct DOM write — no state, no extra render.
  useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  function localFieldErrors(data: FormData): Errors {
    const next: Errors = {};
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();

    if (!name) next.name = f.errName;
    if (!phone || phone.replace(/\D/g, "").length < 10) next.phone = f.errPhone;
    // Email is optional — many patients have none; phone is the callback
    // channel. Validate the format only when something was entered.
    if (email && !emailRe.test(email)) next.email = f.errEmail;
    return next;
  }

  function serverFieldErrors(fieldErrors: Record<string, string>): Errors {
    const next: Errors = {};
    if ("name" in fieldErrors) next.name = f.errName;
    if ("phone" in fieldErrors) next.phone = f.errPhone;
    if ("email" in fieldErrors) next.email = f.errEmail;
    return next;
  }

  function showProblem(state: "failure" | "unknown") {
    setStatus(state);
    requestAnimationFrame(() => alertRef.current?.focus());
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const next = localFieldErrors(data);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      return;
    }

    setStatus("submitting");

    const payload = {
      name: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      email: String(data.get("email") || "").trim(),
      location: String(data.get("location") || "any"),
      time: String(data.get("time") || "any"),
      message: String(data.get("message") || "").trim() || undefined,
      locale,
      sourcePath: pathname || `/${locale}/appointment`,
      [HONEYPOT_FIELD]: String(data.get(HONEYPOT_FIELD) || ""),
    };

    let body: IntakeResponse;
    try {
      const res = await fetch(INTAKE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      body = (await res.json()) as IntakeResponse;
    } catch {
      // Timed out or no readable response: the request may or may not have
      // landed. Only the honest "please confirm with us" state is truthful.
      showProblem("unknown");
      return;
    }

    if (body.ok) {
      setStatus("success");
      return;
    }

    if (body.code === "validation" && body.fieldErrors) {
      const mapped = serverFieldErrors(body.fieldErrors);
      setErrors(mapped);
      setStatus("idle");
      requestAnimationFrame(() => {
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }

    showProblem("failure");
  }

  if (status === "success") {
    return <SuccessCard dict={dict} />;
  }

  return (
    <form
      method="post"
      action={INTAKE_NOJS_ACTION}
      onSubmit={handleSubmit}
      noValidate
      ref={formRef}
      className="card relative p-6 sm:p-9"
    >
      {(status === "failure" || status === "unknown") && (
        <ProblemAlert dict={dict} status={status} alertRef={alertRef} />
      )}
      <p className="mb-6 rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-[0.95rem] font-semibold text-[var(--color-ink)]">
        {dict.appointment.phiWarning}
      </p>
      {/* State the no-JS route needs: locale + origin path, rendered into the
          document so the native POST works before (or without) hydration. */}
      <input type="hidden" name="locale" value={locale} />
      <input
        type="hidden"
        name="sourcePath"
        value={pathname || `/${locale}/appointment`}
      />
      {/* Honeypot: humans never see or fill this; bots that do are dropped
          server-side with a success-shaped reply. Not display:none — some
          crawlers skip fully hidden fields. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
      >
        <label htmlFor={HONEYPOT_FIELD}>Company</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="field-label">
            {f.name} <span aria-hidden="true" className="text-[var(--color-amber-deep)]">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            aria-invalid={errors.name ? "true" : undefined}
            aria-describedby={errors.name ? "err-name" : undefined}
            className="field-input"
          />
          {errors.name && (
            <p id="err-name" className="field-error">
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className="field-label">
            {f.phone} <span aria-hidden="true" className="text-[var(--color-amber-deep)]">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            aria-invalid={errors.phone ? "true" : undefined}
            aria-describedby={errors.phone ? "err-phone" : undefined}
            className="field-input"
          />
          {errors.phone && (
            <p id="err-phone" className="field-error">
              {errors.phone}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            {f.email}{" "}
            <span className="font-semibold text-[var(--color-muted)]">
              {f.emailOptional}
            </span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={errors.email ? "err-email" : undefined}
            className="field-input"
          />
          {errors.email && (
            <p id="err-email" className="field-error">
              {errors.email}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="location" className="field-label">
            {f.location}
          </label>
          <select id="location" name="location" className="field-input" defaultValue="any">
            <option value="any">{f.locationAny}</option>
            {site.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name[locale]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="time" className="field-label">
            {f.time}
          </label>
          <select id="time" name="time" className="field-input" defaultValue="any">
            <option value="any">{f.timeAny}</option>
            <option value="morning">{f.timeMorning}</option>
            <option value="afternoon">{f.timeAfternoon}</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className="field-label">
            {f.message}
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            maxLength={2000}
            className="field-input"
            aria-describedby="hint-message"
          />
          <p id="hint-message" className="field-hint">
            {f.messageHint}
          </p>
        </div>
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn btn-amber btn-lg mt-7 w-full disabled:opacity-70 sm:w-auto"
      >
        {status === "submitting" ? f.submitting : f.submit}
      </button>
    </form>
  );
}
