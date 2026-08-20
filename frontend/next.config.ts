import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/stitch/index.html',
        permanent: false,
      },
      {
        source: '/app',
        destination: '/stitch/index.html',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
