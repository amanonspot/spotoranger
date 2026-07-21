"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight } from "lucide-react";

import Logo from "@/components/Logo";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoInput } from "@/design-system/components/input";
import { requestOtp, verifyOtp } from "@/lib/api/admin";
import { setSession } from "@/lib/auth/session";

const DEMO_PHONE = "8888888888";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequest() {
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestOtp(phone);
      setStep("otp");
      toast.success("OTP sent");
    } catch {
      setError("Could not send OTP. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length < 4) {
      setError("Enter the 4-digit code.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await verifyOtp(phone, code);
      if (res.status !== "verified" || !res.user || !res.token) {
        setError("Invalid code. Try 0000 for the demo admin.");
        return;
      }
      if (res.user.role !== "admin") {
        setError("This is not an admin account.");
        return;
      }
      setSession({ token: res.token, user: res.user });
      toast.success("Welcome to the Spoto admin console");
      router.push("/");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="spoto-glow relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo width={180} height={52} />
          <p className="mt-1 text-xs font-heading font-semibold uppercase tracking-[0.3em] text-spoto-purple">
            Admin Console
          </p>
          <p className="mt-3 text-sm text-spoto-muted">Review submissions · publish listings · credit rewards</p>
        </div>

        <SpotoCard className="grid gap-4">
          {step === "phone" ? (
            <>
              <label className="grid gap-2">
                <span className="text-sm font-heading font-semibold text-spoto-ink">Admin mobile number</span>
                <SpotoInput
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phone}
                  maxLength={10}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  autoComplete="tel"
                />
              </label>
              {error && <p className="text-sm font-medium text-red-400">{error}</p>}
              <SpotoButton onClick={handleRequest} disabled={loading} icon={<ArrowRight className="h-5 w-5" />}>
                {loading ? "Sending…" : "Send OTP"}
              </SpotoButton>
              <p className="rounded-spoto bg-spoto-surface-2 px-4 py-3 text-center text-xs text-spoto-muted">
                Demo admin → phone <span className="font-heading font-bold text-spoto-green">{DEMO_PHONE}</span>, OTP{" "}
                <span className="font-heading font-bold text-spoto-green">0000</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-spoto-muted">
                Enter the code sent to <span className="font-heading font-semibold text-spoto-ink">{phone}</span>.
              </p>
              <SpotoInput
                inputMode="numeric"
                placeholder="0000"
                value={code}
                maxLength={8}
                className="text-center text-2xl tracking-[0.5em]"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
              {error && <p className="text-sm font-medium text-red-400">{error}</p>}
              <SpotoButton variant="cta" onClick={handleVerify} disabled={loading}>
                {loading ? "Verifying…" : "Verify & Continue"}
              </SpotoButton>
              <button
                type="button"
                className="text-sm font-heading font-semibold text-spoto-muted hover:text-white"
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
      </div>
    </main>
  );
}
