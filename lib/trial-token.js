export const TRIAL_DURATION_SECONDS = 3 * 24 * 60 * 60;
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

const base32 = (bytes) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
};

const betaSignature = async (secret, codeId) =>
  base32((await signBytes(secret, `tachocommand:beta:${codeId}`)).slice(0, 7)).slice(0, 10);

export const normalizeBetaCode = (value) =>
  String(value ?? "").toUpperCase().replace(/[^A-Z2-9]/g, "");

export async function createBetaCode(secret, codeId) {
  const id = normalizeBetaCode(codeId).slice(0, 8);
  if (id.length !== 8) throw new Error("Beta code id must contain 8 supported characters");
  const signature = await betaSignature(secret, id);
  return `TCB-${id.slice(0, 4)}-${id.slice(4)}-${signature.slice(0, 5)}-${signature.slice(5)}`;
}

export async function verifyBetaCode(secret, value) {
  if (!secret) return null;
  const normalized = normalizeBetaCode(value);
  if (!normalized.startsWith("TCB") || normalized.length !== 21) return null;
  const id = normalized.slice(3, 11);
  const signature = normalized.slice(11);
  const expected = await betaSignature(secret, id);
  if (signature.length !== expected.length) return null;
  let mismatch = 0;
  for (let index = 0; index < signature.length; index += 1) {
    mismatch |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0 ? { codeId: id } : null;
}

export async function createBetaLicenseToken(secret, codeId, issuedAtSeconds) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({
    v: TOKEN_VERSION,
    purpose: "beta-access",
    codeId,
    issuedAt: Math.floor(issuedAtSeconds),
  })));
  const signature = await signBytes(secret, `tachocommand:license:${payload}`);
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifyBetaLicenseToken(secret, token) {
  if (!secret || !token || !token.includes(".")) return null;
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length > 0) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      fromBase64Url(signature),
      encoder.encode(`tachocommand:license:${payload}`),
    );
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    if (parsed.v !== TOKEN_VERSION || parsed.purpose !== "beta-access" || typeof parsed.codeId !== "string" || !Number.isInteger(parsed.issuedAt)) return null;
    return { codeId: parsed.codeId, issuedAt: parsed.issuedAt };
  } catch {
    return null;
  }
}

export async function createTrialToken(secret, startedAtSeconds) {
  if (!secret) throw new Error("Trial signing secret is unavailable");
  const payload = toBase64Url(encoder.encode(JSON.stringify({
    v: TOKEN_VERSION,
    startedAt: Math.floor(startedAtSeconds),
  })));
  const signature = await signBytes(secret, `tachocommand:trial:${payload}`);
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifyTrialToken(secret, token) {
  if (!secret || !token || !token.includes(".")) return null;
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length > 0) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      fromBase64Url(signature),
      encoder.encode(`tachocommand:trial:${payload}`),
    );
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    if (parsed.v !== TOKEN_VERSION || !Number.isInteger(parsed.startedAt) || parsed.startedAt <= 0) return null;
    return { startedAt: parsed.startedAt };
  } catch {
    return null;
  }
}

export function getTrialStatus(startedAtSeconds, nowSeconds = Math.floor(Date.now() / 1000)) {
  const expiresAt = startedAtSeconds + TRIAL_DURATION_SECONDS;
  const remainingSeconds = Math.max(0, expiresAt - Math.floor(nowSeconds));
  return {
    status: remainingSeconds > 0 ? "active" : "expired",
    startedAt: startedAtSeconds,
    expiresAt,
    remainingSeconds,
  };
}
