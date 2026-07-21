"use client";

import { useEffect, useState } from "react";

/**
 * Admin session: the JWT + profile returned by /auth/otp/verify. The token is
 * attached as a Bearer credential on every admin API call (see api/client.ts).
 */
export type SessionUser = {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  rangerId: string | null;
};

export type AdminSession = {
  token: string;
  user: SessionUser;
};

const STORAGE_KEY = "spoto-admin-session";

export function setSession(session: AdminSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("spoto-admin-session-change"));
}

export function getSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("spoto-admin-session-change"));
}

export function useSession(): { session: AdminSession | null; loading: boolean } {
  const [session, setSessionState] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const read = () => {
      setSessionState(getSession());
      setLoading(false);
    };
    read();
    window.addEventListener("spoto-admin-session-change", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("spoto-admin-session-change", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return { session, loading };
}
