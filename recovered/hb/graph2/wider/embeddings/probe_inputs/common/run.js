'use strict';
// Run ONE configuration of ONE arm over a task set and split, writing packed answers to results/.
//   node run.js run --arm <arm> --config <name | 16-hex hash in the arm's lists | config.json> --sets T1 --split tune
//                   [--tasks id,id | --tasks-file <ids file | sweep summary.json> | --tasks-jsonl <TUNE variants>]
//                   [--limit N] [--out dir]
//   node run.js freeze --arm <arm> --config <...> --role primary|s1|s2|crosscheck [--refreeze --reason "<text>"]
//                                                            -> results/frozen/<arm>/<hash>.json
//   node run.js freeze-tq --arm <arm> [--refreeze --reason "<text>"]   -> results/frozen/<arm>/tq.json
//   node run.js lock-check --arm <arm> --config <...> [--sets T1,T2] [--repeat --reason "<text>"]
//   node run.js lock-check --arm <arm> --tq [--repeat --reason "<text>"]
//   node run.js run ... --sets <one set> --split heldout --allow-heldout --frozen-hash <hash> [--repeat --reason "<text>"]
//                                    -> results/heldout/<arm>/<role>[-draw<k>]/<set>.jsonl.gz
//   node run.js tq --arm <arm> [--split tune]               -> results/tq/<arm>.<split>.answers.jsonl (SPEC.md 12)
//   node run.js tq --arm <arm> --split heldout --allow-heldout [--repeat --reason "<text>"]
//                                    -> results/heldout/tq/<arm>.answers.jsonl
//   node run.js canon --parent <sha> [--remove <path>] --out <dir>   (canonical CSV export, SPEC.md 2)
// The held-out lock (protocol addendum 4, B and D) is harness.js lockTest / tqLockTest; every held-out
// invocation, refused or not, appends one line to results/heldout/runs.jsonl.
const fs = require('fs');
const os = require('os');
const path = require('path');
const P = require('./paths');
const C = require('./config');
const H = require('./harness');
const { graphFor, openArm } = require('./arms');
const { exportCanon } = require('./facts');
const { countTokens } = require('./tokenizer');

function args() {
  const a = process.argv.slice(2); const o = { cmd: a[0], sets: ['T1'], split: 'tune', remove: [] };
  for (let i = 1; i < a.length; i++) {
    const k = a[i];
    if (k === '--arm') o.arm = a[++i];
    else if (k === '--config') o.config = a[++i];
    else if (k === '--sets') { o.sets = a[++i].split(','); o.setsGiven = true; }
    else if (k === '--split') o.split = a[++i];
    else if (k === '--allow-heldout') o.allowHeldout = true;
    else if (k === '--frozen-hash') o.frozenHash = a[++i];
    else if (k === '--out') o.out = a[++i];
    else if (k === '--parent') o.parent = a[++i];
    else if (k === '--remove') o.remove.push(a[++i]);
    else if (k === '--limit') o.limit = Number(a[++i]);
    else if (k === '--tasks') o.tasks = a[++i].split(',');
    else if (k === '--tasks-file') o.tasks = readTaskIds(a[++i]);
    else if (k === '--tasks-jsonl') o.tasksJsonl = a[++i];
    else if (k === '--role') o.role = a[++i];
    else if (k === '--repeat') o.repeat = true;
    else if (k === '--reason') o.reason = a[++i];
    else if (k === '--refreeze') o.refreeze = true;
    else if (k === '--tq') o.tq = true;
    else throw new Error('unknown argument ' + k);
  }
  return o;
}

// task ids from a file: one id per line, or JSON lines with an `id` field, or a sweep summary.json
// (its task_ids), so a floor or any single configuration runs on exactly a sweep's task set
function readTaskIds(f) {
  const t = fs.readFileSync(f, 'utf8');
  let whole = null; try { whole = JSON.parse(t); } catch (e) { /* not one JSON document */ }
  if (whole && Array.isArray(whole.task_ids)) return whole.task_ids;
  return t.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => (x.startsWith('{') ? JSON.parse(x).id : x));
}

// a configuration by name or by its 16-hex hash from the arm's stage-1 list (or stage-2 file), else a
// JSON file. Returns the normalised configuration and where it was found.
function findConfig(arm, spec) {
  if (!spec) throw new Error('--config is required');
  const byHash = /^[0-9a-f]{16}$/.test(spec);
  for (const st of [1, 2]) {
    let L = null;
    try { L = H.loadArmList(arm, st, false); } catch (e) { if (!/no sweep\.js|no stage2/.test(e.message)) throw e; }
    const hit = L && L.list.find((c) => (byHash ? c.hash === spec : c.name === spec));
    if (hit) return { cfg: hit.cfg, source: { list: L.kind, stage: st, list_hash: L.hash, name: hit.name } };
  }
  if (byHash) throw new Error('no configuration with hash ' + spec + ' in the lists of arm ' + arm);
  if (!fs.existsSync(spec)) throw new Error('no configuration named ' + spec + ' for arm ' + arm + ', and no such file');
  return { cfg: C.normalise(JSON.parse(fs.readFileSync(spec, 'utf8'))), source: { file: spec } };
}
const loadConfig = (arm, spec) => findConfig(arm, spec).cfg;

const now = () => Number(process.hrtime.bigint()) / 1e6;
const iso = () => new Date().toISOString();

// rank, project, pad and pack every task; writerFor(task) gives the writer of its answer
async function runTasks(armName, cfg, tasks, writerFor) {
  const byParent = new Map();
  for (const t of tasks) { const k = t.parent + '|' + (t.remove_paths || []).join(','); if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(t); }
  for (const [k, ts] of [...byParent].sort()) {
    const G = graphFor(k.split('|')[0], ts[0].remove_paths || []);
    const arm = await openArm(armName, G);
    for (const t of ts) {
      const sm = H.mapSeed(G, t.seed);
      const s = now();
      const r = sm.ids.length ? await arm.rank(sm.ids, cfg, t.seed) : [];
      const a = H.answer(G, t, sm, r, cfg, armName, now() - s);
      writerFor(t).write(a);
    }
    await arm.close();
  }
  return byParent.size;
}

async function runCmd(o) {
  if (o.split === 'heldout') return heldoutRun(o);
  const cfg = loadConfig(o.arm, o.config);
  const hash = C.configHash(cfg);
  const lock = H.checkSplit(o.split, cfg, o, o.arm); // tune: null; anything else is refused or routed above
  let tasks;
  if (o.tasksJsonl) tasks = H.loadTuneVariants(o.tasksJsonl, o.sets); // TUNE only (removed-document dry run)
  else tasks = H.loadTasks(o.sets, o.split, lock);
  if (o.tasks) { const want = new Set(o.tasks); tasks = tasks.filter((t) => want.has(t.id)); }
  if (o.limit) tasks = tasks.slice(0, o.limit);
  const outRoot = o.out || P.RESULTS;
  const writers = new Map();
  const W = (t) => {
    if (!writers.has(t.set)) writers.set(t.set, new H.GzWriter(path.join(outRoot, o.arm, o.split, hash + '.' + t.set + '.jsonl.gz')));
    return writers.get(t.set);
  };
  await runTasks(o.arm, cfg, tasks, W);
  for (const w of writers.values()) await w.close();
  console.log(JSON.stringify({ arm: o.arm, hash, split: o.split, sets: o.sets, tasks: tasks.length }));
}

// ---- held-out runs (addendum 4, D) ---------------------------------------------------------------
// The results root must be the build's own (GT_RESULTS may not point elsewhere), the output path is
// fixed, and one invocation runs one whole set.
function rootRefusal() {
  if (path.resolve(P.RESULTS) !== path.resolve(P.BUILD, 'results')) return 'GT_RESULTS points to ' + P.RESULTS + '; a held-out run reads its frozen records from and writes its answers to <GT_BUILD>/results only';
  return null;
}

async function heldoutRun(o) {
  const root = P.RESULTS;
  const log = { at_start: iso(), at_end: null, arm: o.arm || null, hash: null, role: null, set: (o.sets || []).join(','), draw: null, n_tasks: null,
    exit: null, repeat: null, reason: o.reason || null, out: null, code_hash: null, argv: process.argv.slice(2), host: os.hostname() };
  const refuse = (msg) => {
    if (!rootRefusal()) H.appendRun(root, { ...log, at_end: iso(), exit: 'refused', refusal: msg });
    throw new Error('REFUSED: ' + msg);
  };
  const rr = rootRefusal(); if (rr) refuse(rr);
  if (!o.arm) refuse('--arm is required');
  if (!o.allowHeldout) refuse('held-out split needs --allow-heldout and --frozen-hash');
  if (o.out || o.limit || o.tasks || o.tasksJsonl) refuse('a held-out run covers a whole set and writes to the fixed layout: --out, --limit, --tasks, --tasks-file and --tasks-jsonl are not allowed');
  if (!o.setsGiven || o.sets.length !== 1) refuse('a held-out run takes exactly one set (--sets T1), so each invocation writes one answer file and one log line');
  const set = o.sets[0];
  const st = H.setTest(set); if (st) refuse(st);
  let cfg;
  try { cfg = loadConfig(o.arm, o.config); } catch (e) { refuse(e.message); }
  log.hash = C.configHash(cfg);
  if (!o.frozenHash || o.frozenHash !== log.hash) refuse('--frozen-hash ' + o.frozenHash + ' does not match the configuration hash ' + log.hash);
  const t = H.lockTest(o.arm, cfg, { root });
  log.role = t.role || null; log.draw = t.draw == null ? null : t.draw; log.code_hash = t.code_hash || null;
  if (!t.allowed) refuse(t.reason);
  log.out = H.heldoutOut(o.arm, t.role, log.hash, set, t.draw);
  const ot = H.outputTest(root, log.out, o);
  if (ot.refusal) refuse(ot.refusal);
  log.repeat = ot.repeat;
  const lock = H.checkSplit('heldout', cfg, o, o.arm, root); // the same lock test once more; returns the token
  const tasks = H.loadTasks([set], 'heldout', lock);
  if (!tasks.length) refuse('set ' + set + ' has no held-out task');
  log.n_tasks = tasks.length;
  log.superseded = H.beginHeldout(root, log.out, { arm: o.arm, hash: log.hash, role: t.role, set, draw: t.draw, repeat: log.repeat, host: log.host });
  const w = new H.GzWriter(path.join(root, log.out));
  try {
    log.parents = await runTasks(o.arm, cfg, tasks, () => w);
    await w.close();
    log.exit = 'ok';
  } catch (e) {
    log.exit = 'error'; log.error = String(e.message || e); log.at_end = iso();
    H.appendRun(root, log); H.endHeldout(root, log.out);
    throw e;
  }
  log.at_end = iso();
  H.appendRun(root, log); H.endHeldout(root, log.out);
  console.log(JSON.stringify({ arm: o.arm, hash: log.hash, role: t.role, draw: t.draw, split: 'heldout', set, tasks: tasks.length, out: log.out, repeat: log.repeat }));
}

async function answerQuestions(arm, qs) {
  const G = graphFor(P.FROZEN);
  const a = await openArm(arm, G);
  if (!a.tq) throw new Error('arm ' + arm + ' has no tq()');
  const out = [];
  for (const q of qs) {
    const s = now(); let r; let err = null;
    try { r = await a.tq(q); } catch (e) { err = String(e.message || e); r = null; }
    const ms = now() - s;
    const ansObj = r && typeof r === 'object' && !Array.isArray(r) && 'answer' in r ? r : { answer: r };
    const ans = ansObj.answer == null ? [] : ansObj.answer;
    out.push({ id: q.id, answer: ans, tokens: ansObj.tokens != null ? ansObj.tokens : countTokens(JSON.stringify(ans)),
      lookups: ansObj.lookups != null ? ansObj.lookups : 1, ms: +ms.toFixed(3), arm, error: err });
  }
  await a.close();
  return out;
}
const readQuestions = (split) => fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === split);

async function tqCmd(o) {
  const split = o.split === 'heldout' || o.split === 'held_out' ? 'held_out' : o.split;
  if (split === 'held_out') return tqHeldout(o);
  if (split !== 'tune') throw new Error('unknown split ' + o.split);
  const out = await answerQuestions(o.arm, readQuestions(split));
  const f = path.join(o.out || P.RESULTS, 'tq', o.arm + '.' + split + '.answers.jsonl');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, out.map((x) => JSON.stringify(x)).join('\n') + '\n');
  console.log(JSON.stringify({ arm: o.arm, split, questions: out.length, errors: out.filter((x) => x.error).length, file: f }));
}

async function tqHeldout(o) {
  const root = P.RESULTS;
  const log = { at_start: iso(), at_end: null, arm: o.arm || null, hash: null, role: 'tq', set: 'TQ', draw: null, n_tasks: null,
    exit: null, repeat: null, reason: o.reason || null, out: null, code_hash: null, argv: process.argv.slice(2), host: os.hostname() };
  const refuse = (msg) => {
    if (!rootRefusal()) H.appendRun(root, { ...log, at_end: iso(), exit: 'refused', refusal: msg });
    throw new Error('REFUSED: ' + msg);
  };
  const rr = rootRefusal(); if (rr) refuse(rr);
  if (!o.allowHeldout) refuse('held-out TQ needs --allow-heldout and a frozen question code (run.js freeze-tq)');
  if (o.out) refuse('held-out TQ writes to the fixed layout: --out is not allowed');
  const t = H.tqLockTest(o.arm, { root });
  log.code_hash = t.code_hash || null; log.draw = t.draw == null ? null : t.draw;
  if (!t.allowed) refuse(t.reason);
  log.out = H.tqOut(o.arm);
  const ot = H.outputTest(root, log.out, o);
  if (ot.refusal) refuse(ot.refusal);
  log.repeat = ot.repeat;
  const qs = readQuestions('held_out');
  if (!qs.length) refuse('no held-out question');
  log.n_tasks = qs.length;
  log.superseded = H.beginHeldout(root, log.out, { arm: o.arm, role: 'tq', set: 'TQ', repeat: log.repeat, host: log.host });
  const f = path.join(root, log.out);
  let out;
  try {
    out = await answerQuestions(o.arm, qs);
    fs.writeFileSync(f + '.part', out.map((x) => JSON.stringify(x)).join('\n') + '\n');
    fs.renameSync(f + '.part', f);
    log.exit = 'ok'; log.errors = out.filter((x) => x.error).length;
  } catch (e) {
    log.exit = 'error'; log.error = String(e.message || e); log.at_end = iso();
    H.appendRun(root, log); H.endHeldout(root, log.out);
    throw e;
  }
  log.at_end = iso();
  H.appendRun(root, log); H.endHeldout(root, log.out);
  console.log(JSON.stringify({ arm: o.arm, split: 'held_out', questions: out.length, errors: log.errors, file: log.out, repeat: log.repeat }));
}

// ---- freezing (addendum 4, D.13) -----------------------------------------------------------------
function freezeGuard(o) {
  const root = P.RESULTS;
  if (fs.existsSync(H.scoringFlag(root))) throw new Error('REFUSED: results/heldout/SCORING_STARTED exists; nothing may be frozen again (addendum 4 item 12)');
  if (o.refreeze && !(o.reason && o.reason.trim())) throw new Error('REFUSED: --refreeze needs --reason "<text>"');
  return root;
}
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
function writeRecord(root, f, rec, o) {
  const rel = path.relative(root, f).split(path.sep).join('/');
  if (fs.existsSync(f)) {
    const old = JSON.parse(fs.readFileSync(f, 'utf8'));
    const same = ['arm', 'hash', 'role', 'code_hash', 'deps_hash'].every((k) => (old[k] || null) === (rec[k] || null)) && JSON.stringify(old.config || null) === JSON.stringify(rec.config || null);
    if (same) { console.log('already frozen, unchanged: ' + rel); return false; }
    if (!o.refreeze) throw new Error('REFUSED: ' + rel + ' exists and differs (' + ['role', 'code_hash', 'deps_hash'].filter((k) => (old[k] || null) !== (rec[k] || null)).join(', ') + '); a new freeze needs --refreeze --reason "<text>"');
    const to = path.join(root, 'frozen', '_replaced', rel.replace(/^frozen\//, '') + '.' + stamp());
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(f, to);
    rec.replaces = path.relative(root, to).split(path.sep).join('/');
    rec.refreeze_reason = o.reason;
  }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(rec, null, 1) + '\n');
  fs.appendFileSync(path.join(root, 'frozen', 'freeze_log.jsonl'), JSON.stringify({ at: rec.frozen_at, file: rel, arm: rec.arm, hash: rec.hash || null, role: rec.role, code_hash: rec.code_hash, deps_hash: rec.deps_hash, refreeze_reason: rec.refreeze_reason || null }) + '\n');
  return true;
}

function freezeCmd(o) {
  const root = freezeGuard(o);
  if (!H.ROLES.includes(o.role)) throw new Error('REFUSED: --role must be one of ' + H.ROLES.join(', '));
  if (o.arm === 'reference' && o.role !== 'crosscheck') throw new Error('REFUSED: the reference arm runs only for the equivalence check (role crosscheck; addendum 4 item 5)');
  if (o.arm !== 'reference' && o.role === 'crosscheck') throw new Error('REFUSED: role crosscheck is the reference arm\'s role');
  const { cfg, source } = findConfig(o.arm, o.config);
  const hash = C.configHash(cfg);
  const dir = path.join(root, 'frozen', o.arm);
  if (o.role !== 'crosscheck' && fs.existsSync(dir)) {
    for (const g of fs.readdirSync(dir).filter((x) => /^[0-9a-f]{16}\.json$/.test(x) && x !== hash + '.json')) {
      const r = JSON.parse(fs.readFileSync(path.join(dir, g), 'utf8'));
      if (r.role === o.role) throw new Error('REFUSED: arm ' + o.arm + ' already has role ' + o.role + ' frozen for configuration ' + r.hash + ' (one configuration per role and arm)');
    }
  }
  const code = H.codeState(o.arm);
  const rec = { arm: o.arm, hash, role: o.role, config: cfg, config_source: source, ...code, node: process.version, frozen_at: iso() };
  const wrote = writeRecord(root, H.frozenFile(root, o.arm, hash), rec, o);
  if (wrote) console.log('frozen', o.arm, hash, o.role, 'code_hash', code.code_hash.slice(0, 16), 'deps_hash', code.deps_hash.slice(0, 16));
}

function freezeTqCmd(o) {
  const root = freezeGuard(o);
  const code = H.codeState(o.arm);
  const rec = { arm: o.arm, role: 'tq', ...code, node: process.version, frozen_at: iso() };
  const wrote = writeRecord(root, H.tqFrozenFile(root, o.arm), rec, o);
  if (wrote) console.log('frozen tq', o.arm, 'code_hash', code.code_hash.slice(0, 16), 'deps_hash', code.deps_hash.slice(0, 16));
}

// ---- lock-check: exactly the held-out lock test, reads no task and no question --------------------
function lockCheckCmd(o) {
  const root = P.RESULTS;
  let res;
  const rr = rootRefusal();
  if (o.tq) {
    res = rr ? { arm: o.arm, tq: true, allowed: false, reason: rr } : H.tqLockTest(o.arm, { root });
    if (res.allowed) {
      res.out = H.tqOut(o.arm);
      const ot = H.outputTest(root, res.out, o);
      if (ot.refusal) { res.allowed = false; res.reason = ot.refusal; } else res.repeat = ot.repeat;
    }
  } else {
    const cfg = loadConfig(o.arm, o.config);
    res = rr ? { arm: o.arm, hash: C.configHash(cfg), allowed: false, reason: rr } : H.lockTest(o.arm, cfg, { root });
    if (res.allowed && o.setsGiven) {
      res.sets = {};
      for (const s of o.sets) {
        const st = H.setTest(s);
        if (st) { res.sets[s] = { allowed: false, reason: st }; continue; }
        const out = H.heldoutOut(o.arm, res.role, res.hash, s, res.draw);
        const ot = H.outputTest(root, out, o);
        res.sets[s] = ot.refusal ? { allowed: false, out, reason: ot.refusal } : { allowed: true, out, repeat: ot.repeat };
      }
      const bad = Object.entries(res.sets).filter(([, v]) => !v.allowed);
      if (bad.length) { res.allowed = false; res.reason = bad.map(([k, v]) => k + ': ' + v.reason).join(' | '); }
    }
  }
  console.log(JSON.stringify(res));
  console.log(res.allowed ? 'allowed' : 'refused: ' + res.reason);
  process.exitCode = res.allowed ? 0 : 3;
}

// Reference answers are hidden from every arm process (addendum 4 item 11). Pre-flight fix round 1: the
// runner no longer relies on the operator alone; `run` and `tq` refuse while <build>/sealed lists any
// entry (inside graphtest:1 an empty tmpfs is mounted over /build/sealed). A folder that cannot be
// listed counts as hidden.
function sealedVisible() {
  try { return fs.readdirSync(path.join(P.BUILD, 'sealed')).length > 0; } catch (e) { return false; }
}

async function main() {
  const o = args();
  if ((o.cmd === 'run' || o.cmd === 'tq') && sealedVisible()) throw new Error('REFUSED: ' + path.join(P.BUILD, 'sealed') + ' is visible to this process (it lists entries); run inside graphtest:1 with --mount type=tmpfs,destination=/build/sealed (addendum 4 item 11)');
  if (o.cmd === 'canon') {
    const G = graphFor(o.parent, o.remove);
    console.log(JSON.stringify(exportCanon(G, o.out), null, 1)); return;
  }
  if (!o.arm) throw new Error('--arm is required');
  if (o.cmd === 'freeze') return freezeCmd(o);
  if (o.cmd === 'freeze-tq') return freezeTqCmd(o);
  if (o.cmd === 'lock-check') return lockCheckCmd(o);
  if (o.cmd === 'tq') return tqCmd(o);
  if (o.cmd === 'run') return runCmd(o);
  throw new Error('usage: run.js run|freeze|freeze-tq|lock-check|tq|canon ...');
}

main().catch((e) => { console.error(String(e.message || e)); process.exit(2); });
