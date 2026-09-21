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
exports.register = register;
exports.login = login;
const crypto_1 = require("crypto");
const util_1 = require("util");
const users = __importStar(require("../repositories/user.repository"));
const scrypt = (0, util_1.promisify)(crypto_1.scrypt);
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7;
function validateCredentials(email, password) {
    if (!/^\S+@\S+\.\S+$/.test(email))
        throw new Error('Enter a valid email address.');
    if (password.length < 8)
        throw new Error('Password must be at least 8 characters.');
}
async function hashPassword(password) {
    const salt = (0, crypto_1.randomBytes)(16).toString('hex');
    const key = await scrypt(password, salt, 64);
    return salt + ':' + key.toString('hex');
}
async function passwordMatches(password, stored) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash)
        return false;
    const key = await scrypt(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === key.length && (0, crypto_1.timingSafeEqual)(expected, key);
}
async function issueSession(user) {
    const token = (0, crypto_1.randomBytes)(32).toString('base64url');
    const tokenHash = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    await users.createSession(user.id, tokenHash, new Date(Date.now() + SESSION_LIFETIME_MS));
    return { token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } };
}
async function register(firstName, lastName, email, password) {
    validateCredentials(email, password);
    if (await users.findByEmail(email.trim()))
        throw new Error('An account already exists for this email.');
    const user = await users.createUser(firstName.trim(), lastName.trim(), email.trim(), await hashPassword(password));
    return issueSession(user);
}
async function login(email, password) {
    validateCredentials(email, password);
    const user = await users.findByEmail(email.trim());
    if (!user || !(await passwordMatches(password, user.passwordHash)))
        throw new Error('Invalid email or password.');
    return issueSession(user);
}
async function list(args, ctx) {
    return [];
}
//# sourceMappingURL=auth.service.js.map