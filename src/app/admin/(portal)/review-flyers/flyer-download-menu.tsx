"use client";

import type { ReactNode } from "react";

import { Archive, ChevronDown, Download } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { reviewFlyerArchiveName } from "@/lib/review-flyers";
import type { ReviewAssetKind, ReviewFlyer } from "@/lib/review-flyers";

import { archiveUrl, assetUrl } from "./flyer-files";
import type { FlyerFiles } from "./flyer-files";
import { useFlyerDownload } from "./flyer-output";

/* A flyer's Download menu (issue #357; Figma 516:9874): each file the
   server holds, named by what it is for, then the three together as one
   .zip the server builds on request (HIG Pull-down buttons: the choices
   follow the command they refine). A file missing on the server is not
   offered, and the .zip only when all three are there. Each row is a link
   that downloads, so the browser's own download handling and a modified
   click both work. */

const KINDS = [
  { kind: "pdf", tag: "PDF", label: "Flyer PDF", use: "For printing at a print shop" },
  { kind: "svg", tag: "SVG", label: "SVG", use: "For a designer; scales to any size" },
  { kind: "png", tag: "PNG", label: "PNG", use: "For email, a slide, or social posts" },
] as const satisfies readonly {
  kind: ReviewAssetKind;
  tag: string;
  label: string;
  use: string;
}[];

/** One file row. Each row keeps its own double-click guard, so choosing a
    second file right after the first still downloads it. */
function FlyerDownloadItem({
  href,
  filename,
  kind,
  message,
  children,
}: Readonly<{
  href: string;
  filename: string;
  kind: ReviewAssetKind | "zip";
  message: string;
  children: ReactNode;
}>) {
  const started = useFlyerDownload();
  return (
    <MenuLinkItem
      href={href}
      download={filename}
      className="wgi-flyer-menu-item"
      data-review-download={kind}
      onClick={(event) => {
        started(event, message);
      }}
    >
      {children}
    </MenuLinkItem>
  );
}

export function FlyerDownloadMenu({
  flyer,
  files,
}: Readonly<{
  flyer: ReviewFlyer;
  files: FlyerFiles;
}>) {
  const offered = KINDS.filter(({ kind }) => files[kind]);
  if (offered.length === 0) return null;
  const archive = offered.length === KINDS.length;

  return (
    <Menu>
      <MenuTrigger
        render={<Button type="button" variant="outline" className="wgi-flyer-download" />}
        aria-label={`Download ${flyer.title}`}
        data-testid={`review-flyer-download-${flyer.key}`}
      >
        <Download data-icon="inline-start" aria-hidden="true" />
        Download
        <ChevronDown data-icon="inline-end" aria-hidden="true" />
      </MenuTrigger>
      <MenuContent align="center" className="wgi-flyers-popover wgi-flyer-menu">
        <MenuGroup aria-label="Files">
          {offered.map(({ kind, tag, label, use }) => {
            const { filename } = flyer.assets[kind];
            return (
              <FlyerDownloadItem
                key={kind}
                href={assetUrl(filename, true)}
                filename={filename}
                kind={kind}
                message={`${label} download started for ${flyer.title}.`}
              >
                <span className="wgi-flyer-tag" data-kind={kind} aria-hidden="true">
                  {tag}
                </span>
                <span className="wgi-flyer-menu-text">
                  <span className="sr-only">{tag}: </span>
                  {use}
                </span>
              </FlyerDownloadItem>
            );
          })}
        </MenuGroup>
        {archive ? (
          <>
            <MenuSeparator />
            <FlyerDownloadItem
              href={archiveUrl(flyer.key)}
              filename={reviewFlyerArchiveName(flyer)}
              kind="zip"
              message={`The .zip of all three files started downloading for ${flyer.title}.`}
            >
              <span className="wgi-flyer-tag" data-kind="zip" aria-hidden="true">
                <Archive width={14} height={14} />
              </span>
              <span className="wgi-flyer-menu-text">All three, as one .zip</span>
            </FlyerDownloadItem>
          </>
        ) : null}
      </MenuContent>
    </Menu>
  );
}
