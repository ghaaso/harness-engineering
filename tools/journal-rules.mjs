// The rules of a journal record and the journal's seal (unit T8-JOURNAL, top session 8, 2026-11-24; ruling r57-0056).
// One rule set, used by tools/journal.mjs (the only way to add records), tools/check-commit.mjs (git pre-commit) and
// .claude/hooks/journal-watch.mjs (PostToolUse). The record rules are library/README.md, "A record" and "Id ranges by
// kind"; the messages are the commit check's (version 2) so that both say the same thing.
//
// The seal. tools/journal.mjs keeps, in the git common directory of the clone (never committed, shared by every
// worktree), the file journal-seal.json:
//   issued     { prefix: [number, ...] }  every id number the tool ever assigned or adopted: never assigned again,
//              even if its line is later lost (t7-0607: ids were reused when a scan of the files missed them)
//   lines      { sha256 of a line: 1 }     every line the tool appended or adopted, in any checkout: the commit check
//              refuses an added journal line that is not here (it was written by some other route)
//   checkouts  { key of a checkout: { known, files, flagged } }
//     known    { rel: [size, mtimeMs] }  the journal files as last seen consistent (the watch's fast path: one stat each)
//     files    { rel: { sha, size, head, pending: [[lineSha, id], ...], copy } }  the state the tool last wrote: its
//              sha256, the commit HEAD was then, the lines it added since that commit, and a copy of the file
//              (journal-seal.d/<sha>.jsonl) from which a lost line can be read back
//     flagged  { rel: sha }  a foreign state the watch has already reported (reported once)
// A lock file journal-seal.lock in the same folder serialises the tool and the watch.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, openSync, closeSync, writeSync, unlinkSync, statSync, readdirSync, realpathSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

export const ORDER = ['id', 'kind', 'status', 'claim', 'when', 'quote', 'evidence', 'see', 'note', 'handles', 'footprint', 'supersedes', 'date', 'by'];
export const KINDS = new Set(['ruling', 'fact', 'status', 'result', 'hypothesis', 'open', 'mistake', 'pointer', 'adjudication']);
export const STATUS = new Set(['owner', 'measured', 'observed', 'quoted', 'summary', 'textbook', 'reasoned', 'designed-only', 'open']);
// library/README.md "Id ranges by kind"; 0 of the 4,313 records of 2026-11-24 fall outside them (counted by script)
export const RANGE = { ruling: [1, 99], fact: [100, 199], status: [200, 299], result: [300, 399], hypothesis: [400, 499],
  open: [500, 599], mistake: [600, 699], pointer: [700, 799], adjudication: [800, 899] };
const STRINGS = ['id', 'kind', 'status', 'claim', 'when', 'quote', 'note', 'date', 'by'];
const LISTS = ['evidence', 'see', 'handles', 'footprint', 'supersedes'];
export const ID_RE = /^([a-z0-9]+)-(\d{4})$/;
export const JOURNAL = 'library/journal';
export const isJournal = (p) => /^library\/journal\/.+\.jsonl$/i.test(p);

export function parseId(id) { const m = ID_RE.exec(String(id || '')); return m ? { prefix: m[1], n: Number(m[2]) } : null; }

// The lines of a journal text, without their line ends; the empty piece after the last newline is dropped.
export function linesOf(text) { const xs = String(text).split(/\r?\n/); if (xs.length && xs[xs.length - 1] === '') xs.pop(); return xs; }
// The id of a line: by JSON, else by the first "id" field the text holds (a broken line still names its id).
export function idOfLine(line) {
  try { const o = JSON.parse(line); if (o && typeof o === 'object' && typeof o.id === 'string') return o.id; } catch {}
  const m = /"id"\s*:\s*"([^"]+)"/.exec(line);
  return m ? m[1] : null;
}
export function parseLine(line, where) {
  let o;
  try { o = JSON.parse(line); } catch { return { error: `${where}: not one JSON object on one line.` }; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { error: `${where}: not a JSON object.` };
  return { o };
}

// The checks of one record. ctx: where (for messages), stem (the file name without .jsonl), uses(id) -> the places the
// id is used in the journal (this line included), exists(id) -> whether a record with that id is in the journal.
export function validateRecord(o, ctx) {
  const { where } = ctx;
  const errors = [];
  if (!o || typeof o !== 'object' || Array.isArray(o)) return [`${where}: not a JSON object.`];
  for (const f of ['id', 'kind', 'status', 'claim']) if (!o[f]) errors.push(`${where}: field "${f}" is missing.`);
  if (o.kind && !KINDS.has(o.kind)) errors.push(`${where}: kind "${o.kind}" is not one of ${[...KINDS].join(', ')}.`);
  if (o.status && !STATUS.has(o.status)) errors.push(`${where}: status "${o.status}" is not one of ${[...STATUS].join(', ')}.`);
  let last = -1;
  for (const key of Object.keys(o)) {
    const at = ORDER.indexOf(key);
    if (at < 0) { errors.push(`${where}: field "${key}" is not a record field (library/README.md, "A record").`); continue; }
    if (at < last) { errors.push(`${where}: field "${key}" is out of the README's order (${ORDER.join(', ')}).`); break; }
    last = at;
  }
  for (const k of STRINGS) if (k in o && typeof o[k] !== 'string') errors.push(`${where}: field "${k}" must be a string.`);
  for (const k of LISTS) if (k in o && !(Array.isArray(o[k]) && o[k].every((x) => typeof x === 'string' && x))) errors.push(`${where}: field "${k}" must be a list of strings.`);
  const id = String(o.id || '');
  const p = parseId(id);
  if (!p) errors.push(`${where}: id "${id}" is not <prefix>-<four digits>.`);
  else if (ctx.stem != null && !ctx.stem.startsWith(p.prefix)) errors.push(`${where}: id "${id}" belongs to writer "${p.prefix}", not to the file "${ctx.stem}" (one file per writer).`);
  if (p && ctx.uses) {
    const places = ctx.uses(id) || [];
    if (places.length > 1) errors.push(`${where}: id "${id}" is used more than once in the journal (${[...new Set(places)].join(', ')}); an id is never reused.`);
  }
  if (ctx.exists) {
    for (const s of Array.isArray(o.supersedes) ? o.supersedes : []) {
      if (typeof s === 'string' && !ctx.exists(s)) errors.push(`${where}: "supersedes" names "${s}", which is no record in the journal; a correction names the record it corrects.`);
    }
    for (const s of Array.isArray(o.see) ? o.see : []) {
      if (typeof s === 'string' && ID_RE.test(s) && !ctx.exists(s)) errors.push(`${where}: "see" names "${s}", which is no record in the journal.`);
    }
  }
  return errors;
}

// ---- hashing ----
export const sha256 = (x) => createHash('sha256').update(x).digest('hex');
export const lineSha = (line) => sha256(Buffer.from(String(line), 'utf8'));
export const blobSha = (buf) => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex'); // git's blob id (the repository keeps bytes as they are: .gitattributes "* -text")

// ---- checkouts (no git process: the watch runs after every shell call) ----
// The checkout that holds dir: { top, key, gitdir, common }, or null.
export function findCheckout(dir) {
  let d = resolve(dir);
  for (let i = 0; i < 256; i++) {
    const g = join(d, '.git');
    let st = null;
    try { st = statSync(g); } catch {}
    if (st && st.isDirectory()) return info(d, g, g);
    if (st && st.isFile()) {
      try {
        const m = /^gitdir:\s*(.+?)\s*$/m.exec(readFileSync(g, 'utf8'));
        if (m) {
          const gitdir = resolve(d, m[1]);
          let common = gitdir;
          try { common = resolve(gitdir, readFileSync(join(gitdir, 'commondir'), 'utf8').trim()); } catch {}
          return info(d, gitdir, common);
        }
      } catch {}
    }
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
  return null;
}
function realOr(p) { try { return realpathSync.native(p); } catch { return p; } }
function info(top, gitdir, common) {
  top = realOr(top);
  return { top, key: top.replace(/\\/g, '/').toLowerCase(), gitdir: realOr(gitdir), common: realOr(common) };
}

// Every file under library/journal of a checkout: Map rel -> { size, mtimeMs } (rel with forward slashes).
export function listJournal(top) {
  const out = new Map();
  const root = join(top, ...JOURNAL.split('/'));
  const walk = (d, depth) => {
    let names = [];
    try { names = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of names) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (depth < 8) walk(p, depth + 1); continue; }
      try { const st = statSync(p); out.set(relative(top, p).split(sep).join('/'), { size: st.size, mtimeMs: st.mtimeMs }); } catch {}
    }
  };
  walk(root, 0);
  return out;
}

const git = (top, ...a) => execFileSync('git', ['-C', top, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, maxBuffer: 1 << 28, timeout: 30000 });
export const gitBuf = (top, ...a) => execFileSync('git', ['-C', top, ...a], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, maxBuffer: 1 << 28, timeout: 30000 });
// HEAD's commit and the blob ids of its journal files: { head, blobs: Map rel -> blob id }
export function headState(top) {
  let head = null;
  try { head = git(top, 'rev-parse', '-q', '--verify', 'HEAD').trim() || null; } catch {}
  const blobs = new Map();
  if (head) {
    try {
      for (const ln of git(top, 'ls-tree', '-r', '-z', 'HEAD', '--', JOURNAL).split('\0')) {
        const m = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(ln);
        if (m) blobs.set(m[2], m[1]);
      }
    } catch {}
  }
  return { head, blobs };
}
export function headText(top, rel) { try { return gitBuf(top, 'show', 'HEAD:' + rel); } catch { return null; } }

// ---- the seal ----
export const sealFile = (common) => join(common, 'journal-seal.json');
export const copyDir = (common) => join(common, 'journal-seal.d');
export function readSeal(common) {
  let s = null;
  try { s = JSON.parse(readFileSync(sealFile(common), 'utf8')); } catch {}
  if (!s || typeof s !== 'object') s = {};
  s.version = 1; s.issued ||= {}; s.lines ||= {}; s.checkouts ||= {};
  return s;
}
export function checkoutOf(seal, key) {
  const c = (seal.checkouts[key] ||= {});
  c.known ||= {}; c.files ||= {}; c.flagged ||= {};
  return c;
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
export function writeSeal(common, seal) {
  const f = sealFile(common), tmp = `${f}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(seal));
  for (let i = 0; ; i++) {
    try { renameSync(tmp, f); return; } catch (e) { if (i >= 20) { try { unlinkSync(tmp); } catch {} throw e; } sleep(50); }
  }
}
export function saveCopy(common, buf, sha) {
  mkdirSync(copyDir(common), { recursive: true });
  const p = join(copyDir(common), sha + '.jsonl');
  if (!existsSync(p)) writeFileSync(p, buf);
  return p;
}
export function readCopy(common, sha) { try { return readFileSync(join(copyDir(common), sha + '.jsonl')); } catch { return null; } }
export function dropCopy(common, sha) { try { unlinkSync(join(copyDir(common), sha + '.jsonl')); } catch {} }

// The lock: a file made with exclusive create. The tool holds it for its whole run, at most 281 ms here (t8-0104: its
// dry run on the real journal, node start included). At most 21 processes of one session take it at once (the app's
// 20 helpers, t7-0603, and the session), so a lock older than 21 holds is a crashed holder and is taken over, and a
// waiter (the tool, the journal watch) outlasts one crashed holder plus a full queue.
const HOLD_MAX_MS = 281; // t8-0104
const STALE_MS = 21 * HOLD_MAX_MS; // 5.9 s (t8-0104, t7-0603)
export const LOCK_WAIT_MS = 2 * STALE_MS; // 11.8 s
const LOCK = 'journal-seal.lock';
export function lockHeld(common) {
  try { return Date.now() - statSync(join(common, LOCK)).mtimeMs < STALE_MS; } catch { return false; }
}
export function lock(common, waitMs) {
  const p = join(common, LOCK);
  const end = Date.now() + waitMs;
  for (;;) {
    try {
      const fd = openSync(p, 'wx');
      writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
      closeSync(fd);
      return () => { try { unlinkSync(p); } catch {} };
    } catch (e) {
      if (e && e.code !== 'EEXIST') throw e;
      try { if (Date.now() - statSync(p).mtimeMs >= STALE_MS) { unlinkSync(p); continue; } } catch {}
      if (Date.now() >= end) return null;
      sleep(50);
    }
  }
}

// Whether a journal file's present bytes are a state the journal may be in: the state the tool last wrote, or HEAD's
// (when HEAD has moved since the tool wrote it, or the tool never wrote it). buf null: the file is missing.
// Returns { ok, sha, why }.
// headBuf (optional): reads HEAD's bytes, so a checkout whose line ends git converts (core.autocrlf) still matches HEAD.
export function judgeFile(rel, buf, entry, headBlob, head, headBuf) {
  const sealedNow = entry && entry.head === head; // the tool wrote it at this very commit: only its state is right
  if (buf == null) {
    if (!headBlob && !sealedNow) return { ok: true, sha: null };
    return { ok: false, sha: null, why: 'removed' };
  }
  const sha = sha256(buf);
  if (entry && sha === entry.sha) return { ok: true, sha };
  if (!/\.jsonl$/i.test(rel)) return { ok: false, sha, why: 'not a journal file' };
  const crlf = (b) => b.toString('utf8').replace(/\r\n/g, '\n');
  const hb = headBlob && blobSha(buf) !== headBlob && headBuf ? headBuf() : null;
  if (headBlob && (blobSha(buf) === headBlob || (hb && crlf(hb) === crlf(buf)))) {
    if (sealedNow) return { ok: false, sha, why: 'set back to the last commit' };
    return { ok: true, sha };
  }
  return { ok: false, sha, why: entry ? 'changed' : (headBlob ? 'changed' : 'new') };
}

// What differs between a base text and the present one, by lines: { lost: [ids or line starts], added: [...] }.
export function lineDiff(baseBuf, buf) {
  const name = (l) => idOfLine(l) || JSON.stringify(l.slice(0, 40));
  const base = linesOf(baseBuf ? baseBuf.toString('utf8') : ''), now = linesOf(buf ? buf.toString('utf8') : '');
  const count = new Map();
  for (const l of now) count.set(l, (count.get(l) || 0) + 1);
  const lost = [];
  for (const l of base) { const c = count.get(l) || 0; if (c > 0) count.set(l, c - 1); else lost.push(name(l)); }
  const left = new Map();
  for (const l of base) left.set(l, (left.get(l) || 0) + 1);
  const added = [];
  for (const l of now) { const c = left.get(l) || 0; if (c > 0) left.set(l, c - 1); else added.push(name(l)); }
  return { lost, added };
}

// The local date, YYYY-MM-DD: the folder a record is filed under on the day it is written.
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
