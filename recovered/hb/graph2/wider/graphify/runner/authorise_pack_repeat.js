'use strict';
// Records the orchestrator-ruled repeat of the failed `pack` step in progress.json, once, so that
// drive.js runs the frozen pack command again (it refuses to retry a failed step on its own).
// The previous failed record is kept inside the repeat entry. Running this twice does nothing more.
const fs = require('fs');
const path = require('path');
const PROG = path.join(__dirname, 'progress.json');
const LOG = path.join(__dirname, 'drive.log');
const REASON = 'missing source-text trees in the shared cache (input cache filled, no code change)';
const p = JSON.parse(fs.readFileSync(PROG, 'utf8'));
const st = p.steps.pack;
if (!st || st.status !== 'failed') { console.log('pack is not in a failed state (' + (st && st.status) + '); nothing to authorise'); process.exit(0); }
const now = new Date().toISOString();
p.repeats.push({ step: 'pack', at: now, reason: REASON, authorised_by: 'orchestrator restart note 2026-11-13 (input cache filled; record G/orchestrator/fill_srcstore.result.json)',
  hash_check_before_repeat: 'runner/hash_check.restart.json (ok)', previous: st });
delete p.steps.pack;
fs.writeFileSync(PROG + '.part', JSON.stringify(p, null, 1)); fs.renameSync(PROG + '.part', PROG);
fs.appendFileSync(LOG, now + ' REPEAT pack authorised: ' + REASON + '\n');
console.log('repeat of pack recorded');
