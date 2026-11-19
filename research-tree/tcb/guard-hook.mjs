// guard-hook.mjs (unit U3b): the pre-tool hook of the trusted base.
//
// Speaks the harness's PreToolUse hook protocol, not CONTRACT §1.3: exit 0 with an empty stdout is
// "no objection", exit 2 with one stderr line `[guard-hook] deny <code>: <detail>` is a deny. Every
// failure of its own (usage, unreadable files, an exception, its deadline) is a deny, because any
// other exit code lets the call through. It takes no lock and writes only through `hookCreate`: a
// strict exclusive create inside the time left until its deadline (CONTRACT §8.20, FIX-fence §0b).
// No step writes yet: the writes come with FX-OUT, FX-CLAIM and FX-CGATE.
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
  if (v.hook_event_name !== 'PreToolUse') throw new Deny('bad-input', `hook_event_name ${oneLine(v.hook_event_name)}`);
  return v;
}

function profileShapeError(v, role) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return 'not an object';
  for (const k of Object.keys(v)) {
    if (k === 'schema_version') continue;
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
  return null;
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
    return;
  }

  // any other kind: allowed by step 5 alone
}

// ---------------------------------------------------------------------------------------------
// the round-3 steps (S0.5; FIX-JOIN points 9 and 11, part 2b): each is empty until its fix fills it.
// A step denies by throwing Deny. A step that writes does so only through hookCreate (a strict
// create, 0b), after every read-only check of the call (point 9).

// FX-CLAIM step 1: the attempt's claim.json on every task-role call, after the epoch gate (step 4).
function stepClaim(pass) { // eslint-disable-line no-unused-vars
}

// FX-W1: the exec allow list, after the tcb-node grammar check (step 6).
function stepAllowList(pass) { // eslint-disable-line no-unused-vars
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

// FX-CGATE step 2: the bind call (handover.mjs bind --ce --nonce) strict-creates run/coord-session-<ce>.json.
function stepBind(pass) { // eslint-disable-line no-unused-vars
}

// FX-CGATE step 3: a session other than coord-session-<current ce> may only Read under the read prefixes.
function stepCurrentSession(pass) { // eslint-disable-line no-unused-vars
}

// FX-W3: an act that creates work (session start, replace start, fence first) needs "armed".
function stepArmed(pass) { // eslint-disable-line no-unused-vars
}

// FX-CGATE step 4, its read-only part: the session-start target's row is active/admitted at E.
function stepRowAtAdmitted(pass) { // eslint-disable-line no-unused-vars
}

// FX-CGATE step 4: the session-start tool strict-creates wt/<T>-e<E>/start.json.
function stepStartRecord(pass) { // eslint-disable-line no-unused-vars
}

// FX-CGATE step 5: the session-stop tool strict-creates run/close/intent/<sid>.json.
function stepStopIntent(pass) { // eslint-disable-line no-unused-vars
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
