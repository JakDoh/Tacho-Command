import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function route(path) {
  const source = await readFile(new URL('../'+path,import.meta.url),'utf8');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
  return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
test('public beta status is available without a cookie, database or email configuration', async()=>{
  const trial = await route('app/api/trial/route.ts');
  for(const method of ['GET','POST']) {
    const response = await trial[method](new Request('https://tachocommand.com/api/trial',{method}));
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{status:'open_beta'});
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(response.headers.get('set-cookie'),null);
  }
});
test('legacy sign-in requests cannot create accounts or send mail',async()=>{
  for(const path of ['app/api/auth/request/route.ts','app/api/auth/confirm/route.ts','app/api/activate/route.ts']) {
    const retired = await route(path);
    const response = await retired.POST();
    assert.equal(response.status,410);
    assert.deepEqual(await response.json(),{status:'open_beta',appUrl:'/app'});
    assert.equal(response.headers.get('set-cookie'),null);
  }
});
