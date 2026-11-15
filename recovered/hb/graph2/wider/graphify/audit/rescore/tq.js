'use strict';
// G-6 re-score, written from the matching rule stated in RESULT.md section 5 (not from tq_g.js).
const fs = require('fs'); const path = require('path'); const L = require('./lib');
const refs = L.readJsonl(path.join(L.BUILD, 'sealed/tq_reference.jsonl')).filter((r) => r.split !== 'tune');
const facts = L.readJsonl(path.join(L.BUILD, 'facts/cache/a31924a3818f4ac94b695906d107c72c912792b2/nodes.jsonl'));
const TABLES = [...new Set(facts.filter((n) => n.kind === 'table').map((n) => n.name))];
const ROUTES = [...new Set(facts.filter((n) => n.kind === 'route').map((n) => n.name.split(' ').slice(1).join(' ')))];
const UNTOUCHED_OUT = new Set([24, 25, 27, 33, 40, 41, 46, 47]);
const PATHCH = /[A-Za-z0-9_.\/@\-]/;
function wholePath(text, p) { let i = text.indexOf(p); while (i >= 0) { const a = text[i - 1] || ''; const b = text[i + p.length] || ''; if (!(a && PATHCH.test(a)) && !(b && PATHCH.test(b))) return true; i = text.indexOf(p, i + 1); } return false; }
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function formOf(item) {
  if (/^\d{4}$/.test(item)) return 'migration';
  if (/^(GET|POST|PUT|PATCH|DELETE) \//.test(item)) return 'route';
  if (/\.md:L\d+$/.test(item)) return 'docline';
  if (item.includes('::')) return 'def';
  if (/\//.test(item) && /\.[a-z]+$/i.test(item)) return 'file';
  return 'table';
}
function found(text, lines, item, strictDef = true) {
  switch (formOf(item)) {
    case 'migration': return new RegExp('alembic/versions/' + item + '_').test(text);
    case 'route': return text.includes(item.split(' ').slice(1).join(' '));
    case 'docline': { const [doc, ln] = item.split(':'); return lines.some((l) => l.includes(doc) && new RegExp('\\b' + ln + '\\b').test(l)); }
    case 'def': { const [p, name] = item.split('::'); const last = name.split('.').pop(); if (!strictDef) return wholePath(text, p); return lines.some((l) => wholePath(l, p) && new RegExp('(^|[^A-Za-z0-9_])' + esc(last) + '([^A-Za-z0-9_]|$)').test(l)); }
    case 'file': return wholePath(text, item);
    default: return new RegExp('(^|[^A-Za-z0-9_])' + esc(item) + '([^A-Za-z0-9_]|$)').test(text);
  }
}
const FORM_BY_KIND = { screen_tables: ['table'], tests_reach: ['file'], invariants_on_file: ['docline'], other_half: ['def'], setting_readers: ['def'], migrations_touch_table: ['migration'], route_clients: ['def'], change_reach: ['route', 'def'] };
function candidates(text, lines, forms) {
  const c = new Set();
  for (const f of forms) {
    if (f === 'file') for (const m of text.matchAll(/src=(\S+)/g)) c.add('F' + m[1]);
    if (f === 'def') for (const l of lines) { const m = l.match(/^NODE (.+?) \[src=(\S+)/); if (m && path.basename(m[2]) !== m[1] && !/^[A-Z][^()]*[a-z]\s/.test(m[1])) c.add('D' + m[1] + '@' + m[2]); }
    if (f === 'migration') for (const m of text.matchAll(/alembic\/versions\/(\d{4})_/g)) c.add('M' + m[1]);
    if (f === 'table') for (const t of TABLES) if (new RegExp('(^|[^A-Za-z0-9_])' + esc(t) + '([^A-Za-z0-9_]|$)').test(text)) c.add('T' + t);
    if (f === 'route') for (const r of ROUTES) if (text.includes(r)) c.add('R' + r);
    if (f === 'docline') for (const m of text.matchAll(/(\S+\.md):?\s*L(\d+)/g)) c.add('L' + m[1] + m[2]);
  }
  return c.size;
}
function itemsOf(ans) { if (Array.isArray(ans)) return ans; const o = []; for (const k of Object.keys(ans || {})) for (const x of ans[k] || []) o.push(x); return [...new Set(o)]; }
function scoreG(text, ref, strictDef) {
  const lines = text.split('\n'); const items = itemsOf(ref.answer); const al = ref.accept_aliases || {};
  const nA = candidates(text, lines, FORM_BY_KIND[ref.kind] || [...new Set(items.map(formOf))]);
  if (!items.length) return nA === 0 ? { r: 1, p: 1, f1: 1, nA } : { r: 1, p: 0, f1: 0, nA };
  const tp = items.filter((it) => [it, ...(al[it] || [])].some((x) => found(text, lines, x, strictDef))).length;
  const r = tp / items.length; const p = nA ? Math.min(tp, nA) / nA : 0; const f1 = p + r ? 2 * p * r / (p + r) : 0;
  return { r, p, f1, nA, tp, nR: items.length };
}
const out = {};
for (const v of ['default', 'b8000']) {
  const ans = new Map(L.readJsonl(path.join(L.G, 'answers/heldout/tq', 'graphify.held_out.' + v + '.jsonl')).map((x) => [x.id, x]));
  for (const strict of [true, false]) {
    const per = refs.map((ref) => ({ id: ref.id, kind: ref.kind, ...scoreG(ans.get(ref.id).text, ref, strict), tokens: ans.get(ref.id).tokens }));
    const blk = (qs) => ({ n: qs.length, recall: L.r4(L.mean(qs.map((x) => x.r))), precision: L.r4(L.mean(qs.map((x) => x.p))), f1: L.r4(L.mean(qs.map((x) => x.f1))), med_tokens: L.median(qs.map((x) => x.tokens)), med_candidates: L.median(qs.map((x) => x.nA)) });
    const kinds = {}; for (const k of new Set(per.map((x) => x.kind))) kinds[k] = blk(per.filter((x) => x.kind === k)).f1;
    out[v + (strict ? '' : '_pathonly')] = { all30: blk(per), untouched22: blk(per.filter((x) => !UNTOUCHED_OUT.has(x.id))), kinds, per };
  }
}
fs.writeFileSync(path.join(__dirname, 'out/tq.json'), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, JSON.stringify(v.all30), JSON.stringify(v.untouched22), JSON.stringify(v.kinds));
const gt = JSON.parse(fs.readFileSync(path.join(L.G, 'grader/heldout/tq_g.json'), 'utf8'));
console.log('GRADER', JSON.stringify(gt).slice(0, 1800));
