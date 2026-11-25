// tools/journal.mjs: the only way to add records to the library journal (unit T8-JOURNAL, top session 8, 2026-11-24;
// ruling r57-0056; library/README.md rule 1 and "How to add records"; mistakes t7-0607, t7-0800, t7-0801).
//
//   node tools/journal.mjs [records.json | -] [--prefix p] [--date YYYY-MM-DD]          dry run: prints what it would add
//   node tools/journal.mjs [records.json | -] [--prefix p] [--date YYYY-MM-DD] --append  adds the records
//   node tools/journal.mjs --check                        read-only: is every journal file in a state the tool wrote?
//   node tools/journal.mjs --adopt <journal file>... [--apply]   once, for lines written before this tool existed
//
// Input: a JSON array of records, one record, or JSON lines, from the file named or from stdin. A record carries no
// id, or only a requested prefix ("id": "t8" or "t8-"); --prefix, else the record's "by", names the prefix otherwise.
// The tool assigns each record the next free number in its kind's range (library/README.md "Id ranges by kind"):
// one above the highest number of that prefix in that range in every journal file of every date folder, in git's
// index and HEAD, and among the numbers the tool has ever issued (so an id whose line was lost is not issued again).
// "{#n}" in any text or list item stands for the id given to the n-th record of the same input (1-based), so records
// of one batch can name each other. "date" defaults to today and "by" to the prefix; the fields are put in the
// README's order; each record is checked by the rules the commit check uses (tools/journal-rules.mjs); one error
// refuses the whole input. The records go to library/journal/<date>/<prefix>.jsonl, with the file's own line end.
// A correction is a new record whose "supersedes" names the record it corrects (README rule 2).
//
// It never rewrites or removes a line: it opens the file for appending only, after checking that the file is in the
// state the tool last wrote (or, if the tool never wrote it, the state of the last commit); if not, it refuses and
// says what changed. Appends are serialised by a lock and recorded in the seal (tools/journal-rules.mjs).
import { readFileSync, openSync, writeSync, fsyncSync, closeSync, mkdirSync, statSync, existsSync, appendFileSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  ORDER, RANGE, JOURNAL, isJournal, parseId, linesOf, idOfLine, parseLine, validateRecord, sha256, lineSha, findCheckout,
  listJournal, headState, headText, readSeal, writeSeal, checkoutOf, saveCopy, readCopy, dropCopy, lock, LOCK_WAIT_MS, judgeFile, lineDiff, today,
} from './journal-rules.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const say = (s) => process.stdout.write(s + '\n');
function fail(msg, code = 1) { process.stderr.write('journal: ' + msg + '\n'); process.exit(code); }

// The checkout whose journal is written: the one the command runs in, else the one holding this file.
const ck = findCheckout(process.cwd()) && existsSync(join(findCheckout(process.cwd()).top, ...JOURNAL.split('/')))
  ? findCheckout(process.cwd()) : findCheckout(here);
if (!ck) fail('no git checkout found here or around the tool.');
const top = ck.top;

function readInput() {
  const named = argv.find((a, i) => !a.startsWith('--') && !['--prefix', '--date'].includes(argv[i - 1]));
  let text;
  try { text = !named || named === '-' ? readFileSync(0, 'utf8') : readFileSync(resolve(named), 'utf8'); } catch (e) { fail(`cannot read the records (${e.message}).`); }
  text = text.replace(/^﻿/, '');
  let recs;
  try { const v = JSON.parse(text); recs = Array.isArray(v) ? v : [v]; } catch {
    recs = [];
    const ls = linesOf(text);
    for (let k = 0; k < ls.length; k++) {
      if (!ls[k].trim()) continue;
      try { recs.push(JSON.parse(ls[k])); } catch { fail(`input line ${k + 1} is not JSON (give a JSON array, one record, or one record per line).`); }
    }
  }
  if (!recs.length) fail('no records in the input.');
  return recs;
}

// Every id in use: the working journal files (by JSON, so a line's spacing does not hide its id), git's index and HEAD.
function usedIds() {
  const uses = new Map();
  const add = (id, where) => { if (!uses.has(id)) uses.set(id, []); uses.get(id).push(where); };
  for (const [rel] of listJournal(top)) {
    if (!isJournal(rel)) continue;
    let t = '';
    try { t = readFileSync(join(top, rel), 'utf8'); } catch { continue; }
    for (const l of linesOf(t)) { const id = idOfLine(l); if (id) add(id, rel); }
  }
  const extra = new Set();
  for (const where of ['--cached', 'HEAD']) {
    let out = '';
    try { out = execFileSync('git', ['-C', top, 'grep', '-h', '-o', '-E', '"id" *: *"[a-z0-9]+-[0-9]{4}"', ...(where === 'HEAD' ? ['HEAD'] : ['--cached']), '--', JOURNAL], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, maxBuffer: 1 << 28 }); } catch {}
    for (const m of out.matchAll(/"id" *: *"([a-z0-9]+-\d{4})"/g)) extra.add(m[1]);
  }
  for (const id of extra) if (!uses.has(id)) add(id, 'git');
  return uses;
}

// Each file's state against the seal and HEAD; the bad ones with what changed.
function inspect(seal, rels) {
  const c = checkoutOf(seal, ck.key);
  const hs = headState(top);
  const present = listJournal(top);
  const all = rels || [...new Set([...present.keys(), ...hs.blobs.keys(), ...Object.keys(c.files)])];
  const bad = [];
  for (const rel of all) {
    let buf = null;
    try { buf = present.has(rel) ? readFileSync(join(top, rel)) : null; } catch {}
    const entry = c.files[rel];
    const r = judgeFile(rel, buf, entry, hs.blobs.get(rel), hs.head, () => headText(top, rel));
    if (r.ok) continue;
    const base = entry && entry.head === hs.head ? readCopy(ck.common, entry.sha) : headText(top, rel);
    bad.push({ rel, why: r.why, diff: lineDiff(base, buf), copy: entry ? join(ck.common, 'journal-seal.d', entry.sha + '.jsonl') : null, sealed: !!entry });
  }
  return { bad, hs, present };
}
const describe = (b) => `${b.rel}: ${b.why}; ${b.diff.lost.length} line(s) of its last good state gone or changed${b.diff.lost.length ? ` (${b.diff.lost.slice(0, 6).join(', ')})` : ''}, ` +
  `${b.diff.added.length} line(s) not written by this tool${b.diff.added.length ? ` (${b.diff.added.slice(0, 6).join(', ')})` : ''}` +
  (b.copy ? `; the tool's last state of it is kept at ${b.copy}` : '');

function log(o) { try { appendFileSync(join(ck.common, 'journal-tool.log'), JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n'); } catch {} }

// Records the state of rel after the tool wrote (or adopted) it.
function seal(sealObj, rel, buf, head, newLines) {
  const c = checkoutOf(sealObj, ck.key);
  const old = c.files[rel];
  const sha = sha256(buf);
  saveCopy(ck.common, buf, sha);
  if (old && old.sha !== sha) dropCopy(ck.common, old.sha);
  // pending: the lines the tool added since the commit HEAD is; those HEAD now holds are dropped
  let pending = old && old.head === head ? old.pending || [] : [];
  if (old && old.head !== head && old.pending && old.pending.length) {
    const ht = headText(top, rel);
    const inHead = new Set(linesOf(ht ? ht.toString('utf8') : '').map(lineSha));
    pending = old.pending.filter(([s]) => !inHead.has(s));
  }
  for (const l of newLines) { const s = lineSha(l); pending.push([s, idOfLine(l)]); sealObj.lines[s] = 1; const p = parseId(idOfLine(l)); if (p) { const xs = (sealObj.issued[p.prefix] ||= []); if (!xs.includes(p.n)) xs.push(p.n); } }
  const st = statSync(join(top, rel));
  c.files[rel] = { sha, size: buf.length, head, pending };
  c.known[rel] = [st.size, st.mtimeMs];
  delete c.flagged[rel];
}

// ---- --check ----
if (flag('--check')) {
  const s = readSeal(ck.common);
  const { bad } = inspect(s);
  if (!bad.length) { say(`journal: every file under ${JOURNAL} of ${top} is in a state the tool wrote or the last commit holds.`); process.exit(0); }
  for (const b of bad) say('NOT CLEAN  ' + describe(b));
  process.exit(1);
}

// ---- --adopt ----
if (flag('--adopt')) {
  const files = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--date' && argv[i - 1] !== '--prefix');
  if (!files.length) fail('--adopt needs the journal files to adopt.');
  const apply = flag('--apply');
  const release = lock(ck.common, LOCK_WAIT_MS);
  if (!release) fail('the journal is locked by another run of the tool (try again).');
  process.on('exit', release); // also when a refusal ends the run early
  try {
    const s = readSeal(ck.common), c = checkoutOf(s, ck.key);
    const hs = headState(top);
    const uses = usedIds();
    const exists = (id) => uses.has(id);
    const plan = [];
    for (const f of files) {
      const rel = (resolve(f).startsWith(top) ? resolve(f).slice(top.length + 1) : f).replace(/\\/g, '/');
      if (!isJournal(rel)) fail(`${f} is not a journal file (${JOURNAL}/<date>/<prefix>.jsonl).`);
      let buf;
      try { buf = readFileSync(join(top, rel)); } catch { fail(`${rel} cannot be read.`); }
      const ht = headText(top, rel) || Buffer.alloc(0);
      if (!buf.subarray(0, ht.length).equals(ht)) fail(`${rel}: a line the last commit holds was changed or removed; adopting does not cover that (README rule 1). Tell the owner.`);
      const entry = c.files[rel];
      let baseLen = ht.length;
      if (entry && entry.head === hs.head) {
        const cp = readCopy(ck.common, entry.sha);
        if (!cp || !buf.subarray(0, cp.length).equals(cp)) fail(`${rel}: a line this tool wrote was changed or removed since; adopting does not cover that (README rule 1). Tell the owner.`);
        baseLen = Math.max(baseLen, cp.length);
      }
      const added = linesOf(buf.subarray(baseLen).toString('utf8')).filter((l) => l.trim());
      const stem = basename(rel, '.jsonl');
      const errors = [];
      added.forEach((l, k) => {
        const where = `${rel} (adopted line ${k + 1})`;
        const p = parseLine(l, where);
        if (p.error) { errors.push(p.error); return; }
        errors.push(...validateRecord(p.o, { where, stem, uses: (id) => uses.get(id), exists }));
      });
      if (errors.length) fail('nothing adopted:\n  ' + errors.join('\n  '));
      plan.push({ rel, buf, added });
    }
    for (const p of plan) {
      say(`${p.rel}: ${p.added.length} line(s) to adopt${p.added.length ? ': ' + p.added.map(idOfLine).join(', ') : ''}`);
    }
    if (!apply) { say('dry run: nothing sealed. Add --apply to adopt these lines as written before the tool existed.'); process.exit(0); }
    for (const p of plan) seal(s, p.rel, p.buf, hs.head, p.added);
    writeSeal(ck.common, s);
    log({ op: 'adopt', files: plan.map((p) => ({ rel: p.rel, ids: p.added.map(idOfLine) })) });
    say('adopted.');
  } finally { release(); }
  process.exit(0);
}

// ---- add records ----
const append = flag('--append');
const date = opt('--date') || today();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`--date must be YYYY-MM-DD, not "${date}".`);
const recs = readInput();
const release = lock(ck.common, LOCK_WAIT_MS);
if (!release) fail('the journal is locked by another run of the tool (try again).');
  process.on('exit', release); // also when a refusal ends the run early
let code = 0;
try {
  const s = readSeal(ck.common);
  const uses = usedIds();
  const errors = [];
  // 1. prefix and id of each record
  const planned = recs.map((r, k) => {
    const n = k + 1;
    if (!r || typeof r !== 'object' || Array.isArray(r)) { errors.push(`record ${n}: not a JSON object.`); return null; }
    let prefix = null;
    if ('id' in r) {
      const m = /^([a-z0-9]+)-?$/.exec(String(r.id));
      if (!m) { errors.push(`record ${n}: "id" is "${r.id}"; ids are assigned by this tool (t7-0607). Give no id, or only a prefix ("id": "t8").`); return null; }
      prefix = m[1];
    }
    prefix ||= opt('--prefix') || (typeof r.by === 'string' && /^[a-z0-9]+$/.test(r.by) ? r.by : null);
    if (!prefix || !/^[a-z0-9]+$/.test(prefix)) { errors.push(`record ${n}: no writer prefix (lowercase letters and digits): give --prefix, "by", or "id": "<prefix>".`); return null; }
    const range = RANGE[r.kind];
    if (!range) { errors.push(`record ${n}: kind "${r.kind}" is not one of ${Object.keys(RANGE).join(', ')}.`); return null; }
    return { r, prefix, range };
  });
  if (!errors.length) {
    const taken = new Map(); // prefix -> Set of numbers
    const numbers = (prefix) => {
      if (!taken.has(prefix)) {
        const set = new Set(s.issued[prefix] || []);
        for (const id of uses.keys()) { const p = parseId(id); if (p && p.prefix === prefix) set.add(p.n); }
        taken.set(prefix, set);
      }
      return taken.get(prefix);
    };
    for (const p of planned) {
      const set = numbers(p.prefix);
      let hi = p.range[0] - 1;
      for (const x of set) if (x >= p.range[0] && x <= p.range[1] && x > hi) hi = x;
      const n = hi + 1;
      if (n > p.range[1]) { errors.push(`writer ${p.prefix} has used every number of the ${p.r.kind} range ${p.range[0]}-${p.range[1]}; take a new prefix.`); continue; }
      set.add(n);
      p.id = `${p.prefix}-${String(n).padStart(4, '0')}`;
    }
  }
  // 2. the records: placeholders, defaults, field order, the rules
  const files = new Map(); // rel -> [lines]
  if (!errors.length) {
    const ids = planned.map((p) => p.id);
    const fill = (v) => {
      if (typeof v === 'string') return v.replace(/\{#(\d+)\}/g, (all, k) => ids[Number(k) - 1] || (errors.push(`"${all}" names no record of this input (it has ${ids.length}).`), all));
      if (Array.isArray(v)) return v.map(fill);
      return v;
    };
    const newIds = new Map(ids.map((id) => [id, 'this input']));
    for (const p of planned) {
      const o = { ...p.r, id: p.id };
      if (o.date === undefined) o.date = date;
      if (o.by === undefined) o.by = p.prefix;
      const rec = {};
      for (const k of ORDER) if (k in o && o[k] !== undefined && o[k] !== null && !(Array.isArray(o[k]) && !o[k].length) && o[k] !== '') rec[k] = fill(o[k]);
      for (const k of Object.keys(o)) if (!ORDER.includes(k)) rec[k] = o[k]; // kept, so the rules name it
      const rel = `${JOURNAL}/${date}/${p.prefix}.jsonl`;
      const where = `${p.id} (for ${rel})`;
      const usesOf = (id) => [...(uses.get(id) || []), ...(newIds.has(id) ? ['this input'] : [])];
      errors.push(...validateRecord(rec, { where, stem: p.prefix, uses: usesOf, exists: (id) => uses.has(id) || newIds.has(id) }));
      if (!files.has(rel)) files.set(rel, []);
      files.get(rel).push(JSON.stringify(rec));
    }
  }
  if (errors.length) { process.stderr.write('journal: nothing added:\n  ' + errors.join('\n  ') + '\n'); code = 1; }
  else {
    // 3. each target file must be in a state the tool wrote, or the last commit's
    const { bad, hs } = inspect(s, [...files.keys()].filter((rel) => existsSync(join(top, rel)) || checkoutOf(s, ck.key).files[rel]));
    if (bad.length) {
      process.stderr.write('journal: nothing added: a target file was changed outside this tool since it last wrote it (library/README.md rule 1):\n  ' +
        bad.map(describe).join('\n  ') + '\n  Do not repair it by hand; tell the top session, which tells the owner (r57-0055 is the precedent).\n');
      code = 1;
    } else {
      for (const [rel, lines] of files) {
        const p = join(top, rel);
        let base = Buffer.alloc(0);
        try { base = readFileSync(p); } catch {}
        const eol = /\r\n/.test(base.subarray(0, 65536).toString('utf8')) ? '\r\n' : '\n';
        const lead = base.length && !/\n$/.test(base.subarray(-1).toString('utf8')) ? eol : '';
        const add = lead + lines.join(eol) + eol;
        say(`${rel}  (${base.length ? `after line ${linesOf(base.toString('utf8')).length}` : 'new file'}${eol === '\r\n' ? ', CRLF' : ''})`);
        for (const l of lines) say('  ' + l);
        if (!append) continue;
        mkdirSync(dirname(p), { recursive: true });
        const fd = openSync(p, 'a'); // append only: no byte before the end can change
        try { writeSync(fd, add); fsyncSync(fd); } finally { closeSync(fd); }
        const after = readFileSync(p);
        if (!after.equals(Buffer.concat([base, Buffer.from(add, 'utf8')]))) {
          // another writer at the same moment: this tool's lines are recorded, the file's state is not (the watch and the
          // commit check then report the foreign bytes)
          process.stderr.write(`journal: ${rel} is not what this append should have made (another writer at the same moment?); check it with --check.\n`);
          code = 1;
          for (const l of lines) { s.lines[lineSha(l)] = 1; const q = parseId(idOfLine(l)); if (q) { const xs = (s.issued[q.prefix] ||= []); if (!xs.includes(q.n)) xs.push(q.n); } }
          continue;
        }
        seal(s, rel, after, hs.head, lines);
      }
      if (append) {
        writeSeal(ck.common, s);
        log({ op: 'append', ids: planned.map((p) => p.id) });
        say(`added: ${planned.map((p) => p.id).join(', ')}`);
      } else say('dry run: nothing written. Add --append to write these records.');
    }
  }
} finally { release(); }
process.exit(code);
