// Agent A, round 8 (the coordinator's answer): the synthetic records in r58c/A/out/r10stand/records name mount sources
// that do not exist before step 9.1's earlier steps run. Point each such source at the stand-in of nearest size, so the
// audit's name walk (walk_files) is as close to the real one as the lane allows. Rewrites only those records.
// Where no stand-in of the right size exists the build's own folder is used, an UPPER bound (facts/cache 191 folders
// against 70 held-out or 50 tuning parents; arms/common whole against a filtered common). Prints the mapping used.
// usage (host, from LANE): node r58c/A/r10_repoint.js
const fs = require('fs'), path = require('path');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const G = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const MAP = [
  ['train/heldout', L + '/r58c/A/out/r10stand/heldout_parts', 'the 210 stand-in held-out parts (3 x 418 rows)'],
  ['heldout_inputs/facts', G + '/facts/cache', 'upper bound: 191 folders for 70'],
  ['heldout_inputs/common', G + '/arms/common', 'upper bound: whole common for a filtered one'],
  ['train/probe', L + '/r58c/A/out/probe_test', 'probe run test outputs'],
  ['probe_inputs/facts', L + '/r58c/A/fixtures/pstage/facts', 'the probe staging stand-in'],
  ['probe_inputs/common', L + '/r58c/A/fixtures/pstage/common', 'the probe staging stand-in'],
  ['r58c/rehearsal/inputs/facts', L + '/r58c/A/fixtures/pstage/facts', '1 folder for 3 parents'],
  ['r58c/rehearsal/inputs/common', L + '/r58c/A/fixtures/pstage/common', 'a filtered common'],
  ['r58c/rehearsal/E4', L + '/r58c/A/out/heldout_e4_test', 'a held-out arm run test output'],
  ['r58c/rehearsal/E5', L + '/r58c/A/out/heldout_e4_test', 'a held-out arm run test output'],
  ['r58c/rehearsal/E1', L + '/r58c/A/out/heldout_e4_test', 'a held-out arm run test output'],
  ['r58c/rehearsal/INJ', L + '/r58c/A/out/heldout_e4_test', 'a held-out arm run test output'],
  ['r58c/B/rerun-out', L + '/r58c/B/out/rerun-test', "B's rerun test output"],
  ['train/selectB', L + '/r58c/B/out/timing/asm/train/selectB', "B's full-size selectB output"],
  ['tune_inputs/facts', G + '/facts/cache', 'upper bound: 191 folders for 50'],
  ['tune_inputs/common', G + '/arms/common', 'upper bound: whole common for a filtered one'],
  ['train/report/answer_level', L + '/r58c/B/out/timing/asm/train/report', "B's timing report output"],
];
const R = path.join(L, 'r58c', 'A', 'out', 'r10stand', 'records');
let changed = 0; const used = {}; const still = new Set();
for (const f of fs.readdirSync(R).sort()) {
  const p = path.join(R, f); const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const m of j[0].Mounts) {
    const hit = MAP.find(([rel]) => m.Source === L + '/' + rel);
    if (hit) { m.Source = hit[1]; changed++; used[hit[0]] = hit[1].replace(/^.*\/graph2\//, '') + ' (' + hit[2] + ')'; }
    if (!fs.existsSync(m.Source)) still.add(m.Source.replace(/^.*\/graph2\//, ''));
  }
  fs.writeFileSync(p, JSON.stringify(j, null, 1));
}
console.log(JSON.stringify({ mounts_repointed: changed, map: used, sources_still_absent_on_host: [...still] }, null, 1));
