'use strict';
// Mechanical checks of the held-out answer files, without any reference answer (no sealed/, no audit/):
// counts and ids per set, token budgets (verify2 rules), removed documents in T3/T4 answers (whole paths),
// typed arms against the reference arm (equiv.js on the packed head items, plus strict identity), packed
// identity across the three typed arms, TQ comparisons and errors/empties, and INVENTORY.json.
// usage: node check.js            writes tmp/runner/check.json and results/heldout/INVENTORY.json
const fs = require('fs'); const path = require('path'); const zlib = require('zlib'); const crypto = require('crypto');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const H = require(path.join(B, 'arms/common/harness'));
const { countTokens } = require(path.join(B, 'arms/common/tokenizer'));
const E = require(path.join(B, 'arms/common/equiv'));
const plan = JSON.parse(fs.readFileSync(path.join(B, 'results/frozen/PLAN.json'), 'utf8'));
const prog = fs.existsSync(path.join(B, 'tmp/runner/progress.json')) ? JSON.parse(fs.readFileSync(path.join(B, 'tmp/runner/progress.json'), 'utf8')) : { entries: {} };
const tasks = fs.readFileSync(path.join(B, 'tasks/tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((t) => t.split !== 'tune');
const bySet = {}; for (const t of tasks) (bySet[t.set] = bySet[t.set] || new Map()).set(t.id, t);
const qids = fs.readFileSync(path.join(B, 'tasks/tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split !== 'tune').map((q) => q.id);
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const out = { at: new Date().toISOString(), sets: [], problems: [], removed: [], equivalence: [], typed_identity: [], tq: {}, wall_per_arm_s: {} };
const prob = (m) => out.problems.push(m);
const content = (a) => JSON.stringify([a.seeds, a.seed_match, a.n_ranked, a.ranked_sha, a.n_units, a.n_head, a.items, a.budgets, a.beyond_sample]);
const files = {};

function checkBudgets(a, tag) {
  let over = 0;
  for (const [bs, v] of Object.entries(a.budgets || {})) {
    const b = Number(bs);
    if (v.used > b) { over++; prob(tag + ' ' + a.id + ' over budget ' + b + ': ' + v.used); }
    let t = 0; let ht = 0; let tt = 0;
    for (let k = 0; k < v.n_full; k++) { const it = a.items[k]; t += it.tok; if (it.pad) tt += it.tok; else ht += it.tok; }
    if (v.cut) { t += v.cut.tok; if (v.cut.pad) tt += v.cut.tok; else ht += v.cut.tok; }
    const allFit = !v.cut && v.beyond === 0 && v.n_full === a.n_units;
    if (!allFit) t += countTokens('[+' + v.beyond + ' more not shown]\n');
    if (t !== v.used) prob(tag + ' ' + a.id + ' budget ' + b + ' used ' + v.used + ' recomputed ' + t);
    if (ht !== v.head_tok || tt !== v.tail_tok) prob(tag + ' ' + a.id + ' budget ' + b + ' head/tail tok');
    if (v.n_full + (v.cut ? 1 : 0) + v.beyond !== a.n_units) prob(tag + ' ' + a.id + ' budget ' + b + ' n_full+cut+beyond != n_units');
  }
  if (Object.keys(a.budgets || {}).sort().join() !== ['16000', '2000', '4000', '8000'].sort().join()) prob(tag + ' ' + a.id + ' budgets ' + Object.keys(a.budgets || {}));
  return over;
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function strings(x, acc) { if (typeof x === 'string') acc.push(x); else if (Array.isArray(x)) x.forEach((y) => strings(y, acc)); else if (x && typeof x === 'object') Object.values(x).forEach((y) => strings(y, acc)); return acc; }
function wholePathHits(a, p) {
  const re = new RegExp('(^|[^A-Za-z0-9_./-])' + esc(p) + '($|[^A-Za-z0-9_/-]|\\.(?![A-Za-z0-9_]))');
  const all = strings({ items: a.items, beyond_sample: a.beyond_sample, seeds: a.seeds, budgets: a.budgets }, []);
  return all.filter((s) => re.test(s)).length;
}

for (const e of plan.runs) {
  const f = path.join(B, e.out); const tag = 'n' + e.n + ' ' + e.out;
  const row = { n: e.n, arm: e.arm, role: e.role, set: e.set, draw: e.draw, expected: e.expected_tasks, exists: fs.existsSync(f) };
  if (!row.exists) { prob(tag + ' missing'); out.sets.push(row); continue; }
  const A = rd(f); files[e.n] = new Map(A.map((a) => [a.id, a]));
  const want = bySet[e.set]; const seen = new Map();
  for (const a of A) seen.set(a.id, (seen.get(a.id) || 0) + 1);
  row.answers = A.length; row.distinct = seen.size;
  row.dupes = [...seen.values()].filter((c) => c > 1).length;
  row.missing = [...want.keys()].filter((id) => !seen.has(id)).length;
  row.extra = [...seen.keys()].filter((id) => !want.has(id)).length;
  row.bad_hash = A.filter((a) => a.config_hash !== e.hash).length;
  row.splits = [...new Set(A.map((a) => a.split))];
  row.over_budget = 0; for (const a of A) row.over_budget += checkBudgets(a, tag);
  row.max_used_8000 = Math.max(...A.map((a) => (a.budgets && a.budgets['8000'] ? a.budgets['8000'].used : 0)));
  row.max_used_16000 = Math.max(...A.map((a) => (a.budgets && a.budgets['16000'] ? a.budgets['16000'].used : 0)));
  row.no_seed = A.filter((a) => !a.seeds || !a.seeds.length).length;
  row.empty_items = A.filter((a) => !a.items || !a.items.length).length;
  if (A.length !== e.expected_tasks || row.dupes || row.missing || row.extra) prob(tag + ' count/ids ' + JSON.stringify({ answers: A.length, dupes: row.dupes, missing: row.missing, extra: row.extra }));
  if (row.bad_hash) prob(tag + ' config_hash differs in ' + row.bad_hash);
  if (e.set === 'T3' || e.set === 'T4') {
    let hits = 0; let fieldHits = 0; let withRemove = 0;
    for (const a of A) {
      const t = want.get(a.id); const rp = (t && t.remove_paths) || [];
      if (rp.length) withRemove++;
      for (const p of rp) {
        const h = wholePathHits(a, p); hits += h ? 1 : 0;
        if (a.items.some((i) => i.path === p) || (a.seeds || []).some((s) => s === p || String(s).startsWith(p + '#') || String(s).startsWith(p + ':'))) fieldHits++;
      }
    }
    row.tasks_with_removed_doc = withRemove; row.answers_with_removed_path = hits; row.answers_with_removed_path_in_item_or_seed = fieldHits;
    out.removed.push({ n: e.n, arm: e.arm, role: e.role, set: e.set, draw: e.draw, tasks_with_removed_doc: withRemove, answers_with_removed_path: hits });
    if (hits) prob(tag + ' removed path appears as a whole path in ' + hits + ' answers');
  }
  out.sets.push(row);
}

// typed arms against the reference arm, primary and s1
const findRun = (arm, role, hash, set) => plan.runs.find((r) => r.arm === arm && r.role === role && r.hash === hash && r.set === set && !r.draw);
const toList = (a) => a.items.map((it) => ({ i: it.kind + '|' + it.path + '|' + (it.symbol || ''), hop: it.hop, score: it.score == null ? null : it.score }));
for (const [role, hash] of [['primary', '95e990307da3b42b'], ['s1', '6b70cc1222745385']]) {
  for (const set of ['T1', 'T1x', 'T2', 'T3', 'T4']) {
    const ref = findRun('reference', 'crosscheck', hash, set);
    const R = ref && files[ref.n];
    const typed = {};
    for (const arm of ['relational', 'ladybug', 'duckpgq']) {
      const r = findRun(arm, role, hash, set); const A = r && files[r.n]; typed[arm] = A;
      const row = { role, hash, set, arm, against: 'reference', compared: 0, equiv_fail: 0, strict_items_differ: 0, ranked_sha_differ: 0, n_ranked_differ: 0, packed_differ: 0, examples: [] };
      if (!A || !R) { row.missing = true; prob('equivalence ' + role + ' ' + set + ' ' + arm + ': file missing'); out.equivalence.push(row); continue; }
      for (const [id, a] of A) {
        const b = R.get(id); if (!b) { row.equiv_fail++; continue; }
        row.compared++;
        const ev = E.equivalent(toList(a), toList(b));
        if (!ev.ok) { row.equiv_fail++; if (row.examples.length < 3) row.examples.push({ id, reason: ev.reason }); }
        if (!E.strict(a.items, b.items)) row.strict_items_differ++;
        if (a.ranked_sha !== b.ranked_sha) row.ranked_sha_differ++;
        if (a.n_ranked !== b.n_ranked) row.n_ranked_differ++;
        if (content(a) !== content(b)) row.packed_differ++;
      }
      if (row.equiv_fail) prob('equivalence ' + role + ' ' + set + ' ' + arm + ' vs reference: ' + row.equiv_fail + ' failures');
      out.equivalence.push(row);
    }
    if (typed.relational && typed.ladybug && typed.duckpgq) {
      let all3 = 0; let tot = 0; let rl = 0; let rd2 = 0; let ld = 0;
      for (const [id, a] of typed.relational) {
        const l = typed.ladybug.get(id); const d = typed.duckpgq.get(id); tot++;
        if (!l || !d) continue;
        const ca = content(a); const cl = content(l); const cd = content(d);
        if (ca === cl) rl++; if (ca === cd) rd2++; if (cl === cd) ld++; if (ca === cl && cl === cd) all3++;
      }
      out.typed_identity.push({ role, hash, set, tasks: tot, identical_all_three: all3, relational_eq_ladybug: rl, relational_eq_duckpgq: rd2, ladybug_eq_duckpgq: ld });
    }
  }
}

// TQ
const tq = {};
for (const q of plan.question_runs) {
  const f = path.join(B, q.out);
  const r = { exists: fs.existsSync(f) };
  if (r.exists) {
    const L = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    tq[q.arm] = new Map(L.map((x) => [x.id, x]));
    const ids = L.map((x) => x.id);
    r.answers = L.length; r.distinct = new Set(ids).size;
    r.missing = qids.filter((i) => !ids.includes(i)).length; r.extra = ids.filter((i) => !qids.includes(i)).length;
    const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(isEmpty));
    r.errors = L.filter((x) => x.error != null).map((x) => ({ id: x.id, error: String(x.error).slice(0, 200) }));
    r.empty = L.filter((x) => x.error == null && isEmpty(x.answer)).map((x) => x.id);
    r.n_errors = r.errors.length; r.n_empty = r.empty.length;
    r.max_tokens = Math.max(...L.map((x) => x.tokens || 0));
    if (L.length !== q.expected_questions || r.missing || r.extra || r.distinct !== L.length) prob('TQ ' + q.arm + ' count/ids ' + JSON.stringify(r));
  } else prob('TQ ' + q.arm + ' missing');
  out.tq[q.arm] = r;
}
for (const arm of ['ladybug', 'duckpgq', 'search']) {
  if (!tq.relational || !tq[arm]) continue;
  let same = 0; const diff = [];
  for (const [id, x] of tq.relational) { const y = tq[arm].get(id); if (y && JSON.stringify(x.answer) === JSON.stringify(y.answer) && (x.error == null) === (y.error == null)) same++; else diff.push(id); }
  out.tq[arm].vs_relational = { identical: same, differ: diff.length, differing_ids: diff };
}

// inventory and wall time
const inv = [];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
for (const e of [...plan.runs, ...plan.question_runs]) {
  const f = path.join(B, e.out); if (!fs.existsSync(f)) continue;
  const buf = fs.readFileSync(f);
  const n = (f.endsWith('.gz') ? zlib.gunzipSync(buf) : buf).toString('utf8').split('\n').filter(Boolean).length;
  const pe = prog.entries[e.n] || {};
  inv.push({ n: e.n, file: e.out, arm: e.arm, role: e.role, hash: e.hash || null, set: e.set, draw: e.draw || 0, answers: n, bytes: buf.length, sha256: sha(buf), wall_s: pe.wall_s == null ? null : pe.wall_s });
  out.wall_per_arm_s[e.arm] = Math.round(((out.wall_per_arm_s[e.arm] || 0) + (pe.wall_s || 0)) * 10) / 10;
}
fs.writeFileSync(path.join(B, 'results/heldout/INVENTORY.json'), JSON.stringify({ written_at: new Date().toISOString(), written_by: 'held-out runner (tmp/runner/check.js)', files: inv }, null, 1));
out.inventory_files = inv.length; out.inventory_answers = inv.reduce((s, x) => s + x.answers, 0);
out.n_problems = out.problems.length;
fs.writeFileSync(path.join(B, 'tmp/runner/check.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ n_problems: out.n_problems, problems: out.problems.slice(0, 30), inventory_files: out.inventory_files, inventory_answers: out.inventory_answers, wall_per_arm_s: out.wall_per_arm_s }, null, 1));
