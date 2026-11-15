'use strict';
// Ruling 78: the held-out container mounts the facts and the source store of the 70 held-out parents ONLY.
// This builds that filtered, read-only input folder from the build's facts cache and shared code, and checks it.
//   build: <out>/facts/<P>/            (a copy of facts/cache/<P>/ for each P in plan.json heldout.assignment)
//          <out>/common/*.js           (the shared answer code; answer_level.py checks every listed file's sha256)
//          <out>/common/srcstore/trees/<P>.json (and <P>.absent.json when present), and only the blobs those
//          trees name (<out>/common/srcstore/blobs/<hash>.txt)
//          <out>/MANIFEST.json         (parents, counts, sha256 of every tree; written last)
//   check: exit 0 and {"ok": true, ...} only when facts/ holds exactly the parents' folders, trees/ exactly their
//          trees, blobs/ exactly the blobs those trees name (none missing, none extra), common/ only *.js and srcstore.
// No other commit's facts or tree is copied: a later commit's history lists the files the held-out commits changed.
// usage: node heldout_inputs.js build --plan PLAN --facts FACTS_CACHE --common ARMS_COMMON --out DIR
//        node heldout_inputs.js check --plan PLAN --dir DIR
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function args(a) { const o = {}; for (let i = 1; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1]; return o; }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const parentsOf = (plan) => Object.keys(JSON.parse(fs.readFileSync(plan, 'utf8')).heldout.assignment).sort();

function check(planPath, dir) {
  const P = parentsOf(planPath); const want = new Set(P); const problems = [];
  const ls = (d) => (fs.existsSync(d) ? fs.readdirSync(d).sort() : null);
  const facts = ls(path.join(dir, 'facts')); const trees = ls(path.join(dir, 'common', 'srcstore', 'trees'));
  const blobs = ls(path.join(dir, 'common', 'srcstore', 'blobs')); const common = ls(path.join(dir, 'common'));
  if (!facts || !trees || !blobs || !common) return { ok: false, problems: ['missing facts/, common/ or common/srcstore/{trees,blobs}'] };
  const fset = new Set(facts);
  const extraF = facts.filter((f) => !want.has(f)); const missF = P.filter((p) => !fset.has(p));
  if (extraF.length) problems.push(extraF.length + ' facts folder(s) not a held-out parent, e.g. ' + extraF[0]);
  if (missF.length) problems.push(missF.length + ' held-out parent(s) without facts, e.g. ' + missF[0]);
  const tP = new Set(); const extraT = [];
  for (const t of trees) {
    const m = /^([0-9a-f]{40})(\.absent)?\.json$/.exec(t);
    if (!m || !want.has(m[1])) extraT.push(t); else if (!m[2]) tP.add(m[1]);
  }
  if (extraT.length) problems.push(extraT.length + ' tree file(s) not of a held-out parent, e.g. ' + extraT[0]);
  const missT = P.filter((p) => !tP.has(p));
  if (missT.length) problems.push(missT.length + ' held-out parent(s) without a tree, e.g. ' + missT[0]);
  const named = new Set();
  for (const p of tP) for (const h of Object.values(JSON.parse(fs.readFileSync(path.join(dir, 'common', 'srcstore', 'trees', p + '.json'), 'utf8')))) named.add(h + '.txt');
  const bset = new Set(blobs);
  const extraB = blobs.filter((b) => !named.has(b)); const missB = [...named].filter((b) => !bset.has(b));
  if (extraB.length) problems.push(extraB.length + ' blob(s) no held-out tree names, e.g. ' + extraB[0]);
  if (missB.length) problems.push(missB.length + ' blob(s) a held-out tree names are missing, e.g. ' + missB[0]);
  const odd = common.filter((f) => f !== 'srcstore' && !f.endsWith('.js'));
  if (odd.length) problems.push('common/ holds other than *.js and srcstore: ' + odd.slice(0, 3).join(', '));
  return { ok: problems.length === 0, parents: P.length, facts: facts.length, trees: tP.size, blobs: blobs.length, common_js: common.filter((f) => f.endsWith('.js')).length, problems };
}

function build(o) {
  const P = parentsOf(o.plan); const out = o.out; const part = out + '.part';
  if (fs.existsSync(out)) {
    const c = check(o.plan, out);
    if (c.ok && fs.existsSync(path.join(out, 'MANIFEST.json'))) return Object.assign({ reused: true }, c);
    throw new Error(out + ' exists and does not check: ' + JSON.stringify(c.problems) + ' (remove it by hand to rebuild)');
  }
  fs.rmSync(part, { recursive: true, force: true });
  const srcTrees = path.join(o.common, 'srcstore', 'trees'); const srcBlobs = path.join(o.common, 'srcstore', 'blobs');
  fs.mkdirSync(path.join(part, 'facts'), { recursive: true });
  fs.mkdirSync(path.join(part, 'common', 'srcstore', 'trees'), { recursive: true });
  fs.mkdirSync(path.join(part, 'common', 'srcstore', 'blobs'), { recursive: true });
  const blobs = new Set(); const treeSha = {};
  for (const p of P) {
    const src = path.join(o.facts, p);
    if (!fs.existsSync(path.join(src, 'meta.json'))) throw new Error('no facts for held-out parent ' + p);
    fs.cpSync(src, path.join(part, 'facts', p), { recursive: true });
    const tf = path.join(srcTrees, p + '.json');
    if (!fs.existsSync(tf)) throw new Error('no source-store tree for held-out parent ' + p);
    fs.copyFileSync(tf, path.join(part, 'common', 'srcstore', 'trees', p + '.json')); treeSha[p] = sha(tf);
    const af = path.join(srcTrees, p + '.absent.json');
    if (fs.existsSync(af)) fs.copyFileSync(af, path.join(part, 'common', 'srcstore', 'trees', p + '.absent.json'));
    for (const h of Object.values(JSON.parse(fs.readFileSync(tf, 'utf8')))) blobs.add(h);
  }
  for (const h of [...blobs].sort()) fs.copyFileSync(path.join(srcBlobs, h + '.txt'), path.join(part, 'common', 'srcstore', 'blobs', h + '.txt'));
  const js = fs.readdirSync(o.common).filter((f) => f.endsWith('.js') && fs.statSync(path.join(o.common, f)).isFile()).sort();
  for (const f of js) fs.copyFileSync(path.join(o.common, f), path.join(part, 'common', f));
  const c = check(o.plan, part);
  if (!c.ok) throw new Error('the staged folder does not check: ' + JSON.stringify(c.problems));
  fs.writeFileSync(path.join(part, 'MANIFEST.json'), JSON.stringify({ ruling: 78, written: new Date().toISOString(), plan: o.plan, parents: P,
    counts: c, common_js: Object.fromEntries(js.map((f) => [f, sha(path.join(o.common, f))])), tree_sha256: treeSha }, null, 1));
  fs.renameSync(part, out);
  return Object.assign({ reused: false }, c);
}

const cmd = process.argv[2]; const o = args(process.argv.slice(2));
try {
  const r = cmd === 'build' ? build(o) : cmd === 'check' ? check(o.plan, o.dir) : null;
  if (!r) { console.log('usage: node heldout_inputs.js build|check ...'); process.exit(2); }
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
}
