"use client";

import React from "react";

// Adopted verbatim from the Spoto design system
// (github.com/amanonspot/Spotowebapp, src/components/revamp/PrimaryButton.tsx).
interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "purple" | "green" | "ghost";
  className?: string;
  type?: "button" | "submit" | "reset";
}

export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  variant = "purple",
  className = "",
  type = "button",
}: PrimaryButtonProps) {
  const variantClasses =
    variant === "green"
      ? "bg-[#B7F041] text-[#141414] hover:shadow-[0_6px_20px_rgba(183,240,65,0.3)]"
      : variant === "ghost"
      ? "bg-transparent border border-[#AF7AEB] text-white hover:bg-[#AF7AEB]/10"
      : "bg-[#A67AEB] text-white hover:shadow-[0_6px_20px_rgba(166,122,235,0.4)]";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-shimmer rounded-xl px-6 py-3 text-base font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AF7AEB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090f] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none disabled:shadow-none ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
}
