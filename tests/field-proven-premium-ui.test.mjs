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
 const html=render(Ui,{state:createFieldProvenProductState(),controls:{...controls,phase:'error',cardDiagnostic:{stage:'waiting_first_packet',lastConfirmedStage:'request_upload',errorCode:'first_packet_timeout',elapsedMs:90000,packets:0,bytes:0,pendingResponses:3,firstPacketTimeoutMs:90000}}});
 assert.match(html,/request_upload/);assert.match(html,/first_packet_timeout/);assert.match(html,/90\.0/);assert.doesNotMatch(html,/<progress/);
});

test('detailed diagnostics expose stalled progress and a local export action',()=>{
 const html=render(Ui,{state:createFieldProvenProductState(),controls:{...controls,phase:'card-reading',cardDiagnostic:{stage:'receiving',lastConfirmedStage:'receiving',errorCode:null,elapsedMs:80000,packets:107,bytes:26000,pendingResponses:1,firstPacketTimeoutMs:90000,cardIdleTimeoutMs:60000,packetIdleMs:11000,ackRequested:108,ackWritten:108,events:[{ms:69000,event:'ack:write_complete',counter:108}]}}});
 assert.match(html,/Prenos čeka sledeći paket/);assert.match(html,/Preuzmi dijagnostiku/);assert.match(html,/ack:write_complete/);assert.match(html,/counter=108/);
});
