"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "@/components/app-shell/nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-spoto-line bg-spoto-surface/95 px-3 pb-3 pt-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-4 gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-spoto text-xs font-heading font-semibold text-spoto-muted transition-colors",
                active && "bg-spoto-purple/15 text-spoto-purple",
              )}
            >
              <Icon aria-hidden className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
