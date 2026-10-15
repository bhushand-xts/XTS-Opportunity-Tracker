const path = require("path");
const root = path.resolve(__dirname, "../../..");
const frontend = path.join(root, "frontend");
const HtmlWebpackPlugin = require(path.join(frontend, "node_modules/html-webpack-plugin"));
const Dotenv = require(path.join(frontend, "node_modules/dotenv-webpack"));
module.exports = {
 mode: "development", context: root, entry: path.join(__dirname, "index.ts"),
 output: { path: path.join(__dirname, "dist"), filename: "[name].js", publicPath: "/", clean: true },
 resolve: { extensions: [".tsx", ".ts", ".js"], modules: [path.join(frontend,"node_modules"),"node_modules"], alias: { "@": path.join(frontend, "packages/@xts/design-system/src") } },
 resolveLoader: { modules: [path.join(frontend,"node_modules")] },
 module: { rules: [
  { test: /\.tsx?$/, use: { loader: "ts-loader", options: { transpileOnly: true, configFile: path.join(frontend,"tsconfig.json"), compilerOptions: { jsx: "react-jsx" } } }, exclude: /node_modules/ },
  { test: /\.css$/, use: ["style-loader","css-loader",{ loader: "postcss-loader", options: { postcssOptions: { config: path.join(frontend,"postcss.config.js") } } }] }
 ] },
 plugins: [new HtmlWebpackPlugin({ templateContent: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Opportunity visual TEST fixture</title></head><body><div id="root"></div></body></html>' }),new Dotenv({ path: path.join(frontend,".env"), defaults: path.join(frontend,".env.example") })],
};
