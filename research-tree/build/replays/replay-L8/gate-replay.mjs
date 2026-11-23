// gate-replay.mjs (replay-L8, Part B): run the clinic's own ruff and mypy on each commit's tree and its first parent.
// Read-only on the clinic repository: trees come out through `git archive` into work/tree (this folder).
// Checkers: the clinic's own .venv (ruff 0.13.3, mypy 1.19.1 strict + django-stubs), the commit's own pyproject.toml.
// Env for the django-stubs plugin: the repository's .env.example values (dummy settings; no database is reached).
// Usage: node gate-replay.mjs <commits-file> <out.jsonl> [worker]   (one sha per line; resumable: shas already in out are skipped)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const C = 'C:/Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop';
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
// Third pass (2026-11-23): a worker number gives each process its own tree and a fresh mypy cache per tree; the shared
// incremental cache kept plugin-added dependencies from other trees (stale results), so no cache is shared any more.
const W = process.argv[4] || '0';
const TREE = path.join(HERE, 'work', 'tree-' + W);
const CACHE = path.join(HERE, 'work', 'mypycache-' + W);
const [, , listFile, outFile] = process.argv;

// Fix of 2026-11-23 (second pass): each commit's own .env.example, not HEAD's. HEAD's CLINIC_MODULES made the
// django-stubs plugin look for apps an older tree does not have (104 trees failed: import-not-found clinic.imports.models).
function envFor(sha) {
const env = { ...process.env };
let ex;
try { ex = execFileSync('git', ['-C', C, 'show', `${sha}:.env.example`], { encoding: 'utf8' }); }
catch { ex = fs.readFileSync(path.join(C, '.env.example'), 'utf8'); }
for (const line of ex.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
return env;
}
let env;
const git = (...a) => execFileSync('git', ['-C', C, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const done = new Set();
if (fs.existsSync(outFile)) for (const l of fs.readFileSync(outFile, 'utf8').split('\n')) if (l) done.add(JSON.parse(l).sha);

function extract(sha) {
  fs.rmSync(TREE, { recursive: true, force: true });
  fs.mkdirSync(TREE, { recursive: true });
  const paths = ['pyproject.toml', 'src', 'scripts'].filter((p) => spawnSync('git', ['-C', C, 'cat-file', '-e', `${sha}:${p}`]).status === 0);
  const tar = path.join(HERE, 'work', 'tree-' + W + '.tar');
  execFileSync('git', ['-C', C, 'archive', '-o', tar, sha, ...paths]);
  execFileSync('tar', ['-xf', '../tree-' + W + '.tar'], { cwd: TREE }); // relative: GNU tar reads "C:" as a remote host
}
function run(exe, args) {
  const r = spawnSync(path.join(C, '.venv/Scripts', exe), args, { cwd: TREE, env, encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 26 });
  return { rc: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
const shas = fs.readFileSync(listFile, 'utf8').split(/\s+/).filter(Boolean);
for (const sha of shas) {
  if (done.has(sha)) continue;
  const t0 = Date.now();
  extract(sha);
  env = envFor(sha);
  fs.rmSync(CACHE, { recursive: true, force: true });
  const mypy = run('mypy.exe', ['--cache-dir', CACHE, '--show-error-codes', '--no-error-summary', '--no-color-output']);
  const ruff = run('ruff.exe', ['check', '--output-format', 'concise', '--no-cache', '.']);
  const fmt = run('ruff.exe', ['format', '--check', '--no-cache', '.']);
  const rec = { sha, secs: Math.round((Date.now() - t0) / 1000), mypy, ruff, fmt };
  fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');
  console.log(sha, rec.secs, 'mypy', mypy.rc, 'ruff', ruff.rc, 'fmt', fmt.rc);
}
