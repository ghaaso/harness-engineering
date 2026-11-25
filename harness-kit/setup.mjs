#!/usr/bin/env node
// harness-kit/setup.mjs: builds the kit's hook programs (Rust) and wires them into one project's per-machine settings
// file, <project>/.claude/settings.local.json. The rules: docs/program/harness-kit-2026-11-25/CONTRACT.md section 7.
//
//   node harness-kit/setup.mjs [--project <folder>] [--no-usage-tool]   dry run: prints what it would do, changes nothing
//   node harness-kit/setup.mjs --apply [--project <folder>] [--no-usage-tool] [--fetch]
//   node harness-kit/setup.mjs --status [--project <folder>]           what is wired there, built, fresh, configured
//   node harness-kit/setup.mjs --remove [--project <folder>]           takes out exactly what --apply added
//
// The clone is the folder above this script's own folder; the project is --project (else the clone). Plain Node 20 or
// later, no dependency. It needs cargo (Rust, through rustup) to build: without it --apply stops, says what to install,
// and changes nothing. There is no JavaScript hook behind the programs (the owner, 2026-11-25: "no fallbacks needed").
//
// --apply first builds the workspace:  cargo build --release --locked --offline  in harness-kit/rust, into
// harness-kit/rust/target (CARGO_TARGET_DIR is set to it, so the wired paths hold). Offline, nothing is downloaded and
// rustup does not install a toolchain (RUSTUP_AUTO_INSTALL=0). If a crate or the pinned toolchain is not on the machine
// it prints what would be fetched and from where, and stops; --fetch runs the same build without --offline and lets
// rustup install the pinned toolchain. Then it refuses to wire a program that is not built.
//
// Each hook is wired as (".exe" added on Windows; paths with forward slashes, in double quotes):
//   "<clone>/harness-kit/rust/target/release/kit-<hook>" --harness-kit "--clone=<clone>" "--project=<project>"
// with --no-usage-tool added to the fan-out gate when asked (a machine whose sessions cannot read the plan's usage).
// The argument --harness-kit marks the kit's entries: --remove takes out every hook entry that holds it as a word
// anywhere in its command, drops a group or event list it left empty, and leaves every other key as it was. --apply
// takes the marked entries out first, then adds them fresh, so running it twice or after moving the clone leaves one set.
//
// --apply also makes <project>/.harness/ with kit.json (a copy of harness-kit/parallel/kit.example.json), WIDTHS.md (the
// two declaration forms of the count gate explained, nothing declared) and briefs/, never overwriting a file there.
// When the project is the clone it switches off the archived FixFlow skills and agents the clone holds. It writes
// nothing else: never .claude/settings.json, never .gitignore (it prints the lines git should ignore), no git setting.
import { readFileSync, writeFileSync, existsSync, renameSync, rmSync, mkdirSync, readdirSync, statSync, realpathSync, copyFileSync, constants as fsConstants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative, basename } from 'node:path';

export const MARK = '--harness-kit';
export const EXE = process.platform === 'win32' ? '.exe' : '';
// The kit hooks, in the order they run (docs/program/harness-kit-2026-11-25/in/hooks-report.md): count-gate before
// fanout-gate, as on the owner's PC (count-gate's fix B2 reads a later hook's refusal).
export const KIT = [
  { event: 'SessionStart', matcher: null, hook: 'kit-start', program: 'kit-start' },
  { event: 'PreToolUse', matcher: '*', hook: 'window-ceiling', program: 'kit-window-ceiling' },
  { event: 'PreToolUse', matcher: '*', hook: 'tier-hook', program: 'kit-tier-hook' },
  { event: 'PreToolUse', matcher: 'Agent|Task|SendMessage', hook: 'count-gate', program: 'kit-count-gate' },
  { event: 'PreToolUse', matcher: 'Agent|Task', hook: 'fanout-gate', program: 'kit-fanout-gate', usage: true },
  { event: 'PreToolUse', matcher: 'Agent|Task', hook: 'creep-gate', program: 'kit-creep-gate' },
];
const NEEDS = ['.claude/hooks/tier-routes.json', 'harness-kit/rust/Cargo.toml', 'harness-kit/rust/Cargo.lock'];

export const programPath = (clone, program) => `${clone}/harness-kit/rust/target/release/${program}${EXE}`;
export function commandFor(clone, project, k, noUsage = false) {
  return `"${programPath(clone, k.program)}" ${MARK} "--clone=${clone}" "--project=${project}"${k.usage && noUsage ? ' --no-usage-tool' : ''}`;
}
// A kit entry holds the mark as a word anywhere in its command (old entries had it last, the programs' have it second).
export const isOurs = (h) => !!h && typeof h.command === 'string' && /(?:^|\s)--harness-kit(?=\s|$)/.test(h.command);
// Which kit hook a command runs: its first word's file name, kit-<hook>[.exe] or (old) <hook>.mjs.
export function hookOf(command) {
  const m = /^\s*(?:node\s+)?"([^"]+)"/.exec(String(command)) || /^\s*(?:node\s+)?(\S+)/.exec(String(command));
  if (!m) return null;
  const b = basename(m[1]).replace(/\.exe$/i, '').replace(/\.mjs$/, '');
  const k = KIT.find((x) => x.program === b || x.hook === b);
  return k ? k.hook : null;
}

// Take out every marked entry; drop groups and event lists that only the marked entries filled. Returns a new object.
export function stripKit(settings) {
  const s = JSON.parse(JSON.stringify(settings));
  if (!s.hooks || typeof s.hooks !== 'object' || Array.isArray(s.hooks)) return s;
  let took = false;
  for (const ev of Object.keys(s.hooks)) {
    const groups = s.hooks[ev];
    if (!Array.isArray(groups)) continue;
    const kept = [];
    for (const g of groups) {
      if (!g || !Array.isArray(g.hooks)) { kept.push(g); continue; }
      const hs = g.hooks.filter((h) => !isOurs(h));
      if (hs.length === g.hooks.length) { kept.push(g); continue; }
      took = true;
      if (hs.length) kept.push({ ...g, hooks: hs });
    }
    if (kept.length || kept.length === groups.length) s.hooks[ev] = kept;
    else delete s.hooks[ev]; // emptied by us
  }
  if (took && !Object.keys(s.hooks).length) delete s.hooks;
  return s;
}

export function addKit(settings, clone, project, noUsage = false) {
  const s = stripKit(settings);
  s.hooks = s.hooks && typeof s.hooks === 'object' ? s.hooks : {};
  for (const k of KIT) {
    if (!Array.isArray(s.hooks[k.event])) s.hooks[k.event] = [];
    const entry = { hooks: [{ type: 'command', command: commandFor(clone, project, k, noUsage) }] };
    s.hooks[k.event].push(k.matcher === null ? entry : { matcher: k.matcher, ...entry });
  }
  return s;
}

// ---- the archived FixFlow skills and agents: switched off as .claude/settings.json does on the owner's PC ----------------
// skillOverrides { "<skill folder>": "off" } for every folder under .claude/skills/, and permissions.deny "Agent(<name>)"
// for every .claude/agents/fixflow-*.md (its frontmatter name, else the file name), built at run time from the clone.
// Only when the project is the clone: another project's own skills are never touched. A lean-* name is never switched
// off. An entry she already has is left alone and is not ours; the entries this script added are recorded in
// env.HARNESS_KIT_OFF (a JSON string), and --remove takes out exactly those, if they still hold the value it set.
export const RECORD = 'HARNESS_KIT_OFF';
export function fixflowItems(rootAbs) {
  const skills = [], agents = [];
  const sd = join(rootAbs, '.claude', 'skills');
  try {
    for (const e of readdirSync(sd, { withFileTypes: true })) if (e.isDirectory() && !e.name.startsWith('lean-')) skills.push(e.name);
  } catch {}
  const ad = join(rootAbs, '.claude', 'agents');
  try {
    for (const f of readdirSync(ad)) {
      if (!/^fixflow-.*\.md$/.test(f)) continue;
      let name = f.replace(/\.md$/, '');
      try { const m = /^---\r?\n[\s\S]*?^name:\s*(\S+)\s*$/m.exec(readFileSync(join(ad, f), 'utf8')); if (m) name = m[1]; } catch {}
      if (!name.startsWith('lean-')) agents.push(name);
    }
  } catch {}
  return { skills: skills.sort(), agents: agents.sort() };
}
function readRecord(s) {
  try { const r = JSON.parse((s.env || {})[RECORD]); return { skills: r.skills || [], deny: r.deny || [] }; } catch { return null; }
}
export function stripOff(settings) {
  const s = JSON.parse(JSON.stringify(settings));
  const rec = readRecord(s);
  if (!rec) return s;
  if (s.skillOverrides && typeof s.skillOverrides === 'object') {
    for (const k of rec.skills) if (s.skillOverrides[k] === 'off') delete s.skillOverrides[k];
    if (!Object.keys(s.skillOverrides).length) delete s.skillOverrides;
  }
  if (s.permissions && Array.isArray(s.permissions.deny)) {
    s.permissions.deny = s.permissions.deny.filter((d) => !rec.deny.includes(d));
    if (!s.permissions.deny.length) delete s.permissions.deny;
    if (!Object.keys(s.permissions).length) delete s.permissions;
  }
  delete s.env[RECORD];
  if (!Object.keys(s.env).length) delete s.env;
  return s;
}
export function addOff(settings, items) {
  const s = stripOff(settings);
  const rec = { skills: [], deny: [] };
  if (items.skills.length) {
    s.skillOverrides = s.skillOverrides && typeof s.skillOverrides === 'object' ? s.skillOverrides : {};
    for (const k of items.skills) if (!(k in s.skillOverrides)) { s.skillOverrides[k] = 'off'; rec.skills.push(k); }
    if (!Object.keys(s.skillOverrides).length) delete s.skillOverrides;
  }
  if (items.agents.length) {
    s.permissions = s.permissions && typeof s.permissions === 'object' ? s.permissions : {};
    s.permissions.deny = Array.isArray(s.permissions.deny) ? s.permissions.deny : [];
    for (const a of items.agents) { const d = `Agent(${a})`; if (!s.permissions.deny.includes(d)) { s.permissions.deny.push(d); rec.deny.push(d); } }
    if (!s.permissions.deny.length) delete s.permissions.deny;
    if (!Object.keys(s.permissions).length) delete s.permissions;
  }
  if (rec.skills.length || rec.deny.length) { s.env = s.env && typeof s.env === 'object' ? s.env : {}; s.env[RECORD] = JSON.stringify(rec); }
  return s;
}

// The path as it goes into a command: forward slashes; refused if it holds a character the double quotes do not hold
// as itself in sh (", $, `, \) or a line break.
export function quotedPath(abs, what = "the clone's path") {
  const p = abs.replace(/\\/g, '/');
  if (/["$`\\\r\n]/.test(p)) return { error: `${what} ${p} holds a character (" $ \` \\ or a line break) that cannot stand inside double quotes in a hook command; use a plain path` };
  return { path: p };
}
export const quotedRoot = (abs) => quotedPath(abs);

// ---- the build ----------------------------------------------------------------------------------------------------------
// HARNESS_KIT_CARGO (tests only): a JSON list of words that stands in for "cargo".
function cargoWords() {
  try { const w = JSON.parse(process.env.HARNESS_KIT_CARGO || ''); if (Array.isArray(w) && w.length) return w.map(String); } catch {}
  return ['cargo'];
}
function cargo(args, rustDir, fetch, opts = {}) {
  const [cmd, ...pre] = cargoWords();
  const env = { ...process.env, CARGO_TARGET_DIR: join(rustDir, 'target') };
  if (!fetch) env.RUSTUP_AUTO_INSTALL = '0';
  return spawnSync(cmd, [...pre, ...args], { cwd: rustDir, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
}
function pinned(rustDir) {
  try { const m = /channel\s*=\s*"([^"]+)"/.exec(readFileSync(join(rustDir, 'rust-toolchain.toml'), 'utf8')); return m ? m[1] : null; } catch { return null; }
}
// { ok, version } or { ok: false, why } without downloading anything.
export function cargoState(rustDir) {
  const r = cargo(['--version'], rustDir, false);
  const pin = pinned(rustDir) || 'the pinned version';
  if (r.error) return { ok: false, why: `cargo was not found (${r.error.code || r.error.message}). Install Rust with rustup (https://rustup.rs; on macOS: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh), open a new terminal, and run this again; the toolchain ${pin} pinned in harness-kit/rust/rust-toolchain.toml is then installed by rustup for that folder (run with --fetch to let it download it).` };
  if (r.status !== 0) {
    const t = ((r.stderr || '') + (r.stdout || '')).trim();
    if (/toolchain|not installed|auto-install/i.test(t)) return { ok: false, toolchain: true, why: `the Rust toolchain ${pin} pinned in harness-kit/rust/rust-toolchain.toml is not installed. Run: rustup toolchain install ${pin} --profile minimal -c clippy -c rustfmt  (a download from static.rust-lang.org), or run this again with --fetch to let rustup install it. (${t.split('\n')[0].slice(0, 160)})` };
    return { ok: false, why: `cargo --version failed (exit ${r.status}): ${t.split('\n')[0].slice(0, 200)}` };
  }
  return { ok: true, version: (r.stdout || '').trim() };
}
// The crates Cargo.lock names that come from a registry: [{ name, version, source }].
export function lockedCrates(rustDir) {
  let text = '';
  try { text = readFileSync(join(rustDir, 'Cargo.lock'), 'utf8'); } catch { return []; }
  const out = [];
  for (const block of text.split(/\r?\n\[\[package\]\]\r?\n/).slice(1)) {
    const get = (k) => { const m = new RegExp(`^${k}\\s*=\\s*"([^"]*)"`, 'm').exec(block); return m ? m[1] : null; };
    const source = get('source');
    if (source && source.startsWith('registry+')) out.push({ name: get('name'), version: get('version'), source });
  }
  return out;
}
function newest(p) {
  let t = 0;
  let st;
  try { st = statSync(p); } catch { return 0; }
  if (!st.isDirectory()) return st.mtimeMs;
  for (const e of readdirSync(p, { withFileTypes: true })) {
    if (e.name === 'target' || e.name.startsWith('.')) continue;
    t = Math.max(t, newest(join(p, e.name)));
  }
  return t;
}
// For each kit program: built (the file exists) and fresh (newer than its crate, kit-core, Cargo.toml and Cargo.lock).
export function programState(cloneAbs, clone) {
  const rd = join(cloneAbs, 'harness-kit', 'rust');
  const common = Math.max(newest(join(rd, 'crates', 'kit-core')), newest(join(rd, 'Cargo.toml')), newest(join(rd, 'Cargo.lock')));
  return KIT.map((k) => {
    const file = programPath(clone, k.program);
    let built = false, mtime = 0;
    try { const st = statSync(file); built = st.isFile(); mtime = st.mtimeMs; } catch {}
    const src = Math.max(common, newest(join(rd, 'crates', k.program)));
    return { ...k, file, built, fresh: built && mtime >= src };
  });
}

// ---- the project's .harness/ --------------------------------------------------------------------------------------------
export const WIDTHS_TEXT = `# Declared widths and holds (read by the count gate, kit-count-gate)

This file declares nothing yet. Whatever it says, the count gate refuses a helper start that would pass the app's
limit of 20 helpers at once, helpers of helpers counted; a declaration here only narrows that.

A declaration is a line that starts at its first column (a "- " or "* " before it is allowed), in one of two forms:

    width "<pattern>" <n>: <reason>
    hold "<pattern>" while "<pattern>": <reason>

- The first form: at most n running helpers whose description matches the pattern.
- The second form: no new helper matching the first pattern starts while one matching the second runs.

A pattern is matched against a helper's whole description, case and runs of spaces ignored; * is any text and ? one
character. The reason names the plan line or the measurement it rests on, carries a number, and is 12 characters or
more. A line that starts like a declaration but does not parse makes the gate refuse every start until it is fixed or
removed. Indented and fenced lines, like the ones in this file, are examples and are not read. Remove a line to lift it.

Examples (indented, so not read):

    width "build:*" 4: four builders at once; the test queue has 4 slots (measured on this machine, date)
    hold "refute:*" while "build:*": a refuter reads the built files, so 1 build unit finishes first
`;
// What --apply makes under <project>/.harness: [{ rel, kind: 'file'|'dir', from?|text? }].
export function harnessItems(cloneAbs) {
  return [
    { rel: '.harness/kit.json', kind: 'file', from: join(cloneAbs, 'harness-kit', 'parallel', 'kit.example.json') },
    { rel: '.harness/WIDTHS.md', kind: 'file', text: WIDTHS_TEXT },
    { rel: '.harness/briefs', kind: 'dir' },
  ];
}
// Lines git should ignore in the project (checked with a sample path under each).
const IGNORE = [['.claude/settings.local.json', '.claude/settings.local.json'], ['.claude/logs/x', '.claude/logs/'],
  ['.harness/lane/x', '.harness/lane/'], ['.harness/lane-measure/x', '.harness/lane-measure/']];
function gitIgnored(root, rel) {
  const r = spawnSync('git', ['check-ignore', '-q', '--no-index', rel], { cwd: root, encoding: 'utf8' });
  if (r.error) return null; // git not found
  return r.status === 0 ? true : r.status === 1 ? false : null;
}
const sameDir = (a, b) => {
  const k = (p) => { let r = p; try { r = realpathSync.native(p); } catch {} r = resolve(r); return process.platform === 'linux' ? r : r.toLowerCase(); };
  return k(a) === k(b);
};
const fail = (msg) => { console.error('setup: ' + msg); process.exit(1); };
const USAGE = 'usage: node harness-kit/setup.mjs [--apply [--fetch] | --status | --remove] [--project <folder>] [--no-usage-tool]';

export function parseArgs(argv) {
  const o = { apply: false, remove: false, status: false, fetch: false, noUsage: false, project: null, bad: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') o.apply = true;
    else if (a === '--remove') o.remove = true;
    else if (a === '--status') o.status = true;
    else if (a === '--fetch') o.fetch = true;
    else if (a === '--no-usage-tool') o.noUsage = true;
    else if (a === '--project' && i + 1 < argv.length) o.project = argv[++i];
    else if (a.startsWith('--project=') && a.length > 10) o.project = a.slice(10);
    else o.bad.push(a);
  }
  if ([o.apply, o.remove, o.status].filter(Boolean).length > 1) o.bad.push('only one of --apply, --status, --remove');
  if (o.fetch && !o.apply) o.bad.push('--fetch goes with --apply');
  return o;
}

function readSettings(file, rel) {
  if (!existsSync(file)) return { before: {}, existed: false };
  const text = readFileSync(file, 'utf8');
  let before;
  try { before = text.trim() ? JSON.parse(text) : {}; } catch (e) { fail(`${rel} is not valid JSON (${e.message}); nothing changed. Fix or move it, then run again.`); }
  if (!before || typeof before !== 'object' || Array.isArray(before)) fail(`${rel} does not hold a JSON object; nothing changed.`);
  const h = before.hooks;
  if (h !== undefined && (!h || typeof h !== 'object' || Array.isArray(h) || Object.values(h).some((v) => !Array.isArray(v)))) {
    fail(`"hooks" in ${rel} is not an object of event lists; nothing changed.`);
  }
  const bad = [['skillOverrides', (v) => typeof v === 'object' && !Array.isArray(v)], ['permissions', (v) => typeof v === 'object' && !Array.isArray(v) && (v.deny === undefined || Array.isArray(v.deny))],
    ['env', (v) => typeof v === 'object' && !Array.isArray(v)]].filter(([k, ok]) => before[k] !== undefined && !(before[k] && ok(before[k])));
  if (bad.length) fail(`${bad.map((b) => '"' + b[0] + '"').join(', ')} in ${rel} has an unexpected shape; nothing changed.`);
  return { before, existed: true };
}
const kitEntries = (s) => Object.entries(s.hooks || {}).flatMap(([ev, gs]) => (Array.isArray(gs) ? gs : [])
  .flatMap((g) => ((g && Array.isArray(g.hooks)) ? g.hooks : []).filter(isOurs).map((h) => ({ event: ev, matcher: g.matcher ?? null, command: h.command, hook: hookOf(h.command) }))));

function status(o, cloneAbs, clone, projectAbs, project, file) {
  const { before, existed } = readSettings(file, file);
  const ents = kitEntries(before);
  const progs = programState(cloneAbs, clone);
  let bad = 0;
  console.log(`clone: ${clone}`);
  console.log(`project: ${project}`);
  console.log(`settings file: ${file.replace(/\\/g, '/')} (${existed ? 'exists' : 'missing'}); kit entries: ${ents.length}`);
  for (const k of KIT) {
    const mine = ents.filter((e) => e.hook === k.hook);
    const p = progs.find((x) => x.hook === k.hook);
    if (!mine.length) { bad++; console.log(`  ${k.hook.padEnd(15)} NOT WIRED`); continue; }
    for (const e of mine) {
      const m = /^\s*"([^"]+)"/.exec(e.command);
      const target = m ? m[1] : '';
      const exists = target && existsSync(target);
      const isProg = target === p.file;
      const okMatch = e.event === k.event && (e.matcher ?? null) === k.matcher;
      const state = !exists ? 'its program file is MISSING' : !isProg ? `runs ${target}, not the kit's program` : p.fresh ? 'built, newer than its sources' : 'built, OLDER than its sources (run --apply to rebuild)';
      if (!exists || !isProg || !p.fresh || !okMatch) bad++;
      console.log(`  ${k.hook.padEnd(15)} wired  ${e.event}${e.matcher === null ? '' : ` "${e.matcher}"`}${okMatch ? '' : ' (WRONG event or matcher)'}  ${state}${/--no-usage-tool/.test(e.command) ? '  --no-usage-tool' : ''}`);
    }
    if (mine.length > 1) { bad++; console.log(`  ${k.hook.padEnd(15)} wired ${mine.length} times`); }
  }
  for (const e of ents.filter((x) => !x.hook)) console.log(`  marked entry for no kit hook: ${e.command}`);
  for (const it of harnessItems(cloneAbs)) {
    const there = existsSync(join(projectAbs, it.rel));
    if (!there) bad++;
    console.log(`config ${it.rel}: ${there ? 'there' : 'MISSING'}`);
  }
  const r = readRecord(before);
  console.log(`FixFlow switched off by the kit: ${r ? `${r.skills.length} skills, ${r.deny.length} agents` : 'none'}`);
  console.log(bad ? `status: ${bad} thing(s) not as --apply leaves them.` : 'status: every kit hook is wired, built and fresh; the config is there.');
  process.exit(bad ? 1 : 0);
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.bad.length) { console.error(`setup: ${o.bad.join('; ')}\n${USAGE}`); process.exit(1); }
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) fail(`Node ${process.versions.node}; the set-up needs Node 20 or later.`);

  const cloneAbs = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const qc = quotedPath(cloneAbs);
  if (qc.error) fail(qc.error);
  const clone = qc.path;
  let projectAbs = cloneAbs;
  if (o.project !== null) {
    projectAbs = resolve(o.project);
    let st = null;
    try { st = statSync(projectAbs); } catch {}
    if (!st || !st.isDirectory()) fail(`the project ${projectAbs.replace(/\\/g, '/')} is not a folder; nothing changed.`);
  }
  const qp = quotedPath(projectAbs, "the project's path");
  if (qp.error) fail(qp.error);
  const project = qp.path;
  const isClone = sameDir(projectAbs, cloneAbs);
  const rustDir = join(cloneAbs, 'harness-kit', 'rust');
  const file = join(projectAbs, '.claude', 'settings.local.json');
  const rel = relative(process.cwd(), file) || file;
  if (o.status) return status(o, cloneAbs, clone, projectAbs, project, file);

  if (!o.remove) {
    const missing = NEEDS.filter((f) => !existsSync(join(cloneAbs, f)));
    if (missing.length) fail(`not found in ${clone}: ${missing.join(', ')}. Run this from a clone that holds the kit.`);
  }
  const { before, existed } = readSettings(file, rel);
  const items = o.remove || !isClone ? { skills: [], agents: [] } : fixflowItems(cloneAbs);
  const after = o.remove ? stripOff(stripKit(before)) : addOff(addKit(before, clone, project, o.noUsage), items);
  const offRec = (s) => readRecord(s) || { skills: [], deny: [] };

  console.log(`clone: ${clone}`);
  console.log(`project: ${project}${isClone ? ' (the clone)' : ''}`);
  console.log(`settings file: ${file.replace(/\\/g, '/')} (${existed ? 'exists, merged' : 'new'})`);

  if (o.remove) {
    const r = offRec(before);
    console.log(`kit entries found: ${kitEntries(before).length}; FixFlow switched off by the kit: ${r.skills.length} skills, ${r.deny.length} agents; all taken out, every other entry stays.`);
    console.log(`${project}/.harness/ is left as it is: it is yours (delete it by hand if you want it gone).`);
    if (!existed) { console.log('nothing to remove: no settings file.'); return; }
    if (!kitEntries(before).length && !readRecord(before)) { console.log('nothing to remove: no kit entries; the file is unchanged.'); return; }
    if (!Object.keys(after).length) { rmSync(file); console.log('removed: the file held only the kit entries, so it is deleted.'); return; }
    const tmp = file + '.harness-kit-tmp';
    writeFileSync(tmp, JSON.stringify(after, null, 2) + '\n');
    renameSync(tmp, file);
    console.log('removed: the kit entries are out.');
    return;
  }

  // ---- what would be wired ----
  const progs = programState(cloneAbs, clone);
  console.log(`kit entries: ${KIT.length} (marked ${MARK}; ${kitEntries(before).length} old ones replaced)${o.noUsage ? '; --no-usage-tool: the fan-out gate\'s meter rule is off' : ''}`);
  for (const k of KIT) {
    const p = progs.find((x) => x.hook === k.hook);
    console.log(`  ${k.event}${k.matcher === null ? '' : `  matcher "${k.matcher}"`}  ${commandFor(clone, project, k, o.noUsage)}`);
    console.log(`      program: ${p.built ? (p.fresh ? 'built, newer than its sources' : 'built, older than its sources') : 'not built'}`);
  }
  const r = offRec(after);
  if (isClone) {
    console.log(`archived FixFlow material switched off: ${r.skills.length} skills (skillOverrides "off"), ${r.deny.length} agents (permissions.deny)`
      + ` of ${items.skills.length} skill folders and ${items.agents.length} fixflow-* agents found; any you had set already are left as yours.`);
  } else console.log('FixFlow: the project is not the clone; there is nothing of the archived FixFlow material to switch off there.');
  const make = harnessItems(cloneAbs).filter((it) => !existsSync(join(projectAbs, it.rel)));
  console.log(make.length ? `to make in the project (never overwritten): ${make.map((it) => it.rel + (it.kind === 'dir' ? '/' : '')).join(', ')}` : 'the project\'s .harness/ already holds kit.json, WIDTHS.md and briefs/; nothing there is touched.');

  const cs = cargoState(rustDir);
  const buildArgs = ['build', '--release', '--locked', ...(o.fetch ? [] : ['--offline'])];
  console.log(cs.ok ? `cargo: ${cs.version}` : `cargo: ${cs.why}`);
  console.log(`build: cargo ${buildArgs.join(' ')}  (in ${clone}/harness-kit/rust, into its target/)`);

  for (const [path, line] of IGNORE) {
    const ig = gitIgnored(projectAbs, path);
    if (ig === false) console.log(`git does not ignore ${line}: add this line to the project's .gitignore (this script does not edit it):  ${line}`);
    else if (ig === null) console.log(`could not ask git whether ${line} is ignored in the project; make sure it is.`);
  }
  console.log('.harness/ (kit.json, WIDTHS.md, briefs/, state files) is yours to commit or not.');

  if (!o.apply) { console.log('dry run: nothing changed. Run with --apply to build and write it, --status to see what is wired, --remove to undo it.'); return; }

  // ---- --apply: build, check, write ----
  if (!cs.ok && !(cs.toolchain && o.fetch)) fail(`${cs.why}\nnothing changed.`);
  if (o.fetch) {
    const cr = lockedCrates(rustDir);
    console.log(`--fetch: cargo may download ${cr.length} crates that Cargo.lock names, from crates.io (${cr.map((c) => `${c.name} ${c.version}`).join(', ')}), and rustup the pinned toolchain if it is missing.`);
  }
  console.log('building the hook programs (the first build takes a minute or two) ...');
  const b = cargo(buildArgs, rustDir, o.fetch);
  if (b.error || b.status !== 0) {
    const t = ((b.stderr || '') + (b.stdout || '')).trim();
    const tail = t.split('\n').slice(-12).join('\n');
    if (!o.fetch && /offline|no matching package|failed to (?:download|load source)|toolchain .*not installed/i.test(t)) {
      const cr = lockedCrates(rustDir);
      fail(`the build needs something that is not on this machine (offline, nothing is downloaded):\n${tail}\n`
        + `Cargo.lock names ${cr.length} crates; they come from crates.io (${cr[0] ? cr[0].source : 'registry'}):\n`
        + cr.map((c) => `  ${c.name} ${c.version}`).join('\n')
        + `\nRun again with --apply --fetch to download them. Nothing changed.`);
    }
    fail(`the build failed (${b.error ? b.error.message : 'exit ' + b.status}):\n${tail}\nNothing changed.`);
  }
  const built = programState(cloneAbs, clone);
  const notBuilt = built.filter((p) => !p.built);
  if (notBuilt.length) fail(`the build ran but these programs are not there, so they are not wired: ${notBuilt.map((p) => p.file).join(', ')}. Nothing changed.`);
  console.log(`built: ${built.length} programs in ${clone}/harness-kit/rust/target/release`);

  mkdirSync(dirname(file), { recursive: true });
  const tmp = file + '.harness-kit-tmp';
  writeFileSync(tmp, JSON.stringify(after, null, 2) + '\n');
  renameSync(tmp, file);
  console.log(`wrote ${file.replace(/\\/g, '/')}`);
  for (const it of harnessItems(cloneAbs)) {
    const dest = join(projectAbs, it.rel);
    if (existsSync(dest)) continue;
    mkdirSync(it.kind === 'dir' ? dest : dirname(dest), { recursive: true });
    if (it.kind === 'file') {
      if (it.from) { if (!existsSync(it.from)) { console.log(`not made: ${it.rel} (its example ${it.from.replace(/\\/g, '/')} is missing)`); continue; } copyFileSync(it.from, dest, fsConstants.COPYFILE_EXCL); }
      else writeFileSync(dest, it.text, { flag: 'wx' });
    }
    console.log(`made: ${project}/${it.rel}${it.kind === 'dir' ? '/' : ''}`);
  }
  console.log('applied: start a new Claude Code session in the project for the hooks to load. Check it with --status.');
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) main();
