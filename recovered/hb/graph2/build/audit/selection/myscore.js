'use strict';
// Independent scorer (audit-selection lane), written from protocol addendum 2 section A only; it does
// not import or copy arms/common/score.js. Rule `content`:
//   - a reference FILE is credited when its whole path line is shown: every fully shown item shows
//     its path line; a cut item shows it only when cut.path_shown is true;
//   - a reference DEFINITION is credited only when a shown line of an item with the same path lies
//     inside [start, end] of the definition (its signature line or lines inside its body);
//   - recall@B = (credited files + credited definitions) / (reference files + reference definitions);
//   - primary = recall@8000 for content forms (signature, snippet), mean over tasks within a commit,
//     then mean over commits; paths and range forms get no primary.
// Usage: node myscore.js <build> <outdir>
// Writes <outdir>/my_tables.json (per arm, per configuration: T1 primary, se, medians, r@B, auc-free)
// and <outdir>/my_tasks.jsonl.gz (per task values, T1 only) - kept in audit/ and tmp/, never readable
// by an arm.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BUILD = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
process.env.GT_BUILD = BUILD;
const H = require(path.join(BUILD, 'arms/common/harness.js'));
const BUDGETS = [2000, 4000, 8000, 16000];
const ARMS = ['relational', 'reference', 'search', 'ladybug', 'duckpgq', 'floor-dir', 'floor-co'];
const SET = process.env.SETS ? process.env.SETS.split(',') : ['T1'];

const refs = new Map();
for (const l of fs.readFileSync(path.join(BUILD, 'sealed/references.jsonl'), 'utf8').split('\n')) {
  if (!l) continue; const r = JSON.parse(l); if (r.split === 'tune') refs.set(r.id, r);
}

function shownAt(rec, B) {
  const b = rec.budgets[String(B)];
  const paths = new Set(); const lines = new Map();
  // snippet form records the shown source lines as one span [first, last]; signature forms list lines
  const span = rec.form === 'snippet';
  const addLines = (p, ls) => {
    if (!lines.has(p)) lines.set(p, []);
    if (!ls) return;
    if (span) { if (ls.length === 2) for (let x = ls[0]; x <= ls[1]; x++) lines.get(p).push(x); else throw new Error('snippet span expected'); }
    else for (const x of ls) lines.get(p).push(x);
  };
  for (let k = 0; k < b.n_full; k++) { const it = rec.items[k]; paths.add(it.path); addLines(it.path, it.shown); }
  if (b.cut) {
    const it = rec.items[b.n_full];
    if (!it) throw new Error('cut item missing ' + rec.id);
    if (b.cut.path_shown) paths.add(it.path);
    addLines(it.path, b.cut.shown);
  }
  return { paths, lines, used: b.used };
}

function scoreTask(rec, ref) {
  const nF = ref.files.length; const nD = ref.defs.length; const units = nF + nD;
  const o = { id: rec.id, commit: ref.commit, units, n_files: nF, n_defs: nD };
  for (const B of BUDGETS) {
    const s = shownAt(rec, B);
    let f = 0; let d = 0;
    for (const x of ref.files) if (s.paths.has(x.path)) f++;
    for (const x of ref.defs) { const ls = s.lines.get(x.path) || []; if (ls.some((l) => l >= x.start && l <= x.end)) d++; }
    const content = rec.form === 'signature' || rec.form === 'snippet';
    o['r' + B] = units && content ? (f + d) / units : null;
    o['f' + B] = nF ? f / nF : null; o['d' + B] = nD ? d / nD : null;
    o['tok' + B] = s.used;
  }
  return o;
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
function clusterStats(rows, key) {
  const by = new Map();
  for (const r of rows) { if (r[key] == null) continue; if (!by.has(r.commit)) by.set(r.commit, []); by.get(r.commit).push(r[key]); }
  const cm = [...by.values()].map(mean); const n = cm.length; const m = mean(cm);
  const sd1 = Math.sqrt(cm.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1));
  const sd0 = Math.sqrt(cm.reduce((s, x) => s + (x - m) ** 2, 0) / n);
  return { mean: m, se_n1: sd1 / Math.sqrt(n), se_n: sd0 / Math.sqrt(n), commits: n };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const medianLow = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };

fs.mkdirSync(OUT, { recursive: true });
const tables = {}; const gz = zlib.createGzip(); const ws = fs.createWriteStream(path.join(OUT, 'my_tasks.jsonl.gz')); gz.pipe(ws);
for (const arm of ARMS) {
  const lists = [];
  for (const st of [1, 2]) {
    try { const L = H.loadArmList(arm, st, false); for (const x of L.list) lists.push({ ...x, stage: L.kind === 'floor' ? 'floor' : st }); } catch (e) { if (!/no stage2|no sweep/.test(e.message)) throw e; }
  }
  tables[arm] = [];
  for (const c of lists) {
    for (const set of SET) {
      const f = path.join(BUILD, 'results', arm, 'tune', c.hash + '.' + set + '.jsonl.gz');
      if (!fs.existsSync(f)) { tables[arm].push({ name: c.name, hash: c.hash, stage: c.stage, set, missing: true }); continue; }
      const recs = H.readGzJsonl(f);
      const content = c.cfg.form === 'signature' || c.cfg.form === 'snippet';
      const rows = [];
      for (const rec of recs) {
        if (rec.split !== 'tune') throw new Error('non-tune record ' + f);
        if (rec.config_hash !== c.hash) throw new Error('hash mismatch in ' + f);
        const ref = refs.get(rec.id); if (!ref) throw new Error('no ref ' + rec.id);
        const o = scoreTask(rec, ref); rows.push(o);
        gz.write(JSON.stringify({ arm, name: c.name, hash: c.hash, set, ...o }) + '\n');
      }
      const st = clusterStats(rows, 'r8000');
      tables[arm].push({ name: c.name, hash: c.hash, stage: c.stage, set, form: c.cfg.form, granularity: c.cfg.granularity, pad: c.cfg.pad, cfg: c.cfg,
        tasks: rows.length, commits: st.commits,
        primary: content ? st.mean : null, se: content ? st.se_n1 : null, se_n: content ? st.se_n : null,
        r2000: clusterStats(rows, 'r2000').mean, r4000: clusterStats(rows, 'r4000').mean, r16000: clusterStats(rows, 'r16000').mean,
        tok8000_median: median(rows.map((r) => r.tok8000)), tok8000_median_low: medianLow(rows.map((r) => r.tok8000)) });
    }
  }
  console.error(arm, tables[arm].length);
}
gz.end();
ws.on('finish', () => { fs.writeFileSync(path.join(OUT, 'my_tables.json'), JSON.stringify(tables, null, 1)); console.error('done'); });
