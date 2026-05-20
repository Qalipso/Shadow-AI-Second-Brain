"use client";

import { useState } from "react";
import { GLOSSARY } from "@/lib/glossary";
import { SectionGroup } from "./Rows";

export function GlossarySection() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <SectionGroup title="Shadow Glossary" description="Key terms used across the app.">
      <div className="space-y-1">
        {GLOSSARY.map((item) => {
          const isOpen = expanded === item.term;
          return (
            <button
              key={item.term}
              type="button"
              onClick={() => setExpanded(isOpen ? null : item.term)}
              className="w-full text-left rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] group"
              aria-expanded={isOpen}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {item.term}
                  </span>
                  {!isOpen && (
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                      {item.short}
                    </p>
                  )}
                  {isOpen && (
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {item.detail}
                    </p>
                  )}
                </div>
                <span
                  className="flex-shrink-0 mt-0.5 text-zinc-700 group-hover:text-zinc-500 transition-all duration-200"
                  style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  aria-hidden
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </SectionGroup>
  );
}
