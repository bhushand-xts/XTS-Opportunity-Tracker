const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const Dotenv = require("dotenv-webpack");
const { container } = require("webpack");

module.exports = {
  mode: "development",
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    // Without this, HtmlWebpackPlugin emits a relative <script src="main.js">.
    // That resolves fine from "/", but a hard refresh on a deep client-side
    // route (e.g. /admin/menu-management/menu-master) makes the browser
    // resolve it relative to THAT path instead, 404ing the bundle.
    publicPath: "/",
    clean: true,
  },
  devServer: {
    port: 3000,
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
      name: "shell",
      filename: "remoteEntry.js",
      remotes: {
        admin: "admin@http://localhost:3001/remoteEntry.js",
        opportunity: "opportunity@http://localhost:3002/remoteEntry.js",
        solution: "solution@http://localhost:3003/remoteEntry.js",
        approval: "approval@http://localhost:3004/remoteEntry.js",
        dashboard: "dashboard@http://localhost:3005/remoteEntry.js",
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
    // `defaults` guarantees process.env.GRAPHQL_API_URL always gets replaced
    // at build time (via .env.example's value) even when frontend/.env
    // doesn't exist — without it, a missing .env would leave the literal
    // text "process.env.GRAPHQL_API_URL" in the bundle, which throws
    // "process is not defined" in the browser at runtime.
    new Dotenv({
      path: path.resolve(__dirname, "../../../.env"),
      defaults: path.resolve(__dirname, "../../../.env.example"),
      systemvars: true,
    }),
  ],
};
