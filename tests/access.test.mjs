import assert from "node:assert/strict";
import test from "node:test";
import {
  createBetaCode,
  createBetaLicenseToken,
  createTrialToken,
  getTrialStatus,
  normalizeBetaCode,
  verifyBetaCode,
  verifyBetaLicenseToken,
  verifyTrialToken,
} from "../lib/trial-token.js";

const secret = "test-only-secret-with-enough-entropy";

test("trial token is signed and expires after exactly 72 hours", async () => {
  const startedAt = 1_800_000_000;
  const token = await createTrialToken(secret, startedAt);
  assert.deepEqual(await verifyTrialToken(secret, token), { startedAt });
  assert.equal((await verifyTrialToken("wrong-secret", token)), null);
  assert.equal(getTrialStatus(startedAt, startedAt + 72 * 60 * 60 - 1).status, "active");
  assert.equal(getTrialStatus(startedAt, startedAt + 72 * 60 * 60).status, "expired");
});

test("beta activation codes are human-readable and server-verifiable", async () => {
  const code = await createBetaCode(secret, "ABCD2345");
  assert.match(code, /^TCB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  assert.deepEqual(await verifyBetaCode(secret, code.toLowerCase()), { codeId: "ABCD2345" });
  assert.equal(await verifyBetaCode(secret, code.replace(/.$/, "Z")), null);
  assert.equal(normalizeBetaCode(" tcb-abcd-2345 "), "TCBABCD2345");
});

test("beta access cookie never contains the activation code", async () => {
  const token = await createBetaLicenseToken(secret, "ABCD2345", 1_800_000_000);
  assert.equal(token.includes("TCB-"), false);
  assert.deepEqual(await verifyBetaLicenseToken(secret, token), {
    codeId: "ABCD2345",
    issuedAt: 1_800_000_000,
  });
  assert.equal(await verifyBetaLicenseToken("wrong-secret", token), null);
});
