"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight } from "lucide-react";

import Logo from "@/components/Logo";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoInput } from "@/design-system/components/input";
import { ApiError } from "@/lib/api/client";
import { requestOtp, verifyOtp } from "@/lib/api/admin";
import { setSession } from "@/lib/auth/session";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const phoneValid = /^\d{10}$/.test(phone);

  async function handleRequest() {
    if (!phoneValid) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestOtp(phone);
      setStep("otp");
      toast.success("OTP sent");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not send OTP. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length < 4) {
      setError("Enter the OTP sent to your phone.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await verifyOtp(phone, code);
      if (res.status !== "verified" || !res.user || !res.token) {
        setError(res.message || "Invalid or expired OTP. Please try again.");
        return;
      }
      if (res.user.role !== "admin") {
        setError("This number is not linked to an admin account.");
        return;
      }
      setSession({ token: res.token, user: res.user });
      toast.success("Signed in");
      router.push("/");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Verification failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="spoto-glow relative grid min-h-dvh place-items-center px-4 py-8">
      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center">
        <header className="mb-8 flex w-full flex-col items-center text-center">
          <Logo width={168} height={48} />
          <p className="mt-3 text-[11px] font-heading font-semibold uppercase tracking-[0.28em] text-spoto-purple">
            Admin Console
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-spoto-muted">
            Sign in to review leads, publish listings, and manage rewards.
          </p>
        </header>

        <SpotoCard className="w-full grid gap-5 p-6 sm:p-7">
          {step === "phone" ? (
            <>
              <div className="grid gap-1.5 text-center sm:text-left">
                <h1 className="font-heading text-lg font-semibold text-spoto-ink">Sign in</h1>
                <p className="text-sm text-spoto-muted">
                  Use your registered admin mobile number. We&apos;ll send a one-time code.
                </p>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-heading font-semibold text-spoto-ink">
                  Mobile number
                </span>
                <SpotoInput
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phone}
                  maxLength={10}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  autoComplete="tel"
                  className="h-12"
                />
              </label>

              {error && (
                <p className="rounded-spoto border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
                  {error}
                </p>
              )}

              <SpotoButton
                onClick={handleRequest}
                disabled={loading || !phoneValid}
                icon={<ArrowRight className="h-5 w-5" />}
                className="w-full"
              >
                {loading ? "Sending…" : "Send OTP"}
              </SpotoButton>
            </>
          ) : (
            <>
              <div className="grid gap-1.5 text-center sm:text-left">
                <h1 className="font-heading text-lg font-semibold text-spoto-ink">Verify OTP</h1>
                <p className="text-sm text-spoto-muted">
                  Code sent to{" "}
                  <span className="font-heading font-semibold text-spoto-ink">{phone}</span>
                </p>
              </div>

              <SpotoInput
                inputMode="numeric"
                placeholder="••••"
                value={code}
                maxLength={8}
                className="h-14 text-center text-2xl tracking-[0.4em]"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />

              {error && (
                <p className="rounded-spoto border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
                  {error}
                </p>
              )}

              <SpotoButton
                variant="cta"
                onClick={handleVerify}
                disabled={loading || code.length < 4}
                className="w-full"
              >
                {loading ? "Verifying…" : "Verify & continue"}
              </SpotoButton>

              <button
                type="button"
                className="text-center text-sm font-heading font-semibold text-spoto-muted transition hover:text-spoto-ink"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                }}
              >
                ← Change number
              </button>
            </>
          )}
        </SpotoCard>

        <p className="mt-6 text-center text-xs text-spoto-muted/80">
          Authorized Spoto personnel only
        </p>
      </div>
    </main>
  );
}
