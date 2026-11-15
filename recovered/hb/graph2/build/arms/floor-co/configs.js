'use strict';
// The floor's whole configuration list: granularity x form, pad fixed (budgets are packed for every
// answer, so they are not entries). A floor has no sweep beyond these (task brief, addendum 2 B.8).
// This is deliberately NOT a sweep.js: the harness requires exactly 40 stage-1 entries there, and a
// floor has 8. Run each with run.js --config arms/<floor>/configs/<name>.json (written by
// `node configs.js --write`), or through sweep.js once the harness accepts a fixed floor list.
const fs = require('fs');
const path = require('path');
const PAD = require('./arm').PAD;

const CONFIGS = [];
for (const granularity of ['file', 'symbol']) {
  for (const form of ['signature', 'snippet', 'paths', 'range']) {
    CONFIGS.push({ name: 'gran=' + granularity + ' form=' + form, granularity, form, pad: PAD });
  }
}

if (require.main === module && process.argv.includes('--write')) {
  const dir = path.join(__dirname, 'configs');
  fs.mkdirSync(dir, { recursive: true });
  for (const c of CONFIGS) {
    const { name, ...cfg } = c;
    fs.writeFileSync(path.join(dir, name.replace(/[^A-Za-z0-9]+/g, '_') + '.json'), JSON.stringify(cfg) + '\n');
  }
  console.log('wrote', CONFIGS.length, 'configurations to', dir);
}

module.exports = { CONFIGS, PAD };
