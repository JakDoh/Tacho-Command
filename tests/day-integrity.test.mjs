import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAppV2CardPayload } from '../lib/app-v2-canonical-card-parser.js';
import { normalizeParserCardResult } from '../lib/app-v2-parser-card-adapter.js';
import { projectCardTimelineForPhone } from '../lib/app-v2-phone-timeline.js';
import { createFieldProvenProductState } from '../lib/field-proven-product-state.js';
import { component, render } from './helpers/render-component.mjs';

function payload(records) {
  const bytes=[]; let previous=0; const positions=[];
  for (const [date, changes] of records) {
    positions.push(bytes.length);
    const length=12+changes.length*2;
    const record=new Uint8Array(length); const view=new DataView(record.buffer);
    view.setUint16(0,previous);view.setUint16(2,length);view.setUint32(4,Date.parse(date+'T00:00:00Z')/1000);
    changes.forEach((word,i)=>view.setUint16(12+i*2,word));bytes.push(...record);previous=length;
  }
  const result=new Uint8Array(9+bytes.length);result.set([5,4,2]);const view=new DataView(result.buffer);
  view.setUint16(3,bytes.length+4);view.setUint16(5,0);view.setUint16(7,positions.at(-1));result.set(bytes,9);return result;
}
const unknownOut=0x2000;
const work=0x1000;

test('TC-EVENT-03: raw unknown activity retains removal/insertion through normalization and cutoff',()=>{
  const parsed=parseAppV2CardPayload(payload([['2026-09-28',[0,unknownOut|120,work|180]]]));
  const card=normalizeParserCardResult(parsed,{capturedAtIso:'2026-09-28T12:00:00Z'});
  assert.deepEqual(card.historyDays[0].events,[{kind:'card-removed',minute:120},{kind:'card-inserted',minute:180}]);
  assert.deepEqual(card.historyDays[0].segments.map(s=>[s.startMinute,s.endMinute]),[[0,120],[180,720]]);
  const early=normalizeParserCardResult(parsed,{capturedAtIso:'2026-09-28T02:30:00Z'});
  assert.deepEqual(early.historyDays[0].events,[{kind:'card-removed',minute:120}]);
});
test('midnight transition is retained once; initial card state is not an insertion',()=>{
  const parsed=parseAppV2CardPayload(payload([['2026-09-27',[0,unknownOut|120]],['2026-09-28',[work]]]));
  const card=normalizeParserCardResult(parsed);
  assert.deepEqual(card.historyDays[0].events,[{kind:'card-removed',minute:120}]);
  assert.deepEqual(card.historyDays[1].events,[{kind:'card-inserted',minute:0}]);
});
function projected(date) {
  return projectCardTimelineForPhone({lastCardReadAtIso:'2026-11-01T12:00:00Z',historyDays:[{dateIso:date,segments:[
    {kind:'drive',startMinute:0,endMinute:60,minutes:60},
    {kind:'work',startMinute:60,endMinute:120,minutes:60}],events:[{kind:'card-removed',minute:30},{kind:'card-removed',minute:90}]}]},'Europe/Vienna',{now:new Date('2026-11-01T12:00:00Z')});
}
test('TC-TIME-02: repeated Vienna hour remains ordered, disjoint and labelled through UI state',async()=>{
  const card=projected('2026-10-25');
  const day=createFieldProvenProductState({card}).historyDays[0];
  assert.equal(day.timelineMinutes,1500);
  assert.deepEqual(day.segments.map(s=>[s.timelineStart,s.timelineEnd]),[[120,180],[180,240]]);
  assert.match(day.segments[0].timeLabel,/UTC\+02:00/);assert.match(day.segments[1].timeLabel,/UTC\+01:00/);
  assert.equal(day.events.length,2);assert.ok(day.events[0].utcMinute<day.events[1].utcMinute);
  const html=render(await component('app/app/day-timeline.tsx'),{day,kinds:{drive:'Driving',work:'Work'},locale:'en'});
  assert.match(html,/left:8%;width:4%/);assert.match(html,/left:12%;width:4%/);
  assert.match(html,/02:00–03:00 UTC\+02:00/);assert.match(html,/02:00–03:00 UTC\+01:00/);
});
test('spring-forward uses 23 hours without inventing the skipped clock hour',()=>{
  const day=projected('2026-03-29').historyDays[0];
  assert.equal(day.timelineMinutes,1380);
  assert.deepEqual(day.segments.map(s=>[s.startMinute,s.endMinute,s.timelineStart,s.timelineEnd]),[[60,120,60,120],[180,240,120,180]]);
  assert.equal(day.segments.reduce((sum,s)=>sum+s.minutes,0),120);
});
