'use strict';
// orchestrator/coord_checks.js: the coordinator's own mechanical checks for END-ORDER steps 5, 6 and 8.
// It only reads, except with --append: then, and only when every check passed, it appends ONE line to progress.jsonl.
// It never opens anything under build/sealed, and it prints no held-out figure (it reads the returns' header fields).
// usage:
//   node coord_checks.js returns tune|heldout [--root R]     steps 5 and 8: the grader's returns against grader_frozen
//   node coord_checks.js item27 [--append] [--root R]        step 6: the five checks of the record, then the anchor
//   node coord_checks.js heldout-start <launch log> [--cap 4g|5g|6g] [--root R]   step 8: the launch log, the start
//                                                             lines (image, memory cap), rc 0
//   node coord_checks.js nonfinite <folder> [...] [--root R]  ruling 105: counts of score rows and losses that are
//                                                             not finite numbers (counts and file names only)
//   node coord_checks.js test-records [folder] [--root R]     ruling 106(b), before the freeze is recorded: the saved
//                                                             records of the step launcher's TEST runs
// exit: 0 every check passed; 1 a check failed; 2 usage or an input missing.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ROOT = path.resolve(opt('--root') || path.join(__dirname, '..'));
const P = (...a) => path.join(ROOT, ...a);
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const exists = (f) => fs.existsSync(f);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const norm = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();
const flat = (o) => JSON.stringify(o, Object.keys(o || {}).sort());
const out = []; let failed = 0;
function check(name, ok, detail) { out.push((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? ': ' + detail : '')); if (!ok) failed++; }
function coordLines() {
  const f = P('progress.jsonl'); const r = [];
  if (!exists(f)) return r;
  fs.readFileSync(f, 'utf8').split('\n').forEach((s, i) => {
    if (!s.trim()) return; let o; try { o = JSON.parse(s); } catch (e) { return; }
    if (o && o.step === 'coordinator') r.push(Object.assign({ _line: i + 1 }, o));
  });
  return r;
}
const lastOf = (L, u) => { let x = null; for (const o of L) if (o.unit === u) x = o; return x; };
const allOf = (L, u) => L.filter((o) => o.unit === u);
function freezeMap() {  // {normalised absolute path: sha256}, plus the image lines
  const m = new Map(); const images = {}; let block = 'lane';
  for (const s of fs.readFileSync(P('orchestrator', 'freeze-list.txt'), 'utf8').split('\n')) {
    const t = s.replace(/\r$/, ''); if (!t) continue;
    if (t === '# outside') { block = 'outside'; continue; }
    if (t === '# images') { block = 'images'; continue; }
    if (t.startsWith('#')) continue;  // "# test output" stays lane-relative
    if (block === 'images') { const p = t.split(/\s+/); images[p[1]] = p[0]; continue; }
    const mm = /^([0-9a-f]{64}) {2}(.+)$/.exec(t); if (!mm) continue;
    m.set(block === 'outside' ? norm(mm[2]) : norm(path.join(ROOT, mm[2])), mm[1]);
  }
  return { m, images };
}
function finish(extra) {
  console.log(out.join('\n'));
  console.log((failed ? 'RESULT FAIL ' : 'RESULT PASS ') + cmd + (failed ? ' (' + failed + ' failed)' : '') + (extra ? ' ' + extra : ''));
  process.exit(failed ? 1 : 0);
}

function returns(kind) {
  if (kind !== 'tune' && kind !== 'heldout') { console.error('usage: returns tune|heldout'); process.exit(2); }
  const L = coordLines(); const gf = lastOf(L, 'grader_frozen');
  check('a grader_frozen line exists', !!gf, gf ? gf.sha256 : 'none');
  const files = kind === 'tune' ? ['tune-rank.json', 'tune-item24.json'] : ['heldout.json'];
  for (const f of files) {
    const p = P('grader-returns', f);
    if (!exists(p)) { check(f + ' exists', false); continue; }
    const r = J(p);
    check(f + ': scorer.files_sha256 equals grader_frozen', !!gf && (r.scorer || {}).files_sha256 === gf.sha256,
      ((r.scorer || {}).files_sha256 || 'none') + ' against ' + (gf ? gf.sha256 : 'none'));
    check(f + ': split ' + kind + ', test false', r.split === kind && r.test === false, 'split ' + r.split + ', test ' + r.test);
    if (kind === 'tune') {
      const hof = P('train', 'report', 'answer_level', 'handoff', 'HANDOFF.json');
      check(f + ': handoff_sha256 is the current tuning hand-off', exists(hof) && r.handoff_sha256 === sha(hof), String(r.handoff_sha256));
      check(f + ': 313 tasks, 50 commits', r.tasks === 313 && r.commits === 50, r.tasks + ' tasks, ' + r.commits + ' commits');
    } else {
      const hof = P('train', 'heldout', 'HANDOFF.json'); const an = allOf(L, 'item27_freeze'); const rf = P('train', 'heldout', 'item27.json');
      check(f + ': handoff_sha256 is train/heldout/HANDOFF.json', exists(hof) && r.handoff_sha256 === sha(hof), String(r.handoff_sha256));
      check(f + ': freeze_sha256 is the one anchored record', an.length === 1 && exists(rf) && r.freeze_sha256 === an[0].sha256 && an[0].sha256 === sha(rf), String(r.freeze_sha256));
      check(f + ': 418 tasks, 75 commits', r.tasks === 418 && r.commits === 75, r.tasks + ' tasks, ' + r.commits + ' commits');
      const lc = r.literal_check || {};
      check(f + ': literal_check tasks 418, both other counts 0', lc.tasks === 418 && lc.task_commit_in_checkpoint_history === 0 && lc.parent_mismatch === 0, JSON.stringify(lc));
      check(f + ': vs_RRF is present', !!r.vs_RRF && Object.keys(r.vs_RRF).length > 0);
      check(f + ': arm is the record\'s chosen arm', exists(rf) && r.arm === (J(rf).chosen || {}).arm, String(r.arm));
    }
    out.push('info  ' + f + ' sha256 ' + sha(p));
  }
  finish();
}

function item27() {
  const L = coordLines();
  const rf = P('train', 'heldout', 'item27.json'), sf = rf + '.sha256';
  if (!exists(rf) || !exists(sf)) { console.error('missing ' + rf + ' or its .sha256'); process.exit(2); }
  const h = sha(rf); const rec = J(rf);
  check('1 the record\'s sha256 equals item27.json.sha256', fs.readFileSync(sf, 'utf8').trim().split(/\s+/)[0] === h, h);
  const td = lastOf(L, 'tables_digest');
  check('2 tables_digest equals the coordinator\'s step-1 line', !!td && !!rec.tables_digest && td.sha256 === rec.tables_digest,
    String(rec.tables_digest) + ' against ' + (td ? td.sha256 : 'no line'));
  const cf = lastOf(L, 'code_freeze'); const flf = P('orchestrator', 'freeze-list.txt'); const flh = exists(flf) ? sha(flf) : null;
  check('3a the freeze list equals the code_freeze line', !!cf && !!flh && cf.sha256 === flh, String(flh) + ' against ' + (cf ? cf.sha256 : 'no line'));
  const fz = exists(flf) ? freezeMap() : { m: new Map(), images: {} };
  const group = (names) => {
    const bad = []; let n = 0;
    for (const g of names) for (const [rel, hh] of Object.entries(rec[g] || {})) {
      n++; const fl = fz.m.get(norm(path.join(ROOT, rel)));
      if (fl === undefined) bad.push(g + ' ' + rel + ': not in the freeze list');
      else if (fl !== hh) bad.push(g + ' ' + rel + ': record ' + String(hh).slice(0, 12) + ', freeze list ' + fl.slice(0, 12));
      const d = exists(path.join(ROOT, rel)) ? sha(path.join(ROOT, rel)) : null;
      if (d !== hh) bad.push(g + ' ' + rel + ': on disk now ' + (d ? d.slice(0, 12) : 'missing'));
    }
    return { n, bad };
  };
  const g1 = group(['code_sha256', 'pins']);
  check('3b every code and pin hash equals the freeze list and the disk (' + g1.n + ' entries)', g1.n > 0 && !g1.bad.length, g1.bad.slice(0, 8).join('; '));
  const g2 = group(['tuning_inputs']);
  check('3c every tuning input equals the freeze list and the disk (' + g2.n + ' entries)', g2.n > 0 && !g2.bad.length, g2.bad.slice(0, 8).join('; '));
  const tp = P('train', 'report', 'tune.json'); const tr = lastOf(L, 'tune_report');
  const T = exists(tp) ? J(tp) : null; const th = T ? sha(tp) : null;
  check('4a tune.json equals the tune_report line and the record', !!T && !!tr && tr.sha256 === th && (rec.stamp_tune || {}).tune_sha256 === th,
    String(th) + '; line ' + (tr ? tr.sha256 : 'none') + '; record ' + String((rec.stamp_tune || {}).tune_sha256));
  const ARMS = ['E1', 'E2', 'E3', 'E4', 'E5']; const ORDER = ['E3', 'E1', 'E2', 'E4', 'E5']; const cb = [];
  for (const a of ARMS.concat(['PLACEBO'])) {
    const c = P('train', 'selectB', a, 'choices.json'); const ch = exists(c) ? sha(c) : null;
    if (!ch) { cb.push(a + ': no choices.json'); continue; }
    if (!tr || !tr.choices || tr.choices[a] !== ch) cb.push(a + ': the tune_report line has ' + String(((tr || {}).choices || {})[a]).slice(0, 12) + ', the file is ' + ch.slice(0, 12));
    if (a === 'PLACEBO') continue;
    if ((rec.choices_sha256 || {})[a] !== ch) cb.push(a + ': the record has ' + String((rec.choices_sha256 || {})[a]).slice(0, 12) + ', the file is ' + ch.slice(0, 12));
    const fa = ((((T || {}).choices || {})[a]) || {}).final_all65; const ra = (rec.arms || {})[a];
    if (!fa || !ra) { cb.push(a + ': no final_all65 in tune.json or no arm in the record'); continue; }
    if (fa.config_id !== ra.config_id || Number(fa.w) !== Number(ra.w) || !(Math.abs(fa.mean - ra.mean) < 1e-12))
      cb.push(a + ': tune.json ' + [fa.config_id, fa.w, fa.mean].join('/') + ', record ' + [ra.config_id, ra.w, ra.mean].join('/'));
  }
  check('4b the six choices.json hashes and each arm\'s all-65 choice agree (tune_report line, tune.json, record)', !cb.length, cb.join('; '));
  const r4 = (x) => Number(Number(x).toFixed(4));
  const means = {}; for (const a of ARMS) { const fa = ((((T || {}).choices || {})[a]) || {}).final_all65; if (fa && typeof fa.mean === 'number') means[a] = fa.mean; }
  let ok4 = false, det = 'tune.json lacks a final_all65 mean for an arm';
  const c = rec.chosen || {};
  if (Object.keys(means).length === 5) {
    const top = Math.max(...ARMS.map((a) => r4(means[a]))); const tied = ARMS.filter((a) => r4(means[a]) === top);
    const sz = (a) => ((rec.arms || {})[a] || {}).size || [];
    const cmp = (a, b) => { const x = sz(a), y = sz(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] === undefined ? -Infinity : x[i]) - (y[i] === undefined ? -Infinity : y[i]); if (d) return d; } return ORDER.indexOf(a) - ORDER.indexOf(b); };
    const win = [...tied].sort(cmp)[0]; const ra = (rec.arms || {})[c.arm] || {};
    const tg = [...tied].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    ok4 = win === c.arm && c.config_id === ra.config_id && Number(c.w) === Number(ra.w) && c.epochs === ra.epochs && c.figure_all65 === ra.mean
      && JSON.stringify(tg) === JSON.stringify(rec.tie_group_4dp || []);
    det = 'all-65 means in tune.json: ' + ARMS.map((a) => a + ' ' + means[a].toFixed(6)).join(', ') + '; tie group ' + tied.join(',') + '; winner by ruling 57: ' + win
      + '; the record chose ' + [c.arm, c.config_id, 'w ' + c.w, 'epochs ' + c.epochs].join(' ') + ', tie group ' + JSON.stringify(rec.tie_group_4dp);
  }
  check('4c chosen equals the all-65 choice worked out from tune.json', ok4, det);
  const pf = P('train', 'stageB', 'plan.json'); const plan = exists(pf) ? J(pf) : {};
  const pc = ((plan.configs || {})[c.arm] || []).find((x) => x.config_id === c.config_id);
  check('4d the chosen configuration is the plan\'s, with the same settings and epochs', !!pc && pc.epochs === c.epochs && flat(pc.cfg) === flat(c.cfg),
    pc ? 'plan epochs ' + pc.epochs + ', cfg ' + flat(pc.cfg) : 'not in the plan');
  check('4e tune.json: test false, this plan, this tables digest', !!T && T.test === false && T.plan_hash === plan.plan_hash && (T.stamp || {}).tables_digest === rec.tables_digest,
    T ? 'test ' + T.test + ', plan_hash ' + String(T.plan_hash).slice(0, 12) + ', digest ' + String((T.stamp || {}).tables_digest).slice(0, 12) : 'no tune.json');
  check('5 test is false', rec.test === false, String(rec.test));
  check('6 the record names this plan', exists(pf) && rec.plan_hash === plan.plan_hash && rec.plan_sha256 === sha(pf), String(rec.plan_hash).slice(0, 12) + ', plan file ' + String(rec.plan_sha256).slice(0, 12));
  const hd = fs.readdirSync(P('train', 'heldout')).sort();
  check('7 train/heldout holds only the record and its hash file', JSON.stringify(hd) === JSON.stringify(['item27.json', 'item27.json.sha256']), hd.join(' '));
  const prior = allOf(L, 'item27_freeze');
  check('8 no item27_freeze line exists yet (a second anchor needs a ruling)', prior.length === 0, prior.length + ' found');
  const trc = lastOf(L, 'tune_rank_check'); const trf = P('grader-returns', 'tune-rank.json'); const hof = P('train', 'report', 'answer_level', 'handoff', 'HANDOFF.json');
  check('9 the accepted tune_rank_check line names the current return and hand-off and follows the freeze and report lines',
    !!trc && String(trc.status || '').startsWith('accepted') && exists(trf) && trc.sha256 === sha(trf) && exists(hof) && trc.handoff_sha256 === sha(hof)
    && !!cf && !!tr && trc._line > cf._line && trc._line > tr._line, trc ? 'line ' + trc._line + ', status ' + String(trc.status).slice(0, 40) : 'no line');
  check('10 the record\'s image is the frozen card image', !!rec.image_id && rec.image_id === fz.images['graphtest-kge-gpu:1'], String(rec.image_id));
  let extra = '';
  if (!failed && argv.includes('--append')) {
    const line = { step: 'coordinator', unit: 'item27_freeze', file: 'train/heldout/item27.json', sha256: h, t: new Date().toISOString().replace(/\.\d+Z$/, 'Z') };
    fs.appendFileSync(P('progress.jsonl'), JSON.stringify(line) + '\n');
    extra = 'anchor appended: ' + JSON.stringify(line);
  } else if (argv.includes('--append')) extra = 'NOT anchored';
  finish(extra);
}

function heldoutStart(log) {
  if (!log) { console.error('usage: heldout-start <launch log>'); process.exit(2); }
  const L = coordLines(); const an = allOf(L, 'item27_freeze'); const rf = P('train', 'heldout', 'item27.json'); const h = exists(rf) ? sha(rf) : null;
  check('exactly one item27_freeze line, naming the record on disk', an.length === 1 && an[0].sha256 === h && an[0].file === 'train/heldout/item27.json', an.length + ' line(s); record ' + String(h));
  const pf = P('train', 'heldout', 'progress.jsonl'); const starts = [];
  if (exists(pf)) for (const s of fs.readFileSync(pf, 'utf8').split('\n')) { if (!s.trim()) continue; let o; try { o = JSON.parse(s); } catch (e) { continue; } if (o.step === 'heldout' && o.unit === 'start') starts.push(o); }
  check('one or more start lines in train/heldout/progress.jsonl, every one for the anchored record', starts.length >= 1 && starts.every((o) => o.freeze_sha256 === h),
    starts.length + ' start line(s); freeze_sha256 ' + [...new Set(starts.map((o) => String(o.freeze_sha256).slice(0, 12)))].join(','));
  const rcf = P('train', 'heldout', 'heldout.rc'); const rc = exists(rcf) ? fs.readFileSync(rcf, 'utf8').trim() : null;
  check('train/heldout/heldout.rc is 0', rc === '0', String(rc));
  const lf = path.isAbsolute(log) ? log : P(log); const ll = exists(lf) ? fs.readFileSync(lf, 'utf8').split('\n').filter(Boolean) : [];
  const st = ll.filter((s) => / start kge-H1 image /.test(s)); const fin = ll.filter((s) => / finished kge-H1 rc=/.test(s)); const lastFin = fin[fin.length - 1] || '';
  check('the launch log has one or more start lines and its last finished line says rc=0', st.length >= 1 && / finished kge-H1 rc=0( |$)/.test(lastFin),
    st.length + ' start(s), ' + fin.length + ' finished; last: ' + lastFin.slice(0, 150));
  const img = fz_image();
  // the start line reads "start kge-H1 image <ID> cap <CAP> (-m <CAP> --memory-swap <CAP>): <command>" since C50
  check('every start line of the launch log names the frozen card image', st.length >= 1 && !!img && st.every((s) => s.includes(' image ' + img + ' ') || s.includes(' image ' + img + ':')), String(img));
  const caps = [...new Set(st.map((s) => { const m = / cap (\S+) \(-m (\S+) --memory-swap (\S+)\):/.exec(s); return m ? (m[1] === m[2] && m[2] === m[3] ? m[1] : 'MIXED ' + m.slice(1).join('/')) : 'no cap in the line'; }))];
  const wantCap = opt('--cap') || '4g';  // 4g unless a coordinator ruling recorded before the freeze names another (C50)
  check('every start line shows the memory cap ' + wantCap + ' (--cap names a ruled cap; default 4g)', st.length >= 1 && caps.length === 1 && caps[0] === wantCap, 'found: ' + caps.join(', '));
  const hof = P('train', 'heldout', 'HANDOFF.json');
  if (exists(hof)) {
    const H = J(hof); const hh = sha(hof); let al = H.anchor_line; if (typeof al === 'string') { try { al = JSON.parse(al); } catch (e) { al = null; } }
    check('HANDOFF.json carries the anchor line', an.length === 1 && !!al && al.sha256 === an[0].sha256 && al.unit === 'item27_freeze', al ? String(al.sha256) : 'no anchor_line');
    check('the last finished line names this HANDOFF.json', lastFin.includes(hh), hh);
    out.push('info  train/heldout/HANDOFF.json sha256 ' + hh);
  } else check('train/heldout/HANDOFF.json exists', false);
  // The saved mount records are file evidence for what a start line says (a log line can be lost, ruling 106(c)):
  // every record of kge-H1 (the newest and every kept one) shows the frozen card image, the cap and no network.
  const md = P('r58c', 'mounts'); const capBytes = { '4g': 4 * 2 ** 30, '5g': 5 * 2 ** 30, '6g': 6 * 2 ** 30 }[wantCap];
  const recs = exists(md) ? fs.readdirSync(md).filter((f) => /^kge-H1(\.[0-9]{8}T[0-9]{6}Z(-[0-9]+)?)?\.json$/.test(f)).sort() : [];
  const rbad = [];
  for (const f of recs) {
    let x; try { x = J(path.join(md, f)); x = Array.isArray(x) ? x[0] : x; } catch (e) { rbad.push(f + ': does not read'); continue; }
    const hc = (x && x.HostConfig) || {};
    if (!x || x.Image !== img) rbad.push(f + ': image ' + String(x && x.Image).slice(0, 19));
    if (hc.Memory !== capBytes || hc.MemorySwap !== capBytes) rbad.push(f + ': memory ' + hc.Memory + ' / swap ' + hc.MemorySwap + ', wanted ' + capBytes);
    if (hc.NetworkMode !== 'none') rbad.push(f + ': network ' + hc.NetworkMode);
  }
  check('every saved record of kge-H1 shows the frozen card image, the cap ' + wantCap + ' and no network', recs.includes('kge-H1.json') && !!capBytes && !rbad.length,
    recs.length + ' record(s): ' + recs.join(', ') + (rbad.length ? '; ' + rbad.join('; ') : ''));
  finish();
}
function fz_image() { try { return freezeMap().images['graphtest-kge-gpu:1']; } catch (e) { return null; } }

// Ruling 105: a COUNT of score rows whose score field is not a finite number, and of non-finite losses in meta.json
// files, under the given lane-relative folders. It keeps and prints no score value: only counts and file names.
function nonfinite(dirs) {
  if (!dirs.length) { console.error('usage: nonfinite <lane-relative folder> [...]'); process.exit(2); }
  const zlib = require('zlib');
  let total = 0; const seeds = new Set(), parents = new Set();
  for (const d of dirs) {
    const top = P(d); if (!exists(top)) { check(d + ' exists', false); continue; }
    let tables = 0, rows = 0, badRows = 0, metas = 0, badLoss = 0, lossless = 0; const badFiles = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (e.name.endsWith('.tsv.gz')) {
          tables++; let n = 0;
          const lines = zlib.gunzipSync(fs.readFileSync(p)).toString('utf8').split('\n');
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue; rows++;
            const s = lines[i].split('\t')[2];
            if (s === undefined || s === '' || !Number.isFinite(Number(s))) n++;
          }
          if (n) { badRows += n; badFiles.push(path.relative(ROOT, p).replace(/\\/g, '/') + ' (' + n + ')'); }
        } else if (e.name === 'meta.json') {
          const raw = fs.readFileSync(p, 'utf8'); let j = null;
          try { j = JSON.parse(raw.replace(/\bNaN\b/g, 'null').replace(/-?\bInfinity\b/g, 'null')); } catch (err) { j = null; }
          if (!j || !('losses' in j)) continue;  // an assembled set's meta has no loss list
          metas++;
          const flatL = Array.isArray(j.losses) ? j.losses.flat(Infinity) : [];
          if (!flatL.length) { lossless++; continue; }
          const n = flatL.filter((x) => typeof x !== 'number' || !Number.isFinite(x)).length;
          if (n) { badLoss += n; badFiles.push(path.relative(ROOT, p).replace(/\\/g, '/') + ' (' + n + ' losses)'); }
        }
      }
    };
    walk(top);
    total += badRows + badLoss;
    for (const f of badFiles) { const m = /\/s(\d+)\/([0-9a-f]{7,40})\//.exec('/' + f); if (m) { seeds.add(Number(m[1])); parents.add(m[2]); } }
    check(d + ': no score row and no loss that is not a finite number', tables > 0 && badRows === 0 && badLoss === 0,
      tables + ' score tables, ' + rows + ' score rows, ' + badRows + ' not finite; ' + metas + ' loss lists (' + lossless + ' empty), ' + badLoss + ' losses not finite'
      + (badFiles.length ? '; files: ' + badFiles.slice(0, 12).join(', ') : ''));
  }
  // the line of END-ORDER step 8 (write_result.py reads unit nonfinite_heldout: count int, seeds [int], parents [hex])
  out.push('info  line for a held-out count (not written by this script): ' + JSON.stringify({ step: 'coordinator', unit: 'nonfinite_heldout', count: total,
    seeds: [...seeds].sort((a, b) => a - b), parents: [...parents].sort(), t: '<UTC>' }));
  finish();
}

// Ruling 106(b): before the coordinator records the code freeze, every saved record of a TEST run of the step
// launcher (r58c/B/out/mounts-test/*.json) is checked: no mount of a held-out parent's graph folder (nor of export/,
// export/graphs or export/graphs0 whole, which hold them), and no writable mount outside r58c/B/out (so none at,
// under or above a real output folder). The held-out parents come from the plan.
function testRecords(dir) {
  const d = P(dir || path.join('r58c', 'B', 'out', 'mounts-test'));
  const plan = J(P('train', 'stageB', 'plan.json')); const held = new Set(Object.keys((plan.heldout || {}).assignment || {}).map((s) => s.toLowerCase()));
  check('the plan names the held-out parents', held.size > 0, held.size + ' parents');
  const lane = norm(ROOT); const okRw = lane + '/r58c/b/out/';
  if (!exists(d)) { check(dir || 'r58c/B/out/mounts-test' + ' exists', false, 'no such folder (no TEST run of the step launcher was recorded)'); return finish(); }
  const files = fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort(); let mounts = 0; const bad = [];
  for (const f of files) {
    let j; try { j = J(path.join(d, f)); } catch (e) { bad.push(f + ': does not read as JSON'); continue; }
    for (const x of (Array.isArray(j) ? j : [j])) for (const m of ((x && x.Mounts) || [])) {
      mounts++;
      const s = String(m.Source || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
      const rel = s.startsWith(lane + '/') ? s.slice(lane.length + 1) : null;
      if (rel !== null && /^export(\/graphs0?)?$/.test(rel)) bad.push(f + ': mounts ' + rel + ' whole (it holds the held-out parents\' folders)');
      const g = rel !== null ? /^export\/graphs0?\/([^/]+)/.exec(rel) : null;
      if (g && held.has(g[1])) bad.push(f + ': mounts the folder of held-out parent ' + g[1].slice(0, 12));
      if (m.RW && !(s + '/').startsWith(okRw)) bad.push(f + ': a writable mount outside r58c/B/out: ' + (rel !== null ? rel : s) + ' -> ' + m.Destination);
    }
  }
  check('no TEST record of the step launcher shows a held-out parent\'s folder or a writable mount outside r58c/B/out', files.length > 0 && !bad.length,
    files.length + ' records, ' + mounts + ' mounts' + (bad.length ? '; ' + bad.slice(0, 10).join('; ') : ''));
  finish();
}

if (cmd === 'returns') returns(argv[1]);
else if (cmd === 'test-records') testRecords(argv[1] && !argv[1].startsWith('--') ? argv[1] : null);
else if (cmd === 'nonfinite') nonfinite(argv.slice(1).filter((x, i, a) => !x.startsWith('--') && a[i - 1] !== '--root'));
else if (cmd === 'item27') item27();
else if (cmd === 'heldout-start') heldoutStart(argv[1] && !argv[1].startsWith('--') ? argv[1] : null);
else { console.error('usage: node coord_checks.js returns tune|heldout | item27 [--append] | heldout-start <launch log> | nonfinite <folder> [...]   [--root R]'); process.exit(2); }
