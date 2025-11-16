module.exports = {
  devServer: {
    allowedHosts: 'all',
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Minimal configuration - just fix the jsonp issue
      webpackConfig.output = {
        ...webpackConfig.output,
        globalObject: 'this',
      };
      return webpackConfig;
    },
  },
};
