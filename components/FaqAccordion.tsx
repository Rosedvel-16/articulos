"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/types";

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <section className="mt-14 border-t border-ink-200 pt-10">
      <h2 className="font-display text-2xl font-semibold text-ink-950">
        Preguntas frecuentes
      </h2>
      <div className="mt-6 divide-y divide-ink-200 border border-ink-200 bg-white">
        {items.map((item, index) => {
          const open = openIndex === index;
          const panelId = `faq-panel-${index}`;
          const buttonId = `faq-button-${index}`;

          return (
            <div key={`${item.pregunta}-${index}`}>
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-brand-50 md:px-5"
                >
                  <span className="font-semibold text-ink-950">
                    {item.pregunta}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-ink-950 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!open}
                className="px-4 pb-4 text-ink-600 leading-relaxed md:px-5"
              >
                {item.respuesta}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
