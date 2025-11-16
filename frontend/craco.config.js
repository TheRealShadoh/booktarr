module.exports = {
  devServer: {
    allowedHosts: 'all',
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    // Use setupMiddlewares instead of deprecated onBeforeSetupMiddleware/onAfterSetupMiddleware
    setupMiddlewares: (middlewares, devServer) => {
      // Custom middlewares can be added here before/after default middlewares
      // This replaces the deprecated onBeforeSetupMiddleware and onAfterSetupMiddleware
      return middlewares;
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Fix for jsonp chunk loading error
      webpackConfig.output = {
        ...webpackConfig.output,
        globalObject: 'this',
      };

      // Optimized code splitting for better caching and performance
      webpackConfig.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          // Split React and React-DOM into separate chunk
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            priority: 40,
            reuseExistingChunk: true,
          },
          // React Router in separate chunk
          reactRouter: {
            test: /[\\/]node_modules[\\/](react-router|react-router-dom)[\\/]/,
            name: 'react-router',
            priority: 35,
            reuseExistingChunk: true,
          },
          // Large libraries that rarely change
          stableVendors: {
            test: /[\\/]node_modules[\\/](@tanstack|axios|date-fns)[\\/]/,
            name: 'stable-vendors',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Other node_modules
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Common code shared between chunks
          common: {
            name: 'common',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };

      // Enable runtime chunk for better long-term caching
      webpackConfig.optimization.runtimeChunk = 'single';


      return webpackConfig;
    },
  },
};