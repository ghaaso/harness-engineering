'use strict';
// Ordered metapath as Cypher typed path patterns (traversal.variant = "pattern"): the native form of
// SPEC 6.3. For every step j the walks that end inside step j are one pattern
//   (s)-[p0:L0*min0..max0]->(x0)-[p1:L1*min1..max1]->(x1) ... -[q:Lj*0..maxj-1]->(y)-[e:Lj]->(v)
// over the per-type tables (f_ = stored direction, r_ = reversed, f_co_changed both orientations),
// with the weight floor and the hub rule as recursive-pattern predicates. Walk semantics (the
// engine's default for variable-length patterns) equals the BFS over (node, automaton state):
//   hop(v)   = the length of the shortest walk ending at v (any step, total length <= hops)
//   DAG arcs = the last edge (y, v) of a walk whose length is hop(v)
//   accepted (emit "end") = some walk ends at v in step j after c >= min_j edges, later mins all 0
// Two aggregate queries per step (the walks are never returned, only aggregated inside the engine):
//   1. group by (v, y, kind, orientation): min walk length, and whether any walk is accepting
//   2. group by v: the smallest "length|path" string, i.e. one shortest walk as the explanation
// Specification-equivalent; cross-checked against the reference arm without the variant.
const { CLASSES } = require('../common/edgeclasses');
const S = require('./store');

const num = S.num;

function labelsFor(lb, step) {
  const cls = new Set(step.classes.map((c) => CLASSES.indexOf(c)));
  const kinds = new Set(step.kinds);
  const out = [];
  for (const x of lb.types) {
    if (!(cls.has(x.cls) || kinds.has(x.kind))) continue;
    if (x.sym) { out.push('f_' + x.t); continue; }
    if (step.dir !== 'in') out.push('f_' + x.t);
    if (step.dir !== 'out') out.push('r_' + x.t);
  }
  return out;
}

// the Cypher text of the walks ending in step j (null when the step cannot be reached)
function branch(lb, steps, j, minc, blkOf, H) {
  const blk = blkOf ? blkOf('n') : null;
  const ends = []; // segment end nodes: expanded further, so never blocked
  const labs = steps.map((s) => labelsFor(lb, s));
  if (!labs[j].length) return null;
  for (let i = 0; i < j; i++) if (!labs[i].length && steps[i].min > 0) return null;
  const pred = (r) => `(${r}, n | WHERE ${r}.w >= ${minc}${blk ? ' AND NOT ' + blk : ''})`;
  let pat = '(s:N)'; const lens = []; const enc = [];
  let last = 's';
  for (let i = 0; i < j; i++) {
    if (!labs[i].length) continue;
    pat += `-[p${i}:${labs[i].join('|')}*${steps[i].min}..${steps[i].max} ${pred('r' + i)}]->(x${i}:N)`;
    lens.push(`length(p${i})`); ends.push('x' + i);
    enc.push(`CAST(properties(nodes(p${i}), 'id') AS STRING) + ':' + CAST(properties(rels(p${i}), 'kid') AS STRING) + ':' + CAST(x${i}.id AS STRING)`);
    last = 'x' + i;
  }
  const mj = steps[j].max;
  if (mj > 1) {
    pat += `-[q:${labs[j].join('|')}*0..${mj - 1} ${pred('rq')}]->(y:N)`;
    lens.push('length(q)'); ends.push('y');
    enc.push("CAST(properties(nodes(q), 'id') AS STRING) + ':' + CAST(properties(rels(q), 'kid') AS STRING) + ':' + CAST(y.id AS STRING)");
    last = 'y';
  }
  pat += `-[e:${labs[j].join('|')}]->(v:N)`;
  const total = (lens.length ? lens.join(' + ') + ' + ' : '') + '1';
  const c = mj > 1 ? 'length(q) + 1' : '1';
  let tailOk = true; for (let k = j + 1; k < steps.length; k++) if (steps[k].min > 0) tailOk = false;
  const acc = tailOk ? `CASE WHEN ${c} >= ${steps[j].min} THEN 1 ELSE 0 END` : '0';
  // the recursive filter covers intermediate nodes; in walk (non-SHORTEST) patterns it does not
  // reliably cover a segment's end node, so the hub rule is repeated on every end node here (a
  // zero-length segment ends on the node before it, which already passed, or on a seed, exempt)
  const endBlk = blkOf ? ends.map((x) => ' AND NOT ' + blkOf(x)).join('') : '';
  const where = `s.id IN $S AND e.w >= ${minc}` + endBlk + (H != null ? ` AND ${total} <= ${H}` : '');
  const arcs = `MATCH ${pat} WHERE ${where} RETURN v.id AS v, ${last}.id AS u, e.kid AS k, e.o AS o, min(${total}) AS L, max(${acc}) AS acc`;
  const walk = `lpad(CAST(${total} AS STRING), 4, '0') + '|' + CAST(s.id AS STRING) + '|' + ${enc.length ? enc.join(" + '|' + ") + " + '|' + " : ''}CAST(e.kid AS STRING)`;
  const paths = `MATCH ${pat} WHERE ${where} RETURN v.id AS v, min(${walk}) AS w`;
  return { arcs, paths, nseg: enc.length };
}

const ints = (s) => (s === '[]' ? [] : s.slice(1, -1).split(',').map((x) => Number(x.trim())));

function metapathPattern(lb, seeds, cfg, minc, H, hub) {
  const tr = cfg.traversal; const steps = tr.steps;
  const M = new Set(cfg.classes.map((c) => CLASSES.indexOf(c)));
  const blkOf = lb.blockedExpr(hub, M, seeds, 'n') ? (v) => lb.blockedExpr(hub, M, seeds, v) : null;
  const hop = new Map(seeds.map((s) => [s, 0]));
  const accepting = (j, c) => { if (c < steps[j].min) return false; for (let k = j + 1; k < steps.length; k++) if (steps[k].min > 0) return false; return true; };
  let accepted = null;
  if (tr.emit === 'end') { accepted = new Set(); if (accepting(0, 0)) for (const s of seeds) accepted.add(s); }
  const arcRows = []; const best = new Map();
  if (H !== 0) {
    for (let j = 0; j < steps.length; j++) {
      const b = branch(lb, steps, j, minc, blkOf, H);
      if (!b) continue;
      for (const r of lb.q(b.arcs, { S: seeds })) {
        const x = { u: num(r.u), v: num(r.v), k: num(r.k), o: num(r.o), L: num(r.L) };
        arcRows.push(x);
        if (!hop.has(x.v) || hop.get(x.v) > x.L) hop.set(x.v, x.L);
        if (accepted && num(r.acc) === 1) accepted.add(x.v);
      }
      for (const r of lb.q(b.paths, { S: seeds })) {
        const v = num(r.v);
        if (!best.has(v) || r.w < best.get(v)) best.set(v, r.w);
      }
    }
  }
  const dag = []; const seen = new Set();
  for (const x of arcRows) {
    if (x.L !== hop.get(x.v) || seeds.includes(x.v) && hop.get(x.v) === 0) continue;
    const key = x.u + '|' + x.v + '|' + x.k + '|' + x.o;
    if (!seen.has(key)) { seen.add(key); dag.push(x); }
  }
  const kindName = lb.kindName;
  const explain = (v) => {
    const parts = best.get(v).split('|');
    const path = [Number(parts[1])]; const via = [];
    for (const seg of parts.slice(2, -1)) {
      const [ns, ks, j] = seg.split(':');
      const kk = ints(ks);
      for (const n of ints(ns)) path.push(n);
      for (const k of kk) via.push(kindName[k]);
      if (kk.length) path.push(Number(j));
    }
    path.push(v); via.push(kindName[Number(parts[parts.length - 1])]);
    return [via, path];
  };
  return { hop, dag, accepted, explain, arcsByU: null };
}

module.exports = { metapathPattern, labelsFor, branch };
