#!/usr/bin/env node
// harness-kit/setup.mjs: wires the kit hooks into this clone's per-machine settings file, .claude/settings.local.json.
//
//   node harness-kit/setup.mjs            prints what it would do, changes nothing
//   node harness-kit/setup.mjs --apply    does it
//   node harness-kit/setup.mjs --remove   takes out exactly the entries it added, nothing else
//
// Plain Node 20 or later, no dependency, runs from any folder: the clone is the folder above this script's own folder.
// Each command holds this machine's absolute path to the clone, resolved at run time, in the quoting style the owner's
// .claude/settings.json uses:  node "<clone>/.claude/hooks/<hook>.mjs"  (forward slashes, path in double quotes).
// The kit's own entries carry one trailing argument, --harness-kit, which marks them (none of the three hooks reads an
// argument it does not know); --remove takes out every hook entry whose command ends with that mark, drops a matcher
// group or event list left empty by it, and leaves every other key and entry as it was. --apply first takes out the
// marked entries, then adds them fresh, so running it twice or after moving the clone leaves one set with the right path.
// It never writes .claude/settings.json, never sets core.hooksPath, never touches a ref, and never edits .gitignore:
// if git does not ignore the settings file or the hooks' log folder, it prints the lines to add.
//
// The kit hooks and their matchers (as .claude/settings.json wires them on the owner's PC), in the order they run:
//   PreToolUse "*"           window-ceiling   a session or helper past its context line may only write its hand-over
//   PreToolUse "*"           tier-hook        a helper or child session must name its kind of job and the model routed to it
//   PreToolUse "Agent|Task"  creep-gate       no review panels, reviews of reviews, or repair rounds on small findings
// Why these three and not count-gate or fanout-gate: harness-kit/check-clone.mjs, which tests them in a clean clone.
import { readFileSync, writeFileSync, existsSync, renameSync, rmSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

export const MARK = '--harness-kit';
export const KIT = [
  { event: 'PreToolUse', matcher: '*', hook: 'window-ceiling' },
  { event: 'PreToolUse', matcher: '*', hook: 'tier-hook' },
  { event: 'PreToolUse', matcher: 'Agent|Task', hook: 'creep-gate' },
];
const NEEDS = ['.claude/hooks/tier-routes.json']; // read by tier-hook beside itself

export function commandFor(root, hook) {
  return `node "${root}/.claude/hooks/${hook}.mjs" ${MARK}`;
}
export const isOurs = (h) => !!h && typeof h.command === 'string' && h.command.trimEnd().endsWith(' ' + MARK);

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

export function addKit(settings, root) {
  const s = stripKit(settings);
  s.hooks = s.hooks && typeof s.hooks === 'object' ? s.hooks : {};
  for (const k of KIT) {
    if (!Array.isArray(s.hooks[k.event])) s.hooks[k.event] = [];
    s.hooks[k.event].push({ matcher: k.matcher, hooks: [{ type: 'command', command: commandFor(root, k.hook) }] });
  }
  return s;
}

function cloneRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..');
}
// The path as it goes into a command: forward slashes; refused if it holds a character the double quotes do not hold
// as itself in sh (", $, `, \) or a line break.
export function quotedRoot(abs) {
  const p = abs.replace(/\\/g, '/');
  if (/["$`\\\r\n]/.test(p)) return { error: `the clone's path ${p} holds a character (" $ \` \\ or a line break) that cannot stand inside double quotes in a hook command; move the clone to a plain path` };
  return { path: p };
}

function gitIgnored(root, rel) {
  const r = spawnSync('git', ['check-ignore', '-q', '--no-index', rel], { cwd: root, encoding: 'utf8' });
  if (r.error) return null; // git not found
  return r.status === 0 ? true : r.status === 1 ? false : null;
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply'), remove = args.includes('--remove');
  const unknown = args.filter((a) => !['--apply', '--remove'].includes(a));
  if (unknown.length || (apply && remove)) {
    console.error('usage: node harness-kit/setup.mjs [--apply | --remove]');
    process.exit(1);
  }
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) { console.error(`setup: Node ${process.versions.node}; the hooks need Node 20 or later.`); process.exit(1); }

  const rootAbs = cloneRoot();
  const q = quotedRoot(rootAbs);
  if (q.error) { console.error('setup: ' + q.error); process.exit(1); }
  const root = q.path;
  const file = join(rootAbs, '.claude', 'settings.local.json');
  const rel = relative(process.cwd(), file) || file;

  if (!remove) {
    const missing = [...KIT.map((k) => `.claude/hooks/${k.hook}.mjs`), ...NEEDS].filter((f) => !existsSync(join(rootAbs, f)));
    if (missing.length) { console.error(`setup: not found in ${root}: ${missing.join(', ')}. Run this from a clone that holds the hooks.`); process.exit(1); }
  }

  let before = {}, existed = existsSync(file);
  if (existed) {
    const text = readFileSync(file, 'utf8');
    try { before = text.trim() ? JSON.parse(text) : {}; } catch (e) {
      console.error(`setup: ${rel} is not valid JSON (${e.message}); nothing changed. Fix or move it, then run again.`);
      process.exit(1);
    }
    if (!before || typeof before !== 'object' || Array.isArray(before)) { console.error(`setup: ${rel} does not hold a JSON object; nothing changed.`); process.exit(1); }
    const h = before.hooks;
    if (h !== undefined && (!h || typeof h !== 'object' || Array.isArray(h) || Object.values(h).some((v) => !Array.isArray(v)))) {
      console.error(`setup: "hooks" in ${rel} is not an object of event lists; nothing changed.`);
      process.exit(1);
    }
  }
  const after = remove ? stripKit(before) : addKit(before, root);
  const ours = (s) => Object.values(s.hooks || {}).flat().flatMap((g) => (g && g.hooks) || []).filter(isOurs).length;

  console.log(`clone: ${root}`);
  console.log(`settings file: ${file.replace(/\\/g, '/')} (${existed ? 'exists, merged' : 'new'})`);
  if (remove) {
    console.log(`kit entries found: ${ours(before)}; they are taken out, every other entry stays.`);
  } else {
    console.log(`kit entries: ${KIT.length} (marked ${MARK}; ${ours(before)} old ones replaced)`);
    for (const k of KIT) console.log(`  ${k.event}  matcher "${k.matcher}"  ${commandFor(root, k.hook)}`);
  }

  for (const [path, line] of [['.claude/settings.local.json', '.claude/settings.local.json'], ['.claude/logs/x', '.claude/logs/']]) {
    const ig = gitIgnored(rootAbs, path);
    if (ig === false) console.log(`git does not ignore ${line}: add this line to .gitignore (this script does not edit it):  ${line}`);
    else if (ig === null) console.log(`could not ask git whether ${line} is ignored; make sure it is.`);
  }

  const doIt = apply || remove;
  if (!doIt) { console.log('dry run: nothing changed. Run with --apply to write it, --remove to undo it.'); return; }
  if (remove && !existed) { console.log('nothing to remove: no settings file.'); return; }
  if (remove && !ours(before)) { console.log('nothing to remove: no kit entries; the file is unchanged.'); return; }

  if (remove && !Object.keys(after).length) {
    rmSync(file);
    console.log('removed: the file held only the kit entries, so it is deleted.');
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  const tmp = file + '.harness-kit-tmp';
  writeFileSync(tmp, JSON.stringify(after, null, 2) + '\n');
  renameSync(tmp, file);
  console.log(remove ? 'removed: the kit entries are out.' : 'applied: start a new Claude Code session in this clone for the hooks to load.');
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) main();
