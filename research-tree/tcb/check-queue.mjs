// check-queue.mjs (unit U4b): builds one checker batch.
// Spec: spec/check-queue.mjs.md; contract: CONTRACT.md section 3.14, 3.15, 3.17, 5 (row U4b), 8.
//
//   node check-queue.mjs --root R --ce N --mode intake|freeze|post-review [--field <f>]
//        [--batch-size <n>] [--classes <c>]... [--no-seeds] [--requeue] [--rng-seed <s>]
//        [--now iso] [--dry-run]
//
// For each item that needs judgment: one file with the typed card, about window_words words of the
// stored snapshot around the offset and, for a citation, the sentence. Seeds (one per class at most,
// through seed.mjs's makeSeed) are mixed in at random positions; the key stays in sealed/. The checker
// sees opaque i_ items and cannot tell a seed from a real item.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseArgs, runMain, edgeFacts, thresholds, canonicalize, objectId, getObject, readJson, readJsonl,
  createExclusive, withRunLock, checkCe, appendLedger, readLedger, ledgerHead, recordIncident,
  intakeCandidates, flagCleared, rng as makeRng, realProc,
} from './lib.mjs';
import { CLASSES, makeSeed, needsSentence } from './seed.mjs';

const SCRIPT = 'check-queue';
const MODES = ['intake', 'freeze', 'post-review'];
const FLAG_CODES = ['scope-outside', 'scope-dropped', 'number-uncited'];

const SPEC = {
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    mode: { type: 'string', required: true },
    field: { type: 'string' },
    'batch-size': { type: 'int' },
    classes: { type: 'list' },
    'no-seeds': { type: 'bool' },
    requeue: { type: 'bool' },
    'rng-seed': { type: 'string' },
    now: { type: 'string' },
    'free-mb': { type: 'int' },
    boot: { type: 'string' },
    'dry-run': { type: 'bool' },
  },
};

const usage = (detail) => ({ exit: 66, result: {}, reasons: [{ code: 'usage', detail }] });
const fileLine = (obj) => canonicalize(obj) + '\n';
const byStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------------------------

// The `n` words centred on the word that holds `offset` (clamped at both ends), as the original
// substring from the first word's start to the last word's end. Offsets are UTF-16 indexes.
export function windowAround(text, offset, n) {
  const words = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text)) !== null) words.push([m.index, m.index + m[0].length]);
  if (words.length === 0) return null;
  let idx = words.findIndex(([, end]) => offset < end);
  if (idx === -1) idx = words.length - 1;
  let start = idx - Math.floor(n / 2);
  start = Math.max(0, Math.min(start, words.length - n));
  const last = Math.min(words.length, start + n) - 1;
  return text.slice(words[start][0], words[last][1]);
}

// ---------------------------------------------------------------------------------------------
// Reading the store
// ---------------------------------------------------------------------------------------------

function readdirSafe(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function readRecords(file) {
  return fs.existsSync(file) ? readJsonl(file).records : [];
}

function loadStore(root) {
  const statusRecords = readRecords(path.join(root, 'store', 'status', 'card_status.jsonl'));
  const status = new Map();
  for (const r of statusRecords) status.set(r.card_id, r);
  const witness = new Map();
  for (const r of readRecords(path.join(root, 'store', 'witness.jsonl'))) witness.set(r.card_id, r);
  return { statusRecords, status, witness };
}

function loadCard(root, cardId) {
  if (!/^c_[0-9a-f]{16}$/.test(cardId)) return { error: 'bad-card-id' };
  try {
    return { card: getObject(root, cardId) };
  } catch (e) {
    if (e && e.code === 'missing') return { error: 'card-missing' };
    throw e;
  }
}

function makeWindowReader(root, store, windowWords) {
  const texts = new Map();
  const cache = new Map();
  return (cardId) => {
    if (cache.has(cardId)) return cache.get(cardId);
    let out;
    const rec = store.witness.get(cardId);
    const st = store.status.get(cardId);
    if (!rec) {
      out = { error: 'no-witness-record' };
    } else {
      const paraphrase = st && st.status === 'rejected' && st.reason === 'number-without-quote';
      const offset = paraphrase ? rec.number_offset : (rec.quote_offset ?? rec.number_offset);
      if (!Number.isInteger(offset) || offset < 0) {
        out = { error: 'no-offset' };
      } else if (typeof rec.text_sha !== 'string' || !/^[0-9a-f]{64}$/.test(rec.text_sha)) {
        out = { error: 'no-text-sha' };
      } else {
        if (!texts.has(rec.text_sha)) {
          const file = path.join(root, '.snapshots', 'text', rec.text_sha);
          texts.set(rec.text_sha, fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file, 'utf8') : null);
        }
        const text = texts.get(rec.text_sha);
        const w = text === null ? null : windowAround(text, offset, windowWords);
        out = text === null ? { error: 'text-missing' } : w === null ? { error: 'text-empty' } : { window: w };
      }
    }
    cache.set(cardId, out);
    return out;
  };
}

function normaliseSentence(s) {
  return {
    sid: s.sid,
    approach_id: s.approach_id,
    measure: s.measure,
    kind: s.kind,
    text: s.text,
    cites: [],
    applies_to: s.applies_to ?? {},
  };
}

// Earlier complete batches of one mode: [{batch, card_id, node}] of their real items.
function earlierRealItems(root, mode) {
  const out = [];
  for (const f of readdirSafe(path.join(root, 'sealed', 'seeds')).sort()) {
    const m = /^(b[0-9]+-[0-9]+)\.json$/.exec(f);
    if (!m) continue;
    const bj = path.join(root, 'queue', m[1], 'batch.json');
    if (!fs.existsSync(bj)) continue; // an incomplete batch is ignored
    let b;
    let key;
    try {
      b = readJson(bj);
      key = readJson(path.join(root, 'sealed', 'seeds', f));
    } catch {
      continue;
    }
    if (b.mode !== mode) continue;
    for (const e of Object.values(key.items || {})) {
      if (!e.seed) out.push({ batch: m[1], card_id: e.card_id, node: e.node ?? null });
    }
  }
  return out;
}

function nextBatchNumber(root, ce) {
  let max = 0;
  for (const name of readdirSafe(path.join(root, 'queue'))) {
    const m = /^b([0-9]+)-([0-9]+)$/.exec(name);
    if (m && Number(m[1]) === ce) max = Math.max(max, Number(m[2]));
  }
  for (const name of readdirSafe(path.join(root, 'sealed', 'seeds'))) {
    const m = /^b([0-9]+)-([0-9]+)\.json$/.exec(name);
    if (m && Number(m[1]) === ce) max = Math.max(max, Number(m[2]));
  }
  return max + 1;
}

// ---------------------------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------------------------

async function intakeCandidateList(root, store, flags) {
  const out = [];
  const unreadable = [];
  const tamper = [];
  for (const c of await intakeCandidates(root)) {
    if (/^s_/.test(c.card_id)) {
      tamper.push(c.card_id);
      continue;
    }
    if (c.in_flight && !flags.requeue) continue;
    const loaded = loadCard(root, c.card_id);
    if (loaded.error) {
      unreadable.push({ card_id: c.card_id, reason: loaded.error });
      continue;
    }
    if (flags.field != null && loaded.card.field !== flags.field) continue;
    out.push({ card_id: c.card_id, sid: null, node: null, field: loaded.card.field, card: loaded.card, sentence: null });
  }
  return { cands: out, untrusted: [], unreadable, tamper };
}

async function sentenceCandidateList(root, store, flags, mode) {
  const kind = mode === 'freeze' ? 'pack' : 'review';
  const lines = readLedger(root).lines || [];
  const out = [];
  const untrusted = [];
  const unreadable = [];
  const tamper = [];

  // The object of the commit line with the highest seq, per field.
  const latest = new Map();
  for (const l of lines.filter((x) => x.kind === 'commit' && x.data && x.data.step === kind && x.task).reverse()) {
    const recPath = path.join(root, 'store', 'commits', `${l.task}.${kind}.json`);
    if (!fs.existsSync(recPath)) {
      unreadable.push({ card_id: null, reason: 'commit-record-missing', detail: `${l.task}.${kind}` });
      continue;
    }
    const rec = readJson(recPath);
    const o = (rec.outputs || []).find((x) => x.kind === kind);
    if (!o) continue;
    const obj = getObject(root, o.id);
    if (!latest.has(obj.field)) latest.set(obj.field, { id: o.id, obj });
  }

  // Intake flags by (object, sid).
  const flagsBy = new Map();
  for (const l of lines.filter((x) => x.kind === 'intake')) {
    for (const f of (l.data && l.data.flagged) || []) {
      if (!FLAG_CODES.includes(f.code)) continue;
      const k = `${f.id}#${f.sid}`;
      if (!flagsBy.has(k)) flagsBy.set(k, []);
      flagsBy.get(k).push({ id: f.id, sid: f.sid, code: f.code, seq: l.seq, node: k });
    }
  }

  for (const [field, { id: objId, obj }] of [...latest.entries()].sort((a, b) => byStr(a[0], b[0]))) {
    if (flags.field != null && field !== flags.field) continue;
    const sentences = kind === 'pack' ? obj.conclusions : obj.sentences;
    for (const s of sentences || []) {
      if (s.kind !== 'fact') continue;
      const node = `${objId}#${s.sid}`;
      let flagOpen = false;
      for (const f of flagsBy.get(node) || []) {
        if (!(await flagCleared(root, f))) flagOpen = true;
      }
      for (const cardId of s.cites || []) {
        if (/^s_/.test(cardId)) {
          tamper.push(cardId);
          continue;
        }
        const st = store.status.get(cardId);
        const status = st ? st.status : 'pending';
        if (status !== 'witnessed' && status !== 'confirmed') {
          untrusted.push({ card_id: cardId, sid: s.sid, id: objId, status });
          continue;
        }
        if (status === 'confirmed' && !flagOpen) continue;
        const loaded = loadCard(root, cardId);
        if (loaded.error) {
          unreadable.push({ card_id: cardId, reason: loaded.error });
          continue;
        }
        out.push({ card_id: cardId, sid: s.sid, node, field, card: loaded.card, sentence: normaliseSentence(s) });
      }
    }
  }
  // In flight: a real item of an earlier batch of this mode with no status line carrying that batch.
  if (!flags.requeue) {
    const answered = new Set();
    for (const r of store.statusRecords) {
      if (r.check && r.check.batch) answered.add(`${r.check.batch}|${r.card_id}|${r.check.node ?? ''}`);
    }
    const flying = new Set();
    for (const it of earlierRealItems(root, mode)) {
      if (!answered.has(`${it.batch}|${it.card_id}|${it.node ?? ''}`)) flying.add(`${it.card_id}|${it.node ?? ''}`);
    }
    return { cands: out.filter((c) => !flying.has(`${c.card_id}|${c.node ?? ''}`)), untrusted, unreadable, tamper };
  }
  return { cands: out, untrusted, unreadable, tamper };
}

// ---------------------------------------------------------------------------------------------
// The plan: every decision, no write
// ---------------------------------------------------------------------------------------------

async function plan({ root, th, flags, ce }) {
  const mode = flags.mode;
  const withSentence = mode !== 'intake';
  const batchSize = flags['batch-size'] == null ? th.get('batch_size') : flags['batch-size'];
  const windowWords = th.get('window_words');
  if (!fs.existsSync(path.join(root, 'store'))) {
    return { exit: 2, reasons: [{ code: 'inputs-missing', detail: 'store/ is unreadable' }], result: { mode } };
  }
  const store = loadStore(root);
  const found = mode === 'intake'
    ? await intakeCandidateList(root, store, flags)
    : await sentenceCandidateList(root, store, flags, mode);
  if (found.tamper.length > 0) {
    return { exit: 3, tamper: true, reasons: [{ code: 'seed-id', detail: found.tamper.length }], result: { mode } };
  }
  const base = { mode, field: flags.field ?? null, untrusted: found.untrusted, unreadable: found.unreadable };

  found.cands.sort((a, b) => byStr(a.field, b.field) || byStr(a.card_id, b.card_id) || byStr(a.sid ?? '', b.sid ?? ''));
  const readWindow = makeWindowReader(root, store, windowWords);
  const real = [];
  const unreadable = [...found.unreadable];
  for (const c of found.cands) {
    if (real.length >= batchSize) break;
    const w = readWindow(c.card_id);
    if (w.error) {
      unreadable.push({ card_id: c.card_id, reason: w.error });
      continue;
    }
    real.push({ ...c, window: w.window });
  }
  base.unreadable = unreadable;
  if (real.length === 0) {
    if (found.cands.length > 0) {
      return { exit: 2, reasons: [{ code: 'inputs-missing', detail: unreadable }], result: { ...base, batch: null, n: 0 } };
    }
    return {
      exit: 0,
      reasons: [{ code: 'nothing-to-check', detail: null }],
      result: { ...base, batch: null, n: 0, n_real: 0, n_seeds: 0, reason: 'nothing-to-check' },
    };
  }

  const n = nextBatchNumber(root, ce);
  const batch = `b${ce}-${n}`;
  const head = await ledgerHead(root);
  const rngSeed = flags['rng-seed'] != null ? flags['rng-seed'] : `${batch}:${String(head.hash).slice(0, 16)}`;
  const r = makeRng(rngSeed);

  // Seeds
  const seeds = [];
  const skipped = [];
  if (!flags['no-seeds']) {
    const realIds = new Set(real.map((x) => x.card_id));
    const pool = [];
    for (const id of [...store.status.keys()].sort()) {
      const st = store.status.get(id);
      if (!st || (st.status !== 'witnessed' && st.status !== 'confirmed') || /^s_/.test(id) || realIds.has(id)) continue;
      const w = readWindow(id);
      if (w.error) continue;
      const loaded = loadCard(root, id);
      if (loaded.error) continue;
      if (flags.field != null && loaded.card.field !== flags.field) continue;
      pool.push({ id, card: loaded.card, window: w.window });
    }
    const wanted = flags.classes && flags.classes.length > 0 ? flags.classes : CLASSES;
    for (const cls of CLASSES.filter((c) => wanted.includes(c))) {
      if (needsSentence(cls) && !withSentence) {
        skipped.push({ class: cls, reason: 'needs-sentence' });
        continue;
      }
      if (pool.length === 0) {
        skipped.push({ class: cls, reason: 'no-pool-card' });
        continue;
      }
      const sources = r.shuffle(pool).slice(0, 40);
      const others = cls === 'S3' || cls === 'S4' ? r.shuffle(pool).slice(0, 40) : [null];
      let made = null;
      let lastReason = 'no-other-card';
      for (const src of sources) {
        for (const o of others) {
          if (o && o.id === src.id) continue;
          const out = makeSeed({
            cls, card: src.card, window: src.window, withSentence,
            other: o ? { card: o.card, window: o.window, cardId: o.id } : null,
            rng: r, batch, fromCard: src.id,
          });
          if (out.ok) {
            made = out;
            break;
          }
          lastReason = out.reason;
        }
        if (made) break;
      }
      if (made) seeds.push(made);
      else skipped.push({ class: cls, reason: lastReason });
    }
  }

  // Items and the key
  const all = [];
  const keyItems = {};
  for (const x of real) {
    const id = objectId('i', { batch, card_id: x.card_id, sid: x.sid });
    const body = { item: id, card: x.card, window: x.window };
    if (x.sentence) body.sentence = x.sentence;
    all.push({ id, body });
    keyItems[id] = x.node ? { seed: false, card_id: x.card_id, node: x.node } : { seed: false, card_id: x.card_id };
  }
  for (const s of seeds) {
    const id = objectId('i', { batch, seed_id: s.seed_id });
    const body = { item: id, card: s.card, window: s.window };
    if (s.sentence) body.sentence = s.sentence;
    all.push({ id, body });
    keyItems[id] = { seed: true, class: s.class, operator: s.operator, from_card: s.from_card, seed_id: s.seed_id };
  }
  const order = r.shuffle(all);
  return {
    exit: 0,
    reasons: [],
    write: {
      batch,
      key: { batch, rng_seed: rngSeed, items: keyItems },
      items: order,
      batchJson: { batch, mode, items: order.map((x) => x.id) },
      ledger: { batch, n: all.length, n_seeds: seeds.length, rng_seed: rngSeed },
    },
    result: {
      ...base, batch, n: all.length, n_real: real.length, n_seeds: seeds.length, rng_seed: rngSeed, skipped,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------------------------

async function main(ctx) {
  const { flags } = parseArgs(process.argv.slice(2), SPEC);
  if (!MODES.includes(flags.mode)) return usage(`--mode must be one of ${MODES.join(', ')}`);
  if (flags['batch-size'] != null && flags['batch-size'] < 1) return usage('--batch-size must be at least 1');
  for (const c of flags.classes || []) if (!CLASSES.includes(c)) return usage(`unknown seed class ${c}`);
  const root = path.resolve(flags.root);
  const edge = edgeFacts(flags);
  const th = thresholds(root);
  const dry = !!flags['dry-run'];
  const ce = flags.ce;

  const run = async (handle) => {
    const p = await plan({ root, th, flags, ce });
    const base = { exit: p.exit, mode: flags.mode, dry_run: dry, result: p.result, reasons: p.reasons };
    if (p.tamper) {
      if (!dry) {
        try {
          await recordIncident(root, handle, {
            ctx, ce, cls: 'refusal', detail: { tamper: true, script: SCRIPT, code: 'seed-id' }, now: edge.now,
          });
        } catch {
          // best effort (CONTRACT section 1.4)
        }
      }
      return base;
    }
    if (!p.write) return base;
    if (dry) return { ...base, result: { ...p.result, dry_run: true } };
    const w = p.write;
    fs.mkdirSync(path.join(root, 'sealed', 'seeds'), { recursive: true });
    fs.mkdirSync(path.join(root, 'queue', w.batch), { recursive: true });
    await createExclusive(path.join(root, 'sealed', 'seeds', `${w.batch}.json`), fileLine(w.key));
    for (const it of w.items) {
      await createExclusive(path.join(root, 'queue', w.batch, `item-${it.id}.json`), fileLine(it.body));
    }
    await createExclusive(path.join(root, 'queue', w.batch, 'batch.json'), fileLine(w.batchJson));
    await appendLedger(root, handle, { ctx, ce, kind: 'queue', data: w.ledger, now: edge.now });
    return base;
  };

  if (dry) {
    checkCe(root, ce);
    return await run(null);
  }
  const proc = realProc({ exe: th.get('proc_exe') });
  let out;
  await withRunLock(
    root,
    { script: SCRIPT, ce, proc, now: edge.now, retries: th.get('lock_retries') },
    async (handle) => { out = await run(handle); },
  );
  return out;
}

// Node sets import.meta.url to the realpath of the entry, so argv[1] is compared by its realpath too:
// started through a junction or a symlink the script must still run (a lexical compare would skip
// main() and exit 0 with nothing printed). Same comparison as guard-hook.mjs.
const isMain = (() => {
  if (import.meta.main === true) return true;
  try {
    if (typeof process.argv[1] !== 'string') return false;
    const key = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
    const self = key(fileURLToPath(import.meta.url));
    if (key(process.argv[1]) === self) return true;
    return key(fs.realpathSync(path.resolve(process.argv[1]))) === self;
  } catch {
    return false;
  }
})();
if (isMain) runMain(import.meta.url, SCRIPT, main);
