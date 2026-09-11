"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.get = get;
exports.create = create;
exports.update = update;
exports.remove = remove;
const repository = __importStar(require("../repositories/roles.repository"));
const validator = __importStar(require("../validators/roles.validator"));
const userService = __importStar(require("../integrations/userService"));
const graphqlErrors_1 = require("../../../../shared/errors/graphqlErrors");
// Business rules and use-case logic for roles.
async function list(args, ctx) {
    return repository.findAll();
}
async function get(id) {
    const role = await repository.findById(id);
    if (!role)
        throw (0, graphqlErrors_1.notFound)('Role not found');
    return role;
}
async function create(input, ctx) {
    validator.assertValidCreate(input);
    const duplicateName = await repository.findByName(input.roleName);
    if (duplicateName)
        throw (0, graphqlErrors_1.conflict)('A role with this name already exists');
    if (input.roleCode) {
        const duplicateCode = await repository.findByCode(input.roleCode);
        if (duplicateCode)
            throw (0, graphqlErrors_1.conflict)('A role with this code already exists');
    }
    const userId = ctx?.user?.id ?? null;
    return repository.create(input, userId);
}
async function update(id, input, ctx) {
    const current = await repository.findById(id);
    if (!current)
        throw (0, graphqlErrors_1.notFound)('Role not found');
    validator.assertValidUpdate(input);
    if (input.roleName) {
        const duplicateName = await repository.findByName(input.roleName, id);
        if (duplicateName)
            throw (0, graphqlErrors_1.conflict)('A role with this name already exists');
    }
    if (input.roleCode) {
        const duplicateCode = await repository.findByCode(input.roleCode, id);
        if (duplicateCode)
            throw (0, graphqlErrors_1.conflict)('A role with this code already exists');
    }
    const userId = ctx?.user?.id ?? null;
    return repository.update(id, input, userId);
}
async function remove(id) {
    const current = await repository.findById(id);
    if (!current)
        throw (0, graphqlErrors_1.notFound)('Role not found');
    const usersWithRole = await userService.countUsersByRole(id);
    if (usersWithRole > 0) {
        throw (0, graphqlErrors_1.conflict)('This role is assigned to one or more users and cannot be deleted');
    }
    await repository.remove(id);
    return true;
}
//# sourceMappingURL=roles.service.js.map