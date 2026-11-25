// tools/promote.mjs: puts proven pieces of this side on a new local branch cut from origin/main, ready for a pull request
// the owner approves (unit of 2026-11-25, brief docs/program/repo-organisation-2026-11-25/briefs/PROMOTE.md; OWNERS.json).
//
//   node tools/promote.mjs <entries.json>            dry run: checks everything, prints what it would do, changes nothing
//   node tools/promote.mjs <entries.json> --apply    does it
//
// Entries file: { "branch": "bilal/promote-<name>", "from": "bilal/build", "entries": [ { "name", "what", "number",
//   "measure", "gain", "records": [ids], "paths": [git pathspecs], "replaces"?: true } ] }.
// A promotion only ADDS files to main and a row to PROVEN.md. It refuses the whole input at the first fault when
//   a. a record id is not in library/journal/*/*.jsonl, or no record of an entry is measured or observed;
//   b. the branch does not start with a branch pattern of this_pc's person in OWNERS.json, or already exists;
//   c. an entry's paths give no file, or a file that belongs to another person in OWNERS.json, is archived evidence
//      (recovered/, docs/program/evidence/, the two migration manifests), or exists on origin/main with other content
//      (unless the entry says "replaces": true).
// Then: a temporary worktree outside the repository on a new branch from origin/main; the files are taken from <from>;
// PROVEN.md is written; exactly those files are committed (the pre-commit check runs). The worktree is removed and the
// branch stays, local. It never pushes, never opens a pull request, never touches main.
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const say = (s) => process.stdout.write(s + '\n');
function fail(msg) { process.stderr.write('promote: ' + msg + '\n'); process.exit(1); }

const named = argv.find((a) => !a.startsWith('--'));
if (!named) fail('usage: node tools/promote.mjs <entries.json> [--apply]');

const run = (args, o = {}) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'], ...o });
let top;
try { top = run(['rev-parse', '--show-toplevel']).trim(); } catch { fail('not inside a git checkout.'); }
const git = (args, o = {}) => run(args, { cwd: top, ...o });
const tryGit = (args, o) => { try { return git(args, o); } catch { return null; } };

// ---- input
let input;
try { input = JSON.parse(readFileSync(resolve(named), 'utf8').replace(/^﻿/, '')); } catch (e) { fail(`cannot read the entries (${e.message}).`); }
const { branch, from, entries } = input;
if (typeof branch !== 'string' || !branch) fail('"branch" is missing.');
if (typeof from !== 'string' || !from) fail('"from" is missing.');
if (!Array.isArray(entries) || !entries.length) fail('"entries" is missing or empty.');
const names = new Set();
for (const [i, e] of entries.entries()) {
  for (const k of ['name', 'what', 'number', 'measure', 'gain']) if (typeof e[k] !== 'string' || !e[k].trim()) fail(`entry ${i + 1}: "${k}" is missing.`);
  if (!Array.isArray(e.records) || !e.records.length) fail(`entry "${e.name}": "records" is missing.`);
  if (!Array.isArray(e.paths) || !e.paths.length) fail(`entry "${e.name}": "paths" is missing.`);
  if (names.has(e.name)) fail(`entry name "${e.name}" is given twice.`);
  names.add(e.name);
}
if (tryGit(['rev-parse', '--verify', '--quiet', from + '^{commit}']) === null) fail(`the ref "${from}" does not exist.`);
if (tryGit(['rev-parse', '--verify', '--quiet', 'origin/main^{commit}']) === null) fail('origin/main does not exist here.');

// A file from the working folder, else from the "from" ref.
const readHere = (rel) => { const p = join(top, ...rel.split('/')); if (existsSync(p)) return readFileSync(p, 'utf8'); return tryGit(['show', `${from}:${rel}`]); };

// ---- a. records
const status = new Map(); // id -> set of statuses
const addLines = (text) => {
  for (const l of text.split(/\r?\n/)) {
    if (!l.trim()) continue;
    try { const r = JSON.parse(l); if (r && r.id) { if (!status.has(r.id)) status.set(r.id, new Set()); status.get(r.id).add(r.status); } } catch {}
  }
};
for (const f of (tryGit(['ls-tree', '-r', '--name-only', from, '--', 'library/journal']) || '').split('\n')) {
  if (/^library\/journal\/[^/]+\/[^/]+\.jsonl$/.test(f)) addLines(tryGit(['show', `${from}:${f}`]) || '');
}
const jdir = join(top, 'library', 'journal');
if (existsSync(jdir)) {
  const { readdirSync } = await import('node:fs');
  for (const d of readdirSync(jdir, { withFileTypes: true })) if (d.isDirectory()) for (const f of readdirSync(join(jdir, d.name))) if (f.endsWith('.jsonl')) addLines(readFileSync(join(jdir, d.name, f), 'utf8'));
}
for (const e of entries) {
  const missing = e.records.filter((id) => !status.has(id));
  if (missing.length) fail(`entry "${e.name}": record(s) not in library/journal: ${missing.join(', ')}.`);
  if (!e.records.some((id) => [...status.get(id)].some((s) => s === 'measured' || s === 'observed'))) fail(`entry "${e.name}": none of its records has status measured or observed (${e.records.join(', ')}).`);
}

// ---- b. branch
const ownersText = readHere('OWNERS.json');
if (!ownersText) fail('OWNERS.json cannot be read.');
let owners;
try { owners = JSON.parse(ownersText); } catch { fail('OWNERS.json is not JSON.'); }
const me = owners.people && owners.people[owners.this_pc];
if (!me) fail('this_pc in OWNERS.json names nobody.');
const globRe = (g) => new RegExp('^' + g.split('**').map((p) => p.split('*').map((q) => q.replace(/[.+^${}()|[\]\\?]/g, '\\$&')).join('[^/]*')).join('.*') + '$');
if (!(me.branches || []).some((g) => globRe(g).test(branch))) fail(`branch "${branch}" does not start with a branch pattern of ${owners.this_pc} (${(me.branches || []).join(', ')}).`);
if (tryGit(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]) !== null || tryGit(['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}`]) !== null) fail(`branch "${branch}" exists already.`);

// ---- c. files
const tmpRoots = [];
const cleanup = () => { for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }); } catch {} } };
const tmpIdx = mkdtempSync(join(tmpdir(), 'promote-idx-')); tmpRoots.push(tmpIdx);
const idxEnv = { ...process.env, GIT_INDEX_FILE: join(tmpIdx, 'index') };
git(['read-tree', from], { env: idxEnv });
const fromBlobs = new Map(); // path -> blob, of every file of `from`, for the later checkout check
const lsFiles = (specs) => {
  const out = git(['ls-files', '-s', '-z', '--', ...specs], { env: idxEnv });
  return out.split('\0').filter(Boolean).map((l) => { const m = /^\d+ ([0-9a-f]+) \d\t(.*)$/s.exec(l); return { blob: m[1], path: m[2] }; });
};
const mainBlobs = new Map();
for (const l of git(['ls-tree', '-r', '-z', 'origin/main']).split('\0').filter(Boolean)) { const m = /^\d+ blob ([0-9a-f]+)\t(.*)$/s.exec(l); if (m) mainBlobs.set(m[2], m[1]); }

const archived = new Set();
for (const [f, pick] of [['source-manifest.json', (m) => m], ['clinic-manifest.json', (m) => m.files || []]]) {
  const t = readHere('migration/' + f);
  if (!t) fail(`migration/${f} cannot be read, so archived evidence cannot be told (fails closed).`);
  try { for (const x of pick(JSON.parse(t))) archived.add(String(x.path).toLowerCase()); } catch { fail(`migration/${f} is not readable JSON.`); }
}
const isArchived = (p) => { const l = p.toLowerCase(); return l.startsWith('recovered/') || l.startsWith('docs/program/evidence/') || archived.has(l); };
const others = [];
for (const [who, p] of Object.entries(owners.people)) if (who !== owners.this_pc) for (const g of p.paths || []) if (!/^everything/i.test(g)) others.push({ who, g, re: globRe(g), prefix: g.replace(/\/?\*\*$/, '') });
const ofOther = (path) => others.find((o) => o.re.test(path) || path === o.prefix || path.startsWith(o.prefix + '/'));

const plan = []; // { entry, files: [{path, blob}] }
const taken = new Map(); // path -> entry name
for (const e of entries) {
  let files;
  try { files = lsFiles(e.paths); } catch (err) { fail(`entry "${e.name}": the paths do not resolve (${String(err.stderr || err.message).trim()}).`); }
  if (!files.length) fail(`entry "${e.name}": its paths give no file.`);
  const bad = { other: [], archived: [], changed: [] };
  for (const f of files) {
    const o = ofOther(f.path);
    if (o) bad.other.push(`${f.path} (${o.who}'s: ${o.g})`);
    if (isArchived(f.path)) bad.archived.push(f.path);
    if (mainBlobs.has(f.path) && mainBlobs.get(f.path) !== f.blob && !e.replaces) bad.changed.push(f.path);
  }
  const show = (a) => a.slice(0, 20).join('\n    ') + (a.length > 20 ? `\n    ... and ${a.length - 20} more` : '');
  const msgs = [];
  if (bad.other.length) msgs.push(`${bad.other.length} file(s) belong to another person:\n    ${show(bad.other)}`);
  if (bad.archived.length) msgs.push(`${bad.archived.length} file(s) are archived evidence:\n    ${show(bad.archived)}`);
  if (bad.changed.length) msgs.push(`${bad.changed.length} file(s) exist on origin/main with different content (the owner looks at these himself; "replaces": true allows it):\n    ${show(bad.changed)}`);
  if (msgs.length) { cleanup(); fail(`entry "${e.name}" is refused:\n  ` + msgs.join('\n  ')); }
  for (const f of files) { if (!taken.has(f.path)) taken.set(f.path, e.name); fromBlobs.set(f.path, f.blob); }
  plan.push({ entry: e, files });
}
const allPaths = [...taken.keys()];
const newCount = allPaths.filter((p) => !mainBlobs.has(p)).length;

say(`promote: ${APPLY ? 'APPLY' : 'dry run'}: branch ${branch} from origin/main, files taken from ${from}`);
for (const { entry, files } of plan) say(`  ${entry.name}: ${files.length} file(s), records ${entry.records.join(', ')}`);
say(`  ${allPaths.length} file(s) in all (${newCount} new, ${allPaths.length - newCount} already identical on origin/main), plus PROVEN.md`);
if (!APPLY) { cleanup(); say('dry run: nothing was changed. Add --apply to do it.'); process.exit(0); }

// ---- d. worktree, files, PROVEN.md, commit
const wtParent = mkdtempSync(join(tmpdir(), 'promote-wt-')); tmpRoots.push(wtParent);
const wt = join(wtParent, 'tree');
let made = false;
const undo = () => { if (made) { tryGit(['worktree', 'remove', '--force', wt]); tryGit(['branch', '-D', branch]); } cleanup(); };
try {
  git(['worktree', 'add', '--no-track', wt, '-b', branch, 'origin/main']); made = true;
  const inWt = (args) => run(args, { cwd: wt });
  // checkout in chunks (command line length)
  for (let i = 0; i < allPaths.length; i += 200) inWt(['checkout', from, '--', ...allPaths.slice(i, i + 200)]);

  const today = new Date().toISOString().slice(0, 10);
  const pp = join(wt, 'PROVEN.md');
  const head = ['# What is proven', '',
    'This list holds the pieces of this repository that have a record with a number behind them; each arrived through a pull request the owner approved.',
    'Everything else of this side is on `bilal/build`, and the folders of the archive stay here as evidence.', '',
    '| piece | what it is | its number | which measure | gain measured | records | promoted on |',
    '| --- | --- | --- | --- | --- | --- | --- |'];
  let rows = [];
  if (existsSync(pp)) {
    const old = readFileSync(pp, 'utf8').split(/\r?\n/);
    rows = old.filter((l) => l.startsWith('|') && !/^\|\s*(piece|---)/.test(l));
  }
  const cell = (s) => String(s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  for (const { entry: e } of plan) {
    const row = `| ${[e.name, e.what, e.number, e.measure, e.gain, e.records.join(', '), today].map(cell).join(' | ')} |`;
    const key = cell(e.name);
    const at = rows.findIndex((r) => r.split('|')[1].trim() === key);
    if (at >= 0) rows[at] = row; else rows.push(row);
  }
  writeFileSync(pp, [...head, ...rows, ''].join('\n'));

  inWt(['add', '--', 'PROVEN.md', ...[]]);
  for (let i = 0; i < allPaths.length; i += 200) inWt(['add', '--', ...allPaths.slice(i, i + 200)]);
  const msg = `Promote: ${plan.map((p) => p.entry.name).join(', ')}\n\n` + plan.map((p) => `${p.entry.name}: ${p.entry.records.join(', ')}`).join('\n') + '\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n';
  const mf = join(wtParent, 'msg.txt'); writeFileSync(mf, msg);
  try { inWt(['commit', '-F', mf]); } catch (err) {
    const text = String(err.stdout || '') + String(err.stderr || '') || err.message;
    undo(); fail('the commit was refused; the worktree and the branch are removed. Its message:\n' + text);
  }
  // exactly the named files plus PROVEN.md?
  const changed = inWt(['diff', '--name-only', 'origin/main', 'HEAD']).split('\n').filter(Boolean).sort();
  const want = new Set([...allPaths.filter((p) => mainBlobs.get(p) !== fromBlobs.get(p)), 'PROVEN.md']);
  const extra = changed.filter((p) => !want.has(p));
  if (extra.length) { undo(); fail('the commit holds files that were not named: ' + extra.join(', ')); }
  git(['worktree', 'remove', '--force', wt]); made = false;
  cleanup();
  say(`promote: done. Branch ${branch} (local, not pushed): ${changed.length} file(s) changed against origin/main, PROVEN.md among them.`);
  say('Next, in the owner\'s session:');
  say(`  git push -u origin ${branch}`);
  say(`  gh pr create --base main --head ${branch} --title "Promote: ${plan.map((p) => p.entry.name).join(', ')}" --body "<the numbers from PROVEN.md>"`);
} catch (err) {
  undo();
  fail(`failed, nothing left behind: ${String(err.stderr || err.message).trim()}`);
}
