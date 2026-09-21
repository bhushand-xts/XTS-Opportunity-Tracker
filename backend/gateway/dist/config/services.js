"use strict";
// Where each domain service lives. The gateway composes these.
Object.defineProperty(exports, "__esModule", { value: true });
const availableServices = [
    { name: 'user', url: process.env.USER_URL || 'http://localhost:4001/graphql' },
    { name: 'opportunity', url: process.env.OPPORTUNITY_URL || 'http://localhost:4003/graphql' },
    { name: 'admin', url: process.env.ADMIN_URL || 'http://localhost:4010/graphql' },
];
// Local development can run a subset while other domain databases are not configured.
const enabledServiceNames = new Set((process.env.ENABLED_SUBGRAPHS || 'user,admin')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean));
const services = availableServices.filter((service) => enabledServiceNames.has(service.name));
exports.default = services;
//# sourceMappingURL=services.js.map