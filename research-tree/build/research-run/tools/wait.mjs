// node wait.mjs <unit> <seconds, at most 150> <file>...   (files relative to the run root, or absolute)
import fs from 'node:fs';
import path from 'node:path';
import { RUN, readConfig, tokensByUnit, M } from './lib.mjs';

const [unit, secs, ...files] = process.argv.slice(2);
const s = Number(secs);
if (!unit || !Number.isFinite(s) || s < 0 || !files.length) { console.log('usage: node wait.mjs <unit> <seconds <= 150> <file>...'); process.exit(64); }
if (s > 150) { console.log(`REFUSED ${unit}: ${s} s is over 150 s; call again with at most 150`); process.exit(2); }
const pollMs = Number(process.env.WAIT_POLL_MS) || 5000;
const missing = () => files.filter(f => !fs.existsSync(path.resolve(RUN, f)));
const end = Date.now() + s * 1000;
let m = missing();
while (m.length && Date.now() < end) {
  await new Promise(r => setTimeout(r, Math.min(pollMs, Math.max(0, end - Date.now()))));
  m = missing();
}
const cfg = readConfig();
const lim = cfg && cfg.units && cfg.units[unit] ? cfg.units[unit].limit_M : '?';
const u = tokensByUnit().get(unit);
const line = `${unit} done ${files.length - m.length}/${files.length}${m.length ? ' missing: ' + m.join(', ') : ''} | tokens ${M(u ? u.total : 0)} M of limit ${lim} M`;
try { fs.mkdirSync(path.join(RUN, 'run'), { recursive: true }); fs.appendFileSync(path.join(RUN, 'run', `wait-${unit}.log`), `${new Date().toISOString()} ${line}\n`); } catch {}
console.log(line);
