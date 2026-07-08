"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { NAV_ITEMS, isActive } from "@/components/app-shell/nav-items";

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-spoto-line bg-spoto-surface px-4 py-6 lg:flex">
      <div className="flex flex-col items-start gap-1 px-2">
        <Logo width={120} height={34} />
        <p className="pl-1 text-[10px] font-heading font-semibold uppercase tracking-[0.3em] text-spoto-purple">
          Ranger
        </p>
      </div>

      <Link
        href="/submit"
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-spoto bg-spoto-green px-4 font-heading font-semibold text-[#101010] transition-colors hover:bg-spoto-green-hover"
      >
        <Plus className="h-5 w-5" />
        Submit House
      </Link>

      <nav className="mt-6 grid gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-spoto px-3 font-heading font-semibold text-spoto-muted transition-colors hover:bg-white/5 hover:text-white",
                active && "bg-spoto-purple/15 text-spoto-purple hover:bg-spoto-purple/15 hover:text-spoto-purple",
              )}
            >
              <Icon aria-hidden className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
