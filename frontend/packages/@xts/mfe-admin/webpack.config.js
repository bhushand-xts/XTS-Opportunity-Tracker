const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { container } = require("webpack");

module.exports = {
  mode: "development",
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    // Must be an ABSOLUTE url with origin, not just "/" — this is a Module
    // Federation remote, so its code also runs on OTHER pages (app-shell,
    // at a different origin/port) that load it via remoteEntry.js. A
    // root-relative "/" would resolve this remote's own chunk requests
    // against whichever page is hosting it, not against this dev server.
    publicPath: "http://localhost:3001/",
    clean: true,
  },
  devServer: {
    port: 3001,
    historyApiFallback: true,
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      "@": path.resolve(__dirname, "../design-system/src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, "../../../postcss.config.js"),
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new container.ModuleFederationPlugin({
      name: "admin",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^18.2.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.2.0" },
        "react-router-dom": { singleton: true, requiredVersion: "^7.18.3" },
        "@xts/design-system": { singleton: true },
        "@xts/api-contracts": { singleton: true },
        "@xts/api-client": { singleton: true },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
  ],
};
