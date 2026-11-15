'use strict';
// Scripted plain-search answers to the TQ questions: the names in the question, searched and read as
// a session would, in at most three lookups (a lookup = one grep over a set of paths, or one read).
// One generic script per question kind; nothing is special-cased per question.
// Called through the harness: `node arms/common/run.js tq --arm search --split tune` opens the arm on
// the frozen commit's graph and calls arm.tq(q) -> answerTq(ctx, q) for each question (SPEC.md 12).
// The held-out lock for TQ is the harness's (run.js freeze-tq + --allow-heldout).
const path = require('path');
const L = require('./lib');
const S = require('./spell');
const T = require('./tq_lib');
const { Ledger } = require('./engine');
const { target, routesOf } = require('../common/tqtarget');

let ctx = null; // the context of the commit the harness opened (the frozen commit for TQ)
const uniq = (a) => [...new Set(a.filter(Boolean))].sort();
const firstPath = (q) => (q.match(/((?:backend|src|technician-app)\/[\w./-]+\.(?:py|jsx?|tsx?|mjs))/) || [])[1];
const pathSym = (q) => { const m = q.match(/([\w./-]+\.(?:py|jsx?|tsx?|mjs))::([\w.]+)/); return m ? { path: m[1], sym: m[2] } : null; };
const short = (s) => s.split('.').pop();

// ---------------- kinds ----------------
const H = {};
// the client transport layer a person follows from a screen (HTTP helpers, outbox, sync and upload queues)
const TRANSPORT = /api|outbox|sync|queue|upload|media|request|http|client/i;

// screen -> tables written: client URLs reachable from the screen (imports to depth 2), backend
// handlers of the non-GET routes, then ORM write statements in those slices mapped to __tablename__.
H.screen_tables = (q, lg) => {
  const start = firstPath(q.question);
  // look 1: follow the screen's imports (client production code, three levels), reading import lines
  const closure = new Set([start]); let frontier = [start]; const impText = [];
  // follow the screen's own feature folder (the cards it renders) and the transport layer
  const home = L.capabilityOf(start) ? start.slice(0, start.indexOf('/features/') + 10 + L.capabilityOf(start).length) : path.posix.dirname(start);
  const transport = (r) => TRANSPORT.test(path.posix.basename(r)) || r.startsWith(home + '/');
  for (let d = 0; d < 3; d++) {
    const next = [];
    for (const f of frontier) for (const im of ctx.imports(f)) { impText.push(f + ':' + im.line + ': ' + im.spec); for (const r of im.resolved) if (T.isClient(r) && !closure.has(r) && T.isProd(r) && transport(r)) { closure.add(r); next.push(r); } }
    frontier = next;
  }
  lg.readCost('read import lines of the screen closure', impText.join('\n'));
  // look 2: the URL strings in that closure, with their HTTP method
  const h1 = T.grep(ctx, lg, 'grep /api/ in screen import closure', /\/api\//, (p) => closure.has(p));
  const want = [];
  for (const h of h1) {
    const ls = ctx.lines.get(h.path); const meth = T.methodAt(ls, h.line - 1);
    for (const r of S.routeStrings(h.path, h.text, null)) if (meth !== 'GET') want.push({ meth, r });
  }
  // look 3: one grep over backend features: route decorators, write statements, model tables
  const feat = (p) => p.startsWith('backend/app/features/') && !L.isTestPath(p);
  const h3 = T.grep(ctx, lg, 'grep decorators + writes + __tablename__ in backend features',
    /^@\w+\.(get|post|put|patch|delete)\(|APIRouter\(|__tablename__|\.add\(|\.add_all\(|\binsert\(|\bupdate\(|\.delete\(|^class \w+\(/, feat);
  const routes = T.backendRoutes(ctx, uniq(h3.filter((x) => x.path.endsWith('router.py')).map((x) => x.path)));
  const norm = (s) => s.replace(/\{[^}]*\}/g, '{}');
  const hit = routes.filter((r) => want.some((w) => w.meth === r.method && norm(w.r) === norm(r.path)));
  const slices = uniq(hit.map((r) => r.file.split('/')[3]));
  const classTable = {}; let curClass = null; let curPath = null;
  for (const x of h3) {
    if (x.path !== curPath) { curPath = x.path; curClass = null; }
    const c = x.text.match(/^class (\w+)\(/); if (c) curClass = c[1];
    const t = x.text.match(/__tablename__\s*=\s*["'](\w+)["']/); if (t && curClass) classTable[curClass] = t[1];
  }
  const tables = [];
  for (const h of h3) {
    if (!slices.some((s2) => h.path.startsWith('backend/app/features/' + s2 + '/'))) continue;
    if (/__tablename__|^class |^@|APIRouter/.test(h.text)) continue;
    for (const [cls, tb] of Object.entries(classTable)) if (new RegExp('\\b' + cls + '\\b').test(h.text)) tables.push(tb);
    const m = h.text.match(/\.add\((\w+)\)/);
    if (m) { // add(variable): the constructor the variable was bound to, a few lines above (same read)
      const ls = ctx.lines.get(h.path);
      for (let i = h.line - 2; i >= Math.max(0, h.line - 30); i--) { const b2 = ls[i].match(new RegExp('\\b' + m[1] + '\\s*=\\s*(\\w+)\\(')); if (b2) { if (classTable[b2[1]]) tables.push(classTable[b2[1]]); break; } }
    }
  }
  return uniq(tables);
};

// tests reaching F: test files naming F or mocking its module (fake when the line patches/mocks),
// then production callers of F, then tests naming those callers (real).
H.tests_reach = (q, lg) => {
  const ps = pathSym(q.question); const f = short(ps.sym);
  const mods = S.moduleSpellings(ps.path).map((m) => m.re.source);
  const re1 = new RegExp('\\b' + T.esc(f) + '\\b|' + mods.join('|'));
  const h1 = T.grep(ctx, lg, 'grep name + module in tests', re1, (p) => L.isTestPath(p));
  const real = new Set(); const fake = new Set();
  const mockRe = /\b(patch|mock|monkeypatch|AsyncMock|MagicMock|vi\.mock|jest\.mock|mockResolvedValue|mockImplementation|spyOn|setattr)\b|=\s*AsyncMock|\.mock\(/;
  for (const h of h1) {
    const nameHit = new RegExp('\\b' + T.esc(f) + '\\b').test(h.text);
    if (mockRe.test(h.text)) fake.add(h.path);
    else if (nameHit && !/^\s*(import|from)\b/.test(h.text)) real.add(h.path);
  }
  const h2 = T.grep(ctx, lg, 'grep callers in production', new RegExp('\\b' + T.esc(f) + '\\('), (p) => T.isProd(p) && p !== ps.path || (p === ps.path));
  const callers = uniq(h2.filter((h) => !new RegExp('(def|function)\\s+' + T.esc(f) + '\\b').test(h.text)).map((h) => T.encName(ctx, h.path, h.line))).map(short).filter((n) => n && n !== f && n.length > 3);
  if (callers.length) {
    const h3 = T.grep(ctx, lg, 'grep callers in tests', new RegExp('\\b(' + callers.map(T.esc).join('|') + ')\\b'), (p) => L.isTestPath(p));
    for (const h of h3) { if (mockRe.test(h.text)) continue; if (!fake.has(h.path)) real.add(h.path); }
  }
  for (const p of fake) real.delete(p);
  return { real: uniq([...real]), fake: uniq([...fake]) };
};

// invariants constraining F: read the invariants section, read F's definition names, then the
// Offline-engine table rows naming F; match bullets by path, basename, defined symbol or component.
H.invariants_on_file = (q, lg) => {
  const F = firstPath(q.question);
  const md = ctx.lines.get('CLAUDE.md');
  const s0 = md.findIndex((l) => /^## Invariants you must respect/.test(l)); let s1 = md.findIndex((l, i) => i > s0 && /^## /.test(l)); if (s1 < 0) s1 = md.length;
  lg.readCost('read CLAUDE.md invariants section', md.slice(s0, s1).join('\n'));
  const bullets = []; let cur = null;
  for (let i = s0 + 1; i < s1; i++) { if (/^- /.test(md[i])) { cur = { line: i + 1, text: md[i] }; bullets.push(cur); } else if (cur && /^\s+\S|^\s*$/.test(md[i]) && !/^#/.test(md[i])) cur.text += ' ' + md[i]; else if (/^#/.test(md[i])) cur = null; }
  const defs = (ctx.nodes.get(F) || []).map((d) => d.name.replace(/^test:/, '')).filter((n) => !n.includes(' '));
  lg.grepCost('grep definitions in ' + F, (ctx.nodes.get(F) || []).map((d) => ({ path: F, line: d.start, text: d.signature })));
  const base = path.posix.basename(F); const stem = base.replace(/\.[^.]+$/, '');
  const t0 = md.findIndex((l) => /^### Offline engine/.test(l)); let t1 = md.findIndex((l, i) => i > t0 && /^#/.test(l)); if (t1 < 0) t1 = md.length;
  const comps = [];
  if (t0 >= 0) {
    lg.readCost('read Offline engine table', md.slice(t0, t1).join('\n'));
    for (let i = t0; i < t1; i++) { const cells = md[i].split('|').map((c) => c.trim()); if (cells.length > 3 && new RegExp('\\b' + T.esc(stem) + '\\b').test(cells[2])) comps.push(cells[1]); }
  }
  const ids = [];
  for (const b of bullets) {
    const txt = b.text;
    let ok = txt.includes(F) || new RegExp('`[^`]*\\b' + T.esc(base) + '\\b[^`]*`|`[^`]*\\b' + T.esc(F.split('/').slice(-2).join('/')) + '`').test(txt) || new RegExp('`' + T.esc(stem) + '`').test(txt);
    if (!ok) for (const d of defs) { const dn = d.split('.').pop(); if (dn.length >= 5 && new RegExp('`[^`]*\\b' + T.esc(dn) + '\\b[^`]*`').test(txt)) { ok = true; break; } }
    if (!ok) for (const c of comps) { const words = c.toLowerCase().split(/\s+/).filter((w) => w.length > 3); if (words.length && words.every((w) => txt.toLowerCase().includes(w))) { ok = true; break; } }
    if (ok) ids.push('CLAUDE.md:L' + b.line);
  }
  return uniq(ids);
};

// the other half of a rule: grep client production code for the distinctive terms in the question.
H.other_half = (q, lg) => {
  const ps = pathSym(q.question);
  const terms = new Set();
  for (const m of q.question.matchAll(/\b([a-z]+(?:_[a-z0-9]+)+)\b/g)) terms.add(m[1]);
  for (const m of q.question.matchAll(/'([^']{4,60})'/g)) terms.add(m[1].replace(/\bX\b/, '').replace(/[()]/g, '').replace(/[:\s]+$/, '').trim());
  if (ps) for (const t of [...terms]) if (ps.sym.toLowerCase().includes(t.toLowerCase())) terms.delete(t);
  const list = [...terms].filter((t) => t.length >= 4 && !/\.(py|ts|js)/.test(t));
  if (!list.length) return [];
  const re = new RegExp(list.map((t) => T.esc(t)).join('|'), 'i');
  const h = T.grep(ctx, lg, 'grep question terms in client code', re, (p) => T.isClient(p) && T.isProd(p));
  const score = new Map();
  for (const x of h) {
    if (T.commentLines(ctx, x.path).has(x.line)) continue;
    const n = T.encName(ctx, x.path, x.line); if (!n) continue;
    const k = x.path + '::' + n; if (!score.has(k)) score.set(k, new Set());
    for (const t of list) if (new RegExp(T.esc(t), 'i').test(x.text)) score.get(k).add(t);
  }
  const best = Math.max(0, ...[...score.values()].map((s) => s.size));
  return uniq([...score.entries()].filter(([, s]) => s.size === best && best > 0).map(([k]) => k));
};

// readers of a setting: grep the key, its env spelling and its upper-case form in production code;
// drop comments/docstrings and the declaration itself.
// The key and env spelling come from the shared target parser (arms/common/tqtarget.js, pre-flight fix
// round 1): settings.X gives key X; a shop_setting registry key gives its key; a mobile config value
// gives its dotted name; an env or build-time variable alone gives only the env spelling.
H.setting_readers = (q, lg) => {
  const tg = target(q);
  const key = tg.config != null ? tg.config : tg.name != null ? tg.name.replace(/^shop\//, '') : null; const env = tg.env;
  const re = key == null ? new RegExp(T.esc(env))
    : new RegExp('\\b' + T.esc(key) + '\\b' + (env ? '|' + T.esc(env) : '') + '|' + T.esc(key.toUpperCase()));
  const h = T.grep(ctx, lg, 'grep setting spellings in production code', re, T.isProd);
  const out = [];
  for (const x of h) {
    if (T.commentLines(ctx, x.path).has(x.line)) continue;
    const code = T.codePart(x.path, x.text);
    if (!re.test(code)) continue;
    if (key != null && new RegExp('^\\s*' + T.esc(key) + '\\s*:').test(code)) continue; // the Settings field declaration
    const n = T.encName(ctx, x.path, x.line); out.push(x.path + '::' + (n || path.posix.basename(x.path)));
  }
  return uniq(out);
};

// migrations touching a table: one grep for the table name and def upgrade/downgrade in versions/,
// then a read of the hit contexts to drop FK references and docstrings.
H.migrations_touch_table = (q, lg) => {
  const tb = (q.question.match(/touch the table (\w+)/) || [])[1];
  const inV = (p) => p.startsWith('backend/alembic/versions/');
  const re = new RegExp('\\b' + T.esc(tb) + '\\b|^def (upgrade|downgrade)');
  const h = T.grep(ctx, lg, 'grep table + upgrade/downgrade in versions', re, inV);
  const revs = new Set(); const ctxText = [];
  const byFile = new Map(); for (const x of h) { if (!byFile.has(x.path)) byFile.set(x.path, []); byFile.get(x.path).push(x); }
  for (const [p, hs] of byFile) {
    const up = hs.find((x) => /^def upgrade/.test(x.text)); const down = hs.find((x) => /^def downgrade/.test(x.text));
    if (!up) continue; const lo = up.line; const hi = down ? down.line : Infinity;
    const ls = ctx.lines.get(p); const com = T.commentLines(ctx, p);
    for (const x of hs) {
      if (x.line <= lo || x.line >= hi || com.has(x.line)) continue;
      const ctxs = ls.slice(Math.max(0, x.line - 4), x.line + 1).join(' '); ctxText.push(ctxs);
      const code = T.codePart(p, x.text);
      if (!new RegExp('\\b' + T.esc(tb) + '\\b').test(code)) continue;
      const fkOnly = new RegExp('["\']' + T.esc(tb) + '\\.\\w+["\']').test(code) && !new RegExp('["\']' + T.esc(tb) + '["\']').test(code);
      const referent = /referent_table|create_foreign_key/.test(ctxs) && new RegExp('referent_table\\s*=\\s*["\']' + T.esc(tb) + '["\']').test(ctxs);
      if (fkOnly || referent) continue;
      if (/create_foreign_key\(/.test(ctxs)) { const strs = [...ctxs.slice(ctxs.indexOf('create_foreign_key(')).matchAll(/["'](\w+)["']/g)].map((m) => m[1]); if (strs[2] === tb && strs[1] !== tb) continue; }
      const m = path.posix.basename(p).match(/^(\d{4})/); if (m) revs.add(m[1]);
    }
  }
  lg.readCost('read hit contexts', ctxText.join('\n'));
  return uniq([...revs]);
};

// clients of a route: grep client code for the route's tail pattern; ops-console hits go via the BFF.
// The route (or several, "routes GET ... or PUT ...") comes from the shared target parser
// (arms/common/tqtarget.js, pre-flight fix round 1); several routes are answered one by one and merged.
H.route_clients = (q, lg) => {
  const rs = routesOf(target(q)).map((r) => { const i = r.indexOf(' '); return { meth: r.slice(0, i), route: r.slice(i + 1) }; });
  if (rs.length === 1) return routeClients(rs[0].meth, rs[0].route, lg);
  const parts = rs.map((r) => routeClients(r.meth, r.route, lg));
  const call = new Set(parts.flatMap((x) => x.call_sites));
  const direct = uniq(parts.flatMap((x) => x.direct_callers)).filter((k) => !call.has(k));
  return { call_sites: uniq([...call]), via_bff: uniq(parts.flatMap((x) => x.via_bff)), direct_callers: direct };
};
function routeClients(meth, route, lg) {
  const rp = S.routePattern(route);
  let h = T.grep(ctx, lg, 'grep route in client code', rp.re, (p) => T.isClient(p) && T.isProd(p));
  if (!h.length) { // nothing: broaden to the last literal segment, as a person would
    const lit = rp.literals[rp.literals.length - 1];
    h = T.grep(ctx, lg, 'grep last route segment in client code', new RegExp('/' + T.esc(lit) + '(?=["\'`?/])'), (p) => T.isClient(p) && T.isProd(p));
  }
  const call = new Set(); const bff = new Set();
  for (const x of h) {
    if (T.commentLines(ctx, x.path).has(x.line)) continue;
    const ls = ctx.lines.get(x.path); const mm = T.methodAt(ls, x.line - 1);
    if (mm !== meth && !(x.path === 'ops-server.mjs')) continue;
    if (!rp.literals.every((s) => x.text.includes(s)) && !x.text.includes('/api/')) continue;
    const n = T.encName(ctx, x.path, x.line); if (!n) continue;
    const k = x.path + '::' + n;
    if (x.path === 'ops-server.mjs') call.add(k); else if (/^src\/(ops|features\/ops)\//.test(x.path)) bff.add(k); else call.add(k);
  }
  const names = uniq([...call].map((k) => short(k.split('::')[1])));
  const callers = new Set();
  if (names.length) {
    const h2 = T.grep(ctx, lg, 'grep call-site names in production', new RegExp('\\b(' + names.map(T.esc).join('|') + ')\\s*\\('), (p) => T.isClient(p) && T.isProd(p));
    for (const x of h2) {
      if (T.commentLines(ctx, x.path).has(x.line)) continue;
      if (/\b(function|def|const|let|var)\s+\w+\s*[=(]|^\s*(async\s+)?\w+\s*\([^)]*\)\s*\{/.test(x.text) && names.some((n) => new RegExp('(function|def|const|let|var)\\s+' + n + '\\b|^\\s*(async\\s+)?' + n + '\\s*\\(').test(x.text))) continue;
      const n = T.encName(ctx, x.path, x.line); if (n) callers.add(x.path + '::' + n);
    }
  }
  for (const k of call) callers.delete(k);
  return { call_sites: uniq([...call]), via_bff: uniq([...bff]), direct_callers: uniq([...callers]) };
};

// change reach: callers of F in the backend (two hops), the routes/jobs/scripts among them, then
// the client functions that send those routes.
H.change_reach = (q, lg) => {
  const ps = pathSym(q.question); const f = short(ps.sym);
  const isBack = (p) => p.startsWith('backend/') && T.isProd(p) && !p.includes('/alembic/');
  const enc = (x) => T.encName(ctx, x.path, x.line);
  const defRe = (n) => new RegExp('(def|class)\\s+' + T.esc(n) + '\\b');
  const h1 = T.grep(ctx, lg, 'grep callers of ' + f, new RegExp('\\b' + T.esc(f) + '\\b'), isBack).filter((x) => !defRe(f).test(x.text) && !T.commentLines(ctx, x.path).has(x.line));
  const hop1 = uniq(h1.map((x) => x.path + '::' + (enc(x) || '')));
  const names = uniq(hop1.map((k) => short(k.split('::')[1])).filter((n) => n && n !== f && n.length > 3));
  let hop2 = [];
  if (names.length) {
    const h2 = T.grep(ctx, lg, 'grep callers of callers', new RegExp('\\b(' + names.map(T.esc).join('|') + ')\\b'), isBack).filter((x) => !names.some((n) => defRe(n).test(x.text)) && !T.commentLines(ctx, x.path).has(x.line));
    hop2 = uniq(h2.map((x) => x.path + '::' + (enc(x) || '')));
  }
  const reach = new Set([...hop1, ...hop2]);
  const routes = T.backendRoutes(ctx, uniq([...reach].map((k) => k.split('::')[0]).filter((p) => p.endsWith('router.py'))));
  const backend = new Set();
  for (const r of routes) if (r.fn && [...reach].some((k) => k === r.file + '::' + r.fn)) backend.add(r.method + ' ' + r.path);
  for (const k of reach) { const [p, n] = k.split('::'); if (p.startsWith('backend/scripts/')) backend.add('script:' + p); if (p === 'backend/app/main.py' && n) backend.add('scheduler:' + n); }
  const web = new Set(); const mobile = new Set();
  const rps = [...backend].filter((b) => b.startsWith('/') || /^[A-Z]+ \//.test(b)).map((b) => ({ meth: b.split(' ')[0], rp: S.routePattern(b.split(' ')[1]) })).filter((x) => x.rp);
  if (rps.length) {
    const h3 = T.grep(ctx, lg, 'grep those routes in clients', new RegExp(rps.map((x) => x.rp.re.source).join('|')), (p) => T.isClient(p) && T.isProd(p));
    for (const x of h3) {
      const ls = ctx.lines.get(x.path); const mm = T.methodAt(ls, x.line - 1);
      if (!rps.some((r) => r.meth === mm && r.rp.re.test(x.text))) continue;
      const n = enc(x); if (!n) continue;
      if (x.path.startsWith('technician-app/')) mobile.add(x.path + '::' + n); else web.add(x.path + '::' + n);
    }
  }
  return { backend: uniq([...backend]), web: uniq([...web]), mobile: uniq([...mobile]) };
};

// The common TQ format (SPEC.md 12): {answer, tokens, lookups}. tokens = everything the searches
// returned to the reader (the ledger: grep lines as `path:line:text`, reads, lists), which is what a
// session pays to reach the answer; lookups = the greps and reads issued. An unknown kind throws (the
// harness records the error and an empty answer).
function answerTq(c, q) {
  ctx = c;
  if (!H[q.kind]) throw new Error('no search script for question kind ' + q.kind);
  const lg = new Ledger();
  const answer = H[q.kind](q, lg);
  return { answer, tokens: lg.tokens, lookups: lg.n };
}

module.exports = { answerTq, KINDS: Object.keys(H) };
