"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { NAV_ITEMS, isActive } from "@/components/admin-shell/nav-items";
import { clearSession, useSession } from "@/lib/auth/session";

export function SideNav() {
  const pathname = usePathname();
  const { session } = useSession();

  function logout() {
    clearSession();
    window.location.replace("/onboarding");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-spoto-line bg-spoto-surface px-4 py-6 lg:flex">
      <div className="flex flex-col items-start gap-1 px-2">
        <Logo width={120} height={34} />
        <p className="pl-1 text-[10px] font-heading font-semibold uppercase tracking-[0.3em] text-spoto-purple">
          Admin
        </p>
      </div>

      <nav className="mt-8 grid gap-1">
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

      <div className="mt-auto border-t border-spoto-line pt-4">
        <p className="px-2 text-sm font-heading font-semibold text-spoto-ink">{session?.user.fullName}</p>
        <p className="px-2 text-xs text-spoto-muted">{session?.user.phone}</p>
        <button
          onClick={logout}
          className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-spoto px-3 text-sm font-heading font-semibold text-spoto-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </aside>
  );
}
