"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertValidCreate = assertValidCreate;
exports.assertValidUpdate = assertValidUpdate;
const graphqlErrors_1 = require("../../../../shared/errors/graphqlErrors");
function assertValidCreate(input) {
    const errors = [];
    if (!input.roleName || !input.roleName.trim())
        errors.push('Role Name is required');
    if (errors.length)
        throw (0, graphqlErrors_1.validationFailed)(errors.join(', '));
}
function assertValidUpdate(input) {
    const errors = [];
    if ('roleName' in input && (!input.roleName || !input.roleName.trim())) {
        errors.push('Role Name cannot be empty');
    }
    if (errors.length)
        throw (0, graphqlErrors_1.validationFailed)(errors.join(', '));
}
//# sourceMappingURL=roles.validator.js.map