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
      
      // Optimize chunk splitting for Clerk
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          clerk: {
            test: /[\\/]node_modules[\\/]@clerk[\\/]/,
            name: 'clerk',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    
    return config;
  },
  
  // Experimental features for better chunk loading
  experimental: {
    optimizePackageImports: ['@clerk/nextjs'],
  },
};

export default nextConfig;
