import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../.github/workflows/cloudflare-production-deploy.yml", import.meta.url),
  "utf8",
);

test("production deploy keeps Cloudflare-owned application secrets untouched", () => {
  assert.match(workflow, /wrangler deploy --config dist\/server\/wrangler\.json/);
  assert.doesNotMatch(workflow, /wrangler secret put/);
  assert.doesNotMatch(workflow, /ADMIN_ACCESS_KEY/);
  assert.doesNotMatch(workflow, /ADMIN_SIGNING_SECRET/);
  assert.doesNotMatch(workflow, /TRIAL_SIGNING_SECRET/);
});

test("production deploy still applies versioned D1 migrations before Worker deploy", () => {
  const migrationIndex = workflow.indexOf("wrangler d1 migrations apply tachocommand-prod");
  const deployIndex = workflow.indexOf("wrangler deploy --config dist/server/wrangler.json");

  assert.notEqual(migrationIndex, -1);
  assert.notEqual(deployIndex, -1);
  assert.ok(migrationIndex < deployIndex);
  assert.match(workflow, /0796463f-28ee-485a-8cc4-40b213e7ae26/);
});
