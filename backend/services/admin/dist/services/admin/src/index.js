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
const menus_typeDefs_1 = __importDefault(require("./graphql/typeDefs/menus.typeDefs"));
const permissions_typeDefs_1 = __importDefault(require("./graphql/typeDefs/permissions.typeDefs"));
const phases_typeDefs_1 = __importDefault(require("./graphql/typeDefs/phases.typeDefs"));
const proposal_sections_typeDefs_1 = __importDefault(require("./graphql/typeDefs/proposal-sections.typeDefs"));
const rate_master_typeDefs_1 = __importDefault(require("./graphql/typeDefs/rate-master.typeDefs"));
const reason_codes_typeDefs_1 = __importDefault(require("./graphql/typeDefs/reason-codes.typeDefs"));
const role_menu_typeDefs_1 = __importDefault(require("./graphql/typeDefs/role-menu.typeDefs"));
const role_permissions_typeDefs_1 = __importDefault(require("./graphql/typeDefs/role-permissions.typeDefs"));
const roles_typeDefs_1 = __importDefault(require("./graphql/typeDefs/roles.typeDefs"));
const stages_typeDefs_1 = __importDefault(require("./graphql/typeDefs/stages.typeDefs"));
const sub_stages_typeDefs_1 = __importDefault(require("./graphql/typeDefs/sub-stages.typeDefs"));
const menus_resolver_1 = __importDefault(require("./graphql/resolvers/menus.resolver"));
const permissions_resolver_1 = __importDefault(require("./graphql/resolvers/permissions.resolver"));
const phases_resolver_1 = __importDefault(require("./graphql/resolvers/phases.resolver"));
const proposal_sections_resolver_1 = __importDefault(require("./graphql/resolvers/proposal-sections.resolver"));
const rate_master_resolver_1 = __importDefault(require("./graphql/resolvers/rate-master.resolver"));
const reason_codes_resolver_1 = __importDefault(require("./graphql/resolvers/reason-codes.resolver"));
const role_menu_resolver_1 = __importDefault(require("./graphql/resolvers/role-menu.resolver"));
const role_permissions_resolver_1 = __importDefault(require("./graphql/resolvers/role-permissions.resolver"));
const roles_resolver_1 = __importDefault(require("./graphql/resolvers/roles.resolver"));
const stages_resolver_1 = __importDefault(require("./graphql/resolvers/stages.resolver"));
const sub_stages_resolver_1 = __importDefault(require("./graphql/resolvers/sub-stages.resolver"));
// Administration — master data and access control
const base = `
  type Query { _empty: String }
  type Mutation { _empty: String }
`;
const typeDefs = [base, menus_typeDefs_1.default, permissions_typeDefs_1.default, phases_typeDefs_1.default, proposal_sections_typeDefs_1.default, rate_master_typeDefs_1.default, reason_codes_typeDefs_1.default, role_menu_typeDefs_1.default, role_permissions_typeDefs_1.default, roles_typeDefs_1.default, stages_typeDefs_1.default, sub_stages_typeDefs_1.default];
const parts = [menus_resolver_1.default, permissions_resolver_1.default, phases_resolver_1.default, proposal_sections_resolver_1.default, rate_master_resolver_1.default, reason_codes_resolver_1.default, role_menu_resolver_1.default, role_permissions_resolver_1.default, roles_resolver_1.default, stages_resolver_1.default, sub_stages_resolver_1.default];
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
    app.get('/health', (req, res) => res.json({ status: 'ok', service: 'admin' }));
    app.listen(env_1.default.port, () => console.log('admin service ready on http://localhost:' + env_1.default.port + '/graphql'));
}
start().catch((err) => {
    console.error('admin failed to start:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map