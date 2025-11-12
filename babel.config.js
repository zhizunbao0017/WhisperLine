module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
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
    ]
  };
};