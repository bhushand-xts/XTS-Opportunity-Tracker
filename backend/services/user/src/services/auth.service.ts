
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import * as users from '../repositories/user.repository';

const scrypt = promisify(scryptCallback);
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7;

export interface AuthResult {
  token: string;
  user: { id: number; firstName: string | null; lastName: string | null; email: string };
}

function validateCredentials(email: string, password: string): void {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return salt + ':' + key.toString('hex');
}

async function passwordMatches(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const key = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}

async function issueSession(user: { id: number; firstName: string | null; lastName: string | null; email: string }): Promise<AuthResult> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await users.createSession(user.id, tokenHash, new Date(Date.now() + SESSION_LIFETIME_MS));
  return { token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } };
}

async function register(firstName: string, lastName: string, email: string, password: string): Promise<AuthResult> {
  validateCredentials(email, password);
  if (await users.findByEmail(email.trim())) throw new Error('An account already exists for this email.');
  const user = await users.createUser(firstName.trim(), lastName.trim(), email.trim(), await hashPassword(password));
  return issueSession(user);
}

async function login(email: string, password: string): Promise<AuthResult> {
  validateCredentials(email, password);
  const user = await users.findByEmail(email.trim());
  if (!user || !(await passwordMatches(password, user.passwordHash))) throw new Error('Invalid email or password.');
  return issueSession(user);
}

async function list(args: Record<string, any>, ctx: unknown) {
  return [];
}

export { list, register, login };
