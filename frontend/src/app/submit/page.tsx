"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { LocateFixed, MapPin } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoInput, SpotoSelect, SpotoTextarea } from "@/design-system/components/input";
import { ApiError } from "@/lib/api/client";
import { createLead, type CreateLeadPayload } from "@/lib/api/ranger";
import { useSession } from "@/lib/auth/session";

const BHK_OPTIONS: { label: string; value: CreateLeadPayload["bhk"] }[] = [
  { label: "1 RK", value: "1_rk" },
  { label: "1 BHK", value: "1_bhk" },
  { label: "2 BHK", value: "2_bhk" },
  { label: "3 BHK", value: "3_bhk" },
  { label: "4 BHK+", value: "4_bhk_plus" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-heading font-semibold text-spoto-ink">{children}</span>;
}

function SubmitContent() {
  const router = useRouter();
  const { session } = useSession();
  const [buildingName, setBuildingName] = useState("");
  const [area, setArea] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [bhk, setBhk] = useState<CreateLeadPayload["bhk"] | "">("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [floor, setFloor] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function useGps() {
    if (!navigator.geolocation) {
      toast.error("GPS is not available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        if (!area.trim()) {
          setArea(
            `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
          );
        }
        toast.success("Location captured");
        setLocating(false);
      },
      () => {
        toast.error("Could not get GPS location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session?.rangerId) {
      setError("Please log in again to submit a lead.");
      return;
    }
    if (!buildingName.trim() || !area.trim() || !ownerName.trim()) {
      setError("Building, location, and owner name are required.");
      return;
    }
    if (!/^\d{10}$/.test(ownerPhone)) {
      setError("Enter a valid 10-digit owner phone number.");
      return;
    }
    if (!bhk) {
      setError("Select a BHK type.");
      return;
    }
    const monthlyRent = Number(rent);
    const depositAmount = Number(deposit || "0");
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      setError("Enter a valid monthly rent.");
      return;
    }
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      setError("Enter a valid deposit amount.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const lead = await createLead({
        building_name: buildingName.trim(),
        area: area.trim(),
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone,
        bhk,
        monthly_rent: monthlyRent,
        deposit: depositAmount,
        floor: floor.trim(),
        flat_number: flatNumber.trim(),
        notes: notes.trim(),
        latitude,
        longitude,
      });
      toast.success("House submitted");
      router.push(`/leads/${lead.id}`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.detail : "Could not submit house. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="pb-4">
        <p className="text-sm font-semibold text-spoto-purple">New lead</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-spoto-ink">Submit house details</h1>
      </header>

      <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
        <SpotoCard className="grid gap-4 lg:col-span-2">
          <label className="grid gap-2">
            <FieldLabel>Building name</FieldLabel>
            <SpotoInput
              placeholder="Example: Palm Residency"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-2">
            <FieldLabel>Location</FieldLabel>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <SpotoInput
                placeholder="Area or Google Maps location"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required
              />
              <button
                className="grid h-14 w-14 place-items-center rounded-spoto bg-spoto-purple text-white disabled:opacity-60"
                type="button"
                aria-label="Use GPS location"
                onClick={useGps}
                disabled={locating}
              >
                <LocateFixed className="h-5 w-5" />
              </button>
            </div>
            {latitude != null && longitude != null && (
              <p className="text-xs text-spoto-muted">
                GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            )}
          </label>
        </SpotoCard>

        <SpotoCard className="grid gap-4">
          <label className="grid gap-2">
            <FieldLabel>Owner name</FieldLabel>
            <SpotoInput
              placeholder="Owner full name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-2">
            <FieldLabel>Owner phone</FieldLabel>
            <SpotoInput
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={ownerPhone}
              maxLength={10}
              onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, ""))}
              required
            />
          </label>
        </SpotoCard>

        <SpotoCard className="grid grid-cols-2 gap-4">
          <label className="grid gap-2">
            <FieldLabel>BHK</FieldLabel>
            <SpotoSelect
              value={bhk}
              onChange={(e) => setBhk(e.target.value as CreateLeadPayload["bhk"])}
              required
            >
              <option value="" disabled>
                Select
              </option>
              {BHK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SpotoSelect>
          </label>
          <label className="grid gap-2">
            <FieldLabel>Rent</FieldLabel>
            <SpotoInput
              inputMode="numeric"
              placeholder="₹"
              value={rent}
              onChange={(e) => setRent(e.target.value.replace(/\D/g, ""))}
              required
            />
          </label>
          <label className="grid gap-2">
            <FieldLabel>Deposit</FieldLabel>
            <SpotoInput
              inputMode="numeric"
              placeholder="₹"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label className="grid gap-2">
            <FieldLabel>Floor</FieldLabel>
            <SpotoInput
              placeholder="Optional"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
          </label>
        </SpotoCard>

        <SpotoCard className="grid gap-4 lg:col-span-2">
          <label className="grid gap-2">
            <FieldLabel>Flat number</FieldLabel>
            <SpotoInput
              placeholder="Optional"
              value={flatNumber}
              onChange={(e) => setFlatNumber(e.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <FieldLabel>Notes</FieldLabel>
            <SpotoTextarea
              placeholder="Anything admin should know?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </SpotoCard>

        {error && (
          <p className="text-sm font-medium text-red-400 lg:col-span-2">{error}</p>
        )}

        <div className="lg:col-span-2">
          <SpotoButton
            className="w-full"
            variant="cta"
            icon={<MapPin className="h-5 w-5" />}
            type="submit"
            disabled={loading}
          >
            {loading ? "Submitting…" : "Submit House"}
          </SpotoButton>
        </div>
      </form>
    </>
  );
}

export default function SubmitPropertyPage() {
  return (
    <AppShell>
      <SubmitContent />
    </AppShell>
  );
}
