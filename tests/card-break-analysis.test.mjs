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
