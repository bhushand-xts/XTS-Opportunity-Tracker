"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = auth;
// Validates the token and puts the user on the request.
// Placeholder: msttbl_user has no email or external id column yet.
function auth(req, res, next) {
    req.user = null;
    next();
}
//# sourceMappingURL=auth.middleware.js.map