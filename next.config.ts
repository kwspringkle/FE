import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Tắt ESLint trong quá trình build và development
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
