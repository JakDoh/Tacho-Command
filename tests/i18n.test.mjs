import assert from "node:assert/strict";
import test from "node:test";
import { resolveLocale, supportedLocales, translations } from "../lib/i18n.js";

test("ships exactly the approved pilot languages", () => {
  assert.deepEqual(supportedLocales, ["sr", "en", "de"]);
  assert.deepEqual(Object.keys(translations), ["sr", "en", "de"]);
});

test("every language has the same complete key set", () => {
  const reference = Object.keys(translations.sr).sort();
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(translations[locale]).sort(), reference, `translation keys differ for ${locale}`);
    for (const key of reference) assert.ok(translations[locale][key].trim(), `empty ${locale}.${key}`);
  }
});

test("regional browser locales resolve safely", () => {
  assert.equal(resolveLocale("de-AT"), "de");
  assert.equal(resolveLocale("en-GB"), "en");
  assert.equal(resolveLocale("sr-Latn-RS"), "sr");
  assert.equal(resolveLocale("fr-FR"), "sr");
});
