import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedBleOperation,claimBleDevice} from '../lib/ble-operation.js';
import {openAppV2FieldTransport} from '../lib/app-v2-field-transport.js';
import {readAppV2GoldenCardPayload} from '../lib/app-v2-golden-card-browser-transport.js';
import {readCoreDriverTelemetry} from '../lib/tacho-live.js';
import {reviewUtcCardBreaks,exportUtcCardCsv} from '../lib/card-utc-review.js';
import {acceptAppV2CardResult} from '../lib/app-v2-card-result-boundary.js';
import {acceptAppV2CardRead,beginAppV2CardRead} from '../lib/app-v2-card-session.js';
const never=()=>new Promise(()=>{});
const deviceWith = gatt => ({gatt,addEventListener(){},removeEventListener(){}});

for (const phase of ['connect','services','characteristics','notifications']) {
  for (const kind of ['live','card']) {
    test(`${kind} bounds a hung ${phase} operation`,async()=>{
      let disconnected=0;
      // Use the exported protocol UUIDs: no production commands are sent in this fixture.
      const ble=await import('../lib/tacho-ble.js');
      const prefix=kind==='live'?'TACHO_DIAGNOSTICS':'TACHO_DOWNLOAD';
      const ch=uuid=>({uuid,properties:{write:true},addEventListener(){},removeEventListener(){},
        startNotifications:phase==='notifications'?never:async()=>{},writeValueWithResponse:async()=>{}});
      const service={uuid:ble[prefix+'_SERVICE_UUID'], getCharacteristics:phase==='characteristics'?never:async()=>[ch(ble[prefix+'_FIFO_UUID']),ch(ble[prefix+'_CREDITS_UUID'])]};
      const server={getPrimaryServices:phase==='services'?never:async()=>[service]};
      const device=deviceWith({connected:true,connect:phase==='connect'?never:async()=>server,disconnect(){disconnected++;this.connected=false;}});
      const operation=kind==='live'
        ? openAppV2FieldTransport({bluetooth:{requestDevice:async()=>device},operationTimeoutMs:15})
        : readAppV2GoldenCardPayload({device,operationTimeoutMs:15});
      await assert.rejects(operation,/TIMEOUT/);
      assert.ok(disconnected>=1);
    });
  }
}

test('abort rejects a hung card connect promptly',async()=>{
  const controller=new AbortController();
  const device=deviceWith({connected:false,connect:never,disconnect(){}});
  const operation=readAppV2GoldenCardPayload({device,signal:controller.signal,operationTimeoutMs:5000});
  controller.abort();
  await assert.rejects(operation,/CANCELLED/);
});

test('late connect resolution cannot disconnect a successor lease',async()=>{
  let release,disconnects=0;
  const device=deviceWith({disconnect(){disconnects++;}});
  const old=claimBleDevice(device);
  const operation=boundedBleOperation(()=>new Promise(r=>{release=r;}),{timeoutMs:10,onLateResult:()=>old.disconnectIfOwner()});
  await assert.rejects(operation,/TIMEOUT/);
  old.close();
  const successor=claimBleDevice(device);
  release({}); await new Promise(r=>setTimeout(r,0));
  assert.equal(disconnects,1); assert.equal(successor.active(),true);
  successor.close(); assert.equal(disconnects,2);
});

test('LIVE refresh yields before the next DID when handoff requests the bus',async()=>{
  let continueRefresh=true,calls=0;
  await assert.rejects(readCoreDriverTelemetry(async()=>{
    calls++;continueRefresh=false;
    return [1,1,0x62,0xf9,0x03,0];
  },4000,{sleepImpl:async()=>{},shouldContinue:()=>continueRefresh}),/LIVE_REFRESH_YIELDED/);
  assert.equal(calls,1);
});

const card={cardReadComplete:true,historyDaysAvailable:1,historyDays:[{dateIso:'2026-10-25',dateLabel:'2026-10-25',drivingMinutes:300,
  segments:[{kind:'drive',startMinute:0,endMinute:300,minutes:300}],events:[]}]};
test('break calculation is invariant across phone zones including repeated DST hour',()=>{
  for(const zone of ['UTC','Europe/Vienna','America/New_York','Asia/Kolkata','Pacific/Auckland']){
    const result=reviewUtcCardBreaks(card,zone);
    assert.equal(result.incomplete,false);assert.equal(result.findings.length,1);
    assert.equal(result.findings[0].excessMinutes,30);
  }
});
test('CSV carries unambiguous UTC and local offsets through DST',()=>{
  const csv=exportUtcCardCsv(card,'Europe/Vienna',false);
  assert.match(csv,/2026-10-25T00:00:00.000Z/);assert.match(csv,/2026-10-25T05:00:00.000Z/);
  assert.match(csv,/GMT\+2/);assert.match(csv,/GMT\+1/);assert.match(csv,/"Stored on this device","no"/);
});
test('storage failure preserves a verified in-memory result without declaring persistence',()=>{
  let writes=0;
  const result=acceptAppV2CardResult({cardState:card,storage:{setItem(){writes++;throw new Error('QuotaExceededError');}}});
  assert.equal(result.status,'accepted_unsaved');assert.equal(result.snapshot,null);
  assert.equal(result.card.historyDays[0].drivingMinutes,300);assert.equal(writes,1);
  const session=acceptAppV2CardRead(beginAppV2CardRead(),result);
  assert.equal(session.phase,'accepted');assert.equal(session.persisted,false);
});
