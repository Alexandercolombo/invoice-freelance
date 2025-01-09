/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['convex'],
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'convex/_generated/api': require.resolve('./convex/_generated/api'),
    };
    return config;
  },
};

module.exports = nextConfig; 