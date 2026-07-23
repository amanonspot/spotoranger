/**
 * Bridge ranger OTP login → admin console.
 * Same origin (nginx / + /console) shares localStorage, so we write the
 * admin session key the admin app already reads.
 */
const ADMIN_SESSION_KEY = "spoto-admin-session";

export type AdminBridgeUser = {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  rangerId: string | null;
};

export function writeAdminSession(user: AdminBridgeUser, token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({ token, user }),
  );
  window.dispatchEvent(new Event("spoto-admin-session-change"));
}

export function goToAdminConsole(): void {
  if (typeof window === "undefined") return;
  window.location.assign("/console");
}

export function goToRangerLogin(): void {
  if (typeof window === "undefined") return;
  window.location.assign("/onboarding");
}
