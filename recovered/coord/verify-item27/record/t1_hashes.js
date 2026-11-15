const fs = require('fs'), path = require('path'), crypto = require('crypto');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/record/t1_result.json';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const recBytes = fs.readFileSync(LANE + '/train/heldout/item27.json');
const rec = JSON.parse(recBytes.toString('utf8'));
const shaFile = fs.readFileSync(LANE + '/train/heldout/item27.json.sha256', 'utf8');
const norm = p => path.resolve(p).replace(/\\/g, '/').toLowerCase();
// freeze list
const fl = fs.readFileSync(LANE + '/orchestrator/freeze-list.txt', 'utf8').split(/\r?\n/);
const flByPath = {}, flByHash = {};
let block = 'lane';
fl.forEach((ln, i) => {
  if (ln.startsWith('#')) { block = ln.slice(1).trim(); return; }
  const m = /^(\S+)\s\s(.+)$/.exec(ln); if (!m) return;
  if (block === 'images') return;
  const abs = block === 'outside' ? norm(m[2]) : norm(path.join(LANE, m[2]));
  flByPath[abs] = { hash: m[1], line: i + 1, block, spelled: m[2] };
  (flByHash[m[1]] = flByHash[m[1]] || []).push(i + 1);
});
const rows = [];
for (const map of ['code_sha256', 'pins', 'tuning_inputs']) {
  for (const [rel, h] of Object.entries(rec[map] || {})) {
    const abs = norm(path.join(LANE, rel));
    if (abs.includes('/build/sealed')) { rows.push({ map, rel, sealed: true }); continue; }
    let disk = null; try { disk = sha(fs.readFileSync(abs)); } catch (e) { disk = 'ERR ' + e.code; }
    const f = flByPath[abs];
    rows.push({ map, rel, rec: h, disk, eqRec: disk === h, fl: f ? f.hash : null, flLine: f ? f.line : null, flBlock: f ? f.block : null, eqFl: f ? f.hash === disk : false, hashInFlAnyLine: flByHash[disk] || [] });
  }
}
const summary = { n: rows.length, eqRec: rows.filter(r => r.eqRec).length, eqFl: rows.filter(r => r.eqFl).length,
  missingFromFl: rows.filter(r => !r.fl).map(r => r.map + ':' + r.rel), sealed: rows.filter(r => r.sealed).length,
  pinsVsCode: Object.entries(rec.code_sha256).filter(([k, v]) => rec.pins[k] !== v).map(([k]) => k),
  codeNotInPins: Object.keys(rec.code_sha256).filter(k => !(k in rec.pins)),
  recordSha: sha(recBytes), sha256File: shaFile.trim(), recordBytes: recBytes.length,
  imageInFl: fl.filter(l => l.includes('graphtest-kge-gpu:1')), imageRec: rec.image_id };
fs.writeFileSync(OUT, JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary, null, 1));
rows.filter(r => !r.eqRec || !r.eqFl).forEach(r => console.log('MISMATCH', JSON.stringify(r)));
