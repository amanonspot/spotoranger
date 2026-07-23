"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { clearSession, getToken, useSession } from "@/lib/auth/session";
import { goToAdminConsole, writeAdminSession } from "@/lib/auth/admin-bridge";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    const token = getToken();
    if (!session || !token) {
      clearSession();
      router.replace("/onboarding");
      return;
    }
    // Admins use the same OTP login, then land in the console — not the Ranger PWA.
    if (session.role === "admin") {
      writeAdminSession(session, token);
      clearSession();
      goToAdminConsole();
    }
  }, [loading, session, router]);

  if (loading || !session || !getToken() || session.role === "admin") {
    return (
      <div className="grid min-h-screen place-items-center bg-spoto-bg">
        <p className="text-sm text-spoto-muted">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
