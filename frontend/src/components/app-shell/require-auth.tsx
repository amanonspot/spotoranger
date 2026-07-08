"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth/session";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/onboarding");
    }
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-spoto-bg">
        <p className="text-sm text-spoto-muted">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
