'use strict';
// Leak and order audit: file times, held-out ids in fitting material, graph keys, adapter hash.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto'); const zlib = require('zlib');
const L = require('./lib');
const G = L.G; const refs = L.refs();
const out = {};
const iso = (f) => fs.statSync(f).mtime.toISOString();
const frozen = JSON.parse(fs.readFileSync(path.join(G, 'FROZEN.json'), 'utf8'));
out.frozen_at = frozen.frozen_at; out.frozen_mtime = iso(path.join(G, 'FROZEN.json'));
out.selection_mtime = iso(path.join(G, 'grader/selection.json'));
// adapter hash, recomputed two ways
const ad = path.join(G, 'adapter');
const files = fs.readdirSync(ad).sort();
const per = {}; for (const f of files) per[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(ad, f))).digest('hex');
const lines = files.filter((f) => /\.(js|py|sh)$/.test(f)).map((f) => `${f} ${per[f]}\n`).join('');
out.adapter_files = per; out.adapter_code_hash = crypto.createHash('sha256').update(lines).digest('hex');
const h2 = crypto.createHash('sha256'); for (const f of files) { h2.update(f + '\0'); h2.update(fs.readFileSync(path.join(ad, f))); } out.adapter_all_hash = h2.digest('hex');
out.adapter_equal_frozen = out.adapter_code_hash === frozen.adapter_code_hash && files.every((f) => per[f] === frozen.adapter_files[f]) && files.length === Object.keys(frozen.adapter_files).length;
out.adapter_all_equal = out.adapter_all_hash === frozen.adapter_all_files_sha256;
out.adapter_mtimes = Object.fromEntries(files.map((f) => [f, iso(path.join(ad, f))]));
// held-out answer files and calls: earliest mtime
function walk(d, acc = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, acc); else acc.push(p); } return acc; }
const ho = walk(path.join(G, 'answers/heldout'));
const hoT = ho.map((f) => [f, fs.statSync(f).mtimeMs]).sort((a, b) => a[1] - b[1]);
out.heldout_files = ho.length; out.heldout_earliest = [path.relative(G, hoT[0][0]), new Date(hoT[0][1]).toISOString()]; out.heldout_latest = [path.relative(G, hoT[hoT.length - 1][0]), new Date(hoT[hoT.length - 1][1]).toISOString()];
const tu = walk(path.join(G, 'answers/tune'));
const tuT = tu.map((f) => fs.statSync(f).mtimeMs); out.tune_latest = new Date(Math.max(...tuT)).toISOString(); out.tune_files = tu.length;
// graphs: held-out parents vs tune parents, build times
const heldParents = new Set(); const tuneParents = new Set();
for (const r of refs.values()) { (r.split === 'tune' ? tuneParents : heldParents).add(r.parent); }
const gdirs = fs.readdirSync(path.join(G, 'graphs'));
const gInfo = [];
for (const k of gdirs) {
  const sha = k.split('-rm-')[0]; const bj = path.join(G, 'graphs', k, 'build.json'); const gj = path.join(G, 'graphs', k, 'graphify-out/graph.json');
  gInfo.push({ key: k, tune: tuneParents.has(sha), held: heldParents.has(sha), mtime: fs.existsSync(gj) ? iso(gj) : null });
}
out.graphs = { total: gdirs.length, tune_only: gInfo.filter((x) => x.tune && !x.held).length, held_only: gInfo.filter((x) => x.held && !x.tune).length, both: gInfo.filter((x) => x.held && x.tune).map((x) => x.key), neither: gInfo.filter((x) => !x.held && !x.tune).map((x) => x.key) };
const heldG = gInfo.filter((x) => x.held && !x.tune && x.key !== 'a31924a3818f4ac94b695906d107c72c912792b2');
out.graphs.heldout_built_before_frozen = heldG.filter((x) => x.mtime && x.mtime < frozen.frozen_at).map((x) => [x.key, x.mtime]);
out.graphs.heldout_earliest = heldG.map((x) => x.mtime).sort()[0];
out.graphs.a31924a = gInfo.find((x) => x.key.startsWith('a31924a'));
// held-out ids / parents in fitting material
const heldIds = [...refs.values()].filter((r) => r.split !== 'tune').map((r) => r.id);
const heldIdRe = new RegExp('"(' + heldIds.join('|') + ')"');
const heldParentList = [...heldParents].filter((p) => !tuneParents.has(p) && !p.startsWith('a31924a'));
const scan = {};
for (const f of tu) {
  let txt = fs.readFileSync(f); if (f.endsWith('.gz')) txt = zlib.gunzipSync(txt); txt = txt.toString('utf8');
  const ids = new Set(); const re = new RegExp('"(' + heldIds.join('|') + ')"', 'g'); let m; while ((m = re.exec(txt))) ids.add(m[1]);
  const pars = heldParentList.filter((p) => txt.includes(p));
  if (ids.size || pars.length) scan[path.relative(G, f)] = { ids: [...ids].slice(0, 10), n_ids: ids.size, parents: pars.slice(0, 5), n_parents: pars.length };
}
out.tune_scan_hits = scan;
// tq files in tune: question ids
const tqTune = walk(path.join(G, 'answers/tune/tq')); out.tq_tune_ids = {};
for (const f of tqTune) if (f.endsWith('.jsonl')) out.tq_tune_ids[path.basename(f)] = L.readJsonl(f).map((x) => x.id);
const tqRef = L.readJsonl(path.join(L.BUILD, 'sealed/tq_reference.jsonl'));
out.tq_split = { tune: tqRef.filter((r) => r.split === 'tune').map((r) => r.id), held: tqRef.filter((r) => r.split !== 'tune').map((r) => r.id) };
// held-out answer tasks run after frozen
out.heldout_before_frozen = hoT.filter((x) => x[1] < Date.parse(frozen.frozen_at)).map((x) => path.relative(G, x[0]));
// grader scoring start
out.scoring_started = fs.readFileSync(path.join(G, 'grader/heldout/SCORING_STARTED'), 'utf8').slice(0, 200);
fs.writeFileSync(path.join(__dirname, 'out/order.json'), JSON.stringify(out, null, 1));
const o2 = { ...out }; delete o2.adapter_files; console.log(JSON.stringify(o2, null, 1).slice(0, 6000));
