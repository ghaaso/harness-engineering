// Record guard (version 2, 2026-11-19: unit P0 of research-tree/ORCHESTRATION.md section 9, then unit FIX-GUARD for
// findings 1-4 and 8 of research-tree/build/refute/P0-GATE.md). PreToolUse hook for
// Write, Edit, MultiEdit, NotebookEdit, AskUserQuestion, Bash and PowerShell.
// Enforces, for tool calls in sessions started in this repository (and the helpers inside them), in its main checkout
// and in every git worktree of it, inside .claude/worktrees/ or anywhere else:
//   1. Archived evidence is never changed (CLAUDE.md rule 1, AGENTS.md): a file under recovered/, one listed in
//      migration/source-manifest.json or migration/clinic-manifest.json, or one under docs/program/evidence/ that the
//      checkout's own HEAD holds, may not be edited, overwritten, renamed or deleted. New files anywhere are allowed
//      ("new work goes in new files"); a file under docs/program/evidence/ is new until it is committed.
//   2. The library journal is only added to (library/README.md rule 1): a write of an existing
//      library/journal/**.jsonl file must keep every existing byte and add after the end; an Edit's added text starts
//      on a new line. git forms that drop working-tree changes (reset --hard, checkout -f, switch -f or
//      --discard-changes, stash, restore, checkout -- <path>) are refused while the journal has uncommitted lines.
//   3. No design questions to the owner (r57-0001, CLAUDE.md rule 7): every question of AskUserQuestion
//      starts with the kind of word it asks for and a colon: "approve:" (his go for a run, install,
//      download, spend, publish or commit), "cap:" (a token cap, CLAUDE.md rule 5) or "fact:" (a fact
//      only he can read, such as a setting on his screen).
// Paths. Every form is brought to one real path before it is judged: the \\?\ and //?/ prefixes, Git Bash's /c/,
// 8.3 short names, junctions and links, letter case, the trailing dots and spaces Windows drops, an NTFS stream
// (name:stream), an admin share (\\host\c$\..., //host/c$/..., \\?\UNC\host\c$\...: read as c:\...) and a volume or
// device path (\\?\Volume{...}\..., \\.\GLOBALROOT\...: resolved by the file system). A path on another share of this
// PC, or a device path the file system cannot resolve, is refused: where it lands cannot be told.
// A path inside a worktree of this repository (a folder whose .git file points into the main
// checkout's .git/worktrees/, or any folder under .claude/worktrees/) is judged by its place in that worktree,
// against the manifests of the main checkout.
// Shell commands (Bash, PowerShell). The guard reads which files a command would write: redirections, rm, mv, cp,
// ln, tee, truncate, dd, sed -i, perl -i, git rm/mv/checkout (and -f)/switch -f/stash/restore/reset --hard/clean, find -delete or -exec,
// xargs, PowerShell's *-Content, *-Item, Out-File and Tee-Object, .NET file calls, and literal paths given to
// file calls in inline node, python, perl or ruby code; it follows cd, git -C, sh -c, cmd /c, powershell -Command
// and heredocs. Appending to a journal (>>, tee -a, Add-Content, appendFile) is allowed; restoring an archived file
// from git's index or HEAD is allowed (it is the repair). What it cannot see: a path held in a variable it cannot
// read, or written by a script file; a question asked in plain text; a design question given the wrong kind.
// tools/check-commit.mjs catches changed records at commit.
// Failure. A manifest that cannot be read refuses every change of an existing file in a checkout (fails closed); so
// does a HEAD that cannot be read, for files under docs/program/evidence/. An
// unreadable hook input, or an error of the guard itself, lets the call through and is logged.
// Every refusal is logged to ../logs/record-guard.jsonl.
import { readFileSync, existsSync, appendFileSync, mkdirSync, statSync, realpathSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, isAbsolute, join, basename, sep } from 'node:path';
import { homedir, hostname, networkInterfaces } from 'node:os';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const WIN = process.platform === 'win32';
function log(o) {
  try {
    mkdirSync(resolve(here, '..', 'logs'), { recursive: true });
    appendFileSync(resolve(here, '..', 'logs', 'record-guard.jsonl'), JSON.stringify({ t: Date.now(), ...o }) + '\n');
  } catch {}
}
function deny(rec, why) { log({ ...rec, decision: 'deny', why }); process.stderr.write(why + '\n'); process.exit(2); }
class Refusal { constructor(path, why) { this.path = path; this.why = why; } }

let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { log({ decision: 'allow', note: 'hook input unreadable' }); process.exit(0); }
if (j.hook_event_name !== 'PreToolUse') process.exit(0);
const tool = String(j.tool_name || '');
const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
const rec = { session: typeof j.session_id === 'string' ? j.session_id.slice(0, 8) : null, tool };
const cwd0 = typeof j.cwd === 'string' && j.cwd ? j.cwd : repo;

// ---- paths ----
// The real path of p: the deepest part that exists is resolved by the file system (8.3 names, links, case), the rest
// is kept as written.
function real(p) {
  const tail = [];
  let head = p;
  for (let i = 0; i < 256; i++) {
    try { const r = realpathSync.native(head); return tail.length ? join(r, ...tail.reverse()) : r; } catch {}
    const up = dirname(head);
    if (up === head) return p;
    tail.push(basename(head));
    head = up;
  }
  return p;
}
// trailing dots and spaces cut off, in linear time (a regex such as /[. ]+$/ takes quadratic time on a long run of spaces)
function trimDotsSpaces(x) { let e = x.length; while (e > 0 && (x[e - 1] === '.' || x[e - 1] === ' ')) e--; return x.slice(0, e); }
// Host names that reach this PC in a UNC path: localhost, 127.x.x.x, ::1, its own name (alone or with a domain), its addresses.
let selfNames = null;
function isSelf(host) {
  const h = trimDotsSpaces(String(host).toLowerCase());
  if (!selfNames) {
    selfNames = new Set(['localhost', '::1', '[::1]', '0--1.ipv6-literal.net']);
    let hn = '';
    try { hn = hostname(); } catch {}
    for (const x of [process.env.COMPUTERNAME, hn]) if (x) selfNames.add(String(x).toLowerCase());
    try { for (const xs of Object.values(networkInterfaces())) for (const x of xs || []) if (x && x.address) selfNames.add(String(x.address).toLowerCase()); } catch {}
  }
  if (selfNames.has(h) || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  for (const x of selfNames) if (/^[a-z]/.test(x) && h.startsWith(x + '.')) return true;
  return false;
}
// device names that are no file of a checkout (\\.\nul, \\.\pipe\x and the like)
const BENIGN_DEVICE = /^(nul|con|prn|aux|com\d|lpt\d|conin\$|conout\$|pipe|mailslot)$/i;
const cannotTell = (p, what) => new Refusal(String(p).slice(0, 200), `record guard (CLAUDE.md rule 1): ${String(p).slice(0, 200)} is ${what}, which the guard ` +
  'cannot bring to a local path, so whether it is archived evidence or the journal cannot be told. Use the local path (C:\\...).');
// The Windows forms of one path brought to one: \??\x and \\?\x and \\.\x and //?/x (a drive path stays a drive path;
// a volume or other device path is kept whole, with its prefix, for the file system to resolve), \\?\UNC\h\s\x is
// \\h\s\x, and an admin share \\h\c$\x (of any host: on another PC the same local path is no checkout of this one) is c:\x.
function winForm(s) {
  s = s.replace(/^\\\?\?\\/, '\\\\?\\').replace(/^[\\/]{2}[?.][\\/]UNC[\\/]/i, '\\\\');
  if (/^[\\/]{2}[?.][\\/]/.test(s)) {
    const rest = s.slice(4);
    return /^[a-zA-Z]:(?:[\\/]|$)/.test(rest) ? rest : '\\\\?\\' + rest.replace(/\//g, '\\');
  }
  const u = /^[\\/]{2}([^\\/]+)[\\/]([^\\/]+)/.exec(s);
  if (u && /^[a-zA-Z]\$$/.test(u[2])) return u[2][0] + ':\\' + s.slice(u[0].length).replace(/^[\\/]+/, '');
  if (u && isSelf(u[1])) throw cannotTell(s, `on the share ${u[2]} of this PC`);
  return s;
}
function canonical(p, cwd) {
  let s = String(p == null ? '' : p);
  if (!s || s.includes('\0')) return null;
  if (WIN) {
    s = winForm(s);
    const m = /^\/(?:cygdrive\/|mnt\/)?([a-zA-Z])(?=\/|$)/.exec(s);
    if (m) s = m[1] + ':\\' + s.slice(m[0].length).replace(/^\//, '');
    const d = /^(?:[a-zA-Z]:|[\\/]{2}[^\\/]+[\\/][^\\/]+)/.exec(s);
    const head = d ? d[0] : '';
    s = head + s.slice(head.length).split(/[\\/]/).map((c) => {
      let x = c.includes(':') ? c.slice(0, c.indexOf(':')) : c; // an NTFS stream belongs to its file
      if (!/^\.+$/.test(x)) x = trimDotsSpaces(x); // Windows drops trailing dots and spaces
      return x;
    }).join('\\');
  }
  let r = real(isAbsolute(s) ? resolve(s) : resolve(cwd, s));
  if (WIN) {
    // a drive letter mapped to a share comes back from the file system as \\host\share\...: brought once more
    if (/^[\\/]{2}[^\\/?.]/.test(r)) { const t = winForm(r); if (t !== r) r = real(resolve(t)); }
    const dv = /^[\\/]{2}[?.][\\/]([^\\/]*)/.exec(r);
    if (dv && !BENIGN_DEVICE.test(dv[1])) throw cannotTell(p, 'a device path the file system does not resolve');
  }
  return r;
}
const inside = (p, dir) => { const r = relative(dir, p); return r === '' || !(r === '..' || r.startsWith('..' + sep) || isAbsolute(r)); };
function gitdirOf(d) {
  try { const m = /^gitdir:\s*(.+?)\s*$/m.exec(readFileSync(join(d, '.git'), 'utf8')); return m ? real(resolve(d, m[1])) : null; } catch { return null; }
}
// the main checkout: this file's repository, or the one whose worktree this copy of the file sits in
function mainOf(top) {
  try {
    if (statSync(join(top, '.git')).isFile()) {
      const gd = gitdirOf(top);
      if (gd) {
        let common = resolve(gd, '..', '..');
        try { common = real(resolve(gd, readFileSync(join(gd, 'commondir'), 'utf8').trim())); } catch {}
        return dirname(common);
      }
    }
  } catch {}
  return top;
}
const main = mainOf(real(repo));
const worktreesDir = join(main, '.git', 'worktrees');
function checkoutAt(d) {
  let st;
  try { st = statSync(join(d, '.git')); } catch { return null; }
  if (st.isDirectory()) return relative(d, main) === '' ? 'main' : null;
  const gd = gitdirOf(d);
  return gd && inside(gd, worktreesDir) && relative(gd, worktreesDir) !== '' ? 'worktree' : null;
}
// Which checkout of this repository holds abs: { top, rel (with /), kind: 'main' | 'worktree' }, or null.
function locate(abs) {
  for (let d = abs, i = 0; i < 256; i++) {
    let kind = checkoutAt(d);
    if (kind) {
      let top = d, rel = relative(d, abs).split(sep).join('/'), m;
      // a folder under .claude/worktrees/ whose .git file is missing or broken is still a worktree
      while ((m = /^\.claude\/worktrees\/([^/]+)(?:\/(.*))?$/i.exec(rel))) { top = join(top, '.claude', 'worktrees', m[1]); rel = m[2] || ''; kind = 'worktree'; }
      return { top, rel, kind };
    }
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
  return null;
}
const named = (at) => at.kind === 'main' ? at.rel : `${at.rel} (in the worktree ${at.top})`;

// ---- what is protected ----
let manifestCache = null;
function manifests() {
  if (manifestCache) return manifestCache;
  const read = (f) => JSON.parse(readFileSync(join(main, 'migration', f), 'utf8'));
  const m1 = read('source-manifest.json'), m2 = read('clinic-manifest.json');
  if (!Array.isArray(m1) || !m2 || !Array.isArray(m2.files)) throw new Error('a manifest holds no list of files');
  const low = (xs) => xs.map((x) => String(x && x.path).toLowerCase());
  const src = low(m1), clinic = low(m2.files);
  return (manifestCache = { src: new Set(src), clinic: new Set(clinic), all: src.concat(clinic) });
}
function readManifests(rel) {
  try { return manifests(); } catch (e) {
    throw new Refusal(rel, `record guard (CLAUDE.md rule 1, fails closed): the manifests in ${join(main, 'migration')} cannot be read ` +
      `(${String(e && e.message || e).slice(0, 120)}), so whether ${rel} is archived evidence cannot be told. No existing file in a ` +
      'checkout of this repository is changed until they read again (restore them from git); new files are allowed.');
  }
}
// The files under docs/program/evidence/ that the HEAD of the checkout at top holds (lower case; a worktree's own
// HEAD), read once per checkout. When that cannot be read, a file there is refused (fails closed).
const EVIDENCE = 'docs/program/evidence';
const headCache = new Map();
function headEvidence(top, rel) {
  let r = headCache.get(top);
  if (!r) {
    const g = (...a) => execFileSync('git', ['-C', top, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000, windowsHide: true, maxBuffer: 1 << 28 });
    try {
      const tl = g('rev-parse', '--show-toplevel').trim();
      if (relative(real(resolve(tl)), top) !== '') throw new Error(`git places it in the checkout ${tl}`);
      let out;
      try { out = g('ls-tree', '-r', '-z', '--name-only', 'HEAD', '--', EVIDENCE); } catch (e) {
        let born = true;
        try { g('rev-parse', '--verify', '-q', 'HEAD'); } catch { born = false; }
        if (born) throw e;
        out = ''; // no commit yet: HEAD holds nothing
      }
      r = { set: new Set(out.split('\0').filter(Boolean).map((x) => x.toLowerCase())) };
    } catch (e) { r = { err: String(e && e.message || e).split('\n')[0].slice(0, 160) }; }
    headCache.set(top, r);
  }
  if (r.err) {
    throw new Refusal(rel, `record guard (CLAUDE.md rule 1, fails closed): what HEAD holds under ${EVIDENCE}/ in ${top} cannot be read (${r.err}), ` +
      `so whether ${rel} is archived evidence cannot be told. Files there are not changed until git reads again; new files are allowed.`);
  }
  return r.set;
}
function archivedBy(at) { // why the file at is archived evidence, or null
  const rel = at.rel, low = rel.toLowerCase();
  if (low === 'recovered' || low.startsWith('recovered/')) return 'under recovered/';
  const m = readManifests(rel);
  if (m.src.has(low)) return 'listed by migration/source-manifest.json';
  if (m.clinic.has(low)) return 'listed by migration/clinic-manifest.json';
  if (low.startsWith(EVIDENCE + '/') && headEvidence(at.top, rel).has(low)) return `committed under ${EVIDENCE}/, which CLAUDE.md rule 1 names`;
  return null;
}
const isJournal = (rel) => /^library\/journal\/.+\.jsonl$/i.test(rel);
const JOURNAL_FIX = 'A correction is a new record whose "supersedes" names the old one.';

// ---- Write, Edit, MultiEdit, NotebookEdit ----
function appendEdit(text, e) { // the text after an Edit that only appends at the end, on a new line, or null
  const o = String(e.old_string ?? ''), n = String(e.new_string ?? '');
  const atEnd = o.length > 0 && (text.endsWith(o) || text.endsWith(o + '\n') || text.endsWith(o + '\r\n'));
  if (e.replace_all || !atEnd || !n.startsWith(o) || text.indexOf(o) !== text.lastIndexOf(o)) return null;
  const k = text.lastIndexOf(o), tail = text.slice(k + o.length), add = n.slice(o.length);
  // what the Edit adds starts a new line, so nothing of the last line changes: it begins with a newline, unless
  // old_string itself ends the file with one
  if (add && !/^\r?\n/.test(add) && !(tail === '' && o.endsWith('\n'))) return null;
  return text.slice(0, k) + n + tail;
}
function checkFileTool() {
  const p = ti.file_path || ti.notebook_path;
  if (!p) return;
  const abs = canonical(p, cwd0);
  const at = abs && locate(abs);
  if (!at || !at.rel) return;
  if (!existsSync(abs)) return; // a new file is always allowed
  const src = archivedBy(at);
  if (src) {
    throw new Refusal(at.rel, `record guard (CLAUDE.md rule 1): ${named(at)} is archived evidence (${src}); it is never edited, renamed or normalised. ` +
      'Put new work in a new file.');
  }
  if (!isJournal(at.rel)) return;
  const old = readFileSync(abs, 'utf8');
  if (tool === 'Write') {
    if (!String(ti.content ?? '').startsWith(old)) {
      throw new Refusal(at.rel, `record guard (library/README.md rule 1): ${named(at)} is a journal file; it is only added to. This Write would change or drop existing lines. ` +
        'Append new records after the last line; ' + JOURNAL_FIX);
    }
    return;
  }
  let ok = false;
  if (tool === 'Edit') ok = appendEdit(old, ti) !== null;
  else if (tool === 'MultiEdit' && Array.isArray(ti.edits) && ti.edits.length) {
    let cur = old;
    for (const e of ti.edits) { cur = cur === null ? null : appendEdit(cur, e || {}); }
    ok = cur !== null;
  }
  if (!ok) {
    throw new Refusal(at.rel, `record guard (library/README.md rule 1): ${named(at)} is a journal file; it is only added to. An ${tool} is allowed only as an append: ` +
      'old_string is the end of the file, occurring once, and new_string starts with it (each edit in turn, for MultiEdit). ' + JOURNAL_FIX);
  }
}

// ---- shell commands ----
// A target the command writes. mode: 'overwrite' (changes or replaces the file), 'append' (adds after the end),
// 'delete' (removes or renames it away), 'restore' (from git's index or HEAD).
function holds(at, mode) { // what a folder (or the files a pattern names in it) holds that the mode would harm
  const r = at.rel.toLowerCase();
  if (r === '' && at.kind === 'worktree' && mode === 'delete') return null; // removing a whole worktree
  const has = (p) => r === '' || p === r || p.startsWith(r + '/');
  const journal = r === '' || 'library/journal/'.startsWith(r + '/') || r === 'library/journal' || r.startsWith('library/journal/');
  if (r === 'recovered' || r.startsWith('recovered/') || has('recovered/x')) return 'archived evidence (recovered/)';
  if (readManifests(at.rel).all.some(has)) return 'archived evidence listed by the manifests';
  if ((r === 'docs' || r === 'docs/program' || r === EVIDENCE || r.startsWith(EVIDENCE + '/')) && [...headEvidence(at.top, at.rel)].some(has)) {
    return `archived evidence committed under ${EVIDENCE}/`;
  }
  if (journal && mode !== 'append') return 'journal files';
  return null;
}
// whether journal files under rel (a file or folder of the checkout at top) have changes git has not committed
// (untracked: new journal files count too)
function journalDirty(top, rel, untracked) {
  try {
    const out = execFileSync('git', ['-C', top, 'status', '--porcelain', `--untracked-files=${untracked ? 'all' : 'no'}`, '--', rel], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000, windowsHide: true });
    return out.trim().length > 0;
  } catch { return true; } // cannot tell: treat as changed
}
function hit(w, mode, cwd, verb, opt = {}) {
  if (!w || w.dyn || !w.v) return;
  let v = w.v;
  if (/^(\/dev\/(null|stdout|stderr|tty)|nul|\$null|con)$/i.test(v)) return;
  const glob = w.glob;
  if (glob) {
    const k = v.search(/[*?[{]/);
    v = v.slice(0, Math.max(v.lastIndexOf('/', k), v.lastIndexOf('\\', k)) + 1) || '.';
  }
  const abs = canonical(v, cwd);
  const at = abs && locate(abs);
  if (!at) return;
  let st;
  try { st = statSync(abs); } catch { return; } // nothing there: a new file, or nothing to remove
  const isDir = st.isDirectory() || glob;
  if (mode === 'restore') { // from git's index or HEAD: the repair for archived evidence; it drops journal lines added since
    const r = at.rel.toLowerCase();
    let jp = null;
    if (!isDir) jp = isJournal(at.rel) ? at.rel : null;
    else if (r === '' || r === 'library' || r === 'library/journal') jp = 'library/journal';
    else if (r.startsWith('library/journal/')) jp = at.rel;
    if (jp && journalDirty(at.top, jp, opt.untracked)) {
      throw new Refusal(at.rel, `record guard (library/README.md rule 1): this command would ${verb} ${named(at) || at.top}, dropping journal lines ` +
        `added since the last commit (git status shows changes under ${jp}); the journal is only added to. Commit the new lines first, or name other files. ` + JOURNAL_FIX);
    }
    return;
  }
  if (isDir) {
    if (!glob && mode === 'append') return;
    const what = holds(at, mode);
    if (what) {
      throw new Refusal(at.rel, `record guard (CLAUDE.md rule 1; library/README.md rule 1): this command would ${verb} ${glob ? 'files in ' : ''}${named(at) || at.top}, ` +
        `which holds ${what}. Archived evidence is never changed, renamed or deleted, and the journal is only added to. Name the files you mean, outside those.`);
    }
    return;
  }
  const src = archivedBy(at);
  if (src) {
    throw new Refusal(at.rel, `record guard (CLAUDE.md rule 1): this command would ${verb} ${named(at)}, archived evidence (${src}); ` +
      'it is never edited, renamed, deleted or normalised. Put new work in a new file.');
  }
  if (isJournal(at.rel) && mode !== 'append') {
    throw new Refusal(at.rel, `record guard (library/README.md rule 1): this command would ${verb} ${named(at)}, a journal file; it is only added to ` +
      '(>>, tee -a, Add-Content). ' + JOURNAL_FIX);
  }
}
const word = (v) => ({ v, dyn: false, glob: false, q: false });
const hitPath = (p, mode, cwd, verb, opt) => hit(word(p), mode, cwd, verb, opt);

// Lexer: simple commands with their words, redirections, heredoc bodies and command substitutions.
// mode 'sh' (Bash), 'ps' (PowerShell), 'cmd' (cmd.exe). Variables become \u0001NAME\u0001, filled in when judged.
function lex(src, mode) {
  const sh = mode === 'sh', ps = mode === 'ps', cm = mode === 'cmd';
  const cmds = [];
  const fresh = () => ({ words: [], redirs: [], body: '', subs: [], sep: '' });
  let cur = fresh(), wd = null, redir = null, docs = [];
  const w = () => (wd || (wd = { v: '', dyn: false, glob: false, q: false }));
  function endWord() {
    if (!wd) return;
    const x = wd; wd = null;
    if (redir) {
      const op = redir; redir = null;
      if (op === '<<' || op === '<<-') docs.push({ cmd: cur, delim: x.v, strip: op === '<<-' });
      else if (op === '>&') { if (!/^(\d+|-)$/.test(x.v)) cur.redirs.push({ op: '>', target: x }); }
      else if (op === '>' || op === '>>') cur.redirs.push({ op, target: x });
      return;
    }
    cur.words.push(x);
  }
  function endCmd(s) {
    endWord(); redir = null;
    if (cur.words.length || cur.redirs.length || cur.subs.length || docs.some((d) => d.cmd === cur)) { cur.sep = s; cmds.push(cur); }
    cur = fresh();
  }
  const n = src.length;
  function close(k) { // k is just after an opening '('; returns the index just after its ')'
    let depth = 1, q = null;
    while (k < n && depth > 0) {
      const ch = src[k];
      if (q) { if (ch === q) q = null; else if (ch === '\\' && q === '"' && sh) k++; }
      else if (ch === "'" || ch === '"') q = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
      k++;
    }
    return k;
  }
  function dollar(k) { // src[k] is '$' (or ` in sh, % in cmd); appends to the word, returns the next index
    const x = w();
    if (cm) {
      const e = src.indexOf('%', k + 1);
      if (e > k + 1 && /^\w+$/.test(src.slice(k + 1, e))) { x.v += '\u0001' + src.slice(k + 1, e) + '\u0001'; return e + 1; }
      x.v += '%'; return k + 1;
    }
    if (sh && src[k] === '`') {
      let e = k + 1;
      while (e < n && src[e] !== '`') e += src[e] === '\\' ? 2 : 1;
      cur.subs.push(src.slice(k + 1, e)); x.dyn = true; return e + 1;
    }
    const nx = src[k + 1];
    if (nx === '(') {
      if (sh && src[k + 2] === '(') { const e = close(k + 2); x.dyn = true; return e; }
      const e = close(k + 2), inner = src.slice(k + 2, e - 1);
      if (/^\s*(pwd|Get-Location|gl)\s*$/i.test(inner)) x.v += '\u0001PWD\u0001';
      else { cur.subs.push(inner); x.dyn = true; }
      return e;
    }
    if (nx === '{') {
      const e = src.indexOf('}', k + 2);
      if (e < 0) { x.dyn = true; return n; }
      const nm = src.slice(k + 2, e).replace(/^env:/i, '');
      if (/^\w+$/.test(nm)) x.v += '\u0001' + nm + '\u0001'; else x.dyn = true;
      return e + 1;
    }
    if (ps) {
      const m = /^(?:env:|global:|script:|local:)?([A-Za-z_]\w*)/i.exec(src.slice(k + 1));
      if (m) { x.v += '\u0001' + m[1] + '\u0001'; return k + 1 + m[0].length; }
      if (nx === '_' || nx === '?' || nx === '$') { x.dyn = true; return k + 2; }
      x.v += '$'; return k + 1;
    }
    const m = /^[A-Za-z_]\w*/.exec(src.slice(k + 1));
    if (m) { x.v += '\u0001' + m[0] + '\u0001'; return k + 1 + m[0].length; }
    if (nx && /[0-9@*#?$!-]/.test(nx)) { x.dyn = true; return k + 2; }
    x.v += '$'; return k + 1;
  }
  function dquote(k) { // k just after the opening "; returns the index after the closing "
    const x = w(); x.q = true;
    while (k < n) {
      const ch = src[k];
      if (ch === '"') { if (ps && src[k + 1] === '"') { x.v += '"'; k += 2; continue; } return k + 1; }
      if (sh && ch === '\\') { const nx = src[k + 1]; if (nx === '\n') { k += 2; continue; } if ('"\\$`'.includes(nx)) { x.v += nx; k += 2; continue; } x.v += ch; k++; continue; }
      if (ps && ch === '`') { x.v += src[k + 1] ?? ''; k += 2; continue; }
      if ((ch === '$' && !cm) || (sh && ch === '`') || (cm && ch === '%')) { k = dollar(k); continue; }
      x.v += ch; k++;
    }
    return k;
  }
  let i = 0;
  while (i < n) {
    const ch = src[i];
    if (ch === '\n') {
      endCmd('\n'); i++;
      for (const d of docs) {
        let body = '';
        while (i < n) {
          let e = src.indexOf('\n', i); if (e < 0) e = n;
          let line = src.slice(i, e); i = e + 1;
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if ((d.strip ? line.replace(/^\t+/, '') : line) === d.delim) break;
          body += line + '\n';
        }
        d.cmd.body += body;
      }
      docs = [];
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') { endWord(); i++; continue; }
    if (ch === '#' && !wd && !cm) { while (i < n && src[i] !== '\n') i++; continue; }
    if (sh && ch === '\\') { if (src[i + 1] === '\n') { i += 2; continue; } w().v += src[i + 1] ?? ''; i += 2; continue; }
    if (ps && ch === '`') { if (src[i + 1] === '\n') { i += 2; continue; } if (src[i + 1] === '\r' && src[i + 2] === '\n') { i += 3; continue; } w().v += src[i + 1] ?? ''; i += 2; continue; }
    if (cm && ch === '^') { w().v += src[i + 1] ?? ''; i += 2; continue; }
    if (ch === "'" && !cm) {
      const x = w(); x.q = true;
      let k = i + 1;
      for (;;) {
        const e = src.indexOf("'", k);
        if (e < 0) { x.v += src.slice(k); k = n; break; }
        x.v += src.slice(k, e);
        if (ps && src[e + 1] === "'") { x.v += "'"; k = e + 2; continue; }
        k = e + 1; break;
      }
      i = k; continue;
    }
    if (ch === '"') { i = dquote(i + 1); continue; }
    if ((ch === '$' && !cm) || (sh && ch === '`') || (cm && ch === '%')) { i = dollar(i); continue; }
    if (ch === ';') { endCmd(';'); i++; continue; }
    if (ch === '|') { if (src[i + 1] === '|') { endCmd('||'); i += 2; } else { endCmd('|'); i += src[i + 1] === '&' ? 2 : 1; } continue; }
    if (ch === '&') {
      if (src[i + 1] === '&') { endCmd('&&'); i += 2; continue; }
      if (sh && src[i + 1] === '>') { endWord(); const app = src[i + 2] === '>'; redir = app ? '>>' : '>'; i += app ? 3 : 2; continue; }
      if (ps && !wd) { i++; continue; } // the call operator
      endCmd('&'); i++; continue;
    }
    if (ch === '>' || ch === '<') {
      if (wd && !wd.q && /^(\d+|\*)$/.test(wd.v)) wd = null; else endWord(); // an fd number belongs to the operator
      if (sh && src[i + 1] === '(') { const e = close(i + 2); cur.subs.push(src.slice(i + 2, e - 1)); i = e; continue; }
      if (ch === '<') {
        if (sh && src.startsWith('<<<', i)) { redir = '<<<'; i += 3; continue; }
        if (sh && src.startsWith('<<-', i)) { redir = '<<-'; i += 3; continue; }
        if (sh && src[i + 1] === '<') { redir = '<<'; i += 2; continue; }
        redir = src[i + 1] === '&' ? '<&' : '<'; i += src[i + 1] === '&' ? 2 : 1; continue;
      }
      if (src[i + 1] === '>') { redir = '>>'; i += 2; continue; }
      if (src[i + 1] === '|') { redir = '>'; i += 2; continue; }
      if (src[i + 1] === '&') { redir = '>&'; i += 2; continue; }
      redir = '>'; i++; continue;
    }
    if (ch === '(' || ch === ')') { endCmd(ch); i++; continue; }
    if (ps && (ch === '{' || ch === '}')) { endCmd(ch); i++; continue; }
    if (ps && ch === ',') { endWord(); i++; continue; }
    if (ps && ch === '@' && !wd && (src[i + 1] === '(' || src[i + 1] === '{')) { i++; continue; }
    if (sh && (ch === '{' || ch === '}') && !wd && /[\s;]/.test(src[i + 1] ?? ' ')) { endCmd(ch); i++; continue; }
    if (!cm && (ch === '*' || ch === '?' || ch === '[' || (sh && ch === '{'))) { w().glob = true; wd.v += ch; i++; continue; }
    if (ch === '~' && !wd && sh && /[\s/]/.test(src[i + 1] ?? ' ')) { w().v += '\u0001HOME\u0001'; i++; continue; }
    w().v += ch; i++;
  }
  endCmd('');
  return cmds;
}

function expand(x, vars, cwd) {
  let dyn = x.dyn;
  const v = x.v.replace(/\u0001([^\u0001]*)\u0001/g, (_, name) => {
    const low = name.toLowerCase();
    if (vars.has(name)) return vars.get(name);
    if (low === 'pwd') return cwd;
    if (low === 'null') return '$null';
    if (low === 'home' && !process.env.HOME) return process.env.USERPROFILE || homedir();
    if (process.env[name] !== undefined) return process.env[name];
    dyn = true;
    return '$' + name;
  });
  return { v, dyn, glob: x.glob, q: x.q };
}

const base = (s) => basename(String(s).replace(/\\/g, '/')).toLowerCase().replace(/\.(exe|cmd|bat|com)$/, '');
// sh-style operands: words that are not options; `valued` options take the next word
function operands(args, valued = [], mode = 'sh') {
  const out = [];
  let end = false;
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (mode === 'cmd') { if (/^\/[A-Za-z?-]{1,3}(:\S*)?$/.test(a.v)) continue; out.push(a); continue; }
    if (end || !a.v.startsWith('-') || a.v === '-') { out.push(a); continue; }
    if (a.v === '--') { end = true; continue; }
    if (valued.includes(a.v)) k++;
  }
  return out;
}
const optionsOf = (args) => { const o = []; for (const a of args) { if (a.v === '--') break; if (a.v.startsWith('-') && a.v !== '-') o.push(a.v); } return o; };
const COMMON = ['erroraction', 'ea', 'warningaction', 'wa', 'informationaction', 'infa', 'errorvariable', 'ev', 'warningvariable', 'wv',
  'informationvariable', 'iv', 'outvariable', 'ov', 'outbuffer', 'ob', 'pipelinevariable', 'pv'];
const PATHS = ['path', 'literalpath', 'lp', 'pspath'];
// PowerShell parameters: { named: Map(param -> [words]) for the path parameters, pos: [words], sw: Set }
function psParams(args, pathNames, valueNames) {
  const nm = new Map(), pos = [], sw = new Set();
  const all = [...pathNames, ...valueNames, ...COMMON];
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    const m = /^-([A-Za-z][\w-]*)(?::(.*))?$/.exec(a.v);
    if (!m || a.q) { pos.push(a); continue; }
    const name = m[1].toLowerCase();
    const hits = all.filter((p) => p.startsWith(name));
    const p = all.includes(name) ? name : (hits.length === 1 ? hits[0] : null);
    if (!p) { sw.add(name); continue; }
    const val = m[2] !== undefined ? { ...a, v: m[2] } : args[++k];
    if (!val) continue;
    if (pathNames.includes(p)) { if (!nm.has(p)) nm.set(p, []); nm.get(p).push(val); }
  }
  const pick = (names) => names.flatMap((x) => nm.get(x) || []);
  const has = (s) => [...sw].some((x) => x.length >= 2 && s.startsWith(x));
  return { pick, pos, has };
}

const DELETE = new Set(['rm', 'unlink', 'rmdir', 'shred', 'srm']);
const PS_DELETE = new Set(['remove-item', 'ri', 'rm', 'rmdir', 'del', 'erase', 'rd']);
const CMD_DELETE = new Set(['del', 'erase', 'rd', 'rmdir']);
const INTERP = new Set(['node', 'nodejs', 'python', 'python3', 'py', 'pythonw', 'perl', 'ruby']);

function judgeShell(src, mode, cwd, depth) {
  if (!src || depth > 4) return;
  const cmds = lex(src, mode);
  const vars = new Map();
  let pipeStart = 0;
  for (let k = 0; k < cmds.length; k++) {
    const c = cmds[k];
    if (k > 0 && cmds[k - 1].sep !== '|') pipeStart = k;
    for (const s of c.subs) judgeShell(s, mode, cwd, depth + 1);
    for (const r of c.redirs) {
      const t = expand(r.target, vars, cwd);
      hit(t, r.op === '>>' ? 'append' : 'overwrite', cwd, r.op === '>>' ? 'append to' : 'overwrite');
    }
    const words = c.words.map((x) => expand(x, vars, cwd));
    const prev = k > pipeStart ? cmds.slice(pipeStart, k) : [];
    cwd = command(words, c, prev, { mode, vars, depth }, cwd);
  }
}

// Judges one simple command; returns the working folder after it (cd).
function command(words, c, prev, ctx, cwd) {
  const { mode, vars, depth } = ctx;
  let w = words.slice();
  // assignments: NAME=value (sh), $name = value (PowerShell)
  if (mode === 'ps' && w.length >= 3 && /^\$\w+$/.test(w[0].v) && w[1].v === '=') { if (!w[2].dyn) vars.set(w[0].v.slice(1), w[2].v); return cwd; }
  if (mode === 'ps' && w.length && /^\$(\w+)=(.*)$/.test(w[0].v)) { const m = /^\$(\w+)=(.*)$/.exec(w[0].v); if (!w[0].dyn) vars.set(m[1], m[2]); w.shift(); }
  while (w.length && mode === 'sh' && /^[A-Za-z_]\w*=/.test(w[0].v)) { const e = w[0].v.indexOf('='); if (!w[0].dyn) vars.set(w[0].v.slice(0, e), w[0].v.slice(e + 1)); w.shift(); }
  // wrappers and keywords before the command itself
  for (let guard = 0; w.length && guard < 20; guard++) {
    const b = base(w[0].v);
    if (['sudo', 'nohup', 'time', 'command', 'builtin', 'exec', 'then', 'do', 'else', 'elif', 'if', 'while', 'until', '!', 'nice', 'stdbuf', 'ionice'].includes(b)) {
      w.shift(); while (w.length && w[0].v.startsWith('-')) w.shift(); continue;
    }
    if (b === 'env') { w.shift(); while (w.length && (w[0].v.startsWith('-') || /^[A-Za-z_]\w*=/.test(w[0].v))) w.shift(); continue; }
    if (b === 'timeout') { w.shift(); while (w.length && w[0].v.startsWith('-')) w.shift(); w.shift(); continue; }
    break;
  }
  if (!w.length) return cwd;
  const name = base(w[0].v), args = w.slice(1);
  const verb = name;
  if (mode === 'sh' && ['export', 'declare', 'local', 'readonly', 'typeset'].includes(name)) {
    for (const a of args) { const e = a.v.indexOf('='); if (e > 0 && !a.dyn) vars.set(a.v.slice(0, e), a.v.slice(e + 1)); }
    return cwd;
  }
  // working folder
  if (['cd', 'pushd', 'chdir', 'set-location', 'sl', 'push-location'].includes(name)) {
    let t;
    if (mode === 'ps') { const p = psParams(args, ['path', 'literalpath', 'lp'], ['stackname']); t = p.pick(['path', 'literalpath', 'lp'])[0] || p.pos[0]; }
    else t = operands(args, [], mode)[0];
    if (!t) return mode === 'sh' ? (canonical(process.env.HOME || homedir(), cwd) || cwd) : cwd;
    if (t.dyn || t.v === '-') return cwd;
    return canonical(t.v, cwd) || cwd;
  }
  // nested shells and code
  if (['bash', 'sh', 'zsh', 'dash', 'ksh'].includes(name)) {
    const k = args.findIndex((a) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a.v));
    if (k >= 0 && args[k + 1]) judgeShell(args[k + 1].v, 'sh', cwd, depth + 1);
    else if (!operands(args).length) judgeShell(c.body || (prev.length ? prev[prev.length - 1].body : ''), 'sh', cwd, depth + 1);
    return cwd;
  }
  if (name === 'eval') { judgeShell(args.map((a) => a.v).join(' '), 'sh', cwd, depth + 1); return cwd; }
  if (['invoke-expression', 'iex'].includes(name)) { judgeShell(args.map((a) => a.v).join(' '), 'ps', cwd, depth + 1); return cwd; }
  if (name === 'cmd') {
    const k = args.findIndex((a) => /^\/\/?[ck]$/i.test(a.v));
    if (k >= 0) judgeShell(args.slice(k + 1).map((a) => a.v).join(' '), 'cmd', cwd, depth + 1);
    return cwd;
  }
  if (name === 'powershell' || name === 'pwsh') {
    for (let k = 0; k < args.length; k++) {
      const a = args[k].v.toLowerCase();
      if (/^-(c|co|com|comm|comma|comman|command)$/.test(a)) { judgeShell(args.slice(k + 1).map((x) => x.v).join(' '), 'ps', cwd, depth + 1); break; }
      if (/^-(e|ec|en|enc|enco|encod|encode|encoded|encodedc|encodedcommand)$/.test(a) && args[k + 1]) {
        try { judgeShell(Buffer.from(args[k + 1].v, 'base64').toString('utf16le'), 'ps', cwd, depth + 1); } catch {}
        break;
      }
      if (/^-(f|fi|fil|file)$/.test(a)) break;
      if (!a.startsWith('-')) { judgeShell(args.slice(k).map((x) => x.v).join(' '), 'ps', cwd, depth + 1); break; }
      if (/^-(executionpolicy|ex|ep|windowstyle|w|outputformat|of|inputformat|if|configurationname|psconsolefile|version|v|workingdirectory|wd)$/.test(a)) k++;
    }
    return cwd;
  }
  if (INTERP.has(name)) {
    const codes = [];
    let script = null;
    for (let k = 0; k < args.length; k++) {
      const a = args[k].v;
      if (['-e', '--eval', '-p', '--print', '-c', '-E'].includes(a)) { if (args[k + 1]) codes.push(args[k + 1].v); k++; continue; }
      if (/^--(eval|print)=/.test(a)) { codes.push(a.slice(a.indexOf('=') + 1)); continue; }
      if (name === 'perl' && /^-[lnpa0-9]*i/.test(a)) { inPlace(args.slice(k + 1), cwd, 'perl'); }
      if (['-r', '--require', '--import', '--loader', '-m', '-M', '-I', '-x'].includes(a) && name !== 'perl') { k++; continue; }
      if (a.startsWith('-') && a !== '-') continue;
      script = a; break;
    }
    // node research-tree/tools/lane.mjs ... -- <command>
    if (script && /(^|[\\/])lane\.mjs$/i.test(script)) {
      const e = args.findIndex((a) => a.v === '--');
      if (e >= 0) command(args.slice(e + 1), { words: [], redirs: [], body: '', subs: [], sep: '' }, [], ctx, cwd);
      return cwd;
    }
    if ((!script || script === '-') && !codes.length) codes.push(c.body || (prev.length ? prev[prev.length - 1].body : ''));
    for (const code of codes) checkCode(code, cwd, 'code');
    return cwd;
  }
  if (name === 'xargs') {
    let k = 0;
    const valued = ['-a', '--arg-file', '-d', '--delimiter', '-E', '-I', '-L', '-l', '-n', '--max-args', '-P', '--max-procs', '-s', '--max-chars', '--process-slot-var'];
    while (k < args.length && args[k].v.startsWith('-')) { k += valued.includes(args[k].v) ? 2 : 1; }
    const inner = args.slice(k);
    if (!inner.length) return cwd;
    const ib = base(inner[0].v), io = optionsOf(inner.slice(1));
    let m = null;
    if (DELETE.has(ib) || ib === 'mv') m = 'delete';
    else if (ib === 'truncate' || ib === 'tee' || (ib === 'sed' && io.some((o) => /^-[a-zA-Z]*i|^--in-place/.test(o))) || (ib === 'perl' && io.some((o) => /^-[lnpa0-9]*i/.test(o)))) m = 'overwrite';
    else if (ib === 'git' && inner.slice(1).some((a) => ['rm', 'mv'].includes(a.v))) m = 'delete';
    if (m) for (const p of prev) for (const x of p.words.slice(1).map((y) => expand(y, vars, cwd))) if (!x.v.startsWith('-')) hit(x, m, cwd, `${ib} (through xargs)`);
    command(inner, c, prev, ctx, cwd);
    return cwd;
  }
  // PowerShell cmdlets and aliases
  if (mode === 'ps') return psCommand(name, args, ctx, cwd, prev);
  if (mode === 'cmd') {
    if (CMD_DELETE.has(name)) for (const t of operands(args, [], 'cmd')) hit(t, 'delete', cwd, verb);
    else if (name === 'copy' || name === 'xcopy') { const o = operands(args, [], 'cmd'); if (o.length >= 2) dest(o.slice(0, -1), o[o.length - 1], cwd, verb); }
    else if (name === 'move') { const o = operands(args, [], 'cmd'); if (o.length >= 2) { for (const s of o.slice(0, -1)) hit(s, 'delete', cwd, verb); dest(o.slice(0, -1), o[o.length - 1], cwd, verb); } }
    else if (name === 'ren' || name === 'rename') { const o = operands(args, [], 'cmd'); if (o[0]) hit(o[0], 'delete', cwd, verb); if (o[0] && o[1] && !o[0].dyn) hitPath(join(dirname(canonical(o[0].v, cwd)), o[1].v), 'overwrite', cwd, verb); }
    return cwd;
  }
  // sh
  if (DELETE.has(name)) { for (const t of operands(args, name === 'shred' ? ['-n', '-s', '--iterations', '--size'] : [])) hit(t, 'delete', cwd, verb); return cwd; }
  if (name === 'truncate') { for (const t of operands(args, ['-s', '--size', '-r', '--reference'])) hit(t, 'overwrite', cwd, verb); return cwd; }
  if (name === 'tee') { const app = optionsOf(args).some((o) => o === '--append' || /^-[a-zA-Z]*a/.test(o)); for (const t of operands(args)) hit(t, app ? 'append' : 'overwrite', cwd, app ? 'append to' : 'overwrite'); return cwd; }
  if (['cp', 'install', 'ln', 'rsync', 'mv'].includes(name)) {
    const valued = ['-t', '--target-directory', '-S', '--suffix', '-m', '--mode', '-o', '--owner', '-g', '--group', '-e', '--rsh'];
    const o = operands(args, valued);
    let t = null;
    for (let k = 0; k < args.length; k++) {
      if (args[k].v === '-t' || args[k].v === '--target-directory') t = args[k + 1];
      else if (args[k].v.startsWith('--target-directory=')) t = { ...args[k], v: args[k].v.slice(19) };
    }
    const srcs = t ? o : o.slice(0, -1), d = t || (o.length >= 2 ? o[o.length - 1] : null);
    if (name === 'mv') for (const s of srcs) hit(s, 'delete', cwd, 'move');
    if (d && srcs.length) dest(srcs, d, cwd, name === 'mv' ? 'move onto' : 'overwrite');
    return cwd;
  }
  if (name === 'rename') { for (const t of operands(args)) hit(t, 'delete', cwd, verb); return cwd; }
  if (name === 'sed') { inPlace(args, cwd, 'sed'); return cwd; }
  if (name === 'dd') { for (const a of args) if (a.v.startsWith('of=')) hit({ ...a, v: a.v.slice(3) }, 'overwrite', cwd, 'overwrite (dd)'); return cwd; }
  if (name === 'find') { findCmd(args, cwd); return cwd; }
  if (name === 'git') { gitCmd(args, cwd); return cwd; }
  return cwd;
}

function inPlace(args, cwd, tool) {
  const opts = optionsOf(args);
  const on = tool === 'perl' || opts.some((o) => /^-[a-zA-Z]*i/.test(o) || o.startsWith('--in-place'));
  if (!on) return;
  const hasScript = opts.some((o) => ['-e', '--expression', '-f', '--file', '-E'].includes(o) || /^--(expression|file)=/.test(o));
  const o = operands(args, ['-e', '--expression', '-f', '--file', '-l', '--line-length', '-E', '-M', '-I']);
  for (const t of hasScript ? o : o.slice(1)) hit(t, 'overwrite', cwd, `edit in place (${tool} -i)`);
}

// cp/mv/ln destinations: into a folder, each source keeps its name
function dest(srcs, d, cwd, verb) {
  if (!d || d.dyn) return;
  const dAbs = canonical(d.v, cwd);
  if (!dAbs) return;
  let isDir = false;
  try { isDir = statSync(dAbs).isDirectory(); } catch {}
  if (!isDir && !/[\\/]$/.test(d.v)) { hit(d, 'overwrite', cwd, verb); return; }
  if (!isDir) return;
  for (const s of srcs) {
    if (s.dyn) continue;
    if (s.glob) {
      const k = s.v.search(/[*?[{]/), cut = Math.max(s.v.lastIndexOf('/', k), s.v.lastIndexOf('\\', k));
      const dir = canonical(cut >= 0 ? s.v.slice(0, cut + 1) : '.', cwd), pat = s.v.slice(cut + 1);
      if (/[\\/]/.test(pat)) continue;
      const re = new RegExp('^' + pat.replace(/[.+^$()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
      let names = [];
      try { names = readdirSync(dir).filter((x) => re.test(x)); } catch {}
      for (const x of names.slice(0, 500)) hitPath(join(dAbs, x), 'overwrite', cwd, verb);
      continue;
    }
    const sAbs = canonical(s.v, cwd);
    if (sAbs) hitPath(join(dAbs, basename(sAbs)), 'overwrite', cwd, verb);
  }
}

function findCmd(args, cwd) {
  let k = 0;
  while (k < args.length && /^-[HLP]$/.test(args[k].v)) k++;
  const starts = [];
  while (k < args.length && !/^[-(!)]/.test(args[k].v)) starts.push(args[k++]);
  const rest = args.slice(k).map((a) => a.v);
  let harmful = rest.includes('-delete');
  for (let e = 0; e < rest.length; e++) {
    if (!['-exec', '-execdir', '-ok', '-okdir'].includes(rest[e])) continue;
    const b = base(rest[e + 1] || ''), tail = rest.slice(e + 2, rest.findIndex((x, y) => y > e && (x === ';' || x === '+')));
    if (DELETE.has(b) || ['mv', 'truncate', 'tee'].includes(b) || (b === 'sed' && tail.some((o) => /^-[a-zA-Z]*i|^--in-place/.test(o))) || (b === 'perl' && tail.some((o) => /^-[lnpa0-9]*i/.test(o)))) harmful = true;
  }
  if (harmful) for (const s of starts.length ? starts : [word('.')]) hit(s, 'delete', cwd, 'change files under (find)');
}

// whether the short option or cluster o (-f, -qf) holds the letter ch before any letter of `valued` (whose value follows)
function shortHas(o, ch, valued) {
  if (!/^-[a-zA-Z0-9]+$/.test(o)) return false;
  for (const c of o.slice(1)) { if (c === ch) return true; if (valued.includes(c)) return false; }
  return false;
}
// whether the word names something that exists (a path, not a branch)
function isPath(w, cwd) {
  if (w.dyn) return false;
  const p = canonical(w.v, cwd);
  try { return !!p && !!statSync(p); } catch { return false; }
}
function gitCmd(args, cwd) {
  let k = 0, gcwd = cwd;
  while (k < args.length && args[k].v.startsWith('-')) {
    const a = args[k].v;
    if (a === '-C' && args[k + 1]) { if (!args[k + 1].dyn) gcwd = canonical(args[k + 1].v, gcwd) || gcwd; k += 2; continue; }
    if (['-c', '--git-dir', '--work-tree', '--namespace', '--super-prefix', '--config-env', '--exec-path'].includes(a)) { k += 2; continue; }
    k++;
  }
  const sub = args[k] ? args[k].v : '', rest = args.slice(k + 1);
  const opts = optionsOf(rest);
  // the whole working tree of the checkout set back, its local changes thrown away or put away
  const whole = (verb, untracked) => { const at = locate(gcwd); if (at) hitPath(at.top, 'restore', gcwd, verb, { untracked }); };
  if (sub === 'rm') { for (const t of operands(rest, ['--pathspec-from-file'])) hit(t, 'delete', gcwd, 'remove (git rm)'); return; }
  if (sub === 'mv') {
    const o = operands(rest);
    for (const s of o.slice(0, -1)) hit(s, 'delete', gcwd, 'move (git mv)');
    if (o.length >= 2) dest(o.slice(0, -1), o[o.length - 1], gcwd, 'move onto (git mv)');
    return;
  }
  if (sub === 'checkout') {
    // -f with a branch or commit, or with nothing: the working tree is set to it and local changes are thrown away
    // (untracked files the target holds are overwritten too)
    if (opts.some((o) => o === '--force' || shortHas(o, 'f', 'bB'))) {
      const dd = rest.findIndex((a) => a.v === '--');
      const o = operands(rest, ['--conflict', '--pathspec-from-file', '-b', '-B', '--orphan']);
      if (dd < 0 && o.length <= 1 && !(o[0] && isPath(o[0], gcwd))) { whole('set back, throwing away local changes (git checkout -f),', true); return; }
    }
    if (opts.some((o) => ['-b', '-B', '--orphan'].includes(o))) return;
    const valued = ['--conflict', '--pathspec-from-file'];
    const dd = rest.findIndex((a) => a.v === '--');
    let tree = null, paths;
    if (dd >= 0) { tree = operands(rest.slice(0, dd), valued)[0] || null; paths = rest.slice(dd + 1); }
    else { const o = operands(rest, valued); if (o.length >= 2) { tree = o[0]; paths = o.slice(1); } else paths = o; }
    const m = !tree || tree.v === 'HEAD' ? 'restore' : 'overwrite';
    for (const t of paths) hit(t, m, gcwd, m === 'restore' ? 'restore (git checkout)' : `overwrite with the copy from ${tree.v} (git checkout)`);
    return;
  }
  if (sub === 'restore') {
    let source = null;
    for (let e = 0; e < rest.length; e++) {
      if (rest[e].v === '-s' || rest[e].v === '--source') source = rest[e + 1] ? rest[e + 1].v : null;
      else if (rest[e].v.startsWith('--source=')) source = rest[e].v.slice(9);
    }
    const staged = opts.some((o) => o === '--staged' || /^-[a-zA-Z]*S/.test(o)), worktree = opts.some((o) => o === '--worktree' || /^-[a-zA-Z]*W/.test(o));
    if (staged && !worktree) return;
    const m = !source || source === 'HEAD' ? 'restore' : 'overwrite';
    for (const t of operands(rest, ['-s', '--source', '--pathspec-from-file', '--conflict'])) hit(t, m, gcwd, m === 'restore' ? 'restore (git restore)' : `overwrite with the copy from ${source} (git restore)`);
    return;
  }
  if (sub === 'reset' && opts.some((o) => o === '--hard' || o === '--merge' || o === '--keep')) {
    const at = locate(gcwd);
    if (at) hitPath(at.top, 'restore', gcwd, 'reset (git reset --hard)');
    return;
  }
  if (sub === 'switch') {
    if (opts.some((o) => o === '--force' || o === '--discard-changes' || shortHas(o, 'f', 'cC'))) whole('set back, throwing away local changes (git switch --discard-changes),', true);
    return;
  }
  if (sub === 'stash') { // git stash, stash push, stash save (and their options): the changes are put away and the working tree set back
    let s2 = 'push', a2 = rest;
    if (rest.length && !rest[0].v.startsWith('-')) { s2 = rest[0].v; a2 = rest.slice(1); }
    if (s2 !== 'push' && s2 !== 'save') return; // list, show, pop, apply, drop, clear, branch, create, store
    const o2 = optionsOf(a2);
    const untracked = o2.some((o) => o === '--include-untracked' || o === '--all' || shortHas(o, 'u', 'm') || shortHas(o, 'a', 'm'));
    const paths = s2 === 'push' && !o2.some((o) => o.startsWith('--pathspec-from-file')) ? operands(a2, ['-m', '--message']) : [];
    if (paths.length) for (const t of paths) hit(t, 'restore', gcwd, 'put away (git stash)', { untracked });
    else whole('put away the changes of (git stash)', untracked);
    return;
  }
  if (sub === 'clean' && !opts.some((o) => o === '--dry-run' || /^-[a-zA-Z]*n/.test(o))) {
    const o = operands(rest, ['-e', '--exclude']);
    for (const t of o.length ? o : [word(gcwd)]) hit(t, 'delete', gcwd, 'clean (git clean)');
  }
}

function psCommand(name, args, ctx, cwd, prev) {
  const verb = name;
  if (PS_DELETE.has(name)) {
    const p = psParams(args, PATHS, ['filter', 'include', 'exclude', 'credential', 'stream']);
    if (p.has('whatif')) return cwd;
    let ts = [...p.pick(PATHS), ...p.pos];
    // Get-ChildItem x | Remove-Item: the items come down the pipeline from the commands before
    if (!ts.length) ts = prev.flatMap((c) => c.words.slice(1).map((y) => expand(y, ctx.vars, cwd))).filter((x) => !x.v.startsWith('-'));
    for (const t of ts) hit(t, 'delete', cwd, verb);
    return cwd;
  }
  if (['set-content', 'sc', 'add-content', 'ac', 'clear-content', 'clc'].includes(name)) {
    const p = psParams(args, PATHS, ['value', 'encoding', 'stream', 'filter', 'include', 'exclude', 'credential', 'delimiter']);
    if (p.has('whatif')) return cwd;
    const app = name === 'add-content' || name === 'ac';
    const ts = p.pick(PATHS);
    for (const t of ts.length ? ts : p.pos.slice(0, 1)) hit(t, app ? 'append' : 'overwrite', cwd, app ? 'append to' : 'overwrite');
    return cwd;
  }
  if (['out-file', 'tee-object', 'tee'].includes(name)) {
    const names = ['filepath', 'literalpath', 'lp', 'path'];
    const p = psParams(args, names, ['encoding', 'width', 'inputobject', 'variable']);
    const app = p.has('append');
    const ts = p.pick(names);
    for (const t of ts.length ? ts : p.pos.slice(0, 1)) hit(t, app ? 'append' : 'overwrite', cwd, app ? 'append to' : 'overwrite');
    return cwd;
  }
  if (['copy-item', 'cpi', 'cp', 'copy', 'move-item', 'mi', 'mv', 'move'].includes(name)) {
    const names = [...PATHS, 'destination'];
    const p = psParams(args, names, ['filter', 'include', 'exclude', 'credential', 'fromsession', 'tosession']);
    if (p.has('whatif')) return cwd;
    const q = p.pos.slice();
    const srcs = p.pick(PATHS).length ? p.pick(PATHS) : (q.length ? [q.shift()] : []);
    const d = p.pick(['destination'])[0] || q.shift();
    const moving = ['move-item', 'mi', 'mv', 'move'].includes(name);
    if (moving) for (const s of srcs) hit(s, 'delete', cwd, 'move');
    if (d && srcs.length) dest(srcs, d, cwd, moving ? 'move onto' : 'overwrite');
    return cwd;
  }
  if (['rename-item', 'rni', 'ren'].includes(name)) {
    const p = psParams(args, [...PATHS, 'newname'], ['credential']);
    if (p.has('whatif')) return cwd;
    const q = p.pos.slice();
    const s = p.pick(PATHS)[0] || q.shift(), nn = p.pick(['newname'])[0] || q.shift();
    if (s) hit(s, 'delete', cwd, 'rename');
    if (s && nn && !s.dyn) { const sAbs = canonical(s.v, cwd); if (sAbs) hitPath(join(dirname(sAbs), nn.v), 'overwrite', cwd, 'rename onto'); }
    return cwd;
  }
  if (['new-item', 'ni'].includes(name)) {
    const p = psParams(args, ['path', 'name'], ['itemtype', 'type', 'value', 'target', 'credential']);
    if (!p.has('force') || p.has('whatif')) return cwd;
    const q = p.pos.slice();
    const at = p.pick(['path'])[0] || q.shift(), nm = p.pick(['name'])[0];
    if (at && nm && !at.dyn) hitPath(join(canonical(at.v, cwd), nm.v), 'overwrite', cwd, 'overwrite (New-Item -Force)');
    else if (at) hit(at, 'overwrite', cwd, 'overwrite (New-Item -Force)');
    else if (nm) hit(nm, 'overwrite', cwd, 'overwrite (New-Item -Force)');
    return cwd;
  }
  if (name === 'git') gitCmd(args, cwd);
  return cwd;
}

// File calls with literal paths in inline code (node, python, perl, ruby) or PowerShell's .NET calls.
const CALLS = {
  writeFile: [[0, 'overwrite']], writeFileSync: [[0, 'overwrite']], appendFile: [[0, 'append']], appendFileSync: [[0, 'append']],
  createWriteStream: [[0, 'overwrite']], truncate: [[0, 'overwrite']], truncateSync: [[0, 'overwrite']],
  rm: [[0, 'delete']], rmSync: [[0, 'delete']], rmdir: [[0, 'delete']], rmdirSync: [[0, 'delete']], unlink: [[0, 'delete']], unlinkSync: [[0, 'delete']],
  rename: [[0, 'delete'], [1, 'overwrite']], renameSync: [[0, 'delete'], [1, 'overwrite']],
  copyFile: [[1, 'overwrite']], copyFileSync: [[1, 'overwrite']], cp: [[1, 'overwrite']], cpSync: [[1, 'overwrite']],
  symlink: [[1, 'overwrite']], symlinkSync: [[1, 'overwrite']], open: 'mode', openSync: 'mode',
  'os.remove': [[0, 'delete']], 'os.unlink': [[0, 'delete']], 'os.rmdir': [[0, 'delete']], 'os.removedirs': [[0, 'delete']],
  'os.rename': [[0, 'delete'], [1, 'overwrite']], 'os.replace': [[0, 'delete'], [1, 'overwrite']], 'os.truncate': [[0, 'overwrite']],
  'shutil.rmtree': [[0, 'delete']], 'shutil.move': [[0, 'delete'], [1, 'overwrite']], 'shutil.copy': [[1, 'overwrite']],
  'shutil.copy2': [[1, 'overwrite']], 'shutil.copyfile': [[1, 'overwrite']], 'shutil.copytree': [[1, 'overwrite']],
  '::writealltext': [[0, 'overwrite']], '::writealllines': [[0, 'overwrite']], '::writeallbytes': [[0, 'overwrite']],
  '::appendalltext': [[0, 'append']], '::appendalllines': [[0, 'append']], '::delete': [[0, 'delete']],
  '::move': [[0, 'delete'], [1, 'overwrite']], '::copy': [[1, 'overwrite']], '::replace': [[0, 'delete'], [1, 'overwrite']],
};
const CALL_RE = /(?<![\w$])(os\.(?:remove|unlink|rmdir|removedirs|rename|replace|truncate)|shutil\.(?:rmtree|move|copy2|copyfile|copytree|copy)|writeFileSync|writeFile|appendFileSync|appendFile|createWriteStream|truncateSync|truncate|rmSync|rmdirSync|rmdir|rm|unlinkSync|unlink|renameSync|rename|copyFileSync|copyFile|cpSync|cp|symlinkSync|symlink|openSync|open)\s*\(|(::(?:WriteAllText|WriteAllLines|WriteAllBytes|AppendAllText|AppendAllLines|Delete|Move|Copy|Replace))\s*\(|Path\(([^()]*)\)\.(write_text|write_bytes|unlink|rmdir|rename|replace)\s*\(/gi;
// (Path's argument is taken whole and trimmed by evalArg: `\(\s*([^()]*?)\s*\)` took cubic time on a long run of spaces.)
function splitArgs(code, k) { // k just after '('; returns [args text list, index after ')']
  const out = [];
  let depth = 0, q = null, start = k;
  for (; k < code.length; k++) {
    const ch = code[k];
    if (q) { if (ch === '\\') k++; else if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') q = ch;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) { if (depth === 0) { out.push(code.slice(start, k)); return [out, k + 1]; } depth--; }
    else if (ch === ',' && depth === 0) { out.push(code.slice(start, k)); start = k + 1; }
  }
  out.push(code.slice(start));
  return [out, k];
}
function evalArg(t, consts, raw, d = 0) {
  if (t == null || d > 4) return null;
  t = t.trim().replace(/^[A-Za-z_]\w*\s*=(?!=)\s*/, '');
  let m = /^([rRbBuU]{0,2})(['"`])([\s\S]*)\2$/.exec(t);
  if (m && !m[3].includes(m[2] === '`' ? '${' : '\u0000')) {
    const body = m[3];
    if (raw || /r/i.test(m[1])) return body;
    return body.replace(/\\([\\'"`])/g, '$1');
  }
  if (/^[A-Za-z_$][\w$]*$/.test(t)) return t === '__dirname' ? '.' : (consts.has(t) ? consts.get(t) : null);
  if (/^process\.cwd\(\)$/.test(t)) return '.';
  m = /^(?:(?:path|os\.path|posixpath|ntpath|\[(?:System\.)?IO\.Path\]:)[.:]?)?(join|resolve|Path|Combine)\s*\(([\s\S]*)\)$/i.exec(t);
  if (m) {
    const [parts] = splitArgs(m[2] + ')', 0);
    const vals = parts.map((x) => evalArg(x, consts, raw, d + 1));
    if (vals.some((x) => x == null)) return null;
    return vals.join('/');
  }
  return null;
}
function checkCode(code, cwd, lang) {
  if (!code || code.length > 200000) return;
  const raw = lang === 'ps';
  const consts = new Map();
  const asg = /(?:\b(?:const|let|var)\s+|\$|(?:^|[;\n{])\s*)([A-Za-z_][\w]*)\s*=(?!=)\s*([^;\n]+)/g;
  let m;
  while ((m = asg.exec(code))) {
    const v = evalArg(m[2].replace(/[,)]\s*$/, ''), consts, raw);
    if (v != null) consts.set(m[1], v);
  }
  CALL_RE.lastIndex = 0;
  while ((m = CALL_RE.exec(code))) {
    const at = m.index + m[0].length;
    const [argv] = splitArgs(code, at);
    if (m[4]) { // Path('x').write_text(...)
      const p = evalArg(m[3], consts, raw);
      const mm = m[4].toLowerCase();
      if (p != null) hitPath(p, mm === 'unlink' || mm === 'rmdir' || mm === 'rename' || mm === 'replace' ? 'delete' : 'overwrite', cwd, `${mm} (inline code)`);
      if ((mm === 'rename' || mm === 'replace') && argv[0]) { const q = evalArg(argv[0], consts, raw); if (q != null) hitPath(q, 'overwrite', cwd, `${mm} onto (inline code)`); }
      continue;
    }
    const key = (m[1] || m[2]);
    const spec = CALLS[key] || CALLS[key.toLowerCase()] || CALLS[Object.keys(CALLS).find((x) => x.toLowerCase() === key.toLowerCase())];
    if (!spec) continue;
    if (spec === 'mode') {
      const fl = evalArg(argv[1], consts, raw);
      if (fl == null || !/[wax+]/.test(fl)) continue;
      const p = evalArg(argv[0], consts, raw);
      if (p != null) hitPath(p, /^[a]b?$/.test(fl) ? 'append' : 'overwrite', cwd, `open for writing (inline code)`);
      continue;
    }
    for (const [idx, mode] of spec) {
      const p = evalArg(argv[idx], consts, raw);
      if (p != null) hitPath(p, mode, cwd, `${mode === 'delete' ? 'remove' : mode === 'append' ? 'append to' : 'write'} (${key.replace(/^::/, '')} in inline code)`);
    }
  }
}

try {
  if (tool === 'AskUserQuestion') checkQuestions();
  else if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') checkFileTool();
  else if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(ti.command || '');
    judgeShell(cmd, tool === 'PowerShell' ? 'ps' : 'sh', cwd0, 0);
    if (tool === 'PowerShell') checkCode(cmd, cwd0, 'ps');
  }
} catch (e) {
  if (e instanceof Refusal) deny({ ...rec, path: e.path }, e.why);
  log({ ...rec, decision: 'allow', note: 'guard error: ' + String(e && e.stack || e).slice(0, 300) });
}
process.exit(0);

function checkQuestions() {
  const qs = Array.isArray(ti.questions) ? ti.questions : [];
  const bad = qs.filter((q) => !/^\s*(approve|cap|fact)\s*:/i.test(String(q && q.question || '')));
  if (bad.length) {
    deny({ ...rec, question: String(bad[0].question || '').slice(0, 80) },
      'record guard (r57-0001, CLAUDE.md rule 7): no design questions to the owner. A mechanism comes from the recorded research, ' +
      'a parameter is computed from measurements, a missing fact is measured. Ask him only for his word on an action ' +
      '("approve: ..."), a token cap ("cap: ...") or a fact only he can read ("fact: ..."): start each question with that kind and a colon. ' +
      'If it is a design choice, decide it from the library (library/INDEX.md) and show him how the conclusion was reached (r57-0027).');
  }
}
