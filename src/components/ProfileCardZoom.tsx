"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import Image from "next/image";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut } from "./icons";

export type ProfileCardZoomHandle = {
  resetTransform: (duration?: number) => void;
};

type CardImage = { src: string; width: number; height: number };

type CardStrings = {
  zoomIn: string;
  zoomOut: string;
  zoomReset: string;
  loading: string;
  hintTouch: string;
  hintPointer: string;
};

type ProfileCardZoomProps = {
  image: CardImage;
  alt: string;
  t: CardStrings;
  coarse: boolean;
  reduced: boolean;
  open: boolean;
  handleRef: MutableRefObject<ProfileCardZoomHandle | null>;
};

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

/** Gesture stage for the provider-card viewer. Loaded only after hover/open. */
export function ProfileCardZoom({
  image,
  alt,
  t,
  coarse,
  reduced,
  open,
  handleRef,
}: ProfileCardZoomProps) {
  const zoomRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hintHidden, setHintHidden] = useState(false);
  if (!open && hintHidden) setHintHidden(false);

  useEffect(() => {
    handleRef.current = {
      resetTransform: (duration?: number) => zoomRef.current?.resetTransform(duration),
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef]);

  useEffect(() => {
    if (!open || !loaded || hintHidden) return;
    const timer = window.setTimeout(() => setHintHidden(true), 6000);
    return () => window.clearTimeout(timer);
  }, [open, loaded, hintHidden]);

  return (
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
  );
}
