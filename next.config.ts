import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/ZenithPay',
  images: { unoptimized: true },
};

export default nextConfig;
