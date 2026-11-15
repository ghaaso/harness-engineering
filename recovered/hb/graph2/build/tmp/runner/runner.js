'use strict';
// Held-out runner. Runs the entries of results/frozen/PLAN.json exactly as written, in the plan's container
// template, lock_check first. At most two containers at once, never two on one named volume, entries of one
// arm in the order of n. Restart-safe: complete answer files are skipped; an entry cut off by an interruption
// (marker, .part, or a logged non-refused run without a complete file) is repeated with --repeat --reason
// interrupted. A run that ends with an error or a refusal is NOT repeated: its arm stops and it is reported.
// usage: node runner.js [--dry]
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const { spawn, execFileSync } = require('child_process');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const R = path.join(B, 'tmp', 'runner');
const BASH = 'C:\\Program Files\\Git\\usr\\bin\\bash.exe';
const DRY = process.argv.includes('--dry');
const plan = JSON.parse(fs.readFileSync(path.join(B, 'results/frozen/PLAN.json'), 'utf8'));
if (plan.tq_hold && plan.tq_hold.hold) { console.error('tq_hold is true: no entry runs'); process.exit(2); }
const entries = [...plan.runs, ...plan.question_runs].sort((a, b) => a.n - b.n);
const progF = path.join(R, 'progress.json');
const logDir = path.join(R, 'logs'); fs.mkdirSync(logDir, { recursive: true });
let prog = fs.existsSync(progF) ? JSON.parse(fs.readFileSync(progF, 'utf8')) : { started: new Date().toISOString(), entries: {} };
const save = () => { prog.updated = new Date().toISOString(); fs.writeFileSync(progF + '.tmp', JSON.stringify(prog, null, 1)); fs.renameSync(progF + '.tmp', progF); };
const log = (m) => { const l = new Date().toISOString() + ' ' + m; console.log(l); fs.appendFileSync(path.join(R, 'runner.log'), l + '\n'); };

const expected = (e) => e.expected_tasks || e.expected_questions;
const relOut = (e) => e.out.replace(/^results\//, '');
function countLines(file) {
  let buf = fs.readFileSync(file);
  if (file.endsWith('.gz')) buf = zlib.gunzipSync(buf);
  return buf.toString('utf8').split('\n').filter(Boolean).length;
}
function readRuns() {
  const f = path.join(B, 'results/heldout/runs.jsonl');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (x) { return { bad: l }; } });
}
function state(e) {
  const out = path.join(B, e.out);
  const marker = path.join(B, 'results/heldout/_running', relOut(e).replace(/\//g, '__') + '.json');
  const file = fs.existsSync(out); const part = fs.existsSync(out + '.part'); const mk = fs.existsSync(marker);
  const runs = readRuns().filter((r) => r.out === relOut(e));
  const nonRefused = runs.filter((r) => r.exit !== 'refused');
  let lines = null; if (file) { try { lines = countLines(out); } catch (x) { lines = -1; } }
  if (file && lines === expected(e) && !mk && !part) return { s: 'done', lines, runs };
  if (nonRefused.some((r) => r.exit === 'error')) return { s: 'error', lines, runs };
  if (file || part || mk || nonRefused.length) return { s: 'interrupted', lines, runs, file, part, mk };
  if (runs.some((r) => r.exit === 'refused')) return { s: 'refused-before', runs };
  return { s: 'new' };
}
function dockerCmd(e, repeat) {
  let lc = e.lock_check; let cmd = e.command;
  if (repeat) { lc += ' --repeat --reason interrupted'; cmd += ' --repeat --reason interrupted'; }
  return plan.container.template.replace('<build root>', plan.container.build_root).replace('<volume>', e.volume)
    .replace('<lock_check>', lc).replace('<command>', cmd);
}
function graphContainers() {
  const o = execFileSync('docker', ['ps', '--filter', 'ancestor=graphtest:1', '--format', '{{.ID}}']).toString().trim();
  return o ? o.split('\n') : [];
}

const busyArm = new Set(); const busyVol = new Set(); const stoppedArm = new Set(); let running = 0;
function runEntry(e, repeat) {
  return new Promise((resolve) => {
    const cmd = dockerCmd(e, repeat);
    const lf = path.join(logDir, 'n' + String(e.n).padStart(2, '0') + (repeat ? '.repeat' + Date.now() : '') + '.log');
    const t0 = Date.now(); const runsBefore = readRuns().length;
    prog.entries[e.n] = Object.assign(prog.entries[e.n] || {}, { n: e.n, arm: e.arm, role: e.role, set: e.set, draw: e.draw, status: 'running', start: new Date(t0).toISOString(), repeat: !!repeat, log: path.relative(B, lf).replace(/\\/g, '/'), cmd });
    save();
    log('start n=' + e.n + ' ' + e.arm + ' ' + e.role + ' ' + e.set + ' draw ' + (e.draw || 0) + (repeat ? ' REPEAT interrupted' : ''));
    const fd = fs.openSync(lf, 'w'); fs.writeSync(fd, '$ ' + cmd + '\n');
    const p = spawn(BASH, ['-c', cmd], { stdio: ['ignore', fd, fd], windowsHide: true });
    p.on('close', (code) => {
      fs.closeSync(fd);
      const wall = (Date.now() - t0) / 1000;
      const text = fs.readFileSync(lf, 'utf8');
      const allowed = /^allowed\s*$/m.test(text);
      const refusedLine = (text.match(/^refused:.*$/m) || [null])[0];
      const st = state(e);
      const newRuns = readRuns().slice(runsBefore).filter((r) => r.out === relOut(e));
      const rec = prog.entries[e.n];
      Object.assign(rec, { end: new Date().toISOString(), wall_s: Math.round(wall * 10) / 10, docker_exit: code, lock_allowed: allowed, refused: refusedLine, lines: st.lines, expected: expected(e), runs_lines: newRuns.map((r) => ({ exit: r.exit, repeat: r.repeat, reason: r.reason, n_tasks: r.n_tasks, error: r.error, refusal: r.refusal })) });
      const okLog = newRuns.length === 1 && newRuns[0].exit === 'ok' && newRuns[0].repeat === (repeat ? newRuns[0].repeat : 0);
      if (code === 0 && allowed && st.s === 'done' && okLog) rec.status = 'done';
      else { rec.status = 'failed'; stoppedArm.add(e.arm); }
      save();
      log('end n=' + e.n + ' status=' + rec.status + ' exit=' + code + ' lines=' + st.lines + '/' + expected(e) + ' wall=' + rec.wall_s + 's' + (refusedLine ? ' ' + refusedLine : ''));
      resolve();
    });
  });
}

async function main() {
  const gc = graphContainers();
  if (gc.length) { log('graphtest containers already running: ' + gc.join(',') + ' -- wait for them before starting'); process.exit(4); }
  const todo = [];
  for (const e of entries) {
    const st = state(e);
    if (st.s === 'done') {
      if (!prog.entries[e.n] || prog.entries[e.n].status !== 'done') { prog.entries[e.n] = Object.assign(prog.entries[e.n] || {}, { n: e.n, arm: e.arm, status: 'done', lines: st.lines, found_at_restart: true }); }
      continue;
    }
    if (st.s === 'error' || st.s === 'refused-before') { log('n=' + e.n + ' has a logged ' + st.s + '; not repeated automatically; arm ' + e.arm + ' stops'); prog.entries[e.n] = Object.assign(prog.entries[e.n] || {}, { n: e.n, arm: e.arm, status: 'failed', state: st.s }); stoppedArm.add(e.arm); continue; }
    todo.push({ e, repeat: st.s === 'interrupted' });
  }
  save();
  log('to run: ' + todo.length + ' (' + todo.filter((t) => t.repeat).length + ' as interrupted repeats); done already: ' + (entries.length - todo.length));
  if (DRY) { for (const t of todo) console.log(t.e.n, t.repeat ? 'REPEAT' : '', dockerCmd(t.e, t.repeat)); return; }
  await new Promise((resolveAll) => {
    const tick = () => {
      while (running < 2) {
        const idx = todo.findIndex((t) => !busyArm.has(t.e.arm) && !busyVol.has(t.e.volume) && !stoppedArm.has(t.e.arm)
          && !todo.some((u) => u.e.arm === t.e.arm && u.e.n < t.e.n));
        if (idx < 0) break;
        const t = todo.splice(idx, 1)[0];
        busyArm.add(t.e.arm); busyVol.add(t.e.volume); running++;
        runEntry(t.e, t.repeat).then(() => { busyArm.delete(t.e.arm); busyVol.delete(t.e.volume); running--; tick(); });
      }
      if (running === 0) {
        const left = todo.filter((t) => true);
        if (left.length) log('not run (arm stopped after a failure): ' + left.map((t) => t.e.n).join(','));
        resolveAll();
      }
    };
    tick();
  });
  prog.finished = new Date().toISOString(); save();
  log('runner finished');
}
main().catch((x) => { log('runner crash: ' + (x && x.stack)); process.exit(1); });
