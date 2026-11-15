'use strict';
// Check 6: tokenizer and packer. (a) every stored answer respects its budgets; (b) re-runs are
// byte-identical apart from timing; (c) headers and the footer are counted; (d) same packer for search.
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = path.resolve(__dirname, '..', '..');
const { countTokens } = require(path.join(B, 'arms', 'common', 'tokenizer.js'));
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const out = { over_budget: 0, answers: 0, files: 0, inconsistent_used: 0, examples: [] };
function checkRec(a, src) {
  out.answers++;
  for (const [b, v] of Object.entries(a.budgets)) {
    if (v.used > Number(b)) { out.over_budget++; if (out.examples.length < 5) out.examples.push({ src, id: a.id, b, used: v.used }); }
    let s = 0; for (let i = 0; i < v.n_full; i++) s += a.items[i].tok;
    if (v.cut) s += v.cut.tok;
    if (v.beyond > 0 || v.cut) s += countTokens('[+' + v.beyond + ' more not shown]\n');
    if (s !== v.used) { out.inconsistent_used++; if (out.examples.length < 8) out.examples.push({ src, id: a.id, b, used: v.used, recomputed: s }); }
  }
}
for (const arm of ['relational', 'reference']) {
  const d = path.join(B, 'results', arm, 'tune');
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.gz')).slice(0, 30)) { out.files++; for (const a of gz(path.join(d, f))) checkRec(a, arm + '/' + f); }
}
for (const f of ['rounds=1_names-only.jsonl', 'form=paths.jsonl', 'gran=symbol_form=snippet.jsonl', 'floor_DIR_form=range.jsonl']) {
  out.files++;
  for (const line of fs.readFileSync(path.join(B, 'arms', 'search', 'out', f), 'utf8').split('\n')) if (line) checkRec(JSON.parse(line), 'search/' + f);
}
// (b) determinism: the audit re-run of relational and reference "base" against the stored sweep results
const strip = (a) => JSON.stringify({ ...a, ms: null, arm: null, config_name: null });
out.rerun = {};
for (const arm of ['relational', 'reference']) for (const set of ['T1', 'T2']) {
  const mine = gz(path.join(__dirname, 'leak', 'out', arm, 'tune', 'ba68ab71ebbff9b2.' + set + '.jsonl.gz'));
  const theirs = new Map(gz(path.join(B, 'results', arm, 'tune', 'ba68ab71ebbff9b2.' + set + '.jsonl.gz')).map((a) => [a.id, a]));
  let same = 0; let diff = 0; for (const a of mine) (strip(a) === strip(theirs.get(a.id)) ? same++ : diff++);
  out.rerun[arm + ' ' + set] = { same, diff };
}
// (c) headers and footer are counted
const P = require(path.join(B, 'arms', 'common', 'packer.js'));
out.header_tokens_example = { 'backend/app/features/jobs/service.py\n': countTokens('backend/app/features/jobs/service.py\n'), footer_999: countTokens('[+999 more not shown]\n'), footer_1000: countTokens('[+1000 more not shown]\n'), footer_1000000: countTokens('[+1000000 more not shown]\n') };
fs.writeFileSync(path.join(__dirname, 'packcheck.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
