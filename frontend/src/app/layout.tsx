import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";

import "./globals.css";

export const metadata: Metadata = {
  title: "Spoto Ranger",
  description: "Submit rental leads and track Spoto Ranger rewards.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-spoto-bg text-spoto-ink">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1c1c24",
              color: "#ffffff",
              border: "1px solid #2a2a32",
            },
          }}
        />
      </body>
    </html>
  );
}
