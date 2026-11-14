import { readFileSync, writeFileSync } from 'node:fs';
// Fresh config: this preview must never inherit production bindings or routes.
const built = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
if (built.main !== 'index.js') throw new Error('Unexpected worker entry point');
const preview = {
  name: 'tachocommand-first-read-preview', main: 'index.js',
  compatibility_date: built.compatibility_date, compatibility_flags: ['nodejs_compat'],
  no_bundle: true, rules: [{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }],
  assets: { directory: '../client', binding: 'ASSETS' },
  workers_dev: true, preview_urls: false, vars: {}, observability: { enabled: false },
};
writeFileSync('dist/server/ux-preview.json', JSON.stringify(preview, null, 2));
