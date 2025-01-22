/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'convex/_generated': `${process.cwd()}/convex/_generated`,
    };
    return config;
  },
  transpilePackages: ['convex'],
  experimental: {
    externalDir: true,
    serverActions: {
      allowedOrigins: ['localhost:3000', 'invoice-freelance.vercel.app'],
    },
  },
  runtime: {
    edge: {
      regions: ['iad1'], // US East (N. Virginia)
    },
  },
  serverComponentsExternalPackages: ['puppeteer', 'pdfkit'],
}

export default nextConfig; 