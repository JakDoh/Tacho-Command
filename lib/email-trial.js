import { TRIAL_DURATION_SECONDS, getTrialStatus } from './trial-token.js';
export const LOGIN_SECONDS = 15 * 60;
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_COOKIE = '__Host-tc_session';
const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const hashToken = async token => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token))));
export function normalizeEmail(input) {
  if (typeof input !== 'string') return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email)) return null;
  return email;
}
export async function privateId(secret, kind, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(kind + ':' + value))));
}
export async function takeLimit(db, id, limit, windowSeconds, now) {
  const result = await db.prepare(`INSERT INTO beta_request_limits (id, count, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(id) DO UPDATE SET count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END,
    expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END RETURNING count`)
    .bind(id, now + windowSeconds, now, now).first();
  return result.count <= limit;
}
export async function createLogin(db, accountId, now) {
  const token = randomToken();
  await db.batch([
    db.prepare('INSERT INTO beta_accounts (id, created_at) VALUES (?, ?) ON CONFLICT(id) DO NOTHING').bind(accountId, now),
    db.prepare('INSERT INTO beta_login_tokens (token_hash, account_id, expires_at) VALUES (?, ?, ?)').bind(await hashToken(token), accountId, now + LOGIN_SECONDS),
  ]);
  return token;
}
export async function consumeLogin(db, token, now) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  // Atomic consumption; the trial start is immutable across logins/devices.
  const link = await db.prepare('DELETE FROM beta_login_tokens WHERE token_hash = ? AND expires_at > ? RETURNING account_id')
    .bind(await hashToken(token), now).first();
  if (!link) return null;
  const sessionToken = randomToken();
  await db.batch([
    db.prepare('UPDATE beta_accounts SET trial_started_at = COALESCE(trial_started_at, ?) WHERE id = ?').bind(now, link.account_id),
    db.prepare('INSERT INTO beta_sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)').bind(await hashToken(sessionToken), link.account_id, now + SESSION_SECONDS),
  ]);
  return sessionToken;
}
export async function sessionStatus(db, token, now) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return {status:'not_started', serverNow:now};
  const row = await db.prepare(`SELECT a.trial_started_at FROM beta_sessions s JOIN beta_accounts a ON a.id = s.account_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).bind(await hashToken(token), now).first();
  if (!row || !Number.isInteger(row.trial_started_at)) return {status:'not_started', serverNow:now};
  return {...getTrialStatus(row.trial_started_at, now), serverNow:now, durationSeconds:TRIAL_DURATION_SECONDS};
}
export function readSessionCookie(request) {
  for (const item of (request.headers.get('cookie') || '').split(';')) {
    const [name, value] = item.trim().split('=');
    if (name === SESSION_COOKIE) return value;
  }
  return null;
}
export async function cleanupEmailAuth(db, now) {
  await db.batch([
    db.prepare('DELETE FROM beta_login_tokens WHERE expires_at <= ?').bind(now),
    db.prepare('DELETE FROM beta_sessions WHERE expires_at <= ?').bind(now),
    db.prepare('DELETE FROM beta_request_limits WHERE expires_at <= ?').bind(now),
    db.prepare('DELETE FROM beta_accounts WHERE trial_started_at IS NULL AND created_at < ? AND id NOT IN (SELECT account_id FROM beta_login_tokens)').bind(now - 86400),
  ]);
}
