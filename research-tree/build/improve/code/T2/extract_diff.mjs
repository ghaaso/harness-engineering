// T2 probe data step (D4b): for every TRAINING and TUNING block of U4 (held-out blocks are skipped, never read):
//  - the seed's own diff in its task commit (changed lines and hunk headers only, -U0), nothing of the commit's other files;
//  - the content of every alive file in the tree of commits[hend-1] (the last commit before the block's cutoff).
// usage (container, U4 data at /u4data/<name>, repo at /src ro): node extract_diff.mjs <name> /src <ref> <outdir>
// Writes <outdir>/<name>/diffs.jsonl.gz  {k, t, seed (global id), old, new, diff}
//        <outdir>/<name>/docs.jsonl.gz   {blob, text}   (unique blobs)
//        <outdir>/<name>/trees.json      {k: {id: blob}}
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { parseLog } from '/card/extract.mjs';

const [, , NAME, REPO, REF, OUTROOT] = process.argv;
const CODE = /\.(py|js|jsx|ts|tsx|mjs|cjs)$/;
const SKIP = /(^|\/)(node_modules|vendor|third|\.git|dist|build)\/|\.min\.js$/;
const isCode = (p) => CODE.test(p) && !SKIP.test(p);
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 30 });
const OUT = path.join(OUTROOT, NAME);
const D = path.join('/u4data', NAME);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), NAME, ...a);

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const raw = git('log', REF, '--no-merges', '--format=%x01%H%x02%ct%x02%s%x03', '--name-status', '-M', '--reverse');
  let commits = parseLog(raw);
  commits = commits.map((c, i) => ({ ...c, i })).sort((a, b) => a.ct - b.ct || a.i - b.i);
  const u4 = fs.readFileSync(path.join(D, 'commits.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  if (u4.length !== commits.length || u4.some((c, i) => c.sha !== commits[i].sha)) throw new Error('commit order differs from U4 data');
  const plan = JSON.parse(fs.readFileSync(path.join(D, 'plan.json'), 'utf8'));
  const blocks = plan.blocks.filter((b) => b.split === 'train' || b.split === 'tune');   // never 'test'
  // needs: for every task commit t, the path of each modified seed id just before t and just after t
  const needAt = new Map();   // commit index -> [k, ...]
  for (const b of blocks) for (const t of b.tasks) { if (!needAt.has(t)) needAt.set(t, []); needAt.get(t).push(b.k); }
  // one streaming replay (same rules as extract.mjs pathsAt), keeping id -> path
  const idOf = new Map(), pathOf = new Map(); let next = 0;
  const pre = new Map();   // t -> Map(id -> path before t)
  const diffs = [];
  const step = (i) => {
    for (const l of commits[i].lines) {
      const f = l.split('\t'); const st = f[0][0];
      if (st === 'R' || st === 'C') {
        const oc = isCode(f[1]), nc = isCode(f[2]);
        if (st === 'R' && oc && nc && idOf.has(f[1])) { const id = idOf.get(f[1]); idOf.delete(f[1]); idOf.set(f[2], id); pathOf.set(id, f[2]); }
        else if (st === 'R' && oc && idOf.has(f[1])) { pathOf.delete(idOf.get(f[1])); idOf.delete(f[1]); }
        else if (nc) { const id = next++; idOf.set(f[2], id); pathOf.set(id, f[2]); }
      } else if (st === 'A') { if (isCode(f[1])) { const id = next++; idOf.set(f[1], id); pathOf.set(id, f[1]); } }
      else if (st === 'D') { if (idOf.has(f[1])) { pathOf.delete(idOf.get(f[1])); idOf.delete(f[1]); } }
      else if ((st === 'M' || st === 'T') && isCode(f[1]) && !idOf.has(f[1])) { const id = next++; idOf.set(f[1], id); pathOf.set(id, f[1]); }
    }
  };
  let nd = 0, empty = 0;
  for (let i = 0; i < commits.length; i++) {
    let seeds = null;
    if (needAt.has(i)) {
      // seeds = ids with status M in this commit (U4's ev), path before
      seeds = [...new Set(u4[i].ev.filter((e) => e[1] === 'M').map((e) => e[0]))].map((id) => [id, pathOf.get(id)]);
    }
    step(i);
    if (seeds) {
      const sha = commits[i].sha;
      for (const [id, oldp] of seeds) {
        const newp = pathOf.get(id);
        const ps = [...new Set([oldp, newp].filter(Boolean))];
        let d = '';
        if (ps.length) {
          const r = spawnSync('git', ['-C', REPO, 'diff', '--no-color', '--no-ext-diff', '-M', '-U0', sha + '^', sha, '--', ...ps], { encoding: 'utf8', maxBuffer: 1 << 28 });
          d = r.stdout.split('\n').filter((l) => (l.startsWith('+') && !l.startsWith('+++')) || (l.startsWith('-') && !l.startsWith('---')) || l.startsWith('@@'))
            .map((l) => l.startsWith('@@') ? l.replace(/^@@[^@]*@@/, '') : l.slice(1)).join('\n');
        }
        if (!d.trim()) empty++;
        for (const k of needAt.get(i)) diffs.push(JSON.stringify({ k, t: i, seed: id, old: oldp || null, new: newp || null, diff: d }));
        nd++;
      }
    }
  }
  fs.writeFileSync(path.join(OUT, 'diffs.jsonl.gz'), zlib.gzipSync(diffs.join('\n') + '\n'));
  log('seed diffs', nd, 'empty', empty);
  // documents: tree of commits[hend-1] per block, alive ids from U4's block files
  const trees = {}; const seen = new Set(); let docs = []; let ndocs = 0;
  const DF = path.join(OUT, 'docs.jsonl.gz'); fs.writeFileSync(DF, '');
  for (const b of blocks) {
    const alive = JSON.parse(fs.readFileSync(path.join(D, 'blocks', b.k + '.json'), 'utf8')).alive;
    const ent = {};
    if (b.hend > 0) {
      const sha = commits[b.hend - 1].sha;
      const tree = new Map(git('ls-tree', '-r', sha).split('\n').filter(Boolean).map((l) => { const [meta, p] = l.split('\t'); return [p, meta.split(' ')[2]]; }));
      const need = [];
      for (const [id, p] of Object.entries(alive)) { const blob = tree.get(p); if (!blob) continue; ent[id] = blob; if (!seen.has(blob)) { seen.add(blob); need.push(blob); } }
      for (let s = 0; s < need.length; s += 2000) {
        const part = need.slice(s, s + 2000);
        const r = spawnSync('git', ['-C', REPO, 'cat-file', '--batch'], { input: part.join('\n') + '\n', maxBuffer: 2 ** 31 - 1 });
        const buf = r.stdout; let off = 0;
        for (const blob of part) {
          const nl = buf.indexOf(10, off); const head = buf.toString('utf8', off, nl).split(' '); off = nl + 1;
          if (head[1] !== 'blob') throw new Error('cat-file ' + blob);
          const n = +head[2]; docs.push(JSON.stringify({ blob, text: buf.toString('utf8', off, off + n) })); off += n + 1;
        }
      }
    }
    trees[b.k] = ent;
    if (docs.length) { fs.appendFileSync(DF, zlib.gzipSync(docs.join(String.fromCharCode(10)) + String.fromCharCode(10))); ndocs += docs.length; docs = []; }
  }
  fs.writeFileSync(path.join(OUT, 'trees.json'), JSON.stringify(trees));
  log('blocks', blocks.length, 'unique blobs', ndocs);
}
main();
