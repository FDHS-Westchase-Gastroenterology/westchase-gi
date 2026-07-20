"use client";

import { useEffect, useId, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/i18n";
import {
  hasCompletedLanguageChoice,
  LANGUAGE_TRIGGER_ID,
  rememberLocale,
} from "@/lib/locale-preference";
import {
  localeNames,
  locales,
  pathInLocale,
  type Locale,
} from "@/lib/site";
import { Check, Globe, X } from "./icons";

type LanguageChooserProps = { locale: Locale; dict: Dictionary };

function returnFocus() {
  document.getElementById(LANGUAGE_TRIGGER_ID)?.focus();
}

export function LanguageChooser({ locale, dict }: LanguageChooserProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pathname = usePathname() || `/${locale}`;
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const copy = dict.common.languageChooser;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || hasCompletedLanguageChoice()) return;
    if (!dialog.open) dialog.showModal();
  }, []);

  function finish(target: Locale) {
    rememberLocale(target);
    dialogRef.current?.close();
    if (target !== locale) router.push(pathInLocale(pathname, target));
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        finish(locale);
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
              autoFocus={target === locale}
              onClick={() => finish(target)}
              className="language-dialog__option"
            >
              <span>{localeNames[target]}</span>
              {target === locale ? (
                <span className="language-dialog__suggested">
                  <Check aria-hidden="true" />
                  {copy.suggested}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => finish(locale)}
          className="language-dialog__continue"
        >
          {copy.continue}
        </button>
      </div>
      <button
        type="button"
        onClick={() => finish(locale)}
        aria-label={copy.close}
        className="language-dialog__close"
      >
        <X />
      </button>
    </dialog>
  );
}
