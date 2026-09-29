export async function authEnvironment() {
  const {env} = await import('cloudflare:workers');
  const secret = process.env.EMAIL_ID_SECRET?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  const origin = process.env.AUTH_PUBLIC_ORIGIN?.trim();
  if (!env.DB || !secret || secret.length < 32 || !apiKey || !from || !origin) throw new Error('auth_unavailable');
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin) throw new Error('invalid_auth_origin');
  return {db:env.DB, secret, apiKey, from, origin};
}
export const authJson = (body: unknown, status = 200, headers: Record<string,string> = {}) =>
  Response.json(body, {status, headers:{'cache-control':'no-store', ...headers}});
export function sameOrigin(request: Request, origin: string) {
  return request.headers.get('origin') === origin && new URL(request.url).origin === origin;
}
