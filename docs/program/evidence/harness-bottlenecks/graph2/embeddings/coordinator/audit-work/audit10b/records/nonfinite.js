// Independent recount of non-finite values in train/stageB (tables + parts) and train/heldout (tables + parts).
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const T = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/train';
const NUM = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
function walk(d, acc) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, acc); else acc.push(p); } return acc; }
function scan(root, label) {
  const files = walk(root, []);
  const r = { label, tsv: 0, rows: 0, badScore: 0, badCols: 0, badHeader: 0, nanTextTsv: 0, metas: 0, metaParseFail: 0, metaNanToken: 0, lossLists: 0, lossEmpty: 0, losses: 0, badLoss: 0, otherJson: 0, otherJsonNanToken: 0, minScore: Infinity, maxScore: -Infinity, examples: [] };
  for (const f of files) {
    const rel = path.relative(T, f).replace(/\\/g, '/');
    if (f.endsWith('.tsv.gz')) {
      r.tsv++;
      const ls = zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n');
      if (ls[0] !== 'task_id\tcandidate\tscore') { r.badHeader++; r.examples.push('header ' + rel + ' ' + ls[0].slice(0, 80)); }
      for (let i = 1; i < ls.length; i++) {
        const s = ls[i]; if (s === '' && i === ls.length - 1) continue;
        const c = s.split('\t');
        if (c.length !== 3) { r.badCols++; if (r.examples.length < 20) r.examples.push('cols ' + rel + ':' + (i + 1)); continue; }
        r.rows++;
        if (/nan|inf/i.test(c[2])) r.nanTextTsv++;
        if (!NUM.test(c[2]) || !Number.isFinite(Number(c[2]))) { r.badScore++; if (r.examples.length < 20) r.examples.push('score ' + rel + ':' + (i + 1)); }
        else { const v = Number(c[2]); if (v < r.minScore) r.minScore = v; if (v > r.maxScore) r.maxScore = v; }
      }
    } else if (f.endsWith('.json')) {
      const txt = fs.readFileSync(f, 'utf8');
      const isMeta = path.basename(f) === 'meta.json' || /_meta\.json$/.test(f);
      const tok = /\b(NaN|Infinity)\b/.test(txt);
      if (!isMeta) { r.otherJson++; if (tok) { r.otherJsonNanToken++; r.examples.push('token ' + rel); } continue; }
      r.metas++; if (tok) { r.metaNanToken++; r.examples.push('metatoken ' + rel); }
      let j; try { j = JSON.parse(txt); } catch (e) { r.metaParseFail++; r.examples.push('parse ' + rel); continue; }
      if (!('losses' in j)) continue;
      const fl = Array.isArray(j.losses) ? j.losses.flat(Infinity) : [j.losses];
      r.lossLists++; if (!fl.length) { r.lossEmpty++; continue; }
      r.losses += fl.length;
      for (const x of fl) if (typeof x !== 'number' || !Number.isFinite(x)) { r.badLoss++; if (r.examples.length < 20) r.examples.push('loss ' + rel); }
    }
  }
  return r;
}
const out = [];
for (const [d, l] of [['stageB/tables', 'stageB tables'], ['stageB/parts', 'stageB parts'], ['heldout/tables', 'heldout tables'], ['heldout/parts', 'heldout parts']]) {
  const r = scan(path.join(T, d), l); out.push(JSON.stringify(r));
}
fs.writeFileSync(__dirname + '/nonfinite.out.txt', out.join('\n') + '\n');
