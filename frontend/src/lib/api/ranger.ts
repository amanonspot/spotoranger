import { apiClient } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/session";

export type VerifyResponse = {
  status: "verified" | "invalid";
  user: SessionUser | null;
};

export type LeadSummary = {
  id: string;
  buildingName: string;
  area: string;
  rent: number;
  status: string;
  reward: number;
  submittedAt: string;
};

export type LeadStatusHistory = {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  suggestion: string;
  changedAt: string;
};

export type LeadDetail = LeadSummary & {
  ownerName: string;
  ownerPhone: string;
  bhk: string;
  deposit: number;
  flatNumber: string;
  floor: string;
  notes: string;
  statusHistory: LeadStatusHistory[];
};

export type WalletTransaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
};

export type WalletSummary = {
  rangerId: string;
  currentBalance: number;
  lifetimeEarnings: number;
  pendingRewards: number;
  withdrawnAmount: number;
  transactions: WalletTransaction[];
};

export type RangerProfile = {
  id: string;
  fullName: string;
  phone: string;
  deliveryPlatform: string;
  preferredArea: string;
  upiId: string;
  isActiveRanger: boolean;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  actionUrl: string;
  createdAt: string;
};

export function requestOtp(phone: string): Promise<{ message: string }> {
  return apiClient("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function verifyOtp(phone: string, code: string): Promise<VerifyResponse> {
  return apiClient("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export function getWallet(rangerId: string): Promise<WalletSummary> {
  return apiClient(`/wallet/${rangerId}`);
}

export function listLeads(rangerId: string, status?: string): Promise<LeadSummary[]> {
  const params = new URLSearchParams({ ranger_id: rangerId });
  if (status) params.set("status", status);
  return apiClient(`/properties?${params.toString()}`);
}

export function getLead(id: string): Promise<LeadDetail> {
  return apiClient(`/properties/${id}`);
}

export function getNotifications(userId: string): Promise<NotificationItem[]> {
  return apiClient(`/notifications?user_id=${userId}`);
}

export function getRangerProfile(rangerId: string): Promise<RangerProfile> {
  return apiClient(`/ranger/${rangerId}`);
}
