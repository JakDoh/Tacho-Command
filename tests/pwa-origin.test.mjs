import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('rendered layout keeps the PWA manifest on the page origin independently of SEO metadataBase', async()=>{
 let source=await readFile(new URL('../app/layout.tsx',import.meta.url),'utf8');
 source=source.replace(/import "[^\"]+\.css";/g,'')
  .replace(/import (ServiceWorkerRegister|ProductAnalyticsObserver) from "[^\"]+";/g,'const $1 = () => null;');
 let js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 js=js.replace(/from "react\/jsx-runtime"/g,'from '+JSON.stringify(import.meta.resolve('react/jsx-runtime')));
 const {default:Layout,metadata}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 const html=renderToStaticMarkup(createElement(Layout,{children:'PWA'}));
 assert.equal(metadata.metadataBase.origin,'https://tachocommand.com');
 assert.equal(metadata.manifest,undefined,'framework must not resolve installation URL through production metadataBase');
 assert.equal((html.match(/rel="manifest"/g)??[]).length,1);
 const href=html.match(/rel="manifest" href="([^"]+)"/)[1];
 for(const origin of ['https://tachocommand-audit-preview.canicboban.workers.dev','https://tachocommand.com']) {
  assert.equal(new URL(href,origin+'/en').origin,origin);
  assert.equal(new URL(href,origin+'/en').pathname,'/manifest.webmanifest');
 }
});
