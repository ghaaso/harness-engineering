// U4 data step: training blocks cut from history before the tuning blocks, under the card run's rule
// (runbig/card/d4/extract.mjs lines 127-131; checked by d4lib.py:70), plus the content snapshots at each split start.
// usage (in a container, card code at /card, repo at /src, card data at /carddata/<name>):
//   node extract_train.mjs <name> /src <outroot> <ref> <maxTrainBlocks> <segBlocks>
// Writes <outroot>/data/<name>/{commits.jsonl, plan.json, blocks/<k>.json} and <outroot>/snap/<name>/{index.json, texts.jsonl}.
// The card's tuning and held-out blocks are copied unchanged (same k); training blocks get k = 1000 + j (j in time order).
// Every card block is also recomputed here and must match the card's file byte for byte, so the training blocks are
// provably cut by the same code path.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseLog, replay, resolveImports } from '/card/extract.mjs';

const [, , NAME, REPO, OUTROOT, REF, MAXB, SEGB] = process.argv;
const BLOCK = NAME === 'zulip' ? 20 : 10, MIN_F = 2, MAX_F = 50;
const CODE = /\.(py|js|jsx|ts|tsx|mjs|cjs)$/;
const SKIP = /(^|\/)(node_modules|vendor|third|\.git|dist|build)\/|\.min\.js$/;
const isCode = (p) => CODE.test(p) && !SKIP.test(p);
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 30 });
const CARD = path.join('/carddata', NAME);
const OUT = path.join(OUTROOT, 'data', NAME);
const SNAP = path.join(OUTROOT, 'snap', NAME);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), NAME, ...a);

// pathsAt of extract.mjs (not exported there), replayed once and snapshotted at every needed index.
// Same operations in the same order on one Map, so each snapshot equals a fresh pathsAt(commits, upto).
function pathsAtMany(commits, uptos) {
  const want = [...new Set(uptos)].sort((a, b) => a - b); const res = new Map();
  const idOf = new Map(); let next = 0; let w = 0;
  for (let i = 0; i <= commits.length && w < want.length; i++) {
    while (w < want.length && want[w] === i) { res.set(i, new Map(idOf)); w++; }
    if (i === commits.length) break;
    for (const l of commits[i].lines) {
      const f = l.split('\t'); const st = f[0][0];
      if (st === 'R' || st === 'C') {
        const oc = isCode(f[1]), nc = isCode(f[2]);
        if (st === 'R' && oc && nc && idOf.has(f[1])) { const id = idOf.get(f[1]); idOf.delete(f[1]); idOf.set(f[2], id); }
        else if (st === 'R' && oc && idOf.has(f[1])) idOf.delete(f[1]);
        else if (nc) idOf.set(f[2], next++);
      } else if (st === 'A') { if (isCode(f[1])) idOf.set(f[1], next++); }
      else if (st === 'D') idOf.delete(f[1]);
      else if ((st === 'M' || st === 'T') && isCode(f[1]) && !idOf.has(f[1])) idOf.set(f[1], next++);
    }
  }
  return res;
}

function hendOf(rep, first) { let h = first; while (h > 0 && rep[h - 1].ct >= rep[first].ct) h--; return h; }   // extract.mjs:129

function importsAt(commits, h, pm) {   // extract.mjs:133-140, unchanged
  let edges = [];
  if (h > 0) {
    const sha = commits[h - 1].sha;
    try {
      const g = execFileSync('git', ['-C', REPO, 'grep', '-I', '-n', '-E', '^\\s*(from\\s+\\S+\\s+import|import\\s+[A-Za-z_.]|import\\s+.*from|import\\s+[\'"]|.*\\brequire\\(\'|.*\\brequire\\(")', sha, '--', '*.py', '*.js', '*.jsx', '*.ts', '*.tsx', '*.mjs', '*.cjs'], { encoding: 'utf8', maxBuffer: 1 << 30 });
      edges = [...resolveImports(pm, g.split('\n'))];
    } catch (e) { edges = []; }
  }
  return edges;
}

function blockJson(k, pm, edges) { const alive = {}; for (const [p, id] of pm) alive[id] = p; return JSON.stringify({ k, alive, imports: edges }); }

// no ancestor of the snapshot commit lies at or after the cutoff (the refuter's anc.mjs check, per snapshot)
function lateAncestors(snapSha, hend, idx) {
  const anc = git('rev-list', '--no-merges', snapSha).split('\n').filter(Boolean);
  return anc.filter((s) => idx.has(s) && idx.get(s) >= hend).length;
}

function main() {
  fs.mkdirSync(path.join(OUT, 'blocks'), { recursive: true }); fs.mkdirSync(SNAP, { recursive: true });
  const raw = git('log', REF, '--no-merges', '--format=%x01%H%x02%ct%x02%s%x03', '--name-status', '-M', '--reverse');
  let commits = parseLog(raw);
  commits = commits.map((c, i) => ({ ...c, i })).sort((a, b) => a.ct - b.ct || a.i - b.i);
  const rep = replay(commits);
  const cj = rep.map((c) => JSON.stringify({ sha: c.sha, ct: c.ct, msg: c.msg, ev: c.ev })).join('\n') + '\n';
  const cardCj = fs.readFileSync(path.join(CARD, 'commits.jsonl'), 'utf8');
  if (cj !== cardCj) throw new Error('replayed history differs from the card run commits.jsonl (ref ' + REF + ')');
  fs.writeFileSync(path.join(OUT, 'commits.jsonl'), cj);
  log('history identical to the card run:', rep.length, 'commits');
  const plan = JSON.parse(fs.readFileSync(path.join(CARD, 'plan.json'), 'utf8'));
  const tuneBlocks = plan.blocks.filter((b) => b.split === 'tune'), testBlocks = plan.blocks.filter((b) => b.split === 'test');
  const tuneStart = rep[tuneBlocks[0].tasks[0]].ct;
  // eligible commits strictly before the tuning split's start (ct < its cutoff), same eligibility as extract.mjs:118
  const eligible = []; rep.forEach((c, i) => { const m = c.ev.filter((e) => e[1] === 'M').length; if (m >= MIN_F && m <= MAX_F) eligible.push(i); });
  const pre = eligible.filter((i) => rep[i].ct < tuneStart);
  // blocks of BLOCK consecutive eligible commits, cut backwards from the tuning start so the last one ends just before it;
  // the most recent maxTrainBlocks are kept, the leftover (< BLOCK) at the start of history is dropped
  const nb = Math.min(Math.floor(pre.length / BLOCK), +MAXB);
  const train = [];
  for (let j = 0; j < nb; j++) { const end = pre.length - (nb - 1 - j) * BLOCK; train.push(pre.slice(end - BLOCK, end)); }
  const segB = +SEGB;
  const tb = train.map((tasks, j) => {
    const first = tasks[0], h = hendOf(rep, first);
    return { k: 1000 + j, split: 'train', tasks, hend: h, cutoff_ct: rep[first].ct, seg: 'train' + Math.floor(j / segB) };
  });
  // recompute every card block and every training block from one replay
  const allB = [...plan.blocks, ...tb];
  for (const b of plan.blocks) { if (hendOf(rep, b.tasks[0]) !== b.hend || rep[b.tasks[0]].ct !== b.cutoff_ct) throw new Error('card block ' + b.k + ' hend differs'); }
  const segFirst = new Map();   // segment name -> hend of its first block (the split start)
  for (const b of tb) if (!segFirst.has(b.seg)) segFirst.set(b.seg, b.hend);
  segFirst.set('tune', tuneBlocks[0].hend); segFirst.set('test', testBlocks[0].hend);
  const pms = pathsAtMany(commits, [...allB.map((b) => b.hend), ...segFirst.values()]);
  const idx = new Map(rep.map((c, i) => [c.sha, i]));
  let late = 0;
  for (const b of allB) {
    const pm = pms.get(b.hend);
    const js = blockJson(b.k, pm, importsAt(commits, b.hend, pm));
    if (b.split !== 'train') {
      const card = fs.readFileSync(path.join(CARD, 'blocks', b.k + '.json'), 'utf8');
      if (js !== card) throw new Error('recomputed card block ' + b.k + ' differs from the card file');
    } else if (b.hend > 0) late += lateAncestors(commits[b.hend - 1].sha, b.hend, idx);
    fs.writeFileSync(path.join(OUT, 'blocks', b.k + '.json'), js);
  }
  log('card blocks recomputed byte-identical:', plan.blocks.length, '; training blocks:', tb.length, '; late ancestors in training import snapshots:', late);
  if (late) throw new Error('a training import snapshot has an ancestor at or after its cutoff');
  const out = { ...plan, train_rule: { block_size: BLOCK, eligible_before_tune: pre.length, max_blocks: +MAXB, seg_blocks: segB, tune_start_ct: tuneStart },
    blocks: [...tb, ...plan.blocks] };
  fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(out));
  // content snapshots: the tree of commits[h-1] at each split start (training segments, tuning, held-out)
  const index = { segments: {} }; const seen = new Set(); const textsF = path.join(SNAP, 'texts.jsonl');
  fs.writeFileSync(textsF, '');
  for (const [seg, h] of segFirst) {
    const ent = { hend: h, ct_cutoff: h < rep.length ? rep[h].ct : null, sha: h > 0 ? commits[h - 1].sha : null, files: {} };
    if (h > 0) {
      const lateA = lateAncestors(ent.sha, h, idx);
      if (lateA) throw new Error('snapshot ' + seg + ' has an ancestor at or after its cutoff');
      const pm = pms.get(h);
      const tree = new Map(git('ls-tree', '-r', ent.sha).split('\n').filter(Boolean).map((l) => { const [meta, p] = l.split('\t'); return [p, meta.split(' ')[2]]; }));
      const need = [];
      for (const [p, id] of pm) {
        const blob = tree.get(p); if (!blob) continue;   // path not in that tree: no content (NaN cosine)
        const key = blob + ':' + p; ent.files[id] = key;
        if (!seen.has(key)) { seen.add(key); need.push([key, blob, p]); }
      }
      if (need.length) {
        const r = spawnSync('git', ['-C', REPO, 'cat-file', '--batch'], { input: need.map((x) => x[1]).join('\n') + '\n', maxBuffer: 2 ** 31 - 1 });
        const buf = r.stdout; let off = 0; const lines = [];
        for (const [key, blob, p] of need) {
          const nl = buf.indexOf(10, off); const head = buf.toString('utf8', off, nl).split(' '); off = nl + 1;
          if (head[1] !== 'blob') throw new Error('cat-file ' + blob + ': ' + head.join(' '));
          const n = +head[2]; const text = buf.toString('utf8', off, off + n); off += n + 1;
          lines.push(JSON.stringify({ key, path: p, text }));
        }
        fs.appendFileSync(textsF, lines.join('\n') + '\n');
      }
    }
    index.segments[seg] = ent;
    log('snapshot', seg, 'hend', h, 'files', Object.keys(ent.files).length);
  }
  index.block_seg = Object.fromEntries(allB.map((b) => [b.k, b.split === 'train' ? b.seg : b.split]));
  fs.writeFileSync(path.join(SNAP, 'index.json'), JSON.stringify(index));
  log('unique (blob, path) texts:', seen.size);
}
main();
