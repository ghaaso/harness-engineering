'use strict';
// Check 6 (audit-selection lane): held-out runs attempted WITHOUT the arm's frozen hash must be refused.
// Never passes a frozen configuration together with its own hash. Before each attempt that passes a
// configuration's own hash, it confirms that hash was never frozen (so the lock must refuse it).
// Inside graphtest:1:  node lock_check.js   -> JSON on stdout
const { spawnSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const B = '/build';
const H = require(B + '/arms/common/harness');
const OUT = '/build/tmp/audit-selection/lock_out';
const FROZEN = { relational: 'hops=4', reference: 'hops=4', search: 'pad=CO rounds=1 routes=off', ladybug: 'hops=4', duckpgq: 'hops=4', 'floor-dir': 'gran=file form=signature', 'floor-co': 'gran=file form=signature' };
const OTHER = { relational: 'base', reference: 'base', search: 'base', ladybug: 'base', duckpgq: 'base', 'floor-dir': 'gran=file form=snippet', 'floor-co': 'gran=file form=snippet' };
const res = [];
function attempt(arm, label, args) {
  const r = spawnSync('node', [B + '/arms/common/run.js', ...args, '--out', OUT], { encoding: 'utf8', timeout: 120000 });
  const msg = (r.stderr || '').trim().split('\n').pop();
  res.push({ arm, label, args: args.join(' '), exit: r.status, refused: r.status !== 0 && /REFUSED/.test(r.stderr || ''), message: msg });
}
for (const arm of Object.keys(FROZEN)) {
  const L = H.loadArmList(arm, 1, false).list;
  const other = L.find((c) => c.name === OTHER[arm]);
  const frozenCfg = L.find((c) => c.name === FROZEN[arm]);
  attempt(arm, 'frozen config, no flags', ['run', '--arm', arm, '--config', FROZEN[arm], '--sets', 'T1', '--split', 'heldout']);
  attempt(arm, 'frozen config, --allow-heldout, no hash', ['run', '--arm', arm, '--config', FROZEN[arm], '--sets', 'T1', '--split', 'heldout', '--allow-heldout']);
  attempt(arm, 'frozen config, --allow-heldout, wrong hash', ['run', '--arm', arm, '--config', FROZEN[arm], '--sets', 'T1', '--split', 'heldout', '--allow-heldout', '--frozen-hash', '0000000000000000']);
  if (other && !fs.existsSync(path.join(B, 'results/frozen', other.hash + '.json'))) {
    attempt(arm, 'non-frozen config with its own (unfrozen) hash', ['run', '--arm', arm, '--config', OTHER[arm], '--sets', 'T1', '--split', 'heldout', '--allow-heldout', '--frozen-hash', other.hash]);
  } else res.push({ arm, label: 'non-frozen config with its own hash', skipped: 'hash is frozen or config missing' });
  if (frozenCfg && other && !fs.existsSync(path.join(B, 'results/frozen', other.hash + '.json'))) {
    attempt(arm, "non-frozen config with the frozen config's hash", ['run', '--arm', arm, '--config', OTHER[arm], '--sets', 'T1', '--split', 'heldout', '--allow-heldout', '--frozen-hash', frozenCfg.hash]);
  }
  if (['relational', 'search', 'ladybug', 'duckpgq'].includes(arm)) {
    attempt(arm, 'TQ held-out, no flag', ['tq', '--arm', arm, '--split', 'heldout']);
    if (!fs.existsSync(path.join(B, 'results/frozen', 'tq-' + arm + '.json'))) attempt(arm, 'TQ held-out, --allow-heldout (no frozen TQ code)', ['tq', '--arm', arm, '--split', 'heldout', '--allow-heldout']);
    else res.push({ arm, label: 'TQ held-out --allow-heldout', skipped: 'a frozen TQ record exists; not attempted' });
  }
}
const wrote = fs.existsSync(OUT) ? fs.readdirSync(OUT, { recursive: true }) : [];
console.log(JSON.stringify({ attempts: res.filter((r) => !r.skipped).length, refused: res.filter((r) => r.refused).length, files_written: wrote, frozen_tq_records: fs.readdirSync(path.join(B, 'results/frozen')).filter((f) => f.startsWith('tq-')), results: res }, null, 1));
