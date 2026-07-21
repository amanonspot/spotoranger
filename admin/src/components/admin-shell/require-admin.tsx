"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth/session";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useSession();
  const isAdmin = session?.user.role === "admin";

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/login");
    }
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-spoto-bg">
        <p className="text-sm text-spoto-muted">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
