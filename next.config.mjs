/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'convex/_generated': `${process.cwd()}/convex/_generated`,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'async_hooks': false,
    };
    return config;
  },
  transpilePackages: [
    'convex',
    '@react-pdf/renderer'
  ],
  experimental: {
    externalDir: true,
    serverActions: {
      allowedOrigins: ['localhost:3000', 'invoice-freelance.vercel.app'],
    }
  },
  serverExternalPackages: ['puppeteer', 'pdfkit', '@clerk/nextjs'],
  typescript: {
    ignoreBuildErrors: true
  },
  output: 'standalone'
}

export default nextConfig; 