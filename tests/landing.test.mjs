import assert from 'node:assert/strict';import test from 'node:test';import {readFile} from 'node:fs/promises';
import {component,render} from './helpers/render-component.mjs';
const Landing=await component('app/landing-page.tsx');
test('all locales expose direct beta access and bounded hardware claims',()=>{
 for(const locale of ['sr','en','de','ru','bg','ro','hu']) {const html=render(Landing,{initialLocale:locale});assert.match(html,/href="\/app"/);assert.match(html,/4\.1a/);assert.match(html,/Android/);assert.match(html,/72/);assert.match(html,/id="connect"/);assert.doesNotMatch(html,/AT LINE|9,99|TrialLauncher|03:45/);}
});
test('Serbian landing explains stationary use, local data and scope of break analysis',()=>{
 const html=render(Landing,{initialLocale:'sr'});assert.match(html,/vozilo miruje/);assert.match(html,/nije potpuna analiza prekršaja/);assert.match(html,/ITS/);assert.match(html,/šestocifreni PIN/);
});
test('install event is consumed before prompting, including dismissal',async()=>{
 const source=await readFile(new URL('../app/install-guide.tsx',import.meta.url),'utf8');
 assert.ok(source.indexOf('setInstallPrompt(null);',source.indexOf('const installNow'))<source.indexOf('await prompt.prompt()'));
});
test('PWA identity remains unchanged',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.id,'/app');assert.equal(manifest.start_url,'/app');assert.equal(manifest.display,'standalone');
});
test('shared product version remains the final visible landing item',async()=>{
 const source=await readFile(new URL('../app/landing-page.tsx',import.meta.url),'utf8');
 const version=source.indexOf('className="tcx-version-line"');
 const footerClose=source.indexOf('</footer>',version);
 assert.ok(version>0);assert.ok(footerClose>version);assert.doesNotMatch(source.slice(version,footerClose),/<(?:p|nav|section|a)\b/);
});
test('all seven legal translations identify the supplied private controller and retain access policy',async()=>{
 const {legalCopy}=await import('../lib/legal-copy.js');
 for(const locale of ['sr','en','de','ru','bg','ro','hu']){
   assert.equal(legalCopy[locale].titles.length,3);
   assert.match(legalCopy[locale].terms[0][1],/72/);
   assert.ok(legalCopy[locale].privacy.length>=5);
 }
 const source=await readFile(new URL('../app/localized-legal-page.tsx',import.meta.url),'utf8');
 assert.match(source,/Boban Canic/);assert.match(source,/Beim Spitzerriegel 2/);assert.match(source,/2500 Baden/);
});
