import test from 'node:test';
import assert from 'node:assert/strict';
import {createCardTransportTrace} from '../lib/card-transport-trace.js';
test('trace is bounded, retains milestones and excludes payload and identity fields',()=>{
 let time=0; const trace=createCardTransportTrace(()=>time);
 trace.add('stage:connecting');
 for(let i=0;i<300;i++){time++;trace.add('fifo:fragment',{sequence:i,size:20,payload:'SECRET',name:'DRIVER'});}
 const snapshot=trace.snapshot();
 assert.equal(snapshot.events.length,256);assert.equal(snapshot.droppedEvents,45);
 assert.equal(snapshot.milestones[0].event,'stage:connecting');
 assert.doesNotMatch(JSON.stringify(snapshot),/SECRET|DRIVER|payload|name/);
 const previous=JSON.stringify(snapshot);trace.add('transport:closed');assert.equal(JSON.stringify(snapshot),previous);
});
