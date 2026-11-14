import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCardBreaks} from '../lib/card-break-analysis.js';
function day(parts,date='2026-09-21',start=0) {let m=start;return {dateIso:date,segments:parts.map(([kind,minutes])=>({kind,minutes,startMinute:m,endMinute:(m+=minutes)}))};}
test('277 minutes with only 31 minute break gives one seven minute finding',()=>{
 const r=analyzeCardBreaks([day([['drive',180],['rest',31],['work',10],['drive',97]],undefined,760)]);
 assert.equal(r.findings.length,1);assert.equal(r.findings[0].excessMinutes,7);
});
test('15 then 30 resets; 30 then 15 does not; short stops and work do not reset',()=>{
 assert.equal(analyzeCardBreaks([day([['drive',150],['rest',15],['drive',120],['rest',30],['drive',120]])]).findings.length,0);
 assert.equal(analyzeCardBreaks([day([['drive',150],['rest',30],['drive',120],['rest',15],['drive',1]])]).findings[0].excessMinutes,1);
 assert.equal(analyzeCardBreaks([day([['drive',270],['work',10],['rest',14],['drive',1]])]).findings.length,1);
});
test('adjacent rest fragments merge and midnight does not reset driving',()=>{
 assert.equal(analyzeCardBreaks([day([['drive',270],['rest',20],['rest',25],['drive',10]])]).findings.length,0);
 const r=analyzeCardBreaks([day([['drive',140]],'2026-09-22'),day([['drive',140]],'2026-09-21',1300)]);
 assert.equal(r.findings[0].excessMinutes,10);
});
test('gaps and ambiguous overlapping clocks do not manufacture findings',()=>{
 const a=day([['drive',270]]); const b=day([['drive',30]],'2026-09-21',300);
 const r=analyzeCardBreaks([{...a,segments:[...a.segments,...b.segments]}]);
 assert.equal(r.incomplete,true);assert.equal(r.findings.length,0);
 assert.equal(analyzeCardBreaks([{...a,segments:[...a.segments,...a.segments]}]).incomplete,true);
});
test('a break before any observed driving cannot supply the first split part',()=>{
 const r=analyzeCardBreaks([day([['rest',20],['drive',150],['rest',30],['drive',121]])]);
 assert.equal(r.findings[0].excessMinutes,1);
});

test('standard split needs at least 15 then at least 30; fragments cannot be added across work',()=>{
 for (const [first, second, excess] of [[15,30,0],[20,30,0],[20,25,1],[14,31,1],[30,15,1]]) {
  const result=analyzeCardBreaks([day([['drive',150],['rest',first],['work',1],['drive',120],['rest',second],['drive',1]])]);
  assert.equal(result.findings[0]?.excessMinutes ?? 0,excess,`${first} + ${second}`);
 }
 const result=analyzeCardBreaks([day([['drive',270],['rest',10],['work',1],['rest',5],['drive',1]])]);
 assert.equal(result.findings[0].excessMinutes,1);
});

test('a subsequent qualifying break preserves the prior finding and starts a separate period',()=>{
 const result=analyzeCardBreaks([day([['drive',277],['rest',45],['drive',271]])]);
 assert.deepEqual(result.findings.map(f=>f.excessMinutes),[1,7]);
 assert.equal(analyzeCardBreaks([day([['drive',270],['rest',45],['drive',270]])]).findings.length,0);
});

test('missing leading/trailing activity marks screening incomplete without erasing known exceedance',()=>{
 assert.equal(analyzeCardBreaks([day([['drive',277]],undefined,60)]).incomplete,true);
 assert.equal(analyzeCardBreaks([day([['drive',277]],undefined,60)]).findings[0].excessMinutes,7);
 assert.equal(analyzeCardBreaks([day([['rest',60],['drive',270]])],{cutoffIso:'2026-09-21T05:30:00Z'}).incomplete,false);
 assert.equal(analyzeCardBreaks([day([['rest',60],['drive',270]])],{cutoffIso:'2026-09-21T06:00:00Z'}).incomplete,true);
});
