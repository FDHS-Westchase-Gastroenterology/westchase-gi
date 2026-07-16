"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { ReviewFlyer, ReviewTargetKey } from "@/lib/review-flyers";

const DOWNLOAD_ACTIONS = [
  ["pdf", "Flyer PDF"],
  ["svg", "SVG"],
  ["png", "PNG"],
] as const;

function assetUrl(filename: string, download = false): string {
  const path = `/admin/review-flyers/assets/${encodeURIComponent(filename)}`;
  return download ? `${path}?download=1` : path;
}

function printFlyer(key: ReviewTargetKey | "all") {
  document.body.dataset.reviewFlyerPrint = key;
  window.print();
}

function Flyer({ flyer }: { flyer: ReviewFlyer }) {
  const providerLine = flyer.credentials
    ? `${flyer.title}, ${flyer.credentials}`
    : null;

  return (
    <section
      className="review-flyer"
      data-review-flyer={flyer.key}
      aria-hidden="true"
    >
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
        <Image
          src={assetUrl(flyer.assets.svg.filename)}
          alt=""
          width={512}
          height={512}
          unoptimized
        />
      </div>
      <p className="review-flyer-scan">
        {flyer.scanEn}
        <em lang="es">{flyer.scanEs}</em>
      </p>
      {flyer.showLanguages ? (
        <p className="review-flyer-langs">
          English · Español · Tiếng Việt · 한국어 · العربية
        </p>
      ) : null}
      {providerLine ? (
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

export function ReviewFlyerPrinter({ flyers }: { flyers: ReviewFlyer[] }) {
  useEffect(() => {
    const beforePrint = () => {
      if (!document.body.dataset.reviewFlyerPrint) {
        document.body.dataset.reviewFlyerPrint = "practice";
      }
    };
    const afterPrint = () => {
      delete document.body.dataset.reviewFlyerPrint;
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      delete document.body.dataset.reviewFlyerPrint;
    };
  }, []);

  return (
    <>
      <div className="review-flyer-screen">
        <div className="heading-tick" />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-[46rem]">
            <h1 className="h1">Print review flyers</h1>
            <p className="lead mt-4 text-[var(--color-body)]">
              Choose one ready-to-print bilingual flyer, or print the full set.
              The PDF option is best for a print shop or when another device
              needs a guaranteed one-page file.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-navy shrink-0"
            onClick={() => printFlyer("all")}
          >
            Print all six flyers
          </button>
        </div>

        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-mint)] px-3.5 py-2 text-[0.88rem] font-bold text-[var(--color-navy)]">
          <span aria-hidden="true">✓</span>
          All six codes and one-page PDFs are machine-verified.
        </p>

        <section className="mt-8" aria-label="Available review flyers">
          <div className="grid gap-4">
            {flyers.map((flyer) => (
              <article
                key={flyer.key}
                className="card-lined grid min-w-0 gap-5 p-5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:p-6"
                data-review-target={flyer.key}
              >
                <Image
                  className="aspect-square w-[8.5rem] rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-white"
                  src={assetUrl(flyer.assets.svg.filename)}
                  alt={`QR code for ${flyer.title}`}
                  width={512}
                  height={512}
                  unoptimized
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="h3">{flyer.title}</h2>
                    <span className="rounded-full bg-[var(--color-mint)] px-2.5 py-1 text-[0.75rem] font-bold text-[var(--color-navy)]">
                      Verified
                    </span>
                  </div>
                  {flyer.credentials ? (
                    <p className="mt-1 font-bold text-[var(--color-ink)]">
                      {flyer.credentials}
                    </p>
                  ) : null}
                  <p className="mt-2 max-w-[56ch] text-[0.95rem] text-[var(--color-muted)]">
                    {flyer.description}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      className="btn btn-amber btn-sm min-h-11"
                      onClick={() => printFlyer(flyer.key)}
                    >
                      Print flyer
                    </button>
                    {DOWNLOAD_ACTIONS.map(([kind, label]) => (
                      <a
                        key={kind}
                        className="btn btn-outline btn-sm min-h-11"
                        href={assetUrl(flyer.assets[kind].filename, true)}
                        download={flyer.assets[kind].filename}
                      >
                        {label}
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="mt-8 max-w-[68ch] border-t border-[var(--color-line)] pt-6 text-[0.9rem] text-[var(--color-muted)]">
          <p>
            <strong className="text-[var(--color-ink)]">Printing tip:</strong>{" "}
            use bright-white cardstock and color ink. Keep the white area around
            each QR code clear so phone cameras can scan it reliably.
          </p>
        </aside>
      </div>

      <div className="review-flyer-print-root">
        {flyers.map((flyer) => (
          <Flyer key={flyer.key} flyer={flyer} />
        ))}
      </div>
    </>
  );
}
