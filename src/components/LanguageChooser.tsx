"use client";

import { useEffect, useId, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/i18n";
import {
  browserLocale,
  dismissLanguageChoice,
  hasCompletedLanguageChoice,
  LANGUAGE_TRIGGER_ID,
  rememberLocale,
} from "@/lib/locale-preference";
import { localeNames, locales, pathInLocale } from "@/lib/site";
import type { Locale } from "@/lib/site";
import { routeTemplateFor, track } from "@/lib/telemetry-client";
import { Check, Globe, X } from "./icons";

interface LanguageChooserProps { locale: Locale; dict: Dictionary }

function returnFocus() {
  document.getElementById(LANGUAGE_TRIGGER_ID)?.focus();
}

/**
 * Evidence-gated first-visit chooser (I4). The dialog auto-opens only on
 * positive evidence of a mismatch: the browser's top supported language
 * differs from the served locale and the visitor holds no remembered choice.
 * When the site already guessed right, the first paint is hero and banner
 * alone — the header Language menu remains the always-available way to
 * switch. The evidence is computed client-side (navigator.languages) so it
 * never depends on a response-cache-friendly transport.
 */
export function LanguageChooser({ locale, dict }: Readonly<LanguageChooserProps>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pathname = usePathname() || `/${locale}`;
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const copy = dict.common.languageChooser;

  const hintRef = useRef<Locale | null>(null);

  function trackChooser(
    event: "chooser_shown" | "chooser_accepted_hint" | "chooser_switched" | "chooser_kept_current" | "chooser_dismissed",
  ) {
    const template = routeTemplateFor(pathname);
    if (template !== null && template !== "") track(event, template, locale);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || hasCompletedLanguageChoice()) return;
    const candidate = browserLocale();
    if (candidate === locale) return;
    const option = dialog.querySelector<HTMLElement>(`button[lang="${candidate}"]`);
    if (!option) return;
    // The badge and focus belong to the browser's language — the dialog's
    // Whole reason to open is the mismatch. The effect synchronizes the DOM
    // Directly so no extra render stands between evidence and interruption.
    hintRef.current = candidate;
    option.querySelector<HTMLElement>("[data-suggested]")?.removeAttribute("hidden");
    if (!dialog.open) {
      dialog.showModal();
      option.focus();
      trackChooser("chooser_shown");
    }
    // oxlint-disable-next-line react/exhaustive-deps
  }, [locale]);

  function finish(target: Locale) {
    rememberLocale(target);
    trackChooser(
      target === locale
        ? "chooser_kept_current"
        : target === hintRef.current
          ? "chooser_accepted_hint"
          : "chooser_switched",
    );
    dialogRef.current?.close();
    if (target !== locale) router.push(pathInLocale(pathname, target));
  }

  function dismiss() {
    dismissLanguageChoice();
    trackChooser("chooser_dismissed");
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClose={returnFocus}
      className="language-dialog"
    >
      <div className="language-dialog__header">
        <span className="language-dialog__mark" aria-hidden="true">
          <Globe />
        </span>
      </div>
      <div className="language-dialog__body">
        <p className="language-dialog__eyebrow">{copy.eyebrow}</p>
        <h2 id={titleId}>{copy.title}</h2>
        <p id={descriptionId}>{copy.description}</p>
        <div className="language-dialog__options">
          {locales.map((target) => (
            <button
              key={target}
              type="button"
              lang={target}
              onClick={() => { finish(target); }}
              className="language-dialog__option"
            >
              <span>{localeNames[target]}</span>
              <span className="language-dialog__suggested" data-suggested hidden>
                <Check aria-hidden="true" />
                {copy.suggested}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { finish(locale); }}
          className="language-dialog__continue"
        >
          {copy.continue}
        </button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={copy.close}
        className="language-dialog__close"
      >
        <X />
      </button>
    </dialog>
  );
}
