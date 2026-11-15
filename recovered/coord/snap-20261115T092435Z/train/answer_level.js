'use strict';
// Item-24 adapter, node side (addendum 8 item 24, ruling 58). Driven by answer_level.py, which checks this
// file's sha256 before every call. The shared answer code is IMPORTED from build/arms/common, never edited:
// seed.js (mapSeed), packer.js (through harness.answer: project, withTail, pack) and score.js (scoreAnswer).
//   node answer_level.js pack  --ranked <ranked.jsonl.gz> --tasks <tasks.jsonl> --primary <frozen record.json>
//                              --out <answers.jsonl.gz>
//     one input line per (variant, task): {id, variant, ranked: [path, ...]} (the arm's UNRESTRICTED ranked list,
//     seed excluded). Each path becomes its file node at the task's parent (facts.loadFacts, the canonical graph);
//     the answer is harness.answer(G, task, mapSeed(G, task.seed), ranked nodes, cfg, variant), where cfg is the
//     frozen typed primary's configuration read from its record (granularity file, form signature, pad none);
//     its configHash must equal the record's hash. Budgets 2,000 / 4,000 / 8,000 / 16,000 (config.js), the
//     primary measure is the 8,000-token one.
//   node answer_level.js score --answers <answers.jsonl.gz> --refs <refs.jsonl> --out <per_task.jsonl>
//     score.js scoreAnswer (rule "content") per answer; one output line per answer: id, arm (= variant) and the
//     per-task measures. Used on TUNING only (refs from git); held-out answers go to the grader.
// Environment: GT_COMMON (the shared code folder; default ../../../build/arms/common from this file), and the
// usual GT_FACTS_CACHE / GT_SRCSTORE / GT_TMP of arms/common/paths.js.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const COMMON = process.env.GT_COMMON || path.resolve(__dirname, '..', '..', '..', 'build', 'arms', 'common');
const H = require(path.join(COMMON, 'harness.js'));
const C = require(path.join(COMMON, 'config.js'));
const F = require(path.join(COMMON, 'facts.js'));
const S = require(path.join(COMMON, 'score.js'));

function args(a) {
  const o = {};
  for (let i = 0; i < a.length; i += 2) { if (!a[i].startsWith('--')) throw new Error('bad argument ' + a[i]); o[a[i].slice(2)] = a[i + 1]; }
  return o;
}
const readLines = (f) => {
  const b = fs.readFileSync(f);
  return (f.endsWith('.gz') ? zlib.gunzipSync(b) : b).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
};

async function packCmd(o) {
  const rec = JSON.parse(fs.readFileSync(o.primary, 'utf8'));
  const cfg = rec.config;
  if (C.configHash(cfg) !== rec.hash) throw new Error('frozen primary config hashes to ' + C.configHash(cfg) + ', record says ' + rec.hash);
  if (cfg.granularity !== 'file' || cfg.form !== 'signature' || (cfg.pad || 'none') !== 'none') throw new Error('not the file/signature/none primary');
  const tasks = new Map(readLines(o.tasks).map((t) => [t.id, t]));
  const lines = readLines(o.ranked);
  lines.sort((x, y) => { const px = tasks.get(x.id).parent; const py = tasks.get(y.id).parent; return px < py ? -1 : px > py ? 1 : 0; });
  const W = new H.GzWriter(o.out);
  let G = null; let fileOf = null; let missing = 0; let n = 0; const missingSample = [];
  for (const l of lines) {
    const t = tasks.get(l.id); if (!t) throw new Error('no task ' + l.id);
    if (!G || G.sha !== t.parent) {
      G = F.loadFacts(t.parent);
      fileOf = new Map(); for (const nd of G.nodes) if ((nd.kind === 'file' || nd.kind === 'doc') && nd.path && !fileOf.has(nd.path)) fileOf.set(nd.path, nd.i);
    }
    const seedMap = H.mapSeed(G, t.seed);
    const ranked = [];
    for (let k = 0; k < l.ranked.length; k++) {
      const i = fileOf.get(l.ranked[k]);
      if (!i) { missing++; if (missingSample.length < 5) missingSample.push([t.parent.slice(0, 12), l.ranked[k]]); continue; }
      ranked.push({ i, hop: null, score: l.ranked.length - k, via: null });
    }
    const t0 = Date.now();
    const a = H.answer(G, t, seedMap, { ranked, engine_ms: null, lookups: null, meta: { variant: l.variant, adapter: 'answer_level.js' } }, cfg, l.variant, 0);
    a.ms = Date.now() - t0;
    W.write(a); n++;
  }
  await W.close();
  console.log(JSON.stringify({ packed: n, out: o.out, config_hash: rec.hash, ranked_paths_without_file_node: missing, sample: missingSample }));
}

function scoreCmd(o) {
  const refs = S.readRefs(o.refs);
  const out = [];
  for (const a of readLines(o.answers)) {
    const r = refs.get(a.id); if (!r) throw new Error('no reference for ' + a.id);
    const s = S.scoreAnswer(a, r, { rule: 'content' });
    if (!s) throw new Error('reference with no unit for ' + a.id);
    out.push({ id: a.id, arm: a.arm, cluster: s.cluster, units: s.units, primary: s.primary, r2000: s.r2000, r4000: s.r4000, r8000: s.r8000,
      r16000: s.r16000, file_r10: s.file_r10, mrr: s.mrr, tok8000: s.tok8000 });
  }
  fs.writeFileSync(o.out + '.part', out.map((x) => JSON.stringify(x)).join('\n') + '\n');
  fs.renameSync(o.out + '.part', o.out);
  console.log(JSON.stringify({ scored: out.length, out: o.out }));
}

const [cmd, ...rest] = process.argv.slice(2);
const o = args(rest);
if (cmd === 'pack') packCmd(o).catch((e) => { console.error(e); process.exit(1); });
else if (cmd === 'score') scoreCmd(o);
else { console.error('usage: answer_level.js pack|score ...'); process.exit(2); }
