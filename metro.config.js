const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // Add support for SVG files
  config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
  config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
  config.resolver.sourceExts.push('svg');

  // Add support for other file types
  config.resolver.assetExts.push(
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'psd', 'svg', 'mp4', 'mp3', 'wav'
  );

  // Configure for better performance
  config.transformer.minifierPath = 'metro-minify-terser';
  config.transformer.minifierConfig = {
    mangle: {
      keep_fnames: true,
    },
    compress: {
      drop_console: false,
    },
  };

  // Enable caching
  config.cacheStores = [
    {
      get: (key) => {
        // Implement cache retrieval
      },
      set: (key, value) => {
        // Implement cache storage
      },
      clear: () => {
        // Implement cache clearing
      },
    },
  ];

  return config;
})();