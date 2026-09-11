"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.countUsersByRole = countUsersByRole;
const env_1 = __importDefault(require("../config/env"));
// admin and user each own their own database, so "is this role assigned
// to any user" can't be a SQL join — it's a real network call to user's
// GraphQL API instead.
async function countUsersByRole(roleId) {
    const response = await fetch(env_1.default.userServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: 'query($roleId: Int!) { usersByRoleCount(roleId: $roleId) }',
            variables: { roleId },
        }),
    });
    if (!response.ok) {
        throw new Error(`user service returned ${response.status} while checking role usage`);
    }
    const body = (await response.json());
    if (body.errors && body.errors.length) {
        throw new Error('user service returned an error while checking role usage');
    }
    return body.data?.usersByRoleCount ?? 0;
}
//# sourceMappingURL=userService.js.map