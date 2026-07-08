"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Download, Maximize, X, ZoomIn, ZoomOut } from "./icons";

type CardImage = { src: string; width: number; height: number };

type CardStrings = {
  label: string;
  hint: string;
  zoomIn: string;
  zoomOut: string;
  download: string;
  close: string;
};

type ProfileCardViewerProps = {
  image: CardImage;
  /** Whose card this is (localized), e.g. "Dr. John Chang". */
  subject: string;
  t: CardStrings;
  className?: string;
};

/**
 * The practice's official FDHS profile-card graphic, kept ON the page:
 * a real thumbnail in the profile itself, and a same-page lightbox
 * (native <dialog>) with fit/actual-size zoom and a download of the
 * byte-exact original. Replaces the previous open-in-new-tab link.
 *
 * The full-size image starts loading on hover/focus intent, so the
 * lightbox is usually instant; a slim progress bar covers the rare
 * slow-network gap.
 */
export function ProfileCardViewer({ image, subject, t, className = "" }: ProfileCardViewerProps) {
  const [open, setOpen] = useState(false);
  const [warm, setWarm] = useState(false); // start fetching the full-size image
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const landscape = image.width > image.height;
  const alt = `${t.label} — ${subject}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.documentElement.style.overflow = "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // Actual-size mode starts centered on the card, not at its top-left corner.
  useEffect(() => {
    const el = scrollRef.current;
    if (!zoom || !el) return;
    const inline = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollLeft = document.documentElement.dir === "rtl" ? -inline : inline;
  }, [zoom]);

  function close() {
    setOpen(false);
    setZoom(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setWarm(true);
          setOpen(true);
        }}
        onPointerEnter={() => setWarm(true)}
        onFocus={() => setWarm(true)}
        className={`group flex w-full max-w-sm items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-3.5 text-start transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-[var(--color-line-2)] ${className}`}
      >
        <span
          className={`relative flex-none overflow-hidden rounded-[5px] ring-1 ring-[var(--color-line)] ${
            landscape ? "w-24" : "w-14"
          }`}
        >
          <Image
            src={image.src}
            alt=""
            width={image.width}
            height={image.height}
            sizes="6rem"
            className="w-full transition-transform duration-500 [transition-timing-function:var(--ease-out-quint)] group-hover:scale-[1.05]"
          />
        </span>
        <span className="min-w-0">
          <span className="block text-[0.92rem] font-extrabold leading-snug text-[var(--color-ink)]">
            {t.label}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[0.85rem] font-bold text-[var(--color-teal-ink)]">
            <Maximize className="h-3.5 w-3.5 flex-none" /> {t.hint}
          </span>
        </span>
      </button>

      <dialog ref={dialogRef} aria-label={alt} onClose={close} className="pc-dialog">
        {/* Click-to-dismiss is a real (pointer-only) button, not a bare
            handler; keyboard users have Escape + the labeled close button. */}
        <button
          type="button"
          aria-label={t.close}
          tabIndex={-1}
          onClick={close}
          className="pc-scrim"
        />
        <div className="pc-body relative flex max-h-full flex-col items-center gap-3">
          <div
            ref={scrollRef}
            className={`pc-canvas relative rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-card)] ${
              zoom ? "overflow-auto" : "overflow-hidden"
            }`}
          >
            {!loaded && warm ? (
              <span className="pc-progress" aria-hidden="true">
                <span />
              </span>
            ) : null}
            {warm || open ? (
              <button
                type="button"
                aria-label={zoom ? t.zoomOut : t.zoomIn}
                onClick={() => setZoom(!zoom)}
                className={`block border-0 bg-transparent p-0 ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              >
                <Image
                  src={image.src}
                  alt={alt}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 1280px) 60rem, 92vw"
                  onLoad={() => setLoaded(true)}
                  className={zoom ? "max-w-none" : "h-auto max-h-[76vh] w-auto max-w-full object-contain"}
                  style={zoom ? { width: `${image.width}px` } : undefined}
                />
              </button>
            ) : null}
          </div>

          <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full bg-white px-2.5 py-1.5 shadow-[var(--shadow-soft)]">
            <p className="hidden max-w-56 truncate ps-2.5 pe-1 text-[0.88rem] font-bold text-[var(--color-ink)] sm:block">
              {subject}
            </p>
            <button
              type="button"
              onClick={() => setZoom(!zoom)}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.88rem] font-bold text-[var(--color-body)] transition-colors hover:bg-[var(--color-mint)] hover:text-[var(--color-ink)]"
            >
              {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
              {zoom ? t.zoomOut : t.zoomIn}
            </button>
            <a
              href={image.src}
              download
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.88rem] font-bold text-[var(--color-body)] transition-colors hover:bg-[var(--color-mint)] hover:text-[var(--color-ink)]"
            >
              <Download className="h-4 w-4" /> {t.download}
            </a>
            <button
              type="button"
              onClick={close}
              aria-label={t.close}
              className="rounded-full p-2 text-[var(--color-body)] transition-colors hover:bg-[var(--color-mint)] hover:text-[var(--color-ink)]"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
