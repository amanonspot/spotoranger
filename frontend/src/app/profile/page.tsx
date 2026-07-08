"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, MapPin, Smartphone, UserRound, Wallet } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import {
  getNotifications,
  getRangerProfile,
  type NotificationItem,
  type RangerProfile,
} from "@/lib/api/ranger";
import { clearSession, useSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

const PLATFORM_LABELS: Record<string, string> = {
  zomato: "Zomato",
  swiggy: "Swiggy",
  blinkit: "Blinkit",
  zepto: "Zepto",
  bigbasket: "BigBasket",
  swish: "Swish",
  other: "Other",
};

function ProfileContent() {
  const router = useRouter();
  const { session } = useSession();
  const rangerId = session?.rangerId ?? null;
  const userId = session?.id ?? null;
  const [profile, setProfile] = useState<RangerProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (rangerId) getRangerProfile(rangerId).then(setProfile).catch(() => setProfile(null));
    if (userId) getNotifications(userId).then(setNotifications).catch(() => setNotifications([]));
  }, [rangerId, userId]);

  function handleLogout() {
    clearSession();
    router.replace("/onboarding");
  }

  const rows = [
    { icon: Smartphone, label: "Phone", value: profile?.phone ?? session?.phone ?? "—" },
    {
      icon: Wallet,
      label: "Delivery platform",
      value: profile ? PLATFORM_LABELS[profile.deliveryPlatform] ?? profile.deliveryPlatform : "—",
    },
    { icon: MapPin, label: "Preferred area", value: profile?.preferredArea ?? "—" },
    { icon: Wallet, label: "UPI ID", value: profile?.upiId ?? "—" },
  ];

  return (
    <>
      <header className="pb-4">
        <p className="text-sm font-semibold text-spoto-purple">Profile</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-spoto-ink">Your account</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpotoCard>
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-spoto-purple/20 text-spoto-purple">
              <UserRound className="h-7 w-7" />
            </span>
            <div>
              <p className="font-heading text-lg font-bold text-spoto-ink">
                {profile?.fullName ?? session?.fullName ?? "Ranger"}
              </p>
              <p className="text-sm text-spoto-muted">Spoto Ranger</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-spoto-line">
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-spoto-muted">
                    <Icon className="h-4 w-4" /> {row.label}
                  </span>
                  <span className="text-right font-heading text-sm font-semibold text-spoto-ink">
                    {row.value}
                  </span>
                </div>
              );
            })}
          </div>
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
