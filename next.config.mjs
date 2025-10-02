/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure webpack for better compatibility with Clerk
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Increase chunk loading timeout for development
      config.output.chunkLoadTimeout = 120000; // 2 minutes
      
      // Better handling of dynamic imports
      config.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });
    }
    
    return config;
  },
};

export default nextConfig;
