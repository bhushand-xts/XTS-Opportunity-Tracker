"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gateway_1 = require("@apollo/gateway");
const services_1 = __importDefault(require("../config/services"));
// Composes every domain service into one schema.
// NOTE: needs @apollo/gateway installed, and each service must expose
// a subgraph (@apollo/subgraph).
const gateway = new gateway_1.ApolloGateway({
    supergraphSdl: new gateway_1.IntrospectAndCompose({ subgraphs: services_1.default }),
});
exports.default = gateway;
//# sourceMappingURL=gateway.js.map