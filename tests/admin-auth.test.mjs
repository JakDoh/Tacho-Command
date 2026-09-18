import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_SESSION_SECONDS,
  createAdminSessionToken,
  verifyAdminAccessKey,
  verifyAdminSessionToken,
} from "../lib/admin-auth.js";

const ACCESS = "admin-key-0123456789-abcdefghijklmnop";
const SECRET = "admin-signing-secret-0123456789-abcdefghijklmnopqrstuvwxyz";

test("admin access key comparison accepts only the configured high-entropy key", async () => {
  assert.equal(await verifyAdminAccessKey(ACCESS, ACCESS), true);
  assert.equal(await verifyAdminAccessKey(ACCESS, ACCESS + "x"), false);
  assert.equal(await verifyAdminAccessKey("short", "short"), false);
});

test("admin session token is signed and expires after 12 hours", async () => {
  const issuedAt = 1_800_000_000;
  const token = await createAdminSessionToken(SECRET, issuedAt);
  assert.deepEqual(
    await verifyAdminSessionToken(SECRET, token, issuedAt + 60),
    { issuedAt, expiresAt: issuedAt + ADMIN_SESSION_SECONDS },
  );
  assert.equal(await verifyAdminSessionToken(SECRET, token, issuedAt + ADMIN_SESSION_SECONDS), null);
  assert.equal(await verifyAdminSessionToken(SECRET + "x", token, issuedAt + 60), null);
});

test("tampered admin session token fails closed", async () => {
  const token = await createAdminSessionToken(SECRET, 1_800_000_000);
  const changed = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
  assert.equal(await verifyAdminSessionToken(SECRET, changed, 1_800_000_100), null);
});
