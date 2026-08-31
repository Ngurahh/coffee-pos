import type { NextConfig } from "next";

const serverUrl = process.env.BETTER_AUTH_URL || "";
const serverHost = serverUrl ? new URL(serverUrl).hostname : "";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    ...(serverHost ? [serverHost] : []),
  ],
};

export default nextConfig;
