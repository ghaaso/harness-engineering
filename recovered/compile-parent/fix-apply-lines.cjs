// Replaces apply.cjs lines 15 and 16 (wpNum, KSFIX), whose regexes lost their backslashes.
'use strict';
const fs = require('fs');
const f = process.argv[2];
const lines = fs.readFileSync(f, 'utf8').split('\n');
if (!lines[14].startsWith('const wpNum') || !lines[15].startsWith('const KSFIX')) { console.error('unexpected lines', lines[14], lines[15]); process.exit(1); }
lines[14] = "const wpNum = w => { const m = String(w || '').match(/^WP(\\d+)([a-z]?)$/); return m ? Number(m[1]) * 10 + (m[2] ? m[2].charCodeAt(0) - 96 : 0) : 999; };";
lines[15] = [
  '// Knowledge-store decisions are D1..D22 in their own design. Harness v2 also has a D17 (hooks), so a',
  '// harness reference written as "harness decision D17" is left alone.',
  "const KSFIX = s0 => String(s0 || '').replace(/(?<![\\w-])(?<!harness decision )D(\\d+b?)\\b/g, 'KS-D$1');",
].join('\n');
fs.writeFileSync(f, lines.join('\n'));
const src = fs.readFileSync(f, 'utf8');
console.log(src.split('\n').slice(14, 18).join('\n'));
console.log('control chars left:', /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(src));
