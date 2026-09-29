import { normalizeEmail, privateId } from './email-trial.js';
export async function authEnvironment() {
  const {env} = await import('cloudflare:workers');
  const bindings = env as unknown as {
    DB?: D1Database;
    EMAIL_ID_SECRET?: string;
    RESEND_API_KEY?: string;
    AUTH_EMAIL_FROM?: string;
    AUTH_PUBLIC_ORIGIN?: string;
    OWNER_EMAIL?: string;
  };
  const secret = bindings.EMAIL_ID_SECRET?.trim();
  const apiKey = bindings.RESEND_API_KEY?.trim();
  const from = bindings.AUTH_EMAIL_FROM?.trim();
  const origin = bindings.AUTH_PUBLIC_ORIGIN?.trim();
  if (!bindings.DB || !secret || secret.length < 32 || !apiKey || !from || !origin) throw new Error('auth_unavailable');
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin) throw new Error('invalid_auth_origin');
  const ownerEmail = bindings.OWNER_EMAIL ? normalizeEmail(bindings.OWNER_EMAIL) : null;
  const ownerAccountId = ownerEmail ? await privateId(secret, 'email', ownerEmail) : null;
  return {db:bindings.DB, secret, apiKey, from, origin, ownerAccountId};
}
export const authJson = (body: unknown, status = 200, headers: Record<string,string> = {}) =>
  Response.json(body, {status, headers:{'cache-control':'no-store', ...headers}});
export function sameOrigin(request: Request, origin: string) {
  return request.headers.get('origin') === origin && new URL(request.url).origin === origin;
}
