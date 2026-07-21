"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Bell, LogOut, Save, UserRound } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoInput, SpotoSelect } from "@/design-system/components/input";
import { ApiError } from "@/lib/api/client";
import {
  getNotifications,
  getRangerProfile,
  updateRangerProfile,
  type NotificationItem,
  type RangerProfile,
} from "@/lib/api/ranger";
import { clearSession, setSession, useSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

function ProfileContent() {
  const router = useRouter();
  const { session } = useSession();
  const rangerId = session?.rangerId ?? null;
  const userId = session?.id ?? null;
  const [profile, setProfile] = useState<RangerProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [fullName, setFullName] = useState("");
  const [platform, setPlatform] = useState("other");
  const [area, setArea] = useState("");
  const [upiId, setUpiId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rangerId) {
      getRangerProfile(rangerId)
        .then((p) => {
          setProfile(p);
          setFullName(p.fullName);
          setPlatform(p.deliveryPlatform || "other");
          setArea(p.preferredArea || "");
          setUpiId(p.upiId || "");
        })
        .catch(() => setProfile(null));
    }
    if (userId) {
      getNotifications(userId).then(setNotifications).catch(() => setNotifications([]));
    }
  }, [rangerId, userId]);

  function handleLogout() {
    clearSession();
    router.replace("/onboarding");
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!rangerId || !session) return;
    setSaving(true);
    try {
      const updated = await updateRangerProfile(rangerId, {
        fullName: fullName.trim(),
        deliveryPlatform: platform,
        preferredArea: area.trim(),
        upiId: upiId.trim(),
      });
      setProfile(updated);
      setSession(
        {
          ...session,
          fullName: updated.fullName,
          rangerId: updated.id,
        },
        undefined,
      );
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="pb-4">
        <p className="text-sm font-semibold text-spoto-purple">Profile</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-spoto-ink">Your account</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpotoCard>
          <div className="mb-4 flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-spoto-purple/20 text-spoto-purple">
              <UserRound className="h-7 w-7" />
            </span>
            <div>
              <p className="font-heading text-lg font-bold text-spoto-ink">
                {profile?.fullName ?? session?.fullName ?? "Ranger"}
              </p>
              <p className="text-sm text-spoto-muted">
                {profile?.phone ?? session?.phone ?? "—"}
              </p>
            </div>
          </div>

          <form className="grid gap-3" onSubmit={handleSave}>
            <label className="grid gap-2">
              <span className="text-sm font-heading font-semibold text-spoto-ink">Full name</span>
              <SpotoInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-heading font-semibold text-spoto-ink">
                Delivery platform
              </span>
              <SpotoSelect value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="zomato">Zomato</option>
                <option value="swiggy">Swiggy</option>
                <option value="blinkit">Blinkit</option>
                <option value="zepto">Zepto</option>
                <option value="bigbasket">BigBasket</option>
                <option value="swish">Swish</option>
                <option value="other">Other</option>
              </SpotoSelect>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-heading font-semibold text-spoto-ink">
                Preferred area
              </span>
              <SpotoInput value={area} onChange={(e) => setArea(e.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-heading font-semibold text-spoto-ink">UPI ID</span>
              <SpotoInput
                placeholder="name@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </label>
            <SpotoButton type="submit" disabled={saving || !rangerId} icon={<Save className="h-5 w-5" />}>
              {saving ? "Saving…" : "Save changes"}
            </SpotoButton>
          </form>
        </SpotoCard>

        <SpotoCard>
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-spoto-ink">
            <Bell className="h-5 w-5 text-spoto-purple" /> Notifications
          </h2>
          {notifications.length > 0 ? (
            <div className="grid gap-3">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-spoto bg-spoto-surface-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading text-sm font-semibold text-spoto-ink">{n.title}</p>
                    <span className="text-xs text-spoto-muted">{formatDate(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/80">{n.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-spoto-muted">No notifications yet.</p>
          )}
        </SpotoCard>
      </div>

      <div className="mt-6">
        <SpotoButton variant="outline" onClick={handleLogout} icon={<LogOut className="h-5 w-5" />}>
          Log out
        </SpotoButton>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileContent />
    </AppShell>
  );
}
