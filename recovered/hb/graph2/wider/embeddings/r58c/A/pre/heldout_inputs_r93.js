'use strict';
// Ruling 78: the held-out container mounts the facts and the source store of the 70 held-out parents ONLY.
// This builds that filtered, read-only input folder from the build's facts cache and shared code, and checks it.
// Round r58c (coordinator, ruling 89 message; HD-11): staging happens ONCE, before the code freeze, and is never
// rebuilt: `build` refuses an existing folder; `check` compares every staged file with a sha256 manifest (never
// names only) and with its source; the held-out launch (heldout.sh) only verifies, it builds nothing.
//   build:  <out>/facts/<P>/            (a copy of facts/cache/<P>/ for each P in plan.json heldout.assignment, or
//                                        for each P of --parents: the probe's and the rehearsal's tuning parents)
//           <out>/common/*.js           (the shared answer code)
//           <out>/common/srcstore/trees/<P>.json (and <P>.absent.json), and only the blobs those trees name
//           <out>/MANIFEST.json         (parents, counts, sha256 of every tree and common file; written last)
//           <out>.sha256                (sha256sum form, '<hex>  <basename(out)>/<rel>', of EVERY staged file,
//                                        MANIFEST.json included; `cd <dirname(out)> && sha256sum -c` checks it)
//   check:  exit 0 and {"ok": true, ...} only when facts/ holds exactly the parents' folders, trees/ exactly their
//           trees, blobs/ exactly the blobs those trees name, common/ only *.js and srcstore, MANIFEST.json names
//           the same parents, the staged files are exactly the manifest's files with its sha256 (HD-11), and (with
//           --facts/--common) every staged file equals its source byte for byte.
//   export-manifest: sha256sum form of every file under export/graphs/<P>/ and export/graphs0/<P>/ for the plan's
//           70 held-out parents ('<hex>  export/graphs/<P>/<f>'); read only, nothing under export/ is touched.
//   verify-export: every line of that manifest holds and the files under those folders are exactly its files.
//   pins:   every `pins` and `tuning_inputs` entry of an item-27 record hashes to its value under --root (the lane;
//           ../../build/... resolves outside it): the host-side check of ruling 84 (the held-out container does not
//           mount the tuning inputs).
// usage: node heldout_inputs.js build --plan PLAN --facts FACTS_CACHE --common ARMS_COMMON --out DIR [--parents P,..]
//        node heldout_inputs.js check --plan PLAN --dir DIR --manifest DIR.sha256 [--facts F --common C] [--parents P,..]
//        (build and check also take --split tune: the plan's 53 tuning parents, for step 5's tuning packs)
//        node heldout_inputs.js export-manifest --plan PLAN --export LANE/export --out FILE
//        node heldout_inputs.js verify-export --plan PLAN --export LANE/export --manifest FILE
//        node heldout_inputs.js pins --record item27.json --root LANE
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KNOWN = { build: ['plan', 'facts', 'common', 'out', 'parents', 'split'], check: ['plan', 'dir', 'manifest', 'facts', 'common', 'parents', 'split'],
  'export-manifest': ['plan', 'export', 'out'], 'verify-export': ['plan', 'export', 'manifest'], pins: ['record', 'root'] };
const NEED = { build: ['plan', 'facts', 'common', 'out'], check: ['plan', 'dir', 'manifest'], 'export-manifest': ['plan', 'export', 'out'],
  'verify-export': ['plan', 'export', 'manifest'], pins: ['record', 'root'] };
function args(cmd, a) {
  const o = {};
  if (a.length % 2) throw new Error('options come in --key value pairs');
  for (let i = 0; i < a.length; i += 2) {
    const k = a[i].replace(/^--/, '');
    if (!a[i].startsWith('--') || !(KNOWN[cmd] || []).includes(k)) throw new Error('unknown option ' + a[i] + ' for ' + cmd);
    o[k] = a[i + 1];
  }
  const miss = (NEED[cmd] || []).filter((k) => !o[k]);
  if (miss.length) throw new Error(cmd + ' needs --' + miss.join(', --'));
  return o;
}
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const planParents = (plan) => Object.keys(JSON.parse(fs.readFileSync(plan, 'utf8')).heldout.assignment).sort();
const parentsOf = (o) => {  // --parents P,.. | --split tune (plan.assignment's tuning parents) | the plan's held-out parents
  if (o.parents && o.split) throw new Error('--parents and --split exclude each other');
  if (o.split && o.split !== 'tune') throw new Error('--split takes tune only');
  if (o.split) return Object.keys(JSON.parse(fs.readFileSync(o.plan, 'utf8')).assignment).sort();
  return o.parents ? o.parents.split(',').filter(Boolean).sort() : planParents(o.plan);
};
function walk(d, base, out) {
  for (const f of fs.readdirSync(d).sort()) {
    const p = path.join(d, f); const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}
function readManifest(file) {
  const m = new Map(); const bad = [];
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    const r = /^([0-9a-f]{64}) [ *](.+)$/.exec(l.replace(/\r$/, ''));
    if (!r) { bad.push(l.slice(0, 80)); continue; }
    if (m.has(r[2])) bad.push('listed twice: ' + r[2]); m.set(r[2], r[1]);
  }
  return { m, bad };
}

function check(o) {
  const dir = o.dir; const P = parentsOf(o); const want = new Set(P); const problems = [];
  const ls = (d) => (fs.existsSync(d) ? fs.readdirSync(d).sort() : null);
  const facts = ls(path.join(dir, 'facts')); const trees = ls(path.join(dir, 'common', 'srcstore', 'trees'));
  const blobs = ls(path.join(dir, 'common', 'srcstore', 'blobs')); const common = ls(path.join(dir, 'common'));
  if (!facts || !trees || !blobs || !common) return { ok: false, problems: ['missing facts/, common/ or common/srcstore/{trees,blobs}'] };
  const fset = new Set(facts);
  const extraF = facts.filter((f) => !want.has(f)); const missF = P.filter((p) => !fset.has(p));
  if (extraF.length) problems.push(extraF.length + ' facts folder(s) not a staged parent, e.g. ' + extraF[0]);
  if (missF.length) problems.push(missF.length + ' staged parent(s) without facts, e.g. ' + missF[0]);
  const tP = new Set(); const extraT = [];
  for (const t of trees) {
    const m = /^([0-9a-f]{40})(\.absent)?\.json$/.exec(t);
    if (!m || !want.has(m[1])) extraT.push(t); else if (!m[2]) tP.add(m[1]);
  }
  if (extraT.length) problems.push(extraT.length + ' tree file(s) not of a staged parent, e.g. ' + extraT[0]);
  const missT = P.filter((p) => !tP.has(p));
  if (missT.length) problems.push(missT.length + ' staged parent(s) without a tree, e.g. ' + missT[0]);
  const named = new Set();
  for (const p of tP) for (const h of Object.values(JSON.parse(fs.readFileSync(path.join(dir, 'common', 'srcstore', 'trees', p + '.json'), 'utf8')))) named.add(h + '.txt');
  const bset = new Set(blobs);
  const extraB = blobs.filter((b) => !named.has(b)); const missB = [...named].filter((b) => !bset.has(b));
  if (extraB.length) problems.push(extraB.length + ' blob(s) no staged tree names, e.g. ' + extraB[0]);
  if (missB.length) problems.push(missB.length + ' blob(s) a staged tree names are missing, e.g. ' + missB[0]);
  const odd = common.filter((f) => f !== 'srcstore' && !f.endsWith('.js'));
  if (odd.length) problems.push('common/ holds other than *.js and srcstore: ' + odd.slice(0, 3).join(', '));
  // HD-11: MANIFEST.json and the sha256 manifest of every staged file (never names only)
  const mj = path.join(dir, 'MANIFEST.json');
  if (!fs.existsSync(mj)) problems.push('no MANIFEST.json');
  else {
    const M = JSON.parse(fs.readFileSync(mj, 'utf8'));
    if (JSON.stringify((M.parents || []).slice().sort()) !== JSON.stringify(P)) problems.push('MANIFEST.json names other parents than ' + (o.parents ? '--parents' : 'the plan'));
    for (const [p, h] of Object.entries(M.tree_sha256 || {})) {
      const tf = path.join(dir, 'common', 'srcstore', 'trees', p + '.json');
      if (!fs.existsSync(tf) || sha(tf) !== h) problems.push('tree ' + p.slice(0, 12) + ' differs from MANIFEST.json');
    }
  }
  const base = path.dirname(path.resolve(dir)); const pre = path.basename(path.resolve(dir)) + '/';
  let listed = 0;
  if (!o.manifest || !fs.existsSync(o.manifest)) problems.push('no sha256 manifest ' + o.manifest);
  else {
    const { m, bad } = readManifest(o.manifest); listed = m.size;
    if (bad.length) problems.push('manifest lines not in sha256sum form: ' + bad.length + ', e.g. ' + bad[0]);
    const files = walk(path.resolve(dir), base, []);
    const fs2 = new Set(files);
    const notListed = files.filter((f) => !m.has(f)); const gone = [...m.keys()].filter((f) => !fs2.has(f) || !f.startsWith(pre));
    let differ = 0; let first = '';
    for (const f of files) if (m.has(f) && sha(path.join(base, f)) !== m.get(f)) { differ++; if (!first) first = f; }
    if (notListed.length) problems.push(notListed.length + ' staged file(s) not in the manifest, e.g. ' + notListed[0]);
    if (gone.length) problems.push(gone.length + ' manifest file(s) not staged, e.g. ' + gone[0]);
    if (differ) problems.push(differ + ' staged file(s) differ from the manifest sha256, e.g. ' + first);
  }
  // with --facts / --common: every staged file equals its source
  let compared = 0;
  if (o.facts || o.common) {
    for (const f of walk(path.resolve(dir), path.resolve(dir), [])) {
      let src = null;
      if (f.startsWith('facts/') && o.facts) src = path.join(o.facts, f.slice(6));
      else if (f.startsWith('common/') && o.common) src = path.join(o.common, f.slice(7));
      if (!src) continue;
      compared++;
      if (!fs.existsSync(src) || sha(src) !== sha(path.join(dir, f))) { problems.push('staged ' + f + ' differs from its source'); if (problems.length > 40) break; }
    }
  }
  return { ok: problems.length === 0, parents: P.length, facts: facts.length, trees: tP.size, blobs: blobs.length,
    common_js: common.filter((f) => f.endsWith('.js')).length, manifest_files: listed, compared_with_source: compared, problems };
}

function writeManifest(dir, file) {
  const base = path.dirname(path.resolve(dir));
  const lines = walk(path.resolve(dir), base, []).map((f) => sha(path.join(base, f)) + '  ' + f);
  fs.writeFileSync(file + '.part', lines.join('\n') + '\n'); fs.renameSync(file + '.part', file);
  return lines.length;
}

function build(o) {
  const P = parentsOf(o); const out = path.resolve(o.out); const part = out + '.part'; const mf = out + '.sha256';
  if (fs.existsSync(out) || fs.existsSync(mf)) throw new Error(out + ' (or its manifest) exists: staging is done once, before the freeze, and never rebuilt');
  fs.rmSync(part, { recursive: true, force: true });
  const srcTrees = path.join(o.common, 'srcstore', 'trees'); const srcBlobs = path.join(o.common, 'srcstore', 'blobs');
  fs.mkdirSync(path.join(part, 'facts'), { recursive: true });
  fs.mkdirSync(path.join(part, 'common', 'srcstore', 'trees'), { recursive: true });
  fs.mkdirSync(path.join(part, 'common', 'srcstore', 'blobs'), { recursive: true });
  const blobs = new Set(); const treeSha = {};
  for (const p of P) {
    const src = path.join(o.facts, p);
    if (!fs.existsSync(path.join(src, 'meta.json'))) throw new Error('no facts for parent ' + p);
    fs.cpSync(src, path.join(part, 'facts', p), { recursive: true });
    const tf = path.join(srcTrees, p + '.json');
    if (!fs.existsSync(tf)) throw new Error('no source-store tree for parent ' + p);
    fs.copyFileSync(tf, path.join(part, 'common', 'srcstore', 'trees', p + '.json')); treeSha[p] = sha(tf);
    const af = path.join(srcTrees, p + '.absent.json');
    if (fs.existsSync(af)) fs.copyFileSync(af, path.join(part, 'common', 'srcstore', 'trees', p + '.absent.json'));
    for (const h of Object.values(JSON.parse(fs.readFileSync(tf, 'utf8')))) blobs.add(h);
  }
  for (const h of [...blobs].sort()) fs.copyFileSync(path.join(srcBlobs, h + '.txt'), path.join(part, 'common', 'srcstore', 'blobs', h + '.txt'));
  const js = fs.readdirSync(o.common).filter((f) => f.endsWith('.js') && fs.statSync(path.join(o.common, f)).isFile()).sort();
  for (const f of js) fs.copyFileSync(path.join(o.common, f), path.join(part, 'common', f));
  fs.writeFileSync(path.join(part, 'MANIFEST.json'), JSON.stringify({ ruling: 78, written: new Date().toISOString(), plan: o.plan, parents: P,
    parents_from: o.parents ? '--parents' : o.split ? 'plan.assignment (tuning)' : 'plan.heldout.assignment',
    common_js: Object.fromEntries(js.map((f) => [f, sha(path.join(o.common, f))])), tree_sha256: treeSha, blobs: blobs.size }, null, 1));
  fs.renameSync(part, out);
  const n = writeManifest(out, mf);
  const c = check(Object.assign({}, o, { dir: out, manifest: mf }));
  if (!c.ok) throw new Error('the staged folder does not check: ' + JSON.stringify(c.problems));
  return Object.assign({ built: out, manifest: mf, manifest_lines: n }, c);
}

function exportFiles(o) {
  const P = planParents(o.plan); const lane = path.dirname(path.resolve(o.export)); const files = [];
  for (const sub of ['graphs', 'graphs0']) for (const p of P) {
    const d = path.join(o.export, sub, p);
    if (!fs.existsSync(d)) throw new Error('no export/' + sub + '/' + p);
    walk(path.resolve(d), lane, files);
  }
  return { lane, files };
}

function exportManifest(o) {
  if (fs.existsSync(o.out)) throw new Error(o.out + ' exists: the export manifest is written once, before the freeze');
  const { lane, files } = exportFiles(o);
  fs.writeFileSync(o.out + '.part', files.map((f) => sha(path.join(lane, f)) + '  ' + f).join('\n') + '\n'); fs.renameSync(o.out + '.part', o.out);
  return { ok: true, written: o.out, files: files.length, parents: planParents(o.plan).length };
}

function verifyExport(o) {
  const { lane, files } = exportFiles(o); const { m, bad } = readManifest(o.manifest); const problems = [];
  if (bad.length) problems.push(bad.length + ' manifest line(s) not in sha256sum form');
  const set = new Set(files);
  const notListed = files.filter((f) => !m.has(f)); const gone = [...m.keys()].filter((f) => !set.has(f));
  let differ = 0; let first = '';
  for (const f of files) if (m.has(f) && sha(path.join(lane, f)) !== m.get(f)) { differ++; if (!first) first = f; }
  if (notListed.length) problems.push(notListed.length + ' file(s) under the held-out graph folders not in the manifest, e.g. ' + notListed[0]);
  if (gone.length) problems.push(gone.length + ' manifest file(s) missing, e.g. ' + gone[0]);
  if (differ) problems.push(differ + ' file(s) differ from the manifest, e.g. ' + first);
  return { ok: problems.length === 0, files: files.length, listed: m.size, problems };
}

function pins(o) {
  const rec = JSON.parse(fs.readFileSync(o.record, 'utf8')); const problems = []; let n = 0;
  for (const key of ['pins', 'tuning_inputs']) {
    const d = rec[key];
    if (!d || typeof d !== 'object') { problems.push('the record has no ' + key); continue; }
    for (const [rel, h] of Object.entries(d)) {
      n++;
      const p = path.normalize(path.join(o.root, ...rel.split('/')));
      if (!/^[0-9a-f]{64}$/.test(String(h))) problems.push(key + ' ' + rel + ': not a sha256');
      else if (!fs.existsSync(p)) problems.push(key + ' ' + rel + ': missing');
      else if (sha(p) !== h) problems.push(key + ' ' + rel + ': hashes to ' + sha(p).slice(0, 12) + ', record ' + h.slice(0, 12));
    }
  }
  return { ok: problems.length === 0, checked: n, problems };
}

const cmd = process.argv[2];
try {
  const o = args(cmd, process.argv.slice(3));
  const f = { build, check, 'export-manifest': exportManifest, 'verify-export': verifyExport, pins }[cmd];
  if (!f) { console.log('usage: node heldout_inputs.js build|check|export-manifest|verify-export|pins ...'); process.exit(2); }
  const r = f(o);
  console.log(JSON.stringify(r));
  process.exit(r.ok === false ? 1 : 0);
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
}
