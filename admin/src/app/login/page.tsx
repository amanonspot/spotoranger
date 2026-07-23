"use client";

import { useEffect } from "react";

/**
 * Admin auth uses the shared Ranger OTP page at /onboarding.
 * Backend returns role=admin and the ranger app redirects here after login.
 */
export default function AdminLoginPage() {
  useEffect(() => {
    window.location.replace("/onboarding");
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-spoto-bg px-4">
      <p className="text-sm text-spoto-muted">Redirecting to login…</p>
    </main>
  );
}
