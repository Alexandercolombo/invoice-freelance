/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'convex/_generated/api': `${__dirname}/convex/_generated/api`,
      'convex/_generated/dataModel': `${__dirname}/convex/_generated/dataModel`
    };
    return config;
  },
  transpilePackages: ['convex']
};

module.exports = nextConfig; 