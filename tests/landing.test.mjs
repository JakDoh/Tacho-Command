import assert from 'node:assert/strict';import test from 'node:test';import {readFile} from 'node:fs/promises';
import {component,render} from './helpers/render-component.mjs';
const Landing=await component('app/landing-page.tsx');
test('all locales expose direct beta access and bounded hardware claims',()=>{
 for(const locale of ['sr','en','de']) {const html=render(Landing,{initialLocale:locale});assert.match(html,/href="\/app"/);assert.match(html,/4\.1a/);assert.match(html,/Android/);assert.match(html,/id="connect"/);assert.doesNotMatch(html,/AT LINE|9,99|TrialLauncher|03:45/);}
});
test('Serbian landing explains stationary use, local data and absence of infringement analysis',()=>{
 const html=render(Landing,{initialLocale:'sr'});assert.match(html,/vozilo miruje/);assert.match(html,/nisu dostupne funkcije/);assert.match(html,/ITS/);assert.match(html,/šestocifreni PIN/);
});
test('install event is consumed before prompting, including dismissal',async()=>{
 const source=await readFile(new URL('../app/install-guide.tsx',import.meta.url),'utf8');
 assert.ok(source.indexOf('setInstallPrompt(null);',source.indexOf('const installNow'))<source.indexOf('await prompt.prompt()'));
});
test('PWA identity remains unchanged',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.id,'/app');assert.equal(manifest.start_url,'/app');assert.equal(manifest.display,'standalone');
});
