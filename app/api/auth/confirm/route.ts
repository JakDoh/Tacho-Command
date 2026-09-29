import { authEnvironment, authJson, sameOrigin } from '../../../../lib/email-auth-server';
import { consumeLogin, privateId, SESSION_COOKIE, SESSION_SECONDS, sessionStatus, takeLimit } from '../../../../lib/email-trial.js';
import { readLimitedJson } from '../../../../lib/request-guards';
export async function POST(request: Request) {
  try {
    const {db, secret, origin, ownerAccountId} = await authEnvironment();
    if (!sameOrigin(request, origin)) return authJson({status:'forbidden'}, 403);
    const now = Math.floor(Date.now()/1000);
    const key = await privateId(secret, 'confirm-ip', request.headers.get('cf-connecting-ip') || 'unknown');
    if (!await takeLimit(db, key, 10, 900, now)) return authJson({status:'rate_limited'}, 429);
    let input: {token?:unknown};
    try { input = await readLimitedJson(request, 1024) as typeof input; } catch { return authJson({status:'invalid_request'},400); }
    if (typeof input?.token !== 'string') return authJson({status:'invalid_link'},400);
    const token = await consumeLogin(db, input.token, now);
    if (!token) return authJson({status:'invalid_link'},400);
    return authJson(await sessionStatus(db, token, now, ownerAccountId), 200, {
      'set-cookie':`${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
    });
  } catch { return authJson({status:'unavailable'},503); }
}
