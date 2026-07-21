"use client";

import { RequireAdmin } from "@/components/admin-shell/require-admin";
import { SideNav } from "@/components/admin-shell/side-nav";
import { MobileBottomNav, MobileTopBar } from "@/components/admin-shell/mobile-nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <div className="min-h-screen bg-spoto-bg">
        <SideNav />
        <MobileTopBar />
        <div className="lg:pl-64">
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </RequireAdmin>
  );
}
