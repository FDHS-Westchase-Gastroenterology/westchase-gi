"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { Download, Maximize, X, ZoomIn, ZoomOut } from "./icons";

type CardImage = { src: string; width: number; height: number };

type CardStrings = {
  label: string;
  hint: string;
  zoomIn: string;
  zoomOut: string;
  zoomReset: string;
  download: string;
  loading: string;
  hintTouch: string;
  hintPointer: string;
  close: string;
};

type ProfileCardViewerProps = {
  image: CardImage;
  /** Whose card this is (localized), e.g. "Dr. John Chang". */
  subject: string;
  t: CardStrings;
  className?: string;
};

function useMedia(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

const emptySubscribe = () => () => {};

/** False during SSR and hydration's first client render, true after. */
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

/** Zoom cluster: −, live percentage (tap to reset), +. Must live inside
 * the TransformWrapper context. */
function ZoomToolbar({ t }: { t: CardStrings }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const readout = useTransformComponent(({ state }) => (
    <span className="min-w-12 text-center tabular-nums">{Math.round(state.scale * 100)}%</span>
  ));
  return (
    <div className="pc-toolbar">
      <button type="button" aria-label={t.zoomOut} onClick={() => zoomOut()} className="pc-tool">
        <ZoomOut className="h-4.5 w-4.5" />
      </button>
      <button
        type="button"
        aria-label={t.zoomReset}
        title={t.zoomReset}
        onClick={() => resetTransform()}
        className="pc-tool px-2 text-[0.88rem] font-bold"
      >
        {readout}
      </button>
      <button type="button" aria-label={t.zoomIn} onClick={() => zoomIn()} className="pc-tool">
        <ZoomIn className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}

/**
 * The practice's official provider profile-card graphic, kept ON the page:
 * a real thumbnail in the profile itself, and a same-page full-screen
 * viewer (native <dialog>) with photo-app gestures — pinch, double-tap,
 * mouse wheel, drag — plus labeled zoom controls and a download of the
 * byte-exact original.
 *
 * Until React hydrates, the thumbnail is a plain link to the original
 * graphic, so a tap always does something even on a slow connection.
 * The full-size image starts loading on hover/focus intent, and the
 * viewer shows an explicit loading state while it streams.
 */
export function ProfileCardViewer({ image, subject, t, className = "" }: ProfileCardViewerProps) {
  const mounted = useHydrated();
  const [open, setOpen] = useState(false);
  const [warm, setWarm] = useState(false); // start fetching the full-size image
  const [loaded, setLoaded] = useState(false);
  const [hintHidden, setHintHidden] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const zoomRef = useRef<ReactZoomPanPinchRef | null>(null);
  const coarse = useMedia("(pointer: coarse)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");

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

  // The gesture hint retires itself once the reader zooms, or after a beat.
  useEffect(() => {
    if (!open || !loaded || hintHidden) return;
    const timer = window.setTimeout(() => setHintHidden(true), 6000);
    return () => window.clearTimeout(timer);
  }, [open, loaded, hintHidden]);

  function openViewer() {
    // Browsers too old for <dialog> (iOS < 15.4) still get the graphic.
    if (typeof dialogRef.current?.showModal !== "function") {
      window.open(image.src, "_blank", "noopener");
      return;
    }
    setWarm(true);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setHintHidden(false);
    zoomRef.current?.resetTransform(0);
  }

  const tileInner = (
    <>
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
    </>
  );
  const tileClass = `group flex w-full max-w-sm items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-3.5 text-start transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-[var(--color-line-2)] ${className}`;

  return (
    <>
      {mounted ? (
        <button
          type="button"
          onClick={openViewer}
          onPointerEnter={() => setWarm(true)}
          onFocus={() => setWarm(true)}
          className={tileClass}
        >
          {tileInner}
        </button>
      ) : (
        // Pre-hydration fallback: a real link to the original graphic, so a
        // tap is never a dead end while the page is still booting.
        <a
          href={image.src}
          target="_blank"
          rel="noopener"
          onClick={(e) => {
            e.preventDefault();
            openViewer();
          }}
          className={tileClass}
        >
          {tileInner}
        </a>
      )}

      <dialog ref={dialogRef} aria-label={alt} onClose={close} className="pc-dialog">
        {/* Click-to-dismiss is a real (pointer-only) button, not a bare
            handler; keyboard users have Escape + the labeled close button. */}
        <button type="button" aria-label={t.close} tabIndex={-1} onClick={close} className="pc-scrim" />
        {warm || open ? (
          <div className="pc-shell">
            <header className="pc-top">
              <p className="min-w-0 flex-1 truncate text-[0.95rem] font-bold text-white">{subject}</p>
              <a href={image.src} download className="pc-top-btn" title={t.download}>
                <Download className="h-4.5 w-4.5 flex-none" />
                <span className="hidden sm:inline">{t.download}</span>
                <span className="sr-only sm:hidden">{t.download}</span>
              </a>
              <button type="button" onClick={close} aria-label={t.close} className="pc-top-btn">
                <X className="h-4.5 w-4.5" />
              </button>
            </header>

            <div className="pc-stage">
              <TransformWrapper
                ref={zoomRef}
                minScale={1}
                maxScale={6}
                centerOnInit
                centerZoomedOut
                // On touch devices the browser synthesizes a mousedown right
                // after a double-tap's touchend; the library's mouse-pan
                // handler would cancel the just-started zoom animation.
                // Touch panning has its own path, so left-click pan is only
                // needed for fine pointers.
                panning={{ allowLeftClickPan: !coarse }}
                // step is an exponent (scale × e^step): 0.95 ≈ 2.6× — right
                // at card-text reading size; the same step toggles back to 1.
                doubleClick={{ mode: "toggle", step: 0.95, animationTime: reduced ? 0 : 220 }}
                zoomAnimation={{ animationTime: reduced ? 0 : 220 }}
                velocityAnimation={{ disabled: reduced }}
                onTransform={(_ref, state) => {
                  if (state.scale > 1.02) setHintHidden(true);
                }}
              >
                <TransformComponent wrapperClass="pc-tw" contentClass="pc-tc">
                  <div className="pc-frame">
                    <Image
                      src={image.src}
                      alt={alt}
                      width={image.width}
                      height={image.height}
                      sizes="64rem"
                      draggable={false}
                      onLoad={() => setLoaded(true)}
                      className={`h-full w-full object-contain transition-opacity duration-300 ${
                        loaded ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </div>
                </TransformComponent>

                {!loaded ? (
                  <div className="pc-loading" role="status">
                    <span className="pc-progress" aria-hidden="true">
                      <span />
                    </span>
                    <span className="pc-spinner" aria-hidden="true" />
                    <span className="sr-only">{t.loading}</span>
                  </div>
                ) : null}

                {loaded && !hintHidden ? (
                  <p className="pc-hint" aria-hidden="true">
                    {coarse ? t.hintTouch : t.hintPointer}
                  </p>
                ) : null}

                <ZoomToolbar t={t} />
              </TransformWrapper>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
