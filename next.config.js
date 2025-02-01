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
};

module.exports = nextConfig; 