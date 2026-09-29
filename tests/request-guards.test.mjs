import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/request-guards.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {readLimitedJson,requestRateAllowed}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const request=(body,headers={})=>new Request('https://test.invalid/api/technical-telemetry',{method:'POST',headers:{'content-type':'application/json',...headers},body,duplex:'half'});
test('JSON streaming limit rejects chunked overflow and cancels source',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({pull(c){c.enqueue(new TextEncoder().encode('12345678'));},cancel(){cancelled=true;}});
 await assert.rejects(readLimitedJson(request(stream),12),e=>e.status===413);
 assert.equal(cancelled,true);
});
test('JSON boundary validates type, size and syntax',async()=>{
 assert.deepEqual(await readLimitedJson(request('{"ok":true}')),{ok:true});
 await assert.rejects(readLimitedJson(request('{}',{'content-length':'99999'})),e=>e.status===413);
 await assert.rejects(readLimitedJson(request('{}',{'content-type':'text/plain'})),e=>e.status===415);
 await assert.rejects(readLimitedJson(request('{broken')),SyntaxError);
});
test('rate limit window expires and endpoints are isolated',async()=>{
 const a=new Request('https://test.invalid/api/one', {headers:{'cf-connecting-ip':'192.0.2.1'}});
 const b=new Request('https://test.invalid/api/two', {headers:{'cf-connecting-ip':'192.0.2.1'}});
 assert.equal(await requestRateAllowed(a,2,0),true);
 assert.equal(await requestRateAllowed(a,2,1),true);
 assert.equal(await requestRateAllowed(a,2,2),false);
 assert.equal(await requestRateAllowed(b,2,2),true);
 assert.equal(await requestRateAllowed(a,2,60000),true);
});
