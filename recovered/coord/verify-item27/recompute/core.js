'use strict';
// Node mirror of embeddings/eval/evalcore.py ranking, fusion and aggregation semantics.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const { blake2b } = require('./blake2b.js');

const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const TIE_SEED = 20261114;
const TWO64 = 2.0 ** 64;

function readJsonl(p) { return fs.readFileSync(p, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)); }

// read_score_table: {task_id: Map(candidate -> float)}
function readScoreTable(p) {
  const txt = zlib.gunzipSync(fs.readFileSync(p)).toString('utf8');
  const lines = txt.split('\n');
  const out = new Map(); let rows = 0, nan = 0, inf = 0;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i]; if (l === '') continue;
    const parts = l.split('\t');
    if (parts.length !== 3) throw new Error('bad row ' + p + ':' + i);
    const [tid, c, s] = parts;
    let v;
    if (s === 'nan') v = NaN; else if (s === 'inf') v = Infinity; else if (s === '-inf') v = -Infinity; else v = Number(s);
    if (Number.isNaN(v) && s !== 'nan') throw new Error('unparsed score ' + s);
    if (Number.isNaN(v)) nan++; if (!Number.isFinite(v) && !Number.isNaN(v)) inf++;
    if (!out.has(tid)) out.set(tid, new Map());
    out.get(tid).set(c, v); rows++;
  }
  out.rows = rows; out.nan = nan; out.inf = inf;
  return out;
}

const tbCache = new Map();
function tiebreak(tid, c, seed = TIE_SEED) {
  const key = seed + '|' + tid + '|' + c;
  let v = tbCache.get(key);
  if (v === undefined) {
    const h = blake2b(Buffer.from(key, 'utf8'), 8);
    let n = 0n; for (const b of h) n = (n << 8n) | BigInt(b);
    v = Number(n) / TWO64; // Number(BigInt) rounds to nearest, as Python's int->float in int / float
    tbCache.set(key, v);
  }
  return v;
}

function cmpStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

// rank(): scored by score desc, ties by tiebreak then name; then unscored by (tiebreak, name). NaN = unscored.
function rank(tid, cands, scores) {
  const sc = [], un = [];
  for (const c of cands) {
    const has = scores && scores.has(c);
    const s = has ? scores.get(c) : undefined;
    if (has && s !== null && !Number.isNaN(s)) sc.push([-s, tiebreak(tid, c), c]);
  }
  const scored = new Set(sc.map(x => x[2]));
  for (const c of cands) if (!scored.has(c)) un.push([tiebreak(tid, c), c]);
  sc.sort((a, b) => (a[0] !== b[0] ? (a[0] < b[0] ? -1 : 1) : a[1] !== b[1] ? (a[1] < b[1] ? -1 : 1) : cmpStr(a[2], b[2])));
  un.sort((a, b) => (a[0] !== b[0] ? (a[0] < b[0] ? -1 : 1) : cmpStr(a[1], b[1])));
  return sc.map(x => x[2]).concat(un.map(x => x[1]));
}

function ranksWithin(tid, cands, scores) {
  const sub = cands.filter(c => scores && scores.has(c));
  const order = rank(tid, sub, scores);
  const r = new Map(); order.forEach((c, i) => r.set(c, i + 1));
  return r;
}

function rrfScores(tid, cands, arms, k = 60) {
  const out = new Map(); for (const c of cands) out.set(c, 0.0);
  for (const [scores, wt] of arms) {
    for (const [c, r] of ranksWithin(tid, cands, scores)) out.set(c, out.get(c) + wt / (k + r));
  }
  return out;
}

function p10(ranked, truth) {
  const T = new Set(truth); let h = 0;
  for (const c of ranked.slice(0, 10)) if (T.has(c)) h++;
  return h / 10.0;
}

function npMean(arr) { let s = 0; for (const x of arr) s += x; return s / arr.length; }

// per_commit + summary over a commit set. perTask: Map tid -> value. Returns {commits, vals, mean, se1, se0}
function perCommit(perTask, tasks, commitsSet) {
  const by = new Map(), order = new Map();
  for (const t of tasks) {
    if (commitsSet && !commitsSet.has(t.commit)) continue;
    if (!by.has(t.commit)) by.set(t.commit, []);
    by.get(t.commit).push(perTask.get(t.task_id)); order.set(t.commit, t.date_order);
  }
  const cs = [...by.keys()].sort((a, b) => order.get(a) - order.get(b));
  const vals = cs.map(c => npMean(by.get(c)));
  const n = vals.length, m = npMean(vals);
  let ss = 0; for (const v of vals) ss += (v - m) * (v - m);
  return { commits: cs, vals, n, mean: m, se1: Math.sqrt(ss / (n - 1)) / Math.sqrt(n), se0: Math.sqrt(ss / n) / Math.sqrt(n) };
}

module.exports = { LANE, readJsonl, readScoreTable, tiebreak, rank, ranksWithin, rrfScores, p10, npMean, perCommit, path };
