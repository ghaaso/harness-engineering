// Folds the condense-and-verify workflow result into the data files build.cjs reads.
// Usage: node apply.cjs <workflow-output.json>
// Writes data/catalogue.json, data/register.json, data/glossary.json and data/apply-report.md.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const GATE = path.join(DATA, 'gate');
const rd = f => fs.readFileSync(f, 'utf8');
const out = JSON.parse(rd(process.argv[2])).result;
const meta = JSON.parse(rd(path.join(DATA, 'themes-meta.json')));
const overrides = Object.assign({ ideas: {}, moves: {}, set: {}, fixRe: [], register: {}, glossary: {}, dropIdeas: [], dropTerms: [], addTerms: [] }, fs.existsSync(path.join(DATA, 'overrides.json')) ? JSON.parse(rd(path.join(DATA, 'overrides.json'))) : {});
const FIX = overrides.fixRe.map(([a, b]) => [new RegExp(a, 'g'), b]);
const fixText = s0 => { let s1 = String(s0 == null ? '' : s0); FIX.forEach(([re, b]) => { s1 = s1.replace(re, b); }); return s1; };
const wpNum = w => { const m = String(w || '').match(/^WP(\d+)([a-z]?)$/); return m ? Number(m[1]) * 10 + (m[2] ? m[2].charCodeAt(0) - 96 : 0) : 999; };
// Knowledge-store decisions are D1..D22 in their own design. Harness v2 also has a D17 (hooks), so a
// harness reference written as "harness decision D17" is left alone.
const KSFIX = s0 => String(s0 || '').replace(/(?<![\w-])(?<!harness decision )D(\d+b?)\b/g, 'KS-D$1');
const report = [];
const say = s => report.push(s);

// Register ids, families and aliases.
const idTable = {};
rd(path.join(GATE, 'register-ids.md')).split('\n').forEach(l => {
  const m = l.match(/^\| ([A-Z0-9][A-Z0-9-]+) \| ([a-z-]+) \| (.+?) \|$/);
  if (m) idTable[m[1]] = { family: m[2], name: m[3] };
});
// Records added after the first build (data/added.json): ideas said only in chat, and the bottlenecks they answer.
// They keep fixed ids and are appended, so no earlier id ever shifts.
const added = fs.existsSync(path.join(DATA, 'added.json')) ? JSON.parse(rd(path.join(DATA, 'added.json'))) : {};
(added.fixRe || []).forEach(([x, y]) => FIX.push([new RegExp(x, 'g'), y]));   // text rules for facts that changed after the first build
(added.register || []).forEach(r => { if (idTable[r.id]) say(`- added register ${r.id}: id already used`); else idTable[r.id] = { family: r.family, name: r.name, added: true }; });
const alias = JSON.parse(rd(path.join(GATE, 'register-alias.json')));
const aliasMap = Array.isArray(alias) ? Object.fromEntries(alias.map(a => [a.raw || a[0], a.id || a[1]])) : (alias.map || alias);
function normIds(list, where) {
  const outIds = [];
  (list || []).forEach(x => {
    const s = String(x).trim().replace(/[.;]$/, '');
    if (!s) return;
    let id = idTable[s] ? s : (aliasMap[s] && idTable[aliasMap[s]] ? aliasMap[s] : null);
    if (!id) { say(`- invalid bottleneck id \`${s}\` in ${where}`); return; }
    if (!outIds.includes(id)) outIds.push(id);
  });
  return outIds;
}

// ---- Ideas ----
const MAT = { in_use: 5, measured: 4, tested: 4, trialled: 4, built: 3, designed: 2, adopt: 2, idea: 1, trial: 1, deferred: 1, rejected: 0, superseded: 0 };
const ideasByTheme = {};
let nChecked = 0, nCorr = 0;
(out.ideaRes || []).forEach(r => {
  if (!r) return;
  if (!r.condensed) { say(`- chunk ${r.chunk}: NO condensed result`); return; }
  const byK = {};
  r.condensed.ideas.forEach(x => { byK[x.k] = Object.assign({}, x, { theme: r.theme }); });
  const missing = r.keys.filter(k => !byK[k]);
  if (missing.length) say(`- chunk ${r.chunk}: keys with no entry: ${missing.join(', ')}`);
  const extra = Object.keys(byK).filter(k => !r.keys.includes(k));
  if (extra.length) say(`- chunk ${r.chunk}: entries for unknown keys: ${extra.join(', ')}`);
  if (!r.check) say(`- chunk ${r.chunk}: NO check result (entries unchecked)`);
  else {
    nChecked += r.check.ok + r.check.corrected; nCorr += r.check.corrected;
    r.check.corrections.forEach(c => {
      const e = byK[c.k]; if (!e) { say(`- chunk ${r.chunk}: correction for unknown key ${c.k}`); return; }
      if (c.field === 'maturity') e.maturity = Number(c.value);
      else if (c.field === 'bottlenecks') e.bottlenecks = c.value ? c.value.split(/\s*[,;]\s*|\s+/).filter(Boolean) : [];
      else e[c.field] = c.value;
      e.corrected = (e.corrected || []).concat(c.field);
    });
    r.check.splits.forEach((s, i) => {
      const k = `${s.from_k}~s${i + 1}`;
      byK[k] = Object.assign({}, s, { k, theme: r.theme, flag: 'split: ' + s.reason });
      say(`- split in ${r.chunk}: ${k} "${s.name}" (${s.reason})`);
    });
    if (r.check.notes) say(`- checker note ${r.chunk}: ${r.check.notes.replace(/\s+/g, ' ').slice(0, 600)}`);
  }
  if (r.condensed.notes) say(`- condenser note ${r.chunk}: ${r.condensed.notes.replace(/\s+/g, ' ').slice(0, 400)}`);
  Object.values(byK).forEach(e => {
    if ((overrides.dropIdeas || []).includes(e.k)) { say(`- dropped ${e.k} ${e.name}`); return; }
    Object.assign(e, (overrides.ideas || {})[e.k] || {});
    if (overrides.moves[e.k]) e.wp = overrides.moves[e.k];
    const st = overrides.set[e.k] || {};
    Object.keys(st).forEach(f => { if (f.endsWith('_re')) { const fld = f.slice(0, -3); st[f].forEach(([a, b]) => { e[fld] = String(e[fld]).replace(new RegExp(a), b); }); } else e[f] = st[f]; });
    ['name', 'how', 'problem', 'stands', 'next', 'origin'].forEach(f => { e[f] = fixText(e[f]); });
    if (/Knowledge-store design/.test(e.origin || '') && !/Harness v2/.test(e.origin || '')) ['name', 'how', 'problem', 'stands', 'next'].forEach(f => { e[f] = KSFIX(e[f]); });
    const th = e.themeOverride || e.theme;
    (ideasByTheme[th] = ideasByTheme[th] || []).push(e);
  });
});

const LIM = { name: 8, how: 24, problem: 26, stands: 32, next: 20, origin: 10 };
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const themes = meta.order.map(id => {
  const m = meta.themes[id];
  const list = (ideasByTheme[id] || []).map((e, i) => Object.assign(e, { _o: i }));
  list.forEach(e => {
    if (typeof e.maturity !== 'number' || e.maturity < 0 || e.maturity > 5) { say(`- ${e.k}: bad maturity ${e.maturity}; set from status ${e.status}`); e.maturity = MAT[e.status] ?? 1; }
    if (MAT[e.status] !== undefined && e.maturity > MAT[e.status]) say(`- ${e.k}: maturity ${e.maturity} above its status ${e.status}`);
    e.bottlenecks = normIds(e.bottlenecks, e.k);
    e.families = [...new Set(e.bottlenecks.map(b => idTable[b].family))];
    Object.keys(LIM).forEach(f => { if (words(e[f]) > LIM[f] + 4) say(`- ${e.k}: ${f} is ${words(e[f])} words (limit ${LIM[f]})`); });
    ['name', 'how', 'problem', 'stands', 'next'].forEach(f => { if (/\b(the owner|owner's|owner’s)\b/i.test(e[f] || '')) say(`- ${e.k}: "owner" in ${f}: ${e[f]}`); });
    ['how', 'problem', 'stands', 'next'].forEach(f => { if (/\b(G[1-4]-F\d+|A\d-\d+|horthy[AB]-\d+|[a-z]+#\d+)\b/.test(e[f] || '')) say(`- ${e.k}: raw id in ${f}: ${e[f]}`); });
    if (e.flag) say(`- flag ${e.k} (${e.name}): ${e.flag}`);
  });
  list.sort((a, b) => (b.maturity - a.maturity) || (wpNum(a.wp) - wpNum(b.wp)) || (a._o - b._o));
  const ideas = list.map((e, i) => ({
    id: `${m.code}-${String(i + 1).padStart(2, '0')}`, k: e.k, name: e.name, how: e.how, problem: e.problem, stands: e.stands, next: e.next,
    origin: e.origin, status: e.status, maturity: e.maturity, bottlenecks: e.bottlenecks, families: e.families, wp: e.wp,
  }));
  const wpCount = {};
  ideas.forEach(i => { wpCount[i.wp] = (wpCount[i.wp] || 0) + 1; });
  const packages = Object.keys(wpCount).filter(w => wpCount[w] >= 2 || Object.keys(wpCount).length <= 2).sort((a, b) => wpNum(a) - wpNum(b));
  return { id, code: m.code, title: m.title, short: m.short, covers: m.covers, intro: m.intro, packages, ideas };
});
(added.ideas || []).forEach(a => {
  const t = themes.find(x => x.code === a.theme);
  if (!t) { say(`- added idea ${a.id}: no theme ${a.theme}`); return; }
  if (t.ideas.some(i => i.id === a.id)) { say(`- added idea ${a.id}: id already used`); return; }
  if (!new RegExp('^' + t.code + '-\\d+$').test(a.id)) { say(`- added idea ${a.id}: id does not fit theme ${t.code}`); return; }
  const bn = normIds(a.bottlenecks, a.id);
  Object.keys(LIM).forEach(f => { if (words(a[f]) > LIM[f] + 4) say(`- ${a.id}: ${f} is ${words(a[f])} words (limit ${LIM[f]})`); });
  t.ideas.push({ id: a.id, k: a.k, name: a.name, how: a.how, problem: a.problem, stands: a.stands, next: a.next, origin: a.origin, status: a.status, maturity: a.maturity,
    bottlenecks: bn, families: [...new Set(bn.map(b => idTable[b].family))], wp: a.wp, added: a.added || true });
  if (a.wp && !t.packages.includes(a.wp)) { t.packages.push(a.wp); t.packages.sort((x, y) => wpNum(x) - wpNum(y)); }
  say(`- added idea ${a.id} "${a.name}" (${a.added || 'added'})`);
});
const cat = JSON.parse(fs.existsSync(path.join(DATA, 'catalogue-extra.json')) ? rd(path.join(DATA, 'catalogue-extra.json')) : '{}');
fs.writeFileSync(path.join(DATA, 'catalogue.json'), JSON.stringify(Object.assign({ themes }, cat), null, 1));
const nIdeas = themes.reduce((a, t) => a + t.ideas.length, 0);
say(`\nIdeas: ${nIdeas} in ${themes.length} themes; checked ${nChecked}, corrected ${nCorr}. Per theme: ${themes.map(t => `${t.code} ${t.ideas.length}`).join(', ')}`);
const mat = [0, 0, 0, 0, 0, 0]; themes.forEach(t => t.ideas.forEach(i => { mat[i.maturity]++; }));
say(`Maturity 0..5: ${mat.join(' / ')}`);
const wpAll = {}; themes.forEach(t => t.ideas.forEach(i => { wpAll[i.wp] = (wpAll[i.wp] || 0) + 1; }));
say(`Ideas per package: ${Object.keys(wpAll).sort((a, b) => wpNum(a) - wpNum(b)).map(w => `${w} ${wpAll[w]}`).join(', ')}`);

// ---- Register ----
const CLINIC = { B01: ['trial', 3], B02: ['build', 4], B03: ['decide', 1], B04: ['trial', 3], B05: ['diagnose', 1], B06: ['decide', 2], B07: ['build', 2], B08: ['diagnose', 2], B09: ['diagnose', 2], B10: ['decide', 1], B11: ['decide', 1], B12: ['trial', 3], B13: ['build', 3], B14: ['build', 2], B15: ['decide', 2], B16: ['build', 3], B17: ['trial', 3], B18: ['decide', 2], B19: ['decide', 4], B20: ['build', 4], B21: ['build', 3] };
const recs = [];
(out.register || []).forEach((p, i) => { if (!p) say(`- register part ${i}: NO result`); else { p.records.forEach(r => recs.push(r)); if (p.notes) say(`- register note ${i}: ${p.notes.replace(/\s+/g, ' ').slice(0, 600)}`); } });
(added.register || []).forEach(r => { recs.push(Object.assign({ verified: 'yes' }, r)); say(`- added register ${r.id} "${r.name}"`); });
const famOrder = meta.families.map(f => f.id);
const seen = new Set();
const bns = [];
recs.forEach(r => {
  if (seen.has(r.id)) { say(`- register: duplicate ${r.id}`); return; }
  seen.add(r.id);
  if (!idTable[r.id]) { say(`- register: unknown id ${r.id}`); return; }
  Object.assign(r, (overrides.register || {})[r.id] || {});
  ['name', 'what', 'evidence', 'potential', 'first_step', 'state_note'].forEach(f => { r[f] = fixText(r[f]); if (r.id.startsWith('LIB-KS-')) r[f] = KSFIX(r[f]); });
  if (r.verified !== 'yes') say(`- register ${r.id} verified=${r.verified}: ${r.verified_note}`);
  ['name', 'what', 'evidence', 'potential', 'first_step'].forEach(f => { if (/\b(the owner|owner's|owner’s)\b/i.test(r[f] || '')) say(`- register ${r.id}: "owner" in ${f}: ${r[f]}`); });
  const cls = CLINIC[r.id] ? CLINIC[r.id][0] : (r.cls || '').toLowerCase();
  const sk = r.state_key || 'open';
  bns.push({ id: r.id, name: r.name, family: idTable[r.id].family, what: r.what, evidence: r.evidence, potential: r.potential, first_step: r.first_step,
    stateKey: sk, state: sk.charAt(0).toUpperCase() + sk.slice(1) + (r.state_note ? `: ${r.state_note}` : '.'), cls: cls ? cls.charAt(0).toUpperCase() + cls.slice(1) : '', wp: r.wp, verified: r.verified });
});
Object.keys(idTable).filter(id => !seen.has(id)).forEach(id => say(`- register: no record for ${id}`));
const idx = id => Object.keys(idTable).indexOf(id);
bns.sort((a, b) => (famOrder.indexOf(a.family) - famOrder.indexOf(b.family)) || (idx(a.id) - idx(b.id)));
const clinic21 = Object.keys(CLINIC).map(id => ({ id, name: (bns.find(b => b.id === id) || {}).name || idTable[id].name, phase: CLINIC[id][1], cls: CLINIC[id][0] }));
const regExtra = fs.existsSync(path.join(DATA, 'register-extra.json')) ? JSON.parse(rd(path.join(DATA, 'register-extra.json'))) : {};
fs.writeFileSync(path.join(DATA, 'register.json'), JSON.stringify(Object.assign({ families: meta.families, bottlenecks: bns, clinic21 }, regExtra), null, 1));
const st = { open: 0, 'partly closed': 0, closed: 0 }; bns.forEach(b => { st[b.stateKey] = (st[b.stateKey] || 0) + 1; });
say(`\nRegister: ${bns.length} records; states ${JSON.stringify(st)}`);

// ---- Glossary ----
const terms = [];
(out.glossary || []).forEach((p, i) => {
  if (!p) { say(`- glossary part ${i + 1}: NO result`); return; }
  p.terms.forEach(t => { if (t.keep) terms.push({ key: `g${i + 1}-${t.n}`, term: t.term, definition: t.definition, origin: t.origin, category: t.category }); else say(`- glossary drop g${i + 1}-${t.n} ${t.term}: ${t.note}`); });
  if (p.notes) say(`- glossary note ${i + 1}: ${p.notes.replace(/\s+/g, ' ').slice(0, 400)}`);
});
if (out.missing) {
  out.missing.added.forEach((t, i) => terms.push({ key: `add-${i + 1}`, term: t.term, definition: t.definition, origin: t.origin, category: t.category }));
  say(`- glossary: ${out.missing.added.length} terms added; merge pairs: ${out.missing.merge_pairs.join(' | ')}`);
}
(overrides.addTerms || []).forEach(t => terms.push(t));
(added.terms || []).forEach(t => terms.push(t));
const dropT = new Set(overrides.dropTerms || []);
const gl = terms.filter(t => !dropT.has(t.key) && !dropT.has(t.term)).map(t => Object.assign(t, (overrides.glossary || {})[t.key] || (overrides.glossary || {})[t.term] || {})).map(t => Object.assign(t, { term: fixText(t.term), definition: fixText(t.definition), origin: fixText(t.origin) }));
const byTerm = {};
gl.forEach(t => { const k = t.term.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); (byTerm[k] = byTerm[k] || []).push(t.key); });
Object.entries(byTerm).filter(([, v]) => v.length > 1).forEach(([k, v]) => say(`- glossary duplicate "${k}": ${v.join(', ')}`));
fs.writeFileSync(path.join(DATA, 'glossary.json'), JSON.stringify({ terms: gl }, null, 1));
say(`\nGlossary: ${gl.length} terms`);

fs.writeFileSync(path.join(DATA, 'apply-report.md'), '# Apply report\n\n' + report.join('\n') + '\n');
console.log(report.filter(l => l.startsWith('\n') || /^(Ideas|Maturity|Register|Glossary|Ideas per)/.test(l)).join('\n'));
console.log('report lines', report.length);
