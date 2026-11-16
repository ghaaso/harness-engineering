// witness.mjs (unit U3a): the script half of promotion (R25). For a committed card, find its exact
// quote in the stored text of its source and its number within w characters of the quote, and bind
// the result to the card's and the snapshot's hashes. Writes witness records only (R13, §8.9).
// Spec: spec/witness.mjs.md. Formats: CONTRACT §3.13, §3.14, §3.7. Exits: CONTRACT §1.4.
//
// Named exports (pure, nothing happens on import):
//   normalize(s) -> {text, map}          map[i] = UTF-16 index in s of normalised index i;
//                                        map[text.length] = s.length
//   normalizeQuote(q) -> string          normalize(q).text without leading/trailing quote marks, `...`
//   numberTokens(normText) -> [{start, end, text, sign, readings, percent}]
//   tokenMatches(token, value, unit) -> bool
//   isPercentUnit(unit) -> bool
//   witnessCard(card, text, w) -> {result, reason, number_bound, quote_offset?, number_offset?}
//     (also accepts one object {card, text, w})

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';

const SCRIPT = 'witness';

// ---------------------------------------------------------------------------------------------
// Normalisation (step 5).

const ZERO_WIDTH = new Set([0x00ad, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff]);
const SINGLE_QUOTES = new Set([0x2018, 0x2019, 0x201a, 0x201b, 0x2039, 0x203a]);
const DOUBLE_QUOTES = new Set([0x201c, 0x201d, 0x201e, 0x201f, 0x00ab, 0x00bb]);
const DASHES = new Set([0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212, 0xfe58, 0xfe63, 0xff0d]);
const LINE_BREAKS = new Set([0x0a, 0x0b, 0x0c, 0x0d, 0x85, 0x2028, 0x2029]);
const MARK = /\p{M}/u;
const LETTER = /\p{L}/u;
const SPACE = /\s/u;

const isLetter = (cp) => (cp < 0x80 ? (cp >= 0x61 && cp <= 0x7a) || (cp >= 0x41 && cp <= 0x5a) : LETTER.test(String.fromCodePoint(cp)));

// One function for text and quote. Characters are processed in clusters (a code point and the
// combining marks after it, so NFKC can compose them); every output character of a cluster maps
// to the cluster's start. Typed arrays keep a 10 MB text affordable.
export function normalize(s) {
  const src = String(s ?? '');
  let cap = src.length + 16;
  let cps = new Uint32Array(cap);
  let at = new Int32Array(cap);
  let ws = new Uint8Array(cap); // 0 other, 1 space, 2 line break
  let n = 0;
  const push = (cp, pos, kind) => {
    if (n === cap) {
      cap *= 2;
      const c2 = new Uint32Array(cap); c2.set(cps); cps = c2;
      const a2 = new Int32Array(cap); a2.set(at); at = a2;
      const w2 = new Uint8Array(cap); w2.set(ws); ws = w2;
    }
    cps[n] = cp; at[n] = pos; ws[n] = kind; n++;
  };
  // Pass 1: NFKC, lower case, drop zero-width characters, map quotes and dashes; whitespace is
  // kept as a marker for passes 2 and 3.
  const emit = (cp, pos) => {
    if (ZERO_WIDTH.has(cp)) return;
    if (LINE_BREAKS.has(cp)) push(0x0a, pos, 2);
    else if (cp === 0x20 || cp === 0x09 || (cp >= 0x80 && SPACE.test(String.fromCodePoint(cp)))) push(0x20, pos, 1);
    else if (SINGLE_QUOTES.has(cp)) push(0x27, pos, 0);
    else if (DOUBLE_QUOTES.has(cp)) push(0x22, pos, 0);
    else if (DASHES.has(cp)) push(0x2d, pos, 0);
    else push(cp, pos, 0);
  };
  let i = 0;
  while (i < src.length) {
    const start = i;
    const cp = src.codePointAt(i);
    i += cp > 0xffff ? 2 : 1;
    while (i < src.length) {
      const c2 = src.codePointAt(i);
      if (c2 < 0x300 || !MARK.test(String.fromCodePoint(c2))) break;
      i += c2 > 0xffff ? 2 : 1;
    }
    if (i - start === 1 && cp < 0x80) {
      emit(cp >= 0x41 && cp <= 0x5a ? cp + 0x20 : cp, start);
    } else {
      for (const ch of src.slice(start, i).normalize('NFKC').toLowerCase()) emit(ch.codePointAt(0), start);
    }
  }
  // Pass 2: a hyphen followed by a line break between two letters goes, with the break.
  const drop = new Uint8Array(n);
  for (let k = 1; k < n; k++) {
    if (cps[k] !== 0x2d || ws[k - 1] !== 0 || !isLetter(cps[k - 1])) continue;
    let j = k + 1;
    let sawBreak = false;
    while (j < n && ws[j] > 0) {
      if (ws[j] === 2) sawBreak = true;
      j++;
    }
    if (sawBreak && j < n && isLetter(cps[j])) {
      for (let x = k; x < j; x++) drop[x] = 1;
      k = j - 1;
    }
  }
  // Pass 3: whitespace runs to one space; trim.
  const map = new Int32Array(2 * n + 1);
  const pieces = [];
  let chunk = [];
  let len = 0;
  let pendingSpace = -1;
  const out = (cp, pos) => {
    chunk.push(cp);
    map[len++] = pos;
    if (cp > 0xffff) map[len++] = pos;
    if (chunk.length >= 4096) {
      pieces.push(String.fromCodePoint(...chunk));
      chunk = [];
    }
  };
  for (let k = 0; k < n; k++) {
    if (drop[k]) continue;
    if (ws[k] > 0) {
      if (pendingSpace < 0) pendingSpace = at[k];
      continue;
    }
    if (pendingSpace >= 0) {
      if (len > 0) out(0x20, pendingSpace);
      pendingSpace = -1;
    }
    out(cps[k], at[k]);
  }
  if (chunk.length) pieces.push(String.fromCodePoint(...chunk));
  map[len] = src.length;
  return { text: pieces.join(''), map: map.subarray(0, len + 1) };
}

export function normalizeQuote(q) {
  let t = normalize(q).text;
  for (;;) {
    const before = t;
    t = t.trim().replace(/^(?:['"]|\.\.\.)+/, '').replace(/(?:['"]|\.\.\.)+$/, '').trim();
    if (t === before) break;
  }
  return t;
}

// ---------------------------------------------------------------------------------------------
// Numbers (step 7).

const PERCENT_UNITS = new Set(['%', 'percent', 'per cent', 'pct', 'percentage', 'percentage points',
  'percentage point', 'percent points', 'pp', 'p.p.', '% points']);

export function isPercentUnit(unit) {
  return PERCENT_UNITS.has(String(unit ?? '').trim().toLowerCase());
}

const GROUP_SEP = /[   ]/;
const NUM_RE = /([-+]?)(\d{1,3}(?:[ ,  ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?!\d)/gu;

function readingsOf(body) {
  const s = body.replace(/[   ]/g, '');
  const out = [];
  // comma as thousands (and `.` as decimal)
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s) || /^\d+(?:\.\d+)?$/.test(s)) out.push(Number(s.replace(/,/g, '')));
  // comma as decimal
  if (/^\d+,\d+$/.test(s)) {
    const v = Number(s.replace(',', '.'));
    if (!out.includes(v)) out.push(v);
  }
  return out.filter((v) => Number.isFinite(v));
}

function percentAfter(t, end) {
  return /^ ?(?:%|percent\b|per cent\b)/u.test(t.slice(end, end + 12));
}

export function numberTokens(t) {
  const text = String(t ?? '');
  const out = [];
  NUM_RE.lastIndex = 0;
  let m;
  while ((m = NUM_RE.exec(text)) !== null) {
    let sign = m[1];
    let start = m.index;
    const body = m[2];
    const bodyStart = m.index + sign.length;
    // A sign glued to a letter or digit is a hyphen (COVID-19, 3-5), not a sign.
    if (sign && start > 0 && /[\p{L}\p{N}]/u.test(text[start - 1])) {
      sign = '';
      start = bodyStart;
    }
    // Never start inside a run of digits.
    if (!sign && start > 0 && /\d/.test(text[start - 1])) continue;
    const end = bodyStart + body.length;
    out.push({ start, end, text: text.slice(start, end), sign, readings: readingsOf(body), percent: percentAfter(text, end) });
    // A token grouped by spaces also yields each space-separated part as a token of its own.
    if (GROUP_SEP.test(body)) {
      let off = 0;
      const parts = body.split(GROUP_SEP);
      parts.forEach((p, idx) => {
        const pStart = bodyStart + off;
        const pEnd = pStart + p.length;
        const pSign = idx === 0 ? sign : '';
        out.push({
          start: idx === 0 ? start : pStart,
          end: pEnd,
          text: text.slice(idx === 0 ? start : pStart, pEnd),
          sign: pSign,
          readings: readingsOf(p),
          percent: percentAfter(text, pEnd),
        });
        off += p.length + 1;
      });
    }
  }
  return out.sort((a, b) => a.start - b.start || b.end - a.end);
}

export function tokenMatches(tok, value, unit) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (tok.percent && !isPercentUnit(unit)) return false;
  for (const r of tok.readings) {
    const signed = tok.sign === '-' ? -r : r;
    if (signed === value) return true;
    if (tok.sign === '' && r === Math.abs(value)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// One card against one stored text (steps 6-8).

export function witnessCard(cardArg, textArg, wArg) {
  let card = cardArg;
  let text = textArg;
  let w = wArg;
  if (textArg === undefined && cardArg && typeof cardArg === 'object' && 'card' in cardArg) {
    ({ card, text, w } = cardArg);
  }
  const N = normalize(text);
  const q = normalizeQuote(card?.quote ?? '');
  const occ = [];
  if (q.length > 0) {
    let k = N.text.indexOf(q);
    while (k >= 0) {
      occ.push(k);
      k = N.text.indexOf(q, k + 1);
    }
  }
  const value = card?.measured?.value;
  const unit = card?.measured?.unit;
  const numeric = typeof value === 'number' && Number.isFinite(value);
  const matches = numeric ? numberTokens(N.text).filter((t) => tokenMatches(t, value, unit)) : [];

  if (occ.length > 0) {
    if (!numeric) {
      if (value === 'not stated') {
        return { result: 'witnessed', reason: 'ok', number_bound: false, quote_offset: N.map[occ[0]] };
      }
      return { result: 'rejected', reason: 'number-missing', number_bound: false, quote_offset: N.map[occ[0]] };
    }
    for (const s of occ) {
      const e = s + q.length;
      let best = null;
      let bestDist = Infinity;
      for (const t of matches) {
        if (t.start < s - w || t.start > e + w) continue;
        const dist = t.start < s ? s - t.start : t.start > e ? t.start - e : 0;
        if (dist < bestDist) {
          best = t;
          bestDist = dist;
        }
      }
      if (best) {
        return {
          result: 'witnessed', reason: 'ok', number_bound: true,
          quote_offset: N.map[s], number_offset: N.map[best.start],
        };
      }
    }
    return { result: 'rejected', reason: 'number-missing', number_bound: false, quote_offset: N.map[occ[0]] };
  }
  if (matches.length > 0) {
    return { result: 'rejected', reason: 'number-without-quote', number_bound: false, number_offset: N.map[matches[0].start] };
  }
  return { result: 'rejected', reason: 'quote-missing', number_bound: false };
}

// ---------------------------------------------------------------------------------------------
// The script.

const CARD_ID = /^c_[0-9a-f]{16}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

function usage(detail) {
  return new lib.TcbError('usage', 66, detail);
}

function isoOf(now) {
  if (now instanceof Date) return now.toISOString();
  if (typeof now === 'number') return new Date(now).toISOString();
  return String(now);
}

function dirsOf(root) {
  const P = lib.paths(root);
  const base = typeof P.snapshots === 'string' ? P.snapshots : path.join(root, '.snapshots');
  return {
    objects: typeof P.objects === 'string' ? P.objects : path.join(root, 'store', 'objects'),
    witness: typeof P.witness === 'string' ? P.witness : path.join(root, 'store', 'witness.jsonl'),
    text: path.join(base, 'text'),
    meta: path.join(base, 'meta'),
    byUrl: path.join(base, 'by-url'),
  };
}

function readRecords(file) {
  if (!fs.existsSync(file)) return [];
  return lib.readJsonl(file).records.filter((r) => r && typeof r === 'object');
}

// Step 3: the snapshot of a card's source.
function chooseSnapshot(dirs, url) {
  let key;
  try {
    key = lib.urlKey(url);
  } catch {
    return { reason: 'no-snapshot' };
  }
  const lines = readRecords(path.join(dirs.byUrl, `${key}.jsonl`));
  let line = null;
  for (const l of lines) if (typeof l.raw_sha === 'string' && l.raw_sha) line = l;
  if (!line) return { reason: 'no-snapshot' };
  const snap = { line, raw_sha: line.raw_sha };
  let meta;
  try {
    meta = lib.readJson(path.join(dirs.meta, `${line.raw_sha}.json`));
  } catch (e) {
    if (e?.exit === 2) return { ...snap, reason: 'no-snapshot' };
    throw e;
  }
  if (typeof meta?.text_sha === 'string' && meta.text_sha) {
    const file = path.join(dirs.text, meta.text_sha);
    let bytes;
    try {
      bytes = fs.readFileSync(file);
    } catch {
      return { ...snap, reason: 'no-snapshot' };
    }
    if (lib.sha256hex(bytes) !== meta.text_sha) {
      throw new lib.TcbError('snapshot-mismatch', 3, { text_sha: meta.text_sha, raw_sha: line.raw_sha });
    }
    return { ...snap, text_sha: meta.text_sha, text: bytes.toString('utf8') };
  }
  if (meta?.reason === 'pdf') return { ...snap, reason: 'pdf' };
  if (meta?.reason === 'empty-text') return { ...snap, reason: 'empty-text' };
  return { ...snap, reason: 'no-snapshot' };
}

async function tamperIncident(root, ctx, lockCtx, code) {
  try {
    await lib.withRunLock(root, { script: SCRIPT, ...lockCtx }, (handle) => {
      lib.recordIncident(root, handle, {
        ctx, ce: lockCtx.ce, cls: 'refusal', detail: { tamper: true, script: SCRIPT, code }, now: lockCtx.now,
      });
    });
  } catch (e) {
    process.stderr.write(`witness: could not record the tamper incident (${e?.code ?? e?.message})\n`);
  }
}

const REJECT_ORDER = ['card-changed', 'quote-missing', 'number-missing', 'number-without-quote'];
const UNVERIFIABLE_ORDER = ['no-snapshot', 'pdf', 'empty-text'];

function reasonGroups(records) {
  const groups = [];
  for (const slug of [...REJECT_ORDER, ...UNVERIFIABLE_ORDER]) {
    const ids = records.filter((r) => r.reason === slug).map((r) => r.card_id);
    if (ids.length) groups.push({ code: slug, detail: ids });
  }
  return groups;
}

async function main(ctx) {
  const { flags } = lib.parseArgs(process.argv.slice(2), {
    flags: {
      root: { type: 'string', required: true },
      ce: { type: 'int', required: true },
      card: { type: 'list' },
      now: { type: 'string' },
      'dry-run': { type: 'bool' },
    },
  });
  let cardFlags = flags.card;
  if (cardFlags === undefined) cardFlags = [];
  if (!Array.isArray(cardFlags)) cardFlags = [cardFlags];
  for (const c of cardFlags) {
    if (typeof c !== 'string' || !CARD_ID.test(c)) throw usage({ flag: 'card', value: String(c) });
  }
  if (!path.isAbsolute(flags.root)) throw usage({ flag: 'root', message: 'must be absolute' });
  if (flags.now !== undefined && (!ISO_RE.test(flags.now) || Number.isNaN(Date.parse(flags.now)))) {
    throw usage({ flag: 'now', message: 'malformed iso time' });
  }
  const root = flags.root;
  const ce = flags.ce;
  const dryRun = flags['dry-run'] === true;
  const explicit = cardFlags.length > 0;
  const now = lib.edgeFacts(flags).now;
  const at = isoOf(now);

  // Step 1.
  const th = lib.thresholds(root);
  const w = th.get('w_chars');
  const lockParams = dryRun ? null : { retries: th.get('lock_retries'), exe: th.get('proc_exe') };
  lib.checkCe(root, ce);
  const proc = dryRun ? null : lib.realProc({ exe: lockParams.exe });
  const lockCtx = { ce, proc, now, retries: lockParams?.retries };
  const dirs = dirsOf(root);

  try {
    // Step 2: the cards.
    let ids;
    if (explicit) ids = [...new Set(cardFlags)].sort();
    else {
      let names = [];
      try {
        names = fs.readdirSync(dirs.objects);
      } catch {
        names = [];
      }
      ids = names.filter((n) => /^c_[0-9a-f]{16}\.json$/.test(n)).map((n) => n.slice(0, -5)).sort();
    }
    const cards = ids.map((id) => ({ id, card: lib.getObject(root, id) }));

    // Previous witness records (decisions are taken outside the lock; seq is read inside it).
    const lastById = new Map();
    for (const r of readRecords(dirs.witness)) if (typeof r.card_id === 'string') lastById.set(r.card_id, r);

    // Steps 3-8.
    const records = [];
    let skipped = 0;
    let tampered = false;
    for (const { id, card } of cards) {
      const cardSha = lib.sha256hex(lib.canonicalize(card));
      const snap = chooseSnapshot(dirs, card?.source?.url);
      const prev = lastById.get(id);
      const rawSha = snap.raw_sha ?? null;
      const textSha = snap.text_sha ?? null;
      if (!explicit && prev && prev.card_sha === cardSha
        && (prev.raw_sha ?? null) === rawSha && (prev.text_sha ?? null) === textSha) {
        skipped += 1;
        continue;
      }
      const sourceChanged = Boolean(snap.line?.source_changed === true)
        || Boolean(prev && typeof prev.text_sha === 'string' && prev.text_sha !== textSha);
      const rec = { schema_version: 1, card_id: id, card_sha: cardSha };
      if (rawSha) rec.raw_sha = rawSha;
      if (textSha) rec.text_sha = textSha;
      if (prev && prev.card_sha !== cardSha) {
        // Step 4: the card changed after it was witnessed.
        tampered = true;
        Object.assign(rec, { result: 'rejected', number_bound: false, reason: 'card-changed' });
      } else if (snap.text === undefined) {
        Object.assign(rec, { result: 'unverifiable', number_bound: false, reason: snap.reason });
      } else {
        const v = witnessCard(card, snap.text, w);
        rec.result = v.result;
        if (v.quote_offset !== undefined) rec.quote_offset = v.quote_offset;
        if (v.number_offset !== undefined) rec.number_offset = v.number_offset;
        rec.number_bound = v.number_bound;
        rec.reason = v.reason;
      }
      rec.source_changed = sourceChanged;
      rec.w = w;
      rec.at = at;
      records.push(rec);
    }

    const counts = {
      witnessed: records.filter((r) => r.result === 'witnessed').length,
      rejected: records.filter((r) => r.result === 'rejected').length,
      unverifiable: records.filter((r) => r.result === 'unverifiable').length,
    };
    let exit = 0;
    if (tampered) exit = 3;
    else if (counts.rejected > 0) exit = 1;
    else if (counts.unverifiable > 0) exit = 2;

    // Step 9.
    let firstSeq = null;
    let lastSeq = null;
    if (!dryRun && records.length > 0) {
      await lib.withRunLock(root, { script: SCRIPT, ...lockCtx }, (handle) => {
        const existing = readRecords(dirs.witness);
        let seq = 0;
        for (let k = existing.length - 1; k >= 0; k--) {
          if (Number.isInteger(existing[k].seq)) {
            seq = existing[k].seq;
            break;
          }
        }
        fs.mkdirSync(path.dirname(dirs.witness), { recursive: true });
        for (const rec of records) {
          seq += 1;
          rec.seq = seq;
          if (firstSeq === null) firstSeq = seq;
          lastSeq = seq;
          lib.appendJsonl(dirs.witness, rec, handle);
        }
        lib.appendLedger(root, handle, {
          ctx, ce, kind: 'witness', data: { counts, first_seq: firstSeq, last_seq: lastSeq }, now,
        });
        const checkResult = counts.rejected > 0 ? 'fail' : counts.unverifiable > 0 ? 'not_run' : 'pass';
        lib.appendLedger(root, handle, {
          ctx, ce, kind: 'check', now,
          data: {
            check: 'witness',
            subject: 'witness',
            result: checkResult,
            reasons: [
              { code: 'range', detail: { cards: records.length, first_seq: firstSeq, last_seq: lastSeq } },
              ...reasonGroups(records),
            ],
          },
        });
        if (tampered) {
          lib.recordIncident(root, handle, {
            ctx, ce, cls: 'refusal', detail: { tamper: true, script: SCRIPT, code: 'card-changed' }, now,
          });
        }
      });
    }

    const reasons = [];
    if (exit === 1) reasons.push({ code: 'rejected', detail: { cards: counts.rejected } });
    if (exit === 2) reasons.push({ code: 'unverifiable', detail: { cards: counts.unverifiable } });
    reasons.push(...reasonGroups(records));
    for (const r of records) {
      process.stderr.write(`witness: ${r.card_id} ${r.result} (${r.reason})\n`);
    }
    const out = records.map((r) => {
      const { schema_version: _v, ...rest } = r;
      return rest;
    });
    return {
      exit,
      dry_run: dryRun,
      result: { ...(dryRun ? { dry_run: true } : {}), records: out, counts, skipped },
      reasons,
    };
  } catch (e) {
    if (e?.exit === 3 && e.code !== 'ledger-broken' && e.code !== 'run-from-attempt' && !dryRun) {
      await tamperIncident(root, ctx, lockCtx, e.code);
    }
    throw e;
  }
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    const self = fs.realpathSync(fileURLToPath(import.meta.url));
    const run = fs.realpathSync(path.resolve(process.argv[1]));
    return process.platform === 'win32' ? self.toLowerCase() === run.toLowerCase() : self === run;
  } catch {
    return false;
  }
}

if (isMain()) lib.runMain(import.meta.url, SCRIPT, main);
