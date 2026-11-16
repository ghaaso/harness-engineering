// END-ORDER steps 1-9: does the named evidence exist with the stated content? Read-only.
const fs = require('fs'), path = require('path'), cr = require('crypto');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const D = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings';
const P = (...a) => path.join(L, ...a);
const ex = p => fs.existsSync(p);
const sha = p => cr.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rd = p => fs.readFileSync(p, 'utf8');
const J = p => JSON.parse(rd(p));
const out = []; const C = (step, name, ok, ev) => out.push((ok ? 'OK   ' : 'FAIL ') + step + ' | ' + name + ' | ' + ev);
const prog = rd(P('progress.jsonl')).split('\n').filter(Boolean).map((s, i) => { try { return Object.assign({ _line: i + 1 }, JSON.parse(s)); } catch (e) { return { _line: i + 1, _bad: s.slice(0, 80) }; } });
const units = u => prog.filter(r => r.unit === u);
const runlog = rd(P('train', 'RUNLOG.md')).split('\n');
// ---- step 1
{
  const s = rd(P('orchestrator/end-of-run/end_of_run-20261115T123811Z.txt')).trim().split('\n');
  const last = s[s.length - 1];
  C('1', 'summary ends with PASS assemble-checks line', /PASS assemble-checks orchestrator\/end-of-run\/assemble_checks-20261115T123811Z\.log tables_digest [0-9a-f]{64} appended to .*RUNLOG\.md \(assemble_checks\.py sha256 [0-9a-f]{64}; e4_det1 477 of 477 e4_parts, planned 477\)$/.test(last), last.slice(0, 120));
  const pl = runlog.filter(l => l.startsWith('PASS assemble-checks'));
  C('1', 'RUNLOG has exactly one PASS assemble-checks line', pl.length === 1, pl.length + ' line(s): ' + (pl[0] || '').slice(0, 140));
  const lg = rd(P('orchestrator/end-of-run/assemble_checks-20261115T123811Z.log'));
  const acs = sha(P('orchestrator/assemble_checks.py'));
  C('1', 'log holds PASS, current assemble_checks.py sha, parts planned, e4_det1, digest', /assemble_checks PASS/.test(lg) && lg.includes('sha256 ' + acs + ' orchestrator/assemble_checks.py') && /train \/w\/train parts 2385 planned 2385/.test(lg) && /e4_det1 477 of 477/.test(lg) && /tables_digest f8cb1f8b/.test(lg), 'assemble_checks.py now ' + acs.slice(0, 12));
  const td = units('tables_digest'); C('1', 'coordinator tables_digest line', td.length >= 1 && td.every(r => r.sha256 && r.sha256.startsWith('f8cb1f8b')), td.map(r => 'L' + r._line + ' ' + r.file + ' ' + (r.sha256 || '').slice(0, 12)).join('; '));
  const nf = units('nonfinite_tables'); C('1', 'coordinator nonfinite_tables line, count 0', nf.length === 1 && nf[0].count === 0, nf.map(r => 'L' + r._line + ' count ' + r.count).join('; '));
  const rcs = ['assemble-20261115T123811Z.rc', 'assemble_checks-20261115T123811Z.rc'].map(f => rd(P('orchestrator/end-of-run', f)).trim());
  C('1', 'assemble and assemble_checks rc files 0', rcs.every(x => x === '0'), rcs.join(','));
}
// ---- 2a
{
  const pj = P('train/probe/probe.json'), rc = P('train/probe/probe.rc'), mr = P('r58c/mounts/kge-H1P.json');
  C('2a', 'probe.json, probe.rc 0, kge-H1P.json', ex(pj) && ex(rc) && rd(rc).trim() === '0' && ex(mr), [ex(pj), ex(rc) && rd(rc).trim(), ex(mr)].join(','));
  if (ex(pj)) { const p = J(pj); const s = JSON.stringify(p); const settings = (p.settings || p.rows || p.results || []); C('2a', 'probe.json shape', true, 'keys ' + Object.keys(p).join(',').slice(0, 200) + ' settings ' + (Array.isArray(settings) ? settings.length : typeof settings)); }
}
// ---- 2b
{
  const rf = P('r58c/rehearsal/REHEARSAL.txt');
  C('2b', 'r58c/rehearsal/REHEARSAL.txt ends with RESULT PASS rehearsal', ex(rf) && /RESULT PASS rehearsal\s*$/.test(rd(rf)), ex(rf) ? rd(rf).trim().split('\n').slice(-1)[0].slice(0, 120) : 'missing');
}
// ---- 2c
{
  const ro = P('r58c/B/rerun-out'); const st = ex(ro) ? fs.readdirSync(ro).filter(d => fs.statSync(path.join(ro, d)).isDirectory()).sort() : [];
  for (const s of st) {
    const d = path.join(ro, s); const rj = path.join(d, 'result.json');
    if (!ex(rj)) { C('2c', 'rerun-out/' + s + ' result.json', false, 'missing; files ' + fs.readdirSync(d).join(',')); continue; }
    const r = J(rj); const files = ['picks.json', 'compare.jsonl', 'driver.log', 'host-load.tsv'].map(f => f + ':' + ex(path.join(d, f)));
    const ok = r.rc === 0 && r.equal === 15 && (!r.mismatch || r.mismatch.length === 0) && (!r.error || r.error.length === 0);
    C('2c', 'rerun-out/' + s, ok && files.every(f => f.endsWith('true')), 'rc ' + r.rc + ' equal ' + r.equal + ' mismatch ' + JSON.stringify(r.mismatch) + ' error ' + JSON.stringify(r.error) + ' ' + files.join(' '));
  }
  const rr = units('rerun_check'); C('2c', 'progress rerun_check lines', true, rr.map(r => 'L' + r._line + ' ' + (r.status || '').slice(0, 120)).join(' || ') || 'none');
}
// ---- 2d
{
  const i = runlog.findIndex(l => l.startsWith('## 2d, agents A and B'));
  const blk = runlog.slice(i, i + 14); const shaL = blk.filter(l => /^sha256 [0-9a-f]{64} /.test(l)); const passL = blk.filter(l => /^PASS /.test(l));
  for (const l of shaL) { const [, h, role, rel] = l.split(' '); C('2d', 'role ' + role + ' bytes = current', sha(P(rel)) === h, rel + ' ' + h.slice(0, 12)); }
  for (const l of passL) { const [, role, lg] = l.split(' '); const lp = P(lg); const t = ex(lp) ? rd(lp) : ''; C('2d', 'PASS ' + role + ' log has RESULT PASS', ex(lp) && /RESULT PASS/.test(t) && !/RESULT FAIL/.test(t), lg + (ex(lp) ? ' lines ' + t.split('\n').length : ' MISSING')); }
}
// ---- 2e
{
  const cands = ['r58c/B/out/rehearsal', 'r58c/rehearsal', 'train/report/result-draft'];
  const found = [];
  const walk = d => { if (!ex(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'result.json') found.push(p); } };
  for (const c of cands) walk(P(c));
  for (const f of found) { let r; try { r = J(f); } catch (e) { continue; } C('2e', 'result.json ' + path.relative(L, f).replace(/\\/g, '/'), r.test === true, 'test ' + r.test + ' inputs ' + (r.inputs ? Object.keys(r.inputs).length : '-')); }
  if (!found.length) C('2e', 'a 2e result.json', false, 'none found under ' + cands.join(', '));
}
// ---- 2f
{
  const ms = ['heldout_inputs.sha256', 'heldout_export.sha256', 'tune_inputs.sha256'];
  const plan = J(P('train/stageB/plan.json'));
  for (const m of ms) { const p = P(m); const ls = ex(p) ? rd(p).split('\n').filter(Boolean) : []; const bad = ls.filter(l => !/^[0-9a-f]{64}  \S/.test(l)); C('2f', m, ex(p) && ls.length > 0 && bad.length === 0, ls.length + ' lines, malformed ' + bad.length); }
  C('2f', 'plan.json keys', true, Object.keys(plan).join(',').slice(0, 200));
}
// ---- 2g
{
  const r = P('r58c/B/REPORT-TEST-READY'); C('2g', 'REPORT-TEST-READY', ex(r), ex(r) ? rd(r).trim().slice(0, 160) : 'missing');
  const t = units('tune_rank_check'); C('2g/5', 'progress tune_rank_check', t.length > 0, t.map(x => 'L' + x._line + ' ' + JSON.stringify(x).slice(0, 220)).join(' || '));
}
// ---- 3
{
  const cf = units('code_freeze'); const fl = sha(P('orchestrator/freeze-list.txt'));
  C('3', 'code_freeze line and freeze-list sha', cf.length >= 1 && cf[cf.length - 1].sha256 === fl, cf.map(x => 'L' + x._line + ' ' + x.sha256.slice(0, 12)).join(';') + ' disk ' + fl.slice(0, 12));
  const anchors = prog.filter(r => /freeze/.test(r.unit || '')); C('3', 'freeze-related lines', true, anchors.map(r => 'L' + r._line + ' ' + r.unit).join(', '));
}
// ---- 4
{
  const dig = 'f8cb1f8bc905bc74e4b50a9348f767e1f78a102516cf9567ee7df14a7593ffe0';
  for (const a of ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO']) { const f = P('train/selectB', a, 'choices.json'); const ok = ex(f) && J(f).stamp && J(f).stamp.tables_digest === dig && J(f).stamp.plan_hash && J(f).stamp.plan_sha256 && J(f).stamp.selectB_sha256; C('4', 'selectB/' + a + '/choices.json stamp', !!ok, ex(f) ? JSON.stringify(J(f).stamp).slice(0, 160) : 'missing'); }
  const T = J(P('train/report/tune.json')); const st = T.stamp || {};
  C('4', 'tune.json test false, stamp, harness_check.ok', T.test === false && !!T.plan_hash && st.report_sha256 && st.selectB_sha256 && st.plan_sha256 && st.tables_digest === dig && T.harness_check && T.harness_check.ok === true, 'test ' + T.test + ' stamp ' + JSON.stringify(st).slice(0, 200) + ' harness ' + (T.harness_check && T.harness_check.ok));
  C('4', 'stamp report_sha256 = report.py on disk', st.report_sha256 === sha(P('train/report.py')), (st.report_sha256 || '').slice(0, 12) + ' vs ' + sha(P('train/report.py')).slice(0, 12));
  C('4', 'stamp selectB_sha256 = selectB.py on disk', st.selectB_sha256 === sha(P('train/selectB.py')), (st.selectB_sha256 || '').slice(0, 12) + ' vs ' + sha(P('train/selectB.py')).slice(0, 12));
  C('4', 'stamp plan_sha256 = plan.json on disk', st.plan_sha256 === sha(P('train/stageB/plan.json')), (st.plan_sha256 || '').slice(0, 12));
  const tr = units('tune_report'); C('4', 'progress tune_report line sha = tune.json', tr.length > 0 && tr[tr.length - 1].sha256 === sha(P('train/report/tune.json')), tr.map(x => 'L' + x._line + ' ' + (x.sha256 || '').slice(0, 12)).join(';') + ' disk ' + sha(P('train/report/tune.json')).slice(0, 12));
}
// ---- 5
{
  const gf = units('grader_frozen'); const gfs = gf.length ? gf[gf.length - 1] : {};
  C('5', 'grader_frozen line', gf.length > 0, gf.map(x => 'L' + x._line + ' ' + JSON.stringify(x).slice(0, 200)).join(' || '));
  for (const f of ['tune-rank.json', 'tune-item24.json']) { const r = J(P('grader-returns', f)); const fsha = (r.scorer || {}).files_sha256; C('5', f, r.split === 'tune' && r.test === false && !!r.handoff_sha256, 'split ' + r.split + ' test ' + r.test + ' handoff ' + (r.handoff_sha256 || '').slice(0, 12) + ' scorer ' + (fsha || '').slice(0, 12)); }
  const hp = P('train/report/answer_level/handoff/HANDOFF.json'); if (ex(hp)) { const h = sha(hp); const r1 = J(P('grader-returns/tune-rank.json')), r2 = J(P('grader-returns/tune-item24.json')); C('5', 'returns name the tuning hand-off sha', r1.handoff_sha256 === h && r2.handoff_sha256 === h, h.slice(0, 12) + ' rank ' + (r1.handoff_sha256 || '').slice(0, 12) + ' i24 ' + (r2.handoff_sha256 || '').slice(0, 12)); }
}
// ---- 6
{
  const f = P('train/heldout/item27.json'); const s = sha(f); const r = J(f);
  C('6', 'item27.json sha = .sha256 file', rd(P('train/heldout/item27.json.sha256')).includes(s), s.slice(0, 12));
  C('6', 'record fields', !!r.chosen && r.tables_digest === 'f8cb1f8bc905bc74e4b50a9348f767e1f78a102516cf9567ee7df14a7593ffe0' && !!r.code_sha256 && !!r.pins && !!r.tuning_inputs && r.stamp_tune && r.stamp_tune.tune_sha256 && r.stamp_tune.report_sha256 && r.test === false, 'keys ' + Object.keys(r).join(','));
  C('6', 'stamp_tune.tune_sha256 = tune.json', r.stamp_tune && r.stamp_tune.tune_sha256 === sha(P('train/report/tune.json')), '');
  C('6', 'code_sha256 includes train/report.py', r.code_sha256 && Object.keys(r.code_sha256).some(k => /report\.py$/.test(k)), Object.keys(r.code_sha256 || {}).length + ' code entries');
  const an = units('item27_freeze'); C('6', 'exactly one item27_freeze anchor naming the record with its sha', an.length === 1 && an[0].file === 'train/heldout/item27.json' && an[0].sha256 === s, an.map(x => 'L' + x._line + ' ' + x.file + ' ' + (x.sha256 || '').slice(0, 12)).join(';'));
}
// ---- 7
{
  C('7', 'heldout.rc 0', rd(P('train/heldout/heldout.rc')).trim() === '0', rd(P('train/heldout/heldout.rc')).trim());
  const H = J(P('train/heldout/HANDOFF.json')); C('7', 'HANDOFF.json carries the anchor line', JSON.stringify(H).includes('item27_freeze'), 'keys ' + Object.keys(H).join(',').slice(0, 200));
  for (const m of ['r58c/mounts/kge-H1.json', 'r58c/mounts/kge-H1c.json']) C('7', m, ex(P(m)), ex(P(m)) ? sha(P(m)).slice(0, 12) : 'missing');
  const lg = P('heldout-launch/kge-H1-launch.log'); C('7', 'heldout-launch/kge-H1-launch.log', ex(lg), ex(lg) ? rd(lg).trim().split('\n').map(s => s.slice(0, 110)).join(' || ').slice(0, 900) : 'missing');
  const others = fs.readdirSync(P('r58c/mounts')).filter(f => /^kge-H1/.test(f)); C('7', 'all kge-H1* records', true, others.join(', '));
}
// ---- 8
{
  const H = J(P('grader-returns/heldout.json'));
  const gf = units('grader_frozen'); const gsha = gf.length ? (gf[gf.length - 1].sha256 || gf[gf.length - 1].files_sha256) : null;
  C('8', 'heldout.json fields', H.split === 'heldout' && H.test === false && H.tasks === 418 && H.commits === 75 && H.handoff_sha256 === sha(P('train/heldout/HANDOFF.json')) && H.freeze_sha256 === sha(P('train/heldout/item27.json')) && H.literal_check && H.literal_check.tasks === 418 && H.literal_check.task_commit_in_checkpoint_history === 0 && H.literal_check.parent_mismatch === 0, 'split ' + H.split + ' test ' + H.test + ' tasks ' + H.tasks + ' commits ' + H.commits + ' lc ' + JSON.stringify(H.literal_check));
  C('8', 'scorer.files_sha256 = grader_frozen', (H.scorer || {}).files_sha256 === gsha, ((H.scorer || {}).files_sha256 || '').slice(0, 12) + ' vs ' + String(gsha).slice(0, 12));
  const hg = units('heldout_graded'); C('8', 'heldout_graded line sha = heldout.json', hg.length === 1 && hg[0].sha256 === sha(P('grader-returns/heldout.json')), hg.map(x => 'L' + x._line + ' ' + x.sha256.slice(0, 12)).join(';'));
  const nh = units('nonfinite_heldout'); C('8', 'nonfinite_heldout count 0', nh.length === 1 && nh[0].count === 0, JSON.stringify(nh));
}
// ---- 9
{
  const la = J(P('train/leak_audit/leak_audit.json')); C('9.1', 'leak_audit ok true test false', la.ok === true && la.test === false, 'ok ' + la.ok + ' test ' + la.test + ' sha ' + sha(P('train/leak_audit/leak_audit.json')).slice(0, 12));
  const l10 = rd(P('r58c/B/lane-steps/ktest-r10-20261115T223224Z.log')); C('9.1', 'ktest-r10 verdict line and rc 0', /step 9\.1 verdict: train\/leak_audit\/leak_audit\.json sha256 [0-9a-f]{64}: ok true, test false/.test(l10) && /ktest-r10: rc 0/.test(l10), '');
  const i22 = J(P('train/report/item22.json')); C('9.2', 'item22.json test false', i22.test === false && !!i22.plan_hash, 'test ' + i22.test);
  const r5 = rd(P('r58c/B/lane-steps/ktest-r5-20261115T223713Z.log')); C('9.2', 'ktest-r5 rc 0', /ktest-r5: rc 0/.test(r5), '');
  const er = J(P('train/report/e5_route/e5_route.json')); C('9.2a', 'e5_route.json test false', er.test === false, 'test ' + er.test + ' arm ' + er.arm);
  const r11 = rd(P('r58c/B/lane-steps/ktest-r11-20261115T224447Z.log')); C('9.2a', 'ktest-r11 RESULT PASS and rc 0', /RESULT PASS e5-route-audit/.test(r11) && /ktest-r11: rc 0/.test(r11), '');
  const r6 = rd(P('r58c/B/lane-steps/ktest-r6-20261115T224736Z.log')); C('9.3', 'ktest-r6 rc 0, RESULT.md 149 lines', /ktest-r6: rc 0/.test(r6) && /RESULT\.md \(149 lines\)/.test(r6), 'RESULT.md newline count ' + (rd(D + '/RESULT.md').match(/\n/g) || []).length);
  const r7 = rd(P('r58c/B/lane-steps/ktest-r7-20261115T225018Z.log')); C('9.4', 'ktest-r7 rc 0, AUDIT 1119 lines, CLAIMS 515 claims', /ktest-r7: rc 0/.test(r7) && /AUDIT\.md \(1119 lines\)/.test(r7) && /515 claims/.test(r7), 'AUDIT newlines ' + (rd(D + '/AUDIT.md').match(/\n/g) || []).length + ' CLAIMS newlines ' + (rd(D + '/CLAIMS.md').match(/\n/g) || []).length);
  for (const m of ['ktest-r5', 'ktest-r6', 'ktest-r7', 'ktest-r10', 'ktest-r11']) C('9', 'mount record ' + m, ex(P('r58c/mounts', m + '.json')), ex(P('r58c/mounts', m + '.json')) ? sha(P('r58c/mounts', m + '.json')).slice(0, 12) : 'missing');
  const pl = prog.length; C('9', 'progress.jsonl unchanged between 9.3 and 9.4 (last line time)', true, 'lines ' + pl + ' last t ' + prog[pl - 1].t + ' sha ' + sha(P('progress.jsonl')).slice(0, 12));
  const rj = J(D + '/result.json'); C('9.3', 'result.json test flag', rj.test === false, 'test ' + rj.test);
}
fs.writeFileSync(__dirname + '/endorder.out.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
