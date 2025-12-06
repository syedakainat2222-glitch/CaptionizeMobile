/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Ignore server-only modules in frontend
    config.resolve.fallback = {
      fs: false,
      net: false, 
      tls: false,
      child_process: false,
      '@opentelemetry/sdk-node': false,
    };
    
    return config;
  },
  // Disable server components for problematic packages
  experimental: {
    serverComponentsExternalPackages: [
      '@opentelemetry/sdk-node', 
      'handlebars',
      'require-in-the-middle'
    ],
    // Increase body size limit for server actions
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

module.exports = nextConfig;
