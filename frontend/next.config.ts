import type { NextConfig } from "next";
import "./src/lib/config/env.client";

// Ensure client env vars are validated at startup

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["saml2-js"],
};

export default nextConfig;
