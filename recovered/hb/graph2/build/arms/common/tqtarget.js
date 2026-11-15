'use strict';
// The named target of a TQ question, read from the question text only (never from a reference answer).
// One parser for every arm, so the typed arms and the search arm read the same target.
//
// History: the relational arm's target() (copied into the DuckPGQ arm, imported by the LadybugDB arm)
// handled only the phrasings of the 20 TUNE questions. The pre-flight audit found that 7 of the 30
// held-out questions (other_half 24, 40, 46; route_clients 27; setting_readers 33, 41, 47) did not
// match, so those arms would have thrown and recorded an empty error answer. The rules below keep the
// original patterns first, unchanged (every TUNE question still yields exactly the target it yielded
// before; checked by tmp/lock/preflight1/tq_parse_check.js), and add general
// fallbacks read from the question's own sentence (the text before " Scope:", so the shared naming
// boilerplate such as "object.method" is never taken for a target):
//   other_half      path::Symbol  >  "Symbol (path)" at the start  >  "Symbol (path," or "Symbol (path)"
//                   anywhere, where Symbol looks like a code name (contains "." or "_", starts upper
//                   case, or is camelCase; a prose word such as "lock" is not taken)  >  the first code
//                   path alone: { path }, i.e. every node of that file, the same file-target convention
//                   as screen_tables and invariants_on_file
//   setting_readers "setting X (settings.Y, env Z)"  >  settings.X [and env Z]  >  "setting key X" of
//                   the shop_setting registry: name "shop/X" (the extractor's node id setting:shop/X)  >
//                   a dotted "config.a.b" name: { config } (matched on the setting node's name)  >  an
//                   upper-case variable name (A_B...): { env }
//   route_clients   every "METHOD /path" in the sentence: one -> { route } (the original pattern first),
//                   several -> { routes: [...] } (an arm answers each and merges the results)
// A question with no target still throws (the harness records the error), naming the question.
//
// Absent members (pre-flight fix round 2, the orchestrator's option 1 for held-out question 40): a
// symbol target `sym:<path>#A.b.c` (tests_reach, change_reach, other_half) that is not a node of the
// shared canonical graph at the frozen commit (the graph every arm loads, common/facts.js) is cut back
// one trailing ".member" at a time to the nearest existing node (`#A.b`, then `#A`); a schema field,
// for example, has no node but its class has. When no prefix exists the target is left as it was (the
// arms then answer empty, as before). An existing target is never changed, so every target that
// resolved before still resolves to itself (no TUNE target and no probe target 901-907 changed;
// tmp/lock/preflight2/parse_check.json). The cut is recorded in the target as `asked`.
const P = require('./paths');
const CODE = '(?:py|tsx|ts|jsx|js|mjs)';
const RE_PATHSYM = new RegExp('([\\w./-]+\\.' + CODE + ')::([\\w.]+)');
const RE_PATH = new RegExp('([\\w-]+\\/[\\w./-]+\\.' + CODE + ')');
const RE_SYMPATH = new RegExp('(?:^|[\\s(])([A-Za-z_][\\w.]*) \\(([\\w-]+\\/[\\w./-]+\\.' + CODE + ')[,)]', 'g');
const RE_ROUTE = /\b(GET|POST|PUT|PATCH|DELETE) (\/[^\s,]+)/g;

const strip = (q) => q.question.replace(/^\[repo at commit \w+\]\s*/, '');
// the question's own sentence: the text before the shared " Scope:" boilerplate
const sentence = (t) => { const i = t.indexOf(' Scope:'); return i < 0 ? t : t.slice(0, i); };
// a code name rather than a prose word
const codeLike = (s) => /[._]/.test(s) || /^[A-Z]/.test(s) || /[a-z][A-Z]/.test(s);
const noTarget = (q) => { throw new Error('no ' + q.kind + ' target found in the text of question ' + q.id); };

// the node ids of the frozen commit's canonical graph (graphFor caches the graph; this caches the set)
const sidSets = new WeakMap();
function frozenSids() {
  const G = require('./arms').graphFor(P.FROZEN);
  let s = sidSets.get(G);
  if (!s) { s = new Set(G.nodes.map((n) => n.sid)); sidSets.set(G, s); }
  return s;
}
// the absent-member rule (header): an existing sid is returned unchanged; else trailing ".member" parts
// after the '#' are cut one at a time until a node exists; else unchanged
function nearest(sid, have = frozenSids()) {
  if (have.has(sid)) return { sid };
  const h = sid.indexOf('#');
  let s = sid;
  for (let d = s.lastIndexOf('.'); h >= 0 && d > h; d = s.lastIndexOf('.')) {
    s = s.slice(0, d);
    if (have.has(s)) return { sid: s, asked: sid };
  }
  return { sid };
}

function target(q) {
  const tg = parse(q);
  return tg.sid != null && tg.sid.startsWith('sym:') ? nearest(tg.sid) : tg;
}

function parse(q) {
  const t = strip(q);
  const h = sentence(t);
  const ps0 = t.match(RE_PATHSYM);
  const ps = ps0 && [ps0[0], ps0[1], ps0[2].replace(/\.+$/, '')]; // a sentence's full stop is not part of the symbol
  const pathOnly = t.match(RE_PATH);
  switch (q.kind) {
    case 'screen_tables': case 'invariants_on_file': if (!pathOnly) noTarget(q); return { path: pathOnly[1] };
    case 'tests_reach': case 'change_reach': if (!ps) noTarget(q); return { sid: 'sym:' + ps[1] + '#' + ps[2] };
    case 'other_half': {
      if (ps) return { sid: 'sym:' + ps[1] + '#' + ps[2] };
      const m = t.match(/^([\w.]+) \(([\w./-]+)\)/);
      if (m) return { sid: 'sym:' + m[2] + '#' + m[1] };
      for (const x of h.matchAll(RE_SYMPATH)) {
        const sym = x[1].replace(/\.+$/, '');
        if (codeLike(sym)) return { sid: 'sym:' + x[2] + '#' + sym };
      }
      const p = h.match(RE_PATH);
      if (p) return { path: p[1] };
      return noTarget(q);
    }
    case 'setting_readers': {
      const m = t.match(/setting (\w+) \(settings\.\w+, env (\w+)\)/);
      if (m) return { name: m[1], env: m[2] };
      const s = h.match(/\bsettings\.(\w+)/);
      const e = h.match(/\benv ([A-Z][A-Z0-9_]+)\b/);
      if (s) return e ? { name: s[1], env: e[1] } : { name: s[1] };
      const k = h.match(/\bsetting key (\w+)/);
      if (k && /\bshop_setting\b/.test(h)) return { name: 'shop/' + k[1] };
      const c = h.match(/\b(config(?:\.\w+)+)/);
      if (c) return { config: c[1].replace(/\.+$/, '') };
      const v = h.match(/\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/);
      if (v) return { env: v[1] };
      return noTarget(q);
    }
    case 'migrations_touch_table': { const m = t.match(/touch the table (\w+)/); if (!m) noTarget(q); return { table: m[1] }; }
    case 'route_clients': {
      const all = [...new Set([...h.matchAll(RE_ROUTE)].map((x) => x[1] + ' ' + x[2].replace(/[).?;:]+$/, '')))];
      if (all.length > 1) return { routes: all };
      const m = t.match(/route ((?:GET|POST|PUT|PATCH|DELETE) \/[^\s,]+)/);
      if (m) return { route: m[1] };
      if (all.length === 1) return { route: all[0] };
      return noTarget(q);
    }
    default: throw new Error('kind ' + q.kind);
  }
}

// the routes of a route_clients target, one or several
const routesOf = (tg) => (tg.routes ? tg.routes : [tg.route]);

module.exports = { target, parse, nearest, routesOf, sentence, codeLike };
