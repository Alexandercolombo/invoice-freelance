/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["jspdf"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  webpack: (config) => {
    // Exclude client-side modules from server bundle
    config.externals = [...(config.externals || []), "jspdf"];
    return config;
  },
};

module.exports = nextConfig; 