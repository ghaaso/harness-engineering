// C23: every test_* file on disk under the six folders vs the names in END-ORDER 2d (by folder and name)
const fs = require('fs'), path = require('path');
const L = process.argv[2]; const eo = fs.readFileSync(path.join(L, 'orchestrator/END-ORDER.md'), 'utf8');
const d2 = eo.slice(eo.indexOf('### 2d.'), eo.indexOf('### 2e.')).replace(/\s+/g, ' ');
const roots = ['fixes', 'parallel', 'r58b', 'r58c', 'orchestrator', 'train/r58/tests'];
const out = [];
function walk(d) {
  for (const e of fs.readdirSync(path.join(L, d), { withFileTypes: true })) {
    const r = d + '/' + e.name;
    if (e.isDirectory()) { if (/^(pre.*|out|logs)$/.test(e.name)) continue; walk(r); }
    else if (/^test_/.test(e.name) && !/\.(log|out|txt|json)$/.test(e.name)) out.push(r);
  }
}
for (const r of roots) walk(r);
const ex = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const named = [], left = [];
for (const r of out.sort()) {
  const b = path.basename(r).replace(/\.[^.]+$/, ''); const dir = path.dirname(r);
  const direct = d2.includes(dir + '/' + b);
  const braces = [...d2.matchAll(new RegExp(ex(dir) + '/\\{([^}]*)\\}', 'g'))].some((m) => m[1].split(/[,\s]+/).includes(b));
  // agent A's tests are named by bare name beside "agent A's"; for r58c/A a bare name counts
  const bare = dir === 'r58c/A' && new RegExp('(^|[^A-Za-z0-9_/])' + ex(b) + '([^A-Za-z0-9_]|$)').test(d2);
  ((direct || braces || bare) ? named : left).push(r);
}
console.log('files ' + out.length + ', named in 2d ' + named.length + ', left out ' + left.length);
for (const r of named) console.log('named   ' + r);
for (const r of left) console.log('LEFTOUT ' + r);
