'use strict';
const fs = require('fs'), zlib = require('zlib'), crypto = require('crypto');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const H = LANE + '/train/heldout';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/heldout';
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const h = JSON.parse(fs.readFileSync(H + '/HANDOFF.json'));
const R = {};
R.keys = Object.keys(h);
R.format = h.format; R.split = h.split; R.test = h.test; R.tasks = h.tasks; R.parents = h.parents; R.checkpoints = h.checkpoints; R.seeds = h.seeds;
R.variants = h.variants.map(v => v.name);
R.freeze_sha_ok = h.freeze_sha256 === sha(H + '/item27.json');
const prog = fs.readFileSync(LANE + '/progress.jsonl', 'utf8').split(/\r?\n/);
R.progress_lines = prog.filter(l => l.trim()).length;
const anchors = prog.map((l, i) => [i + 1, l]).filter(([, l]) => { try { const r = JSON.parse(l); return r.step === 'coordinator' && r.unit === 'item27_freeze'; } catch (e) { return false; } });
R.anchor_lines = anchors.map(a => a[0]);
R.anchor_verbatim = anchors.length === 1 && anchors[0][1] === h.anchor_line;
R.anchor_line = h.anchor_line;
R.line228 = prog[227];
R.tasks_file_sha256 = h.tasks_file_sha256;
R.files_n = Object.keys(h.files).length;
R.files_bad = []; R.listed_not_present = [];
for (const [f, s] of Object.entries(h.files)) { const p = H + '/' + f; if (!fs.existsSync(p)) R.listed_not_present.push(f); else if (sha(p) !== s) R.files_bad.push(f); }
const present = []; for (const sub of ['tables', 'ranked', 'answers']) for (const f of fs.readdirSync(H + '/' + sub)) present.push(sub + '/' + f);
present.push('tasks_used.jsonl');
R.present_not_listed = present.filter(f => !(f in h.files));
// truth-like keys anywhere in listed files (JSON key names)
const TR = /"(truth|refs?|references?|expected|answer_files|ref_files|ref_defs|defs|definitions|gold|labels?|target|files)"\s*:/;
R.truthlike = {};
for (const f of Object.keys(h.files)) {
  let txt = fs.readFileSync(H + '/' + f); if (f.endsWith('.gz')) txt = zlib.gunzipSync(txt); txt = txt.toString();
  if (f.endsWith('.jsonl.gz') || f.endsWith('.jsonl') || f.endsWith('.json')) {
    const keys = new Set();
    const walk = (o, pre) => { if (Array.isArray(o)) { for (const x of o.slice(0, 50)) walk(x, pre); } else if (o && typeof o === 'object') for (const k of Object.keys(o)) { keys.add(pre + k); walk(o[k], pre + k + '.'); } };
    const lines = f.endsWith('.json') ? [txt] : txt.split('\n').filter(l => l.trim());
    for (const l of lines) walk(JSON.parse(l), '');
    R.truthlike[f] = [...keys].filter(k => /truth|ref|expect|gold|label|answer|target|correct|hit/i.test(k));
    if (!R.truthlike[f].length) delete R.truthlike[f];
    R.keysample = R.keysample || {}; if (/^answers\/E1_fused_s1|^ranked\/E1_fused_s1_pool|tasks_used|tables\/counts/.test(f)) R.keysample[f] = [...keys].filter(k => k.split('.').length <= 3).slice(0, 40);
  } else if (f.endsWith('.tsv.gz')) { R.tsvheaders = R.tsvheaders || {}; const hd = txt.split('\n')[0]; R.tsvheaders[hd] = (R.tsvheaders[hd] || 0) + 1; }
}
R.handoff_other = { absent_tasks: h.absent_tasks, mean_rows: h.mean_rows, packs: h.packs, chosen: h.chosen, grading: h.grading, note: h.note };
fs.writeFileSync(OUT + '/c3_handoff.json', JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1).slice(0, 9000));
