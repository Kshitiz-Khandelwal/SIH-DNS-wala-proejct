import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/console/index.html',
        permanent: false,
      },
      {
        source: '/app',
        destination: '/console/index.html',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
