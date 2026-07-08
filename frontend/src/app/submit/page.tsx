"use client";

import { LocateFixed, MapPin } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoInput, SpotoSelect, SpotoTextarea } from "@/design-system/components/input";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-heading font-semibold text-spoto-ink">{children}</span>;
}

function SubmitContent() {
  return (
    <>
      <header className="pb-4">
        <p className="text-sm font-semibold text-spoto-purple">New lead</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-spoto-ink">Submit house details</h1>
      </header>

      <form className="grid gap-4 lg:grid-cols-2">
        <SpotoCard className="grid gap-4 lg:col-span-2">
          <label className="grid gap-2">
            <FieldLabel>Building name</FieldLabel>
            <SpotoInput placeholder="Example: Palm Residency" />
          </label>
          <label className="grid gap-2">
            <FieldLabel>Location</FieldLabel>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <SpotoInput placeholder="Area or Google Maps location" />
              <button
                className="grid h-14 w-14 place-items-center rounded-spoto bg-spoto-purple text-white"
                type="button"
                aria-label="Use GPS location"
              >
                <LocateFixed className="h-5 w-5" />
              </button>
            </div>
          </label>
        </SpotoCard>

        <SpotoCard className="grid gap-4">
          <label className="grid gap-2">
            <FieldLabel>Owner name</FieldLabel>
            <SpotoInput placeholder="Owner full name" />
          </label>
          <label className="grid gap-2">
            <FieldLabel>Owner phone</FieldLabel>
            <SpotoInput inputMode="tel" placeholder="10-digit mobile number" />
          </label>
        </SpotoCard>

        <SpotoCard className="grid grid-cols-2 gap-4">
          <label className="grid gap-2">
            <FieldLabel>BHK</FieldLabel>
            <SpotoSelect defaultValue="">
              <option value="" disabled>
                Select
              </option>
              <option>1 RK</option>
              <option>1 BHK</option>
              <option>2 BHK</option>
              <option>3 BHK</option>
              <option>4 BHK+</option>
            </SpotoSelect>
          </label>
          <label className="grid gap-2">
            <FieldLabel>Rent</FieldLabel>
            <SpotoInput inputMode="numeric" placeholder="₹" />
          </label>
          <label className="grid gap-2">
            <FieldLabel>Deposit</FieldLabel>
            <SpotoInput inputMode="numeric" placeholder="₹" />
          </label>
          <label className="grid gap-2">
            <FieldLabel>Floor</FieldLabel>
            <SpotoInput placeholder="Optional" />
          </label>
        </SpotoCard>

        <SpotoCard className="grid gap-4 lg:col-span-2">
          <label className="grid gap-2">
            <FieldLabel>Flat number</FieldLabel>
            <SpotoInput placeholder="Optional" />
          </label>
          <label className="grid gap-2">
            <FieldLabel>Notes</FieldLabel>
            <SpotoTextarea placeholder="Anything admin should know?" />
          </label>
        </SpotoCard>

        <div className="lg:col-span-2">
          <SpotoButton className="w-full" variant="cta" icon={<MapPin className="h-5 w-5" />} type="submit">
            Submit House
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
