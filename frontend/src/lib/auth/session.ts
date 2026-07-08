"use client";

import { useEffect, useState } from "react";

/**
 * Client-side mock session. This is development convenience only — NOT production
 * auth. It persists the profile returned by /auth/otp/verify in localStorage so
 * the ranger screens have a rangerId/userId to query with.
 */
export type SessionUser = {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  rangerId: string | null;
};

const STORAGE_KEY = "spoto-ranger-session";

export function setSession(user: SessionUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("spoto-session-change"));
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("spoto-session-change"));
}

/**
 * Reactive session hook. `loading` is true until the first client read completes,
 * so callers can avoid redirecting before localStorage is available.
 */
export function useSession(): { session: SessionUser | null; loading: boolean } {
  const [session, setSessionState] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const read = () => {
      setSessionState(getSession());
      setLoading(false);
    };
    read();
    window.addEventListener("spoto-session-change", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("spoto-session-change", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return { session, loading };
}
