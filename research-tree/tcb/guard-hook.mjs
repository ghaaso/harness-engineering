// guard-hook.mjs (unit U3b): the pre-tool hook of the trusted base.
//
// Speaks the harness's PreToolUse hook protocol, not CONTRACT §1.3: exit 0 with an empty stdout is
// "no objection", exit 2 with one stderr line `[guard-hook] deny <code>: <detail>` is a deny. Every
// failure of its own (usage, unreadable files, an exception, its deadline) is a deny, because any
// other exit code lets the call through. It takes no lock and writes only through `hookCreate`: a
// strict exclusive create inside the time left until its deadline (CONTRACT §8.20, FIX-fence §0b).
// The steps that write: FX-CLAIM's session claim, FX-OUT's ready slot, and FX-CGATE's records (coord-session, start, close).
//
// Exports `decide(input, args, io)`; importing the module has no side effect (the library is loaded
// with a guarded dynamic import so that a broken lib.mjs is a deny, never a crash with exit 1).
//
//   node "<root>/tcb/guard-hook.mjs" --root <root> --role <role> [--task <id> --epoch <e>]
//
// Layout (this build): the scripts and lib.mjs sit flat in tcb/, so the coordinator's one Bash form
// is `node tcb/<name>.mjs ...` (cwd = root) or `node "<root>/tcb/<name>.mjs" ...`; a named script
// must exist beside this file (its siblings are found from import.meta.url, never a fixed folder).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const SELF_DIR = path.dirname(SELF);
const W = path.win32;

const TASK_ROLES = new Set(['child', 'child-reviewing', 'fresh-reviewer', 'control', 'stpa', 'fmea', 'mapper', 'canary']);
const PLAIN_ROLES = new Set(['coordinator', 'reader', 'checker']);
const TASK_RE = /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:$|\.))[a-z][a-z0-9-]{1,39}$/;
const EPOCH_RE = /^[1-9][0-9]{0,8}$/;
const ROLE_NAME_RE = /^[a-z][a-z-]{0,39}$/;
const BATCH_RE = /^b[1-9][0-9]*-[1-9][0-9]*$/;
const SHA_RE = /^[0-9a-f]{64}$/;
const SCRIPT_NAME_RE = /^[a-z][a-z-]*$/;
const PROFILE_KEYS = ['role', 'tools_allow', 'tools_deny', 'read_prefixes', 'write_prefixes', 'agent_types', 'fetch', 'bash'];
const STDIN_CAP = 32 * 1024 * 1024;
const FALLBACK_DEADLINE_MS = 5000;
// Always protected for writes, whatever the thresholds file lists (the spec names `.git/` explicitly).
const ALWAYS_PROTECTED = ['tcb/', 'sealed/', 'review-in/', '.claude/', 'run/', 'store/', '.git/'];

// Node sets import.meta.url to the realpath of the entry, so argv[1] is compared by its realpath too:
// started through a junction or a symlink the hook must still decide (a lexical compare would skip
// main() and exit 0, which the hook protocol reads as no objection).
const isMain = (() => {
  if (import.meta.main === true) return true;
  try {
    if (typeof process.argv[1] !== 'string') return false;
    const self = pathKey(SELF);
    if (pathKey(process.argv[1]) === self) return true;
    return pathKey(fs.realpathSync(path.resolve(process.argv[1]))) === self;
  } catch {
    return false;
  }
})();

let fallbackTimer = null;
if (isMain) {
  process.on('uncaughtException', (e) => emitDeny('internal', `uncaught: ${errText(e)}`));
  process.on('unhandledRejection', (e) => emitDeny('internal', `rejection: ${errText(e)}`));
  fallbackTimer = setTimeout(() => emitDeny('internal', 'deadline'), FALLBACK_DEADLINE_MS);
}

let lib = null;
let libError = null;
try {
  lib = await import('./lib.mjs');
} catch (e) {
  libError = e;
}

// ---------------------------------------------------------------------------------------------
// helpers

class Deny {
  constructor(code, detail) {
    this.code = code;
    this.detail = detail === undefined ? '' : String(detail);
  }
}

function errText(e) {
  if (e && typeof e === 'object') return `${e.code ? e.code + ' ' : ''}${e.message || ''}`.trim() || 'error';
  return String(e);
}

function isTcbError(e) {
  return !!e && typeof e === 'object' && typeof e.code === 'string' && Number.isInteger(e.exit);
}

function oneLine(s) {
  return String(s).replace(/[\r\n\t]+/g, ' ').slice(0, 400);
}

// A comparison key for a path: win32-resolved, backslashes, case-folded, no trailing separator.
function pathKey(p) {
  return W.resolve(String(p)).replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
}

function samePath(a, b) {
  return pathKey(a) === pathKey(b);
}

function underOrSame(p, folder) {
  return samePath(p, folder) || lib.isUnder(p, folder) === true;
}

function isAbsDrivePath(p) {
  return typeof p === 'string' && /^[A-Za-z]:[\\/]/.test(p) && !p.includes('\0');
}

// Resolve a path from a tool input as Win32 would, or null when it cannot be resolved safely:
// `~`, UNC and device paths (`\\server`, `\\?\`, `\\.\`), drive-relative and rooted-without-drive
// paths, alternate data streams, wildcard characters, 8.3 short-name segments (`CLAUDE~1`),
// a segment that is only dots and spaces, and `..` above the drive root.
function resolveToolPath(p, cwd) {
  if (typeof p !== 'string' || p === '' || p.includes('\0')) return null;
  if (p.startsWith('~')) return null;
  if (/^[\\/]{2}/.test(p)) return null;
  let full;
  if (/^[A-Za-z]:/.test(p)) {
    if (!/^[A-Za-z]:[\\/]/.test(p)) return null;
    full = p;
  } else if (/^[\\/]/.test(p)) {
    return null;
  } else {
    if (!isAbsDrivePath(cwd) || /^[\\/]{2}/.test(cwd)) return null;
    full = cwd.replace(/[\\/]+$/, '') + '\\' + p;
  }
  const rawRest = /^[A-Za-z]:/.test(p) ? p.slice(2) : p;
  for (const seg of rawRest.split(/[\\/]+/)) if (/~[0-9]/.test(seg)) return null;
  const body = full.slice(2);
  if (body.includes(':')) return null;
  if (/[<>|"?*]/.test(body)) return null;
  const drive = full.slice(0, 2).toUpperCase();
  const segs = [];
  for (const raw of body.split(/[\\/]+/)) {
    if (raw === '' || raw === '.') continue;
    if (raw === '..') {
      if (segs.length === 0) return null;
      segs.pop();
      continue;
    }
    const t = raw.replace(/[. ]+$/, '');
    if (t === '') return null;
    segs.push(t);
  }
  return drive + '\\' + segs.join('\\');
}

// A Glob `pattern` or Grep `glob` must be relative and hold no `..`.
function badPattern(v) {
  if (v === undefined || v === null) return false;
  if (typeof v !== 'string') return true;
  if (v.includes('\0')) return true;
  if (/^[A-Za-z]:/.test(v) || /^[\\/]/.test(v) || v.startsWith('~')) return true;
  // a `..` segment (Win32 also drops trailing dots and spaces, so `.. ` and `...` count too)
  if (v.split(/[\\/]+/).some((s) => s !== '' && /^\.\.[. ]*$/.test(s))) return true;
  return false;
}

function parseArgv(argv) {
  const out = {};
  const known = new Set(['root', 'role', 'task', 'epoch']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (typeof a !== 'string' || !a.startsWith('--')) throw new Deny('usage', `unexpected argument ${oneLine(a)}`);
    const name = a.slice(2);
    if (!known.has(name)) throw new Deny('usage', `unknown flag --${oneLine(name)}`);
    if (Object.prototype.hasOwnProperty.call(out, name)) throw new Deny('usage', `repeated flag --${name}`);
    const v = argv[i + 1];
    if (typeof v !== 'string' || v.startsWith('--')) throw new Deny('usage', `--${name} needs a value`);
    out[name] = v;
    i++;
  }
  return out;
}

function normalizeArgs(args) {
  const a = Array.isArray(args) ? parseArgv(args) : args && typeof args === 'object' ? args : null;
  if (!a) throw new Deny('usage', 'no arguments');
  const { root, role } = a;
  if (!isAbsDrivePath(root) || /^[\\/]{2}/.test(root)) throw new Deny('usage', '--root must be an absolute drive path');
  if (typeof role !== 'string' || !ROLE_NAME_RE.test(role)) throw new Deny('usage', '--role missing or malformed');
  const hasTask = a.task !== undefined && a.task !== null;
  const hasEpoch = a.epoch !== undefined && a.epoch !== null;
  if (TASK_ROLES.has(role)) {
    if (typeof a.task !== 'string' || !TASK_RE.test(a.task)) throw new Deny('usage', '--task missing or malformed');
    const e = typeof a.epoch === 'number' ? String(a.epoch) : a.epoch;
    if (typeof e !== 'string' || !EPOCH_RE.test(e)) throw new Deny('usage', '--epoch missing or malformed');
    return { root: W.resolve(root), role, task: a.task, epoch: Number(e) };
  }
  if (PLAIN_ROLES.has(role)) {
    if (hasTask || hasEpoch) throw new Deny('usage', `--task/--epoch not taken by role ${role}`);
    return { root: W.resolve(root), role, task: null, epoch: null };
  }
  throw new Deny('usage', `unknown role ${role}`);
}

function selfUnderWt(root, selfPath) {
  const wt = W.join(root, 'wt');
  if (pathKey(selfPath).startsWith(pathKey(wt) + '\\')) return true;
  if (lib) {
    try {
      return lib.isUnder(selfPath, wt) === true;
    } catch {
      return true; // cannot tell: fail safe
    }
  }
  return false;
}

function parseInput(input) {
  let v = input;
  if (Buffer.isBuffer(v)) v = v.toString('utf8');
  if (typeof v === 'string') {
    if (v.charCodeAt(0) === 0xfeff) v = v.slice(1);
    if (v.trim() === '') throw new Deny('bad-input', 'empty stdin');
    try {
      v = JSON.parse(v);
    } catch {
      throw new Deny('bad-input', 'stdin is not JSON');
    }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Deny('bad-input', 'input is not an object');
  if (typeof v.tool_name !== 'string' || v.tool_name === '') throw new Deny('bad-input', 'no tool_name');
  if (!HOOK_EVENTS.includes(v.hook_event_name)) throw new Deny('bad-input', `hook_event_name ${oneLine(v.hook_event_name)}`);
  return v;
}

function profileShapeError(v, role) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return 'not an object';
  for (const k of Object.keys(v)) {
    if (k === 'schema_version' || k === 'session_tools') continue; // session_tools: optional (FX-CGATE)
    if (!PROFILE_KEYS.includes(k)) return `extra field ${k}`;
  }
  if ('schema_version' in v && v.schema_version !== 1) return 'schema_version';
  for (const k of PROFILE_KEYS) if (!(k in v)) return `missing ${k}`;
  if (v.role !== role) return `role ${v.role} in file of ${role}`;
  for (const k of ['tools_allow', 'tools_deny', 'read_prefixes', 'write_prefixes', 'agent_types']) {
    if (!Array.isArray(v[k]) || v[k].some((s) => typeof s !== 'string' || s === '')) return `${k} not a string list`;
  }
  if (!['none', 'witnessed', 'any'].includes(v.fetch)) return 'fetch';
  if (!['none', 'tcb-node'].includes(v.bash)) return 'bash';
  for (const t of v.agent_types) if (!ROLE_NAME_RE.test(t)) return `agent type ${t}`;
  for (const p of [...v.read_prefixes, ...v.write_prefixes]) {
    const left = p.replace(/\{(root|attempt|batch)\}/g, '');
    if (/[{}]/.test(left)) return `placeholder in ${p}`;
    if (!/^\{(root|attempt)\}/.test(p)) return `prefix ${p} not anchored`;
  }
  return sessionToolsError(v, role);
}

function loadProfile(root, role, io) {
  const file = W.join(root, 'tcb', 'profiles', `${role}.json`);
  let v;
  try {
    v = io.readJson(file);
  } catch (e) {
    if (isTcbError(e)) {
      if (e.code === 'missing') throw new Deny('profile-missing', role);
      throw new Deny('profile-invalid', `${role}: ${e.code}`);
    }
    throw e;
  }
  const err = profileShapeError(v, role);
  if (err) throw new Deny('profile-invalid', `${role}: ${err}`);
  // the [profile] schema, when it is present in this copy of tcb/ (the shape check above always runs)
  if (io.exists(W.join(root, 'tcb', 'schemas', 'profile.schema.json'))) {
    try {
      const r = lib.checkFormat(root, 'profile', v);
      if (r && typeof r === 'object' && r.ok === false) throw new Deny('profile-invalid', `${role}: schema`);
    } catch (e) {
      if (e instanceof Deny) throw e;
      if (isTcbError(e)) throw new Deny('profile-invalid', `${role}: ${e.code}`);
      throw e;
    }
  }
  return v;
}

function toolListed(list, name) {
  return list.some((t) => (t.endsWith('*') ? name.startsWith(t.slice(0, -1)) : t === name));
}

// Render a prefix template for path p; null when it cannot apply (no attempt, no batch).
function renderPrefix(tmpl, ctx, p, io) {
  let s = tmpl.replace(/\{root\}/g, ctx.root);
  if (s.includes('{attempt}')) {
    if (!ctx.attempt) return null;
    s = s.replace(/\{attempt\}/g, ctx.attempt);
  }
  const i = s.indexOf('{batch}');
  if (i >= 0) {
    if (s.indexOf('{batch}', i + 1) >= 0) return null;
    const base = s.slice(0, i);
    const rel = W.relative(W.resolve(base), p);
    if (!rel || rel.startsWith('..') || W.isAbsolute(rel)) return null;
    const b = rel.split(/[\\/]/)[0];
    if (!BATCH_RE.test(b)) return null;
    if (!io.exists(W.join(base, b, 'batch.json'))) return null;
    s = s.slice(0, i) + b + s.slice(i + '{batch}'.length);
  }
  return s;
}

function matchesPrefix(p, tmpl, ctx, io) {
  const r = renderPrefix(tmpl, ctx, p, io);
  if (r === null) return false;
  if (/[\\/]$/.test(r)) return underOrSame(p, r.replace(/[\\/]+$/, ''));
  const dir = W.dirname(W.resolve(r));
  const name = W.basename(r).toLowerCase();
  if (!samePath(W.dirname(p), dir)) return false;
  if (!W.basename(p).toLowerCase().startsWith(name)) return false;
  return lib.isUnder(p, dir) === true;
}

// The Bash/PowerShell grammar for `bash: tcb-node`: `node`, one script path (`tcb/<n>.mjs` with cwd =
// root, or `<root>/tcb/<n>.mjs`, optionally double-quoted), then plain or double-quoted arguments.
function checkTcbNode(command, cwd, root, io) {
  if (typeof command !== 'string') return 'no command';
  // eslint-disable-next-line no-control-regex
  if (/[;&|<>$'(){}*?!%^@,`\x00-\x1f\x7f]/.test(command)) return 'shell metacharacter';
  const cmd = command.trim();
  const tokens = [];
  const re = /\s*(?:"([A-Za-z0-9_\-./:= \\]*)"|([A-Za-z0-9_\-./:=]+))(?=\s|$)/y;
  let pos = 0;
  while (pos < cmd.length) {
    re.lastIndex = pos;
    const m = re.exec(cmd);
    if (!m) return 'token';
    if (m[1] !== undefined && m[1].endsWith('\\')) return 'quoted string ends with a backslash';
    tokens.push({ text: m[1] !== undefined ? m[1] : m[2], quoted: m[1] !== undefined });
    pos = re.lastIndex;
  }
  if (tokens.length < 2) return 'too short';
  if (tokens[0].quoted || tokens[0].text !== 'node') return 'not node';
  const script = tokens[1].text;
  // `.`, `..` and any segment of only dots and spaces (Win32 strips trailing dots and spaces)
  if (script.split(/[\\/]/).some((s) => /^[. ]+$/.test(s) || /[. ]$/.test(s))) return 'dot segment';
  let name;
  const rel = /^tcb\/([^\\/]+)\.mjs$/.exec(script);
  if (rel) {
    if (!isAbsDrivePath(cwd) || !samePath(cwd, root)) return 'relative script outside root';
    name = rel[1];
  } else {
    const abs = /^(.+)[\\/]tcb[\\/]([^\\/]+)\.mjs$/.exec(script);
    if (!abs || !isAbsDrivePath(script)) return 'script path';
    if (!samePath(abs[1], root)) return 'script outside root';
    name = abs[2];
  }
  if (!SCRIPT_NAME_RE.test(name) || name === 'lib') return 'script name';
  // A sibling of this file (the trusted base in use), found from import.meta.url.
  if (!io.exists(W.join(SELF_DIR, `${name}.mjs`))) return 'no such script';
  return null;
}

// 0b(c): the time the hook's own work may still take. As a process the hook counts from its own
// start (performance.now() is the time since the process began) to `hook_deadline_ms`, which main()
// reads; in-process (an import: the tests) a call counts from its own start to the fallback deadline.
let processDeadlineMs = null;
function budgetClock(callStart) {
  if (processDeadlineMs !== null) {
    const d = processDeadlineMs;
    return () => d - performance.now();
  }
  return () => FALLBACK_DEADLINE_MS - (performance.now() - callStart);
}

function defaultIo(clock) {
  return {
    readJson: (p) => lib.readJson(p),
    readJsonl: (p) => lib.readJsonl(p),
    readTasks: (root) => lib.readTasks(root),
    exists: (p) => fs.existsSync(p),
    thresholds: (root) => lib.thresholds(root),
    create: (p, data, opts) => lib.createExclusive(p, data, opts),
    budgetMs: clock,
  };
}

// Pick each function by name: a caller's io may be a Proxy or a function whose keys do not spread.
function buildIo(io, callStart) {
  const base = defaultIo(budgetClock(callStart));
  const given = io !== null && (typeof io === 'object' || typeof io === 'function') ? io : null;
  const fullIo = {};
  for (const k of Object.keys(base)) {
    const f = given ? given[k] : undefined;
    fullIo[k] = typeof f === 'function' ? (...xs) => f.apply(given, xs) : base[k];
  }
  return fullIo;
}

// 0b: the hook's one way to write. A strict exclusive create (no fallback, no folder made) inside the
// time left until its deadline; never a lock, and the caller names a file no script writes. Returns
// 'created' | 'identical' | 'different' (another writer's bytes hold the name; the caller reads them).
// Every failure is a deny, and a denied write has made nothing at the name: `budget-spent` (the time
// ran out before or during the create), `no-parent`, `no-hardlink`, `write-failed` (any other error).
function hookCreate(io, file, data) {
  const left = io.budgetMs();
  if (typeof left !== 'number' || !(left > 0)) throw new Deny('budget-spent', `${file}: no time left`);
  let r;
  try {
    r = io.create(file, data, { strict: true, budget: left });
  } catch (e) {
    if (isTcbError(e)) {
      if (e.code === 'exists-different') return 'different';
      throw new Deny(e.code, `${file}: ${JSON.stringify(e.detail ?? null)}`);
    }
    throw new Deny('write-failed', `${file}: ${errText(e)}`);
  }
  if (r !== 'created' && r !== 'identical') throw new Deny('internal', `create gave ${oneLine(r)}`);
  return r;
}

// ---------------------------------------------------------------------------------------------
// the decision

function decideInner(input, args, io) {
  const a = normalizeArgs(args);
  const { root, role, task, epoch } = a;
  // step 1
  if (selfUnderWt(root, SELF)) throw new Deny('run-from-attempt', SELF);
  const hook = parseInput(input);
  const toolName = hook.tool_name;
  const toolInput = hook.tool_input && typeof hook.tool_input === 'object' && !Array.isArray(hook.tool_input) ? hook.tool_input : {};
  const cwd = hook.cwd;
  const attempt = TASK_ROLES.has(role) ? W.join(root, 'wt', `${task}-e${epoch}`) : null;

  // steps 2-3
  const folderProfile = loadProfile(root, role, io);
  let profile = folderProfile;
  const agentType = typeof hook.agent_type === 'string' ? hook.agent_type : '';
  if (hook.agent_type !== undefined && hook.agent_type !== null && typeof hook.agent_type !== 'string') {
    throw new Deny('bad-input', 'agent_type not a string');
  }
  if (agentType !== '') {
    if (!ROLE_NAME_RE.test(agentType) || !folderProfile.agent_types.includes(agentType)) {
      throw new Deny('helper-type', `${oneLine(agentType)} not a helper of ${role}`);
    }
    profile = loadProfile(root, agentType, io);
  }
  // the one context of the round-3 steps (S0.5): row is set at step 4, access at step 6
  const pass = { hook, root, role, task, epoch, attempt, toolName, toolInput, cwd, io, profile, row: null, access: null };
  if (hook.hook_event_name !== 'PreToolUse') return postToolUse(pass); // FX-CGATE step 6: steps 4-7 are PreToolUse's

  // step 4
  if (TASK_ROLES.has(role)) {
    let table;
    try {
      table = io.readTasks(root);
    } catch (e) {
      if (isTcbError(e)) throw new Deny('table-unreadable', e.code);
      throw e;
    }
    const rows = table && Array.isArray(table.tasks) ? table.tasks : null;
    if (!rows) throw new Deny('table-unreadable', 'no tasks array');
    const row = rows.find((r) => r && r.task === task);
    if (!row) throw new Deny('stale-epoch', `no row ${task}`);
    if (row.epoch !== epoch || row.state !== 'active' || !['admitted', 'started', 'bound'].includes(row.step)) {
      throw new Deny('stale-epoch', `${task} row epoch ${row.epoch} state ${row.state} step ${row.step}, hook epoch ${epoch}`);
    }
    pass.row = row;
    stepClaim(pass);
  }

  // step 5
  if (toolListed(profile.tools_deny, toolName)) throw new Deny('tool-denied', toolName);
  if (!toolListed(profile.tools_allow, toolName)) throw new Deny('tool-not-allowed', toolName);

  checkAccess(pass);

  // step 7 (round 3), after step 6 allowed the call
  if (TASK_ROLES.has(role)) {
    if (toolName === 'Write' || toolName === 'Edit') stepReadySlot(pass);
  } else if (role === 'coordinator') {
    coordinatorSteps(pass);
  }
}

// Step 6, the check by tool kind: a branch that allows returns, to decideInner's step 7.
function checkAccess(pass) {
  const { root, attempt, toolName, toolInput, cwd, io, profile } = pass;
  // step 6
  const access = lib.toolAccess(toolName, toolInput) || {};
  pass.access = access;
  const kind = access.kind;
  const ctx = { root, attempt };

  if (kind === 'read' || kind === 'write') {
    const raw = Array.isArray(access.paths) ? access.paths : [];
    if (raw.length === 0) throw new Deny('path-unresolvable', `${toolName}: no path`);
    if (toolName === 'Glob' && badPattern(toolInput.pattern)) throw new Deny('path-unresolvable', 'Glob pattern');
    if (toolName === 'Grep' && badPattern(toolInput.glob)) throw new Deny('path-unresolvable', 'Grep glob');
    const resolved = raw.map((p) => {
      const r = resolveToolPath(p, cwd);
      if (r === null) throw new Deny('path-unresolvable', oneLine(p));
      return r;
    });
    if (kind === 'read') {
      const sealed = W.join(root, 'sealed');
      const searches = toolName === 'Glob' || toolName === 'Grep';
      for (const p of resolved) {
        if (underOrSame(p, sealed) || (searches && lib.isUnder(sealed, p) === true)) throw new Deny('read-outside-role', `sealed: ${p}`);
        if (!profile.read_prefixes.some((t) => matchesPrefix(p, t, ctx, io))) throw new Deny('read-outside-role', p);
      }
    } else {
      let protectedList;
      try {
        protectedList = io.thresholds(root).get('tcb_paths_protected');
      } catch (e) {
        if (isTcbError(e) && e.code === 'param-missing') protectedList = [];
        else throw e;
      }
      if (!Array.isArray(protectedList) || protectedList.some((s) => typeof s !== 'string')) {
        throw new Deny('internal', 'tcb_paths_protected is not a string list');
      }
      const prot = [...new Set([...ALWAYS_PROTECTED, ...protectedList])];
      for (const p of resolved) {
        if (!lib.isUnder(p, root)) throw new Deny('write-outside-role', `outside root: ${p}`);
        const segs = p.slice(3).split('\\');
        if (segs.some((s) => lib.segmentName(s) === '.claude')) throw new Deny('write-claude', p);
        const last = lib.segmentName(segs[segs.length - 1] || '');
        if (last === 'claude.md' || last === 'claude.local.md') throw new Deny('write-claude', p);
        for (const rel of prot) {
          if (underOrSame(p, W.join(root, rel))) throw new Deny('write-protected', p);
        }
        if (attempt && underOrSame(p, W.join(attempt, 'staging', 'harvested'))) throw new Deny('write-protected', p);
        if (!profile.write_prefixes.some((t) => matchesPrefix(p, t, ctx, io))) throw new Deny('write-outside-role', p);
      }
    }
    return;
  }

  if (kind === 'fetch') {
    if (profile.fetch === 'any') return;
    if (profile.fetch !== 'witnessed') throw new Deny('fetch-none', toolName);
    const urls = Array.isArray(access.urls) ? access.urls : [];
    if (urls.length === 0) throw new Deny('fetch-not-witnessed', 'no url');
    if (!attempt) throw new Deny('fetch-not-witnessed', 'no attempt folder');
    let list;
    try {
      const mr = io.readJson(W.join(attempt, 'in', 'must_read.json'));
      list = mr && Array.isArray(mr.urls) ? mr.urls.map((u) => (u && typeof u.href === 'string' ? u.href : null)).filter(Boolean) : null;
    } catch (e) {
      if (isTcbError(e)) throw new Deny('fetch-not-witnessed', `must_read.json ${e.code}`);
      throw e;
    }
    if (!list) throw new Deny('fetch-not-witnessed', 'must_read.json has no urls');
    for (const u of urls) {
      let href;
      try {
        href = new URL(u).href;
      } catch {
        throw new Deny('fetch-not-witnessed', `bad url ${oneLine(u)}`);
      }
      if (!list.includes(href)) throw new Deny('fetch-not-witnessed', `not in must_read: ${oneLine(href)}`);
      const key = lib.urlKey(u);
      if (!SHA_RE.test(key)) throw new Deny('internal', 'urlKey');
      let records;
      try {
        const r = io.readJsonl(W.join(root, '.snapshots', 'by-url', `${key}.jsonl`));
        records = r && Array.isArray(r.records) ? r.records : [];
      } catch (e) {
        if (isTcbError(e)) throw new Deny('fetch-not-witnessed', `no snapshot record (${e.code})`);
        throw e;
      }
      let ok = false;
      for (const rec of records) {
        if (!rec || typeof rec.raw_sha !== 'string' || !SHA_RE.test(rec.raw_sha)) continue;
        try {
          const meta = io.readJson(W.join(root, '.snapshots', 'meta', `${rec.raw_sha}.json`));
          if (meta && typeof meta.text_sha === 'string' && meta.text_sha !== '') {
            ok = true;
            break;
          }
        } catch (e) {
          if (!isTcbError(e)) throw e;
        }
      }
      if (!ok) throw new Deny('fetch-not-witnessed', `no stored text for ${oneLine(href)}`);
    }
    return;
  }

  if (kind === 'search') return;

  if (kind === 'exec') {
    if (profile.bash !== 'tcb-node') throw new Deny('bash-refused', toolName);
    const why = checkTcbNode(access.command, cwd, root, io);
    if (why) throw new Deny('bash-pattern', why);
    stepAllowList(pass);
    return;
  }

  if (kind === 'agent') {
    const t = access.agentType;
    if (typeof t !== 'string' || t === '' || !profile.agent_types.includes(t)) throw new Deny('agent-type', oneLine(t === undefined ? '(absent)' : t));
    const why = helperRouteProblem(pass, t);
    if (why) throw new Deny('bad-route', why);
    return;
  }

  // any other kind: allowed by step 5 alone
}

// ---------------------------------------------------------------------------------------------
// the round-3 steps (S0.5; FIX-JOIN points 9 and 11, part 2b): each is empty until its fix fills it.
// A step denies by throwing Deny. A step that writes does so only through hookCreate (a strict
// create, 0b), after every read-only check of the call (point 9).

// FX-CLAIM step 1: the attempt's claim.json on every task-role call, after the epoch gate (step 4).
// No lock: the strict create (0b) is atomic. No claim yet -> create {kind:'session', session_id};
// created or identical -> go on. Another session's claim -> deny attempt-claimed; a tombstone (the
// fence cancelled the attempt) -> deny attempt-cancelled. A malformed session_id -> deny bad-input.
function stepClaim(pass) {
  const { io, attempt, task, epoch } = pass;
  // the session id's form: FX-CGATE's SESSION_ID_RE, a lowercase UUID (callerSession)
  const sid = callerSession(pass);
  if (!sid) throw new Deny('bad-input', 'session_id missing or not a UUID');
  const file = W.join(attempt, 'claim.json');
  const held = () => {
    let v;
    try {
      v = io.readJson(file);
    } catch (e) {
      if (isTcbError(e) && e.code === 'missing') return null;
      throw new Deny('claim-invalid', `${file}: ${errText(e)}`);
    }
    if (v && v.kind === 'tombstone') throw new Deny('attempt-cancelled', `${task} e${epoch}: the attempt was fenced before any session claimed it`);
    if (!v || v.kind !== 'session' || typeof v.session_id !== 'string') throw new Deny('claim-invalid', file);
    if (v.session_id !== sid) throw new Deny('attempt-claimed', `${task} e${epoch} is claimed by another session`);
    return v;
  };
  if (held()) return;
  const r = hookCreate(io, file, lib.claimRecord(sid));
  // 'different': another writer took the name first; its claim decides (a tombstone or another session denies)
  if (r === 'different' && !held()) throw new Deny('claim-invalid', file);
}

// FX-W1 step 5 (rev 4; FIX-wake.md FX-W1): the coordinator's production calls, per script, as forms
// [mode (null: none), required flags, other allowed flags], from each spec's "## Command line" with
// the round-3 forms added (handover bind --nonce, replace fence --if-unclaimed, watch --alarm
// --ensure --nonce, status --reconcile --arm-nonces, status --deadman). FX-W2: the alarm form needs
// --ensure and --nonce (watch.mjs refuses a bare --alarm; departure W1-2 closed). A script with no
// form (the hook itself) is refused.
const RC = ['root', 'ce'];
export const EXEC_FORMS = Object.freeze({
  admit: [['check', [], ['root', 'task']]],
  audit: [[null, [], [...RC, 'task', 'epoch', 'dry-run']], [null, ['coordinator'], [...RC, 'session', 'dry-run']]],
  certify: [[null, [], [...RC, 'task', 'epoch', 'dry-run']]],
  'check-queue': [[null, [], [...RC, 'mode', 'field', 'batch-size', 'classes', 'no-seeds', 'requeue', 'dry-run']]],
  commit: [['intake', [], [...RC, 'task', 'epoch', 'dry-run']], ['record', [], [...RC, 'task', 'epoch', 'step', 'dry-run']]],
  compare: [['anon', [], [...RC, 'dry-run']], ['score', [], [...RC, 'scorer-transcript', 'dry-run']]],
  cost: [
    ['compute', [], ['inputs', 'text']],
    ['predict', [], ['root', 'inputs', 'g', 'child-form', 's2', 'actual']],
    ['from-transcripts', [], [...RC, 'dry-run']],
  ],
  fsck: [[null, [], [...RC, 'dry-run']]],
  gate: [['cut', [], [...RC, 'design', 'dry-run']], ['check', [], [...RC, 'dry-run']]],
  handover: [
    ['init', [], ['root', 'tcb-commit', 'session', 'dry-run']],
    ['raise', [], [...RC, 'dry-run']],
    ['bind', [], [...RC, 'session', 'nonce', 'dry-run']],
  ],
  harvest: [[null, [], [...RC, 'task', 'epoch', 'dry-run']]],
  promote: [[null, [], [...RC, 'from', 'dry-run']], [null, [], [...RC, 'batch', 'transcript', 'dry-run']], ['revert', [], [...RC, 'class', 'dry-run']]],
  'protocol-freeze': [
    ['freeze', [], [...RC, 'file', 'dry-run']],
    ['plan', [], [...RC, 'file', 'dry-run']],
    ['amend', [], [...RC, 'file', 'reason-code', 'dry-run']],
  ],
  render: [[null, [], [...RC, 'dry-run']]],
  replace: [
    ['plan', [], [...RC, 'dry-run']],
    ['fence', [], [...RC, 'task', 'epoch', 'reason', 'if-unclaimed', 'dry-run']],
    ['start', [], [...RC, 'task', 'epoch', 'dry-run']],
    ['bind', [], [...RC, 'task', 'epoch', 'session', 'dry-run']],
  ],
  seed: [['plant', [], [...RC, 'task', 'k', 'dry-run']], ['score', [], [...RC, 'batch', 'transcript', 'dry-run']]],
  selftest: [
    ['run', [], [...RC, 'jobs', 'case-timeout-ms', 'only', 'keep-failed', 'dry-run']],
    ['canary', [], [...RC, 'transcript', 'expect', 'dry-run']],
  ],
  snap: [[null, [], [...RC, 'url', 'new', 'dry-run']]],
  status: [
    [null, [], [...RC, 'dry-run']],
    [null, ['reconcile'], [...RC, 'arm-nonces', 'dry-run']],
    [null, ['endturn'], [...RC, 'acked-seq', 'dry-run']],
    [null, ['deadman'], ['root']],
    ['intent', [], [...RC, 'key', 'subject', 'text-file']],
    ['owner', [], [...RC, 'act', 'subject', 'quote-file']],
    ['meter', [], [...RC, 'pct']],
  ],
  stop: [['request', [], [...RC, 'task', 'epoch', 'dry-run']], ['verify', [], [...RC, 'task', 'epoch', 'dry-run']]],
  tms: [[null, [], [...RC, 'target', 'dry-run']]],
  watch: [[null, [], [...RC]], [null, ['alarm', 'ensure', 'nonce'], [...RC]], [null, ['intake'], [...RC]]],
  witness: [[null, [], [...RC, 'card', 'dry-run']]],
});
// The test seams, refused for every script: the eight of FX-W1 step 5, and rng-seed and
// transcripts-root, which the specs also label test seams (departure W1-3).
export const TEST_SEAM_FLAGS = Object.freeze(['once', 'boot', 'tick', 'now', 'sleep-ms', 'interval-ms', 'free-mb', 'no-intake', 'rng-seed', 'transcripts-root']);

// The tokens of a command that passed checkTcbNode, by its own token rule (kept apart from it).
function execTokens(command) {
  const cmd = String(command).trim();
  const out = [];
  const re = /\s*(?:"([A-Za-z0-9_\-./:= \\]*)"|([A-Za-z0-9_\-./:=]+))(?=\s|$)/y;
  let pos = 0;
  while (pos < cmd.length) {
    re.lastIndex = pos;
    const m = re.exec(cmd);
    if (!m) return null;
    out.push(m[1] !== undefined ? m[1] : m[2]);
    pos = re.lastIndex;
  }
  return out;
}

// FX-W1: the exec allow list, after the tcb-node grammar check (step 6). The script is the file name
// of the second token, the mode the third token when it is not a flag, the flags the names (up to
// `=`) of every `--` token: the scripts' parser (lib.parseArgs) reads every `--` token as a flag.
// Allowed when one form of the script has that mode, all its required flags and no other flag.
function stepAllowList(pass) {
  const tokens = execTokens(pass.access.command);
  if (!tokens || tokens.length < 2) throw new Deny('bash-pattern', 'flag not allowed: no script');
  const script = tokens[1].split(/[\\/]/).pop().replace(/\.mjs$/, '');
  const mode = tokens.length > 2 && !tokens[2].startsWith('--') ? tokens[2] : null;
  const flags = tokens.filter((t) => t.startsWith('--')).map((t) => t.slice(2).split('=')[0]);
  const forms = Object.prototype.hasOwnProperty.call(EXEC_FORMS, script) ? EXEC_FORMS[script] : [];
  const has = (f, x) => f[1].includes(x) || f[2].includes(x);
  if (forms.some((f) => f[0] === mode && f[1].every((r) => flags.includes(r)) && flags.every((x) => has(f, x)))) return;
  const seam = flags.find((x) => TEST_SEAM_FLAGS.includes(x));
  const same = forms.filter((f) => f[0] === mode);
  const stray = flags.find((x) => !same.some((f) => has(f, x)));
  const near = same.find((f) => flags.every((x) => has(f, x)));
  let why;
  if (seam !== undefined) why = `--${seam}`;
  else if (!forms.length) why = '(no production form)';
  else if (!same.length) why = mode === null ? 'without a mode' : `mode ${mode}`;
  else if (stray !== undefined) why = `--${stray}`;
  else if (near) why = `without --${near[1].find((r) => !flags.includes(r))}`;
  else why = `${flags.map((x) => `--${x}`).join(' ')} together`;
  throw new Deny('bash-pattern', `flag not allowed: ${script} ${why}`);
}

// FX-OUT, child side (FIX-fence.md section 1, "Steps, child side" 2-4): a task role's Write of READY
// becomes a ready slot, outcome/<j>.json, by the hook's test-and-set on the log; READY.json itself is
// the copy the harness then writes, which no decision reads. Runs after the epoch gate (step 4), the
// claim and steps 5-6, so every read-only check of the call came first (FIX-JOIN point 9).
function stepReadySlot(pass) {
  const { root, attempt, task, epoch, row, toolName, toolInput, cwd, io, access } = pass;
  if (!attempt || !row) return;
  // 2: is the target READY? (the same path key as steps 3-6: case, `..`, trailing dots and spaces)
  const ready = pathKey(W.join(attempt, 'staging', 'READY.json'));
  const raw = access && Array.isArray(access.paths) ? access.paths : [];
  if (!raw.some((p) => { const r = resolveToolPath(p, cwd); return r !== null && pathKey(r) === ready; })) return;
  if (toolName !== 'Write') throw new Deny('ready-write-only', toolName);
  // 3: a valid READY of this task, epoch and one of its steps; a repair marker takes no slot
  let v;
  try {
    if (typeof toolInput.content !== 'string') throw new Error('content is not a string');
    v = JSON.parse(toolInput.content.replace(/^﻿/, ''));
    lib.checkFormat(root, 'ready', v);
  } catch (e) {
    throw new Deny('ready-invalid', isTcbError(e) ? e.code : errText(e));
  }
  if (v.task !== task || v.epoch !== epoch) throw new Deny('ready-invalid', `task ${oneLine(v.task)} epoch ${oneLine(v.epoch)}, hook ${task} e${epoch}`);
  if (v.kind === 'repair') return;
  const steps = Array.isArray(row.steps) ? row.steps : [];
  if (v.kind !== 'ready' || typeof v.step !== 'string' || !steps.includes(v.step)) throw new Deny('ready-invalid', `step ${oneLine(v.step)} not in ${steps.join(',')}`);
  // 4: the log; fenced -> deny; the same ready slot -> allow; else the first free slot (0b's create)
  let r;
  try {
    r = lib.outcomeAppend(attempt, { kind: 'ready', task, epoch, step: v.step }, { row, create: (file, bytes) => hookCreate(io, file, bytes) });
  } catch (e) {
    if (isTcbError(e)) throw new Deny(e.code, JSON.stringify(e.detail ?? null));
    throw e;
  }
  if (r.result === 'fenced') throw new Deny('attempt-fenced', `${task} e${epoch}: ${r.state.fenced}`);
}

// ---- FX-CGATE (FIX-fence 3): the names, the session tools and the helpers of steps 2-6 ----------
// A caller is named by the hook input's `session_id`, the CLI's id: a lowercase UUID (F-P1b). The app's
// session tools name a session by the app's own id, `local_<uuid>` (CGATE M1): a close record is named
// by that id only, so `self`, a CLI id or any other text is never a stop target (a CLI id given to the
// archive tool answers "not found" while the session lives). FX-CLAIM's stepClaim checks the same form.
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const APP_SESSION_ID_RE = /^local_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NONCE_RE = /^[0-9a-f]{32}$/;
// PostToolUse and PostToolUseFailure come only from the coordinator's settings, for the stop tools.
const HOOK_EVENTS = ['PreToolUse', 'PostToolUse', 'PostToolUseFailure'];
// The start tool's inputs that would start the session anywhere but the attempt folder (CGATE M4).
const START_ABSENT = ['host', 'preset', 'environment', 'repository', 'proposal_id', 'source_branch', 'branch_name'];

// A profile's optional `session_tools` {start, stop} (Q5a), the coordinator's only: exact tool names
// (a prefix would admit an ungated start), each in tools_allow, start and stop disjoint.
function sessionToolsError(v, role) {
  if (!('session_tools' in v)) return null;
  if (role !== 'coordinator') return `session_tools on role ${role}`;
  const st = v.session_tools;
  if (!st || typeof st !== 'object' || Array.isArray(st)) return 'session_tools not an object';
  for (const k of Object.keys(st)) if (k !== 'start' && k !== 'stop') return `session_tools extra field ${k}`;
  for (const k of ['start', 'stop']) {
    const list = st[k];
    if (!Array.isArray(list) || list.some((s) => typeof s !== 'string' || s === '' || s.endsWith('*'))) return `session_tools.${k} not a list of tool names`;
    for (const s of list) if (!v.tools_allow.includes(s)) return `session_tools.${k} ${s} not in tools_allow`;
  }
  if (st.start.some((s) => st.stop.includes(s))) return 'session_tools start and stop overlap';
  return null;
}

function isSessionTool(pass, kind) {
  const st = pass.profile && pass.profile.session_tools;
  return !!st && Array.isArray(st[kind]) && st[kind].includes(pass.toolName);
}

// The caller's session id, or null when the hook input holds none of the UUID form.
function callerSession(pass) {
  const s = pass.hook.session_id;
  return typeof s === 'string' && SESSION_ID_RE.test(s) ? s : null;
}

function toolUseId(pass) {
  const t = pass.hook.tool_use_id;
  return typeof t === 'string' && t !== '' ? t : null;
}

// run/coord.json, or null when it is unreadable or holds no valid ce.
function coordOf(pass) {
  try {
    const c = pass.io.readJson(lib.paths(pass.root).coord);
    return c && typeof c === 'object' && Number.isInteger(c.ce) && c.ce >= 1 ? c : null;
  } catch {
    return null;
  }
}

// The session id run/coord-session-<ce>.json names, or null (absent, unreadable, not a UUID).
function boundSession(pass, ce) {
  try {
    const v = pass.io.readJson(lib.paths(pass.root).coordSession(ce));
    return v && typeof v === 'object' && typeof v.session_id === 'string' && SESSION_ID_RE.test(v.session_id) ? v.session_id : null;
  } catch {
    return null;
  }
}

// True when the file holds a record of this kind for this session (FX-CGATE "Name validation").
function recordIs(pass, file, kind, session) {
  try {
    const v = pass.io.readJson(file);
    return !!v && typeof v === 'object' && v.kind === kind && v.session === session;
  } catch {
    return false;
  }
}

// The tokens of a command step 6 admitted (checkTcbNode's grammar), or null.
function commandTokens(command) {
  const cmd = String(command).trim();
  const re = /\s*(?:"([A-Za-z0-9_\-./:= \\]*)"|([A-Za-z0-9_\-./:=]+))(?=\s|$)/y;
  const out = [];
  let pos = 0;
  while (pos < cmd.length) {
    re.lastIndex = pos;
    const m = re.exec(cmd);
    if (!m) return null;
    out.push(m[1] !== undefined ? m[1] : m[2]);
    pos = re.lastIndex;
  }
  return out;
}

// The flags of the bind call, `node <root>/tcb/handover.mjs bind` and exactly the pairs --root R, --ce N
// and --nonce X in any order, or null for any other command.
function bindCall(pass) {
  const t = commandTokens(pass.access.command);
  if (!t || t.length !== 9 || t[0] !== 'node' || t[2] !== 'bind') return null;
  if (!/(?:^|[\\/])tcb[\\/]handover\.mjs$/.test(t[1])) return null;
  const flags = {};
  for (let i = 3; i < 9; i += 2) {
    if (!['--root', '--ce', '--nonce'].includes(t[i]) || Object.prototype.hasOwnProperty.call(flags, t[i])) return null;
    flags[t[i]] = t[i + 1];
  }
  return flags;
}

// True when a run/coord-session-<k>.json with k < ce names sid or cannot be read: a session bound at
// an earlier ce, or beside a file the hook cannot vouch for, never binds again.
function earlierBinding(pass, ce, sid) {
  let names;
  try {
    names = fs.readdirSync(W.join(pass.root, 'run'));
  } catch {
    return true;
  }
  for (const n of names) {
    const m = /^coord-session-([1-9][0-9]{0,8})\.json$/i.exec(n);
    if (!m || Number(m[1]) >= ce) continue;
    let v;
    try {
      v = pass.io.readJson(W.join(pass.root, 'run', n));
    } catch {
      return true;
    }
    if (!v || typeof v !== 'object' || typeof v.session_id !== 'string' || v.session_id === sid) return true;
  }
  return false;
}

// FX-CGATE step 2: the bind call (handover.mjs bind --ce --nonce) strict-creates run/coord-session-<ce>.json.
// It qualifies when its root is this root, its ce coord.json's, its nonce coord.json's successor_nonce,
// the caller's id a UUID that no earlier ce's session file names; it is then allowed (step 3 would refuse
// a caller not yet bound). A file at the name that names another session is bound-elsewhere. Every other
// exec call goes on to step 3.
function stepBind(pass) {
  if (!pass.access || pass.access.kind !== 'exec') return undefined;
  const f = bindCall(pass);
  const sid = callerSession(pass);
  const coord = f && sid ? coordOf(pass) : null;
  if (!coord) return undefined;
  if (!isAbsDrivePath(f['--root']) || !samePath(f['--root'], pass.root)) return undefined;
  if (f['--ce'] !== String(coord.ce)) return undefined;
  const nonce = coord.successor_nonce;
  if (typeof nonce !== 'string' || !NONCE_RE.test(nonce) || f['--nonce'] !== nonce) return undefined;
  if (earlierBinding(pass, coord.ce, sid)) return undefined;
  const r = hookCreate(pass.io, lib.paths(pass.root).coordSession(coord.ce), { session_id: sid });
  if (r === 'different') throw new Deny('bound-elsewhere', `run/coord-session-${coord.ce}.json names another session`);
  return 'allow';
}

// FX-CGATE step 3: a session other than coord-session-<current ce> may only Read under the read prefixes.
// The read kind (Read, Glob, Grep) passes, step 6 having checked its paths; any other call of a session
// that is not the one bound at coord.json's ce is stale-coordinator; an unreadable coord.json or session
// file leaves reads only.
function stepCurrentSession(pass) {
  if (pass.access && pass.access.kind === 'read') return;
  const sid = callerSession(pass);
  const coord = coordOf(pass);
  const bound = coord ? boundSession(pass, coord.ce) : null;
  if (sid !== null && bound !== null && sid === bound) return;
  throw new Deny('stale-coordinator', `session ${oneLine(String(pass.hook.session_id ?? '(none)'))} is not the one bound at ce ${coord ? coord.ce : '(unreadable)'}`);
}

// FX-W3: an act that creates work needs "armed". The hook gates the session-start tool (replace start
// and fence first are gated by the scripts' requireArmed): lib.armedState, the one file predicate
// withRunLock reads, at coord.json's ce, the ce stepCurrentSession found the caller bound at (never a
// ce from the input; FIX-JOIN part 2c). Read-only, before the row check and the start record (point
// 9), so a denied start writes no start.json. The stop tools and every other call are never gated.
function stepArmed(pass) {
  if (!isSessionTool(pass, 'start')) return;
  const coord = coordOf(pass);
  if (!coord) throw new Deny('not-armed', 'run/coord.json unreadable');
  const v = lib.armedState(pass.root, coord.ce, { readJson: pass.io.readJson, exists: pass.io.exists });
  if (!v.armed) {
    const { armed, why, ...rest } = v; // eslint-disable-line no-unused-vars
    throw new Deny('not-armed', `ce ${coord.ce}: ${why}${Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : ''}`);
  }
}

// FX-CGATE step 4, its read-only part: the session-start target's row is active/admitted at E.
// The target is the start tool's `cwd`, exactly <root>\wt\<T>-e<E>, in a fresh local session without a
// worktree, every input that would start it elsewhere absent (CGATE M4), else bad-target; the row is
// read without a lock.
function stepRowAtAdmitted(pass) {
  if (!isSessionTool(pass, 'start')) return;
  const target = startTarget(pass);
  let table;
  try {
    table = pass.io.readTasks(pass.root);
  } catch (e) {
    if (isTcbError(e)) throw new Deny('table-unreadable', e.code);
    throw e;
  }
  const rows = table && Array.isArray(table.tasks) ? table.tasks : null;
  if (!rows) throw new Deny('table-unreadable', 'no tasks array');
  const row = rows.find((r) => r && r.task === target.task);
  if (!row || row.epoch !== target.epoch || row.state !== 'active' || row.step !== 'admitted') {
    throw new Deny('wrong-step', row ? `${target.task} row epoch ${row.epoch} state ${row.state} step ${row.step}, start at e${target.epoch}` : `no row ${target.task}`);
  }
  const why = startRouteProblem(pass, row);
  if (why) throw new Deny('bad-route', why);
  pass.start = target;
}

// FX-PILOT unit PA: the start carries the row's route, read before the start record is written, so a
// start the tier hook beside this one would refuse leaves no start.json (the two hooks run side by
// side). The title begins with the kind of the row's tier and a colon, and the model is that kind's
// model in tcb/tier-routes.json. Without a readable table nothing is checked here: the tier hook then
// refuses every start itself (its routes file cannot be read).
function startRouteProblem(pass, row) {
  const routes = lib.tierRoutes(pass.root, pass.io.readJson);
  if (!routes) return null;
  const route = lib.routeOf(routes, row.tier);
  if (!route) return `row ${row.task} tier ${oneLine(JSON.stringify(row.tier ?? null))} is no kind of tcb/tier-routes.json`;
  const inp = pass.toolInput;
  const m = /^([a-z-]+)\s*:/i.exec(String(inp.title ?? '').trim());
  if (!m || m[1].toLowerCase() !== route.kind) return `title must begin with "${route.kind}:" (row ${row.task})`;
  if (lib.modelFamily(inp.model) !== route.model) return `model must be ${route.model} (row ${row.task}, kind ${route.kind}), not ${oneLine(JSON.stringify(inp.model ?? null))}`;
  return null;
}

// FX-PILOT unit PA2 (refute FX-PILOT-PA B1): a helper start carries its type's route, the check
// startRouteProblem runs for sessions. The tier hook beside this one checks only that the model fits
// the kind the description names; here the kind must be the route of the subagent_type
// (tier-routes.json `agents`) and the model that kind's model. A type with no route in a readable
// table is refused; without a readable table nothing is checked here (the tier hook refuses then).
function helperRouteProblem(pass, type) {
  const routes = lib.tierRoutes(pass.root, pass.io.readJson);
  if (!routes) return null;
  const route = lib.agentRouteOf(routes, type);
  if (!route) return `helper type ${oneLine(type)} has no route in tcb/tier-routes.json agents`;
  const inp = pass.toolInput;
  const m = /^([a-z-]+)\s*:/i.exec(String(inp.description ?? '').trim());
  if (!m || m[1].toLowerCase() !== route.kind) return `description must begin with "${route.kind}:" (helper ${oneLine(type)})`;
  if (lib.modelFamily(inp.model) !== route.model) return `model must be ${route.model} (helper ${oneLine(type)}, kind ${route.kind}), not ${oneLine(JSON.stringify(inp.model ?? null))}`;
  return null;
}

function startTarget(pass) {
  const inp = pass.toolInput;
  const bad = (why) => new Deny('bad-target', why);
  const p = isAbsDrivePath(inp.cwd) ? resolveToolPath(inp.cwd, null) : null;
  if (p === null) throw bad(`cwd ${oneLine(JSON.stringify(inp.cwd ?? null))} is not an absolute path`);
  const m = /^(.+)-e([1-9][0-9]{0,8})$/.exec(W.basename(p));
  if (!samePath(W.dirname(p), W.join(pass.root, 'wt')) || !m || !TASK_RE.test(m[1])) throw bad(`cwd ${oneLine(inp.cwd)} is not <root>/wt/<task>-e<epoch>`);
  if (inp.use_worktree !== false) throw bad('use_worktree must be false');
  if (inp.context !== undefined && inp.context !== 'fresh') throw bad('context must be fresh');
  if (inp.target !== undefined && inp.target !== 'local') throw bad('target must be local');
  for (const k of START_ABSENT) if (inp[k] !== undefined) throw bad(`${k} must be absent`);
  return { task: m[1], epoch: Number(m[2]) };
}

function watcherTick(pass) {
  try {
    const w = pass.io.readJson(lib.paths(pass.root).watcher);
    return w && Number.isInteger(w.ticks_total) ? w.ticks_total : null;
  } catch {
    return null;
  }
}

// FX-CGATE step 4: the session-start tool strict-creates wt/<T>-e<E>/start.json.
// One start per attempt: the record names the caller and the call's tool_use_id; the same call again
// (same session, same non-null tool_use_id) is allowed, any other start of the attempt is start-issued.
function stepStartRecord(pass) {
  if (!isSessionTool(pass, 'start')) return;
  const sid = callerSession(pass);
  if (!pass.start || !sid) throw new Deny('internal', 'start record without its target or caller');
  const tuid = toolUseId(pass);
  const { task, epoch } = pass.start;
  const file = lib.paths(pass.root).startRecord(task, epoch);
  const rec = { kind: 'start', session: sid, tool_use_id: tuid, tick: watcherTick(pass), at: new Date().toISOString() };
  if (hookCreate(pass.io, file, rec) !== 'different') return;
  let old = null;
  try {
    old = pass.io.readJson(file);
  } catch {
    old = null;
  }
  if (old && old.kind === 'start' && old.session === sid && tuid !== null && old.tool_use_id === tuid) return;
  throw new Deny('start-issued', `${task}-e${epoch}: start.json holds another start`);
}

function stopTarget(pass) {
  const t = pass.toolInput.session_id;
  if (typeof t !== 'string' || !APP_SESSION_ID_RE.test(t)) throw new Deny('bad-target', `session_id ${oneLine(JSON.stringify(t ?? null))} is not an app session id`);
  return t;
}

// FX-CGATE step 5: the session-stop tool strict-creates run/close/intent/<sid>.json.
// The target is the tool's session_id, an app id (M1), else bad-target with nothing written; a record at
// the name is a retried close when it is a close-intent of the same target, anything else record-tamper.
function stepStopIntent(pass) {
  if (!isSessionTool(pass, 'stop')) return;
  const t = stopTarget(pass);
  const sid = callerSession(pass);
  if (!sid) throw new Deny('internal', 'stop intent without its caller');
  const file = lib.paths(pass.root).closeIntent(t);
  const r = hookCreate(pass.io, file, { kind: 'close-intent', session: t, by: sid, tool_use_id: toolUseId(pass) });
  if (r === 'different' && !recordIs(pass, file, 'close-intent', t)) throw new Deny('record-tamper', file);
}

// The text of a tool's result: tool_response as a string, or the joined `text` of a content array or
// of {content}; PostToolUseFailure's `error`.
function postText(hook) {
  const parts = [];
  const add = (v, depth) => {
    if (typeof v === 'string') parts.push(v);
    else if (depth > 2 || !v || typeof v !== 'object') return;
    else if (Array.isArray(v)) for (const x of v) add(x, depth + 1);
    else if (typeof v.text === 'string') parts.push(v.text);
    else if (v.content !== undefined) add(v.content, depth + 1);
  };
  add(hook.tool_response, 0);
  add(hook.error, 0);
  return parts.join('\n');
}

// The close's outcome for target t from the result text (CGATE M2), or null: write nothing.
// FX-CLOSE anchors it (refute/CGATE.md item 3): `stopped` only from the archive tool, whose answer
// begins `Archived session <t>` or is exactly `Session <t> is already archived.`; `no-such-session`
// only when the whole answer is `Session <t> not found.`. A sentence quoted inside another answer (a
// session's title in stop_session's) or wrapped in more text writes nothing: the owner's `closed`.
const ARCHIVE_TOOL = 'mcp__ccd_session_mgmt__archive_session';
function closeOutcome(text, t, archive) {
  const s = text.trim();
  const head = `Archived session ${t}`;
  if (archive && s.startsWith(head) && (s.startsWith(' (', head.length) || s.startsWith('.', head.length))) return 'stopped';
  if (archive && s === `Session ${t} is already archived.`) return 'stopped';
  if (s === `Session ${t} not found.`) return 'no-such-session';
  return null;
}

// FX-CGATE step 6: PostToolUse and PostToolUseFailure of the session-stop tools. Archived, or already
// archived, is `stopped` (the session's process is gone); not found is `no-such-session`; any other
// text (stop_session's interrupt, an archive deferred to a later turn) writes nothing, and the close
// falls back to the owner's `closed`. A Post event of another role or tool is bad-input.
function postToolUse(pass) {
  const { hook, role, toolName } = pass;
  if (role !== 'coordinator' || !isSessionTool(pass, 'stop')) throw new Deny('bad-input', `${hook.hook_event_name} of ${role} ${oneLine(toolName)}`);
  const t = stopTarget(pass);
  const outcome = closeOutcome(postText(hook), t, toolName === ARCHIVE_TOOL);
  if (outcome === null) return;
  const sid = callerSession(pass);
  if (!sid) throw new Deny('bad-input', 'session_id is not a UUID');
  const file = lib.paths(pass.root).closeDone(t);
  const r = hookCreate(pass.io, file, { kind: 'close-done', session: t, outcome, by: sid });
  if (r === 'different' && !recordIs(pass, file, 'close-done', t)) throw new Deny('record-tamper', file);
}

// The coordinator's steps in their order (FIX-JOIN point 9, part 2b): the read-only checks, then the
// one strict create of the call. A step returns 'allow' to end the steps (the bind call), throws
// Deny to deny, or returns nothing to go on.
const COORDINATOR_STEPS = [stepBind, stepCurrentSession, stepArmed, stepRowAtAdmitted, stepStartRecord, stepStopIntent];

function coordinatorSteps(pass) {
  for (const step of COORDINATOR_STEPS) if (step(pass) === 'allow') return;
}

/**
 * Decide one hook call.
 * @param input the hook's stdin: the parsed object, or its raw text / Buffer
 * @param args {root, role, task?, epoch?} or the argv array (`--root ... --role ...`)
 * @param io optional {readJson, readJsonl, readTasks, exists, thresholds, create, budgetMs}; missing ones default to lib
 *   and to the hook's clock (0b)
 * @returns {{allow: boolean, decision: 'allow'|'deny', exit: 0|2, code: string|null, detail: string}}
 */
export function decide(input, args, io) {
  const callStart = performance.now();
  try {
    if (!lib) throw new Deny('internal', `lib.mjs not loaded: ${errText(libError)}`);
    decideInner(input, args, buildIo(io, callStart));
    return { allow: true, decision: 'allow', exit: 0, code: null, detail: '' };
  } catch (e) {
    const d = e instanceof Deny ? e : new Deny('internal', errText(e));
    return { allow: false, decision: 'deny', exit: 2, code: d.code, detail: oneLine(d.detail) };
  }
}

/**
 * The hook's write (0b) of one file outside a decision, so that a test can drive it: the steps that
 * write call `hookCreate` inside decide(). `io` as in decide(). Returns decide()'s shape plus
 * `result` ('created' | 'identical' | 'different', null on a deny).
 */
export function hookWrite(file, data, io) {
  const callStart = performance.now();
  try {
    if (!lib) throw new Deny('internal', `lib.mjs not loaded: ${errText(libError)}`);
    const result = hookCreate(buildIo(io, callStart), file, data);
    return { allow: true, decision: 'allow', exit: 0, code: null, detail: '', result };
  } catch (e) {
    const d = e instanceof Deny ? e : new Deny('internal', errText(e));
    return { allow: false, decision: 'deny', exit: 2, code: d.code, detail: oneLine(d.detail), result: null };
  }
}

// ---------------------------------------------------------------------------------------------
// the process

let emitted = false;
function emitDeny(code, detail) {
  if (emitted) return;
  emitted = true;
  try {
    fs.writeSync(2, `[guard-hook] deny ${code}: ${oneLine(detail)}\n`);
  } catch {
    // nothing more can be said
  }
  process.exit(2);
}

function emitAllow() {
  if (emitted) return;
  emitted = true;
  process.exit(0);
}

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    let n = 0;
    process.stdin.on('data', (c) => {
      n += c.length;
      if (n > STDIN_CAP) {
        emitDeny('bad-input', 'stdin over 32 MiB');
        return;
      }
      chunks.push(c);
    });
    process.stdin.on('end', () => resolve(Buffer.concat(chunks)));
    process.stdin.on('error', (e) => emitDeny('bad-input', `stdin: ${errText(e)}`));
  });
}

async function main() {
  const argv = process.argv.slice(2);
  // step 1: the run-from-attempt check comes first, before anything else is read
  const ri = argv.indexOf('--root');
  const rootGuess = ri >= 0 ? argv[ri + 1] : undefined;
  if (isAbsDrivePath(rootGuess) && selfUnderWt(W.resolve(rootGuess), SELF)) return emitDeny('run-from-attempt', SELF);
  let args;
  try {
    args = normalizeArgs(parseArgv(argv));
  } catch (e) {
    if (e instanceof Deny) return emitDeny(e.code, e.detail);
    throw e;
  }
  if (!lib) return emitDeny('internal', `lib.mjs not loaded: ${errText(libError)}`);
  let deadline;
  try {
    deadline = lib.thresholds(args.root).get('hook_deadline_ms');
  } catch (e) {
    if (isTcbError(e) && e.code === 'param-missing') deadline = FALLBACK_DEADLINE_MS;
    else return emitDeny('internal', `thresholds: ${errText(e)}`);
  }
  if (typeof deadline !== 'number' || !Number.isFinite(deadline) || deadline <= 0) return emitDeny('internal', 'hook_deadline_ms');
  processDeadlineMs = deadline; // 0b(c): a write's budget counts from the process's start
  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => emitDeny('internal', 'deadline'), Math.min(deadline, 2 ** 31 - 1));
  const raw = await readStdin();
  if (emitted) return;
  const r = decide(raw, args);
  if (r.allow) return emitAllow();
  return emitDeny(r.code, r.detail);
}

if (isMain) {
  main().catch((e) => emitDeny('internal', errText(e)));
}
