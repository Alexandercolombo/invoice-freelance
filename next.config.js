/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["jspdf"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  webpack: (config) => {
    // Exclude client-side modules from server bundle
    config.externals = [...(config.externals || []), "jspdf"];
    return config;
  },
  // Specify Node.js runtime for auth routes
  async headers() {
    return [
      {
        source: '/sign-in/:path*',
        headers: [
          {
            key: 'x-middleware-prefetch',
            value: '0',
          },
        ],
      },
      {
        source: '/sign-up/:path*',
        headers: [
          {
            key: 'x-middleware-prefetch',
            value: '0',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 