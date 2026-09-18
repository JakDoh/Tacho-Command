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
const localePage = fs.readFileSync(new URL("../app/[locale]/page.tsx", import.meta.url), "utf8");
const landingPage = fs.readFileSync(new URL("../app/landing-page.tsx", import.meta.url), "utf8");

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


test("localized landing routes are crawlable and self-canonical with hreflang", () => {
  assert.match(localePage, /const locales = \["sr", "en", "de"\]/);
  assert.match(localePage, /canonical: \`\/\$\{locale\}\`/);
  assert.match(localePage, /"x-default": "\/"/);
  assert.match(localePage, /sr: "\/sr"/);
  assert.match(localePage, /en: "\/en"/);
  assert.match(localePage, /de: "\/de"/);
  assert.match(localePage, /generateStaticParams/);
  assert.match(localePage, /notFound\(\)/);
});

test("localized routes render the existing landing component without duplicating product copy", () => {
  assert.match(localePage, /<LandingPage initialLocale=\{locale\} canonicalLocaleRoute \/>/);
  assert.match(landingPage, /canonicalLocaleRoute/);
  assert.match(landingPage, /router\.push\(\`\/\$\{next\}\`\)/);
  assert.match(landingPage, /lang=\{locale\}/);
});

test("sitemap publishes all three localized landing URLs", () => {
  for (const path of ["/sr", "/en", "/de"]) {
    assert.ok(sitemap.includes(`url: \`\${origin}${path}\``));
  }
});
