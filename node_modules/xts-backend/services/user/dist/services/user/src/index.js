"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const graphql_1 = require("graphql");
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const subgraph_1 = require("@apollo/subgraph");
const env_1 = __importDefault(require("./config/env"));
const user_typeDefs_1 = __importDefault(require("./graphql/typeDefs/user.typeDefs"));
const user_resolver_1 = __importDefault(require("./graphql/resolvers/user.resolver"));
// User, authentication & SSO
const base = `
  type Query { _empty: String }
  type Mutation { _empty: String }
`;
const typeDefs = [base, user_typeDefs_1.default];
const parts = [user_resolver_1.default];
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
    app.get('/login', (_req, res) => res.sendFile(path_1.default.join(process.cwd(), 'src', 'public', 'login.html')));
    app.get('/admin', (_req, res) => res.sendFile(path_1.default.join(process.cwd(), 'src', 'public', 'admin.html')));
    // Same-origin bridge from the dashboard to the admin microservice.
    app.post('/admin-api/graphql', async (req, res) => {
        try {
            const response = await fetch(env_1.default.adminServiceUrl, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: req.header('authorization') || '',
                },
                body: JSON.stringify(req.body),
            });
            res.status(response.status).json(await response.json());
        }
        catch (error) {
            res.status(502).json({ errors: [{ message: 'Admin service is unavailable.' }] });
        }
    });
    app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user' }));
    app.listen(env_1.default.port, () => console.log('user service ready on http://localhost:' + env_1.default.port + '/graphql'));
}
start().catch((err) => {
    console.error('user failed to start:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map