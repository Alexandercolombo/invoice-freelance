/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['convex'],
  experimental: {
    externalDir: true,
    serverComponentsExternalPackages: ['convex']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig; 