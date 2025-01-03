/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'convex/_generated': `${__dirname}/convex/_generated`,
    };
    return config;
  },
}

module.exports = nextConfig 