import {
  createBetaLicenseToken,
  verifyBetaCode,
} from "../../../lib/trial-token.js";

const ACCESS_COOKIE_NAME = "tc_beta_access";
const TWO_YEARS_SECONDS = 2 * 365 * 24 * 60 * 60;

const json = (body: unknown, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: { "cache-control": "no-store", ...init.headers },
  });

export async function POST(request: Request) {
  const signingSecret =
    process.env.TRIAL_SIGNING_SECRET ?? "";
  if (!signingSecret) return json({ status: "unavailable" }, { status: 503 });

  let code = "";
  try {
    const body = await request.json() as { code?: unknown };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return json({ status: "invalid" }, { status: 400 });
  }

  const verified = await verifyBetaCode(signingSecret, code);
  if (!verified) return json({ status: "invalid" }, { status: 400 });

  const issuedAt = Math.floor(Date.now() / 1000);
  const token = await createBetaLicenseToken(signingSecret, verified.codeId, issuedAt);
  return json(
    { status: "licensed", tier: "closed_beta", codeId: verified.codeId },
    {
      headers: {
        "cache-control": "no-store",
        "set-cookie": `${ACCESS_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${TWO_YEARS_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
      },
    },
  );
}
