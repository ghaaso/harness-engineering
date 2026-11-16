// Resolve every CLAIMS.md row: file + sha, every JSON pointer, stored value vs source, claim text on its RESULT line,
// and printed numbers vs the source value at the printed precision.
const fs = require('fs'), cr = require('crypto');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const D = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings';
const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1';
const sha = p => cr.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const R = fs.readFileSync(D + '/RESULT.md', 'utf8').split('\n');
const CL = fs.readFileSync(D + '/CLAIMS.md', 'utf8').split('\n');
const PROT = fs.readFileSync(REPO + '/docs/program/evidence/harness-bottlenecks/graph2/protocol-addendum-8.md', 'utf8');
const out = []; const P = s => out.push(s);
P('RESULT.md sha ' + sha(D + '/RESULT.md') + ' result.json sha ' + sha(D + '/result.json'));
P('CLAIMS header line 3: ' + CL[2].slice(0, 200));
const resolve = f => f.startsWith('<repo>') ? REPO + f.slice(6) : L + '/' + f;
const jc = {}, sc = {};
const J = p => (jc[p] = jc[p] || JSON.parse(fs.readFileSync(p, 'utf8')));
const S = p => (sc[p] = sc[p] || sha(p));
const ptr = (o, k) => { let v = o; for (const t of k.split('/').slice(1).map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'))) { if (v == null || typeof v !== 'object' || !(t in v)) return { missing: true, at: t }; v = v[t]; } return { v }; };
const canon = x => JSON.stringify(x, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(q => [q, v[q]])) : v);
const leaves = (x, acc = []) => { if (typeof x === 'number') acc.push(x); else if (x && typeof x === 'object') for (const v of Object.values(x)) leaves(v, acc); return acc; };
const unesc = s => s.replace(/\\\|/g, '|');
const counts = { rows: 0, ptrs: 0, missingPtrs: 0, valueDiff: 0, claimNotOnLine: 0, shaBad: 0, numNoMatch: 0, nofile: 0, constants: 0, literal: 0, paragraphs: 0, paraBad: 0, filesha: 0, fileshaBad: 0 };
const issues = { missing: [], valueDiff: [], notOnLine: [], shaBad: [], numNoMatch: [], nofile: [], constants: [], para: [], filesha: [] };
for (let i = 0; i < CL.length; i++) {
  const line = CL[i]; if (!/^\| \d+ \| \d+ \|/.test(line)) continue;
  const p = line.split(/(?<!\\)\|/).slice(1, -1).map(s => s.trim());
  const [n, rl, claimE, file, rsha, key, valE, status] = p; const claim = unesc(claimE), val = unesc(valE);
  counts.rows++;
  const tag = 'CLAIMS.md:' + (i + 1) + ' row ' + n + ' RESULT L' + rl;
  const rline = R[+rl - 1] || '';
  // claim text on its line
  const ct = claim.replace(/\.\.\.$/, '');
  if (!rline.includes(ct)) { counts.claimNotOnLine++; issues.notOnLine.push(tag + ' claim "' + claim.slice(0, 80) + '" | line: ' + rline.slice(0, 120)); }
  if (status === 'literal (reproduced)') { counts.literal++; continue; }
  if (file.startsWith('(no file')) { counts.nofile++; issues.nofile.push(tag + ' ' + file + ' key ' + key + ' value ' + val + ' status ' + status); continue; }
  const fp = resolve(file);
  if (!fs.existsSync(fp)) { issues.nofile.push(tag + ' path missing ' + fp); counts.nofile++; continue; }
  const dsha = S(fp);
  if (rsha !== dsha) { counts.shaBad++; issues.shaBad.push(tag + ' ' + file + ' row ' + rsha.slice(0, 12) + ' disk ' + dsha.slice(0, 12)); }
  if (key === '(file sha256)') {
    counts.filesha++;
    const m = claim.match(/([0-9a-f]{12})$/); const v = JSON.parse(val);
    if (v !== dsha || !m || !dsha.startsWith(m[1])) { counts.fileshaBad++; issues.filesha.push(tag + ' ' + file + ' printed ' + (m && m[1]) + ' value ' + v.slice(0, 12) + ' disk ' + dsha.slice(0, 12)); }
    continue;
  }
  if (/constant/.test(key)) { counts.constants++; issues.constants.push(tag + ' ' + key + ' value ' + val); continue; }
  if (/^paragraph/.test(key)) {
    counts.paragraphs++;
    const nums = [...key.matchAll(/"(\d+)\. "/g)].map(m => m[1]);
    for (const num of nums) {
      const re = new RegExp('^' + num + '\\. ', 'm'); const ok = re.test(PROT);
      if (!ok) { counts.paraBad++; issues.para.push(tag + ' paragraph ' + num + ' not found in protocol'); }
    }
    continue;
  }
  if (!key.startsWith('/')) { issues.constants.push(tag + ' OTHER key ' + key); continue; }
  const o = J(fp); const ks = key.split('; '); const vals = [];
  let anyMissing = false;
  for (const k of ks) { counts.ptrs++; const r = ptr(o, k); if (r.missing) { counts.missingPtrs++; anyMissing = true; issues.missing.push(tag + ' ' + file + ' ' + k + ' (missing segment "' + r.at + '") stored value ' + val.slice(0, 60) + ' | claim "' + claim.slice(0, 60) + '"'); vals.push(undefined); } else vals.push(r.v); }
  const got = ks.length === 1 ? vals[0] : vals;
  let stored; try { stored = JSON.parse(val); } catch (e) { stored = val; }
  if (canon(got) !== canon(stored)) { counts.valueDiff++; issues.valueDiff.push(tag + ' ' + key.slice(0, 100) + ' source ' + String(canon(got)).slice(0, 120) + ' | stored ' + String(val).slice(0, 120)); }
  // numbers printed vs source leaves (missing pointer counts as 0, as the writer inferred)
  const lv = leaves(vals.map(v => v === undefined ? 0 : v)).concat(typeof got === 'boolean' ? [] : []);
  const nums = [...claim.matchAll(/[-+]?\d[\d,]*(\.\d+)?(e[-+]?\d+)?/gi)].map(m => m[0]);
  for (const s of nums) {
    const clean = s.replace(/,/g, ''); const x = Number(clean); if (!isFinite(x)) continue;
    const dec = (clean.split('.')[1] || '').replace(/e.*$/i, '').length; const isExp = /e/i.test(clean);
    const okk = lv.some(v => {
      if (isExp) return Math.abs(v - x) <= Math.abs(x) * 0.051;
      return Math.abs(Number(v.toFixed(dec)) - x) < 1e-12 || Math.abs(Math.round(v * 10 ** dec) / 10 ** dec - x) < 1e-12;
    });
    if (!okk && lv.length) { counts.numNoMatch++; issues.numNoMatch.push(tag + ' number ' + s + ' not a rounding of any source leaf; claim "' + claim.slice(0, 90) + '" leaves ' + JSON.stringify(lv.slice(0, 8))); }
  }
}
P(JSON.stringify(counts));
for (const [k, v] of Object.entries(issues)) { P('## ' + k + ' (' + v.length + ')'); for (const s of v) P(s); }
fs.writeFileSync(__dirname + '/claimsall.out.txt', out.join('\n') + '\n');
console.log(JSON.stringify(counts));
