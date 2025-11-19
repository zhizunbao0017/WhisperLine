module.exports = function(api) {
  api.cache(true);
  
  // CRITICAL: Disable React Compiler in production builds
  // React Compiler can cause build failures in Expo SDK 51+ production builds
  const isProduction = process.env.EAS_BUILD_PROFILE === 'production' || 
                       process.env.NODE_ENV === 'production' ||
                       process.env.CI === 'true';
  
  // CRITICAL: Ensure babel-plugin-module-resolver is available
  // Verify the plugin exists before using it
  try {
    require.resolve('babel-plugin-module-resolver');
  } catch (e) {
    throw new Error(
      '❌ babel-plugin-module-resolver not found! ' +
      'Please ensure it is installed: npm install babel-plugin-module-resolver'
    );
  }
  
  const plugins = [
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json', '.tsx', '.ts'],
        alias: {
          '@': './',
          'ReactPropTypes': 'prop-types',
        }
      }
    ],
    [
      'transform-replace-expressions',
      {
        replace: {
          'React.createClass': "require('create-react-class')",
        },
      }
    ],
    // CRITICAL: react-native-reanimated plugin must be listed last
    // This ensures proper transformation order
    'react-native-reanimated/plugin'
  ];
  
  // Only add React Compiler plugin in development
  // In production, Expo's experiments.reactCompiler handles it differently
  if (!isProduction) {
    // React Compiler is handled by Expo's experiments.reactCompiler in app.config.js
    // No need to add babel plugin here
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins: plugins
  };
};