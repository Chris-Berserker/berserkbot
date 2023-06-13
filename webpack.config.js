const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      // Add any necessary loaders for your code files (e.g., Babel for transpiling)
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    // HtmlWebpackPlugin generates an HTML file with the necessary script tags
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],
  devServer: {
    contentBase: path.resolve(__dirname, 'dist'),
    port: 5501, // Adjust the port number as needed
  },
  resolve: {
    alias: {
      // Add any necessary aliases for your dependencies
      puppeteer: require.resolve('puppeteer'), // Alias Puppeteer to the installed version
      neataptic: require.resolve('neataptic'), // Alias NEATaptic to the installed version
    },
  },
};
