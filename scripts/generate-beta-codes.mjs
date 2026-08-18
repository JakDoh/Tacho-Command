import { randomBytes } from "node:crypto";
import { createBetaCode } from "../lib/trial-token.js";

const secret = process.env.TRIAL_SIGNING_SECRET;
const count = Number.parseInt(process.argv[2] ?? "5", 10);
if (!secret) throw new Error("TRIAL_SIGNING_SECRET is required");
if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error("Count must be between 1 and 50");

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomId = () => Array.from(randomBytes(8), (byte) => alphabet[byte % alphabet.length]).join("");

for (let index = 0; index < count; index += 1) {
  console.log(await createBetaCode(secret, randomId()));
}
