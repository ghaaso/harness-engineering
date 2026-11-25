
import fs from 'node:fs';
import path from 'node:path';
const argv = process.argv.slice(2);
const root = argv[argv.indexOf('--root') + 1];
const name = path.basename(process.argv[1]).replace(/\.mjs$/, '');
fs.appendFileSync(path.join(root, 'tmp', 'stub-calls.log'), JSON.stringify({ script: name, args: argv }) + '\n');
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(root, 'tmp', 'stub-config.json'), 'utf8')); } catch {}
if (cfg.hold && cfg.hold[name]) {
  const rel = path.join(root, 'tmp', 'release');
  const t0 = Date.now();
  while (!fs.existsSync(rel) && Date.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 50));
}
const code = (cfg.exit && cfg.exit[name]) ?? 0;
process.stdout.write(JSON.stringify({ ok: code === 0, script: name, mode: null, exit: code, code: 'stub', dry_run: false, result: {}, reasons: [], ledger_seq: [] }) + '\n');
process.exit(code);
