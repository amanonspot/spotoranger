import { apiClient } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/session";

export type VerifyResponse = {
  status: "verified" | "invalid";
  user: SessionUser | null;
  token: string | null;
};

export type AdminStats = {
  totalSubmissions: number;
  pendingReview: number;
  verified: number;
  listed: number;
  rewardCredited: number;
  rewardsPaid: number;
  activeRangers: number;
  byStatus: Record<string, number>;
};

export type SubmissionRow = {
  id: string;
  shortId: string;
  buildingName: string;
  area: string;
  rent: number;
  status: string;
  reward: number;
  rangerId: string;
  rangerName: string;
  submittedAt: string;
};

export type StatusHistory = {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  suggestion: string;
  changedAt: string;
};

export type SubmissionDetail = SubmissionRow & {
  ownerName: string;
  ownerPhone: string;
  bhk: string;
  deposit: number;
  flatNumber: string;
  floor: string;
  notes: string;
  rangerPhone: string;
  statusHistory: StatusHistory[];
};

export type RangerRow = {
  id: string;
  shortId: string;
  fullName: string;
  phone: string;
  deliveryPlatform: string;
  preferredArea: string;
  submissionCount: number;
  walletBalance: number;
  isActive: boolean;
};

export type RangerDetail = {
  id: string;
  shortId: string;
  fullName: string;
  phone: string;
  deliveryPlatform: string;
  preferredArea: string;
  upiId: string;
  isActive: boolean;
  wallet: {
    currentBalance: number;
    lifetimeEarnings: number;
    pendingRewards: number;
    withdrawnAmount: number;
  };
  submissions: SubmissionRow[];
};

export function requestOtp(phone: string): Promise<{ message: string }> {
  return apiClient("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) });
}

export function verifyOtp(phone: string, code: string): Promise<VerifyResponse> {
  return apiClient("/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code }) });
}

export function getStats(): Promise<AdminStats> {
  return apiClient("/admin/stats");
}

export function listSubmissions(params?: { status?: string; ranger_id?: string; search?: string }): Promise<SubmissionRow[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.ranger_id) q.set("ranger_id", params.ranger_id);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  return apiClient(`/admin/submissions${qs ? `?${qs}` : ""}`);
}

export function getSubmission(id: string): Promise<SubmissionDetail> {
  return apiClient(`/admin/submissions/${id}`);
}

export function changeStatus(
  id: string,
  body: { status: string; reason?: string; suggestion?: string },
): Promise<SubmissionDetail> {
  return apiClient(`/admin/submissions/${id}/status`, { method: "POST", body: JSON.stringify(body) });
}

/** Reward step — enabled only after a submission is verified. Credits a flat ₹100. */
export function sendReward(id: string): Promise<SubmissionDetail> {
  return apiClient(`/admin/submissions/${id}/reward`, { method: "POST" });
}

export function getDemo(): Promise<{ id: string; buildingName: string; status: string }> {
  return apiClient("/admin/demo");
}

export function resetDemo(): Promise<{ status: string; id: string }> {
  return apiClient("/admin/demo/reset", { method: "POST" });
}

export const DEMO_LISTING_NAME = "Demo Listing — Practice";

export function listRangers(): Promise<RangerRow[]> {
  return apiClient("/admin/rangers");
}

export function getRanger(id: string): Promise<RangerDetail> {
  return apiClient(`/admin/rangers/${id}`);
}

export function inviteRanger(phone: string): Promise<{ inviteCode: string; inviteLink: string; phone: string }> {
  return apiClient("/admin/rangers/invite", { method: "POST", body: JSON.stringify({ phone }) });
}
