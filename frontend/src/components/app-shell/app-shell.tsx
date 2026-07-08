"use client";

import { BottomNav } from "@/components/app-shell/bottom-nav";
import { RequireAuth } from "@/components/app-shell/require-auth";
import { SideNav } from "@/components/app-shell/side-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-spoto-bg">
        <SideNav />
        <div className="lg:pl-64">
          <main className="mx-auto w-full max-w-md px-4 pb-28 pt-6 sm:px-5 lg:max-w-5xl lg:px-8 lg:pb-12">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </RequireAuth>
  );
}
