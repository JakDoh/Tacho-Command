export const ADMIN_SESSION_COOKIE = "tc_admin_session";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

const TOKEN_VERSION = 1;
const encoder = new TextEncoder();

const toBase64Url = (bytes) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const fromBase64Url = (value) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const signingKey = (secret) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

const signBytes = async (secret, message) =>
  new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(message)));

const digest = async (value) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

export async function verifyAdminAccessKey(expected, provided) {
  if (typeof expected !== "string" || typeof provided !== "string" || expected.length < 24) return false;
  const [left, right] = await Promise.all([digest(expected), digest(provided)]);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

export async function createAdminSessionToken(secret, issuedAtSeconds = Math.floor(Date.now() / 1000)) {
  if (!secret) throw new Error("Admin signing secret is unavailable");
  const issuedAt = Math.floor(issuedAtSeconds);
  const payload = toBase64Url(encoder.encode(JSON.stringify({
    v: TOKEN_VERSION,
    purpose: "admin-access",
    issuedAt,
    expiresAt: issuedAt + ADMIN_SESSION_SECONDS,
  })));
  const signature = await signBytes(secret, `tachocommand:admin:${payload}`);
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifyAdminSessionToken(secret, token, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!secret || !token || !token.includes(".")) return null;
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length > 0) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      fromBase64Url(signature),
      encoder.encode(`tachocommand:admin:${payload}`),
    );
    if (!valid) return null;

    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    if (
      parsed.v !== TOKEN_VERSION ||
      parsed.purpose !== "admin-access" ||
      !Number.isInteger(parsed.issuedAt) ||
      !Number.isInteger(parsed.expiresAt) ||
      parsed.expiresAt <= parsed.issuedAt ||
      parsed.expiresAt - parsed.issuedAt !== ADMIN_SESSION_SECONDS ||
      parsed.expiresAt <= Math.floor(nowSeconds)
    ) return null;

    return Object.freeze({ issuedAt: parsed.issuedAt, expiresAt: parsed.expiresAt });
  } catch {
    return null;
  }
}

export function readCookieValue(request, cookieName) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === cookieName) return decodeURIComponent(value.join("="));
  }
  return null;
}
