// scan.mjs: replay-L24 per-call cache classification (SCORING.md). Reads usage fields, timestamps, models, line types only.
// node scan.mjs <outdir>   -> calls.ndjson.gz-free compact outputs: streams.json, flagged.json, agg.json
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const ROOT = 'C:/Users/User/.claude/projects';
const OUT = process.argv[2] || '.';
const MIN = 1024;

function projectOf(dir) {
  if (/harness-engineering/.test(dir)) return 'harness';
  if (/EMS-workshop1--claude-worktrees-(harness-ideas|knowledge-store-research)/.test(dir)) return 'harness';
  if (/research-runs-2026-11-harness-leads/.test(dir)) return 'run';
  if (/EMS-workshop1|23-FixFlow/.test(dir)) return 'fixflow';
  if (/Clinic-Workshop/.test(dir)) return 'clinic';
  return 'other';
}

function walk(d, acc) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.jsonl')) acc.push(p);
  }
  return acc;
}

const files = [];
for (const d of fs.readdirSync(ROOT).sort()) {
  const p = path.join(ROOT, d);
  if (fs.statSync(p).isDirectory()) walk(p, files).sort;
}
files.sort();

const seen = new Set();
let dupIds = 0, dupTokens = 0;
const streams = []; // per stream summary
const calls = [];   // compact per call rows (arrays) for later passes
// row: [streamIdx, tsMs, model, inp, cc, cr, out, c1h, c5m, afterCompact, lineNo, hasSplit]

async function scanFile(f, si) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  const dir = rel.split('/')[0];
  const isHelper = rel.includes('/subagents/');
  const parent = isHelper ? rel.split('/')[1] : path.basename(f, '.jsonl');
  const st = { file: rel, project: projectOf(dir), kind: isHelper ? 'helper' : 'session', parent, first: -1, n: 0, compactions: 0, apiErrors: 0 };
  const byId = new Map(); const order = [];
  let pendingCompact = false, lineNo = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(f, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    lineNo++;
    if (line.includes('"compact_boundary"')) {
      try { const o = JSON.parse(line); if (o.subtype === 'compact_boundary') { pendingCompact = true; st.compactions++; } } catch {}
      continue;
    }
    if (line.includes('"api_error"')) st.apiErrors++;
    if (!line.includes('"usage"') || !line.includes('"assistant"')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== 'assistant' || !o.message || !o.message.usage || !o.message.id) continue;
    const m = o.message, u = m.usage;
    if (m.model === '<synthetic>') continue;
    const id = m.id;
    const cc5 = u.cache_creation ? (u.cache_creation.ephemeral_5m_input_tokens || 0) : 0;
    const cc1 = u.cache_creation ? (u.cache_creation.ephemeral_1h_input_tokens || 0) : 0;
    const row = { ts: Date.parse(o.timestamp), model: m.model, inp: u.input_tokens || 0, cc: u.cache_creation_input_tokens || 0,
      cr: u.cache_read_input_tokens || 0, out: u.output_tokens || 0, c1h: cc1, c5m: cc5, split: !!u.cache_creation, line: lineNo, ac: false };
    if (byId.has(id)) { const r = byId.get(id); Object.assign(r, row, { ts: r.ts, line: r.line, ac: r.ac }); continue; }
    if (pendingCompact) { row.ac = true; pendingCompact = false; }
    byId.set(id, row); order.push(id);
  }
  for (const id of order) {
    const r = byId.get(id);
    if (r.inp + r.cc + r.cr + r.out === 0) continue;
    if (seen.has(id)) { dupIds++; dupTokens += r.inp + r.cc + r.cr + r.out; continue; }
    seen.add(id);
    calls.push([si, r.ts, r.model, r.inp, r.cc, r.cr, r.out, r.c1h, r.c5m, r.ac ? 1 : 0, r.line, r.split ? 1 : 0]);
    st.n++;
  }
  streams.push(st);
}

const t0 = Date.now();
for (let i = 0; i < files.length; i++) {
  await scanFile(files[i], i);
  if (i % 200 === 0) { fs.appendFileSync(path.join(OUT, 'scan.log'), `${i}/${files.length} ${((Date.now() - t0) / 1000).toFixed(0)}s calls=${calls.length}\n`); }
}
// streams pushed in order i, so streams[i] matches si
fs.writeFileSync(path.join(OUT, 'streams.json'), JSON.stringify(streams));
fs.writeFileSync(path.join(OUT, 'calls.json'), JSON.stringify(calls));
fs.writeFileSync(path.join(OUT, 'dups.json'), JSON.stringify({ dupIds, dupTokens, files: files.length, calls: calls.length }));
fs.appendFileSync(path.join(OUT, 'scan.log'), `DONE ${((Date.now() - t0) / 1000).toFixed(0)}s calls=${calls.length} dupIds=${dupIds}\n`);
