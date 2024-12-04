const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  entry: {
    background: './background.js',  // Entry point for background.js
    content: './content.js',        // Entry point for content.js
    popup: './popup.js',            // Entry point for popup.js
  },
  output: {
    filename: '[name].bundle.js',  // The bundled files will be named based on the entry point
    path: path.resolve(__dirname, 'dist'),  // Output the bundles into the dist folder
    clean: true,  // Clean the dist folder before each build
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',  // If you're using Babel to transpile JS code
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],  // For loading CSS files
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',  // For images (e.g., icons or logos)
      },
    ],
  },
  target: 'web',  // Target web environment (browser)
  resolve: {
    alias: {
      '@mozilla/readability': path.resolve(__dirname, 'node_modules/@mozilla/readability'),  // Optional alias for readability.js
    },
  },
  plugins: [
    new CleanWebpackPlugin(),  // Cleans the dist folder before each build
    new HtmlWebpackPlugin({
      template: './popup.html',  // Template HTML for the popup
      filename: 'popup.html',    // Name of the output file for the popup
    }),
  ],
  devtool: 'source-map',  // For easier debugging
  mode: 'production',  // Set the mode to production for optimized builds
};
