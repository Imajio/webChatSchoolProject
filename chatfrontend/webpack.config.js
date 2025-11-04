const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:8000';
const wsTarget = backendOrigin.replace(/^http/, 'ws');

module.exports = {
  entry: path.resolve(__dirname, 'src/index.jsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
    publicPath: '/',
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    historyApiFallback: true,
    client: { overlay: false },
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // Keep original Host header to avoid Django DisallowedHost (400)
      '/api': { target: backendOrigin, changeOrigin: false, secure: false },
      '/media': { target: backendOrigin, changeOrigin: false, secure: false },
      '/ws/chat': { target: wsTarget, ws: true, changeOrigin: false, secure: false },
    },
  },
};
