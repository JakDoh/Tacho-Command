import { sessionEnvironment, authJson } from '../../../lib/email-auth-server';
import { readSessionCookie, sessionStatus } from '../../../lib/email-trial.js';
export async function GET(request: Request) {
  try {
    const {db, ownerAccountId} = await sessionEnvironment();
    return authJson(await sessionStatus(db, readSessionCookie(request), Math.floor(Date.now()/1000), ownerAccountId));
  } catch { return authJson({status:'unavailable'},503); }
}
// Cookie-only trials cannot bypass account activation.
export async function POST() { return authJson({status:'email_required'}, 410); }
