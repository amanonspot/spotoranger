"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight } from "lucide-react";

import Logo from "@/components/Logo";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoInput } from "@/design-system/components/input";
import { requestOtp, verifyOtp } from "@/lib/api/ranger";
import { setSession } from "@/lib/auth/session";

const MOCK_PHONE = "9999999999";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
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
      if (res.status !== "verified") {
        setError("Invalid code. Try 0000 for the demo account.");
        return;
      }
      setSession(
        res.user ?? {
          id: phone,
          fullName: name || "Ranger",
          phone,
          role: "ranger",
          rangerId: null,
        },
      );
      toast.success("Welcome to Spoto Ranger");
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
            Ranger
          </p>
          <p className="mt-3 text-sm text-spoto-muted">
            Submit rental leads. Earn rewards. Track everything.
          </p>
        </div>

        <SpotoCard className="grid gap-4">
          {step === "details" ? (
            <>
              <label className="grid gap-2">
                <span className="text-sm font-heading font-semibold text-spoto-ink">Your name</span>
                <SpotoInput
                  placeholder="Aman Ranger"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-heading font-semibold text-spoto-ink">Mobile number</span>
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
              <SpotoButton
                onClick={handleRequest}
                disabled={loading}
                icon={<ArrowRight className="h-5 w-5" />}
              >
                {loading ? "Sending…" : "Send OTP"}
              </SpotoButton>
              <p className="rounded-spoto bg-spoto-surface-2 px-4 py-3 text-center text-xs text-spoto-muted">
                Demo login → phone{" "}
                <span className="font-heading font-bold text-spoto-green">{MOCK_PHONE}</span>, OTP{" "}
                <span className="font-heading font-bold text-spoto-green">0000</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-spoto-muted">
                Enter the code sent to{" "}
                <span className="font-heading font-semibold text-spoto-ink">{phone}</span>.
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
                  setStep("details");
                  setCode("");
                  setError(null);
                }}
              >
                ← Change number
              </button>
              <p className="text-center text-xs text-spoto-muted">Use code 0000 for local development.</p>
            </>
          )}
        </SpotoCard>
      </div>
    </main>
  );
}
