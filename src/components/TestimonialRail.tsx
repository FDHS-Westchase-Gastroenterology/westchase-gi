"use client";

import { useRef } from "react";
import { testimonials } from "@/lib/testimonials";
import { ChevronLeft, ChevronRight, Star } from "./icons";

type TestimonialRailProps = {
  label: string;
  prevLabel: string;
  nextLabel: string;
};

/**
 * The 11 published patient testimonials, verbatim, on a scroll-snap rail.
 * Native touch scrolling; buttons assist pointer users.
 */
export function TestimonialRail({ label, prevLabel, nextLabel }: TestimonialRailProps) {
  const railRef = useRef<HTMLUListElement | null>(null);

  function scroll(dir: 1 | -1) {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 360;
    rail.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <div>
      <ul ref={railRef} className="rail" aria-label={label}>
        {testimonials.map((t) => (
          <li key={t.name + t.quote.slice(0, 16)}>
            <figure className="card flex flex-col gap-5 p-7">
              <div>
                <p className="flex gap-0.5 text-[var(--color-amber)]" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4" />
                  ))}
                </p>
                <blockquote className="mt-4">
                  <p className="text-[0.98rem] leading-relaxed">“{t.quote}”</p>
                </blockquote>
              </div>
              <figcaption className="font-bold text-[var(--color-ink)]">{t.name}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <div className="container-x mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label={prevLabel}
          className="rounded-full border-[1.5px] border-[var(--color-line-2)] p-2.5 transition-colors hover:border-[var(--color-navy)] hover:bg-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label={nextLabel}
          className="rounded-full border-[1.5px] border-[var(--color-line-2)] p-2.5 transition-colors hover:border-[var(--color-navy)] hover:bg-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
