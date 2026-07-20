"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight } from "lucide-react";

import Logo from "@/components/Logo";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoInput, SpotoSelect } from "@/design-system/components/input";
import { ApiError } from "@/lib/api/client";
import { requestOtp, verifyOtp } from "@/lib/api/ranger";
import { setSession } from "@/lib/auth/session";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState("other");
  const [area, setArea] = useState("");
  const [upiId, setUpiId] = useState("");
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
      await requestOtp(phone, name.trim() || undefined);
      setStep("otp");
      toast.success("OTP sent");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.detail : "Could not send OTP. Please try again.";
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
      const res = await verifyOtp(phone, code, {
        fullName: name.trim() || undefined,
        deliveryPlatform: platform || undefined,
        preferredArea: area.trim() || undefined,
        upiId: upiId.trim() || undefined,
      });
      if (res.status !== "verified" || !res.user || !res.token) {
        setError(res.message || "Invalid or expired OTP. Please try again.");
        return;
      }
      setSession(res.user, res.token);
      toast.success("Welcome to Spoto Ranger");
      router.push("/");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.detail : "Verification failed. Please try again.";
      setError(message);
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
                  placeholder="Your full name"
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
                <SpotoInput
                  placeholder="e.g. Indiranagar"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-heading font-semibold text-spoto-ink">UPI ID</span>
                <SpotoInput
                  placeholder="name@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  autoComplete="off"
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
            </>
          ) : (
            <>
              <p className="text-sm text-spoto-muted">
                Enter the code sent to{" "}
                <span className="font-heading font-semibold text-spoto-ink">{phone}</span>.
              </p>
              <SpotoInput
                inputMode="numeric"
                placeholder="••••"
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
            </>
          )}
        </SpotoCard>
      </div>
    </main>
  );
}
