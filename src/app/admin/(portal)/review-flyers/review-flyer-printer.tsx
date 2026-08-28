"use client";

import Image from "next/image";
import { useEffect } from "react";

import {
  PortalFeedbackMessage,
  PortalFeedbackProvider,
  usePortalFeedback,
} from "@/app/admin/(portal)/portal-feedback";
import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { Check } from "@/components/icons";
import { useOutputGuard } from "@/components/output-feedback";
import { buttonVariants } from "@/components/ui/button-variants";
import type { ReviewFlyer, ReviewTargetKey } from "@/lib/review-flyers";
import { cn } from "@/lib/utils";

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

function FlyerPrintButton({
  className,
  label,
  message,
  target,
}: Readonly<{
  className: string;
  label: string;
  message: string;
  target: ReviewTargetKey | "all";
}>) {
  const { publish } = usePortalFeedback();
  const { begin, locked } = useOutputGuard({ releaseOnAfterPrint: true });

  return (
    <button
      type="button"
      aria-disabled={locked || undefined}
      data-slot="button"
      className={`${className} aria-disabled:pointer-events-none aria-disabled:opacity-60`}
      onClick={() => {
        if (!begin()) return;
        publish({ source: "review-flyer-output", tone: "status", message });
        window.requestAnimationFrame(() => {
          printFlyer(target);
        });
      }}
    >
      {label}
    </button>
  );
}

function FlyerDownloadLink({
  filename,
  href,
  label,
  title,
}: Readonly<{
  filename: string;
  href: string;
  label: string;
  title: string;
}>) {
  const { publish } = usePortalFeedback();
  const { begin, locked } = useOutputGuard();

  return (
    <a
      data-slot="button"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "aria-disabled:pointer-events-none aria-disabled:opacity-60",
      )}
      href={href}
      download={filename}
      aria-disabled={locked || undefined}
      onClick={(event) => {
        if (!begin()) {
          event.preventDefault();
          return;
        }
        publish({
          source: "review-flyer-output",
          tone: "status",
          message: `${label} download started for ${title}.`,
        });
      }}
    >
      {label}
    </a>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Flyer({ flyer }: Readonly<{ flyer: ReviewFlyer }>) {
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

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ReviewFlyerPrinterBody({ flyers }: Readonly<{ flyers: ReviewFlyer[] }>) {
  useEffect(() => {
    const beforePrint = () => {
      const currentPrint = document.body.dataset.reviewFlyerPrint;
      if (currentPrint === undefined || currentPrint === "") {
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
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title="Print review flyers"
          description="Choose one ready-to-print bilingual flyer, or print the full set. Use the PDF when a print shop or another device needs a guaranteed one-page file."
          actions={
            <FlyerPrintButton
              className={buttonVariants()}
              label="Print all six flyers"
              message="Print dialog is opening for all six flyers."
              target="all"
            />
          }
        />

        <PortalFeedbackMessage source="review-flyer-output" testId="review-flyer-output-feedback" />

        <p className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-mint)] px-3.5 py-2 text-[0.88rem] font-bold text-[var(--color-navy)]">
          <Check className="h-4 w-4 flex-none" />
          All six codes and one-page PDFs are machine-verified.
        </p>

        <section className="mt-8" aria-label="Available review flyers">
          <div className="portal-flyer-list">
            {flyers.map((flyer) => (
              <article
                key={flyer.key}
                className="portal-flyer-row grid min-w-0 gap-5 p-5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:p-6"
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
                  {flyer.credentials !== null && flyer.credentials !== "" ? (
                    <p className="mt-1 font-bold text-[var(--color-ink)]">{flyer.credentials}</p>
                  ) : null}
                  <p className="mt-2 max-w-[56ch] text-[0.95rem] text-[var(--color-muted-ink)]">
                    {flyer.description}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <FlyerPrintButton
                      className={buttonVariants({ variant: "amber" })}
                      label="Print flyer"
                      message={`Print dialog is opening for ${flyer.title}.`}
                      target={flyer.key}
                    />
                    {DOWNLOAD_ACTIONS.map(([kind, label]) => (
                      <FlyerDownloadLink
                        key={kind}
                        filename={flyer.assets[kind].filename}
                        href={assetUrl(flyer.assets[kind].filename, true)}
                        label={label}
                        title={flyer.title}
                      />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="mt-8 max-w-[68ch] border-t border-[var(--color-line)] pt-6 text-[0.9rem] text-[var(--color-muted-ink)]">
          <p>
            <strong className="text-[var(--color-ink)]">Printing tip:</strong> use bright-white
            cardstock and color ink. Keep the white area around each QR code clear so phone cameras
            can scan it reliably.
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

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function ReviewFlyerPrinter({ flyers }: Readonly<{ flyers: ReviewFlyer[] }>) {
  return (
    <PortalFeedbackProvider>
      <ReviewFlyerPrinterBody flyers={flyers} />
    </PortalFeedbackProvider>
  );
}
