import { apiClient } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/session";

export type VerifyResponse = {
  status: "verified" | "invalid";
  user: SessionUser | null;
  token: string | null;
  message?: string | null;
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
  latitude?: number | null;
  longitude?: number | null;
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
  withdrawal?: {
    id: string;
    amount: number;
    upiId: string;
    status: string;
    createdAt: string;
  };
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

export type CreateLeadPayload = {
  building_name: string;
  area: string;
  owner_name: string;
  owner_phone: string;
  bhk: "1_rk" | "1_bhk" | "2_bhk" | "3_bhk" | "4_bhk_plus";
  monthly_rent: number;
  deposit: number;
  latitude?: number | null;
  longitude?: number | null;
  maps_place_id?: string;
  flat_number?: string;
  floor?: string;
  notes?: string;
};

export type UpdateRangerPayload = {
  fullName?: string;
  deliveryPlatform?: string;
  preferredArea?: string;
  upiId?: string;
};

export function requestOtp(phone: string, fullName?: string): Promise<{ message: string }> {
  return apiClient("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ phone, fullName: fullName || undefined }),
  });
}

export function verifyOtp(
  phone: string,
  code: string,
  extras?: {
    fullName?: string;
    deliveryPlatform?: string;
    preferredArea?: string;
    upiId?: string;
  },
): Promise<VerifyResponse> {
  return apiClient("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({
      phone,
      code,
      fullName: extras?.fullName,
      deliveryPlatform: extras?.deliveryPlatform,
      preferredArea: extras?.preferredArea,
      upiId: extras?.upiId,
    }),
  });
}

export function getWallet(rangerId: string): Promise<WalletSummary> {
  return apiClient(`/wallet/${rangerId}`);
}

export function requestWithdrawal(
  rangerId: string,
  payload?: { amount?: number; upiId?: string },
): Promise<WalletSummary> {
  return apiClient(`/wallet/${rangerId}/withdraw`, {
    method: "POST",
    body: JSON.stringify({
      amount: payload?.amount,
      upiId: payload?.upiId,
    }),
  });
}

export function listLeads(rangerId: string, status?: string): Promise<LeadSummary[]> {
  const params = new URLSearchParams({ ranger_id: rangerId });
  if (status) params.set("status", status);
  return apiClient(`/properties?${params.toString()}`);
}

export function getLead(id: string): Promise<LeadDetail> {
  return apiClient(`/properties/${id}`);
}

export function createLead(payload: CreateLeadPayload): Promise<LeadDetail> {
  return apiClient("/properties", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getNotifications(userId: string): Promise<NotificationItem[]> {
  return apiClient(`/notifications?user_id=${userId}`);
}

export function getRangerProfile(rangerId: string): Promise<RangerProfile> {
  return apiClient(`/ranger/${rangerId}`);
}

export function updateRangerProfile(
  rangerId: string,
  payload: UpdateRangerPayload,
): Promise<RangerProfile> {
  return apiClient(`/ranger/${rangerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
