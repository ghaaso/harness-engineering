'use strict';
// Preflight check 1c: the held-out lock on a COPY of the harness (arms/ + results/frozen copied into
// <fake>). Runs `run.js lock-check` (and a few `run.js run --split heldout` refusals that stop before
// any task is read) as child processes with GT_BUILD=<fake>. Never touches the real results/.
// usage (inside graphtest:1): node locktest.js <fake root> <PLAN.json> <out.json>
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const FAKE = process.argv[2];
const PLAN = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const OUTF = process.argv[4];
const RUN = path.join(FAKE, 'arms', 'common', 'run.js');
const baseEnv = { ...process.env, GT_BUILD: FAKE };
delete baseEnv.GT_RESULTS; delete baseEnv.LB_COMM_DRAW;
function lc(args, env = {}) {
  const r = spawnSync('node', [RUN, ...args], { env: { ...baseEnv, ...env }, encoding: 'utf8', timeout: 120000 });
  const lines = (r.stdout || '').trim().split('\n');
  return { code: r.status, last: lines[lines.length - 1] || '', err: (r.stderr || '').trim().slice(0, 300) };
}
const res = { declared: [], declared_tq: [], undeclared: [], special: [], summary: {} };

// 1. every declared run is allowed
for (const r of PLAN.runs) {
  const env = r.draw ? { LB_COMM_DRAW: String(r.draw) } : {};
  const o = lc(['lock-check', '--arm', r.arm, '--config', r.hash, '--sets', r.set], env);
  res.declared.push({ n: r.n, arm: r.arm, hash: r.hash, set: r.set, draw: r.draw, allowed: o.code === 0 && o.last === 'allowed', out: o.last.slice(0, 200) });
}
for (const q of PLAN.question_runs) {
  const o = lc(['lock-check', '--arm', q.arm, '--tq']);
  res.declared_tq.push({ n: q.n, arm: q.arm, allowed: o.code === 0 && o.last === 'allowed', out: o.last.slice(0, 200) });
}

// 2. every configuration in every arm's own lists that the plan does not declare for that arm is refused
process.env.GT_BUILD = FAKE;
const H = require(path.join(FAKE, 'arms', 'common', 'harness.js'));
const declared = new Set(PLAN.runs.map((r) => r.arm + '|' + r.hash));
const arms = ['relational', 'reference', 'ladybug', 'duckpgq', 'search', 'floor-dir', 'floor-co'];
const allHashes = new Set();
for (const arm of arms) {
  const lists = [H.loadArmList(arm, 1, false)];
  if (!H.isFloor(arm)) lists.push(H.loadArmList(arm, 2, false));
  for (const L of lists) for (const c of L.list) {
    allHashes.add(c.hash);
    if (declared.has(arm + '|' + c.hash)) continue;
    const o = lc(['lock-check', '--arm', arm, '--config', c.hash, '--sets', 'T1']);
    res.undeclared.push({ arm, hash: c.hash, name: c.name, refused: o.code === 3 && o.last.startsWith('refused'), out: o.last.slice(0, 160) });
  }
}
// 3. declared hashes under a wrong arm (cross product of frozen hashes x arms), given as a JSON config file
const cfgDir = path.join(FAKE, 'cfgs'); fs.mkdirSync(cfgDir, { recursive: true });
const frozenRecs = [];
for (const arm of arms) for (const f of fs.readdirSync(path.join(FAKE, 'results', 'frozen', arm)).filter((x) => /^[0-9a-f]{16}\.json$/.test(x))) frozenRecs.push(JSON.parse(fs.readFileSync(path.join(FAKE, 'results', 'frozen', arm, f), 'utf8')));
for (const rec of frozenRecs) {
  const cf = path.join(cfgDir, rec.arm + '_' + rec.hash + '.json');
  fs.writeFileSync(cf, JSON.stringify(rec.config));
  for (const arm of arms) {
    if (declared.has(arm + '|' + rec.hash)) continue;
    const o = lc(['lock-check', '--arm', arm, '--config', cf, '--sets', 'T1']);
    res.undeclared.push({ arm, hash: rec.hash, name: 'wrong arm: frozen for ' + rec.arm, refused: o.code === 3 && o.last.startsWith('refused'), out: o.last.slice(0, 160) });
  }
}
// 4. special refusals
const sp = (name, args, env = {}, want = 'refused') => { const o = lc(args, env); res.special.push({ name, ok: want === 'refused' ? (o.code !== 0 && /refused|REFUSED/.test(o.last + o.err)) : (o.code === 0 && o.last === 'allowed'), code: o.code, out: (o.last + ' ' + o.err).slice(0, 220) }); };
sp('T5 via lock-check', ['lock-check', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T5']);
sp('T5 via run (stops before tasks)', ['run', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T5', '--split', 'heldout', '--allow-heldout', '--frozen-hash', '95e990307da3b42b']);
sp('unknown set T9', ['lock-check', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T9']);
sp('LB_COMM_DRAW=1 on ladybug primary (no x_comm)', ['lock-check', '--arm', 'ladybug', '--config', '95e990307da3b42b', '--sets', 'T1'], { LB_COMM_DRAW: '1' });
sp('LB_COMM_DRAW=1 on relational', ['lock-check', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T1'], { LB_COMM_DRAW: '1' });
sp('LB_COMM_DRAW=5 on ladybug s2', ['lock-check', '--arm', 'ladybug', '--config', 'f233ae069bdba0ce', '--sets', 'T1'], { LB_COMM_DRAW: '5' });
sp('LB_COMM_DRAW=1 on ladybug tq', ['lock-check', '--arm', 'ladybug', '--tq'], { LB_COMM_DRAW: '1' });
sp('tq of reference (no record)', ['lock-check', '--arm', 'reference', '--tq']);
sp('tq of floor-dir (no record)', ['lock-check', '--arm', 'floor-dir', '--tq']);
sp('GT_RESULTS override', ['lock-check', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T1'], { GT_RESULTS: path.join(FAKE, 'results') + '/../results2' });
sp('run without --frozen-hash', ['run', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T1', '--split', 'heldout', '--allow-heldout']);
sp('run with --limit', ['run', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T1', '--split', 'heldout', '--allow-heldout', '--frozen-hash', '95e990307da3b42b', '--limit', '3']);
// a record whose arm field names another arm (copy ladybug primary into search's folder under the same hash)
const wrongDir = path.join(FAKE, 'results', 'frozen', 'search');
fs.copyFileSync(path.join(FAKE, 'results', 'frozen', 'ladybug', '95e990307da3b42b.json'), path.join(wrongDir, '95e990307da3b42b.json'));
sp('record in search/ naming arm ladybug', ['lock-check', '--arm', 'search', '--config', path.join(cfgDir, 'ladybug_95e990307da3b42b.json'), '--sets', 'T1']);
fs.unlinkSync(path.join(wrongDir, '95e990307da3b42b.json'));
// a code change in common/ refuses; restored allows again
const pk = path.join(FAKE, 'arms', 'common', 'packer.js'); const orig = fs.readFileSync(pk);
fs.appendFileSync(pk, '\n// preflight probe\n');
sp('code change in common/packer.js', ['lock-check', '--arm', 'duckpgq', '--config', '95e990307da3b42b', '--sets', 'T1']);
sp('code change in common/packer.js (tq)', ['lock-check', '--arm', 'search', '--tq']);
fs.writeFileSync(pk, orig);
const probe = (rel, tests) => { const f = path.join(FAKE, 'arms', rel); const o = fs.readFileSync(f); fs.appendFileSync(f, rel.endsWith('.json') ? ' ' : '\n-- probe\n'); for (const t of tests) sp(t[0], t[1], t[2] || {}); fs.writeFileSync(f, o); };
probe('common/tqtarget.js', [['change in common/tqtarget.js refuses ladybug tq', ['lock-check', '--arm', 'ladybug', '--tq']], ['change in common/tqtarget.js refuses search primary', ['lock-check', '--arm', 'search', '--config', 'e70177e5807f0252', '--sets', 'T1']]]);
probe('relational/schema.sql', [['change in relational/schema.sql refuses duckpgq primary (deps)', ['lock-check', '--arm', 'duckpgq', '--config', '95e990307da3b42b', '--sets', 'T1']], ['change in relational/schema.sql refuses relational tq', ['lock-check', '--arm', 'relational', '--tq']]]);
probe('reference/ref.js', [['change in reference/ref.js refuses ladybug s2 (deps)', ['lock-check', '--arm', 'ladybug', '--config', 'f233ae069bdba0ce', '--sets', 'T1']]]);
probe('ladybug/stage2.json', [['change in ladybug/stage2.json refuses ladybug primary', ['lock-check', '--arm', 'ladybug', '--config', '95e990307da3b42b', '--sets', 'T1']]]);
probe('relational/tq.js', [['change in relational/tq.js refuses relational tq', ['lock-check', '--arm', 'relational', '--tq']]]);
// a new .js file in an arm folder refuses
fs.writeFileSync(path.join(FAKE, 'arms', 'floor-co', 'extra.js'), '// probe\n');
sp('added file floor-co/extra.js refuses floor-co', ['lock-check', '--arm', 'floor-co', '--config', 'c4d2f0a60a3d199c', '--sets', 'T1']);
fs.unlinkSync(path.join(FAKE, 'arms', 'floor-co', 'extra.js'));
// sealed visible: run (tune) and tq are refused when <GT_BUILD>/sealed lists an entry
fs.mkdirSync(path.join(FAKE, 'sealed'), { recursive: true }); fs.writeFileSync(path.join(FAKE, 'sealed', 'x.txt'), 'x');
sp('sealed visible refuses run (tune)', ['run', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T1', '--split', 'tune', '--limit', '1']);
sp('sealed visible refuses tq (tune)', ['tq', '--arm', 'relational', '--split', 'tune']);
fs.rmSync(path.join(FAKE, 'sealed'), { recursive: true, force: true });
// stale records under _replaced are never read: removing the live record refuses
const live = path.join(FAKE, 'results', 'frozen', 'relational', '95e990307da3b42b.json'); const liveB = fs.readFileSync(live); fs.unlinkSync(live);
sp('live record removed (only _replaced copy left) refuses', ['lock-check', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T1']);
fs.writeFileSync(live, liveB);
sp('restored: duckpgq primary allowed again', ['lock-check', '--arm', 'duckpgq', '--config', '95e990307da3b42b', '--sets', 'T1'], {}, 'allowed');
sp('restored: ladybug tq allowed again', ['lock-check', '--arm', 'ladybug', '--tq'], {}, 'allowed');
// an answer file already present refuses without --repeat
const ansDir = path.join(FAKE, 'results', 'heldout', 'relational', 'primary'); fs.mkdirSync(ansDir, { recursive: true });
fs.writeFileSync(path.join(ansDir, 'T1.jsonl.gz'), '');
sp('existing answer file refuses', ['lock-check', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T1']);
fs.rmSync(path.join(FAKE, 'results', 'heldout', 'relational'), { recursive: true, force: true });
// SCORING_STARTED refuses every declared run and question run
fs.writeFileSync(path.join(FAKE, 'results', 'heldout', 'SCORING_STARTED'), '');
let after = 0; let afterRef = 0;
for (const r of PLAN.runs) { const o = lc(['lock-check', '--arm', r.arm, '--config', r.hash, '--sets', r.set], r.draw ? { LB_COMM_DRAW: String(r.draw) } : {}); after++; if (o.code === 3 && /SCORING_STARTED/.test(o.last)) afterRef++; }
for (const q of PLAN.question_runs) { const o = lc(['lock-check', '--arm', q.arm, '--tq']); after++; if (o.code === 3 && /SCORING_STARTED/.test(o.last)) afterRef++; }
const fz = lc(['freeze', '--arm', 'relational', '--config', '95e990307da3b42b', '--role', 'primary']);
res.special.push({ name: 'freeze after SCORING_STARTED', ok: fz.code !== 0 && /SCORING_STARTED/.test(fz.err + fz.last), out: (fz.last + ' ' + fz.err).slice(0, 200) });
fs.unlinkSync(path.join(FAKE, 'results', 'heldout', 'SCORING_STARTED'));
res.summary = {
  declared: res.declared.length, declared_allowed: res.declared.filter((x) => x.allowed).length,
  declared_tq: res.declared_tq.length, declared_tq_allowed: res.declared_tq.filter((x) => x.allowed).length,
  undeclared: res.undeclared.length, undeclared_refused: res.undeclared.filter((x) => x.refused).length,
  special: res.special.length, special_ok: res.special.filter((x) => x.ok).length,
  scoring_started_runs: after, scoring_started_refused: afterRef,
  heldout_dir_after: fs.readdirSync(path.join(FAKE, 'results', 'heldout')),
};
fs.writeFileSync(OUTF, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res.summary));
for (const x of res.special) console.log(x.ok ? 'OK ' : 'BAD', x.name, '|', x.out.slice(0, 160));
for (const x of [...res.declared, ...res.declared_tq].filter((y) => !y.allowed)) console.log('DECLARED NOT ALLOWED', JSON.stringify(x));
for (const x of res.undeclared.filter((y) => !y.refused)) console.log('UNDECLARED ALLOWED', JSON.stringify(x));
