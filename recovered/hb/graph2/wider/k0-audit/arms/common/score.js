'use strict';
// The single scorer for every arm (protocol addendum 2, A.1 to A.5). Run only by the grader against
// the sealed references; arm builders never run it on sealed files.
//   node score.js --answers <file.jsonl.gz>[,<file>...] | --answers-dir <dir> --refs <references.jsonl>
//                 [--rule content|locate] [--out summary.json] [--per-cluster clusters.jsonl]
//                 [--per-task tasks.jsonl]
// Rule "content" (default): a reference FILE is credited when an item's whole path line is shown (line
// 0 of every rendering holds the path; for a cut item only when that whole line fits); a reference
// DEFINITION is credited only when a shown content line of the same path lies inside [start, end] (the
// signature lines of signature form, the source lines of snippet form; for a cut item only lines that
// fit whole). Paths and range forms show no content, so they are scored on file ranking only.
// Rule "locate" (the old rule, non-default): any shown item with the path credits the file; a
// definition is credited when the item's located range overlaps it (paths/range forms: the whole file).
// Metrics per answer file (one configuration, set and split), every one averaged per task within a
// cluster (the commit for T1, T1x, T2; fix_commit for T4; otherwise the task) and then over clusters,
// with a standard error over clusters (sample sd / sqrt(clusters)):
//   primary          recall of reference files + definitions within 8,000 tokens (signature and
//                    snippet forms only; null for paths and range forms)
//   r2000..r16000    the same at each budget, auc (trapezoid over 0, 2k, 4k, 8k, 16k, divided by 16k)
//   def_r<b>         definition-only recall; file_r<b> file-only recall
//   unpad_r<b>       recall counting only the arm's own head items (padding tail ignored)
//   t80c             tokens of whole items until recall >= 0.8, censored at 16,000 when not reached
//   reach80          share of tasks reaching 0.8 within 16,000 tokens
//   file_r10, ndcg10, mrr   file ranking (distinct paths in item order; binary relevance)
//   tok<b>           tokens used at each budget (mean and median over tasks)
//   precision<b>     shown items that credit anything / shown items
const fs = require('fs');
const path = require('path');
const H = require('./harness');

const BUDGETS = [2000, 4000, 8000, 16000];
const CONTENT_FORMS = new Set(['signature', 'snippet']);
const GRID = Array.from({ length: 32 }, (_, i) => (i + 1) * 500);

function readRefs(file) {
  const m = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
    const r0 = JSON.parse(line); const r = r0.reference ? { ...r0, ...r0.reference } : r0;
    const id = r.id || r.task_id;
    const files = [...new Set((r.files || r.ref_files || []).map((f) => (typeof f === 'string' ? f : f.path)))];
    const defs = (r.defs || r.definitions || r.ref_defs || []).map((d) => {
      const start = d.start != null ? d.start : d.line_start;
      return { path: d.path, start, end: d.end != null ? d.end : (d.line_end != null ? d.line_end : start), name: d.name || d.symbol };
    });
    m.set(id, { id, set: r.set, split: r.split, cluster: r.commit || r.fix_commit || r.group || id, files, defs });
  }
  return m;
}

const inRange = (l, d) => l >= d.start && l <= d.end;

// shownLines: [lines] (signature) or [a, b] (snippet) or null; returns predicate over definitions
function defHit(form, shown, rule, it) {
  return (d) => {
    if (it.path !== d.path) return false;
    if (rule === 'locate') {
      if (it.symbol !== null && it.symbol !== undefined) return it.ls != null && it.ls <= d.end && d.start <= (it.le || it.ls);
      if (form === 'paths' || form === 'range') return true;
    }
    if (!CONTENT_FORMS.has(form) || !shown || !shown.length) return false;
    if (form === 'snippet') return shown[0] <= d.end && d.start <= shown[1];
    return shown.some((l) => inRange(l, d));
  };
}

// credit of one shown item: {f: [paths], d: [def indexes]}
function credit(ref, form, rule, it, shown, pathShown) {
  const f = (rule === 'locate' || pathShown) && ref.files.includes(it.path) ? [it.path] : [];
  const hit = defHit(form, shown, rule, it);
  const d = []; ref.defs.forEach((x, j) => { if (hit(x)) d.push(j); });
  return { f, d };
}

function scoreAnswer(a, ref, opts = {}) {
  const rule = opts.rule || 'content'; const budgets = opts.budgets || BUDGETS;
  const nF = ref.files.length; const nD = ref.defs.length; const units = nF + nD;
  if (!units) return null;
  const form = a.form; const content = CONTENT_FORMS.has(form) || rule === 'locate';
  const out = { id: a.id, cluster: ref.cluster, units, n_files: nF, n_defs: nD };
  const whole = a.items.map((it) => credit(ref, form, rule, it, it.shown, true));
  // file ranking
  const fileRank = []; const seenP = new Set();
  for (const it of a.items) if (it.path && !seenP.has(it.path)) { seenP.add(it.path); fileRank.push(it.path); }
  if (nF) {
    const rel = fileRank.map((p) => (ref.files.includes(p) ? 1 : 0));
    out.file_r10 = rel.slice(0, 10).reduce((x, y) => x + y, 0) / nF;
    let dcg = 0; let idcg = 0;
    for (let i = 0; i < Math.min(10, rel.length); i++) if (rel[i]) dcg += 1 / Math.log2(i + 2);
    for (let i = 0; i < Math.min(10, nF); i++) idcg += 1 / Math.log2(i + 2);
    out.ndcg10 = dcg / idcg;
    const first = rel.indexOf(1); out.mrr = first >= 0 ? 1 / (first + 1) : 0;
  } else { out.file_r10 = null; out.ndcg10 = null; out.mrr = null; }
  // whole-item curve (tokens to 80 %, recall on the token grid)
  { const gF = new Set(); const gD = new Set(); let tok = 0; out.t80 = null; out.grid = [];
    let gi = 0; const maxB = Math.max(...budgets);
    for (let i = 0; i < whole.length; i++) {
      const nt = tok + a.items[i].tok;
      while (gi < GRID.length && GRID[gi] < nt) { out.grid.push((gF.size + gD.size) / units); gi++; }
      tok = nt;
      whole[i].f.forEach((x) => gF.add(x)); whole[i].d.forEach((x) => gD.add(x));
      if (out.t80 === null && (gF.size + gD.size) / units >= 0.8 && tok <= maxB) out.t80 = tok;
    }
    while (gi < GRID.length) { out.grid.push((gF.size + gD.size) / units); gi++; }
    out.reach80 = out.t80 !== null ? 1 : 0; out.t80c = out.t80 !== null ? out.t80 : maxB;
  }
  for (const b of budgets) {
    const bb = a.budgets[b] || a.budgets[String(b)]; if (!bb) continue;
    const gF = new Set(); const gD = new Set(); const hF = new Set(); const hD = new Set(); let n = 0; let useful = 0;
    const take = (it, c, isPad) => {
      n++;
      c.f.forEach((x) => gF.add(x)); c.d.forEach((x) => gD.add(x));
      if (!isPad) { c.f.forEach((x) => hF.add(x)); c.d.forEach((x) => hD.add(x)); }
      if (c.f.length || c.d.length) useful++;
    };
    for (let i = 0; i < bb.n_full; i++) take(a.items[i], whole[i], a.items[i].pad);
    if (bb.cut && a.items[bb.n_full]) {
      const it = a.items[bb.n_full];
      const ps = bb.cut.path_shown !== undefined ? bb.cut.path_shown : !!(bb.cut.shown && bb.cut.shown.length);
      take(it, credit(ref, form, rule, it, bb.cut.shown, ps), bb.cut.pad !== undefined ? bb.cut.pad : it.pad);
    }
    out['tok' + b] = bb.used;
    if (!content) { for (const k of ['r', 'file_r', 'def_r', 'unpad_r', 'precision']) out[k + b] = null; continue; }
    out['r' + b] = (gF.size + gD.size) / units;
    out['file_r' + b] = nF ? gF.size / nF : null;
    out['def_r' + b] = nD ? gD.size / nD : null;
    out['unpad_r' + b] = (hF.size + hD.size) / units;
    out['precision' + b] = n ? useful / n : 0;
  }
  if (content) {
    let auc = 0; let x0 = 0; let y0 = 0;
    for (const b of budgets) { const y = out['r' + b]; if (y == null) continue; auc += (b - x0) * (y0 + y) / 2; x0 = b; y0 = y; }
    out.auc = auc / Math.max(...budgets);
    out.primary = out.r8000 != null && CONTENT_FORMS.has(form) ? out.r8000 : null;
  } else { out.auc = null; out.primary = null; }
  if (!CONTENT_FORMS.has(form)) out.primary = null;
  return out;
}

const mean = (xs) => (xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : null);
function seOf(xs) {
  if (xs.length < 2) return null;
  const m = mean(xs); const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(v / xs.length);
}
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((x, y) => x - y); const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

const METRICS = ['primary', ...BUDGETS.map((b) => 'r' + b), 'auc', ...BUDGETS.map((b) => 'def_r' + b), ...BUDGETS.map((b) => 'file_r' + b),
  ...BUDGETS.map((b) => 'unpad_r' + b), ...BUDGETS.map((b) => 'precision' + b), 't80c', 'reach80', 'file_r10', 'ndcg10', 'mrr',
  ...BUDGETS.map((b) => 'tok' + b)];

// per-cluster means of every metric
function clusterValues(per) {
  const g = new Map();
  for (const s of per) { if (!g.has(s.cluster)) g.set(s.cluster, []); g.get(s.cluster).push(s); }
  const rows = [];
  for (const [cl, ss] of [...g].sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
    const r = { cluster: cl, n_tasks: ss.length };
    for (const m of METRICS) { const v = ss.map((s) => s[m]).filter((x) => x != null); r[m] = v.length ? mean(v) : null; }
    r.grid = GRID.map((_, i) => mean(ss.map((s) => s.grid[i])));
    rows.push(r);
  }
  return rows;
}

function summarise(per, rows) {
  const o = { tasks: per.length, clusters: rows.length, metrics: {} };
  for (const m of METRICS) {
    const v = rows.map((r) => r[m]).filter((x) => x != null);
    o.metrics[m] = { mean: mean(v), se: seOf(v), clusters: v.length };
  }
  for (const b of BUDGETS) o.metrics['tok' + b].median_over_tasks = median(per.map((s) => s['tok' + b]).filter((x) => x != null));
  o.metrics.t80c.median_over_tasks = median(per.map((s) => s.t80c));
  return o;
}

function scoreFile(file, refs, opts = {}) {
  const answers = H.readGzJsonl(file);
  const per = []; let missing = 0; let zero = 0;
  const groups = new Map();
  for (const a of answers) {
    const r = refs.get(a.id); if (!r) { missing++; continue; }
    const s = scoreAnswer(a, r, opts); if (!s) { zero++; continue; }
    const key = [a.arm, a.config_hash, a.set, a.split].join('|');
    if (!groups.has(key)) groups.set(key, { arm: a.arm, config_hash: a.config_hash, config_name: a.config_name || null, set: a.set, split: a.split, form: a.form, granularity: a.granularity, pad: a.pad || 'none', per: [] });
    groups.get(key).per.push(s); per.push(s);
  }
  const out = [];
  for (const g of groups.values()) {
    const rows = clusterValues(g.per);
    out.push({ file: path.basename(file), arm: g.arm, config_hash: g.config_hash, config_name: g.config_name, set: g.set, split: g.split, form: g.form, granularity: g.granularity, pad: g.pad,
      rule: opts.rule || 'content', missing_refs: missing, zero_unit_refs: zero, ...summarise(g.per, rows), _rows: rows, _per: g.per });
  }
  return out;
}

function args() {
  const a = process.argv.slice(2); const o = { rule: 'content', answers: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--answers') o.answers.push(...a[++i].split(','));
    else if (a[i] === '--answers-dir') { const d = a[++i]; o.answers.push(...fs.readdirSync(d).filter((f) => f.endsWith('.jsonl.gz')).sort().map((f) => path.join(d, f))); }
    else if (a[i] === '--refs') o.refs = a[++i];
    else if (a[i] === '--rule') o.rule = a[++i];
    else if (a[i] === '--out') o.out = a[++i];
    else if (a[i] === '--per-cluster') o.perCluster = a[++i];
    else if (a[i] === '--per-task') o.perTask = a[++i];
    else throw new Error('unknown argument ' + a[i]);
  }
  if (!o.answers.length || !o.refs) throw new Error('usage: score.js --answers <gz>[,..] | --answers-dir <dir> --refs <jsonl> [--rule content|locate]');
  if (!['content', 'locate'].includes(o.rule)) throw new Error('rule must be content or locate');
  return o;
}

function main() {
  const o = args();
  const refs = readRefs(o.refs);
  const all = []; const pc = []; const pt = [];
  for (const f of o.answers) for (const s of scoreFile(f, refs, { rule: o.rule })) {
    const key = { file: s.file, arm: s.arm, config_hash: s.config_hash, set: s.set, split: s.split };
    for (const r of s._rows) pc.push({ ...key, ...r });
    for (const t of s._per) pt.push({ ...key, ...t });
    delete s._rows; delete s._per; all.push(s);
  }
  if (o.perCluster) fs.writeFileSync(o.perCluster, pc.map((x) => JSON.stringify(x)).join('\n') + '\n');
  if (o.perTask) fs.writeFileSync(o.perTask, pt.map((x) => JSON.stringify(x)).join('\n') + '\n');
  if (o.out) fs.writeFileSync(o.out, JSON.stringify(all, null, 1));
  console.log(JSON.stringify(all.map((s) => ({ arm: s.arm, config: s.config_name || s.config_hash, set: s.set, split: s.split, form: s.form, tasks: s.tasks, clusters: s.clusters,
    primary: s.metrics.primary, r2000: s.metrics.r2000.mean, r4000: s.metrics.r4000.mean, r16000: s.metrics.r16000.mean, auc: s.metrics.auc.mean,
    file_r10: s.metrics.file_r10.mean, ndcg10: s.metrics.ndcg10.mean, mrr: s.metrics.mrr.mean, tok8000_median: s.metrics.tok8000.median_over_tasks })), null, 1));
}

if (require.main === module) main();
module.exports = { scoreAnswer, readRefs, clusterValues, summarise, scoreFile, METRICS, GRID, BUDGETS, mean, seOf, median };
