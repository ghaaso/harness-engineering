'use strict';
// Check 6 (leak scan) and number checks inside sentences.
const L = require('./lib.js');
const { fs, path, B, OUT, jl, refHO, refTU } = L;
const raw = fs.readFileSync(path.join(B, 'sealed/grader/heldout/v2/data.json'), 'utf8');
const D = JSON.parse(raw);
const out = { question_text_hits: [], tq_reference_item_hits: [], heldout_def_hits: [], heldout_only_paths: [], heldout_task_ids: [], heldout_commit_shas: [], per_task_like: [] };
// held-out question text: any 25-character window of a held-out question appearing in data.json
for (const q of jl(path.join(B, 'tasks/tq_questions.jsonl')).filter((x) => x.split !== 'tune')) { const t = q.question; for (let i = 0; i + 25 <= t.length; i += 5) { const w = t.slice(i, i + 25); if (raw.includes(JSON.stringify(w).slice(1, -1))) { out.question_text_hits.push({ id: q.id, window: w }); break; } } }
// held-out question reference items (strings of length >= 6)
for (const r of jl(path.join(B, 'sealed/tq_reference.jsonl')).filter((x) => x.split !== 'tune')) { const its = Array.isArray(r.answer) ? r.answer : Object.values(r.answer).flat(); for (const it of its) { const s = String(it); if (s.length >= 6 && raw.includes(JSON.stringify(s).slice(1, -1))) out.tq_reference_item_hits.push({ id: r.id, item: s }); } }
// held-out reference definitions and paths
const tunePaths = new Set(); for (const r of refTU.values()) { r.files.forEach((f) => tunePaths.add(f.path)); r.defs.forEach((d) => tunePaths.add(d.path)); tunePaths.add(r.seed.path); }
const hoDefs = new Set(); const hoPaths = new Set();
for (const r of refHO.values()) { r.defs.forEach((d) => hoDefs.add(d.path + '::' + d.name)); r.files.forEach((f) => hoPaths.add(f.path)); }
for (const d of hoDefs) if (raw.includes(JSON.stringify(d).slice(1, -1))) out.heldout_def_hits.push(d);
const pathsInData = new Set(raw.match(/(?:technician-app|backend|src)\/[A-Za-z0-9_./-]+|ops-server\.mjs/g) || []);
for (const p of pathsInData) if (hoPaths.has(p) && !tunePaths.has(p)) out.heldout_only_paths.push(p);
// held-out ids and commits named
const ids = new Set(raw.match(/T(?:1x?|2|3|4)-\d{4}/g) || []); for (const id of ids) if (refHO.has(id)) out.heldout_task_ids.push(id);
const shas = new Set(raw.match(/\b[0-9a-f]{40}\b/g) || []); const hoCommits = new Set([...refHO.values()].map((r) => r.commit).filter(Boolean)); for (const s of shas) if (hoCommits.has(s)) out.heldout_commit_shas.push(s);
// structures that expose a single held-out task's score
for (const [n, c] of Object.entries(D.t3.comparisons)) for (const g of c.per_group_sign) if (g.tasks === 1) out.per_task_like.push({ where: `t3.comparisons.${n}.per_group_sign`, group: g.group, mean_a: g.mean_a, mean_b: g.mean_b });
out.per_question_rows = D.questions.per_question.length;
out.per_question_fields = Object.keys(D.questions.per_question[0]);
// drop note range
const dr = D.trust.tuning_to_heldout_drop; out.drop_min = dr.reduce((m, x) => (x.drop < m.drop ? x : m)); out.drop_max = dr.reduce((m, x) => (x.drop > m.drop ? x : m));
// T3 removals that were no-ops: references whose removed document did not exist at the parent (intro_how / intro_commit fields)
out.t3_intro_how = {}; for (const r of refHO.values()) if (r.set === 'T3') out.t3_intro_how[r.intro_how] = (out.t3_intro_how[r.intro_how] || 0) + 1;
fs.writeFileSync(path.join(OUT, 'h_text.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ q: out.question_text_hits.length, tqref: out.tq_reference_item_hits, defs: out.heldout_def_hits.length, paths: out.heldout_only_paths, ids: out.heldout_task_ids, shas: out.heldout_commit_shas.length, per_task_like: out.per_task_like, drop_min: out.drop_min, drop_max: out.drop_max, t3: out.t3_intro_how }, null, 1));
