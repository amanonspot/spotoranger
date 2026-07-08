"use client";

import React from "react";

// Adopted verbatim from the Spoto design system
// (github.com/amanonspot/Spotowebapp, src/components/revamp/Chip.tsx).
interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  /** Home landing: purple-outline active state, full pills (matches marketing hero). */
  tone?: "default" | "hero";
}

export default function Chip({ label, selected = false, onClick, className = "", tone = "default" }: ChipProps) {
  const heroClasses = selected
    ? "rounded-full border-[#A67AEB] bg-[#A67AEB]/12 text-white shadow-[0_0_24px_rgba(166,122,235,0.35)]"
    : "rounded-full border-white/25 bg-[#0c0c10] text-white/90 hover:border-[#A67AEB]/55 hover:bg-[#14141a] hover:shadow-[0_0_18px_rgba(166,122,235,0.12)]";

  const defaultClasses = selected
    ? "rounded-xl border-[#B7F041] bg-[#B7F041] text-[#101010] shadow-[0_4px_16px_rgba(183,240,65,0.3)]"
    : "rounded-xl border-white/20 bg-[#151515] text-white/85 hover:border-[#AF7AEB]/60 hover:bg-[#1c1c24] hover:text-white hover:shadow-[0_4px_14px_rgba(166,122,235,0.15)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 overflow-hidden border font-semibold transition-all duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AF7AEB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090f] ${
        tone === "hero" ? `px-4 py-2.5 text-sm sm:px-5 sm:py-3 sm:text-base ${heroClasses}` : `px-4 py-2.5 text-sm ${defaultClasses}`
      } ${className}`}
    >
      {label}
    </button>
  );
}
