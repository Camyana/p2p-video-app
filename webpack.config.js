const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
  // Renderer process configuration
  {
    mode: 'development',
    entry: './src/renderer.tsx',
    target: 'electron-renderer',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            'style-loader', 
            'css-loader',
            'postcss-loader',
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
      }),
    ],
    devtool: 'inline-source-map',
  },
  // Preload script configuration
  {
    mode: 'development',
    entry: './src/preload.ts',
    target: 'electron-preload',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'preload.js',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    devtool: 'inline-source-map',
  },
];
