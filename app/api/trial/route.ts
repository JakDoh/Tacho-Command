import {
  createTrialToken,
  verifyBetaLicenseToken,
  getTrialStatus,
  verifyTrialToken,
} from "../../../lib/trial-token.js";

const COOKIE_NAME = "tc_beta_trial";
const ACCESS_COOKIE_NAME = "tc_beta_access";
const YEAR_SECONDS = 365 * 24 * 60 * 60;

const secret = () =>
  process.env.TRIAL_SIGNING_SECRET ?? "";

const readCookie = (request: Request, cookieName = COOKIE_NAME) => {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === cookieName) return decodeURIComponent(value.join("="));
  }
  return null;
};

const json = (body: unknown, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init.headers,
    },
  });

export async function GET(request: Request) {
  const signingSecret = secret();
  if (!signingSecret) return json({ status: "unavailable" }, { status: 503 });

  const access = await verifyBetaLicenseToken(signingSecret, readCookie(request, ACCESS_COOKIE_NAME));
  if (access) return json({ status: "licensed", tier: "closed_beta", codeId: access.codeId });

  const token = readCookie(request);
  const payload = await verifyTrialToken(signingSecret, token);
  if (!payload) return json({ status: "not_started" });
  return json(getTrialStatus(payload.startedAt));
}

export async function POST(request: Request) {
  const signingSecret = secret();
  if (!signingSecret) return json({ status: "unavailable" }, { status: 503 });

  const access = await verifyBetaLicenseToken(signingSecret, readCookie(request, ACCESS_COOKIE_NAME));
  if (access) return json({ status: "licensed", tier: "closed_beta", codeId: access.codeId });

  const existing = await verifyTrialToken(signingSecret, readCookie(request));
  const startedAt = existing?.startedAt ?? Math.floor(Date.now() / 1000);
  const token = existing ? readCookie(request) : await createTrialToken(signingSecret, startedAt);
  const status = getTrialStatus(startedAt);

  return json(status, {
    headers: {
      "cache-control": "no-store",
      "set-cookie": `${COOKIE_NAME}=${encodeURIComponent(token ?? "")}; Path=/; Max-Age=${YEAR_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}
