// Second pass over CLAIMS rows: a stored value differs from its source only if
// (a) stored is a number/bool/string-literal and the single source value is a different scalar, or
// (b) stored is an object and some shared key holds a different value, or a stored key is absent in the source,
// (c) stored is a printed string: every number in it must be a rounding of a source leaf (labels excluded).
const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const D = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings';
const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1';
const CL = fs.readFileSync(D + '/CLAIMS.md', 'utf8').split('\n');
const R = fs.readFileSync(D + '/RESULT.md', 'utf8').split('\n');
const jc = {}; const J = p => (jc[p] = jc[p] || JSON.parse(fs.readFileSync(p, 'utf8')));
const resolve = f => f.startsWith('<repo>') ? REPO + f.slice(6) : L + '/' + f;
const ptr = (o, k) => { let v = o; for (const t of k.split('/').slice(1).map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'))) { if (v == null || typeof v !== 'object' || !(t in v)) return undefined; v = v[t]; } return v; };
const leaves = (x, acc = []) => { if (typeof x === 'number') acc.push(x); else if (x && typeof x === 'object') for (const v of Object.values(x)) leaves(v, acc); return acc; };
const out = []; let n = 0, real = 0, printedChecked = 0;
const near = (a, b) => a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a)));
for (let i = 0; i < CL.length; i++) {
  const line = CL[i]; if (!/^\| \d+ \| \d+ \|/.test(line)) continue;
  const p = line.split(/(?<!\\)\|/).slice(1, -1).map(s => s.trim().replace(/\\\|/g, '|'));
  const [rowN, rl, claim, file, rsha, key, val] = p;
  if (!key.startsWith('/') || !/\.json$/.test(file)) continue;
  n++;
  const o = J(resolve(file)); const ks = key.split('; ').map(k => k.replace(/ \(count\)$/, ''));
  let vals = ks.map(k => ptr(o, k));
  if (/\(count\)/.test(key)) vals = vals.map(v => Array.isArray(v) ? v.length : v);
  const got = ks.length === 1 ? vals[0] : vals;
  let stored; try { stored = JSON.parse(val); } catch (e) { stored = val; }
  const tag = 'CLAIMS.md:' + (i + 1) + ' row ' + rowN + ' L' + rl + ' ' + key.slice(0, 90);
  let bad = null;
  if (stored !== null && typeof stored === 'object' && !Array.isArray(stored)) {
    // object: compare keys present in stored
    const src = (got && typeof got === 'object' && !Array.isArray(got)) ? got : Object.fromEntries(ks.map((k, j) => [k.split('/').pop(), vals[j]]));
    for (const [k, v] of Object.entries(stored)) {
      const s = src[k];
      if (JSON.stringify(s) !== JSON.stringify(v) && !(typeof v === 'number' && near(s, v))) {
        // allow nested object/array equality by canonical form
        const can = x => JSON.stringify(x, (kk, vv) => vv && typeof vv === 'object' && !Array.isArray(vv) ? Object.fromEntries(Object.keys(vv).sort().map(q => [q, vv[q]])) : vv);
        if (can(s) !== can(v)) { bad = 'key ' + k + ' source ' + JSON.stringify(s) + ' stored ' + JSON.stringify(v); break; }
      }
    }
  } else if (typeof stored === 'number' || typeof stored === 'boolean') {
    if (got === undefined) { if (stored !== 0) bad = 'source absent, stored ' + stored; }
    else if (typeof got === 'object') { /* computed from an object (sum); check sum of leaves */ const s = leaves(got); const sum = s.reduce((a, b) => a + b, 0);
      if (!/folded/.test(claim) && !near(sum, stored)) bad = 'sum of source leaves ' + sum + ' stored ' + stored;
      if (/folded/.test(claim)) { const f = (got.cands_folded || 0) + (got.seeds_folded || 0); if (f !== stored) bad = 'folded ' + f + ' stored ' + stored; } }
    else if (!near(got, stored)) bad = 'source ' + JSON.stringify(got) + ' stored ' + stored;
  } else if (typeof stored === 'string') {
    if (typeof got === 'string') { if (got !== stored) bad = 'source ' + JSON.stringify(got) + ' stored ' + JSON.stringify(stored); }
    else if (got === undefined) { if (stored !== 'reference') bad = 'source absent, stored ' + stored; }
    else {
      printedChecked++;
      const lv = leaves(got);
      for (const m of stored.matchAll(/[-+]?\d+\.\d+(e[-+]?\d+)?/gi)) {
        const s = m[0]; const x = Number(s); const dec = (s.split('.')[1] || '').replace(/e.*$/i, '').length; const exp = /e/i.test(s);
        if (!lv.some(v => exp ? Math.abs(v - x) <= Math.abs(x) * 0.051 : Number(v.toFixed(dec)) === x || Number(v.toFixed(dec)) === -x && x === 0)) { bad = 'printed ' + s + ' not a rounding of ' + JSON.stringify(lv.slice(0, 8)); break; }
      }
      // sign check for +/- formatting: '+0.000' vs negative source
      if (!bad) { const signs = [...stored.matchAll(/([-+])(\d+\.\d+)/g)]; for (const sg of signs) { const x = Number(sg[1] + sg[2]); const cand = lv.filter(v => Number(Math.abs(v).toFixed(sg[2].split('.')[1].length)) === Number(sg[2])); if (cand.length && !cand.some(v => (v < 0) === (sg[1] === '-') || Number(sg[2]) === 0)) { bad = 'sign of ' + sg[0] + ' vs ' + JSON.stringify(cand); break; } } }
      if (!bad && !R[+rl - 1].includes(stored)) bad = 'printed string not on RESULT line ' + rl;
    }
  } else if (Array.isArray(stored)) {
    if (JSON.stringify(stored) !== JSON.stringify(got)) bad = 'array source ' + JSON.stringify(got).slice(0, 100) + ' stored ' + JSON.stringify(stored).slice(0, 100);
  }
  if (bad) { real++; out.push(tag + ' :: ' + bad); }
}
out.unshift('json rows ' + n + ' printed-string rows checked ' + printedChecked + ' differing ' + real);
fs.writeFileSync(__dirname + '/claimsdiff.out.txt', out.join('\n') + '\n'); console.log(out.slice(0, 60).join('\n'));
