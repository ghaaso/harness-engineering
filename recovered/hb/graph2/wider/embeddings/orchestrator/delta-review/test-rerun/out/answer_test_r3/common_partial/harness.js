'use strict';
// Harness core: tasks, the held-out lock, per-arm sweep lists, answer records, gzip JSONL writers.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const P = require('./paths');
const C = require('./config');
const { mapSeed } = require('./seed');
const { project, withTail, pack } = require('./packer');

// ---- the held-out lock (protocol addendum 4, sections B and D) ----------------------------------
// loadTasks() refuses split "heldout" unless it is handed the token checkSplit() returns. checkSplit()
// returns it only when lockTest() allows the run:
//   - results/heldout/SCORING_STARTED does not exist (D.12: once scoring began nothing runs again);
//   - results/frozen/<arm>/<config hash>.json exists (written by `run.js freeze --arm --config --role`),
//     names this arm and this hash, its configuration hashes to that hash, its role is one of ROLES;
//   - the code hash now equals the frozen one (D.13): sha256 over arms/<arm>/*.js and arms/common/*.js,
//     and, separately, the files of other arm folders that the arm's code requires (deps_hash; for
//     example arms/ladybug/tq.js requires arms/relational/tq.js);
//   - the LadybugDB community draw switch (LB_COMM_DRAW = 1..4) is used only by the ladybug arm and
//     only with a configuration that ranks with the community prior (x_comm).
// The run command adds the flags (--allow-heldout and --frozen-hash equal to the hash) and the
// per-set checks (setTest: T5 is never run; outputTest: an existing answer or an earlier attempt needs
// --repeat --reason). `run.js lock-check` prints exactly these tests without reading any task.
const LOCK = Symbol('heldout-lock');
const ROLES = ['primary', 's1', 's2', 'crosscheck'];
const HELDOUT_SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const NOT_RUN_SETS = {
  T5: 'set T5 is not run (protocol addendum 4 item 7: its seeds are free-text searches, no tuned text-to-seed step exists, and an untuned one would handicap the typed arms)',
};
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const rel = (root, f) => path.relative(root, f).split(path.sep).join('/');

// the code an arm runs: arms/<arm>/*.js and arms/common/*.js (code_hash, exactly addendum 4 D.13), plus
// the files of OTHER arm folders that the arm's files require, followed transitively (deps_hash)
function armJsFiles(dirName) {
  const dir = path.join(P.ARMS, dirName);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js') && fs.statSync(path.join(dir, f)).isFile()).map((f) => dirName + '/' + f);
}
function digestFiles(rels) {
  const files = {};
  for (const r of [...rels].sort()) files[r] = sha256(fs.readFileSync(path.join(P.ARMS, r)));
  return { hash: sha256(Object.entries(files).map(([r, s]) => r + ' ' + s + '\n').join('')), files };
}
const REQ_RE = /require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;
function crossDeps(arm) {
  const seen = new Set(); const out = new Set(); const stack = armJsFiles(arm);
  while (stack.length) {
    const r = stack.pop();
    if (seen.has(r)) continue;
    seen.add(r);
    for (const m of fs.readFileSync(path.join(P.ARMS, r), 'utf8').matchAll(REQ_RE)) {
      let t = path.posix.normalize(path.posix.join(path.posix.dirname(r), m[1]));
      if (!t.endsWith('.js') && !t.endsWith('.json')) t += '.js';
      const top = t.split('/')[0];
      if (top === arm || top === 'common' || t.startsWith('..')) continue;
      if (!fs.existsSync(path.join(P.ARMS, t))) throw new Error('arm ' + arm + ': ' + r + ' requires ' + t + ', which does not exist');
      out.add(t); stack.push(t);
    }
  }
  return [...out].sort();
}
// runtime inputs that are not .js files (pre-flight fix round 1): *.sql and stage2.json in the arm's own
// folder and in every other arm folder its code requires (today relational/schema.sql and the stage-2
// lists). They go into deps_hash. arms/ladybug/priors/ is NOT hashed: held-out runs add a prior file per
// new canonical graph by design, so a hash over it would refuse the second held-out set.
function dataFiles(arm, deps) {
  const out = [];
  for (const d of new Set([arm, ...deps.map((x) => x.split('/')[0])])) {
    const dir = path.join(P.ARMS, d);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if ((f.endsWith('.sql') || f === 'stage2.json') && fs.statSync(path.join(dir, f)).isFile()) out.push(d + '/' + f);
  }
  return out;
}
function codeState(arm) {
  armDir(arm);
  if (!fs.existsSync(path.join(P.ARMS, arm, 'arm.js'))) throw new Error('unknown arm ' + arm + ' (no arms/' + arm + '/arm.js)');
  const code = digestFiles([...armJsFiles(arm), ...armJsFiles('common')]);
  const dl = crossDeps(arm);
  const deps = digestFiles([...dl, ...dataFiles(arm, dl)]);
  return { code_hash: code.hash, code_files: code.files, deps_hash: deps.hash, deps_files: deps.files };
}
function diffFiles(a = {}, b = {}) {
  const out = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(k in a)) out.push('added ' + k); else if (!(k in b)) out.push('removed ' + k); else if (a[k] !== b[k]) out.push('changed ' + k);
  }
  return out.sort();
}

const frozenFile = (root, arm, hash) => path.join(root, 'frozen', armName(arm), hash + '.json');
const tqFrozenFile = (root, arm) => path.join(root, 'frozen', armName(arm), 'tq.json');
const heldoutDir = (root) => path.join(root, 'heldout');
const scoringFlag = (root) => path.join(heldoutDir(root), 'SCORING_STARTED');
function armName(arm) { if (!/^[a-z0-9_-]+$/.test(arm || '')) throw new Error('bad arm name ' + arm); return arm; }
const usesComm = (cfg) => JSON.stringify(cfg.rank || {}).includes('"x_comm"');

// LB_COMM_DRAW (arms/ladybug/store.js): 0 or unset = the stored community prior; 1..4 = a further draw
function commDraw(arm, env = process.env) {
  const v = env.LB_COMM_DRAW == null ? '' : String(env.LB_COMM_DRAW).trim();
  if (v === '' || v === '0') return { draw: 0 };
  if (arm !== 'ladybug') return { draw: 0, refusal: 'LB_COMM_DRAW=' + v + ' is set, but only the ladybug arm has community draws; unset it' };
  const d = Number(v);
  if (!Number.isInteger(d) || d < 1 || d > 4) return { draw: 0, refusal: 'LB_COMM_DRAW must be 0 to 4 (got ' + v + ')' };
  return { draw: d };
}

function checkCode(rec, now) {
  if (now.code_hash !== rec.code_hash) return 'the code changed since the freeze (code_hash frozen ' + String(rec.code_hash).slice(0, 16) + ', now ' + now.code_hash.slice(0, 16) + '; ' + diffFiles(rec.code_files, now.code_files).join(', ') + ')';
  if ((rec.deps_hash || null) !== now.deps_hash) return 'a file of another arm that this arm requires changed since the freeze (deps_hash frozen ' + String(rec.deps_hash).slice(0, 16) + ', now ' + now.deps_hash.slice(0, 16) + '; ' + diffFiles(rec.deps_files, now.deps_files).join(', ') + ')';
  return null;
}

// The lock test for one (arm, configuration) on split heldout. Reads no task and no question.
function lockTest(arm, cfg, { root = P.RESULTS, env = process.env } = {}) {
  const hash = C.configHash(cfg);
  const base = { arm, hash, allowed: false };
  const no = (reason) => ({ ...base, reason });
  if (fs.existsSync(scoringFlag(root))) return no('results/heldout/SCORING_STARTED exists: the grader has begun scoring, so no held-out run is allowed any more (addendum 4 item 12)');
  const f = frozenFile(root, arm, hash);
  if (!fs.existsSync(f)) return no('configuration ' + hash + ' was never frozen for arm ' + arm + ' (results/frozen/' + arm + '/' + hash + '.json missing; run.js freeze --arm ' + arm + ' --config ' + hash + ' --role <role>)');
  let rec;
  try { rec = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return no('frozen record ' + rel(root, f) + ' is not valid JSON'); }
  if (rec.arm !== arm) return no('frozen record ' + rel(root, f) + ' names arm ' + rec.arm + ', not ' + arm);
  if (rec.hash !== hash) return no('frozen record ' + rel(root, f) + ' names hash ' + rec.hash + ', not ' + hash);
  let rh = null;
  try { rh = C.configHash(rec.config); } catch (e) { rh = 'invalid (' + e.message + ')'; }
  if (rh !== hash) return no('the configuration inside ' + rel(root, f) + ' hashes to ' + rh + ', not ' + hash);
  if (!ROLES.includes(rec.role)) return no('frozen record ' + rel(root, f) + ' has role ' + rec.role + ', not one of ' + ROLES.join(', '));
  let now;
  try { now = codeState(arm); } catch (e) { return no(e.message); }
  const bad = checkCode(rec, now);
  if (bad) return no(bad);
  const d = commDraw(arm, env);
  if (d.refusal) return no(d.refusal);
  if (d.draw && !usesComm(rec.config)) return no('LB_COMM_DRAW=' + d.draw + ' is set, but configuration ' + hash + ' does not rank with the community prior (x_comm), so a draw would only duplicate draw 0');
  return { ...base, allowed: true, reason: null, role: rec.role, draw: d.draw, code_hash: now.code_hash, deps_hash: now.deps_hash, record: rel(root, f) };
}

// The lock test for the held-out questions of one arm (addendum 4 item 6).
function tqLockTest(arm, { root = P.RESULTS, env = process.env } = {}) {
  const base = { arm, tq: true, allowed: false };
  const no = (reason) => ({ ...base, reason });
  if (fs.existsSync(scoringFlag(root))) return no('results/heldout/SCORING_STARTED exists: the grader has begun scoring, so no held-out run is allowed any more (addendum 4 item 12)');
  // the question hold of the run plan (pre-flight fix round 2): enforced here, not only by the plan's text
  let plan = null; try { plan = JSON.parse(fs.readFileSync(path.join(root, 'frozen', 'PLAN.json'), 'utf8')); } catch (e) { plan = null; }
  if (plan && plan.tq_hold && plan.tq_hold.hold === true) return no('results/frozen/PLAN.json has tq_hold.hold = true: no question run until the orchestrator lifts the hold');
  const f = tqFrozenFile(root, arm);
  if (!fs.existsSync(f)) return no('the question code of arm ' + arm + ' was never frozen (results/frozen/' + arm + '/tq.json missing; run.js freeze-tq --arm ' + arm + ')');
  let rec;
  try { rec = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return no('frozen record ' + rel(root, f) + ' is not valid JSON'); }
  if (rec.arm !== arm) return no('frozen record ' + rel(root, f) + ' names arm ' + rec.arm + ', not ' + arm);
  let now;
  try { now = codeState(arm); } catch (e) { return no(e.message); }
  const bad = checkCode(rec, now);
  if (bad) return no(bad);
  const d = commDraw(arm, env);
  if (d.refusal) return no(d.refusal);
  if (d.draw) return no('LB_COMM_DRAW=' + d.draw + ' is set; community draws apply to rankings only, never to the questions');
  return { ...base, allowed: true, reason: null, role: 'tq', draw: 0, code_hash: now.code_hash, deps_hash: now.deps_hash, record: rel(root, f) };
}

// A set may be run on held-out only when it is one of the declared sets (addendum 4 item 5).
function setTest(set) {
  if (NOT_RUN_SETS[set]) return NOT_RUN_SETS[set];
  if (!HELDOUT_SETS.includes(set)) return 'set ' + set + ' is not a declared held-out set (' + HELDOUT_SETS.join(', ') + ')';
  return null;
}

// Output layout (addendum 4 item D): results/heldout/<arm>/<role>[-draw<k>]/<set>.jsonl.gz, where a
// cross-check role carries its hash (the reference arm runs two configurations under that role);
// questions: results/heldout/tq/<arm>.answers.jsonl.
function heldoutOut(arm, role, hash, set, draw) {
  let dir = role === 'crosscheck' ? 'crosscheck-' + hash : role;
  if (draw) dir += '-draw' + draw;
  return 'heldout/' + armName(arm) + '/' + dir + '/' + set + '.jsonl.gz';
}
const tqOut = (arm) => 'heldout/tq/' + armName(arm) + '.answers.jsonl';
const runsFile = (root) => path.join(heldoutDir(root), 'runs.jsonl');
const markerFile = (root, out) => path.join(heldoutDir(root), '_running', out.replace(/\//g, '__') + '.json');
function readRuns(root) {
  const f = runsFile(root);
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return { bad_line: l }; } });
}
// Earlier attempts at one output: logged runs that were not refused, a marker left by a run that never
// finished (killed), the answer file, or its unfinished .part.
function priorAttempts(root, out) {
  const runs = readRuns(root).filter((r) => r.out === out && r.exit !== 'refused');
  const marker = fs.existsSync(markerFile(root, out));
  const file = fs.existsSync(path.join(root, out));
  const part = fs.existsSync(path.join(root, out + '.part'));
  return { runs: runs.length, marker, file, part, any: runs.length > 0 || marker || file || part };
}
function outputTest(root, out, flags = {}) {
  const pa = priorAttempts(root, out);
  if (pa.any && !flags.repeat) {
    const what = [pa.file && 'the answer file exists', pa.part && 'an unfinished .part file exists', pa.marker && 'an attempt never finished (marker in heldout/_running/)', pa.runs && pa.runs + ' earlier attempt(s) are logged in heldout/runs.jsonl'].filter(Boolean).join('; ');
    return { refusal: out + ': ' + what + '; a repeat needs --repeat --reason "<text>" (addendum 4 item 12)', prior: pa };
  }
  if (flags.repeat && !pa.any) return { refusal: out + ': --repeat was given but there is no earlier attempt to repeat', prior: pa };
  if (flags.repeat && !(flags.reason && String(flags.reason).trim())) return { refusal: out + ': --repeat needs --reason "<text>"', prior: pa };
  return { refusal: null, prior: pa, repeat: flags.repeat ? pa.runs + (pa.marker ? 1 : 0) : 0 };
}
function appendRun(root, line) {
  fs.mkdirSync(heldoutDir(root), { recursive: true });
  fs.appendFileSync(runsFile(root), JSON.stringify(line) + '\n');
}
// Start an allowed held-out run: move what an earlier attempt left to heldout/_superseded/ and write the
// running marker. Returns what was moved.
function beginHeldout(root, out, info) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const moved = [];
  const sup = (f, tag) => {
    if (!fs.existsSync(f)) return;
    const to = path.join(heldoutDir(root), '_superseded', out.replace(/^heldout\//, '') + '.' + stamp + tag);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(f, to);
    moved.push(rel(root, to));
  };
  sup(path.join(root, out), '');
  sup(path.join(root, out + '.part'), '.part');
  sup(markerFile(root, out), '.marker.json');
  fs.mkdirSync(path.dirname(markerFile(root, out)), { recursive: true });
  fs.writeFileSync(markerFile(root, out), JSON.stringify({ ...info, out, started: new Date().toISOString() }));
  fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });
  return moved;
}
function endHeldout(root, out) { const m = markerFile(root, out); if (fs.existsSync(m)) fs.unlinkSync(m); }

function checkSplit(split, cfg, flags, arm, root = P.RESULTS) {
  if (split === 'tune') return null;
  if (split !== 'heldout') throw new Error('unknown split ' + split);
  if (!flags.allowHeldout) throw new Error('REFUSED: held-out split needs --allow-heldout and --frozen-hash');
  const h = C.configHash(cfg);
  if (!flags.frozenHash || flags.frozenHash !== h) throw new Error('REFUSED: --frozen-hash ' + flags.frozenHash + ' does not match the configuration hash ' + h);
  const t = lockTest(arm, cfg, { root });
  if (!t.allowed) throw new Error('REFUSED: ' + t.reason);
  return LOCK;
}

function loadTasks(sets, split, lock) {
  if (split !== 'tune' && lock !== LOCK) throw new Error('REFUSED: tasks of split ' + split + ' are locked (held-out lock)');
  if (split !== 'tune') for (const s of sets) { const r = setTest(s); if (r) throw new Error('REFUSED: ' + r); }
  const all = fs.readFileSync(path.join(P.TASKS, 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  return all.filter((t) => sets.includes(t.set) && t.split === split && t.seed && t.seed.path);
}

// TUNE task variants (addendum 4 item 14, the removed-document dry run): a JSON-lines file whose every
// line is a TUNE task of tasks.jsonl with the same id, set, split, parent and seed, and at most one
// added field, remove_paths (non-empty strings). Anything else is refused, so this can never carry a
// held-out task.
function loadTuneVariants(file, sets) {
  const base = new Map(fs.readFileSync(path.join(P.TASKS, 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((t) => t.split === 'tune').map((t) => [t.id, t]));
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim())) {
    const v = JSON.parse(line); const b = base.get(v.id);
    if (!b) throw new Error('REFUSED: task variant ' + v.id + ' is not a TUNE task of tasks.jsonl');
    for (const k of Object.keys(v)) if (!['id', 'set', 'split', 'parent', 'seed', 'remove_paths'].includes(k)) throw new Error('REFUSED: task variant ' + v.id + ' has field ' + k);
    if (v.split !== 'tune' || v.set !== b.set || v.parent !== b.parent || JSON.stringify(v.seed) !== JSON.stringify(b.seed)) throw new Error('REFUSED: task variant ' + v.id + ' differs from its TUNE task in more than remove_paths');
    if (v.remove_paths != null && !(Array.isArray(v.remove_paths) && v.remove_paths.every((p) => typeof p === 'string' && p))) throw new Error('REFUSED: task variant ' + v.id + ' has a bad remove_paths');
    if (b.remove_paths) throw new Error('REFUSED: TUNE task ' + v.id + ' already has remove_paths');
    if (!sets || sets.includes(v.set)) out.push(v);
  }
  return out;
}

// ---- per-arm sweep lists ------------------------------------------------------------------------
// arms/<arm>/sweep.js exports BASE and STAGE1 (exactly 40 named configurations); an optional
// arms/<arm>/stage2.json holds exactly 20 more. Any other size is refused. The hash of each list is
// the sha256 (16 hex) of the canonical form of its normalised configurations, logged on every load.
// A floor arm (arms/floor-*) has no sweep.js: its whole list is arms/<floor>/configs.js CONFIGS, exactly
// 8 entries (granularity x form, pad fixed), accepted as its stage-1 list so that sweep.js runs the
// floors on exactly the task set of the swept arms (addendum 3, D.12). A floor has no stage 2.
const LIST_SIZE = { 1: 40, 2: 20 };
const FLOOR_SIZE = 8;
const isFloor = (arm) => /^floor-[a-z0-9_-]+$/.test(arm);
const armDir = (arm) => {
  if (!/^[a-z0-9_-]+$/.test(arm)) throw new Error('bad arm name ' + arm);
  return path.join(P.ARMS, arm);
};

// Validate one list: exact size, unique names, unique configurations, every entry normalisable.
function validateList(arm, stage, list, want) {
  if (!Array.isArray(list) || list.length !== want) throw new Error('REFUSED: arm ' + arm + ' stage ' + stage + ' list has ' + (Array.isArray(list) ? list.length : 0) + ' configurations, must be exactly ' + want);
  const names = new Set();
  const out = list.map((c) => {
    if (!c || !c.name || names.has(c.name)) throw new Error('REFUSED: every configuration needs a unique name (' + (c && c.name) + ')');
    names.add(c.name);
    return { name: c.name, cfg: C.normalise(c), hash: C.configHash(c) };
  });
  const hashes = new Set(out.map((x) => x.hash));
  if (hashes.size !== out.length) throw new Error('REFUSED: arm ' + arm + ' stage ' + stage + ' list holds duplicate configurations');
  return out;
}

function readList(arm, stage) {
  const dir = armDir(arm);
  if (stage === 1) {
    const f = path.join(dir, 'sweep.js');
    if (fs.existsSync(f)) return { list: require(f).STAGE1, want: LIST_SIZE[1], kind: 'stage1' };
    const g = path.join(dir, 'configs.js');
    if (isFloor(arm) && fs.existsSync(g)) return { list: require(g).CONFIGS, want: FLOOR_SIZE, kind: 'floor' };
    throw new Error('arm ' + arm + ' has no sweep.js');
  }
  if (stage === 2) {
    if (isFloor(arm)) throw new Error('arm ' + arm + ' has no stage2.json (a floor has one fixed list)');
    const f = path.join(dir, 'stage2.json');
    if (!fs.existsSync(f)) throw new Error('arm ' + arm + ' has no stage2.json');
    return { list: JSON.parse(fs.readFileSync(f, 'utf8')), want: LIST_SIZE[2], kind: 'stage2' };
  }
  throw new Error('stage must be 1 or 2');
}

function loadArmList(arm, stage = 1, log = true, logRoot = P.RESULTS) {
  stage = Number(stage);
  const { list, want, kind } = readList(arm, stage);
  const out = validateList(arm, stage, list, want);
  if (stage === 2) {
    // stage 2 adds 20 NEW configurations: none may repeat a stage-1 configuration or name
    const s1 = validateList(arm, 1, readList(arm, 1).list, LIST_SIZE[1]);
    const h1 = new Map(s1.map((x) => [x.hash, x.name])); const n1 = new Set(s1.map((x) => x.name));
    for (const x of out) {
      if (h1.has(x.hash)) throw new Error('REFUSED: arm ' + arm + ' stage-2 configuration ' + x.name + ' repeats stage-1 configuration ' + h1.get(x.hash));
      if (n1.has(x.name)) throw new Error('REFUSED: arm ' + arm + ' stage-2 name ' + x.name + ' is already a stage-1 name');
    }
  }
  const listHash = C.hash(out.map((x) => [x.name, x.cfg]));
  if (log) {
    const f = path.join(logRoot, 'sweep', 'lists.jsonl');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ arm, stage, kind, count: out.length, list_hash: listHash, at: new Date().toISOString() }) + '\n');
  }
  return { arm, stage, kind, list: out, hash: listHash };
}

// ---- answers ------------------------------------------------------------------------------------
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

// An arm's rank() returns either the ranked array or {ranked, engine_ms, lookups?, meta?}.
function normRank(res) {
  if (Array.isArray(res)) return { ranked: res, engine_ms: null, lookups: null, meta: null };
  if (res && Array.isArray(res.ranked)) return { ranked: res.ranked, engine_ms: res.engine_ms == null ? null : res.engine_ms, lookups: res.lookups == null ? null : res.lookups, meta: res.meta || null };
  throw new Error('rank() must return an array or {ranked: [...]}');
}

// Lookups (addendum 3, D.11), counted here and nowhere else:
//   lookups_head = what the arm reported for its own head; an arm that reports nothing ran one query
//                  (1); an empty head (the floors, the built-in arm "none") reports 0.
//   lookups_pad  = the padding tail, the same for every arm: DIR 1 (a directory listing), CO 2 (a
//                  `git log` for the co-changed files plus a listing for the DIR rest), none 0. It is
//                  counted whenever the configuration pads, whether or not a budget reaches the tail
//                  (the per-budget tail_tok says when it does).
//   lookups      = lookups_head + lookups_pad.
const PAD_LOOKUPS = { none: 0, DIR: 1, CO: 2 };

// The arm's meta, as kept in the answer record (addendum 3, D.12): every field, except that a lookup
// ledger (an array) is replaced by its length (ledger_len), so records stay small.
function metaRecord(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const o = {};
  for (const [k, v] of Object.entries(meta)) {
    if (k === 'ledger' && Array.isArray(v)) o.ledger_len = v.length;
    else o[k] = v;
  }
  return o;
}

function answer(G, task, seedMap, res, cfg, arm, wallMs) {
  const R = normRank(res);
  const pad = cfg.pad || 'none';
  if (!(pad in PAD_LOOKUPS)) throw new Error('unknown pad ' + pad);
  const lkHead = R.lookups == null ? 1 : R.lookups;
  const head = project(G, R.ranked, seedMap.ids, cfg.granularity);
  const units = withTail(G, head, seedMap.ids, task.seed && task.seed.path, pad, cfg.granularity);
  const p = pack(G, units, cfg.form, cfg.granularity);
  return {
    id: task.id, set: task.set, split: task.split, parent: task.parent, arm,
    config_hash: C.configHash(cfg), granularity: cfg.granularity, form: cfg.form, pad: cfg.pad || 'none',
    seeds: seedMap.ids.map((i) => G.nodes[i - 1].sid), seed_match: seedMap.match,
    n_ranked: R.ranked.length,
    ranked_sha: sha1(JSON.stringify(R.ranked.map((r) => [r.i, r.hop, r.score, (r.via || []).join('>')]))),
    n_units: p.n_units, n_head: p.n_head, items: p.items, budgets: p.budgets, beyond_sample: p.beyond_sample,
    ms: wallMs, engine_ms: R.engine_ms,
    lookups: lkHead + PAD_LOOKUPS[pad], lookups_head: lkHead, lookups_pad: PAD_LOOKUPS[pad],
    meta: metaRecord(R.meta),
  };
}

class GzWriter {
  constructor(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.file = file; this.gz = zlib.createGzip({ level: 6 }); this.out = fs.createWriteStream(file + '.part');
    this.gz.pipe(this.out);
  }
  write(o) { this.gz.write(JSON.stringify(o) + '\n'); }
  close() {
    return new Promise((res) => { this.out.on('finish', () => { fs.renameSync(this.file + '.part', this.file); res(); }); this.gz.end(); });
  }
}
function readGzJsonl(file) {
  const buf = fs.readFileSync(file);
  const text = file.endsWith('.gz') ? zlib.gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  return text.split('\n').filter(Boolean).map(JSON.parse);
}

module.exports = {
  loadTasks, checkSplit, loadArmList, validateList, normRank, answer, metaRecord, GzWriter, readGzJsonl, mapSeed, sha1, LIST_SIZE, FLOOR_SIZE, PAD_LOOKUPS, isFloor,
  // held-out lock and run discipline (addendum 4, B and D)
  ROLES, HELDOUT_SETS, NOT_RUN_SETS, codeState, crossDeps, diffFiles, lockTest, tqLockTest, setTest, commDraw, usesComm,
  frozenFile, tqFrozenFile, scoringFlag, heldoutOut, tqOut, runsFile, markerFile, readRuns, priorAttempts, outputTest, appendRun,
  beginHeldout, endHeldout, loadTuneVariants,
};
