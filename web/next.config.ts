import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth"],
  // Allow dev HMR when opening the site from another device on your LAN (optional).
  // Set in .env.local: ALLOWED_DEV_ORIGINS=192.168.1.42  (comma-separated for several hosts)
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean),
};

export default nextConfig;
