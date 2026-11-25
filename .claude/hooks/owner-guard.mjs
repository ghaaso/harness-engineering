// Owner guard (2026-11-25; brief docs/program/repo-organisation-2026-11-25/briefs/GUARD.md; the owner's ruling r58-0005;
// who has what: OWNERS.json at the root, record r58-0101). PreToolUse hook for Write, Edit, MultiEdit, NotebookEdit, Bash
// and PowerShell. Two people work in this repository: nothing the other person has done and pushed is changed from this
// PC. OWNERS.json names this PC's person (this_pc); every other person under people is "another person". Refused:
//   a. Write, Edit, MultiEdit, NotebookEdit of a path that, relative to the root of any checkout or worktree of this
//      repository, matches a path pattern of another person;
//   b. a Bash or PowerShell command that writes, moves, deletes or restores such a path, or deletes a folder that holds
//      one: the record guard's detection (redirections, rm, mv, cp onto, tee, sed -i, touch, *-Content, Out-File,
//      Remove-Item, Move-Item, git rm, git mv, git checkout -- <path>, git restore <path>, literal paths of file calls in
//      inline code, ...), copied from record-guard.mjs; a whole-tree reset (git stash, reset --hard, checkout -f) only
//      while their paths have local changes;
//   c. a git command that changes another person's branch, here or on the remote: git push whose destination is theirs
//      (also :ref, --delete, +ref, --force, --force-with-lease[=ref]), git push --mirror, --all, --branches, --prune, a
//      matching (:) or pattern (*) push; git branch -d/-D/-m/-M/-f/-C, git checkout -B, git switch -C and git update-ref
//      naming such a branch (or another person's tag);
//   d. a direct push to a shared branch (main): git push whose destination is main or refs/heads/main;
//   e. gh pr merge|close|edit|reopen|ready on a pull request whose author is not this_pc's github login. The author is
//      read with gh pr view <n> --json author (5 s); when it cannot be told, refused. In tests the environment variable
//      OWNER_GUARD_PR_AUTHOR supplies the answer: a login, or a JSON object from the pull request argument ('' when none
//      is given, '*' for any other) to a login.
// Passes: everything of this_pc's own; reading, fetching (git fetch origin main:main too), diffing and logging anything; a
// command that only names another person's path or branch; git push --dry-run.
// Cannot see: a path held in a variable it cannot read (passes; a push to a ref it cannot read is refused), a path a
// script file computes, git update-ref --stdin, git apply and patch, gh api calls, commits made on a local copy of another
// person's branch (pushing it is refused), anything done outside the sessions of this PC.
// Failure: OWNERS.json unreadable in the checkout and in the main checkout: the call passes and is logged (fails open, as
// the fan-out gate does). An unreadable hook input or an error of the guard itself: logged, the call passes.
// Refusals are logged to ../logs/owner-guard.jsonl.
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
    appendFileSync(resolve(here, '..', 'logs', 'owner-guard.jsonl'), JSON.stringify({ t: Date.now(), ...o }) + '\n');
  } catch {}
}
function deny(rec, why) { log({ ...rec, decision: 'deny', why }); process.stderr.write(why + '\n'); process.exit(2); }
class Refusal { constructor(path, why) { this.path = path; this.why = why; } }
// the record guard's journal parts are not used here: no command is judged as naming the journal
const namesJournal = false;
const quiet = (fn) => fn();
const dynRefusal = (what) => new Refusal(String(what), 'unused');

let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { log({ decision: 'allow', note: 'hook input unreadable' }); process.exit(0); }
if (!j || typeof j !== 'object' || j.hook_event_name !== 'PreToolUse') process.exit(0);
const tool = String(j.tool_name || '');
const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
const rec = { session: typeof j.session_id === 'string' ? j.session_id.slice(0, 8) : null, tool };
const cwd0 = typeof j.cwd === 'string' && j.cwd ? j.cwd : repo;
// rule a for the file tools, b for shell commands
let RULE = 'a';

// ---- paths (from record-guard.mjs) ----
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
const cannotTell = (p, what) => new Error(`${String(p).slice(0, 200)} is ${what}`); // no local path: passes (canonical)
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
function canonical0(p, cwd) {
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

// A path that cannot be brought to a local one (another share, a device path) is no checkout of this repository: it passes.
function canonical(p, cwd) { try { return canonical0(p, cwd); } catch { return null; } }

// ---- who has what (OWNERS.json) ----
function globRe(pat, crossSlash) {
  let s = '';
  for (let i = 0; i < pat.length; i++) {
    const ch = pat[i];
    if (ch === '*') { if (pat[i + 1] === '*') { s += '.*'; i++; } else s += crossSlash ? '.*' : '[^/]*'; }
    else if (ch === '?') s += crossSlash ? '.' : '[^/]';
    else s += ch.replace(/[.+^$()|\\[\]{}]/g, '\\$&');
  }
  return s;
}
const pathRe = (pat) => new RegExp('^(?:' + globRe(pat, false) + (pat.endsWith('/**') ? '|' + globRe(pat.slice(0, -3), false) : '') + ')$', 'i');
const refRe = (pat) => new RegExp('^(?:' + globRe(pat, true) + ')$', 'i');
let owners = null;
function loadOwners() {
  const tops = [];
  const c = canonical(cwd0, repo), at = c && locate(c);
  if (at) tops.push(at.top);
  if (!tops.some((t) => relative(t, main) === '')) tops.push(main);
  let o = null, from = null;
  const tried = [];
  for (const t of tops) {
    try { o = JSON.parse(readFileSync(join(t, 'OWNERS.json'), 'utf8')); from = join(t, 'OWNERS.json'); break; }
    catch (e) { tried.push(`${join(t, 'OWNERS.json')}: ${String(e && e.message || e).split('\n')[0].slice(0, 100)}`); }
  }
  if (!o || typeof o !== 'object' || !o.people || typeof o.people !== 'object' || typeof o.this_pc !== 'string' || !o.people[o.this_pc]) {
    log({ ...rec, decision: 'allow', note: 'OWNERS.json unreadable (fails open): ' + (tried.join('; ') || `${from} names no this_pc among people`) });
    return null;
  }
  const meP = o.people[o.this_pc];
  const others = Object.entries(o.people).filter(([id]) => id !== o.this_pc).map(([id, p]) => ({
    id, name: String(p.name || id), github: String(p.github || ''),
    paths: (p.paths || []).map((x) => ({ pat: String(x), re: pathRe(String(x)), prefix: String(x).slice(0, String(x).search(/[*?[]|$/)).replace(/\/+$/, '') })),
    branches: (p.branches || []).map((x) => ({ pat: String(x), re: refRe(String(x)) })),
    tags: (p.tags || []).map((x) => ({ pat: String(x), re: refRe(String(x)) })),
  }));
  const shared = ((o.shared && o.shared.branches) || ['main']).map((x) => ({ pat: String(x), re: refRe(String(x)) }));
  const own = String((meP.branches || [])[0] || o.this_pc + '/*').replace(/\*+/g, '...');
  return { me: o.this_pc, meName: String(meP.name || o.this_pc), github: String(meP.github || ''), others, shared, own, from };
}
const LEAVE = (p) => `Nothing ${p.name} has done is changed from this PC: leave it, and if it needs a change, tell the owner so ${p.name} makes it.`;
// the other person whose path pattern rel matches: { p, pat } or null
function pathOwner(rel) {
  if (!rel) return null;
  for (const p of owners.others) for (const x of p.paths) if (x.re.test(rel)) return { p, pat: x.pat };
  return null;
}
// what of other people's a folder (rel '' is the whole checkout) holds: [{ p, prefix }] for patterns whose fixed part lies
// inside it and exists
function dirHolds(at) {
  const r = at.rel.toLowerCase(), out = [];
  for (const p of owners.others) for (const x of p.paths) {
    const lp = x.prefix;
    if (!lp) continue;
    if ((r === '' || lp.toLowerCase().startsWith(r + '/')) && existsSync(join(at.top, lp))) out.push({ p, prefix: lp });
  }
  return out;
}
function theirsDirty(top, held, untracked) {
  try {
    const out = execFileSync('git', ['-C', top, 'status', '--porcelain', `--untracked-files=${untracked ? 'all' : 'no'}`, '--', ...held.map((h) => h.prefix)],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000, windowsHide: true });
    return out.trim().length > 0;
  } catch { return true; } // cannot tell: treated as changed
}
// A ref name brought to { kind: 'branch' | 'tag', name }: refs/heads/x, refs/remotes/<remote>/x and x are the branch x.
function refName(s) {
  s = String(s);
  if (/^refs\/tags\//i.test(s)) return { kind: 'tag', name: s.slice(10) };
  const m = /^refs\/remotes\/[^/]+\/(.+)$/i.exec(s);
  if (m) return { kind: 'branch', name: m[1] };
  return { kind: 'branch', name: s.replace(/^refs\/heads\//i, '') };
}
// Refuses when the ref is another person's (and, for a push, when it is shared). what: the words for the change.
function checkRef(ref, what, push) {
  const r = refName(ref);
  if (!r.name) return;
  for (const p of owners.others) for (const x of r.kind === 'tag' ? p.tags : p.branches) {
    if (x.re.test(r.name)) {
      throw new Refusal(ref, `owner guard (r58-0005, rule c): ${what} would change the ${r.kind} ${r.name}, which is ${p.name}'s (OWNERS.json: ${r.kind}es "${x.pat}"). ` + LEAVE(p));
    }
  }
  if (push && r.kind === 'branch') for (const x of owners.shared) {
    if (x.re.test(r.name)) {
      throw new Refusal(ref, `owner guard (r58-0005, rule d): ${what} would push to ${r.name} directly; ${r.name} is shared and changes only by pull request, ` +
        `each person merging only their own (OWNERS.json "shared"). Push to a ${owners.own} branch and open a pull request (gh pr create).`);
    }
  }
}

// ---- a write the command makes ----
// mode: 'overwrite', 'append', 'delete', 'touch' (makes or changes) or 'restore' (from git's index or HEAD)
function hit(w, mode, cwd, verb, opt = {}) {
  if (!w || !w.v || w.dyn) return;
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
  const what = RULE === 'a' ? `this ${tool}` : 'this command';
  let st = null;
  try { st = statSync(abs); } catch {}
  const own = pathOwner(at.rel);
  if (own && (mode !== 'restore' || st)) {
    throw new Refusal(at.rel, `owner guard (r58-0005, rule ${RULE}): ${what} would ${verb} ${named(at)}, which is ${own.p.name}'s (OWNERS.json: paths "${own.pat}"). ` + LEAVE(own.p));
  }
  if (!st) return;
  if (at.rel === '' && at.kind === 'worktree' && mode === 'delete') return; // removing a whole worktree
  if (!(st.isDirectory() || glob) || mode === 'touch' || (mode === 'append' && !glob)) return;
  const held = dirHolds(at);
  if (!held.length) return;
  if (mode === 'restore' && !theirsDirty(at.top, held, opt.untracked)) return;
  const h = held[0];
  throw new Refusal(at.rel, `owner guard (r58-0005, rule ${RULE}): ${what} would ${verb} ${glob ? 'files in ' : ''}${named(at) || at.top}, which holds ${h.prefix}, ` +
    `${h.p.name}'s (OWNERS.json)${mode === 'restore' ? ' with local changes' : ''}. ` + LEAVE(h.p) + ' Name the files you mean, outside theirs.');
}
const word = (v) => ({ v, dyn: false, glob: false, q: false });
const hitPath = (p, mode, cwd, verb, opt) => hit(word(p), mode, cwd, verb, opt);

// ---- Write, Edit, MultiEdit, NotebookEdit ----
function checkFileTool() {
  const p = ti.file_path || ti.notebook_path;
  if (!p) return;
  const abs = canonical(String(p), cwd0);
  const at = abs && locate(abs);
  if (!at || !at.rel) return;
  const own = pathOwner(at.rel);
  if (own) throw new Refusal(at.rel, `owner guard (r58-0005, rule a): this ${tool} would write ${named(at)}, which is ${own.p.name}'s (OWNERS.json: paths "${own.pat}"). ` + LEAVE(own.p));
}

// ---- shell commands (lexer and judging from record-guard.mjs) ----
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
    if (vars.has(name)) { const x = vars.get(name); if (x == null) { dyn = true; return '$' + name; } return x; }
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
  if (mode === 'ps' && w.length >= 3 && /^\$\w+$/.test(w[0].v) && w[1].v === '=') { vars.set(w[0].v.slice(1), !w[2].dyn && w.length === 3 ? w[2].v : null); return cwd; }
  if (mode === 'ps' && w.length && /^\$(\w+)=(.*)$/.test(w[0].v)) { const m = /^\$(\w+)=(.*)$/.exec(w[0].v); if (!w[0].dyn) vars.set(m[1], m[2]); w.shift(); }
  while (w.length && mode === 'sh' && /^[A-Za-z_]\w*=/.test(w[0].v)) { const e = w[0].v.indexOf('='); vars.set(w[0].v.slice(0, e), w[0].dyn ? null : w[0].v.slice(e + 1)); w.shift(); }
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
    else { const o = operands(args)[0]; if (o && !o.dyn) { const t = readScript(canonical(o.v, cwd)); if (t) quiet(() => judgeShell(t, 'sh', cwd, depth + 1)); } }
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
      if (/^-(f|fi|fil|file)$/.test(a)) { const o = args[k + 1]; if (o && !o.dyn) { const t = readScript(canonical(o.v, cwd)); if (t) quiet(() => judgeShell(t, 'ps', cwd, depth + 1)); } break; }
      if (!a.startsWith('-')) { judgeShell(args.slice(k).map((x) => x.v).join(' '), 'ps', cwd, depth + 1); break; }
      if (/^-(executionpolicy|ex|ep|windowstyle|w|outputformat|of|inputformat|if|configurationname|psconsolefile|version|v|workingdirectory|wd)$/.test(a)) k++;
    }
    return cwd;
  }
  if (INTERP.has(name)) {
    const codes = [];
    let script = null, scriptWord = null;
    for (let k = 0; k < args.length; k++) {
      const a = args[k].v;
      if (['-e', '--eval', '-p', '--print', '-c', '-E'].includes(a)) { if (args[k + 1]) codes.push(args[k + 1].v); k++; continue; }
      if (/^--(eval|print)=/.test(a)) { codes.push(a.slice(a.indexOf('=') + 1)); continue; }
      if (name === 'perl' && /^-[lnpa0-9]*i/.test(a)) { inPlace(args.slice(k + 1), cwd, 'perl'); }
      if (['-r', '--require', '--import', '--loader', '-m', '-M', '-I', '-x'].includes(a) && name !== 'perl') { k++; continue; }
      if (a.startsWith('-') && a !== '-') continue;
      script = a; scriptWord = args[k]; break;
    }
    if (scriptWord && script !== '-' && !scriptWord.dyn) {
      const sAbs = canonical(script, cwd), sAt = sAbs && locate(sAbs);
      if (sAt && sAt.rel.toLowerCase() === 'tools/journal.mjs') return cwd; // the one writer of the journal
      const text = readScript(sAbs);
      if (text) quiet(() => checkCode(text, cwd, 'code'));
    } else if (scriptWord && scriptWord.dyn && namesJournal) throw dynRefusal(scriptWord.v || 'a computed script');
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
  if (name === 'gh') { ghCmd(args, cwd); return cwd; }
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
  if (name === 'touch') { for (const t of operands(args, ['-r', '--reference', '-d', '--date', '-t'])) hit(t, 'touch', cwd, verb); return cwd; }
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
  // a folder named with a trailing slash that does not exist yet (mkdir -p x && cp f x/) is judged as the folder it will be
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

// the git folder of a checkout, its current branch, and that branch's upstream
function gitDirOfTop(top) {
  try { if (statSync(join(top, '.git')).isDirectory()) return join(top, '.git'); } catch { return null; }
  return gitdirOf(top);
}
function currentBranch(cwd) {
  const at = locate(cwd);
  if (!at) return null;
  try {
    const gd = gitDirOfTop(at.top);
    const m = gd && /^ref:\s*refs\/heads\/(.+?)\s*$/m.exec(readFileSync(join(gd, 'HEAD'), 'utf8'));
    return m ? { top: at.top, name: m[1] } : null;
  } catch { return null; }
}
function upstreamOf(top, branch) {
  try {
    return execFileSync('git', ['-C', top, 'config', '--get', `branch.${branch}.merge`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000, windowsHide: true }).trim() || null;
  } catch { return null; }
}

function pushCmd(rest, gcwd) {
  const valued = ['--repo', '-o', '--push-option', '--receive-pack', '--exec'];
  const ops = [], leases = [];
  let del = false, end = false;
  for (let k = 0; k < rest.length; k++) {
    const a = rest[k], v = a.v;
    if (end || !v.startsWith('-') || v === '-') { ops.push(a); continue; }
    if (v === '--') { end = true; continue; }
    if (valued.includes(v)) { k++; continue; }
    if (v === '--dry-run' || shortHas(v, 'n', 'o')) return; // changes nothing
    if (['--mirror', '--all', '--branches', '--prune'].includes(v)) {
      const p = owners.others[0];
      throw new Refusal(v, `owner guard (r58-0005, rule c): git push ${v} can change branches that are not ${owners.meName}'s (${owners.others.map((x) => x.name).join(', ')}'s, or the shared main). ` +
        `Push each own branch by name (git push origin ${owners.own.replace('...', '<name>')}).` + (p ? ' ' + LEAVE(p) : ''));
    }
    if (v === '--delete' || shortHas(v, 'd', 'o')) del = true;
    if (v.startsWith('--force-with-lease=')) { const r = v.slice(19).split(':')[0]; if (r) leases.push(r); }
  }
  const what = del ? 'git push --delete' : 'git push';
  for (const r of leases) checkRef(r, 'git push --force-with-lease', true);
  const specs = ops.slice(1);
  if (!specs.length) { // the current branch to its upstream
    const cb = currentBranch(gcwd);
    if (!cb) return;
    checkRef(cb.name, `${what} (of the current branch ${cb.name})`, true);
    const up = upstreamOf(cb.top, cb.name);
    if (up) checkRef(up, `${what} (to the upstream of ${cb.name})`, true);
    return;
  }
  for (let k = 0; k < specs.length; k++) {
    const s = specs[k];
    if (s.dyn) {
      throw new Refusal(s.v, `owner guard (r58-0005, rule c): git push to ${s.v.replace(/\u0001([^\u0001]*)\u0001/g, '$$$1')}, a ref the guard cannot read, so whether it is another ` +
        'person\'s branch or the shared main cannot be told. Write the branch name itself.');
    }
    let v = s.v.replace(/^\+/, '');
    if (v === 'tag' && specs[k + 1]) { v = 'refs/tags/' + specs[++k].v; }
    if (v === ':' || v.includes('*')) {
      throw new Refusal(v, `owner guard (r58-0005, rule c): git push ${v} pushes every matching branch, which can change branches that are not ${owners.meName}'s or the shared main. ` +
        'Push each own branch by name.');
    }
    let dst;
    const c = v.indexOf(':');
    if (del) dst = v.replace(/^:/, '');
    else if (c >= 0) dst = v.slice(c + 1) || v.slice(0, c);
    else dst = v;
    if (/^(HEAD|@)$/i.test(dst)) {
      const cb = currentBranch(gcwd);
      if (!cb) continue;
      checkRef(cb.name, `${what} ${s.v} (the current branch ${cb.name})`, true);
      if (c < 0) { const up = upstreamOf(cb.top, cb.name); if (up) checkRef(up, `${what} ${s.v} (to the upstream of ${cb.name})`, true); }
      continue;
    }
    checkRef(dst, `${what} ${s.v}`, true);
  }
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
  const whole = (verb, untracked) => { const at = locate(gcwd); if (at) hitPath(at.top, 'restore', gcwd, verb, { untracked }); };
  if (sub === 'push') { pushCmd(rest, gcwd); return; }
  if (sub === 'branch') {
    const changes = opts.some((o) => ['--delete', '--move', '--force'].includes(o) || /^-[a-zA-Z]*[dDmMfC]/.test(o));
    if (!changes) return;
    const remote = opts.some((o) => o === '--remotes' || /^-[a-zA-Z]*r/.test(o));
    const o = operands(rest, ['-u', '--set-upstream-to', '--contains', '--no-contains', '--merged', '--no-merged', '--points-at', '--sort', '--format']);
    for (const b of o) if (!b.dyn) checkRef(remote ? b.v.replace(/^[^/]+\//, '') : b.v, `git branch ${opts.join(' ')} ${b.v}`, false);
    if (o.length === 1 && opts.some((x) => /^-[a-zA-Z]*[mM]/.test(x) || x === '--move')) {
      const cb = currentBranch(gcwd);
      if (cb) checkRef(cb.name, `git branch ${opts.join(' ')} (renaming the current branch ${cb.name})`, false);
    }
    return;
  }
  if (sub === 'update-ref') {
    const o = operands(rest, ['-m', '--create-reflog']);
    if (o[0] && !o[0].dyn) checkRef(o[0].v, `git update-ref ${o[0].v}`, false);
    return;
  }
  if (sub === 'rm') { for (const t of operands(rest, ['--pathspec-from-file'])) hit(t, 'delete', gcwd, 'remove (git rm)'); return; }
  if (sub === 'mv') {
    const o = operands(rest);
    for (const s of o.slice(0, -1)) hit(s, 'delete', gcwd, 'move (git mv)');
    if (o.length >= 2) dest(o.slice(0, -1), o[o.length - 1], gcwd, 'move onto (git mv)');
    return;
  }
  if (sub === 'checkout') {
    for (let e = 0; e < rest.length; e++) if (rest[e].v === '-B' && rest[e + 1] && !rest[e + 1].dyn) checkRef(rest[e + 1].v, `git checkout -B ${rest[e + 1].v}`, false);
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
  if (sub === 'reset' && opts.some((o) => o === '--hard' || o === '--merge' || o === '--keep')) { whole('reset (git reset --hard)', false); return; }
  if (sub === 'switch') {
    for (let e = 0; e < rest.length; e++) if ((rest[e].v === '-C' || rest[e].v === '--force-create') && rest[e + 1] && !rest[e + 1].dyn) checkRef(rest[e + 1].v, `git switch -C ${rest[e + 1].v}`, false);
    if (opts.some((o) => o === '--force' || o === '--discard-changes' || shortHas(o, 'f', 'cC'))) whole('set back, throwing away local changes (git switch --discard-changes),', true);
    return;
  }
  if (sub === 'stash') {
    let s2 = 'push', a2 = rest;
    if (rest.length && !rest[0].v.startsWith('-')) { s2 = rest[0].v; a2 = rest.slice(1); }
    if (s2 !== 'push' && s2 !== 'save') return;
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

// gh pr merge|close|edit|reopen|ready: only on pull requests of this_pc's person
const GH_VALUED = {
  merge: ['-b', '--body', '-F', '--body-file', '-t', '--subject', '-A', '--author-email', '--match-head-commit'],
  close: ['-c', '--comment'], reopen: ['-c', '--comment'], ready: [],
  edit: ['-b', '--body', '-F', '--body-file', '-t', '--title', '-B', '--base', '-m', '--milestone', '--add-label', '--remove-label',
    '--add-reviewer', '--remove-reviewer', '--add-assignee', '--remove-assignee', '--add-project', '--remove-project'],
};
function prAuthor(sel, repoOpt, cwd) {
  const e = process.env.OWNER_GUARD_PR_AUTHOR;
  if (e !== undefined) {
    let m = null;
    try { m = JSON.parse(e); } catch {}
    if (m && typeof m === 'object') return String(m[sel] ?? m['*'] ?? '').trim();
    return String(e).trim();
  }
  try {
    let dir = cwd;
    try { if (!statSync(dir).isDirectory()) dir = repo; } catch { dir = repo; }
    return execFileSync('gh', ['pr', 'view', ...(sel ? [sel] : []), ...(repoOpt ? ['--repo', repoOpt] : []), '--json', 'author', '-q', '.author.login'],
      { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000, windowsHide: true }).trim();
  } catch { return ''; }
}
function ghCmd(args, cwd) {
  if (!args[0] || args[0].v !== 'pr' || !args[1]) return;
  const sub = args[1].v;
  if (!GH_VALUED[sub]) return;
  const valued = GH_VALUED[sub], rest = args.slice(2), ops = [];
  let repoOpt = null;
  for (let k = 0; k < rest.length; k++) {
    const a = rest[k], v = a.v;
    if (!v.startsWith('-') || v === '-') { ops.push(a); continue; }
    if (v === '-R' || v === '--repo') { repoOpt = rest[k + 1] ? rest[k + 1].v : null; k++; continue; }
    if (v.startsWith('--repo=')) { repoOpt = v.slice(7); continue; }
    if (valued.includes(v)) k++;
  }
  const sel = ops[0] ? ops[0].v : '';
  const author = ops[0] && ops[0].dyn ? '' : prAuthor(sel, repoOpt, cwd);
  const what = `gh pr ${sub}${sel ? ' ' + sel : ''}`;
  if (!author) {
    throw new Refusal(what, `owner guard (r58-0005, rule e): ${what}: who opened this pull request cannot be told (gh pr view gave no author within 5 s), ` +
      `and ${owners.meName} changes only his own. Check the author with gh pr view${sel ? ' ' + sel : ''} --json author; if it is not ${owners.github}'s, leave it and tell the owner.`);
  }
  if (author.toLowerCase() !== owners.github.toLowerCase()) {
    const p = owners.others.find((x) => x.github.toLowerCase() === author.toLowerCase());
    throw new Refusal(what, `owner guard (r58-0005, rule e): ${what} would change a pull request opened by ${p ? p.name + ' (' + author + ')' : 'the GitHub user ' + author}, ` +
      `not ${owners.meName} (${owners.github}); each person merges, closes and edits only their own (OWNERS.json "shared"). ` +
      (p ? LEAVE(p) : 'Leave it and tell the owner.'));
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
    if (p.has('whatif')) return cwd;
    const md = p.has('force') ? 'overwrite' : 'touch', vb = p.has('force') ? 'overwrite (New-Item -Force)' : 'make (New-Item)';
    const q = p.pos.slice();
    const at = p.pick(['path'])[0] || q.shift(), nm = p.pick(['name'])[0];
    if (at && nm && !at.dyn) hitPath(join(canonical(at.v, cwd), nm.v), md, cwd, vb);
    else if (at) hit(at, md, cwd, vb);
    else if (nm) hit(nm, md, cwd, vb);
    return cwd;
  }
  if (name === 'git') gitCmd(args, cwd);
  if (name === 'gh') ghCmd(args, cwd);
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
// A command run from inline code (child_process, os.system, subprocess) is judged as a shell command; one whose
// text cannot be read is refused when the command names the journal.
const EXEC_RE = /(?<![\w$])((?:child_process['"]?\)?|\bcp|\bchildProcess)\s*\.\s*)?(execSync|execFileSync|spawnSync|execFile|exec|spawn|os\.system|os\.popen|subprocess\.(?:run|call|check_call|check_output|Popen)|system)\s*\(/g;
function execCalls(code, cwd, lang) {
  const raw = lang === 'ps';
  const consts = new Map();
  let m;
  EXEC_RE.lastIndex = 0;
  while ((m = EXEC_RE.exec(code))) {
    const fn = m[2];
    if ((fn === 'exec' || fn === 'spawn' || fn === 'system') && !m[1] && code[m.index - 1] === '.') continue; // re.exec(...), not child_process
    const [argv] = splitArgs(code, m.index + m[0].length);
    const list = (t) => { const a = /^\s*\[([\s\S]*)\]\s*$/.exec(String(t || '')); if (!a) return null; const [ps] = splitArgs(a[1] + ')', 0); const vs = ps.filter((x) => x.trim()).map((x) => evalArg(x, consts, raw)); return vs.some((x) => x == null) ? undefined : vs; };
    let words = list(argv[0]);
    if (words === null) {
      const f = evalArg(argv[0], consts, raw);
      words = f == null ? undefined : [f];
      if (words && /^(execFileSync|spawnSync|execFile|spawn)$/.test(fn) && argv[1] && !/^\s*\{/.test(argv[1])) { const more = list(argv[1]); words = more ? words.concat(more) : undefined; }
    }
    if (!words) { if (namesJournal) throw dynRefusal(`${fn}(${String(argv[0] || '').trim().slice(0, 60)}) in inline code`); continue; }
    const text = words.length === 1 ? words[0] : words.map((x) => "'" + String(x).split("'").join("'\\''") + "'").join(' ');
    judgeShell(text, 'sh', cwd, 1);
  }
}
function readScript(abs) { try { if (abs && statSync(abs).isFile() && statSync(abs).size < 2000000) return readFileSync(abs, 'utf8'); } catch {} return null; }
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
  execCalls(code, cwd, lang);
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
      if (p == null && namesJournal) throw dynRefusal(`open(${String(argv[0] || '').trim().slice(0, 60)}) in inline code`);
      if (p != null) hitPath(p, /^[a]b?$/.test(fl) ? 'append' : 'overwrite', cwd, `open for writing (inline code)`);
      continue;
    }
    for (const [idx, mode] of spec) {
      const p = evalArg(argv[idx], consts, raw);
      if (p == null && namesJournal) throw dynRefusal(`${key.replace(/^::/, '')}(${String(argv[idx] || '').trim().slice(0, 60)}) in inline code`);
      if (p != null) hitPath(p, mode, cwd, `${mode === 'delete' ? 'remove' : mode === 'append' ? 'append to' : 'write'} (${key.replace(/^::/, '')} in inline code)`);
    }
  }
}

try {
  if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash', 'PowerShell'].includes(tool)) {
    owners = loadOwners();
    if (owners) {
      if (tool === 'Bash' || tool === 'PowerShell') {
        RULE = 'b';
        const cmd = String(ti.command || '');
        judgeShell(cmd, tool === 'PowerShell' ? 'ps' : 'sh', cwd0, 0);
        if (tool === 'PowerShell') checkCode(cmd, cwd0, 'ps');
      } else checkFileTool();
    }
  }
} catch (e) {
  if (e instanceof Refusal) deny({ ...rec, path: e.path }, e.why);
  log({ ...rec, decision: 'allow', note: 'guard error: ' + String(e && e.stack || e).slice(0, 300) });
}
process.exit(0);
