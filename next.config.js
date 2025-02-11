/** @type {import('next').NextConfig} */
const nextConfig = {
  serverComponentsExternalPackages: ['puppeteer', '@clerk/nextjs/server'],
  experimental: {
    serverActions: true,
    serverComponents: true
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@convex': `${process.cwd()}/convex`,
      '@/lib': `${process.cwd()}/src/lib`,
      '@/components': `${process.cwd()}/src/components`,
      '@/hooks': `${process.cwd()}/src/hooks`,
      '@/types': `${process.cwd()}/src/types`,
    };
    
    // Ensure server-only packages are not bundled on the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        puppeteer: false,
        'server-only': false
      };
    }
    
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