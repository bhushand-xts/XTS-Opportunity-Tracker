"use strict";
// Where each domain service lives. The gateway composes these.
Object.defineProperty(exports, "__esModule", { value: true });
const services = [
    { name: 'user', url: process.env.USER_URL || 'http://localhost:4001/graphql' },
    { name: 'account', url: process.env.ACCOUNT_URL || 'http://localhost:4002/graphql' },
    { name: 'opportunity', url: process.env.OPPORTUNITY_URL || 'http://localhost:4003/graphql' },
    { name: 'estimation', url: process.env.ESTIMATION_URL || 'http://localhost:4004/graphql' },
    { name: 'approval', url: process.env.APPROVAL_URL || 'http://localhost:4005/graphql' },
    { name: 'rfp', url: process.env.RFP_URL || 'http://localhost:4006/graphql' },
    { name: 'document', url: process.env.DOCUMENT_URL || 'http://localhost:4007/graphql' },
    { name: 'notification', url: process.env.NOTIFICATION_URL || 'http://localhost:4008/graphql' },
    { name: 'reporting-audit', url: process.env.REPORTING_AUDIT_URL || 'http://localhost:4009/graphql' },
    { name: 'admin', url: process.env.ADMIN_URL || 'http://localhost:4010/graphql' },
];
exports.default = services;
//# sourceMappingURL=services.js.map