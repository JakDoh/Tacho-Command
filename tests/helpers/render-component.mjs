import ts from 'typescript';
import {readFile} from 'node:fs/promises';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
// Render actual TSX. Only framework navigation, CSS modules and install capability are stubbed.
export async function component(path) {
 let source=await readFile(new URL('../../'+path,import.meta.url),'utf8');
 source=source.replace(/import \{ trackProductAnalytics \} from "[^\"]+";/g,'const trackProductAnalytics = () => Promise.resolve();').replace(/import styles from "[^\"]+";/g,'const styles = new Proxy({}, {get: (_target,key) => String(key)});')
 .replace(/import Link from "next\/link";/g,'const Link = (props) => <a {...props}/>;')
 .replace(/import \{ useRouter \} from "next\/navigation";/g,'const useRouter = () => ({push:()=>{}});')
 .replace(/import InstallGuide from "[^\"]+";/g,'const InstallGuide = () => <button>Install</button>;')
 .replace(/import \{ formatTachoCommandVersionLine \} from "[^\"]+";/g,'const formatTachoCommandVersionLine = () => "test-build";');
 for (const match of source.matchAll(/import (\w+) from "(\.[^"]+)";/g)) {
  if (match[2].endsWith('.js') || match[2].endsWith('.css')) continue;
  const childPath=new URL(match[2]+'.tsx',new URL('../../'+path,import.meta.url));
  const child=await component(childPath.pathname.split(new URL('../../',import.meta.url).pathname)[1]);
  // Nested local TSX modules share the same real render path.
  globalThis.__tcRenderComponents ??= {};
  globalThis.__tcRenderComponents[childPath.href]=child;
  source=source.replace(match[0],`const ${match[1]} = globalThis.__tcRenderComponents[${JSON.stringify(childPath.href)}];`);
 }
 let js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 js=js.replace(/from "(react(?:\/jsx-runtime)?)"/g,(_s,name)=>'from '+JSON.stringify(import.meta.resolve(name)));
 js=js.replace(/from "(\.\.?\/[^"\n]+\.js)"/g,(_s,name)=>'from '+JSON.stringify(new URL(name,new URL('../../'+path,import.meta.url)).href));
 return (await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))).default;
}
export const render=(Component,props)=>renderToStaticMarkup(createElement(Component,props));
