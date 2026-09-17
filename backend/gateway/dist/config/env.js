"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function required(name) {
    const value = process.env[name];
    if (!value)
        throw new Error('Missing env var: ' + name);
    return value;
}
const env = {
    port: Number(process.env.PORT || 4000),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
exports.default = env;
//# sourceMappingURL=env.js.map