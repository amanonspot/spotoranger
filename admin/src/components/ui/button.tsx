import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Adopted from the Spoto design system (github.com/amanonspot/Spotowebapp,
// src/components/ui/button.tsx). The `cta` variant (lime green) is the only
// addition, for the Ranger app's primary submit/withdraw actions.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-montserrat font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-[#AF7AEB]/50",
  {
    variants: {
      variant: {
        default: "bg-[#AF7AEB] text-white hover:bg-[#9575e6] shadow-lg hover:shadow-[#AF7AEB]/30",
        cta: "bg-[#B7F041] text-[#101010] hover:bg-[#a5db35] shadow-lg hover:shadow-[#B7F041]/30",
        destructive: "bg-red-500 text-white hover:bg-red-500/90",
        outline: "border-2 border-white/30 bg-transparent text-white hover:bg-white/5 hover:border-white/40",
        secondary: "bg-[#262929] text-white hover:bg-[#3a3a3a] border border-white/10",
        ghost: "hover:bg-white/10 text-white",
        link: "text-[#AF7AEB] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 has-[>svg]:px-4",
        xl: "min-h-14 rounded-xl px-6 text-base has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
