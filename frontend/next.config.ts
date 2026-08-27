import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/app',
        destination: '/app/dashboard',
        permanent: false,
      },
      {
        source: '/console',
        destination: '/app/dashboard',
        permanent: false,
      },
      {
        source: '/console/index.html',
        destination: '/app/dashboard',
        permanent: false,
      },
      {
        source: '/console/forecast.html',
        destination: '/app/forecast',
        permanent: false,
      },
      {
        source: '/console/pipeline.html',
        destination: '/app/pipeline',
        permanent: false,
      },
      {
        source: '/console/threats.html',
        destination: '/app/threats',
        permanent: false,
      },
      {
        source: '/console/xai.html',
        destination: '/app/xai',
        permanent: false,
      },
      {
        source: '/console/models.html',
        destination: '/app/models',
        permanent: false,
      },
      {
        source: '/console/quarantine.html',
        destination: '/app/quarantine',
        permanent: false,
      },
      {
        source: '/console/devices.html',
        destination: '/app/devices',
        permanent: false,
      },
      {
        source: '/console/analytics.html',
        destination: '/app/analytics',
        permanent: false,
      },
      {
        source: '/console/reports.html',
        destination: '/app/reports',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
