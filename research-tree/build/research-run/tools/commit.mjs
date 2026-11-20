// node commit.mjs <message> <path>...   (paths relative to the run root)
// git add and commit only those paths in the run's repository. Several fields commit into one repository at once:
// while .git/index.lock exists it waits and retries (up to 100 s). It removes the lock only when it is older than
// STALE_S and no git process is running. STALE_S = 30 s: measured in a scratch repo of 300 files, add + commit of two
// files took 162-198 ms (15 runs, 2026-11-21), so a lock held 30 s is over 150 times a commit, a crashed one's.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN } from './lib.mjs';

const STALE_S = Number(process.env.COMMIT_STALE_S) || 30;
const [msg, ...paths] = process.argv.slice(2);
if (!msg || !paths.length) { console.log('usage: node commit.mjs <message> <path>...'); process.exit(64); }
const git = (...a) => spawnSync('git', ['-c', 'core.longpaths=true', '-C', RUN, ...a], { encoding: 'utf8' });
const lock = path.join(RUN, '.git', 'index.lock');
const gitRunning = () => {
  const r = process.platform === 'win32'
    ? spawnSync('tasklist', ['/FI', 'IMAGENAME eq git.exe', '/NH'], { encoding: 'utf8' })
    : spawnSync('pgrep', ['-x', 'git'], { encoding: 'utf8' });
  return process.platform === 'win32' ? /git\.exe/i.test(r.stdout || '') : (r.stdout || '').trim() !== '';
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = line => { try { fs.mkdirSync(path.join(RUN, 'run'), { recursive: true }); fs.appendFileSync(path.join(RUN, 'run', 'commit.log'), `${new Date().toISOString()} ${line}\n`); } catch {} };
const done = (line, code = 0) => { log(line); console.log(line); process.exit(code); };

const end = Date.now() + 100000;
let removed = false, last = '';
while (Date.now() < end) {
  if (fs.existsSync(lock)) {
    let age = 0; try { age = (Date.now() - fs.statSync(lock).mtimeMs) / 1000; } catch {}
    if (age > STALE_S && !gitRunning()) { try { fs.unlinkSync(lock); removed = true; } catch {} }
    else { await sleep(300); continue; }
  }
  const a = git('add', '--', ...paths);
  if (a.status === 0) {
    const c = git('commit', '-m', msg, '--', ...paths);
    const text = (c.stdout || '') + (c.stderr || '');
    if (c.status === 0) {
      const h = git('rev-parse', '--short', 'HEAD').stdout.trim();
      done(`committed ${h}: ${paths.length} path(s)${removed ? ' (removed a stale index.lock)' : ''}`);
    }
    if (/nothing (added to commit|to commit)|no changes added/i.test(text)) done(`nothing to commit in ${paths.length} path(s)`);
    last = text;
  } else last = (a.stdout || '') + (a.stderr || '');
  if (!/index\.lock/.test(last)) done(`FAILED: ${last.trim().split('\n')[0]}`, 1);
  await sleep(300);
}
done(`FAILED: index.lock still held after 100 s ${last.trim().split('\n')[0]}`, 1);
