"use client";

import { cn } from "@/lib/utils";

// Adopted from the Spoto design system.
// Uses an inline wordmark so the app works without binary logo assets.
interface LogoProps {
  className?: string;
  /** light = wordmark for dark backgrounds; dark = for light headers */
  variant?: "light" | "dark";
  width?: number;
  height?: number;
}

export default function Logo({
  className = "",
  variant = "light",
  width = 140,
  height = 40,
}: LogoProps) {
  const glowClass = variant === "light" ? "spoto-logo-glow" : "spoto-logo-glow-dark";
  const fill = variant === "light" ? "#F4F0FF" : "#1A0B2E";

  return (
    <div className={cn("flex items-center justify-center", glowClass, className)}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 180 40"
        role="img"
        aria-label="SPOTO"
        className="h-auto object-contain"
      >
        <text
          x="0"
          y="30"
          fill={fill}
          fontFamily="var(--font-heading, ui-sans-serif, system-ui)"
          fontSize="32"
          fontWeight="800"
          letterSpacing="0.08em"
        >
          SPOTO
        </text>
      </svg>
    </div>
  );
}
