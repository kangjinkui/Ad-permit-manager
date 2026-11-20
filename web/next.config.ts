import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
    "/api/permits/\\[id\\]/review/generate": ["./templates/review/*.hwpx"],
  },
};

export default nextConfig;
