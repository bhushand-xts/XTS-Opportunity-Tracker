// process.env.GRAPHQL_API_URL is statically replaced at build time by each
// app's webpack config (dotenv-webpack) — this app is browser code, not
// Node, so `process` isn't otherwise declared. Deliberately minimal instead
// of pulling in @types/node's full (irrelevant, Node-runtime) surface.
declare const process: { env: { GRAPHQL_API_URL?: string } };
