/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@clerk/nextjs', 'puppeteer'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@convex': `${process.cwd()}/convex`,
      '@/lib': `${process.cwd()}/src/lib`,
      '@/components': `${process.cwd()}/src/components`,
      '@/hooks': `${process.cwd()}/src/hooks`,
      '@/types': `${process.cwd()}/src/types`,
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