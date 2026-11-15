'use strict';
// The nine question programs, written over the recording reader (rec.js).
// Kinds 1-8 are JavaScript ports of the SQL question programs of the finished test
// (arms/relational/tq.js, copied to lib/relational/tq.js), one function per kind, same depth cap (12),
// same filters, same ordering (SQLite BINARY = UTF-8 byte order, NULL first) and the same multi-route
// merge. crosscheck.js compares every answer with the SQL program at several snapshots.
// Kind 9 (completion) is the frozen change-completion configuration of the finished test (primary,
// config hash 95e990307da3b42b: file granularity, signature form, no padding, minConf 0.5, direction
// both, classes structure..history, k-hop with no hop cap, no hub rule, degnorm) run by the reference arm
// (lib/reference/ref.js), projected and packed by the shared packer (lib/common/packer.js) into 8,000
// tokens. Its answer = the items shown inside 8,000 tokens (paths in order, and which one is cut).
// Each program splits into sub-derivations where a later stage reads only an earlier stage's result
// (the reach sets, the ranked file list): those are the units early cutoff can stop at.
const { RefGraph } = require('./lib/reference/ref');
const packer = require('./lib/common/packer');
const { CLASSES } = require('./lib/common/edgeclasses');
const { DEF_KINDS } = require('./lib/common/seed');

const DEPTH = 12;
const byBytes = (a, b) => {
  if (a === b) return 0;
  if (a == null) return -1; if (b == null) return 1;
  return Buffer.compare(Buffer.from(String(a)), Buffer.from(String(b)));
};
const distinctSorted = (xs) => {
  const seen = new Set(); const r = [];
  for (const x of xs) { const k = x === null ? '\u0000null' : x; if (!seen.has(k)) { seen.add(k); r.push(x); } }
  return r.sort(byBytes);
};
const afterHash = (sid) => sid.slice(sid.indexOf('#') + 1); // substr(sid, instr(sid,'#')+1): whole id when no '#'
const LABEL = (n) => (n.path == null ? null : n.path + '::' + ((n.sid.indexOf('#') > 0 && (n.sid.startsWith('sym:') || n.sid.startsWith('const:'))) ? afterHash(n.sid) : n.name));
const notBackend = (n) => (n.runtime == null ? '' : n.runtime) !== 'backend';
const likePrefix = (p, pre) => p != null && p.toLowerCase().startsWith(pre); // SQLite LIKE is ASCII case-insensitive

const K = {
  SC1: ['defines', 'calls', 'renders', 'passes_callable', 'enqueues_kind', 'kind_handled_by'],
  SC2: ['calls_url', 'registers_route'],
  SCB: ['calls', 'depends_injects', 'passes_callable'],
  TR: ['calls', 'depends_injects', 'passes_callable', 'registers_route', 'test_calls_route', 'renders'],
  OH: ['calls', 'depends_injects', 'passes_callable', 'registers_route'],
  CR: ['calls', 'depends_injects', 'passes_callable', 'registers_route', 'runs'],
};

// breadth-first reach with a depth cap: forward (out edges, the target filtered) or reverse (in edges,
// the source filtered). Start nodes are never filtered. Returns sorted node ids.
function reach(rec, starts, dir, kinds, keep) {
  const dist = new Map();
  let frontier = [];
  for (const s of starts) if (!dist.has(s)) { dist.set(s, 0); frontier.push(s); }
  for (let d = 0; d < DEPTH && frontier.length; d++) {
    const next = [];
    for (const u of frontier) {
      const es = dir === 'out' ? rec.out(u, kinds) : rec.inn(u, kinds);
      for (const e of es) {
        const v = dir === 'out' ? e.ds : e.ss;
        if (dist.has(v)) continue;
        if (keep && !keep(rec, e, v)) continue;
        dist.set(v, d + 1); next.push(v);
      }
    }
    frontier = next;
  }
  return [...dist.keys()].sort();
}
const nonTest = (rec, e, v) => { const n = rec.node(v); return n && !n.is_test; };

const P = {
  screen_tables(rec, tg) {
    const starts = rec.byPath(tg.path).map((n) => n.sid);
    const C = rec.sub('client_reach', [tg.path], (r) => {
      const sc1 = new Set(K.SC1);
      return reach(r, starts, 'out', [...K.SC1, ...K.SC2], (rr, e, v) => {
        const x = rr.node(v); if (!x || x.is_test) return false;
        return sc1.has(e.kind) || notBackend(x);
      });
    });
    const B = rec.sub('backend_reach', [C.join('\n')], (r) => {
      const hs = [];
      for (const c of C) for (const e of r.out(c, ['calls_url'])) {
        const rt = r.node(e.ds); if (!rt || rt.runtime !== 'backend') continue;
        for (const h of r.out(rt.sid, ['registers_route'])) hs.push(h.ds);
      }
      return reach(r, hs, 'out', K.SCB, nonTest);
    });
    const names = [];
    for (const b of B) for (const e of rec.out(b, ['writes_table'])) { const t = rec.node(e.ds); names.push(t.name); }
    return distinctSorted(names);
  },

  tests_reach(rec, tg) {
    const t = rec.node(tg.sid);
    const R = rec.sub('reverse_reach', [tg.sid, 'TR'], (r) => (r.node(tg.sid) ? reach(r, [tg.sid], 'in', K.TR, null) : []));
    const real = [];
    for (const n of R) { const x = rec.node(n); if (x.is_test) real.push(x.path); }
    const fake = [];
    if (t) {
      const targets = [t.sid];
      if (t.path) { const f = rec.byPath(t.path).find((n) => (n.kind === 'file' || n.kind === 'doc')); if (f && f.sid !== t.sid) targets.push(f.sid); }
      for (const x of targets) for (const e of rec.inn(x, ['mocks', 'overrides'])) { const s = rec.node(e.ss); if (s.is_test) fake.push(s.path); }
    }
    return { real: distinctSorted(real), fake: distinctSorted(fake) };
  },

  invariants_on_file(rec, tg) {
    const rows = new Map();
    for (const t of rec.byPath(tg.path)) for (const e of rec.inn(t.sid, ['constrains'])) {
      const i = rec.node(e.ss, true);
      if (i.kind !== 'invariant') continue;
      rows.set('CLAUDE.md:L' + i.ls, i.ls);
    }
    return [...rows.entries()].sort((a, b) => (a[1] == null ? -1 : b[1] == null ? 1 : a[1] - b[1])).map((x) => x[0]);
  },

  other_half(rec, tg) {
    const starts = tg.sid != null ? (rec.node(tg.sid) ? [tg.sid] : []) : rec.byPath(tg.path).map((n) => n.sid);
    const R = rec.sub('reverse_reach', [tg.sid || tg.path, 'OH'], (r) => reach(r, starts, 'in', K.OH, nonTest));
    const sites = new Set();
    for (const n of R) {
      const rt = rec.node(n); if (rt.kind !== 'route') continue;
      for (const e of rec.inn(n, ['calls_url'])) { const s = rec.node(e.ss); if (!s.is_test && notBackend(s)) sites.add(s.sid); }
    }
    const z = new Set(sites);
    for (const s of sites) for (const e of rec.inn(s, ['calls'])) z.add(e.ss);
    const out = [];
    for (const id of z) { const n = rec.node(id); if (!n.is_test && notBackend(n)) out.push(LABEL(n)); }
    return distinctSorted(out);
  },

  setting_readers(rec, tg) {
    const sts = new Map();
    if (tg.name != null) { const n = rec.node('setting:' + tg.name); if (n) sts.set(n.sid, n); }
    if (tg.env != null) { const n = rec.node('setting:env/' + tg.env); if (n) sts.set(n.sid, n); }
    if (tg.config != null) for (const n of rec.byName(tg.config)) sts.set(n.sid, n);
    const out = [];
    const FN = new Set(['function', 'method', 'component', 'class', 'constant']);
    const FL = new Set(['function', 'method', 'constant']);
    for (const st of sts.values()) for (const e of rec.inn(st.sid, ['reads_setting'], true)) {
      const s = rec.node(e.ss); if (s.is_test) continue;
      for (const [p, l] of e.evs) {
        if (FN.has(s.kind)) { out.push(s.path == null ? null : s.path + '::' + afterHash(s.sid)); continue; }
        const cands = rec.byPath(p, true).filter((f) => FL.has(f.kind) && f.ls != null && f.le != null && l >= f.ls && l <= f.le);
        cands.sort((a, b) => b.ls - a.ls || a.i - b.i);
        if (cands.length) out.push(cands[0].path + '::' + afterHash(cands[0].sid));
        else out.push(p + '::' + st.name);
      }
    }
    return distinctSorted(out);
  },

  migrations_touch_table(rec, tg) {
    const t = rec.node('table:' + tg.table);
    const out = [];
    if (t) for (const e of rec.inn(t.sid, ['migration_touches'], true)) {
      const m = rec.node(e.ss);
      const up = rec.node('sym:' + m.path + '#upgrade', true);
      if (!up || up.path !== m.path) continue;
      for (const [, l, op] of e.evs) {
        if ((op == null ? '' : op) === 'create_foreign_key') continue;
        if (up.ls != null && up.le != null && l >= up.ls && l <= up.le) out.push(m.name);
      }
    }
    return distinctSorted(out).map((x) => String(x).padStart(4, '0'));
  },

  route_clients(rec, tg) {
    const one = (route) => {
      const sites = (sid) => {
        const r = rec.node(sid); if (!r) return [];
        return rec.inn(sid, ['calls_url']).map((e) => rec.node(e.ss));
      };
      const bs = sites('route:backend ' + route);
      const call_sites = distinctSorted(bs.filter((n) => !n.is_test).map(LABEL));
      const via_bff = distinctSorted(sites('route:ops ' + route).filter((n) => !n.is_test).map(LABEL));
      const dc = [];
      for (const s of bs) { if (s.is_test) continue; for (const e of rec.inn(s.sid, ['calls'])) { const n = rec.node(e.ss); if (!n.is_test) dc.push(LABEL(n)); } }
      return { call_sites, via_bff, direct_callers: distinctSorted(dc) };
    };
    const rs = tg.routes ? tg.routes : [tg.route];
    if (rs.length === 1) return one(rs[0]);
    const parts = rs.map(one);
    const m = (k) => [...new Set(parts.map((x) => x[k]).flat())].sort((a, b) => Buffer.compare(Buffer.from(String(a)), Buffer.from(String(b))));
    return { call_sites: m('call_sites'), via_bff: m('via_bff'), direct_callers: m('direct_callers') };
  },

  change_reach(rec, tg) {
    const R = rec.sub('reverse_reach', [tg.sid, 'CR'], (r) => (r.node(tg.sid) ? reach(r, [tg.sid], 'in', K.CR, nonTest) : []));
    const o = { backend: [], web: [], mobile: [] };
    for (const id of R) {
      const n = rec.node(id);
      if (n.kind === 'route' && n.runtime === 'backend') o.backend.push(n.name);
      else if (n.kind === 'scheduled_job') o.backend.push('scheduler:' + n.name);
      else if (likePrefix(n.path, 'backend/scripts/')) o.backend.push(n.kind === 'route' ? n.name : 'script:' + n.path);
      if (n.kind === 'route' && n.runtime === 'backend') {
        for (const e of rec.inn(id, ['calls_url'])) {
          const s = rec.node(e.ss);
          if (s.is_test || !(likePrefix(s.path, 'src/') || likePrefix(s.path, 'technician-app/'))) continue;
          (likePrefix(s.path, 'technician-app/') ? o.mobile : o.web).push(s.path + '::' + afterHash(s.sid));
        }
      }
    }
    return { backend: distinctSorted(o.backend), web: distinctSorted(o.web), mobile: distinctSorted(o.mobile) };
  },
};

// kind 9: the frozen change-completion configuration
const COMPLETION_CFG = {
  granularity: 'file', form: 'signature', pad: 'none', minConf: 0.5, direction: 'both',
  classes: ['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'history'],
  traversal: { mode: 'khop', hops: null }, hub: { mode: 'none' }, rank: { mode: 'degnorm' },
};
const COMPLETION_MASK = COMPLETION_CFG.classes.reduce((m, c) => m | (1 << CLASSES.indexOf(c)), 0);
const BUDGET = 8000;

function refFor(snap) { if (!snap._ref) snap._ref = new RefGraph(snap.G); return snap._ref; }

P.completion = function completion(rec, tg) {
  const snap = rec.s; const G = snap.G;
  const fileNode = rec.node('file:' + tg.path);
  if (!fileNode) return { items: [], n_full: 0, cut: null };
  // tg.seeds (node ids) is used only by check_completion.js, to replay the finished test's seeds
  const extra = (tg.seeds || []).map((s) => snap.node.get(s)).filter((n) => n && n.sid !== fileNode.sid);
  const units = rec.sub('ranked_files', [tg.path], (r) => {
    const seeds = [fileNode.i, ...extra.map((n) => n.i)].sort((a, b) => a - b);
    for (const n of extra) { r.node(n.sid); r.incident(n.sid, COMPLETION_MASK); }
    const ranked = refFor(snap).rank(seeds, COMPLETION_CFG, { path: tg.path, symbol: null });
    // what the traversal and ranking read: every reached node (id order breaks ties; its file for the
    // projection) and every edge at it in the active classes, whatever its confidence (minConf and the
    // out-degree read them), plus the pattern of those edges (a new edge at a reached node changes reach
    // or degree)
    r.node(fileNode.sid);
    for (const x of ranked) { const n = G.nodes[x.i - 1]; r.node(n.sid); if (n.file) r.node(G.nodes[n.file - 1].sid); }
    r.incident(fileNode.sid, COMPLETION_MASK);
    for (const x of ranked) r.incident(G.nodes[x.i - 1].sid, COMPLETION_MASK);
    const us = packer.project(G, ranked, seeds, 'file');
    return us.map((u) => G.nodes[u.u - 1].path);
  });
  void extra;
  // packing reads each rendered file's definitions (line and signature) up to the budget; it renders
  // lazily, as the packer does, until the cumulative tokens pass the budget
  const unitObjs = units.map((p) => ({ u: snap.fileOf.get(p), from: null, hop: null, score: null, via: null, pad: 0 }));
  let cum = 0;
  for (const u of unitObjs) {
    if (cum > BUDGET) break;
    const n = G.nodes[u.u - 1];
    rec.node(n.sid);
    rec.byPath(n.path, true);
    cum += packer.countTokens(packer.render(G, u.u, 'signature', 'file').text);
  }
  const pk = packer.pack(G, unitObjs, 'signature', 'file', [BUDGET]);
  const b = pk.budgets[BUDGET];
  const shown = pk.items.slice(0, b.n_full + (b.cut ? 1 : 0)).map((it) => it.path);
  return { items: shown, n_full: b.n_full, cut: b.cut ? shown[shown.length - 1] : null };
};

module.exports = { P, K, DEPTH, COMPLETION_CFG, COMPLETION_MASK, byBytes, LABEL };
