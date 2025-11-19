// Metro configuration for Expo
// CRITICAL: Disable source maps in production to prevent Metro transform-worker crash (Expo SDK 51+ bug)

const { getDefaultConfig } = require('expo/metro-config');

const isProduction = process.env.EAS_BUILD_PROFILE === 'production' || 
                     process.env.NODE_ENV === 'production' ||
                     process.env.EXPO_METRO_NO_SOURCE_MAPS === 'true';

const config = getDefaultConfig(__dirname);

// CRITICAL: Disable source map generation in production builds
// This prevents Metro transform-worker crash in Expo SDK 51+
if (isProduction) {
  config.transformer = {
    ...config.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    // Disable source map generation
    minifierConfig: {
      ...config.transformer?.minifierConfig,
      keep_classnames: false,
      keep_fnames: false,
      mangle: {
        keep_classnames: false,
        keep_fnames: false,
      },
    },
  };

  // Disable source map in resolver
  config.resolver = {
    ...config.resolver,
    sourceExts: config.resolver.sourceExts || [],
  };

  // Ensure source maps are disabled
  config.serializer = {
    ...config.serializer,
    getModulesRunBeforeMainModule: () => [],
  };
}

module.exports = config;

