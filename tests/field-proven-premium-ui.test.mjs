import assert from 'node:assert/strict';
import test from 'node:test';
import {component,render} from './helpers/render-component.mjs';
import {createFieldProvenProductState} from '../lib/field-proven-product-state.js';
const Ui=await component('app/app/field-proven-premium-ui.tsx');
const controls={phase:'idle',restoreState:'empty',restoredLabel:null,errorText:null,cardReadProgress:null,cardAttemptCode:null,versionLine:'test',locale:'sr',zone:'Europe/Vienna',periodLabel:'2026-09-21 — 2026-09-28',periodComplete:false,savedAvailable:false,screenAwake:false,accepted:false,onLocale(){},onShowSaved(){},onForget(){},onCancel(){},onConnect(){},onReadCard(){}};
test('empty screen shows unknown values and stationary instruction without a success verdict',()=>{
 const html=render(Ui,{state:createFieldProvenProductState(),controls});
 assert.match(html,/vozilo miruje/);assert.match(html,/Nema potvrđenih LIVE/);assert.doesNotMatch(html,/Nema trenutnog upozorenja|Puna pauza ostvarena|Kartica obrađena i sačuvana/);
});
test('transport completion remains processing until the result is accepted',()=>{
 const html=render(Ui,{state:createFieldProvenProductState(),controls:{...controls,phase:'card-reading',cardReadProgress:{complete:true,submessages:269,byteLength:67295}}});
 assert.match(html,/provera i čuvanje/);assert.match(html,/Prekini očitavanje/);assert.doesNotMatch(html,/Kartica obrađena i sačuvana/);assert.doesNotMatch(html,/96%/);
});
test('ordinary card read shows real packet and byte progress without diagnostics mode',()=>{
 const html=render(Ui,{state:createFieldProvenProductState(),controls:{...controls,phase:'card-reading',diagnosticsEnabled:false,cardReadProgress:{complete:false,submessages:125,byteLength:31375}}});
 assert.match(html,/Paketi: 125/);assert.match(html,/31\.4 KB/);assert.match(html,/aria-live="polite"/);assert.doesNotMatch(html,/Detaljna dijagnostika|GATT/);
});
test('accepted card shows final success independently of packet progress',()=>{
 assert.match(render(Ui,{state:createFieldProvenProductState(),controls:{...controls,accepted:true}}),/Kartica obrađena i sačuvana/);
});
test('English and German render localized primary actions',()=>{
 assert.match(render(Ui,{state:createFieldProvenProductState(),controls:{...controls,locale:'en'}}),/Connect tachograph/);
 assert.match(render(Ui,{state:createFieldProvenProductState(),controls:{...controls,locale:'de'}}),/Tachograph verbinden/);
});
test('saved history requires explicit selection',()=>{
 const html=render(Ui,{state:createFieldProvenProductState(),controls:{...controls,savedAvailable:true}});
 assert.match(html,/Prikaži prethodno sačuvanu karticu/);assert.match(html,/nije potvrđena kao kartica/);
});
test('failed zero-packet read retains last confirmed phase and diagnostic code',()=>{
 const html=render(Ui,{state:createFieldProvenProductState(),controls:{...controls,phase:'error',diagnosticsEnabled:true,cardDiagnostic:{stage:'waiting_first_packet',lastConfirmedStage:'request_upload',errorCode:'first_packet_timeout',elapsedMs:90000,packets:0,bytes:0,pendingResponses:3,firstPacketTimeoutMs:90000}}});
 assert.match(html,/request_upload/);assert.match(html,/first_packet_timeout/);assert.match(html,/90\.0/);assert.doesNotMatch(html,/<progress/);
});

test('detailed diagnostics expose stalled progress and a local export action',()=>{
 const html=render(Ui,{state:createFieldProvenProductState(),controls:{...controls,phase:'card-reading',diagnosticsEnabled:true,cardDiagnostic:{stage:'receiving',lastConfirmedStage:'receiving',errorCode:null,elapsedMs:80000,packets:107,bytes:26000,pendingResponses:1,firstPacketTimeoutMs:90000,cardIdleTimeoutMs:60000,packetIdleMs:11000,ackRequested:108,ackWritten:108,events:[{ms:69000,event:'ack:write_complete',counter:108}]}}});
 assert.match(html,/Prenos čeka sledeći paket/);assert.match(html,/Preuzmi dijagnostiku/);assert.match(html,/ack:write_complete/);assert.match(html,/counter=108/);
});

test('historical break finding is visible on overview without opening Attention',()=>{
 const state={...createFieldProvenProductState(),historyDays:[{dateIso:'2026-09-21',segments:[{kind:'drive',startMinute:760,endMinute:1037,minutes:277}]}]};
 assert.match(render(Ui,{state,controls}),/Periodi za proveru: 1/);
});

test('customer interface does not expose protocol diagnostics',()=>{
 const html=render(Ui,{state:createFieldProvenProductState(),controls:{...controls,cardAttemptCode:'TC-ABCDEF',cardDiagnostic:{stage:'receiving',events:[]}}});
 assert.doesNotMatch(html,/GATT|TC-ABCDEF|Detaljna dijagnostika/);
});
test('all requested app languages render translated primary actions',()=>{
 for(const [locale,action] of [['ru','Подключить тахограф'],['bg','Свържи тахограф'],['ro','Conectează tahograful'],['hu','Menetíró csatlakoztatása']]) {
 const html=render(Ui,{state:createFieldProvenProductState(),controls:{...controls,locale}});
 assert.ok(html.includes(action));assert.doesNotMatch(html,/Connect tachograph/);
 }
});
test('all seven app dictionaries contain the same complete key set',async()=>{
 const {appCopy,APP_LANGUAGES}=await import('../lib/product-app-copy.js');
 const expected=Object.keys(appCopy.en).sort();
 for(const locale of Object.keys(APP_LANGUAGES)) {
 assert.deepEqual(Object.keys(appCopy[locale]).sort(),expected);
 assert.equal(appCopy[locale].tabs.length,5);
 for(const value of Object.values(appCopy[locale])) assert.ok(Array.isArray(value)?value.every(Boolean):value.length>0);
 }
});
