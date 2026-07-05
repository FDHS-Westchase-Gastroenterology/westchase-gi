"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { site, localePath, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";
import { ChevronDown, ExternalLink, Globe, Menu, MessageSquare, Phone, X } from "./icons";

type HeaderProps = { locale: Locale; dict: Dictionary };

type NavChild = { label: string; href: string; external?: boolean };
type NavGroup = { label: string; href?: string; children?: NavChild[] };

function buildNav(locale: Locale, dict: Dictionary): NavGroup[] {
  const n = dict.common.nav;
  const p = (path: string) => localePath(locale, path);
  return [
    {
      label: n.about,
      children: [
        { label: n.aboutUs, href: p("/about") },
        { label: n.gallery, href: p("/office-gallery") },
      ],
    },
    { label: n.services, href: p("/services") },
    { label: n.physicians, href: p("/physicians") },
    {
      label: dict.common.footer.patientsHeading,
      children: [
        { label: n.newPatients, href: p("/new-patients") },
        { label: n.existingPatients, href: p("/existing-patients") },
        { label: n.procedurePrep, href: p("/procedure-prep") },
        { label: n.resources, href: p("/resources") },
        {
          label: locale === "es" ? n.formsEs : n.formsEn,
          href: locale === "es" ? site.links.newPatientFormsEs : site.links.newPatientFormsEn,
          external: true,
        },
      ],
    },
    { label: n.contact, href: p("/contact") },
  ];
}

/** Swap the locale segment of the current path: /en/x <-> /es/x. */
function togglePath(pathname: string, locale: Locale): string {
  const other = locale === "en" ? "es" : "en";
  const rest = pathname.replace(/^\/(en|es)(?=\/|$)/, "");
  return `/${other}${rest}` || `/${other}`;
}

export function Header({ locale, dict }: HeaderProps) {
  const pathname = usePathname() || `/${locale}`;
  const nav = buildNav(locale, dict);
  const [open, setOpen] = useState<number | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const barRef = useRef<HTMLElement | null>(null);

  // Close dropdowns/drawer on route change (render-time state adjustment).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
    setDrawer(false);
  }

  // Close dropdowns on outside click / Escape.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(null);
        setDrawer(false);
      }
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Lock scroll while the drawer is open.
  useEffect(() => {
    document.documentElement.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [drawer]);

  const c = dict.common;

  return (
    <header ref={barRef} className="sticky top-0 z-[var(--z-header)]">
      {/* Utility bar: the human channels stay one tap away on every page. */}
      <div className="bg-[var(--color-navy-2)] text-[var(--color-on-dark)]">
        <div className="container-x flex h-10 items-center justify-between gap-3 text-[0.88rem] font-semibold">
          <div className="flex min-w-0 items-center gap-4">
            <a href={site.phone.href} className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
              <Phone className="h-3.5 w-3.5 text-[var(--color-amber)]" />
              <span className="whitespace-nowrap">{site.phone.display}</span>
            </a>
            <a href={site.textLine.href} className="flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-80">
              <MessageSquare className="h-3.5 w-3.5 flex-none text-[var(--color-amber)]" />
              <span className="truncate">
                <span className="hidden sm:inline">{c.textLine}: </span>
                {site.textLine.display}
              </span>
              <span className="hidden truncate font-normal text-[var(--color-on-dark-muted)] lg:inline">
                · {c.textLineHuman}
              </span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={site.links.portal}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 transition-opacity hover:opacity-80 sm:flex"
            >
              {c.patientPortal}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link
              href={togglePath(pathname, locale)}
              aria-label={c.languageToggleAria}
              className="flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklch,white_14%,transparent)] px-3 py-1 transition-colors hover:bg-[color-mix(in_oklch,white_24%,transparent)]"
            >
              <Globe className="h-3.5 w-3.5" />
              {c.languageToggle}
            </Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-[var(--color-line)] bg-white/95 backdrop-blur-sm">
        <div className="container-x flex h-[4.5rem] items-center justify-between gap-4">
          <Link href={localePath(locale, "/")} className="flex min-w-0 items-center gap-3" aria-label={site.headerName}>
            {/* The FDHS header logo, byte-exact from the practice (keep-list). */}
            <Image
              src="/images/brand/header-logo-fdhs.webp"
              alt=""
              width={300}
              height={146}
              priority
              className="h-11 w-auto flex-none sm:h-12"
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-[var(--font-display)] text-[1.05rem] text-[var(--color-navy)] sm:text-[1.2rem]">
                Westchase Gastroenterology
              </span>
              <span className="block truncate text-[0.72rem] font-bold text-[var(--color-teal-ink)]">
                Florida Digestive Health Specialists
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label={c.menu}>
            {nav.map((item, i) =>
              item.children ? (
                <div key={item.label} className="relative">
                  <button
                    type="button"
                    aria-expanded={open === i}
                    onClick={() => setOpen(open === i ? null : i)}
                    className={`flex items-center gap-1 rounded-md px-3 py-2 font-bold text-[0.98rem] transition-colors hover:bg-[var(--color-mint)] ${
                      open === i ? "bg-[var(--color-mint)]" : ""
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-4 w-4 text-[var(--color-teal-ink)] transition-transform duration-200 ${
                        open === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open === i && (
                    <div className="absolute left-0 top-full z-[var(--z-dropdown)] mt-2 w-72 rounded-[var(--radius-lg)] bg-white p-2 shadow-[var(--shadow-card)]">
                      {item.children.map((child) =>
                        child.external ? (
                          <a
                            key={child.label}
                            href={child.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 rounded-md px-3 py-2.5 font-semibold text-[var(--color-body)] transition-colors hover:bg-[var(--color-mint)] hover:text-[var(--color-ink)]"
                          >
                            {child.label}
                            <ExternalLink className="h-3.5 w-3.5 flex-none text-[var(--color-muted)]" />
                          </a>
                        ) : (
                          <Link
                            key={child.label}
                            href={child.href}
                            className="block rounded-md px-3 py-2.5 font-semibold text-[var(--color-body)] transition-colors hover:bg-[var(--color-mint)] hover:text-[var(--color-ink)]"
                          >
                            {child.label}
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href!}
                  className={`rounded-md px-3 py-2 font-bold text-[0.98rem] transition-colors hover:bg-[var(--color-mint)] ${
                    pathname === item.href ? "text-[var(--color-teal-ink)]" : ""
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
            <Link href={localePath(locale, "/appointment")} className="btn btn-amber btn-sm ml-2">
              {c.requestAppointment}
            </Link>
          </nav>

          <button
            type="button"
            className="rounded-md p-2 transition-colors hover:bg-[var(--color-mint)] lg:hidden"
            aria-expanded={drawer}
            aria-label={drawer ? c.close : c.menu}
            onClick={() => setDrawer(!drawer)}
          >
            {drawer ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-x-0 bottom-0 top-[7rem] z-[var(--z-drawer)] overflow-y-auto bg-white xl:hidden">
          <nav className="container-x flex flex-col gap-1 py-5" aria-label={c.menu}>
            <Link
              href={localePath(locale, "/")}
              className="rounded-md px-3 py-3 text-lg font-bold hover:bg-[var(--color-mint)]"
            >
              {c.nav.home}
            </Link>
            {nav.map((item) =>
              item.children ? (
                <div key={item.label} className="mt-1">
                  <p className="px-3 pb-1 pt-3 text-[0.8rem] font-extrabold uppercase tracking-wide text-[var(--color-muted)]">
                    {item.label}
                  </p>
                  {item.children.map((child) =>
                    child.external ? (
                      <a
                        key={child.label}
                        href={child.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 rounded-md px-3 py-3 text-lg font-semibold hover:bg-[var(--color-mint)]"
                      >
                        {child.label}
                        <ExternalLink className="h-4 w-4 flex-none text-[var(--color-muted)]" />
                      </a>
                    ) : (
                      <Link
                        key={child.label}
                        href={child.href}
                        className="block rounded-md px-3 py-3 text-lg font-semibold hover:bg-[var(--color-mint)]"
                      >
                        {child.label}
                      </Link>
                    )
                  )}
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href!}
                  className="rounded-md px-3 py-3 text-lg font-bold hover:bg-[var(--color-mint)]"
                >
                  {item.label}
                </Link>
              )
            )}
            <a
              href={site.links.portal}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-md px-3 py-3 text-lg font-bold hover:bg-[var(--color-mint)]"
            >
              {c.patientPortal}
              <ExternalLink className="h-4 w-4 flex-none text-[var(--color-muted)]" />
            </a>
            <div className="mt-4 grid gap-3 border-t border-[var(--color-line)] pt-5">
              <Link href={localePath(locale, "/appointment")} className="btn btn-amber btn-lg">
                {c.requestAppointment}
              </Link>
              <a href={site.phone.href} className="btn btn-outline">
                <Phone className="h-4 w-4" /> {c.callUs}
              </a>
              <a href={site.textLine.href} className="btn btn-outline">
                <MessageSquare className="h-4 w-4" /> {c.textUs}
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
