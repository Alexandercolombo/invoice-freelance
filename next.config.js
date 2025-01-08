/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['convex'],
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    // Add the convex directory to be processed by webpack
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /node_modules/,
    };
    return config;
  },
};

module.exports = nextConfig; 