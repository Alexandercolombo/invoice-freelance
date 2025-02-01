/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@clerk/nextjs'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'convex/_generated': `${process.cwd()}/convex/_generated`,
    };
    config.externals = [...(config.externals || []), 'jspdf'];
    return config;
  },
  transpilePackages: ['convex', '@react-pdf/renderer'],
  typescript: {
    // Only enable type checking in development
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  // Add middleware configuration
  middleware: {
    runtime: 'nodejs',
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
  // Add rewrites for Clerk auth routes
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/sign-up/:path*',
          destination: '/sign-up/[[...sign-up]]',
        },
        {
          source: '/sign-in/:path*',
          destination: '/sign-in/[[...sign-in]]',
        },
      ],
    };
  },
};

module.exports = nextConfig; 