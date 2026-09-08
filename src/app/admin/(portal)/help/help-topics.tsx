"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Accordion } from "@/components/ui/accordion";

export function HelpTopics({ children }: { readonly children: ReactNode }) {
  const [openTopics, setOpenTopics] = useState<string[]>(["appointment-workflow-guide"]);

  useEffect(() => {
    function revealLinkedTopic() {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target?.dataset.slot !== "accordion-item") return;
      setOpenTopics((current) => (current.includes(target.id) ? current : [...current, target.id]));
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start" });
      });
    }

    revealLinkedTopic();
    window.addEventListener("hashchange", revealLinkedTopic);
    return () => {
      window.removeEventListener("hashchange", revealLinkedTopic);
    };
  }, []);

  return (
    <Accordion multiple hiddenUntilFound value={openTopics} onValueChange={setOpenTopics}>
      {children}
    </Accordion>
  );
}
