/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/convex': `${__dirname}/convex`
    };
    return config;
  },
  transpilePackages: ['convex']
};

module.exports = nextConfig; 