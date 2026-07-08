"use client";

import { useState, type FormEvent } from "react";
import { site, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";
import { Check, MessageSquare, Phone } from "./icons";

// NOTE (pre-launch): submissions currently resolve to an on-page confirmation.
// Wire to the practice's scheduling inbox (email service or scheduler) before
// real patient traffic; tracked in the project log.

type AppointmentFormProps = { locale: Locale; dict: Dictionary };

type Errors = Partial<Record<"name" | "phone" | "email", string>>;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AppointmentForm({ locale, dict }: AppointmentFormProps) {
  const f = dict.appointment.form;
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: Errors = {};
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();

    if (!name) next.name = f.errName;
    if (!phone || phone.replace(/\D/g, "").length < 10) next.phone = f.errPhone;
    if (!email || !emailRe.test(email)) next.email = f.errEmail;

    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setDone(true);
    }, 600);
  }

  if (done) {
    return (
      <div role="status" aria-live="polite" className="card flex flex-col items-center p-8 text-center sm:p-12">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-mint)] text-[var(--color-teal-ink)]">
          <Check className="h-7 w-7" />
        </span>
        <h2 className="h3 mt-5 font-[var(--font-display)]">{f.doneHeading}</h2>
        <p className="mt-3 max-w-md text-[var(--color-body)]">{f.doneBody}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={site.phone.href} className="btn btn-navy">
            <Phone className="h-4 w-4" /> {dict.common.callUs}
          </a>
          <a href={site.textLine.href} className="btn btn-outline">
            <MessageSquare className="h-4 w-4" /> {dict.common.textUs}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card p-6 sm:p-9">
      <p className="mb-6 rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-[0.95rem] font-semibold text-[var(--color-ink)]">
        {dict.appointment.phiWarning}
      </p>
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
            {f.email} <span aria-hidden="true" className="text-[var(--color-amber-deep)]">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
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
          <textarea id="message" name="message" rows={4} className="field-input" aria-describedby="hint-message" />
          <p id="hint-message" className="field-hint">
            {f.messageHint}
          </p>
        </div>
      </div>
      <button type="submit" disabled={submitting} className="btn btn-amber btn-lg mt-7 w-full disabled:opacity-70 sm:w-auto">
        {submitting ? f.submitting : f.submit}
      </button>
    </form>
  );
}
