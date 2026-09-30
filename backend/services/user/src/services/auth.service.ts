
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import env from '../config/env';
import * as users from '../repositories/user.repository';
import { sendPasswordResetEmail } from '../integrations/mailer';

const scrypt = promisify(scryptCallback);
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7;
//const RESET_TOKEN_LIFETIME_SECONDS = 30; // 30 seconds — TEMP for testing, revert to 60 * 30 (30 min) after
const RESET_TOKEN_LIFETIME_SECONDS = 60 * 30; // 30 minutes
export interface AuthResult {
  token: string;
  user: { id: number; firstName: string | null; lastName: string | null; email: string; roleId: number | null };
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

async function issueSession(user: { id: number; firstName: string | null; lastName: string | null; email: string; roleId: number | null }): Promise<AuthResult> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await users.createSession(user.id, tokenHash, new Date(Date.now() + SESSION_LIFETIME_MS));
  return { token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, roleId: user.roleId } };
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

// The user a login token belongs to (null when there is no token or it is not valid).
// Tokens are stored only as a SHA-256 hash, so hash the one we were given first.
async function userIdFromToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  return users.findUserIdByTokenHash(createHash('sha256').update(token).digest('hex'));
}

// Always changes the caller's own password — userId comes from the signed-in
// session, never from client input, so nobody can change another user's password.
async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
  if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
  const user = await users.findById(userId);
  if (!user) throw new Error('User not found.');
  if (!(await passwordMatches(currentPassword, user.passwordHash))) throw new Error('Current password is incorrect.');
  await users.updatePasswordHash(userId, await hashPassword(newPassword));
  return true;
}

// Always resolves the same way whether or not the email exists, so this can
// never be used to discover which addresses have an account. Failing to send
// the email (bad SMTP config, provider down) also does not surface to the
// caller — this is a security boundary, not just a UX nicety.
async function requestPasswordReset(email: string): Promise<boolean> {
  const trimmed = email.trim();
  const user = trimmed ? await users.findByEmail(trimmed) : null;
  if (user) {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await users.createPasswordResetToken(user.id, tokenHash, RESET_TOKEN_LIFETIME_SECONDS);
    const resetLink = `${env.frontendUrl}/reset-password?token=${rawToken}`;
    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (error) {
      // The token still exists and is valid — only the email failed to send.
      // Logged, not thrown, for the same anti-enumeration reason as above.
      console.error('Failed to send password reset email:', error);
    }
  }
  return true;
}

// The raw token from the emailed link — hashed the same way it was stored,
// so only whoever received that email can complete this.
async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const record = await users.findValidResetToken(tokenHash);
  if (!record) throw new Error('This reset link is invalid or has expired.');
  await users.updatePasswordHash(record.userId, await hashPassword(newPassword));
  await users.markResetTokenUsed(record.tokenId);
  return true;
}

async function list(args: Record<string, any>, ctx: unknown) {
  return [];
}

export { list, register, login, userIdFromToken, changePassword, requestPasswordReset, resetPassword };
