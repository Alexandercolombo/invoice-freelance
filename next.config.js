/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['convex'],
  experimental: {
    externalDir: true
  }
};

module.exports = nextConfig; 