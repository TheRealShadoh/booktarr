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

      // Disable splitting for now to avoid chunk loading issues
      webpackConfig.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/
          }
        }
      };


      return webpackConfig;
    },
  },
};