"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertValid = assertValid;
const graphqlErrors_1 = require("../../../../shared/errors/graphqlErrors");
// Input and business validation for opportunity.
function assertValid(input) {
    const errors = [];
    // if (!input.name) errors.push('name is required');
    if (errors.length)
        throw (0, graphqlErrors_1.validationFailed)(errors.join(', '));
}
//# sourceMappingURL=opportunity.validator.js.map