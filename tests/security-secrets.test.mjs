import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const sourcePaths = [
  "../app/api/trial/route.ts",
  "../app/api/activate/route.ts",
  "../app/field-test/page.tsx",
  "../app/field-test/read-only-field-test-client.tsx",
];

const retiredFieldTestPaths = [
  "../TachoCommand_FieldTest.html",
  "../public/field-test.html",
  "../app/field-test/field-test-client.tsx",
];

test("never ships a signing secret or client-side HMAC verifier", async () => {
  for (const path of sourcePaths) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /MASTER_SECRET/);
    assert.doesNotMatch(source, /crypto\.subtle\.(?:importKey|sign)/);
    assert.doesNotMatch(source, /TRIAL_SIGNING_SECRET\s*\|\|\s*["']/);
  }
});

test("retired standalone and RHMI field-test sources stay deleted", async () => {
  for (const path of retiredFieldTestPaths) {
    await assert.rejects(
      access(new URL(path, import.meta.url)),
      (error) => error?.code === "ENOENT",
      `retired field-test surface returned: ${path}`,
    );
  }
});

test("server activation and trial routes fail closed without configured signing secret", async () => {
  const trial = await readFile(new URL("../app/api/trial/route.ts", import.meta.url), "utf8");
  const activate = await readFile(new URL("../app/api/activate/route.ts", import.meta.url), "utf8");
  assert.match(trial, /TRIAL_SIGNING_SECRET\?\.trim\(\) \|\| null/);
  assert.match(trial, /status: "unavailable".*status: 503/s);
  assert.match(activate, /TRIAL_SIGNING_SECRET\?\.trim\(\)/);
  assert.match(activate, /status: "unavailable".*status: 503/s);
});
