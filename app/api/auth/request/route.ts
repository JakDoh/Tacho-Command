import { emailAuthCopy } from '../../../../lib/email-auth-copy.js';
import { authEnvironment, authJson, sameOrigin } from '../../../../lib/email-auth-server';
import { cleanupEmailAuth, createLogin, hashToken, normalizeEmail, privateId, takeLimit } from '../../../../lib/email-trial.js';
import { readLimitedJson } from '../../../../lib/request-guards';
export async function POST(request: Request) {
  try {
    const {db, secret, apiKey, from, origin} = await authEnvironment();
    if (!sameOrigin(request, origin)) return authJson({status:'forbidden'}, 403);
    const now = Math.floor(Date.now()/1000);
    const ipKey = await privateId(secret, 'ip', request.headers.get('cf-connecting-ip') || 'unknown');
    if (!await takeLimit(db, ipKey, 5, 900, now)) return authJson({status:'rate_limited'}, 429, {'retry-after':'900'});
    let input: {email?:unknown; locale?:unknown};
    try { input = await readLimitedJson(request, 1024) as typeof input; } catch { return authJson({status:'invalid_request'}, 400); }
    const email = normalizeEmail(input?.email);
    if (!email) return authJson({status:'invalid_email'}, 400);
    const locale = typeof input.locale === 'string' && ['sr','en','de','ru','bg','ro','hu'].includes(input.locale) ? input.locale : 'en';
    const accountId = await privateId(secret, 'email', email);
    if (!await takeLimit(db, accountId, 1, 60, now)) return authJson({status:'rate_limited'}, 429, {'retry-after':'60'});
    await cleanupEmailAuth(db, now);
    const token = await createLogin(db, accountId, now);
    // Fragment keeps the secret out of server access logs. Confirmation needs an explicit POST.
    const link = `${origin}/verify?lang=${locale}#${token}`;
    const t = emailAuthCopy[locale as keyof typeof emailAuthCopy];
    const response = await fetch('https://api.resend.com/emails', {
      method:'POST', headers:{authorization:`Bearer ${apiKey}`, 'content-type':'application/json', 'Idempotency-Key':`login-${await hashToken(token)}`},
      body:JSON.stringify({from, to:[email], subject:`TachoCommand — ${t.confirm}`,
        text:`TachoCommand\n\n${t.confirm}\n${link}\n\n${t.intro}\n\n${t.mailNote}`}),
      signal:AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      await db.prepare('DELETE FROM beta_login_tokens WHERE token_hash = ?').bind(await hashToken(token)).run();
      return authJson({status:'unavailable'}, 503);
    }
    return authJson({status:'sent'});
  } catch { return authJson({status:'unavailable'}, 503); }
}
