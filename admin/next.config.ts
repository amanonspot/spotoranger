import type { NextConfig } from "next";

/** Empty locally; `/console` on EC2 so nginx can serve admin on port 80. */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "") || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
