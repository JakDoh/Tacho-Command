import assert from 'node:assert/strict';import test from 'node:test';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import {createFieldProvenProductState} from '../lib/field-proven-product-state.js';
import {normalizeParserCardResult} from '../lib/app-v2-parser-card-adapter.js';
import {projectCardTimelineForPhone} from '../lib/app-v2-phone-timeline.js';
import {calendarCardPeriod} from '../lib/card-period.js';
import {openAppV2FieldTransport} from '../lib/app-v2-field-transport.js';
import {readCookieValue} from '../lib/admin-auth.js';
import {purgeExpiredTechnicalEvents} from '../lib/retention-cleanup.js';
test('unknown numeric values never become confirmed zero',()=>{
 for(const value of [null,undefined,'',false]) {
 const state=createFieldProvenProductState({live:{connected:true,snapshotConfirmed:true,dailyDrivingSec:value,cumulativeBreakSec:value},card:{fortnightDrivingMinutes:value}});
 assert.equal(state.todayDrivingMinutes,null);assert.equal(state.cumulativeBreakMinutes,null);assert.equal(state.fortnightDrivingMinutes,null);
 }
 assert.equal(createFieldProvenProductState({live:{connected:true,snapshotConfirmed:true,dailyDrivingSec:0}}).todayDrivingMinutes,0);
});
test('connection without confirmed snapshot is not verified LIVE',()=>{
 const state=createFieldProvenProductState({live:{connected:true,snapshotConfirmed:false,dailyDrivingSec:0}});
 assert.equal(state.live,false);assert.equal(state.liveSnapshotAvailable,false);assert.equal(state.todayDrivingMinutes,null);
});
test('current day is cut at capture time and a short period remains unknown',()=>{
 const state=normalizeParserCardResult({complete:true,days:[{date:'2026-09-28',segments:[{activity:'rest',startMinute:0,endMinute:480},{activity:'driving',startMinute:480,endMinute:1440}]}]},{capturedAtIso:'2026-09-28T10:00:00Z'});
 assert.equal(state.historyDays[0].drivingMinutes,120);assert.equal(state.historyDays[0].segments.at(-1).endMinute,600);assert.equal(state.fortnightDrivingMinutes,null);
});
test('phone projection splits midnight and preserves elapsed minutes across DST',()=>{
 for(const date of ['2026-03-29','2026-10-25','2026-09-28']) {
 const card={historyDays:[{dateIso:date,segments:[{kind:'drive',startMinute:0,endMinute:1440,minutes:1440}],events:[]}],lastCardReadAtIso:'2026-12-31T00:00:00Z'};
 const projected=projectCardTimelineForPhone(card,'Europe/Vienna',{now:new Date('2026-12-31T00:00:00Z')});
 assert.equal(projected.historyDays.reduce((sum,d)=>sum+d.drivingMinutes,0),1440);
 assert.ok(projected.historyDays.every(d=>d.segments.every(s=>s.startMinute>=0&&s.endMinute<=1440)));
 }
});
test('calendar period requires every date, not just its first day',()=>{
 const days=Array.from({length:8},(_,i)=>({dateIso:`2026-09-${21+i}`,drivingMinutes:60}));
 const options={now:new Date('2026-09-28T12:00:00Z'),timeZone:'Europe/Vienna'};
 assert.equal(calendarCardPeriod(days,options).minutes,480);
 assert.equal(calendarCardPeriod(days.filter((_,i)=>i!==3),options).minutes,null);
 assert.equal(calendarCardPeriod(days.slice(0,1),options).complete,false);
});
test('failed LIVE service discovery disconnects the retained GATT handle',async()=>{
 let disconnected=0;const gatt={connected:true,connect:async()=>({getPrimaryServices:async()=>[]}),disconnect(){disconnected++;this.connected=false;}};
 await assert.rejects(openAppV2FieldTransport({bluetooth:{requestDevice:async()=>({gatt})}}),/servis/);
 assert.equal(disconnected,1);
});
test('malformed cookie is unauthenticated rather than throwing',()=>{
 assert.equal(readCookieValue(new Request('https://example.test',{headers:{cookie:'tc_admin_session=%ZZ'}}),'tc_admin_session'),null);
});
test('service worker excludes API and admin from online interception and offline cache',async()=>{
 const handlers={};let intercepted=0;
 vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{URL,self:{location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn}});
 for(const path of ['/api/admin/session','/api/admin/overview','/api/trial','/api/technical-telemetry','/admin'])handlers.fetch({request:new Request('https://example.test'+path),respondWith(){intercepted++;}});
 assert.equal(intercepted,0);
});
test('cache activation removes only prior app shell caches',async()=>{
 const handlers={},removed=[];let work;
 vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{self:{addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim(){}}},caches:{keys:async()=>['unrelated-cache','tachocommand-shell-v47-app-v3','tachocommand-shell-v49-email-beta','tachocommand-shell-v50-canonical-origin','tachocommand-shell-v51-read-reliability','tachocommand-shell-v52-transfer-indicator'],delete:async key=>removed.push(key)}});
 handlers.activate({waitUntil(p){work=p;}});await work;assert.deepEqual(removed,['tachocommand-shell-v47-app-v3','tachocommand-shell-v49-email-beta','tachocommand-shell-v50-canonical-origin','tachocommand-shell-v51-read-reliability']);
});
test('retention runs without ingest for both event stores',async()=>{
 const calls=[];await purgeExpiredTechnicalEvents({prepare(sql){return {bind(value){calls.push([sql,value]);return {};}}},batch:async()=>[]},Date.UTC(2026,8,28));
 assert.equal(calls.length,2);assert.ok(calls[0][0].includes('technical_telemetry_events'));assert.ok(calls[1][0].includes('product_analytics_events'));assert.ok(calls.every(c=>Number.isFinite(c[1])));
});
