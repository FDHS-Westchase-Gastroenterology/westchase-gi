"use client";

import Image from "next/image";
import { useEffect } from "react";

import {
  PortalFeedbackMessage,
  PortalFeedbackProvider,
} from "@/app/admin/(portal)/portal-feedback";
import type { ReviewFlyer, ReviewTargetKey } from "@/lib/review-flyers";

import { FlyerCard } from "./flyer-card";
import { assetUrl, flyerCodeFile } from "./flyer-files";
import type { FlyerFiles } from "./flyer-files";
import { FEEDBACK_SOURCE } from "./flyer-output";
import { clearPrintMarks } from "./print-marks";
import { PrintSeveralMenu } from "./print-several-menu";

import "./review-flyers.css";

/* Review flyers (issue #357; Figma Ypf9ohpRcGWF5C9T9bSvWW, section 14,
   516:9469): the six bilingual flyers as cards in a grid, each with a
   real preview of its code, Print, and a Download menu; the header prints
   several together. Below the screen sits the print composition itself,
   one letter page per flyer, which the print rules in globals.css show
   for whatever was marked. Pressing the browser's own Print with nothing
   marked prints the whole-practice flyer, as it always has. */

/** Which files the server holds, per flyer; a flyer it does not list has none. */
export type ReviewFlyerFiles = Readonly<Partial<Record<ReviewTargetKey, FlyerFiles>>>;

const NO_FILES: FlyerFiles = { pdf: false, svg: false, png: false };

function Flyer({ flyer, code }: Readonly<{ flyer: ReviewFlyer; code: string }>) {
  const providerLine =
    flyer.credentials !== null && flyer.credentials !== ""
      ? `${flyer.title}, ${flyer.credentials}`
      : null;

  return (
    <section className="review-flyer" data-review-flyer={flyer.key} aria-hidden="true">
      <div className="review-flyer-band">
        <div className="review-flyer-brand">
          <Image
            src="/images/brand/header-logo-fdhs.webp"
            alt=""
            width={300}
            height={146}
            unoptimized
          />
        </div>
        <p className="review-flyer-clinic">
          Westchase Gastroenterology
          <small>Florida Digestive Health Specialists</small>
        </p>
        <span className="review-flyer-tick" />
        <h2 className="review-flyer-ask">{flyer.askEn}</h2>
        <p className="review-flyer-ask-es" lang="es">
          {flyer.askEs}
        </p>
      </div>
      <div className="review-flyer-qr-card">
        {/* Keep the protected asset request in the authenticated browser. */}
        <Image src={assetUrl(code)} alt="" width={512} height={512} unoptimized />
      </div>
      <p className="review-flyer-scan">
        {flyer.scanEn}
        <em lang="es">{flyer.scanEs}</em>
      </p>
      {flyer.showLanguages ? (
        <p className="review-flyer-langs">English · Español · Tiếng Việt · 한국어 · العربية</p>
      ) : null}
      {providerLine !== null && providerLine !== "" ? (
        <p className="review-flyer-provider">
          {providerLine}
          <small>
            {flyer.roleEn} · <span lang="es">{flyer.roleEs}</span>
          </small>
        </p>
      ) : null}
      <div className="review-flyer-foot">
        <p className="review-flyer-thanks">
          Thank you for choosing our practice.{" "}
          <em lang="es">Gracias por elegir nuestra clínica.</em>
        </p>
        <p className="review-flyer-practice-line">
          Westchase Gastroenterology · Tampa &amp; Lutz · (813) 920-8882
        </p>
      </div>
    </section>
  );
}

function ReviewFlyerPrinterBody({
  flyers,
  files,
}: Readonly<{ flyers: readonly ReviewFlyer[]; files: ReviewFlyerFiles }>) {
  useEffect(() => {
    const beforePrint = () => {
      const currentPrint = document.body.dataset.reviewFlyerPrint;
      if (currentPrint === undefined || currentPrint === "") {
        document.body.dataset.reviewFlyerPrint = "practice";
      }
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", clearPrintMarks);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", clearPrintMarks);
      clearPrintMarks();
    };
  }, []);

  const printable = flyers.flatMap((flyer) => {
    const code = flyerCodeFile(flyer, files[flyer.key] ?? NO_FILES);
    return code === null ? [] : [{ flyer, code }];
  });

  return (
    <>
      <div className="review-flyer-screen wgi-flyers" data-testid="review-flyers">
        <header className="wgi-flyers-head">
          <div className="wgi-flyers-heading">
            <h1 className="wgi-flyers-title">Review flyers</h1>
            <p className="wgi-flyers-lede">
              Hang these where patients check out. Each code opens a review page on the
              patient&rsquo;s phone, in English or Spanish.
            </p>
          </div>
          <PrintSeveralMenu flyers={printable.map(({ flyer }) => flyer)} />
        </header>

        <PortalFeedbackMessage source={FEEDBACK_SOURCE} testId="review-flyer-output-feedback" />

        <section className="wgi-flyers-grid" aria-label="Review flyers">
          {flyers.map((flyer) => (
            <FlyerCard key={flyer.key} flyer={flyer} files={files[flyer.key] ?? NO_FILES} />
          ))}
        </section>
      </div>

      <div className="review-flyer-print-root">
        {printable.map(({ flyer, code }) => (
          <Flyer key={flyer.key} flyer={flyer} code={code} />
        ))}
      </div>
    </>
  );
}

export function ReviewFlyerPrinter({
  flyers,
  files,
}: Readonly<{ flyers: readonly ReviewFlyer[]; files: ReviewFlyerFiles }>) {
  return (
    <PortalFeedbackProvider>
      <ReviewFlyerPrinterBody flyers={flyers} files={files} />
    </PortalFeedbackProvider>
  );
}
