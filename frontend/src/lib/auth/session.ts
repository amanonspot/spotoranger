"use client";

import { useEffect, useState } from "react";

export type SessionUser = {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  rangerId: string | null;
};

const SESSION_KEY = "spoto-ranger-session";
const TOKEN_KEY = "spoto-ranger-token";

export function setSession(user: SessionUser, token?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  window.dispatchEvent(new Event("spoto-session-change"));
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
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
