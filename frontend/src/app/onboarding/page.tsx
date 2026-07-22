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

type AuthMode = "login" | "register";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
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

  function switchMode(next: AuthMode) {
    setMode(next);
    setStep("details");
    setCode("");
    setError(null);
  }

  async function handleRequest() {
    if (!phoneValid) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (mode === "register") {
      if (!name.trim()) {
        setError("Enter your full name to register.");
        return;
      }
      if (!area.trim()) {
        setError("Enter your preferred area.");
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      await requestOtp(phone, {
        intent: mode,
        fullName: mode === "register" ? name.trim() : undefined,
      });
      setStep("otp");
      toast.success("OTP sent");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.detail : "Could not send OTP. Please try again.";
      setError(message);
      if (err instanceof ApiError && err.status === 409) {
        // Already registered → nudge to login
        toast.error(message);
      }
      if (err instanceof ApiError && err.status === 404) {
        toast.error(message);
      }
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
      const res = await verifyOtp(
        phone,
        code,
        mode === "register"
          ? {
              fullName: name.trim() || undefined,
              deliveryPlatform: platform || undefined,
              preferredArea: area.trim() || undefined,
              upiId: upiId.trim() || undefined,
            }
          : undefined,
      );
      if (res.status !== "verified" || !res.user || !res.token) {
        setError(res.message || "Invalid or expired OTP. Please try again.");
        return;
      }
      if (res.user.role === "admin") {
        const { writeAdminSession, goToAdminConsole } = await import(
          "@/lib/auth/admin-bridge"
        );
        writeAdminSession(res.user, res.token);
        toast.success("Welcome to Admin Console");
        goToAdminConsole();
        return;
      }
      setSession(res.user, res.token);
      toast.success(mode === "register" ? "Account created — welcome!" : "Welcome back");
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
    <main className="spoto-glow relative grid min-h-dvh place-items-center px-4 py-8">
      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center">
        <header className="mb-8 flex w-full flex-col items-center text-center">
          <Logo width={168} height={48} />
          <p className="mt-3 text-[11px] font-heading font-semibold uppercase tracking-[0.28em] text-spoto-purple">
            Ranger
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-spoto-muted">
            Submit rental leads. Earn rewards. Track everything.
          </p>
        </header>

        <SpotoCard className="w-full grid gap-5 p-6 sm:p-7">
          {step === "details" ? (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-spoto bg-spoto-bg/70 p-1">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`rounded-lg py-2.5 text-sm font-heading font-semibold transition ${
                    mode === "login"
                      ? "bg-spoto-purple text-white shadow-sm"
                      : "text-spoto-muted hover:text-spoto-ink"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className={`rounded-lg py-2.5 text-sm font-heading font-semibold transition ${
                    mode === "register"
                      ? "bg-spoto-purple text-white shadow-sm"
                      : "text-spoto-muted hover:text-spoto-ink"
                  }`}
                >
                  Register
                </button>
              </div>

              <p className="text-center text-sm text-spoto-muted sm:text-left">
                {mode === "login"
                  ? "Enter your mobile number to receive a login OTP."
                  : "Create your Ranger account with the details below."}
              </p>

              {mode === "register" && (
                <label className="grid gap-2">
                  <span className="text-sm font-heading font-semibold text-spoto-ink">
                    Your name
                  </span>
                  <SpotoInput
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
              )}

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
                />
              </label>

              {mode === "register" && (
                <>
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
                    <span className="text-sm font-heading font-semibold text-spoto-ink">
                      UPI ID
                    </span>
                    <SpotoInput
                      placeholder="name@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                </>
              )}

              {error && (
                <p className="rounded-spoto border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
                  {error}
                </p>
              )}

              {mode === "login" && error?.toLowerCase().includes("register") && (
                <button
                  type="button"
                  className="text-center text-sm font-heading font-semibold text-spoto-purple"
                  onClick={() => switchMode("register")}
                >
                  Create a new account →
                </button>
              )}
              {mode === "register" && error?.toLowerCase().includes("login") && (
                <button
                  type="button"
                  className="text-center text-sm font-heading font-semibold text-spoto-purple"
                  onClick={() => switchMode("login")}
                >
                  Go to login →
                </button>
              )}

              <SpotoButton
                onClick={handleRequest}
                disabled={loading}
                icon={<ArrowRight className="h-5 w-5" />}
                className="w-full"
              >
                {loading ? "Sending…" : "Send OTP"}
              </SpotoButton>
            </>
          ) : (
            <>
              <div className="grid gap-1.5 text-center sm:text-left">
                <h1 className="font-heading text-lg font-semibold text-spoto-ink">
                  {mode === "login" ? "Verify & login" : "Verify & register"}
                </h1>
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
              <SpotoButton variant="cta" onClick={handleVerify} disabled={loading} className="w-full">
                {loading
                  ? "Verifying…"
                  : mode === "login"
                    ? "Verify & login"
                    : "Verify & register"}
              </SpotoButton>
              <button
                type="button"
                className="text-center text-sm font-heading font-semibold text-spoto-muted transition hover:text-spoto-ink"
                onClick={() => {
                  setStep("details");
                  setCode("");
                  setError(null);
                }}
              >
                ← Back
              </button>
            </>
          )}
        </SpotoCard>
      </div>
    </main>
  );
}
