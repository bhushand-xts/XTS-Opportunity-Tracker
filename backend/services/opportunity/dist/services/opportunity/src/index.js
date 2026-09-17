"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const graphql_1 = require("graphql");
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const subgraph_1 = require("@apollo/subgraph");
const env_1 = __importDefault(require("./config/env"));
const opportunity_typeDefs_1 = __importDefault(require("./graphql/typeDefs/opportunity.typeDefs"));
const stage_typeDefs_1 = __importDefault(require("./graphql/typeDefs/stage.typeDefs"));
const opportunity_resolver_1 = __importDefault(require("./graphql/resolvers/opportunity.resolver"));
const stage_resolver_1 = __importDefault(require("./graphql/resolvers/stage.resolver"));
// Opportunity & Pipeline
const base = `
  type Query { _empty: String }
  type Mutation { _empty: String }
`;
const typeDefs = [base, opportunity_typeDefs_1.default, stage_typeDefs_1.default];
const parts = [opportunity_resolver_1.default, stage_resolver_1.default];
const resolvers = parts.reduce((acc, p) => ({
    Query: { ...acc.Query, ...(p.Query || {}) },
    Mutation: { ...acc.Mutation, ...(p.Mutation || {}) },
}), { Query: {}, Mutation: {} });
const schema = (0, subgraph_1.buildSubgraphSchema)({ typeDefs: typeDefs.map((t) => (0, graphql_1.parse)(t)), resolvers });
async function start() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    const server = new server_1.ApolloServer({ schema });
    await server.start();
    app.use('/graphql', (0, express4_1.expressMiddleware)(server));
    app.get('/health', (req, res) => res.json({ status: 'ok', service: 'opportunity' }));
    app.listen(env_1.default.port, () => console.log('opportunity service ready on http://localhost:' + env_1.default.port + '/graphql'));
}
start().catch((err) => {
    console.error('opportunity failed to start:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map