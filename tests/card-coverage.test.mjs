import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeParserCardResult } from '../lib/app-v2-parser-card-adapter.js';
import { projectCardTimelineForPhone } from '../lib/app-v2-phone-timeline.js';
import { calendarCardPeriod } from '../lib/card-period.js';
import { createFieldProvenProductState } from '../lib/field-proven-product-state.js';
import { coversActivityRange } from '../lib/card-coverage.js';

function cardForPeriod(gap = false, cutoff = '2026-09-28T12:00:00Z') {
  const days = Array.from({ length: 8 }, (_, i) => ({ date: `2026-09-${21+i}`, segments: [
    { activity: 'rest', startMinute: 0, endMinute: gap ? 60 : 120 },
    { activity: 'driving', startMinute: 120, endMinute: 180 },
    { activity: 'rest', startMinute: 180, endMinute: 1440 },
  ] }));
  return { ...normalizeParserCardResult({ complete: true, days }, { capturedAtIso: cutoff }), lastCardReadAtIso: cutoff };
}

test('TC-DATA-01: dates with internal gaps retain known driving but never certify the period', () => {
  const card = cardForPeriod(true);
  assert.equal(card.fortnightDrivingMinutes, null);
  assert.equal(card.historyDays.reduce((sum, d) => sum + d.drivingMinutes, 0), 480);
  const options = { now: new Date(card.lastCardReadAtIso), timeZone: 'UTC' };
  const projected = projectCardTimelineForPhone(card, options.timeZone, options);
  assert.ok(projected.historyDays.every(d => !d.coverageComplete));
  assert.equal(calendarCardPeriod(projected.historyDays, options).complete, false);
  assert.equal(calendarCardPeriod(projected.historyDays, options).minutes, null);
  const state = createFieldProvenProductState({ card: projected });
  assert.ok(state.historyDays.every(d => !d.coverageComplete));
  assert.equal(state.historyDays[0].activityTotals.drive, 60);
});

test('fully recorded UTC period remains confirmed through the read cutoff, not invented future rest', () => {
  const card = cardForPeriod();
  const options = { now: new Date(card.lastCardReadAtIso), timeZone: 'UTC' };
  assert.equal(card.fortnightDrivingMinutes, 480);
  const projected = projectCardTimelineForPhone(card, 'UTC', options);
  assert.ok(projected.historyDays.every(d => d.coverageComplete));
  assert.equal(projected.historyDays.at(-1).segments.at(-1).endMinute, 720);
  assert.equal(calendarCardPeriod(projected.historyDays, options).minutes, 480);
  assert.equal(calendarCardPeriod(projected.historyDays, { ...options, now: new Date('2026-09-29T12:00:00Z') }).minutes, null);
});

test('local leading boundary needs previous UTC data; truncated first date cannot certify a period', () => {
  const card = cardForPeriod();
  const options = { now: new Date(card.lastCardReadAtIso), timeZone: 'Europe/Vienna' };
  const projected = projectCardTimelineForPhone(card, options.timeZone, options);
  assert.equal(projected.historyDays[0].coverageComplete, false);
  assert.ok(projected.historyDays.slice(1).every(d => d.coverageComplete));
  assert.equal(calendarCardPeriod(projected.historyDays, options).minutes, null);
  const earlier = { dateIso: '2026-09-20', segments: [{kind:'rest',startMinute:0,endMinute:1440,minutes:1440}], events:[] };
  const full = projectCardTimelineForPhone({ ...card, historyDays: [earlier,...card.historyDays] }, options.timeZone, options);
  assert.equal(calendarCardPeriod(full.historyDays, options).minutes, 480);
});

test('DST coverage uses elapsed UTC intervals for 23-hour and 25-hour local days', () => {
  for (const [date, duration] of [['2026-03-29',1380],['2026-10-25',1500]]) {
    const epoch=Date.parse(date+'T00:00:00Z');
    const days=[-1,0,1].map(i=>({ dateIso:new Date(epoch+i*86400000).toISOString().slice(0,10),
      segments:[{kind:'rest',startMinute:0,endMinute:1440,minutes:1440}],events:[] }));
    const card={ historyDays:days,lastCardReadAtIso:new Date(epoch+2*86400000).toISOString() };
    const projected=projectCardTimelineForPhone(card,'Europe/Vienna',{now:new Date(card.lastCardReadAtIso)});
    const day=projected.historyDays.find(d=>d.dateIso===date);
    assert.equal(day.coverageComplete,true);
    assert.equal(day.segments.reduce((sum,s)=>sum+s.minutes,0),duration);
    const missing={...card,historyDays:days.map(d=>d.dateIso===date ? {...d,segments:[{kind:'rest',startMinute:60,endMinute:1440,minutes:1380}]} : d)};
    assert.equal(projectCardTimelineForPhone(missing,'Europe/Vienna',{now:new Date(card.lastCardReadAtIso)}).historyDays.find(d=>d.dateIso===date).coverageComplete,false);
  }
});

test('coverage rejects unknown kinds, gaps, overlaps and empty data; old summaries fail closed', () => {
  const segment={kind:'rest',startMinute:0,endMinute:60};
  assert.equal(coversActivityRange([segment],0,60),true);
  for (const segments of [[],[segment,segment],[{...segment,kind:'unknown'}],[{...segment,startMinute:1}]]) {
    assert.equal(coversActivityRange(segments,0,60),false);
  }
  const days=Array.from({length:8},(_,i)=>({dateIso:`2026-09-${21+i}`,drivingMinutes:60}));
  assert.equal(calendarCardPeriod(days,{now:new Date('2026-09-28T12:00:00Z'),timeZone:'UTC'}).minutes,null);
});
