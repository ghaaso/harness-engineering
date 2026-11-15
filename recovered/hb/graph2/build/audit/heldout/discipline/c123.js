'use strict';
// Refuter 2 (run discipline): checks 1, 2, 3 recomputed from files. Read-only except its own output.
const fs = require('fs'); const path = require('path'); const zlib = require('zlib'); const crypto = require('crypto');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const OUT = path.join(B, 'audit/heldout/discipline/c123.json');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const plan = JSON.parse(fs.readFileSync(path.join(B, 'results/frozen/PLAN.json'), 'utf8'));
const entries = [...plan.runs, ...plan.question_runs];
const runs = fs.readFileSync(path.join(B, 'results/heldout/runs.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const res = { at: new Date().toISOString(), c1: {}, c2: {}, c3: {} };

// ---------- check 1
const rel = (o) => o.replace(/^results\//, '');
const c1 = res.c1; c1.plan_entries = entries.length; c1.runs_lines = runs.length;
c1.exit_counts = {}; for (const r of runs) c1.exit_counts[r.exit] = (c1.exit_counts[r.exit] || 0) + 1;
c1.repeat_nonzero = runs.filter((r) => r.repeat).map((r) => ({ out: r.out, repeat: r.repeat, reason: r.reason }));
c1.with_superseded = runs.filter((r) => r.superseded && r.superseded.length).map((r) => ({ out: r.out, superseded: r.superseded }));
c1.per_entry = []; const used = new Set();
for (const e of entries) {
  const m = runs.map((r, i) => [r, i]).filter(([r]) => r.out === rel(e.out));
  m.forEach(([, i]) => used.add(i));
  const row = { n: e.n, arm: e.arm, role: e.role, set: e.set, draw: e.draw || 0, lines: m.length };
  const bad = [];
  for (const [r] of m) {
    if (r.arm !== e.arm) bad.push('arm'); if (e.hash && r.hash !== e.hash) bad.push('hash');
    if (r.role !== e.role) bad.push('role ' + r.role); if ((r.draw || 0) !== (e.draw || 0)) bad.push('draw');
    if (e.set !== 'TQ' && r.set !== e.set) bad.push('set');
    if (r.exit !== 'ok') bad.push('exit ' + r.exit);
    const want = e.expected_tasks || e.expected_questions; const got = r.n_tasks != null ? r.n_tasks : r.n_questions;
    if (got !== want) bad.push('n ' + got + '/' + want);
    const rec = e.record ? JSON.parse(fs.readFileSync(path.join(B, e.record), 'utf8')) : JSON.parse(fs.readFileSync(path.join(B, 'results/frozen', e.arm, e.hash + '.json'), 'utf8'));
    if (r.code_hash !== rec.code_hash) bad.push('code_hash');
    // argv equals plan command
    const cmdArgv = e.command.replace(/^(LB_COMM_DRAW=\d+ )?node arms\/common\/run\.js /, '').split(' ');
    if (JSON.stringify(r.argv) !== JSON.stringify(cmdArgv)) bad.push('argv ' + JSON.stringify(r.argv));
  }
  row.bad = bad; row.first = m[0] ? { at_start: m[0][0].at_start, at_end: m[0][0].at_end, host: m[0][0].host } : null;
  c1.per_entry.push(row);
}
c1.entries_with_not_exactly_one_line = c1.per_entry.filter((r) => r.lines !== 1).map((r) => r.n);
c1.entries_with_problems = c1.per_entry.filter((r) => r.bad.length);
c1.undeclared_lines = runs.filter((r, i) => !used.has(i));
c1.distinct_hosts = [...new Set(runs.map((r) => r.host))].length;
c1.run_keys_sample = Object.keys(runs[0]); c1.tq_run_sample = runs.find((r) => r.set === 'TQ' || r.role === 'tq');
c1.first_start = runs.map((r) => r.at_start).sort()[0]; c1.last_end = runs.map((r) => r.at_end).sort().slice(-1)[0];
// superseded folder
const walk = (d, acc = []) => { if (!fs.existsSync(d)) return acc; for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, acc); else acc.push(p); } return acc; };
c1.superseded_files = walk(path.join(B, 'results/heldout/_superseded')).map((p) => path.relative(B, p));
c1.running_markers = walk(path.join(B, 'results/heldout/_running')).map((p) => path.relative(B, p));
c1.part_files = walk(path.join(B, 'results/heldout')).filter((p) => p.endsWith('.part')).map((p) => path.relative(B, p));
// runner log: count start lines per n, REPEAT
const rl = fs.readFileSync(path.join(B, 'tmp/runner/runner.log'), 'utf8').split('\n').filter(Boolean);
const starts = {}; for (const l of rl) { const m = l.match(/ start n=(\d+) /); if (m) starts[m[1]] = (starts[m[1]] || 0) + 1; }
c1.runner_log_lines = rl.length; c1.runner_starts = Object.keys(starts).length; c1.runner_multi_start = Object.entries(starts).filter(([, c]) => c > 1);
c1.runner_repeat_lines = rl.filter((l) => /REPEAT|failed|not run|crash|already running|has a logged/.test(l));
// every runner log file: docker command = plan template filled, both tmpfs mounts
const logs = fs.readdirSync(path.join(B, 'tmp/runner/logs'));
c1.log_files = logs.length; c1.log_problems = [];
for (const e of entries) {
  const want = plan.container.template.replace('<build root>', plan.container.build_root).replace('<volume>', e.volume).replace('<lock_check>', e.lock_check).replace('<command>', e.command);
  const lf = path.join(B, 'tmp/runner/logs', 'n' + String(e.n).padStart(2, '0') + '.log');
  if (!fs.existsSync(lf)) { c1.log_problems.push(e.n + ' no log'); continue; }
  const t = fs.readFileSync(lf, 'utf8'); const first = t.split('\n')[0];
  if (first !== '$ ' + want) c1.log_problems.push(e.n + ' command differs from template');
  if (!first.includes('--mount type=tmpfs,destination=/build/sealed') || !first.includes('--mount type=tmpfs,destination=/build/audit')) c1.log_problems.push(e.n + ' missing tmpfs');
  if (!/^allowed\s*$/m.test(t)) c1.log_problems.push(e.n + ' no allowed line');
  if (/refused|REFUSED|Error|error:/.test(t)) c1.log_problems.push(e.n + ' error/refused text in log');
}
c1.extra_log_files = logs.filter((f) => !/^n\d\d\.log$/.test(f));

// ---------- check 2: code and deps hash recomputed now
const c2 = res.c2; c2.records = [];
const fileHash = (rp) => sha(fs.readFileSync(path.join(B, 'arms', rp)));
const listHash = (files) => sha(Object.keys(files).sort().map((k) => k + ' ' + files[k] + '\n').join(''));
const recFiles = [];
for (const arm of fs.readdirSync(path.join(B, 'results/frozen')).filter((d) => !d.startsWith('_') && fs.statSync(path.join(B, 'results/frozen', d)).isDirectory())) {
  for (const f of fs.readdirSync(path.join(B, 'results/frozen', arm))) recFiles.push([arm, f]);
}
for (const [arm, f] of recFiles) {
  const rp = path.join(B, 'results/frozen', arm, f); const rec = JSON.parse(fs.readFileSync(rp, 'utf8'));
  // current file set for code hash
  const cur = {};
  for (const d of [arm, 'common']) for (const x of fs.readdirSync(path.join(B, 'arms', d))) if (x.endsWith('.js') && fs.statSync(path.join(B, 'arms', d, x)).isFile()) cur[d + '/' + x] = fileHash(d + '/' + x);
  const curDeps = {}; for (const k of Object.keys(rec.deps_files || {})) curDeps[k] = fs.existsSync(path.join(B, 'arms', k)) ? fileHash(k) : 'MISSING';
  const row = { rec: arm + '/' + f, role: rec.role, frozen_at: rec.frozen_at,
    code_hash_recorded_eq_listed: listHash(rec.code_files) === rec.code_hash,
    code_hash_now_eq: listHash(cur) === rec.code_hash,
    files_added: Object.keys(cur).filter((k) => !(k in rec.code_files)), files_removed: Object.keys(rec.code_files).filter((k) => !(k in cur)),
    files_changed: Object.keys(cur).filter((k) => k in rec.code_files && cur[k] !== rec.code_files[k]),
    deps_hash_recorded_eq_listed: rec.deps_files ? listHash(rec.deps_files) === rec.deps_hash : null,
    deps_hash_now_eq: rec.deps_files ? listHash(curDeps) === rec.deps_hash : null,
    file_mtime: fs.statSync(rp).mtime.toISOString() };
  // plan agreement
  const pe = f === 'tq.json' ? plan.question_runs.find((q) => q.arm === arm) : plan.configurations.find((c) => c.arm === arm && c.hash === f.replace('.json', ''));
  row.plan_code_hash_eq = pe ? pe.code_hash === rec.code_hash && pe.deps_hash === rec.deps_hash : 'not in plan';
  c2.records.push(row);
}
c2.all_ok = c2.records.every((r) => r.code_hash_recorded_eq_listed && r.code_hash_now_eq && r.deps_hash_recorded_eq_listed !== false && r.deps_hash_now_eq !== false && r.plan_code_hash_eq === true);
// files under arms/ newer than the earliest frozen record time
const frozenMin = Math.min(...c2.records.map((r) => Date.parse(r.frozen_at)));
c2.earliest_frozen_at = new Date(frozenMin).toISOString();
const armFiles = walk(path.join(B, 'arms'));
const newer = armFiles.map((p) => ({ p: path.relative(B, p).replace(/\\/g, '/'), m: fs.statSync(p).mtimeMs })).filter((x) => x.m > frozenMin);
c2.arms_files_total = armFiles.length;
c2.newer_than_freeze = newer.filter((x) => !x.p.startsWith('arms/ladybug/priors/')).map((x) => x.p + ' ' + new Date(x.m).toISOString());
const pri = newer.filter((x) => x.p.startsWith('arms/ladybug/priors/'));
c2.priors_newer_count = pri.length; c2.priors_total = armFiles.filter((p) => p.replace(/\\/g, '/').includes('arms/ladybug/priors/')).length;
c2.priors_newer_range = pri.length ? [new Date(Math.min(...pri.map((x) => x.m))).toISOString(), new Date(Math.max(...pri.map((x) => x.m))).toISOString()] : null;
c2.priors_after_scoring_started = pri.filter((x) => x.m > fs.statSync(path.join(B, 'results/heldout/SCORING_STARTED')).mtimeMs).map((x) => x.p);
// freeze log
const fl = fs.readFileSync(path.join(B, 'results/frozen/freeze_log.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
c2.freeze_log_lines = fl.length; c2.freeze_log_last = fl.slice(-1)[0] && (fl.slice(-1)[0].at || fl.slice(-1)[0].frozen_at || JSON.stringify(fl.slice(-1)[0]).slice(0, 200));
c2.freeze_log_keys = Object.keys(fl[0] || {});

// ---------- check 3: order and inventory
const c3 = res.c3; const ss = path.join(B, 'results/heldout/SCORING_STARTED');
c3.scoring_started_mtime = fs.statSync(ss).mtime.toISOString(); c3.scoring_started_text = fs.readFileSync(ss, 'utf8').trim();
const inv = JSON.parse(fs.readFileSync(path.join(B, 'results/heldout/INVENTORY.json'), 'utf8'));
c3.inventory_written_at = inv.written_at; c3.inventory_files = inv.files.length;
c3.mismatch = []; c3.newer_than_ss = []; let maxM = 0; let maxF = '';
for (const it of inv.files) {
  const f = path.join(B, it.file); if (!fs.existsSync(f)) { c3.mismatch.push(it.file + ' missing'); continue; }
  const buf = fs.readFileSync(f); if (sha(buf) !== it.sha256) c3.mismatch.push(it.file + ' sha differs');
  if (buf.length !== it.bytes) c3.mismatch.push(it.file + ' bytes differ');
  const st = fs.statSync(f); if (st.mtimeMs > maxM) { maxM = st.mtimeMs; maxF = it.file; }
  if (st.mtimeMs >= fs.statSync(ss).mtimeMs) c3.newer_than_ss.push(it.file);
}
c3.latest_answer_file = maxF + ' ' + new Date(maxM).toISOString();
const planOuts = entries.map((e) => e.out); c3.inventory_covers_plan = planOuts.every((o) => inv.files.some((x) => x.file === o)) && inv.files.length === planOuts.length;
// answer-like files under results/heldout not in plan
c3.unplanned_files = walk(path.join(B, 'results/heldout')).map((p) => path.relative(B, p).replace(/\\/g, '/')).filter((p) => !planOuts.includes(p) && !['results/heldout/INVENTORY.json', 'results/heldout/runs.jsonl', 'results/heldout/SCORING_STARTED'].includes(p));
c3.runs_jsonl_mtime = fs.statSync(path.join(B, 'results/heldout/runs.jsonl')).mtime.toISOString();
// input hashes
const pre = JSON.parse(fs.readFileSync(path.join(B, 'audit/preflight/r3/input_hashes.json'), 'utf8'));
const cmpIH = (a, b) => JSON.stringify(a) === JSON.stringify(b);
for (const [k, f] of [['runner_copy', 'tmp/runner/input_hashes.json'], ['before', 'tmp/runner/input_hashes.before.json'], ['after', 'tmp/runner/input_hashes.after.json']]) {
  const x = JSON.parse(fs.readFileSync(path.join(B, f), 'utf8')); c3['inputs_' + k + '_eq_preflight'] = cmpIH(x, pre);
}
c3.preflight_all = pre.all;
res.c3.inputs_now_recomputed = null; // filled by recomputation below
{
  const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const parents = [...new Set(tasks.filter((t) => t.split !== 'tune' && t.set !== 'T5').map((t) => t.parent)), 'a31924a3818f4ac94b695906d107c72c912792b2'].sort();
  const o = { files: {}, facts: {} };
  for (const f of ['tasks/tasks.jsonl', 'tasks/tq_questions.jsonl', 'tasks/parents.txt']) o.files[f] = sha(fs.readFileSync(path.join(B, f)));
  const dd = (d) => { const rows = []; (function w(x, r) { for (const f of fs.readdirSync(x).sort()) { const p = path.join(x, f); if (fs.statSync(p).isDirectory()) w(p, r + f + '/'); else rows.push(r + f + ' ' + sha(fs.readFileSync(p))); } })(d, ''); return { n: rows.length, digest: sha(rows.join('\n')) }; };
  for (const p of parents) o.facts[p] = dd(path.join(B, 'facts', 'cache', p));
  o.parents = parents.length; o.all = sha(JSON.stringify([o.files, o.facts]));
  c3.inputs_now_all = o.all; c3.inputs_now_eq_preflight = cmpIH(o, pre);
}
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ c1: { entries: c1.plan_entries, lines: c1.runs_lines, exits: c1.exit_counts, not1: c1.entries_with_not_exactly_one_line, probs: c1.entries_with_problems, undeclared: c1.undeclared_lines.length, repeats: c1.repeat_nonzero, sup: c1.superseded_files, run: c1.running_markers, part: c1.part_files, multi: c1.runner_multi_start, rlines: c1.runner_repeat_lines, logs: c1.log_files, logp: c1.log_problems, extra_logs: c1.extra_log_files, first: c1.first_start, last: c1.last_end, hosts: c1.distinct_hosts },
  c2: { all_ok: c2.all_ok, bad: c2.records.filter((r) => !(r.code_hash_now_eq && r.code_hash_recorded_eq_listed && r.plan_code_hash_eq === true && r.deps_hash_now_eq !== false)), n: c2.records.length, frozen_min: c2.earliest_frozen_at, newer: c2.newer_than_freeze, pri: [c2.priors_newer_count, c2.priors_total, c2.priors_newer_range, c2.priors_after_scoring_started.length], fl: c2.freeze_log_lines },
  c3 }, null, 1));
