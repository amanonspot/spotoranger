import Link from "next/link";
import { Slot } from "@radix-ui/react-slot";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// App-facing button wrapper. Styling comes entirely from the adopted Spoto
// design-system `buttonVariants` (@/components/ui/button); this only adds the
// href-as-Link convenience and an icon slot used across the Ranger screens.
type SpotoVariant = "primary" | "cta" | "secondary" | "outline" | "ghost";

const VARIANT_MAP: Record<SpotoVariant, "default" | "cta" | "secondary" | "outline" | "ghost"> = {
  primary: "default",
  cta: "cta",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
};

type SpotoButtonProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  icon?: ReactNode;
  type?: "button" | "submit";
  variant?: SpotoVariant;
  asChild?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export function SpotoButton({
  children,
  className,
  href,
  icon,
  type = "button",
  variant = "primary",
  asChild,
  disabled,
  onClick,
}: SpotoButtonProps) {
  const classes = cn(buttonVariants({ variant: VARIANT_MAP[variant], size: "xl" }), className);

  if (href) {
    return (
      <Link className={classes} href={href} onClick={onClick}>
        {icon}
        <span>{children}</span>
      </Link>
    );
  }

  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={classes} type={type} disabled={disabled} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </Comp>
  );
}
