import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd()),
  },
  serverExternalPackages: ["pdf-parse", "mammoth", "firebase-admin"],
  // Allow dev HMR when opening the site from another device on your LAN (optional).
  // Set in .env.local: ALLOWED_DEV_ORIGINS=192.168.1.42  (comma-separated for several hosts)
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean),
};

export default nextConfig;
