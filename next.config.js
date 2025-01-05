/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'convex': `${__dirname}/node_modules/convex`
    };
    return config;
  },
  transpilePackages: ['convex']
};

module.exports = nextConfig; 