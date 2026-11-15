const fs = require('fs'), crypto = require('crypto'), path = require('path');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/record/t6_result.txt';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const lines = fs.readFileSync(LANE + '/orchestrator/freeze-list.txt', 'utf8').split(/\r?\n/);
let block = 'lane'; const res = { checked: 0, ok: 0, bad: [], missing: [], skipped: {}, images: [] };
const skip = p => {
  const q = p.replace(/\\/g, '/').toLowerCase();
  if (q.includes('/build/sealed') || q.startsWith('../../build/sealed')) return 'sealed';
  if (/(^|\/)export\/graphs0?\//.test(q)) return 'export_graphs';
  if (/(^|\/)heldout_inputs\//.test(q)) return 'heldout_inputs';
  if (/(^|\/)grader-returns\/test/.test(q)) return 'grader_test';
  if (/^train\/heldout\//.test(q)) return 'train_heldout';
  if (q.includes('/build/facts/')) return 'facts_cache';
  return null;
};
for (const ln of lines) {
  if (ln.startsWith('#')) { block = ln.slice(1).trim(); continue; }
  const m = /^(\S+)\s\s(.+)$/.exec(ln); if (!m) continue;
  if (block === 'images') { res.images.push(ln); continue; }
  const k = skip(m[2]); if (k) { res.skipped[k] = (res.skipped[k] || 0) + 1; continue; }
  const abs = block === 'outside' ? m[2] : path.join(LANE, m[2]);
  res.checked++;
  let b; try { b = fs.readFileSync(abs); } catch (e) { res.missing.push(m[2]); continue; }
  if (sha(b) === m[1]) res.ok++; else res.bad.push(m[2]);
}
// parts set check as freeze_check.sh does
const listedParts = lines.filter(l => / {2}train\/stageB\/parts\//.test(l)).length;
res.listedParts = listedParts;
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
