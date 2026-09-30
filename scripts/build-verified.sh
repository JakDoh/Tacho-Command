#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

command -v timeout || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

echo "Running bounded vinext build..."
timeout \
  --signal=TERM \
  --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
  "${SITES_BUILD_TIMEOUT:-3m}" \
  "${vinext}" build

"${script_dir}/validate-artifact.sh"

# Deduplicate D1 bindings in the generated wrangler.json (vinext bug workaround)
node -e "
const fs = require('fs');
const f = 'dist/server/wrangler.json';
const c = JSON.parse(fs.readFileSync(f, 'utf8'));
if (c.d1_databases) {
  const seen = new Set();
  const before = c.d1_databases.length;
  c.d1_databases = c.d1_databases.filter(b => {
    if (seen.has(b.binding)) return false;
    seen.add(b.binding);
    return true;
  });
  if (c.d1_databases.length < before) {
    console.log('Removed ' + (before - c.d1_databases.length) + ' duplicate D1 binding(s)');
  }
}
fs.writeFileSync(f, JSON.stringify(c, null, 2));
"
