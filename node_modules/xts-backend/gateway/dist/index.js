"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const env_1 = __importDefault(require("./config/env"));
const gateway_1 = __importDefault(require("./graphql/gateway"));
const auth_middleware_1 = __importDefault(require("./middleware/auth.middleware"));
async function start() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({ origin: env_1.default.corsOrigin }));
    app.use(express_1.default.json());
    app.use(auth_middleware_1.default);
    const server = new server_1.ApolloServer({ gateway: gateway_1.default });
    await server.start();
    app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => ({ user: req.user }),
    }));
    app.get('/health', (req, res) => res.json({ status: 'ok' }));
    app.listen(env_1.default.port, () => console.log('Gateway ready on http://localhost:' + env_1.default.port + '/graphql'));
}
start().catch((err) => {
    console.error('Gateway failed to start:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map