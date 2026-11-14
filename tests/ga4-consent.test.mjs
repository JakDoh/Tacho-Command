import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
async function setup(choice=null,path='/app') {
 const saved=new Map(choice?[['tachocommand.ga4-consent.v1',choice]]:[]);const scripts=[];let reloads=0;
 globalThis.window={location:{hostname:'tachocommand.com',pathname:path,href:'https://tachocommand.com'+path+'?email=private@example.com&utm_source=instagram&utm_medium=social&utm_campaign=beta_nov2026',reload:()=>reloads++},localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,val)=>saved.set(key,val)}};
 globalThis.document={referrer:'https://instagram.com/some-private-path?token=secret',cookie:'tcga_ga=123; unrelated=value',createElement:()=>({}),head:{appendChild:node=>scripts.push(node)}};
 const mod=await import('../lib/ga4-client.js?test='+Math.random());return {mod,scripts,saved,reloads:()=>reloads};
}
test('no Google script, events or identifiers before consent or after refusal',async()=>{
 for(const choice of [null,'denied']){const {mod,scripts}=await setup(choice);mod.ga4PageView();assert.equal(mod.trackGa4('card_read_start'),false);assert.equal(scripts.length,0);assert.equal(window.dataLayer,undefined);}
});
test('consented tracking excludes raw URLs, names, card data and unknown events',async()=>{
 const {mod,scripts}=await setup();mod.setGa4Consent('granted');mod.ga4PageView();mod.trackGa4('card_read_success');assert.equal(mod.trackGa4('some_driver_name'),false);
 assert.equal(scripts.length,1);const wire=JSON.stringify(window.dataLayer);
 assert.ok(!wire.includes('private@example'));assert.ok(!wire.includes('some-private-path'));assert.ok(!wire.includes('token=secret'));assert.ok(!wire.includes('some_driver_name'));
 assert.equal(window.dataLayer.filter(e=>e[0]==='event'&&e[1]==='page_view').length,1);
 assert.equal(window.dataLayer.filter(e=>e[1]==='card_read_success').length,1);
 assert.equal(window.dataLayer[0][1],'default');assert.equal(window.dataLayer[0][2].ad_storage,'denied');
 assert.equal(window.dataLayer.find(e=>e[0]==='config')[2].send_page_view,false);
 assert.equal(window.dataLayer.find(e=>e[0]==='config')[2].campaign_source,'instagram');
});
test('admin, diagnostics and non-production hosts never load Google',async()=>{
 for(const path of ['/admin','/field-test','/unknown']){const {mod,scripts}=await setup('granted',path);mod.ga4PageView();assert.equal(scripts.length,0);}
 const {mod,scripts}=await setup('granted');window.location.hostname='admin.tachocommand.com';assert.equal(mod.startGa4(),false);assert.equal(scripts.length,0);
});
test('revocation disables further events without reloading or altering card storage',async()=>{
 const {mod,saved,reloads}=await setup('granted');saved.set('card-snapshot','private');mod.ga4PageView();mod.setGa4Consent('denied');assert.equal(window['ga-disable-'+mod.GA4_ID],true);assert.equal(mod.trackGa4('card_read_start'),false);assert.equal(reloads(),0);assert.equal(saved.get('card-snapshot'),'private');
});
test('only allowlisted campaign values are forwarded; raw query and fragment are removed',async()=>{
 const {mod}=await setup();const context=mod.safeGa4Context('https://tachocommand.com/app?utm_source=person@example.com&utm_campaign=card123#secret');
 assert.deepEqual(context,{page_location:'https://tachocommand.com/app',page_title:'TachoCommand App',page_referrer:''});
});
test('read telemetry sends event names only, never result objects',async()=>{
 const code=await readFile(new URL('../app/app-v2/app-v2-client.tsx',import.meta.url),'utf8');
 assert.match(code,/trackGa4\("card_read_start"\)/);assert.match(code,/result\.status === "accepted_unsaved".*"card_read_success"/);
 assert.doesNotMatch(code,/trackGa4\([^;]*,\s*(result|telemetry|diagnostic)/);
});

test('cross-tab refusal blocks events without interrupting an active read',async()=>{
 const {mod,saved,reloads}=await setup('granted');mod.ga4PageView();saved.set(mod.GA4_CONSENT_KEY,'denied');mod.syncGa4Consent();assert.equal(mod.trackGa4('card_read_success'),false);assert.equal(reloads(),0);
});
