module.exports = function(api) {
  api.cache(true);
  
  // CRITICAL: Disable React Compiler in production builds
  // React Compiler can cause build failures in Expo SDK 51+ production builds
  const isProduction = process.env.EAS_BUILD_PROFILE === 'production' || 
                       process.env.NODE_ENV === 'production' ||
                       process.env.CI === 'true';
  
  const plugins = [
    [
      'module-resolver',
      {
        alias: {
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
    ]
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