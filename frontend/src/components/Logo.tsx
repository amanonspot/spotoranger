"use client";

import React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import lightLogo from "../../public/logos/light.png";
import darkLogo from "../../public/logos/dark.png";

// Adopted from the Spoto design system
// (github.com/amanonspot/Spotowebapp, src/components/Logo.tsx).
interface LogoProps {
  className?: string;
  /** light = wordmark for dark backgrounds; dark = for light headers */
  variant?: "light" | "dark";
  width?: number;
  height?: number;
}

export default function Logo({ className = "", variant = "light", width = 140, height = 40 }: LogoProps) {
  const logoSrc = variant === "light" ? lightLogo : darkLogo;
  const glowClass = variant === "light" ? "spoto-logo-glow" : "spoto-logo-glow-dark";

  return (
    <div className={cn("flex items-center justify-center", glowClass, className)}>
      <Image
        src={logoSrc}
        alt="SPOTO"
        width={width}
        height={height}
        className="h-auto object-contain"
        priority
      />
    </div>
  );
}
