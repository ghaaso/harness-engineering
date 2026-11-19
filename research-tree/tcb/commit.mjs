// commit.mjs: the acceptor (CONTRACT §5 unit U2a; spec/commit.mjs.md).
//
//   node tcb/commit.mjs intake --root <abs> --ce <n> --task <id> --epoch <e> [--now <iso>] [--dry-run]
//   node tcb/commit.mjs record --root <abs> --ce <n> --task <id> --epoch <e> --step <s> [--now <iso>] [--dry-run]
//
// `intake` validates an attempt's untrusted staging (and its checkpoint), stores each valid object by
// exclusive create, rejects with a code (never repairs) and flags R18 (d)/(e) sentences for the checker.
// `record` makes one step's outputs visible through one commit record. No git (CONTRACT §8 decision 23).
//
// Every shared function comes from lib.mjs (CONTRACT §4); nothing of the library is copied here.
// Machine output: one JSON line on stdout (lib.runMain). Messages for people: stderr.

import fs from 'node:fs';
import path from 'node:path';
import * as lib from './lib.mjs';

const SCRIPT = 'commit';
const KINDS = ['card', 'pack', 'review', 'stpa', 'fmea', 'hazards'];
const COMMIT_STEPS = ['pack', 'review', 'stpa', 'fmea', 'hazards'];
// CONTRACT §3.22 "Steps and kinds" (used only when a manifest lacks the step's entry).
const STEP_KINDS = { pack: ['card', 'pack'], review: ['review'], stpa: ['stpa'], fmea: ['fmea'], hazards: ['hazards'] };
const COND_KEYS = ['task', 'model_family', 'repo_size', 'language', 'metric'];
const TASK_RE = /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:$|\.))[a-z][a-z0-9-]{1,39}$/;
const SEED_RE = /(?<![0-9A-Za-z_])s_[0-9a-f]{16}(?![0-9a-f])/;
// A number in sentence text: digits with optional decimals, thousands commas, a sign and `%`, not
// touching a letter or `_` (a hyphen glued to a letter, as in "GPT-4", counts as touching).
const NUM_RE = /(?<![\p{L}\p{N}_.])(?<![\p{L}_][-−])([+\-−]?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?%?(?![\p{L}\p{N}_])/gu;
const NO_INCIDENT = new Set(['run-from-attempt', 'ledger-broken']);

const ARGS = {
  modes: ['intake', 'record'],
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    task: { type: 'string', required: true },
    epoch: { type: 'int', required: true },
    step: { type: 'string', required: ['record'] },
    now: { type: 'string' },
    'free-mb': { type: 'int' },
    boot: { type: 'string' },
    'dry-run': { type: 'bool' },
  },
};

// ---------------------------------------------------------------- small helpers (no library logic)

function tcbError(code, exit, detail) {
  if (typeof lib.TcbError === 'function') return new lib.TcbError(code, exit, detail);
  const e = new Error(code);
  e.code = code;
  e.exit = exit;
  e.detail = detail;
  return e;
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const toPosix = (p) => String(p).split(path.sep).join('/').replace(/\\/g, '/');
const say = (msg) => process.stderr.write(`commit: ${msg}\n`);

function layout(root) {
  const L = lib.paths(root) || {};
  const j = (...s) => path.join(root, ...s);
  const pick = (k, d) => (typeof L[k] === 'string' ? L[k] : d);
  return {
    tasks: pick('tasks', j('run', 'tasks.json')),
    ledger: pick('ledger', j('run', 'ledger.jsonl')),
    objects: j('store', 'objects'),
    commits: j('store', 'commits'),
    cardStatus: j('store', 'status', 'card_status.jsonl'),
    attempt(task, e) {
      if (typeof L.attempt === 'function') {
        const p = L.attempt(task, e);
        if (typeof p === 'string') return p;
      }
      return j('wt', `${task}-e${e}`);
    },
  };
}

function thresholdGetter(root) {
  const T = lib.thresholds(root);
  return {
    get: (name) => T.get(name),
    // Only for names whose default the contract fixes (§3.20 / §4.4); every other name is strict.
    getOr(name, dflt) {
      try {
        const v = T.get(name);
        return v === null || v === undefined ? dflt : v;
      } catch (e) {
        if (e && e.code === 'param-missing') return dflt;
        throw e;
      }
    },
  };
}

function collectStrings(v, out) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, out);
  else if (isObj(v)) for (const k of Object.keys(v)) collectStrings(v[k], out);
  return out;
}

function hasSeedId(v) {
  if (typeof v === 'string') return SEED_RE.test(v);
  if (Array.isArray(v)) return v.some(hasSeedId);
  if (isObj(v)) return Object.keys(v).some((k) => SEED_RE.test(k) || hasSeedId(v[k]));
  return false;
}

function nameKind(file) {
  const base = file.split('/').pop().toLowerCase();
  if (base.endsWith('.card.json')) return 'card';
  if (base === 'pack.json') return 'pack';
  if (base === 'review.json') return 'review';
  if (base === 'stpa.json') return 'stpa';
  if (base === 'fmea.json') return 'fmea';
  if (base === 'hazards.json') return 'hazards';
  return null;
}

function sortedUnique(ids) {
  if (!Array.isArray(ids)) return false;
  for (let i = 1; i < ids.length; i++) if (!(ids[i - 1] < ids[i])) return false;
  return true;
}

function roundTo(v, d) {
  const s = Math.sign(v);
  const a = Math.abs(v);
  const r = String(a).includes('e') ? Math.round(a * 10 ** d) / 10 ** d : Number(Math.round(Number(`${a}e${d}`)) + `e-${d}`);
  return s * r;
}

function numbersIn(text) {
  const out = [];
  if (typeof text !== 'string') return out;
  for (const m of text.matchAll(NUM_RE)) {
    const neg = m[1] === '-' || m[1] === '−';
    const n = Number(`${neg ? '-' : ''}${m[2].replace(/,/g, '')}${m[3] ? `.${m[3]}` : ''}`);
    if (Number.isFinite(n)) out.push({ n, d: m[3] ? m[3].length : 0, signed: m[1] !== '' });
  }
  return out;
}

// strings by equality, arrays by membership
function within(sv, cv) {
  const svals = Array.isArray(sv) ? sv : [sv];
  return svals.every((x) => (Array.isArray(cv) ? cv.includes(x) : cv !== null && cv !== undefined && cv === x));
}

function nonEmpty(cv) {
  if (Array.isArray(cv)) return cv.length > 0;
  if (typeof cv === 'string') return cv.trim() !== '';
  return cv !== null && cv !== undefined;
}

async function lastStatusMap(L) {
  const m = new Map();
  if (!fs.existsSync(L.cardStatus)) return m;
  const { records } = await lib.readJsonl(L.cardStatus);
  for (const r of records) if (r && typeof r.card_id === 'string') m.set(r.card_id, r);
  return m;
}

function maxSeq(lines, pred) {
  let s = 0;
  for (const l of lines) if (pred(l) && l.seq > s) s = l.seq;
  return s;
}

// ---------------------------------------------------------------- pre-lock reads (step 1)

async function loadTranscripts(transcriptsRoot, row) {
  const bySession = new Map();
  const byEpoch = new Map();
  const mains = new Set(); // the parsed session transcripts themselves (not their helpers)
  for (const a of (row && row.attempts) || []) {
    let entry;
    try {
      entry = lib.attemptOf(row, a.epoch);
    } catch {
      continue;
    }
    const s = entry && entry.session;
    if (!s) continue;
    if (!bySession.has(s)) {
      const st = await lib.sessionTranscripts(transcriptsRoot, s);
      const parsed = [];
      if (st && st.main) {
        const p = await lib.parseTranscript(st.main);
        mains.add(p);
        parsed.push(p);
      }
      for (const f of (st && st.helpers) || []) parsed.push(await lib.parseTranscript(f));
      bySession.set(s, parsed);
    }
    byEpoch.set(entry.epoch, bySession.get(s));
  }
  const strings = [];
  let n = 0;
  for (const parsed of bySession.values()) {
    for (const p of parsed) {
      n++;
      urlEvidence(p, mains.has(p), strings);
    }
  }
  return { byEpoch, strings, n };
}

// R34 evidence that a URL was found, from one transcript (U2-F2). Only what the session did not write
// itself counts: the URL a WebFetch was sent to (access.urls, never its free `prompt`), the results of
// WebFetch and WebSearch calls, the results of Agent/Task calls (a helper's answer), and the structured
// results of helper transcripts. Never a Write/Edit/Bash input or result, a Read result (the session can
// read back a file it wrote), a search query, or the session's own StructuredOutput: a session that
// writes a card puts its URL into exactly those.
function urlEvidence(p, isMain, out) {
  const kindOf = new Map();
  for (const u of p.toolUses || []) {
    const acc = u.access && typeof u.access.kind === 'string' ? u.access : lib.toolAccess(u.name, u.input);
    const kind = acc.kind;
    if (typeof u.id === 'string') kindOf.set(u.id, kind);
    if (kind === 'fetch') for (const url of acc.urls || []) if (typeof url === 'string') out.push(url);
  }
  for (const r of p.toolResults || []) {
    const kind = kindOf.get(r.toolUseId);
    if (kind === 'fetch' || kind === 'search' || kind === 'agent') {
      if (typeof r.text === 'string') out.push(r.text);
      // URLs past the 2,000-character cut of `text` (lib: non-enumerable `urls`, from the full result text).
      for (const u of Array.isArray(r.urls) ? r.urls : []) if (typeof u === 'string') out.push(u);
    }
  }
  for (const s of p.structured || []) {
    // In a session's own transcript a structured result counts only when it is tied to an Agent/Task
    // call (a helper's result relayed by the harness), never the session's own output.
    if (!isMain || (typeof s.toolUseId === 'string' && kindOf.get(s.toolUseId) === 'agent')) collectStrings(s.data, out);
  }
}

// Walk `staging/` and `in/checkpoint/` with lib.walkFiles; returns the parsed candidates. Throws
// `untrusted-path` 3 for a staging or checkpoint folder that is a link or lies outside the attempt.
async function readUntrusted(attemptDir) {
  const files = [];
  const ignored = [];
  const areas = [
    ['staging', 'session'],
    ['in/checkpoint', 'checkpoint'],
  ];
  for (const [rel, origin] of areas) {
    const dir = path.join(attemptDir, ...rel.split('/'));
    let st;
    try {
      st = fs.lstatSync(dir);
    } catch {
      continue;
    }
    if (st.isSymbolicLink() || !st.isDirectory() || !(await lib.isUnder(dir, attemptDir))) {
      throw tcbError('untrusted-path', 3, { path: rel });
    }
    const walked = await lib.walkFiles(dir);
    for (const l of walked.links || []) {
      files.push({ file: `${rel}/${toPosix(l)}`, origin, link: true });
    }
    for (const f of walked.files || []) {
      const rp = toPosix(f);
      if (origin === 'session' && rp === 'READY.json') continue;
      const file = `${rel}/${rp}`;
      if (!rp.toLowerCase().endsWith('.json')) {
        ignored.push(file);
        continue;
      }
      const first = rp.split('/')[0];
      const o = origin === 'session' && rp.includes('/') && lib.segmentName(first) === 'harvested' ? 'harvested' : origin;
      const entry = { file, origin: o, abs: path.join(dir, ...rp.split('/')) };
      try {
        entry.value = await lib.readJson(entry.abs);
        entry.ok = true;
      } catch (e) {
        if (e && (e.code === 'unparseable' || e.code === 'missing')) entry.ok = false;
        else throw e;
      }
      files.push(entry);
    }
  }
  files.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  ignored.sort();
  return { files, ignored };
}

// ---------------------------------------------------------------- the intake pass (steps 3-9)

async function intakePass(env, handle) {
  const { root, L, task, epoch, row, ctx, ce, now, T, pre } = env;
  const dry = !handle;
  const rejected = [];
  const notRun = [];
  const reject = (f, code) => rejected.push({ file: f.file, code });

  // Step 4: a seed id anywhere stops everything (exit 3, nothing stored).
  const seeded = pre.files.filter((f) => f.ok && hasSeedId(f.value)).map((f) => f.file);
  if (seeded.length) throw tcbError('seed-id', 3, { files: seeded });

  // The attempt folder is written by an untrusted session: `view/` may be a junction out of it, and the
  // views would then replace files wherever it points (U2-F4). Checked before anything is stored, read
  // or written (exit 3, nothing stored, incident line).
  const attemptDir = L.attempt(task, epoch);
  const viewDir = path.join(attemptDir, 'view');
  await assertViewDir(root, attemptDir, viewDir);

  // Step 3: kind, name and schema.
  const cands = [];
  for (const f of pre.files) {
    if (f.link) {
      reject(f, 'untrusted-path');
      continue;
    }
    if (!f.ok) {
      reject(f, 'unparseable');
      continue;
    }
    const v = f.value;
    if (!isObj(v) || !KINDS.includes(v.kind)) {
      reject(f, 'unknown-kind');
      continue;
    }
    const nk = nameKind(f.file);
    if (nk && nk !== v.kind) {
      reject(f, 'name-kind');
      continue;
    }
    try {
      await lib.checkFormat(root, v.kind, v);
    } catch (e) {
      if (e && (e.code === 'schema-version' || e.code === 'schema-invalid')) {
        reject(f, e.code);
        continue;
      }
      throw e;
    }
    cands.push({ ...f, kind: v.kind, id: lib.objectId(lib.PREFIX[v.kind], v) });
  }

  const objPath = (id) => path.join(L.objects, `${id}.json`);
  const stored = (id, prefix) => typeof id === 'string' && id.startsWith(`${prefix}_`) && fs.existsSync(objPath(id));
  const rowQ = new Set((row && row.question_ids) || []);
  const deferred = new Set(); // ids left unstored for want of a transcript (and what depends on them)
  // Keep the candidates whose `parent` is stored or another candidate kept here (fixpoint); a parent
  // left unstored for want of a transcript defers the child, anything else is `fk-parent`.
  const keepParents = (list, prefix) => {
    let cur = list;
    for (let changed = true; changed; ) {
      changed = false;
      const ids = new Set(cur.map((c) => c.id));
      const keep = [];
      for (const c of cur) {
        const t = c.value.parent;
        if (t == null || stored(t, prefix) || (ids.has(t) && t !== c.id)) keep.push(c);
        else {
          changed = true;
          if (deferred.has(t)) {
            notRun.push({ file: c.file, code: 'no-transcript' });
            deferred.add(c.id);
          } else reject(c, 'fk-parent');
        }
      }
      cur = keep;
    }
    return cur;
  };

  // Step 5: cards.
  const cardC = cands.filter((c) => c.kind === 'card');
  let okCards = [];
  for (const c of cardC) {
    const v = c.value;
    if (v.field !== row.field) reject(c, 'wrong-field');
    else if (!Array.isArray(v.question_ids) || !v.question_ids.every((q) => rowQ.has(q))) reject(c, 'question-not-owned');
    else if ((v.supersedes != null) !== (v.supersede_reason != null)) reject(c, 'supersede-reason');
    else if (c.origin !== 'harvested' && pre.transcripts.n === 0) {
      notRun.push({ file: c.file, code: 'no-transcript' });
      deferred.add(c.id);
    } else if (c.origin !== 'harvested' && !pre.transcripts.strings.some((s) => s.includes(v.source.url))) {
      reject(c, 'url-not-in-transcript');
    } else okCards.push(c);
  }
  // supersedes resolves to a stored card or a card accepted in this run (fixpoint over same-run chains)
  for (let changed = true; changed; ) {
    changed = false;
    const ids = new Set(okCards.map((c) => c.id));
    const keep = [];
    for (const c of okCards) {
      const t = c.value.supersedes;
      if (t == null || stored(t, 'c') || ids.has(t)) keep.push(c);
      else {
        changed = true;
        if (deferred.has(t)) {
          notRun.push({ file: c.file, code: 'no-transcript' });
          deferred.add(c.id);
        } else reject(c, 'supersedes-missing');
      }
    }
    okCards = keep;
  }
  const cardById = new Map(okCards.map((c) => [c.id, c]));
  const cardValue = async (id) => {
    if (cardById.has(id)) return cardById.get(id).value;
    if (stored(id, 'c')) return lib.getObject(root, id);
    return null;
  };

  // Step 6: packs.
  let proto;
  if (row.field) proto = await lib.currentProtocol(root, row.field);
  const qsha = proto && proto.value && Array.isArray(proto.value.question_ids) ? lib.questionsSha(proto.value.question_ids) : null;
  const packC = cands.filter((c) => c.kind === 'pack');
  const packCandIds = new Set(packC.map((c) => c.id));
  const indexWords = packC.some((c) => Array.isArray(c.value.index) && c.value.index.length) ? T.get('index_words') : null;
  let okPacks = [];
  for (const c of packC) {
    const v = c.value;
    const cardSet = new Set(Array.isArray(v.cards) ? v.cards : []);
    const missing = (v.cards || []).filter((id) => !(cardById.has(id) || stored(id, 'c')));
    let code = null;
    if (v.field !== row.field) code = 'wrong-field';
    else if (!qsha || v.questions_sha !== qsha) code = 'questions-sha';
    else if (!sortedUnique(v.cards)) code = 'not-sorted';
    else if (missing.length && missing.every((id) => deferred.has(id))) code = '#deferred';
    else if (missing.length) code = 'fk-card';
    else if (v.parent != null && !(stored(v.parent, 'p') || (packCandIds.has(v.parent) && v.parent !== c.id))) code = 'fk-parent';
    else if (
      Array.isArray(v.index) &&
      v.index.some((ix) => lib.wordCount(ix.summary || '') > indexWords || !(ix.cards || []).every((id) => cardSet.has(id)))
    )
      code = 'index-invalid';
    else code = sentenceCode(v.conclusions || [], cardSet);
    if (code === '#deferred') {
      notRun.push({ file: c.file, code: 'no-transcript' });
      deferred.add(c.id);
    } else if (code) reject(c, code);
    else okPacks.push(c);
  }
  // A same-run parent must itself be accepted, not merely staged (U2-F3): otherwise the child is stored
  // with a dangling parent and the next fsck stops all work (fk-missing). Fixpoint over chains.
  okPacks = keepParents(okPacks, 'p');
  const packById = new Map(okPacks.map((c) => [c.id, c]));

  // Step 6: reviews.
  const reviewC = cands.filter((c) => c.kind === 'review');
  const reviewCandIds = new Set(reviewC.map((c) => c.id));
  let okReviews = [];
  for (const c of reviewC) {
    const v = c.value;
    let pack = null;
    if (packById.has(v.pack)) pack = packById.get(v.pack).value;
    else if (stored(v.pack, 'p')) pack = await lib.getObject(root, v.pack);
    let code = null;
    if (v.field !== row.field) code = 'wrong-field';
    else if (!pack) code = deferred.has(v.pack) ? '#deferred' : 'fk-pack';
    else if (v.parent != null && !(stored(v.parent, 'r') || (reviewCandIds.has(v.parent) && v.parent !== c.id))) code = 'fk-parent';
    else {
      const cardSet = new Set(pack.cards || []);
      code = sentenceCode(v.sentences || [], cardSet);
      if (!code) {
        const sids = new Set((v.sentences || []).map((s) => s.sid));
        const badSid =
          (v.verdicts || []).some((vd) => !(vd.supports || []).every((s) => sids.has(s))) ||
          (v.dismissals || []).some((d) => !sids.has(d.sid));
        if (badSid) code = 'bad-sid';
        else if ((v.dismissals || []).some((d) => !(d.supports || []).every((id) => cardSet.has(id)))) code = 'cite-outside-pack';
      }
    }
    if (code === '#deferred') {
      notRun.push({ file: c.file, code: 'no-transcript' });
      deferred.add(c.id);
    } else if (code) reject(c, code);
    else okReviews.push(c);
  }
  okReviews = keepParents(okReviews, 'r'); // a same-run parent must be accepted too (U2-F3)

  // Design-check outputs: the schema is their whole check.
  const okDesign = cands.filter((c) => c.kind === 'stpa' || c.kind === 'fmea' || c.kind === 'hazards');

  // Step 7: flags (the object is still stored).
  const flagged = [];
  const flagKey = new Set();
  const addFlag = (id, sid, code) => {
    const k = `${id}|${sid}|${code}`;
    if (!flagKey.has(k)) {
      flagKey.add(k);
      flagged.push({ id, sid, code });
    }
  };
  for (const c of [...okPacks, ...okReviews]) {
    const sentences = c.kind === 'pack' ? c.value.conclusions || [] : c.value.sentences || [];
    for (const s of sentences) {
      const cited = [];
      for (const id of s.cites || []) {
        const cv = await cardValue(id);
        if (cv) cited.push(cv);
      }
      const at = isObj(s.applies_to) ? s.applies_to : {};
      for (const card of cited) {
        const cond = isObj(card.conditions) ? card.conditions : {};
        for (const k of Object.keys(at)) {
          if (at[k] === null || at[k] === undefined) continue;
          if (!within(at[k], cond[k])) addFlag(c.id, s.sid, 'scope-outside');
        }
        for (const k of COND_KEYS) {
          if (nonEmpty(cond[k]) && (at[k] === null || at[k] === undefined)) addFlag(c.id, s.sid, 'scope-dropped');
        }
      }
      const values = [];
      for (const card of cited) {
        const m = isObj(card.measured) ? card.measured : {};
        if (typeof m.value === 'number') values.push(m.value);
        if (typeof m.baseline === 'number') values.push(m.baseline);
      }
      for (const { n, d, signed } of numbersIn(s.text)) {
        // An unsigned number in prose matches either sign ("fell 12.5%" for -12.47); a printed sign
        // must match the value's sign too ("+12.5%" against -12.47 is uncited, U2-F5).
        const hit = values.some((v) => {
          const r = roundTo(v, d);
          const diff = signed ? Math.abs(r - n) : Math.abs(Math.abs(r) - Math.abs(n));
          return diff <= 1e-9 * Math.max(1, Math.abs(n));
        });
        if (!hit) addFlag(c.id, s.sid, 'number-uncited');
      }
    }
  }
  flagged.sort((a, b) => (a.id + a.sid + a.code < b.id + b.sid + b.code ? -1 : 1));

  // Accepted objects, one per id (the first file naming it).
  const accepted = [];
  const seen = new Set();
  for (const c of [...okCards, ...okPacks, ...okReviews, ...okDesign].sort((a, b) => (a.file < b.file ? -1 : 1))) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    accepted.push(c);
  }
  accepted.sort((a, b) => (a.id < b.id ? -1 : 1));
  rejected.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.code < b.code ? -1 : 1));

  // Step 8: store, then the views.
  const storedOut = [];
  for (const c of accepted) {
    let created;
    if (dry) {
      created = !fs.existsSync(objPath(c.id));
    } else {
      const r = await lib.putObject(root, c.value);
      created = !!r.created;
    }
    storedOut.push({ id: c.id, kind: c.kind, origin: c.origin, created });
  }

  const { lines } = await lib.readLedger(root);
  const myIntake = lines.filter((l) => l.kind === 'intake' && l.task === task && l.epoch === epoch);
  const listed = new Map();
  for (const l of myIntake) for (const o of (l.data && l.data.objects) || []) if (!listed.has(o.id)) listed.set(o.id, o);
  const committedPath = path.join(viewDir, 'committed.json');
  const rejectedPath = path.join(viewDir, 'rejected.json');
  let prevFiles = new Map();
  try {
    const prev = fs.existsSync(committedPath) ? await lib.readJson(committedPath) : null;
    if (prev && Array.isArray(prev.committed)) prevFiles = new Map(prev.committed.map((e) => [e.id, e.file]));
  } catch {
    prevFiles = new Map();
  }
  const committedMap = new Map();
  for (const [id, o] of listed) committedMap.set(id, { id, kind: o.kind, file: prevFiles.get(id) ?? null });
  for (const c of accepted) committedMap.set(c.id, { id: c.id, kind: c.kind, file: c.file });
  const committed = [...committedMap.values()].sort((a, b) => (a.id < b.id ? -1 : 1));

  if (!dry) {
    if (!fs.existsSync(viewDir)) {
      fs.mkdirSync(viewDir, { recursive: true });
      await assertViewDir(root, attemptDir, viewDir);
    }
    await writeIfChanged(rejectedPath, { schema_version: 1, task, epoch, rejected });
    await writeIfChanged(committedPath, { schema_version: 1, task, epoch, committed });
  }

  // Step 9: the intake line.
  const fresh = accepted.filter((c) => !listed.has(c.id));
  const freshIds = new Set(fresh.map((c) => c.id));
  const last = myIntake.length ? myIntake[myIntake.length - 1] : null;
  const lastRejected = last && last.data && Array.isArray(last.data.rejected) ? last.data.rejected : [];
  const sameRejected = lib.canonicalize(lastRejected) === lib.canonicalize(rejected);
  const wouldAppend = fresh.length > 0 || !sameRejected;
  let appended = false;
  if (wouldAppend && !dry) {
    await lib.appendLedger(root, handle, {
      ctx,
      ce,
      kind: 'intake',
      task,
      epoch,
      now,
      data: {
        objects: fresh.map((c) => ({ id: c.id, kind: c.kind, origin: c.origin })),
        rejected,
        flagged: flagged.filter((f) => freshIds.has(f.id)),
      },
    });
    appended = true;
  }

  const reasons = [
    ...rejected.map((r) => ({ code: r.code, detail: { file: r.file } })),
    ...notRun.map((r) => ({ code: r.code, detail: { file: r.file } })),
  ];
  const exit = rejected.length ? 1 : notRun.length ? 2 : 0;
  return {
    exit,
    wouldAppend,
    appended,
    reasons,
    result: { stored: storedOut, rejected, flagged, ignored: pre.ignored, not_run: notRun },
  };
}

function sentenceCode(sentences, cardSet) {
  const sids = new Set();
  for (const s of sentences) {
    if (sids.has(s.sid)) return 'dup-sid';
    sids.add(s.sid);
  }
  for (const s of sentences) if (s.kind === 'fact' && !(Array.isArray(s.cites) && s.cites.length)) return 'uncited-fact';
  for (const s of sentences) for (const id of s.cites || []) if (!cardSet.has(id)) return 'cite-outside-pack';
  return null;
}

// `wt/<task>-e<e>/` and its `view/` must be real folders inside the run root's `wt/` (no link or
// junction at either level); else exit 3 `untrusted-path`. An absent `view/` passes (it is created
// later and checked again).
async function assertViewDir(root, attemptDir, viewDir) {
  const lst = (p) => {
    try {
      return fs.lstatSync(p);
    } catch {
      return null;
    }
  };
  const a = lst(attemptDir);
  if (a && (a.isSymbolicLink() || !a.isDirectory() || !(await lib.isUnder(attemptDir, path.join(root, 'wt'))))) {
    throw tcbError('untrusted-path', 3, { path: 'attempt' });
  }
  const v = lst(viewDir);
  if (v && (v.isSymbolicLink() || !v.isDirectory() || !(await lib.isUnder(viewDir, attemptDir)))) {
    throw tcbError('untrusted-path', 3, { path: 'view' });
  }
}

async function writeIfChanged(file, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  try {
    if (fs.readFileSync(file, 'utf8') === text) return;
  } catch {
    /* absent: write */
  }
  await lib.writeAtomic(file, text);
}

// ---------------------------------------------------------------- record (steps 4-11)

async function recordPass(env, handle, step) {
  const { root, L, task, epoch, ctx, ce, now, T } = env;
  const dry = !handle;
  const row = env.lockedRow;
  const no = (exit, code, detail) => ({ exit, reasons: [{ code, detail: detail ?? null }], result: { step } });
  const steps = row.steps || [];
  const attemptDir = L.attempt(task, epoch);

  // Step 4: the outcome log (FX-OUT, CONTRACT §3.23); READY.json is a copy that no decision reads.
  // A fenced log refuses (R-a: the fence won, its CAS may not have run yet); a bad log is tamper (3).
  const log = lib.outcomeState(attemptDir, row);
  if (log.fenced !== null) return no(1, 'attempt-fenced', { reason: log.fenced });
  const si = steps.indexOf(step);
  const readySteps = log.slots.filter((s) => s.kind === 'ready').map((s) => s.step);
  if (!readySteps.length) return no(2, 'no-ready');
  if (!readySteps.some((s) => s === step || steps.indexOf(s) > si)) return no(1, 'ready-mismatch', { ready: readySteps });

  // Step 5: step order.
  const recPath = (s) => path.join(L.commits, `${task}.${s}.json`);
  const before = steps.slice(0, si).filter((s) => !fs.existsSync(recPath(s)));
  if (before.length) return no(1, 'step-order', { missing: before });

  // Steps 6, 6b: a fresh passing fsck and a clean audit after the last intake of this attempt.
  const { lines } = await lib.readLedger(root);
  const lastIntake = maxSeq(lines, (l) => l.kind === 'intake' && l.task === task && l.epoch === epoch);
  const lastPass = maxSeq(lines, (l) => l.kind === 'fsck' && l.data && l.data.result === 'pass');
  const lastFail = maxSeq(lines, (l) => l.kind === 'fsck' && l.data && l.data.result === 'fail');
  if (!(lastPass > lastIntake && lastPass > lastFail)) {
    return no(6, 'fsck-stale', { last_pass: lastPass, last_fail: lastFail, last_intake: lastIntake });
  }
  const audits = lines.filter((l) => l.kind === 'audit' && l.task === task && l.epoch === epoch && l.seq > lastIntake);
  if (!audits.length) return no(6, 'audit-missing', { last_intake: lastIntake });
  const audit = audits[audits.length - 1];
  if (audit.data && audit.data.label === 'tainted') return no(1, 'tainted', { audit_seq: audit.seq });

  // Step 7: outputs.
  let attempt;
  try {
    attempt = lib.attemptOf(row, epoch);
  } catch (e) {
    if (e && e.code === 'no-attempt') return no(2, 'no-manifest');
    throw e;
  }
  if (!attempt.manifest) return no(2, 'no-manifest');
  const manifest = await lib.getObject(root, attempt.manifest);
  const outEntry = Array.isArray(manifest.outputs) ? manifest.outputs.find((o) => o && o.step === step) : null;
  const kinds = outEntry && Array.isArray(outEntry.kinds) ? outEntry.kinds : STEP_KINDS[step];
  const named = new Map();
  for (const l of lines) {
    if (l.kind !== 'intake' || l.task !== task || l.epoch !== epoch) continue;
    for (const o of (l.data && l.data.objects) || []) if (kinds.includes(o.kind) && !named.has(o.id)) named.set(o.id, o.kind);
  }
  const outputs = [];
  const values = new Map();
  for (const [id, kind] of named) {
    const v = await lib.getObject(root, id);
    values.set(id, v);
    outputs.push({ id, kind, sha256: lib.sha256hex(fs.readFileSync(path.join(L.objects, `${id}.json`))) });
  }
  outputs.sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!outputs.length) return no(1, 'no-outputs', { kinds });

  if (step === 'pack') {
    const packs = outputs.filter((o) => o.kind === 'pack');
    if (packs.length !== 1) return no(1, 'pack-count', { packs: packs.map((p) => p.id) });
    const pack = values.get(packs[0].id);
    const status = await lastStatusMap(L);
    const pc = pack.cards || [];
    const rejectedCards = pc.filter((id) => status.has(id) && status.get(id).status === 'rejected');
    if (rejectedCards.length) return no(1, 'untrusted-cards', { ids: rejectedCards });
    const pending = pc.filter((id) => !status.has(id));
    if (pending.length) return no(6, 'cards-pending', { ids: pending });

    // Step 7b: R47 capacity (decision 33).
    const cardVals = new Map();
    let bytes = Buffer.byteLength(lib.canonicalize(pack), 'utf8');
    for (const id of pc) {
      const cv = await lib.getObject(root, id);
      cardVals.set(id, cv);
      bytes += Buffer.byteLength(lib.canonicalize(cv), 'utf8');
    }
    const tokens = Math.ceil(bytes / 4);
    const cap = T.get('W_quality') - T.get('child_prefix_tokens') - T.get('review_reserve_tokens');
    const hasIndex = Array.isArray(pack.index) ? pack.index.length > 0 : pack.index != null;
    if (tokens > cap && !hasIndex) return no(1, 'pack-over-capacity', { tokens, cap });
    // Every confirmed card of the field is in the pack or superseded (through a chain) by one of it.
    const covered = new Set(pc);
    for (const id of pc) {
      let cur = cardVals.get(id);
      const guard = new Set([id]);
      while (cur && typeof cur.supersedes === 'string' && !guard.has(cur.supersedes)) {
        const t = cur.supersedes;
        guard.add(t);
        covered.add(t);
        cur = fs.existsSync(path.join(L.objects, `${t}.json`)) ? await lib.getObject(root, t) : null;
      }
    }
    const cut = [];
    for (const [id, line] of status) {
      if (line.status !== 'confirmed' || covered.has(id)) continue;
      if (!fs.existsSync(path.join(L.objects, `${id}.json`))) continue;
      const cv = await lib.getObject(root, id);
      if (cv && cv.field === row.field) cut.push(id);
    }
    cut.sort();
    if (cut.length) return no(1, 'confirmed-card-cut', { ids: cut });
  } else if (step === 'review') {
    const reviews = outputs.filter((o) => o.kind === 'review');
    if (reviews.length !== 1) return no(1, 'review-count', { reviews: reviews.map((r) => r.id) });
    const rv = values.get(reviews[0].id);
    let frozen = false;
    if (fs.existsSync(L.commits)) {
      for (const name of fs.readdirSync(L.commits)) {
        if (!name.endsWith('.json')) continue;
        let rec;
        try {
          rec = await lib.readJson(path.join(L.commits, name));
        } catch {
          continue;
        }
        if (isObj(rec) && Array.isArray(rec.outputs) && rec.outputs.some((o) => o && o.id === rv.pack)) {
          frozen = true;
          break;
        }
      }
    }
    if (!frozen) return no(1, 'pack-not-frozen', { pack: rv.pack });
  }

  // Step 8: the commit record, created once.
  const outputs_sha = lib.sha256hex(lib.canonicalize(outputs));
  const record = {
    schema_version: 1,
    task,
    step,
    epoch,
    step_key: lib.sha256hex(lib.canonicalize(manifest)),
    outputs,
    outputs_sha,
  };
  const bytes = lib.canonicalize(record);
  const record_sha = lib.sha256hex(bytes);
  const rp = recPath(step);
  if (dry) {
    if (fs.existsSync(rp) && fs.readFileSync(rp, 'utf8') !== bytes) return no(1, 'commit-differs', { record: `${task}.${step}` });
  } else {
    try {
      await lib.createExclusive(rp, bytes);
    } catch (e) {
      if (e && e.code === 'exists-different') return no(1, 'commit-differs', { record: `${task}.${step}` });
      throw e;
    }
  }

  // Step 9: the row.
  let state = row.state;
  const allDone = (commits) => steps.every((s) => commits && typeof commits[s] === 'string');
  if (dry) {
    const commits = { ...(row.commits || {}), [step]: record_sha };
    if (allDone(commits)) state = 'committed';
  } else {
    const r = await lib.updateRow(
      root,
      handle,
      { task, epoch, steps: ['started', 'bound'], states: ['active', 'committed'] },
      (copy) => {
        copy.commits = { ...(copy.commits || {}), [step]: record_sha };
        if (allDone(copy.commits)) copy.state = 'committed';
        return copy;
      },
    );
    state = r.row.state;
  }

  // Step 11: the ledger line, once per task+step+outputs_sha (no git: decision 23).
  const { lines: now2 } = await lib.readLedger(root);
  const have = now2.some((l) => l.kind === 'commit' && l.task === task && l.data && l.data.step === step && l.data.outputs_sha === outputs_sha);
  if (!have && !dry) {
    await lib.appendLedger(root, handle, {
      ctx,
      ce,
      kind: 'commit',
      task,
      epoch,
      now,
      data: { step, outputs_sha, n: outputs.length, git: null },
    });
  }
  return { exit: 0, reasons: [], result: { record_sha, outputs_sha, n: outputs.length, state, git: null } };
}

// ---------------------------------------------------------------- main

async function main(ctx) {
  const { mode, flags } = lib.parseArgs(process.argv.slice(2), ARGS);
  const root = flags.root;
  const ce = flags.ce;
  const task = flags.task;
  const epoch = flags.epoch;
  const step = flags.step;
  const dry = !!flags['dry-run'];
  if (!path.isAbsolute(root)) throw tcbError('usage', 66, { flag: 'root', why: 'not absolute' });
  if (!TASK_RE.test(task)) throw tcbError('usage', 66, { flag: 'task' });
  if (!(Number.isInteger(epoch) && epoch >= 1)) throw tcbError('usage', 66, { flag: 'epoch' });
  if (!(Number.isInteger(ce) && ce >= 1)) throw tcbError('usage', 66, { flag: 'ce' });
  if (mode === 'record' && !COMMIT_STEPS.includes(step)) throw tcbError('usage', 66, { flag: 'step' });
  ctx.mode = mode;
  ctx.dryRun = dry;
  ctx.dry_run = dry;

  const facts = lib.edgeFacts(flags);
  const now = facts.now;
  const L = layout(root);
  const T = thresholdGetter(root);

  // Step 1: outside the lock, read the table (to find the sessions), the transcripts and staging.
  const table0 = await lib.readTasks(root);
  const row0 = (table0.tasks || []).find((r) => r.task === task) || null;
  const transcripts = row0 ? await loadTranscripts(T.get('transcripts_root'), row0) : { byEpoch: new Map(), strings: [], n: 0 };
  const attemptDir = L.attempt(task, epoch);
  let pre = null;
  let preTamper = null;
  try {
    pre = await readUntrusted(attemptDir);
  } catch (e) {
    if (e && e.exit === 3) preTamper = e;
    else throw e;
  }
  const spendOfEpoch = (e) => {
    const parsed = transcripts.byEpoch.get(e);
    if (!parsed || !parsed.length) return null;
    const s = lib.spendOf(parsed);
    return s && typeof s.total === 'number' ? s.total : null;
  };

  const env = { root, L, task, epoch, ctx, ce, now, T, pre: pre && { ...pre, transcripts } };
  const lockOpts = {
    script: SCRIPT,
    ce,
    now,
    proc: dry ? null : lib.realProc({ exe: T.getOr('proc_exe', undefined) }),
    retries: T.getOr('lock_retries', 300),
  };

  const body = async (handle) => {
    if (preTamper) throw preTamper;
    // Step 2: inside the lock.
    const table = await lib.readTasks(root);
    const row = (table.tasks || []).find((r) => r.task === task);
    if (!row) return { exit: 1, reasons: [{ code: 'no-task', detail: { task } }], result: {} };
    if (row.epoch !== epoch) {
      const tokens = spendOfEpoch(epoch);
      if (handle) {
        await lib.appendLedger(root, handle, { ctx, ce, kind: 'zombie-write', task, epoch, now, data: { epoch_seen: epoch, tokens } });
      }
      return { exit: 65, reasons: [{ code: 'stale-epoch', detail: { epoch_seen: epoch, row_epoch: row.epoch, tokens } }], result: {} };
    }
    const okStates = mode === 'record' ? ['active', 'committed'] : ['active'];
    if (!okStates.includes(row.state) || !['started', 'bound'].includes(row.step)) {
      return { exit: 65, reasons: [{ code: 'wrong-step', detail: { state: row.state, step: row.step } }], result: {} };
    }
    if (mode === 'record' && !(row.steps || []).includes(step)) {
      return { exit: 1, reasons: [{ code: 'step-not-listed', detail: { step, steps: row.steps } }], result: {} };
    }
    env.row = row;
    env.lockedRow = row;
    const ip = await intakePass(env, handle);
    if (mode === 'intake') return ip;
    if (ip.wouldAppend) {
      return { exit: 6, reasons: [{ code: 'intake-new', detail: { stored: ip.result.stored.map((s) => s.id) } }], result: { intake: ip.result } };
    }
    return recordPass(env, handle, step);
  };

  const withTamperRecord = async (handle) => {
    try {
      return await body(handle);
    } catch (e) {
      if (e && e.exit === 3 && handle && !NO_INCIDENT.has(e.code)) {
        try {
          await lib.recordIncident(root, handle, {
            ctx,
            ce,
            cls: 'refusal',
            detail: { tamper: true, script: SCRIPT, code: e.code },
            task,
            epoch,
            now,
          });
        } catch {
          /* the ledger tail does not verify: no line (CONTRACT §1.4) */
        }
      }
      if (e && e.exit === 3) say(`tamper: ${e.code}`);
      throw e;
    }
  };

  let out;
  if (dry) {
    await lib.checkCe(root, ce);
    out = await body(null);
  } else if (preTamper) {
    // An untrusted staging or checkpoint: record the incident when the lock and ce allow, exit 3 anyway.
    try {
      await lib.withRunLock(root, lockOpts, withTamperRecord);
    } catch {
      /* fall through */
    }
    throw preTamper;
  } else {
    out = await lib.withRunLock(root, lockOpts, withTamperRecord);
  }
  if (out.exit && out.exit !== 0) say(`${mode}: exit ${out.exit} ${out.reasons && out.reasons[0] ? out.reasons[0].code : ''}`);
  return { ...out, mode, dry_run: dry, dryRun: dry };
}

lib.runMain(import.meta.url, SCRIPT, main);
