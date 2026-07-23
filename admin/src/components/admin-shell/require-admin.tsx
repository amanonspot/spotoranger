"use client";

import { useEffect } from "react";

import { useSession } from "@/lib/auth/session";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const isAdmin = session?.user.role === "admin";

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      // Shared login lives on the Ranger app (same host).
      window.location.replace("/onboarding");
    }
  }, [loading, isAdmin]);

  if (loading || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-spoto-bg">
        <p className="text-sm text-spoto-muted">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
