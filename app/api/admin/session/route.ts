import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_SECONDS,
  createAdminSessionToken,
  readCookieValue,
  verifyAdminAccessKey,
  verifyAdminSessionToken,
} from "../../../../lib/admin-auth.js";

const json = (body: unknown, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init.headers,
    },
  });

const adminSecrets = () => ({
  accessKey: process.env.ADMIN_ACCESS_KEY?.trim() || null,
  signingSecret: process.env.ADMIN_SIGNING_SECRET?.trim() || null,
});

export async function GET(request: Request) {
  const { signingSecret } = adminSecrets();
  if (!signingSecret) return json({ status: "unavailable" }, { status: 503 });

  const session = await verifyAdminSessionToken(
    signingSecret,
    readCookieValue(request, ADMIN_SESSION_COOKIE),
  );
  if (!session) return json({ status: "unauthorized" }, { status: 401 });

  return json({ status: "authenticated", expiresAt: session.expiresAt });
}

export async function POST(request: Request) {
  const { accessKey, signingSecret } = adminSecrets();
  if (!accessKey || !signingSecret) return json({ status: "unavailable" }, { status: 503 });

  let provided = "";
  try {
    const body = await request.json() as { key?: unknown };
    provided = typeof body.key === "string" ? body.key : "";
  } catch {
    return json({ status: "invalid" }, { status: 400 });
  }

  if (!(await verifyAdminAccessKey(accessKey, provided))) {
    return json({ status: "invalid" }, { status: 401 });
  }

  const token = await createAdminSessionToken(signingSecret);
  return json(
    { status: "authenticated" },
    {
      headers: {
        "cache-control": "no-store",
        "set-cookie": `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${ADMIN_SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
      },
    },
  );
}

export async function DELETE(request: Request) {
  const { signingSecret } = adminSecrets();
  if (!signingSecret) return json({ status: "unavailable" }, { status: 503 });

  const session = await verifyAdminSessionToken(
    signingSecret,
    readCookieValue(request, ADMIN_SESSION_COOKIE),
  );
  if (!session) return json({ status: "unauthorized" }, { status: 401 });

  return json(
    { status: "signed_out" },
    {
      headers: {
        "cache-control": "no-store",
        "set-cookie": `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
      },
    },
  );
}
