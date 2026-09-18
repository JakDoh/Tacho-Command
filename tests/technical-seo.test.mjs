import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const rootLayout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const home = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const robots = fs.readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
const sitemap = fs.readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
const appLayout = fs.readFileSync(new URL("../app/app/layout.tsx", import.meta.url), "utf8");
const fieldTest = fs.readFileSync(new URL("../app/field-test/page.tsx", import.meta.url), "utf8");
const adminLayout = fs.readFileSync(new URL("../app/admin/layout.tsx", import.meta.url), "utf8");

test("root metadata uses the verified production domain", () => {
  assert.match(rootLayout, /metadataBase:\s*new URL\("https:\/\/tachocommand\.com"\)/);
  assert.match(home, /canonical:\s*"\/"\s*,/);
  assert.match(home, /openGraph:/);
  assert.match(home, /twitter:/);
});

test("public landing exposes factual WebSite and SoftwareApplication structured data", () => {
  assert.match(home, /"@type": "WebSite"/);
  assert.match(home, /"@type": "SoftwareApplication"/);
  assert.match(home, /operatingSystem: "Android"/);
  assert.match(home, /Web Bluetooth/);
  assert.doesNotMatch(home, /aggregateRating|reviewCount|ratingValue/);
});

test("robots blocks private operational routes and advertises sitemap", () => {
  assert.match(robots, /disallow:\s*\["\/admin", "\/app", "\/field-test", "\/api\/"\]/);
  assert.match(robots, /https:\/\/tachocommand\.com\/sitemap\.xml/);
  assert.match(robots, /host:\s*"https:\/\/tachocommand\.com"/);
});

test("sitemap contains only public landing and legal pages", () => {
  for (const path of ["/", "/privacy", "/terms", "/impressum"]) {
    assert.ok(sitemap.includes(`url: \`\${origin}${path}\``));
  }
  assert.doesNotMatch(sitemap, /\/admin|\/app|\/field-test|\/api\//);
});

test("admin app and field-test surfaces are explicitly noindex", () => {
  for (const source of [adminLayout, appLayout, fieldTest]) {
    assert.match(source, /index:\s*false/);
    assert.match(source, /follow:\s*false/);
  }
});
