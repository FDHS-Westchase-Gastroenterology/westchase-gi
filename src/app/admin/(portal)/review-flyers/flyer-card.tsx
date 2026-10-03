import Image from "next/image";

import { Printer } from "@/components/icons";
import type { ReviewFlyer } from "@/lib/review-flyers";

import { FlyerDownloadMenu } from "./flyer-download-menu";
import { assetUrl, flyerCodeFile } from "./flyer-files";
import type { FlyerFiles } from "./flyer-files";
import { FlyerPrintButton } from "./flyer-output";

/* One flyer on the Review flyers page (issue #357; Figma 516:9469): a
   small sheet of the printed flyer, its ask and its real code, over the
   title and what the code opens. Pointing at the card or moving focus into
   it brings up Print and Download over the preview (HIG Lists and tables:
   a row's actions appear on hover, and stay reachable by keyboard); on a
   touch screen they are always there. */

export function FlyerCard({ flyer, files }: Readonly<{ flyer: ReviewFlyer; files: FlyerFiles }>) {
  const code = flyerCodeFile(flyer, files);
  const titleId = `review-flyer-${flyer.key}-title`;

  return (
    <article className="wgi-flyer" data-review-target={flyer.key} aria-labelledby={titleId}>
      <div className="wgi-flyer-preview" aria-hidden="true">
        <div className="wgi-flyer-paper">
          <span className="wgi-flyer-mark">W</span>
          <p className="wgi-flyer-ask">{flyer.askEn}</p>
          {code === null ? (
            <span className="wgi-flyer-code wgi-flyer-code-missing" />
          ) : (
            // Keep the protected asset request in the authenticated browser.
            <Image
              className="wgi-flyer-code"
              src={assetUrl(code)}
              alt=""
              width={66}
              height={66}
              unoptimized
            />
          )}
          <p className="wgi-flyer-scan">Scan with your phone camera</p>
        </div>
      </div>
      <div className="wgi-flyer-info">
        <h2 id={titleId} className="wgi-flyer-title">
          {flyer.title}
        </h2>
        {flyer.credentials !== null && flyer.credentials !== "" ? (
          <p className="wgi-flyer-credentials">{flyer.credentials}</p>
        ) : null}
        <p className="wgi-flyer-description">{flyer.description}</p>
      </div>
      <div
        className="wgi-flyer-actions"
        role="group"
        aria-label={`${flyer.title}: print or download`}
      >
        {code === null ? null : (
          <FlyerPrintButton
            type="button"
            className="wgi-flyer-print"
            aria-label={`Print ${flyer.title}`}
            target={{ mark: flyer.key }}
            message={`Print dialog is opening for ${flyer.title}.`}
            data-testid={`review-flyer-print-${flyer.key}`}
          >
            <Printer data-icon="inline-start" aria-hidden="true" />
            Print
          </FlyerPrintButton>
        )}
        <FlyerDownloadMenu flyer={flyer} files={files} />
      </div>
    </article>
  );
}
