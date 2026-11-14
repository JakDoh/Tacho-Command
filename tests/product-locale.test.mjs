import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveProductLocale, localizedLandingHref, publishProductLocale, PRODUCT_LOCALE_KEY, PRODUCT_LOCALE_EVENT} from '../lib/product-locale.js';

test('localized landing and legal query take precedence over stale saved and browser languages',()=>{
 assert.equal(resolveProductLocale({path:'/de',saved:'sr',browser:'en-US'}),'de');
 assert.equal(resolveProductLocale({path:'/privacy',search:'?lang=hu',saved:'sr',browser:'en-US'}),'hu');
});
test('root and app honor saved preference, supported browser variants and English fallback',()=>{
 assert.equal(resolveProductLocale({path:'/',saved:'de',browser:'sr'}),'de');
 assert.equal(resolveProductLocale({path:'/app',browser:'RO-ro'}),'ro');
 assert.equal(resolveProductLocale({path:'/app',saved:'invalid',browser:'fr-FR'}),'en');
});
test('localized navigation preserves campaign attribution and connection anchor',()=>{
 assert.equal(localizedLandingHref('en','?utm_source=instagram&utm_medium=paid_social','#connect'),'/en?utm_source=instagram&utm_medium=paid_social#connect');
});
test('locale changes synchronize same-tab listeners, saved preference and document language',()=>{
 const oldWindow=globalThis.window, oldDocument=globalThis.document, oldCustomEvent=globalThis.CustomEvent;
 const values=new Map();let event;
 globalThis.window={localStorage:{setItem:(k,v)=>values.set(k,v)},dispatchEvent:e=>{event=e;}};
 globalThis.document={documentElement:{lang:'sr'}};
 globalThis.CustomEvent=class {constructor(type,options){this.type=type;this.detail=options.detail;}};
 try {
  assert.equal(publishProductLocale('de-AT'),'de');
  assert.equal(values.get(PRODUCT_LOCALE_KEY),'de');
  assert.equal(document.documentElement.lang,'de');
  assert.equal(event.type,PRODUCT_LOCALE_EVENT);assert.equal(event.detail,'de');
  window.localStorage.setItem=()=>{throw new Error('storage blocked');};
  assert.equal(publishProductLocale('hu'),'hu');assert.equal(event.detail,'hu');
 } finally {globalThis.window=oldWindow;globalThis.document=oldDocument;globalThis.CustomEvent=oldCustomEvent;}
});
