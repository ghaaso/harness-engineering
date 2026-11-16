// selftest.mjs (unit U3b): R41. Every trusted script on its known-good and known-bad fixtures, for
// the exact tcb/ tree in use; and `canary`, which reads from a canary session's transcripts whether
// each forbidden call was refused (hooks and user-level denies).
//
//   node <root>/tcb/selftest.mjs run --root <dir> --ce <n> [--jobs <n>] [--case-timeout-ms <n>]
//        [--only <script>]... [--keep-failed] [--now <iso>] [--dry-run]
//   node <root>/tcb/selftest.mjs canary --root <dir> --ce <n> --transcript <path> --expect <file>
//        [--now <iso>] [--dry-run]
//
// Layout (this build): the 24 scripts and lib.mjs sit flat in tcb/ (`<root>/tcb/<name>.mjs`).
//
// No bursts (redesign of 2026-11-17, after a run of the first design wrote 1,275 script files in one
// second and the PC stalled):
//   - no copy of the script folder at all: every case runs the script where it is,
//     `<root>/tcb/<script>.mjs`, against its own small case root whose `tcb/` holds data files only
//     (schemas, profiles, settings, agents, briefs, thresholds with the case's overrides, cost
//     inputs, denylist, README);
//   - a case root is prepared only when its case is about to run, and removed as soon as it is judged
//     (unless --keep-failed keeps a failing one);
//   - one case at a time by default (--jobs 1), never more than two (--jobs 2);
//   - after every case, `treeSha(<root>/tcb/)` must still equal t0; a change stops the run
//     (`not_run`, `tcb-changed`), and no later case starts;
//   - every process a case starts is ended before the next case starts: the case child has exited
//     and its pipes have closed (a pipe still open after the exit means a descendant is alive:
//     the run stops, `case-left-process`); a timed-out child is ended through lib.killOwnTree and
//     awaited (a child that outlives its kill stops the run, `case-not-ended`);
//   - no case may start a watcher, an alarm or a detached intake: a `watch` case must carry `--once`
//     and `--no-intake` (static check `watch-case-loops`); status and handover have one-shot modes
//     only.
//
// Kills only its own timed-out case children, through lib.killOwnTree (CONTRACT §6).

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';

const SCRIPT = 'selftest';

// CONTRACT §5: the 24 scripts.
const SCRIPTS = [
  'replace', 'admit', 'stop', 'watch', 'status', 'handover', 'commit', 'harvest', 'fsck', 'tms',
  'promote', 'certify', 'snap', 'witness', 'guard-hook', 'selftest', 'render', 'audit', 'seed',
  'check-queue', 'protocol-freeze', 'compare', 'gate', 'cost',
];
// Where the scripts sit: flat in tcb/ (this build's layout), beside lib.mjs.
const scriptFile = (tcbDir, name) => path.join(tcbDir, `${name}.mjs`);
// What a case root's tcb/ holds: data files only, never a script, never fixtures/ or test/. The
// scripts themselves run from the live tcb/ (`scriptFile(<root>/tcb, name)`).
const COPY_DIRS = ['schemas', 'profiles', 'settings', 'agents', 'briefs'];
const COPY_FILES = ['thresholds.json', 'cost-inputs.json', 'denylist.txt', 'README.md'];
const DEFAULT_JOBS = 1;
const MAX_JOBS = 2;
// How long the pipes of a case child may stay open after its exit before the run counts a
// descendant of that child as still alive.
const CLOSE_GRACE_MS = 3000;

const TASK_ROLES = ['child', 'child-reviewing', 'fresh-reviewer', 'control', 'stpa', 'fmea', 'mapper', 'canary'];
const PROFILE_ROLES = [...TASK_ROLES, 'coordinator', 'reader', 'checker'];
const PROFILE_KEYS = ['role', 'tools_allow', 'tools_deny', 'read_prefixes', 'write_prefixes', 'agent_types', 'fetch', 'bash'];
const AGENT_TOOLS = { reader: ['WebSearch', 'WebFetch'], checker: ['Read'] };
const USER_DENY_DIRS = ['tcb', 'run', 'store', 'sealed', 'review-in', 'wt/*/.claude'];

// Contract defaults, used only when thresholds.json lacks the name (param-missing).
const DEFAULTS = {
  selftest_case_ms: 60000,
  lock_retries: 300,
  proc_exe: 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
};

const OUT_CAP = 8 * 1024 * 1024;
const GIVE_UP_MS = 30000;
const HEX64 = /^[0-9a-f]{64}$/;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const CASE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const ARG_SPEC = {
  modes: ['run', 'canary'],
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    jobs: { type: 'int' },
    'case-timeout-ms': { type: 'int' },
    only: { type: 'list' },
    'keep-failed': { type: 'bool' },
    now: { type: 'string' },
    'free-mb': { type: 'int' },
    boot: { type: 'string' },
    'dry-run': { type: 'bool' },
    transcript: { type: 'string', required: ['canary'] },
    expect: { type: 'string', required: ['canary'] },
  },
};

// ---------------------------------------------------------------------------------------------
// small helpers

function flagOf(flags, name) {
  if (flags[name] !== undefined) return flags[name];
  const camel = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return flags[camel];
}

function usage(detail) {
  return { exit: 66, reasons: [{ code: 'usage', detail }], result: {} };
}

function thGet(th, name) {
  try {
    return th.get(name);
  } catch (e) {
    if (e && e.code === 'param-missing' && name in DEFAULTS) {
      process.stderr.write(`selftest: threshold ${name} missing, using the contract default ${JSON.stringify(DEFAULTS[name])}\n`);
      return DEFAULTS[name];
    }
    throw e;
  }
}

function isoOf(now) {
  if (typeof now === 'string') return now;
  if (now instanceof Date) return now.toISOString();
  if (typeof now === 'number') return new Date(now).toISOString();
  return null;
}

function pathOf(root, key, ...fallback) {
  try {
    const p = lib.paths(root);
    if (p && typeof p[key] === 'string') return p[key];
  } catch {
    // fall through to the spelled path
  }
  return path.join(root, ...fallback);
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
}

function safeRel(p) {
  if (typeof p !== 'string' || p === '' || p.includes('\0') || p.includes(':')) return false;
  if (/^[\\/]/.test(p) || path.isAbsolute(p)) return false;
  return !p.split(/[\\/]/).some((s) => s === '..');
}

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  } catch {
    return [];
  }
}

function listFiles(dir, suffix) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile() && d.name.endsWith(suffix)).map((d) => d.name).sort();
  } catch {
    return [];
  }
}

function toolListed(list, name) {
  return list.some((t) => (t.endsWith('*') ? name.startsWith(t.slice(0, -1)) : t === name));
}

function isSubset(exp, act) {
  if (isPlainObject(exp)) {
    if (!isPlainObject(act)) return false;
    return Object.keys(exp).every((k) => Object.prototype.hasOwnProperty.call(act, k) && isSubset(exp[k], act[k]));
  }
  if (Array.isArray(exp)) {
    if (!Array.isArray(act) || act.length !== exp.length) return false;
    return exp.every((v, i) => isSubset(v, act[i]));
  }
  return exp === act || (Number.isNaN(exp) && Number.isNaN(act));
}

function exitSlugs() {
  const m = new Map();
  if (lib.EXIT && typeof lib.EXIT === 'object') for (const [slug, code] of Object.entries(lib.EXIT)) if (!m.has(code)) m.set(code, slug);
  return m;
}

// At most n (1 or 2) items in flight. A worker takes its next item only after its previous one has
// fully ended, and none takes another once stop() says so. Results of items never started are absent.
async function pool(items, n, fn, stop) {
  const out = [];
  let next = 0;
  const width = Math.max(1, Math.min(n, MAX_JOBS, items.length));
  const workers = Array.from({ length: width }, async () => {
    while (next < items.length && !stop()) {
      const k = next++;
      out.push(await fn(items[k], k));
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------------------------------------------------------------------------------------------
// fixture cases

function caseProblem(spec, script, caseDir) {
  if (!isPlainObject(spec)) return 'not an object';
  const top = ['schema_version', 'script', 'kind', 'fault_class', 'args', 'stdin', 'serve', 'thresholds', 'expect'];
  for (const k of Object.keys(spec)) if (!top.includes(k)) return `extra field ${k}`;
  if (spec.schema_version !== 1) return 'schema_version';
  if (spec.script !== script) return `script ${spec.script} in the folder of ${script}`;
  if (spec.kind !== 'good' && spec.kind !== 'bad') return 'kind';
  if (typeof spec.fault_class !== 'string' || !SLUG.test(spec.fault_class)) return 'fault_class';
  if (!Array.isArray(spec.args) || spec.args.some((a) => typeof a !== 'string')) return 'args';
  if ('stdin' in spec) {
    if (!safeRel(spec.stdin)) return 'stdin path';
    if (!fs.existsSync(path.join(caseDir, spec.stdin))) return 'stdin file missing';
  }
  if ('serve' in spec) {
    if (!isPlainObject(spec.serve)) return 'serve';
    for (const [k, v] of Object.entries(spec.serve)) {
      if (!/^\/[^\s?#]*$/.test(k)) return `serve path ${k}`;
      if (!safeRel(v)) return `serve file ${v}`;
      if (!fs.existsSync(path.join(caseDir, v))) return `serve file missing ${v}`;
    }
  }
  if (spec.args.some((a) => a.includes('{server}')) && !('serve' in spec)) return '{server} without serve';
  if ('thresholds' in spec && !isPlainObject(spec.thresholds)) return 'thresholds';
  const ex = spec.expect;
  if (!isPlainObject(ex)) return 'expect';
  const exKeys = ['exit', 'code', 'result', 'stdout_empty', 'stderr_prefix', 'files'];
  for (const k of Object.keys(ex)) if (!exKeys.includes(k)) return `expect: extra field ${k}`;
  if (!Number.isInteger(ex.exit) || ex.exit < 0 || ex.exit > 255) return 'expect.exit';
  if (spec.kind === 'good' && ex.exit !== 0) return 'a good case expects exit 0';
  if (spec.kind === 'bad' && ex.exit === 0) return 'a bad case expects a non-zero exit';
  if ('code' in ex && (typeof ex.code !== 'string' || ex.code === '')) return 'expect.code';
  if ('result' in ex && !isPlainObject(ex.result)) return 'expect.result';
  if ('stdout_empty' in ex && typeof ex.stdout_empty !== 'boolean') return 'expect.stdout_empty';
  if ('stderr_prefix' in ex && typeof ex.stderr_prefix !== 'string') return 'expect.stderr_prefix';
  if ('files' in ex) {
    if (!isPlainObject(ex.files)) return 'expect.files';
    for (const [k, v] of Object.entries(ex.files)) {
      if (!safeRel(k)) return `expect.files path ${k}`;
      if (v !== 'absent' && v !== 'present' && !(typeof v === 'string' && HEX64.test(v))) return `expect.files value of ${k}`;
    }
  }
  if (ex.stdout_empty === true && ('code' in ex || 'result' in ex)) return 'stdout_empty with code or result';
  return null;
}

function collectCases(root) {
  const fixtures = path.join(root, 'tcb', 'fixtures');
  const schemaFile = path.join(root, 'tcb', 'schemas', 'fixture-case.schema.json');
  const useSchema = fs.existsSync(schemaFile);
  const cases = [];
  for (const script of listDirs(fixtures)) {
    if (!SCRIPTS.includes(script)) continue;
    for (const name of listDirs(path.join(fixtures, script))) {
      const dir = path.join(fixtures, script, name);
      const file = path.join(dir, 'case.json');
      if (!fs.existsSync(file)) continue;
      let spec = null;
      let problem = null;
      if (!CASE_NAME.test(name)) problem = 'case folder name';
      else {
        try {
          spec = lib.readJson(file);
          problem = caseProblem(spec, script, dir);
          if (!problem && useSchema) {
            try {
              const r = lib.checkFormat(root, 'fixture-case', spec);
              if (r && typeof r === 'object' && r.ok === false) problem = 'schema';
            } catch (e) {
              problem = `schema: ${e && e.code ? e.code : e}`;
            }
          }
        } catch (e) {
          problem = `unreadable: ${e && e.code ? e.code : e}`;
        }
      }
      cases.push({ script, case: name, dir, spec, problem });
    }
  }
  cases.sort((a, b) => (a.script < b.script ? -1 : a.script > b.script ? 1 : a.case < b.case ? -1 : a.case > b.case ? 1 : 0));
  cases.forEach((c, i) => {
    c.n = i;
  });
  return cases;
}

// A watch case runs one tick and starts nothing: `--once` with `--no-intake` (without it, --once may
// spawn the detached intake), never the default loop, `--alarm` (a real alarm) or `--intake`.
function watchBounded(args) {
  return args.includes('--once') && args.includes('--no-intake') && !args.includes('--alarm') && !args.includes('--intake');
}

// ---------------------------------------------------------------------------------------------
// role files (guard-hook spec T14; selftest keeps its own copy: no script imports another)

function profileShapeError(v, role) {
  if (!isPlainObject(v)) return 'not an object';
  for (const k of Object.keys(v)) if (k !== 'schema_version' && !PROFILE_KEYS.includes(k)) return `extra field ${k}`;
  if ('schema_version' in v && v.schema_version !== 1) return 'schema_version';
  for (const k of PROFILE_KEYS) if (!(k in v)) return `missing ${k}`;
  if (v.role !== role) return `role ${v.role}`;
  for (const k of ['tools_allow', 'tools_deny', 'read_prefixes', 'write_prefixes', 'agent_types']) {
    if (!Array.isArray(v[k]) || v[k].some((s) => typeof s !== 'string' || s === '')) return `${k} not a string list`;
  }
  if (!['none', 'witnessed', 'any'].includes(v.fetch)) return 'fetch';
  if (!['none', 'tcb-node'].includes(v.bash)) return 'bash';
  for (const p of [...v.read_prefixes, ...v.write_prefixes]) {
    if (/[{}]/.test(p.replace(/\{(root|attempt|batch)\}/g, ''))) return `placeholder in ${p}`;
    if (!/^\{(root|attempt)\}/.test(p)) return `prefix ${p} not anchored`;
  }
  return null;
}

function parseAgentFile(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const i = line.indexOf(':');
    if (i < 0) return null;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fm, body: text.slice(m[0].length) };
}

function roleFilesProblems(root) {
  const probs = [];
  const tcb = path.join(root, 'tcb');
  const profiles = {};
  const profDir = path.join(tcb, 'profiles');
  for (const f of listFiles(profDir, '.json')) {
    const role = f.slice(0, -5);
    try {
      const v = lib.readJson(path.join(profDir, f));
      const err = profileShapeError(v, role);
      if (err) {
        probs.push(`profiles/${f}: ${err}`);
        continue;
      }
      if (fs.existsSync(path.join(tcb, 'schemas', 'profile.schema.json'))) {
        try {
          const r = lib.checkFormat(root, 'profile', v);
          if (r && typeof r === 'object' && r.ok === false) {
            probs.push(`profiles/${f}: schema`);
            continue;
          }
        } catch (e) {
          probs.push(`profiles/${f}: ${e && e.code ? e.code : e}`);
          continue;
        }
      }
      profiles[role] = v;
    } catch (e) {
      probs.push(`profiles/${f}: ${e && e.code ? e.code : e}`);
    }
  }
  for (const r of PROFILE_ROLES) if (!profiles[r] && !probs.some((p) => p.startsWith(`profiles/${r}.json`))) probs.push(`profiles/${r}.json missing`);

  // settings: substitute the placeholders as a JSON-safe text substitution, then parse
  const T = {
    root: 'C:/tcb/st-root',
    task: 'st-task',
    epoch: '1',
    node: process.execPath,
  };
  T.attempt = `${T.root}/wt/${T.task}-e${T.epoch}`;
  const setDir = path.join(tcb, 'settings');
  const settingsFiles = listFiles(setDir, '.json');
  for (const r of [...TASK_ROLES, 'coordinator']) if (!settingsFiles.includes(`${r}.json`)) probs.push(`settings/${r}.json missing`);
  for (const f of settingsFiles) {
    if (f === 'user-deny.json') continue;
    const role = f.slice(0, -5);
    const prof = profiles[role];
    if (!prof) {
      probs.push(`settings/${f}: no valid profile for ${role}`);
      continue;
    }
    let text;
    try {
      text = fs.readFileSync(path.join(setDir, f), 'utf8');
    } catch (e) {
      probs.push(`settings/${f}: unreadable`);
      continue;
    }
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    let out = text;
    for (const k of ['root', 'attempt', 'task', 'epoch', 'node']) out = out.split(`{${k}}`).join(JSON.stringify(T[k]).slice(1, -1));
    let s;
    try {
      s = JSON.parse(out);
    } catch {
      probs.push(`settings/${f}: does not parse after substitution`);
      continue;
    }
    if (/\{[a-z_]+\}/.test(JSON.stringify(s))) probs.push(`settings/${f}: unknown placeholder left`);
    const allow = s && s.permissions && s.permissions.allow;
    const deny = s && s.permissions && s.permissions.deny;
    if (!Array.isArray(allow) || allow.some((x) => typeof x !== 'string')) probs.push(`settings/${f}: permissions.allow`);
    if (!Array.isArray(deny) || deny.some((x) => typeof x !== 'string')) probs.push(`settings/${f}: permissions.deny`);
    if (Array.isArray(allow)) {
      for (const rule of allow) {
        const tool = String(rule).split('(')[0];
        if (!toolListed(prof.tools_allow, tool)) probs.push(`settings/${f}: allows ${tool}, not in tools_allow`);
      }
    }
    if (Array.isArray(deny)) for (const t of prof.tools_deny) if (!deny.includes(t)) probs.push(`settings/${f}: does not deny ${t}`);
    const pre = s && s.hooks && s.hooks.PreToolUse;
    const entries = Array.isArray(pre) ? pre : [];
    const cmds = [];
    for (const e of entries) {
      if (!e || e.matcher !== '*' || !Array.isArray(e.hooks)) continue;
      for (const h of e.hooks) if (h && h.type === 'command' && typeof h.command === 'string') cmds.push(h);
    }
    if (cmds.length !== 1) {
      probs.push(`settings/${f}: expected one PreToolUse command hook with matcher "*", found ${cmds.length}`);
      continue;
    }
    const h = cmds[0];
    const c = h.command;
    if (!c.startsWith(`"${T.node}"`)) probs.push(`settings/${f}: hook command does not start with the quoted node path`);
    if (!c.includes(`"${T.root}/tcb/guard-hook.mjs"`)) probs.push(`settings/${f}: hook command does not name tcb/guard-hook.mjs under the root`);
    const toks = c.split(/\s+/);
    const after = (flag) => {
      const i = toks.indexOf(flag);
      return i >= 0 ? toks[i + 1] : undefined;
    };
    if (after('--role') !== role) probs.push(`settings/${f}: hook command names role ${after('--role')}`);
    if (after('--root') !== `"${T.root}"`) probs.push(`settings/${f}: hook command --root`);
    if (TASK_ROLES.includes(role)) {
      if (after('--task') !== T.task || after('--epoch') !== T.epoch) probs.push(`settings/${f}: hook command --task/--epoch`);
    } else if (toks.includes('--task') || toks.includes('--epoch')) probs.push(`settings/${f}: coordinator hook takes no task or epoch`);
    if (typeof h.timeout !== 'number' || !(h.timeout > 0)) probs.push(`settings/${f}: hook timeout`);
  }
  // user-level denies
  try {
    const u = JSON.parse(fs.readFileSync(path.join(setDir, 'user-deny.json'), 'utf8').replace(/^\uFEFF/, ''));
    const d = u && u.permissions && u.permissions.deny;
    if (!Array.isArray(d)) probs.push('settings/user-deny.json: permissions.deny');
    else {
      for (const dir of USER_DENY_DIRS) {
        for (const tool of ['Write', 'Edit']) {
          if (!d.includes(`${tool}(//{root}/${dir}/**)`)) probs.push(`settings/user-deny.json: no ${tool} deny on ${dir}`);
        }
      }
    }
  } catch {
    probs.push('settings/user-deny.json missing or unparseable');
  }
  // agent files
  for (const [name, tools] of Object.entries(AGENT_TOOLS)) {
    let text;
    let brief;
    try {
      text = fs.readFileSync(path.join(tcb, 'agents', `${name}.md`), 'utf8');
    } catch {
      probs.push(`agents/${name}.md missing`);
      continue;
    }
    try {
      brief = fs.readFileSync(path.join(tcb, 'briefs', `${name}.md`), 'utf8');
    } catch {
      probs.push(`briefs/${name}.md missing`);
      continue;
    }
    const a = parseAgentFile(text);
    if (!a) {
      probs.push(`agents/${name}.md: no front matter`);
      continue;
    }
    if (a.fm.name !== name) probs.push(`agents/${name}.md: name`);
    if (!a.fm.description) probs.push(`agents/${name}.md: description`);
    const listed = String(a.fm.tools || '').split(',').map((t) => t.trim()).filter(Boolean).sort();
    if (JSON.stringify(listed) !== JSON.stringify([...tools].sort())) probs.push(`agents/${name}.md: tools ${listed.join(',')}`);
    for (const k of Object.keys(a.fm)) if (!['name', 'description', 'tools', 'model'].includes(k)) probs.push(`agents/${name}.md: front matter key ${k}`);
    if (a.body !== brief) probs.push(`agents/${name}.md: body differs from briefs/${name}.md`);
  }
  return probs;
}

// ---------------------------------------------------------------------------------------------
// static checks

function staticChecks(root, cases, only) {
  const tcb = path.join(root, 'tcb');
  const scope = only.length ? SCRIPTS.filter((s) => only.includes(s)) : SCRIPTS;
  const checks = [];
  const add = (check, problems) => checks.push({ check, pass: problems.length === 0, detail: problems });

  add('missing-script', scope.filter((s) => !fs.existsSync(scriptFile(tcb, s))));

  const noFix = [];
  for (const s of scope) {
    const mine = cases.filter((c) => c.script === s && c.spec && !c.problem);
    const good = mine.some((c) => c.spec.kind === 'good');
    const bad = mine.some((c) => c.spec.kind === 'bad');
    if (!good || !bad) noFix.push(`${s}: ${!good ? 'no good case' : ''}${!good && !bad ? ', ' : ''}${!bad ? 'no bad case' : ''}`);
  }
  add('no-fixtures', noFix);

  add('bad-case', cases.filter((c) => scope.includes(c.script) && c.problem).map((c) => `${c.script}/${c.case}: ${c.problem}`));

  const schemaProbs = [];
  for (const f of listFiles(path.join(tcb, 'schemas'), '.schema.json')) {
    const name = f.slice(0, -'.schema.json'.length);
    let schema;
    try {
      schema = lib.loadSchema(root, name);
    } catch (e) {
      schemaProbs.push(`${f}: ${e && e.code ? e.code : e}`);
      continue;
    }
    // Exercise the validator once so an unsupported keyword (schema-keyword) shows here, not in a
    // run; any other outcome of validating `{}` is irrelevant.
    try {
      if (schema && typeof schema === 'object') lib.validate(schema, {});
    } catch (e) {
      if (e && e.code === 'schema-keyword') schemaProbs.push(`${f}: schema-keyword`);
    }
  }
  add('schema-load', schemaProbs);

  let thJson = null;
  const thProbs = [];
  try {
    thJson = lib.readJson(path.join(tcb, 'thresholds.json'));
    const r = lib.checkFormat(root, 'thresholds', thJson);
    if (r && typeof r === 'object' && r.ok === false) thProbs.push('schema');
  } catch (e) {
    thProbs.push(`${e && e.code ? e.code : e}`);
  }
  add('thresholds-invalid', thProbs);
  const loop = thJson && thJson.params && thJson.params.allow_loopback;
  add('loopback-on', loop && loop.value === false ? [] : ['allow_loopback is not false']);

  let roleProbs;
  try {
    roleProbs = roleFilesProblems(root);
  } catch (e) {
    roleProbs = [`role-file check failed: ${e && e.message ? e.message : e}`];
  }
  add('role-files', roleProbs);

  add(
    'watch-case-loops',
    cases.filter((c) => c.script === 'watch' && scope.includes('watch') && c.spec && !c.problem && !watchBounded(c.spec.args)).map((c) => `watch/${c.case}`),
  );
  return checks;
}

// ---------------------------------------------------------------------------------------------
// one case

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.htm': 'text/html; charset=utf-8',
      '.txt': 'text/plain; charset=utf-8',
      '.json': 'application/json',
      '.pdf': 'application/pdf',
    }[ext] || 'application/octet-stream'
  );
}

function startServer(serve, caseDir) {
  const map = new Map(Object.entries(serve).map(([k, rel]) => [k, path.join(caseDir, rel)]));
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let file;
      try {
        file = map.get(new URL(req.url, 'http://127.0.0.1').pathname);
      } catch {
        file = undefined;
      }
      if (!file) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('not found');
        return;
      }
      const body = fs.readFileSync(file);
      res.writeHead(200, { 'content-type': contentType(file), 'content-length': body.length });
      res.end(body);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((r) => {
            server.close(() => r());
            if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
          }),
      });
    });
  });
}

function ledgerVerifies(caseRoot) {
  const file = path.join(caseRoot, 'run', 'ledger.jsonl');
  if (!fs.existsSync(file)) return true;
  try {
    const { lines } = lib.readLedger(caseRoot);
    return lib.verifyLedger(lines).ok === true;
  } catch {
    return false;
  }
}

// The case root's data: never a script (the scripts run from the live tcb/), never fixtures/ or test/.
function prepareCase(c, liveRoot, caseRoot) {
  const liveTcb = path.join(liveRoot, 'tcb');
  const caseTcb = path.join(caseRoot, 'tcb');
  fs.mkdirSync(caseTcb, { recursive: true });
  for (const d of COPY_DIRS) {
    const src = path.join(liveTcb, d);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(caseTcb, d), { recursive: true, verbatimSymlinks: true });
  }
  for (const f of COPY_FILES) {
    const src = path.join(liveTcb, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(caseTcb, f));
  }
  const overlay = path.join(c.dir, 'root');
  if (fs.existsSync(overlay)) fs.cpSync(overlay, caseRoot, { recursive: true, force: true, verbatimSymlinks: true });
  // Threshold overrides go into this copy only, after the overlay, so no case reads the owner's
  // real transcripts unless it names a transcripts_root itself.
  const thFile = path.join(caseTcb, 'thresholds.json');
  let th;
  try {
    th = lib.readJson(thFile);
  } catch {
    th = { schema_version: 1, params: {} };
  }
  if (!isPlainObject(th.params)) th.params = {};
  const overrides = { ...(c.spec.thresholds || {}) };
  if (!('transcripts_root' in overrides)) overrides.transcripts_root = path.join(caseRoot, 'transcripts');
  for (const [name, value0] of Object.entries(overrides)) {
    const value = typeof value0 === 'string' ? value0.split('{root}').join(caseRoot) : value0;
    const prev = isPlainObject(th.params[name]) ? th.params[name] : { unit: 'selftest case override', source: 'guess', gate: false };
    th.params[name] = { ...prev, value };
  }
  fs.mkdirSync(String(th.params.transcripts_root.value), { recursive: true });
  lib.writeAtomic(thFile, JSON.stringify(th, null, 2) + '\n');
}

function waitExit(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve({ code: child.exitCode, signal: child.signalCode });
      return;
    }
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

// `closed` is the promise made at spawn time (a 'close' emitted in the same tick as 'exit' is never
// missed); true when the child's pipes closed within ms.
function waitClose(closed, ms) {
  let t = null;
  return Promise.race([
    closed.then(() => true),
    new Promise((resolve) => {
      t = setTimeout(() => resolve(false), ms);
    }),
  ]).finally(() => clearTimeout(t));
}

// The child's {pid, start_time} is recorded here, at its deadline, from one process list taken while
// Node still holds the child's unreaped handle (so its pid cannot have been reused): one PowerShell
// call per timed-out case instead of one per case. That same list, taken a moment ago, is handed to
// killOwnTree as its re-list; every later call (its per-process start-time re-match) is real.
async function killCase(child, proc) {
  try {
    const list = await proc.list();
    const me = Array.isArray(list) ? list.find((p) => p && p.pid === child.pid) : null;
    if (me && me.start_time) {
      let fresh = list;
      const once = {
        list: () => {
          if (fresh) {
            const l = fresh;
            fresh = null;
            return l;
          }
          return proc.list();
        },
        alive: (pid, startTime) => proc.alive(pid, startTime),
        boot: () => proc.boot(),
      };
      await lib.killOwnTree(once, { pid: child.pid, start_time: me.start_time });
      return;
    }
  } catch (e) {
    process.stderr.write(`selftest: process list failed (${e && e.code ? e.code : e}); ending the case child by its own handle\n`);
  }
  // Our own child, still unreaped (Node holds its handle, so the pid cannot have been reused).
  if (child.exitCode === null && child.signalCode === null) child.kill();
}

// One case, start to end: prepare its root, run the live script against it, end every process it
// started, judge. `leftover` names a process of the case that could not be ended (the caller stops
// the run on it).
async function runCase(c, ctx) {
  const { liveRoot, stRoot, caseTimeoutMs, proc, slugOf } = ctx;
  const spec = c.spec;
  const entry = {
    n: c.n,
    script: c.script,
    case: c.case,
    kind: spec.kind,
    fault_class: spec.fault_class,
    expect_exit: spec.expect.exit,
    exit: null,
    pass: false,
  };
  const caseRoot = path.join(stRoot, String(c.n));
  let server = null;
  let spawnFailed = false;
  let leftover = null;
  try {
    prepareCase(c, liveRoot, caseRoot);
    const before = ledgerVerifies(caseRoot);
    if (spec.serve) server = await startServer(spec.serve, c.dir);
    const args = spec.args.map((a) => a.split('{root}').join(caseRoot).split('{server}').join(server ? server.origin : ''));
    // The script runs where it is, in the live tcb/; only its data lives in the case root.
    const scriptPath = scriptFile(path.join(liveRoot, 'tcb'), c.script);
    const stdinFile = spec.stdin ? path.join(c.dir, spec.stdin) : null;
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: caseRoot,
      shell: false,
      windowsHide: true,
      stdio: [stdinFile ? 'pipe' : 'ignore', 'pipe', 'pipe'],
    });
    const closedP = new Promise((resolve) => child.once('close', () => resolve(true)));
    let spawnError = null;
    child.on('error', (e) => {
      spawnError = e;
    });
    const out = [];
    const err = [];
    let outN = 0;
    let errN = 0;
    let overflow = false;
    child.stdout.on('data', (b) => {
      outN += b.length;
      if (outN > OUT_CAP) overflow = true;
      else out.push(b);
    });
    child.stderr.on('data', (b) => {
      errN += b.length;
      if (errN <= OUT_CAP) err.push(b);
    });
    if (stdinFile) {
      child.stdin.on('error', () => {});
      child.stdin.end(fs.readFileSync(stdinFile));
    }
    let timedOut = false;
    let killing = null;
    let giveUp = null;
    let recheck = null;
    // A synchronous PowerShell call can block the event loop for seconds, so a timer can fire before
    // an exit that already happened has been delivered. Look again one poll phase later and treat
    // the case as timed out only if its child is still running.
    const timer = setTimeout(() => {
      recheck = setTimeout(() => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        timedOut = true;
        killing = killCase(child, proc).catch(() => {});
      }, 50);
    }, caseTimeoutMs);
    const exited = await Promise.race([
      waitExit(child),
      new Promise((resolve) => child.once('error', () => resolve(null))),
      // A child that outlives its kill is never waited on forever; the run stops instead.
      new Promise((resolve) => {
        giveUp = setTimeout(() => resolve('gave-up'), caseTimeoutMs + GIVE_UP_MS);
      }),
    ]);
    clearTimeout(timer);
    clearTimeout(recheck);
    clearTimeout(giveUp);
    // The kill (a re-list and taskkill calls) has finished before anything else happens.
    if (killing) await killing;
    if (exited === 'gave-up') {
      process.stderr.write(`selftest: case ${c.script}/${c.case} (pid ${child.pid}) did not end after its kill; the run stops\n`);
      child.stdout.destroy();
      child.stderr.destroy();
      child.unref();
      entry.why = 'timeout';
      leftover = { code: 'case-not-ended', detail: { case: `${c.script}/${c.case}`, pid: child.pid ?? null } };
      return { entry, spawnFailed, leftover, caseRoot };
    }
    if (exited === null || (spawnError && child.pid === undefined)) {
      spawnFailed = true;
      entry.why = 'spawn';
      return { entry, spawnFailed, leftover, caseRoot };
    }
    // The child has exited; its pipes close once no descendant holds them. A pipe still open after
    // the grace is a process of this case still alive: the run stops before another case starts.
    const closed = await waitClose(closedP, CLOSE_GRACE_MS);
    if (!closed) {
      child.stdout.destroy();
      child.stderr.destroy();
      process.stderr.write(`selftest: case ${c.script}/${c.case} exited but a process it started still holds its output; the run stops\n`);
      leftover = { code: 'case-left-process', detail: { case: `${c.script}/${c.case}`, pid: child.pid ?? null } };
    }
    entry.exit = exited.code;
    if (timedOut) {
      entry.why = 'timeout';
      return { entry, spawnFailed, leftover, caseRoot };
    }
    if (!closed) {
      entry.why = 'left-process';
      return { entry, spawnFailed, leftover, caseRoot };
    }
    const stdout = Buffer.concat(out).toString('utf8');
    const stderr = Buffer.concat(err).toString('utf8');
    const why = judge(c.script, spec, { exit: exited.code, stdout, stderr, overflow }, caseRoot, before, slugOf);
    if (why) entry.why = why;
    else entry.pass = true;
    return { entry, spawnFailed, leftover, caseRoot };
  } catch (e) {
    entry.why = `harness: ${e && e.code ? e.code : e && e.message ? e.message : e}`;
    return { entry, spawnFailed, leftover, caseRoot };
  } finally {
    if (server) await server.close();
  }
}

// One case with its clean-up: the case root goes as soon as the case is judged (a failing one stays
// under --keep-failed), so case roots never pile up on disk.
async function runOneCase(c, ctx) {
  const r = await runCase(c, ctx);
  r.kept = null;
  if (!r.entry.pass && ctx.keepFailed) {
    if (fs.existsSync(r.caseRoot)) r.kept = lib.relPosix(ctx.root, r.caseRoot);
  } else removeCaseRoot(r.caseRoot);
  return r;
}

function judge(script, spec, res, caseRoot, ledgerBefore, slugOf) {
  const ex = spec.expect;
  if (res.exit !== ex.exit) return 'exit';
  if (res.overflow) return 'stdout-too-large';
  // guard-hook speaks the hook protocol: its stdout is empty unless the case says otherwise.
  const wantEmpty = ex.stdout_empty === true || (script === 'guard-hook' && ex.stdout_empty === undefined);
  if (wantEmpty) {
    if (res.stdout.length !== 0) return 'stdout-not-empty';
  } else {
    let s = res.stdout;
    if (s.endsWith('\n')) s = s.slice(0, -1);
    if (s.endsWith('\r')) s = s.slice(0, -1);
    if (s === '') return 'stdout-missing';
    if (/[\r\n]/.test(s)) return 'stdout-lines';
    let line;
    try {
      line = JSON.parse(s);
    } catch {
      return 'stdout-json';
    }
    if (!isPlainObject(line)) return 'stdout-json';
    if ('exit' in line && line.exit !== res.exit) return 'stdout-exit';
    if ('code' in line && slugOf.has(res.exit) && line.code !== slugOf.get(res.exit)) return 'stdout-code';
    if ('code' in ex) {
      const reasons = Array.isArray(line.reasons) ? line.reasons : [];
      if (!reasons.some((r) => r && r.code === ex.code)) return 'code';
    }
    if ('result' in ex && !isSubset(ex.result, line.result)) return 'result';
  }
  if ('stderr_prefix' in ex && !res.stderr.startsWith(ex.stderr_prefix)) return 'stderr';
  if (ex.files) {
    for (const [rel, want] of Object.entries(ex.files)) {
      const f = path.join(caseRoot, rel);
      const present = fs.existsSync(f);
      if (want === 'absent' && present) return 'files';
      if (want === 'present' && !present) return 'files';
      if (HEX64.test(want)) {
        if (!present) return 'files';
        try {
          if (lib.sha256hex(fs.readFileSync(f)) !== want) return 'files';
        } catch {
          return 'files';
        }
      }
    }
  }
  if (ledgerBefore && !ledgerVerifies(caseRoot)) return 'ledger-broken';
  return null;
}

function removeCaseRoot(dir) {
  try {
    if (fs.existsSync(dir)) lib.removeTree(dir);
    return true;
  } catch (e) {
    process.stderr.write(`selftest: case root ${dir} kept (${e && e.code ? e.code : e})\n`);
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// run

async function runMode(ctx, flags, root, ce) {
  const dryRun = !!flagOf(flags, 'dry-run');
  const only = flagOf(flags, 'only') || [];
  for (const s of only) if (!SCRIPTS.includes(s)) return usage(`--only ${s}: not a script of CONTRACT §5`);
  const jobsFlag = flagOf(flags, 'jobs');
  if (jobsFlag !== undefined && !(Number.isInteger(jobsFlag) && jobsFlag >= 1 && jobsFlag <= MAX_JOBS)) return usage(`--jobs must be 1 or ${MAX_JOBS}`);
  const ctFlag = flagOf(flags, 'case-timeout-ms');
  if (ctFlag !== undefined && !(Number.isInteger(ctFlag) && ctFlag >= 1)) return usage('--case-timeout-ms must be at least 1');

  lib.checkCe(root, ce);
  const tcbDir = path.join(root, 'tcb');
  const t0 = lib.treeSha(tcbDir);
  const th = lib.thresholds(root);
  const caseTimeoutMs = ctFlag !== undefined ? ctFlag : thGet(th, 'selftest_case_ms');
  const facts = lib.edgeFacts(flags);
  const jobs = jobsFlag !== undefined ? jobsFlag : DEFAULT_JOBS;

  const all = collectCases(root);
  const checks = staticChecks(root, all, only);
  const staticOk = checks.every((c) => c.pass);
  const selected = all.filter((c) => (only.length ? only.includes(c.script) : true));
  const failedChecks = checks.filter((c) => !c.pass).map((c) => c.check);
  const checkReasons = checks.filter((c) => !c.pass).map((c) => ({ code: c.check, detail: c.detail }));

  if (dryRun) {
    return {
      exit: staticOk ? 0 : 1,
      dry_run: true,
      mode: 'run',
      result: {
        tcb_sha: t0,
        jobs,
        case_timeout_ms: caseTimeoutMs,
        cases: selected.map((c) => ({ n: c.n, script: c.script, case: c.case, kind: c.spec ? c.spec.kind : null, fault_class: c.spec ? c.spec.fault_class : null, problem: c.problem || undefined })),
        checks,
      },
      reasons: checkReasons,
    };
  }

  const procExe = thGet(th, 'proc_exe');
  const proc = lib.realProc({ exe: procExe });
  const slugOf = exitSlugs();
  let caseResults = [];
  // Causes of not_run, in the order found; tcb-changed is listed first when present.
  const stops = [];
  const hasStop = (code) => stops.some((s) => s.code === code);
  let stRoot = null;
  const kept = [];

  if (staticOk) {
    stRoot = path.join(root, 'tmp', `st-${crypto.randomBytes(4).toString('hex')}`);
    try {
      fs.mkdirSync(stRoot, { recursive: true });
    } catch (e) {
      stops.push({ code: 'tmp-unwritable', detail: `${e && e.code ? e.code : e}` });
    }
    if (stops.length === 0) {
      const runnable = selected.filter((c) => c.spec && !c.problem);
      const caseCtx = { root, liveRoot: root, stRoot, caseTimeoutMs, proc, slugOf, keepFailed: !!flagOf(flags, 'keep-failed') };
      // After every case: the live tree is unchanged, and nothing the case started is still alive.
      // Either breach stops the run; no later case starts.
      caseResults = await pool(
        runnable,
        jobs,
        async (c) => {
          const r = await runOneCase(c, caseCtx);
          if (r.leftover) stops.push(r.leftover);
          const t = lib.treeSha(tcbDir);
          if (t !== t0 && !hasStop('tcb-changed')) stops.unshift({ code: 'tcb-changed', detail: { before: t0, after: t, case: `${c.script}/${c.case}` } });
          return r;
        },
        () => stops.length > 0,
      );
      const spawnFailed = caseResults.filter((r) => r.spawnFailed);
      if (spawnFailed.length) stops.push({ code: 'spawn-failed', detail: spawnFailed.map((r) => `${r.entry.script}/${r.entry.case}`) });
      for (const r of caseResults) if (r.kept) kept.push(r.kept);
      try {
        if (fs.readdirSync(stRoot).length === 0) fs.rmdirSync(stRoot);
      } catch {
        // leave it
      }
    }
  }

  const t1 = lib.treeSha(tcbDir);
  if (t1 !== t0 && !hasStop('tcb-changed')) stops.unshift({ code: 'tcb-changed', detail: { before: t0, after: t1 } });
  const notRun = stops.length > 0;

  const cases = caseResults
    .map((r) => r.entry)
    .sort((a, b) => (a.script < b.script ? -1 : a.script > b.script ? 1 : a.case < b.case ? -1 : a.case > b.case ? 1 : 0));
  const failedCases = cases.filter((c) => !c.pass).map((c) => `${c.script}/${c.case}`);
  const failed = [...failedChecks, ...failedCases];
  let result;
  let exit;
  const reasons = [];
  if (notRun) {
    result = 'not_run';
    exit = 2;
    reasons.push(...stops);
  } else if (failed.length) {
    result = 'fail';
    exit = 1;
  } else {
    result = 'pass';
    exit = 0;
  }
  reasons.push(...checkReasons);
  for (const c of cases) if (!c.pass) reasons.push({ code: 'case-failed', detail: { case: `${c.script}/${c.case}`, why: c.why || null, exit: c.exit, expect_exit: c.expect_exit } });

  const out = {
    tcb_sha: t0,
    result,
    jobs,
    cases_total: selected.length,
    cases_run: cases.length,
    passed: cases.filter((c) => c.pass).length,
    failed,
    checks,
  };
  if (kept.length) out.kept = kept;
  // Cases a stop kept from starting (the run is not_run then).
  const ran = new Set(cases.map((c) => `${c.script}/${c.case}`));
  const notStarted = selected.filter((c) => c.spec && !c.problem && !ran.has(`${c.script}/${c.case}`)).map((c) => `${c.script}/${c.case}`);
  if (staticOk && notStarted.length) out.not_started = notStarted;

  if (only.length) {
    out.partial = true;
    return { exit, mode: 'run', dry_run: false, result: out, reasons };
  }

  const record = {
    schema_version: 1,
    tcb_sha: t0,
    ce,
    ran_at: isoOf(facts.now),
    result,
    cases,
    checks,
    failed,
  };
  const file = pathOf(root, 'selftest', 'run', 'selftest.json');
  const retries = thGet(th, 'lock_retries');
  const checkLine = {
    ctx,
    ce,
    kind: 'check',
    data: { check: 'selftest', subject: t0, result, reasons: reasons.map((r) => ({ code: r.code, detail: r.detail === undefined ? null : r.detail })) },
    now: facts.now,
  };
  // Written so that it holds whether the library's lock and ledger calls are synchronous or not.
  await lib.withRunLock(root, { script: SCRIPT, ce, proc, now: facts.now, retries }, (handle) => {
    if (handle && typeof handle.assertHeld === 'function') handle.assertHeld();
    lib.writeAtomic(file, JSON.stringify(record, null, 2) + '\n');
    const r1 = lib.appendLedger(root, handle, { ctx, ce, kind: 'selftest', data: { tcb_sha: t0, result, failed }, now: facts.now });
    if (r1 && typeof r1.then === 'function') return r1.then(() => lib.appendLedger(root, handle, checkLine));
    return lib.appendLedger(root, handle, checkLine);
  });
  out.path = 'run/selftest.json';
  return { exit, mode: 'run', dry_run: false, result: out, reasons };
}

// ---------------------------------------------------------------------------------------------
// canary

function expectProblem(v) {
  if (!isPlainObject(v)) return 'not an object';
  if (v.schema_version !== 1) return 'schema_version';
  for (const k of Object.keys(v)) if (!['schema_version', 'probes'].includes(k)) return `extra field ${k}`;
  if (!Array.isArray(v.probes) || v.probes.length === 0) return 'probes';
  const names = new Set();
  for (const p of v.probes) {
    if (!isPlainObject(p)) return 'probe not an object';
    for (const k of Object.keys(p)) if (!['probe', 'actor', 'tool', 'match', 'expect', 'layer'].includes(k)) return `probe: extra field ${k}`;
    if (typeof p.probe !== 'string' || p.probe === '') return 'probe name';
    if (names.has(p.probe)) return `duplicate probe ${p.probe}`;
    names.add(p.probe);
    if (p.actor !== 'main' && p.actor !== 'helper') return `${p.probe}: actor`;
    if (typeof p.tool !== 'string' || p.tool === '') return `${p.probe}: tool`;
    if (!isPlainObject(p.match) || Object.values(p.match).some((s) => typeof s !== 'string')) return `${p.probe}: match`;
    if (p.expect !== 'refused' && p.expect !== 'allowed') return `${p.probe}: expect`;
    if (!['hook', 'permission', 'any'].includes(p.layer)) return `${p.probe}: layer`;
  }
  return null;
}

function normText(s) {
  return String(s).replace(/\\/g, '/').toLowerCase();
}

function fieldText(v) {
  if (typeof v === 'string') return v;
  if (v === undefined) return null;
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

function findProbe(probe, parsedList, vars) {
  const match = Object.entries(probe.match).map(([k, s]) => [k, normText(s.split('{root}').join(vars.root).split('{cwd}').join(vars.cwd ?? '\u0000no-cwd'))]);
  const candidates = [];
  parsedList.forEach((parsed, fi) => {
    const uses = Array.isArray(parsed.toolUses) ? parsed.toolUses : [];
    uses.forEach((u, ui) => {
      if (!u || u.name !== probe.tool) return;
      const input = u.input && typeof u.input === 'object' ? u.input : {};
      for (const [k, sub] of match) {
        const t = fieldText(input[k]);
        if (t === null || !normText(t).includes(sub)) return;
      }
      candidates.push({ u, parsed, order: [fi, ui] });
    });
  });
  if (candidates.length === 0) return { outcome: 'not-attempted' };
  candidates.sort((a, b) => {
    const ta = String(a.u.ts ?? '');
    const tb = String(b.u.ts ?? '');
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.order[0] - b.order[0] || a.order[1] - b.order[1];
  });
  const first = candidates[0];
  const results = Array.isArray(first.parsed.toolResults) ? first.parsed.toolResults : [];
  const res = results.find((r) => r && r.toolUseId === first.u.id);
  if (!res) return { outcome: 'no-result' };
  if (res.isError) return { outcome: String(res.text || '').includes('[guard-hook] deny') ? 'refused-hook' : 'refused-permission' };
  return { outcome: 'allowed' };
}

function probeVerdict(probe, outcome) {
  if (outcome === 'not-attempted' || outcome === 'no-result') return { verdict: 'not_run', code: outcome };
  if (probe.expect === 'allowed') return outcome === 'allowed' ? { verdict: 'pass' } : { verdict: 'fail', code: 'not-allowed' };
  if (outcome === 'allowed') return { verdict: 'fail', code: 'not-refused' };
  if (probe.layer === 'hook' && outcome !== 'refused-hook') return { verdict: 'fail', code: 'wrong-layer' };
  if (probe.layer === 'permission' && outcome !== 'refused-permission') return { verdict: 'fail', code: 'wrong-layer' };
  return { verdict: 'pass' };
}

async function canaryMode(ctx, flags, root, ce) {
  const dryRun = !!flagOf(flags, 'dry-run');
  lib.checkCe(root, ce);
  const th = lib.thresholds(root);
  const transcriptsRoot = th.get('transcripts_root');
  const transcript = path.resolve(String(flagOf(flags, 'transcript')));
  const expectFile = path.resolve(String(flagOf(flags, 'expect')));
  const selDir = path.join(root, 'tcb', 'fixtures', 'selftest');
  if (typeof transcriptsRoot !== 'string' || !lib.isUnder(transcript, transcriptsRoot)) {
    return { exit: 2, mode: 'canary', dry_run: dryRun, result: {}, reasons: [{ code: 'untrusted-path', detail: { flag: 'transcript' } }] };
  }
  if (!lib.isUnder(expectFile, selDir)) {
    return { exit: 2, mode: 'canary', dry_run: dryRun, result: {}, reasons: [{ code: 'untrusted-path', detail: { flag: 'expect' } }] };
  }
  if (!fs.existsSync(transcript)) return { exit: 2, mode: 'canary', dry_run: dryRun, result: {}, reasons: [{ code: 'missing', detail: { flag: 'transcript' } }] };
  if (!fs.existsSync(expectFile)) return { exit: 2, mode: 'canary', dry_run: dryRun, result: {}, reasons: [{ code: 'missing', detail: { flag: 'expect' } }] };
  const expect = lib.readJson(expectFile);
  const bad = expectProblem(expect);
  if (bad) return { exit: 2, mode: 'canary', dry_run: dryRun, result: {}, reasons: [{ code: 'bad-expect', detail: bad }] };

  // Facts first: every transcript parse happens before the lock (CONTRACT §2.1).
  const main = lib.parseTranscript(transcript);
  const session = typeof main.sessionId === 'string' && main.sessionId ? main.sessionId : path.basename(transcript, '.jsonl');
  const st = lib.sessionTranscripts(transcriptsRoot, session);
  const helperPaths = (st && Array.isArray(st.helpers) ? st.helpers : []).map((h) => (typeof h === 'string' ? h : h && h.path)).filter(Boolean);
  const helpers = helperPaths.map((p) => lib.parseTranscript(p));
  const tcbSha = lib.treeSha(path.join(root, 'tcb'));
  const vars = { root, cwd: typeof main.cwd === 'string' ? main.cwd : null };

  const probes = expect.probes.map((p) => {
    const { outcome } = findProbe(p, p.actor === 'main' ? [main] : helpers, vars);
    const v = probeVerdict(p, outcome);
    return { probe: p.probe, expect: p.expect, layer: p.layer, outcome, verdict: v.verdict, code: v.code || null };
  });
  const anyFail = probes.some((p) => p.verdict === 'fail');
  const anyNotRun = probes.some((p) => p.verdict === 'not_run');
  const exit = anyFail ? 1 : anyNotRun ? 2 : 0;
  const result = anyFail ? 'fail' : anyNotRun ? 'not_run' : 'pass';
  const bad2 = probes.filter((p) => p.verdict !== 'pass');
  const reasons = [
    ...bad2.map((p) => ({ code: p.code, detail: { probe: p.probe, outcome: p.outcome, tcb_sha: tcbSha } })),
    ...bad2.map((p) => ({ code: p.probe, detail: { outcome: p.outcome, tcb_sha: tcbSha } })),
  ];
  const out = { subject: `canary:${session}`, tcb_sha: tcbSha, result, probes };
  if (dryRun) return { exit, mode: 'canary', dry_run: true, result: out, reasons };

  const facts = lib.edgeFacts(flags);
  const proc = lib.realProc({ exe: thGet(th, 'proc_exe') });
  const retries = thGet(th, 'lock_retries');
  await lib.withRunLock(root, { script: SCRIPT, ce, proc, now: facts.now, retries }, (handle) =>
    lib.appendLedger(root, handle, {
      ctx,
      ce,
      kind: 'check',
      data: {
        check: 'canary',
        subject: `canary:${session}`,
        result,
        reasons: probes.map((p) => ({ code: p.probe, detail: { outcome: p.outcome, verdict: p.verdict, tcb_sha: tcbSha } })),
      },
      now: facts.now,
    }),
  );
  return { exit, mode: 'canary', dry_run: false, result: out, reasons };
}

// ---------------------------------------------------------------------------------------------

await lib.runMain(import.meta.url, SCRIPT, async (ctx) => {
  const { mode, flags } = lib.parseArgs(process.argv.slice(2), ARG_SPEC);
  if (mode !== 'run' && mode !== 'canary') return usage('mode must be run or canary');
  const root = flagOf(flags, 'root');
  const ce = flagOf(flags, 'ce');
  if (typeof root !== 'string' || !path.isAbsolute(root)) return usage('--root must be an absolute path');
  const absRoot = path.resolve(root);
  if (lib.isUnder(fileURLToPath(import.meta.url), path.join(absRoot, 'wt'))) {
    return { exit: 3, result: {}, reasons: [{ code: 'run-from-attempt', detail: null }] };
  }
  return mode === 'run' ? runMode(ctx, flags, absRoot, ce) : canaryMode(ctx, flags, absRoot, ce);
});
