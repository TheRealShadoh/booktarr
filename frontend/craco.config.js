module.exports = {
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