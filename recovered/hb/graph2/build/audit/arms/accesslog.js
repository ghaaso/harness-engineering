'use strict';
// Preload (node -r ./accesslog.js ...): logs every distinct file path the process touches through fs
// and every child process it starts, to ACCESS_LOG (one JSON line each). Used by the leakage check.
// Writes through a raw fd taken before patching, so logging never re-enters the patched functions.
const fs = require('fs');
const cp = require('child_process');
const Module = require('module');
const fd = fs.openSync(process.env.ACCESS_LOG, 'a');
const writeSync = fs.writeSync.bind(fs);
const seen = new Set();
const log = (o) => { const s = JSON.stringify(o); if (seen.has(s)) return; seen.add(s); try { writeSync(fd, s + '\n'); } catch (e) { /* ignore */ } };
const norm = (p) => String(p && p.href ? p.href : p).split('\\').join('/');
for (const fn of ['readFileSync', 'openSync', 'readdirSync', 'existsSync', 'statSync', 'createReadStream', 'writeFileSync', 'createWriteStream', 'mkdirSync', 'rmSync', 'renameSync', 'copyFileSync', 'lstatSync', 'appendFileSync']) {
  const orig = fs[fn];
  if (typeof orig !== 'function') continue;
  fs[fn] = function (p, ...rest) { if (typeof p === 'string' || Buffer.isBuffer(p) || (p && p.href)) log({ op: 'fs.' + fn, path: norm(p) }); return orig.call(this, p, ...rest); };
}
for (const fn of ['execFileSync', 'execSync', 'spawnSync', 'spawn', 'execFile', 'exec']) {
  const orig = cp[fn];
  cp[fn] = function (cmd, args, ...rest) { log({ op: 'cp.' + fn, cmd: String(cmd), args: Array.isArray(args) ? args.map(String) : null }); return orig.call(this, cmd, args, ...rest); };
}
const origLoad = Module._load;
Module._load = function (req) {
  const m = origLoad.apply(this, arguments);
  if (req === 'node:sqlite' && !m.__wrapped) {
    const D = m.DatabaseSync;
    class W extends D { constructor(f, ...r) { log({ op: 'sqlite.open', path: norm(f) }); super(f, ...r); } }
    return { ...m, DatabaseSync: W, __wrapped: true };
  }
  return m;
};
