"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { NAV_ITEMS, isActive } from "@/components/admin-shell/nav-items";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-spoto-line bg-spoto-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <Logo width={92} height={26} />
      <span className="text-[10px] font-heading font-semibold uppercase tracking-[0.3em] text-spoto-purple">
        Admin
      </span>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-spoto-line bg-spoto-surface/95 px-3 pb-3 pt-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-3 gap-1">
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
