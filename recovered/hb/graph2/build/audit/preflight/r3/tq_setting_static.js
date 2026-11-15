'use strict';
// Re-audit 3, check 7 (static, no arm run): the setting_readers translation. For every setting_readers
// question (TUNE, held-out), from the frozen commit's raw facts, the answer each typed query would give,
// computed by its stated semantics:
//   SQL (relational, duckpgq): one row per evidence row; a definition-kind source gives path::sym; else the
//     innermost enclosing function/method/constant of THAT evidence line (ORDER BY ls DESC LIMIT 1; a tie
//     of two definitions with the same start line is unspecified and is counted), else path::NAME; DISTINCT.
//   LadybugDB (arms/ladybug/tq.js lines 138-144): the same per evidence line, but the second WITH groups by
//     (source kind, path, sid, setting name, evidence path) WITHOUT the line and takes min(label) over the
//     non-null enclosing labels; the path::NAME fallback only when every line of that group has none.
// Reports, per question, whether the two answer sets differ, and where.
// usage: node tq_setting_static.js <build> <out.json>
const fs = require('fs'); const path = require('path');
const B = process.argv[2];
const FROZEN = 'a31924a3818f4ac94b695906d107c72c912792b2';
const { target } = require(path.join(B, 'arms', 'common', 'tqtarget.js'));
const rdj = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const qs = rdj(path.join(B, 'tasks', 'tq_questions.jsonl')).filter((q) => q.kind === 'setting_readers');
const N = rdj(path.join(B, 'facts', 'cache', FROZEN, 'nodes.jsonl'));
const E = rdj(path.join(B, 'facts', 'cache', FROZEN, 'edges.jsonl'));
const byId = new Map(); for (const n of N) if (!byId.has(n.id)) byId.set(n.id, n);
const SDEF = new Set(['function', 'method', 'component', 'class', 'constant']);
const ENC = new Set(['function', 'method', 'constant']);
const suf = (sid) => (sid.includes('#') ? sid.slice(sid.indexOf('#') + 1) : sid);
const defsByPath = new Map();
for (const n of byId.values()) if (ENC.has(n.kind) && n.path) { if (!defsByPath.has(n.path)) defsByPath.set(n.path, []); defsByPath.get(n.path).push(n); }
function settingNodes(tg) {
  return [...byId.values()].filter((n) => (tg.name != null && n.id === 'setting:' + tg.name) || (tg.env != null && n.id === 'setting:env/' + tg.env) || (tg.config != null && n.name === tg.config && /^setting/.test(n.id)));
}
const out = { questions: [] };
for (const q of qs) {
  let tg; try { tg = target(q); } catch (e) { out.questions.push({ id: q.id, split: q.split, error: e.message }); continue; }
  const st = new Set(settingNodes(tg).map((n) => n.id));
  const sql = new Set(); const groups = new Map(); let ties = 0; const tieDetail = [];
  const seenEv = new Set();
  for (const e of E) {
    if (e.kind !== 'reads_setting' || !st.has(e.dst)) continue;
    const s = byId.get(e.src); if (!s || s.is_test) continue;
    const k = e.src + '|' + e.dst + '|' + e.evidence_path + '|' + e.evidence_line; if (seenEv.has(k)) continue; seenEv.add(k);
    const sn = byId.get(e.dst).name;
    if (SDEF.has(s.kind)) { const l = s.path + '::' + suf(s.id); sql.add(l); const g = 'D|' + s.id; groups.set(g, { def: l }); continue; }
    const cands = (defsByPath.get(e.evidence_path) || []).filter((f) => e.evidence_line >= f.line_start && e.evidence_line <= f.line_end);
    let lab = null;
    if (cands.length) {
      const mx = Math.max(...cands.map((f) => f.line_start));
      const top = cands.filter((f) => f.line_start === mx).map((f) => f.path + '::' + suf(f.id)).sort();
      if (top.length > 1) { ties++; tieDetail.push({ ev: e.evidence_path + ':' + e.evidence_line, labels: top }); }
      lab = top[0];
    }
    sql.add(lab != null ? lab : e.evidence_path + '::' + sn);
    const g = [s.kind, s.path, s.id, sn, e.evidence_path].join('|');
    if (!groups.has(g)) groups.set(g, { encs: [], fallback: e.evidence_path + '::' + sn });
    groups.get(g).encs.push(lab);
  }
  const lb = new Set();
  for (const g of groups.values()) {
    if (g.def) { lb.add(g.def); continue; }
    const nn = g.encs.filter((x) => x != null).sort();
    lb.add(nn.length ? nn[0] : g.fallback);
  }
  const A = [...sql].sort(); const L = [...lb].sort();
  const same = JSON.stringify(A) === JSON.stringify(L);
  out.questions.push({ id: q.id, split: q.split, target: tg, setting_nodes: [...st], evidence_rows: seenEv.size, sql_answer: A, ladybug_answer: L, identical: same, only_sql: A.filter((x) => !lb.has(x)), only_ladybug: L.filter((x) => !sql.has(x)), enclosing_ties: ties, tie_detail: tieDetail });
}
out.summary = {
  tune: out.questions.filter((x) => x.split === 'tune').map((x) => x.id + (x.identical ? ' same' : ' DIFFERENT') + (x.enclosing_ties ? ' ties' + x.enclosing_ties : '')),
  held_out: out.questions.filter((x) => x.split !== 'tune').map((x) => x.id + (x.identical ? ' same' : ' DIFFERENT') + (x.enclosing_ties ? ' ties' + x.enclosing_ties : '')),
};
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary));
for (const x of out.questions.filter((y) => !y.identical)) console.log(x.id, x.split, 'only_sql', JSON.stringify(x.only_sql), 'only_ladybug', JSON.stringify(x.only_ladybug));
