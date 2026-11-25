// Extract history, plan (leak-free blocks) and per-block alive files + import edges for one repository.
// usage: node extract.mjs <name> <gitdir> <outdir> [--limit-window N]
// Output (outdir): commits.jsonl, plan.json, blocks/<k>.json
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [, , NAME, REPO, OUT] = process.argv;
if (!NAME || !REPO || !OUT) { console.error('usage: node extract.mjs name gitdir outdir'); process.exit(2); }
const BLOCK = +process.env.D4_BLOCK || (NAME === 'zulip' ? 20 : 10), MIN_F = 2, MAX_F = 50;
const CODE = /\.(py|js|jsx|ts|tsx|mjs|cjs)$/;
const SKIP = /(^|\/)(node_modules|vendor|third|\.git|dist|build)\/|\.min\.js$/;
const isCode = (p) => CODE.test(p) && !SKIP.test(p);
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 30 });

export function parseLog(raw) {
  const commits = [];
  for (const blk of raw.split('\x01').slice(1)) {
    const head = blk.split('\x03')[0];
    const [sha, ct, ...msgp] = head.split('\x02');
    const nm = blk.split('\x03')[1] || '';
    const lines = nm.split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean);
    commits.push({ sha, ct: +ct, msg: msgp.join(' ').slice(0, 600), lines });
  }
  return commits;
}

export function replay(commits) {
  // Assign persistent ids; ev = [[id, st]] st in A (added), M (modified), D (deleted); code files only.
  const idOf = new Map(); let next = 0; const out = [];
  for (const c of commits) {
    const ev = [];
    for (const l of c.lines) {
      const f = l.split('\t'); const st = f[0][0];
      if (st === 'R' || st === 'C') {
        const [oldp, newp] = [f[1], f[2]]; const sim = parseInt(f[0].slice(1), 10);
        const oc = isCode(oldp), nc = isCode(newp);
        if (st === 'R' && oc && nc && idOf.has(oldp)) { const id = idOf.get(oldp); idOf.delete(oldp); idOf.set(newp, id); if (sim < 100) ev.push([id, 'M']); }
        else if (st === 'R' && oc && idOf.has(oldp)) { ev.push([idOf.get(oldp), 'D']); idOf.delete(oldp); }
        else if (nc) { const id = next++; idOf.set(newp, id); ev.push([id, 'A']); }
      } else if (st === 'A') { if (isCode(f[1])) { const id = next++; idOf.set(f[1], id); ev.push([id, 'A']); } }
      else if (st === 'D') { if (idOf.has(f[1])) { ev.push([idOf.get(f[1]), 'D']); idOf.delete(f[1]); } }
      else if (st === 'M' || st === 'T') { if (isCode(f[1])) { if (!idOf.has(f[1])) idOf.set(f[1], next++); ev.push([idOf.get(f[1]), 'M']); } }
    }
    out.push({ sha: c.sha, ct: c.ct, msg: c.msg, ev, paths: null });
  }
  return out;
}

function pathsAt(commits, upto) { // id -> path map by replaying again (cheap) up to index upto (exclusive)
  const idOf = new Map(); let next = 0;
  for (let i = 0; i < upto; i++) {
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
  return idOf;
}

export function resolveImports(pathToId, lines) {
  // lines: "sha:path:lineno:text"; returns set of "a,b" id pairs (importer -> imported)
  const paths = [...pathToId.keys()];
  const pyMods = new Map(); // dotted suffix -> [paths]
  const byPath = new Set(paths);
  for (const p of paths) if (p.endsWith('.py')) {
    const parts = p.slice(0, -3).split('/'); if (parts[parts.length - 1] === '__init__') parts.pop();
    for (let i = 0; i < parts.length; i++) { const k = parts.slice(i).join('.'); if (!pyMods.has(k)) pyMods.set(k, []); pyMods.get(k).push(p); }
  }
  const exts = ['', '.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs', '/index.js', '/index.ts', '/index.tsx'];
  const edges = new Set();
  const add = (a, b) => { if (a !== b && pathToId.has(a) && pathToId.has(b)) edges.add(pathToId.get(a) + ',' + pathToId.get(b)); };
  for (const line of lines) {
    const m = line.match(/^[^:]*:(.*?):(\d+):(.*)$/); if (!m) continue; const [, src, , text] = m;
    if (src.endsWith('.py')) {
      let mm = text.match(/^\s*from\s+(\.*)([\w.]*)\s+import\s+(.*)$/);
      const targets = [];
      if (mm) {
        const [, dots, mod, names] = mm;
        let base = dots ? path.posix.dirname(src) : '';
        for (let i = 1; i < dots.length; i++) base = path.posix.dirname(base);
        const modp = mod ? mod.replace(/\./g, '/') : '';
        if (dots) { for (const c of [path.posix.join(base, modp) + '.py', path.posix.join(base, modp, '__init__.py')]) if (byPath.has(c)) targets.push(c);
          for (const n of names.split(',')) { const nm = n.trim().split(/\s+as\s+/)[0].replace(/[()]/g, ''); if (nm) { const c = path.posix.join(base, modp, nm) + '.py'; if (byPath.has(c)) targets.push(c); } } }
        else { const cs = pyMods.get(mod); if (cs && cs.length === 1) targets.push(cs[0]);
          for (const n of names.split(',')) { const nm = n.trim().split(/\s+as\s+/)[0].replace(/[()]/g, ''); const cs2 = pyMods.get(mod + '.' + nm); if (nm && cs2 && cs2.length === 1) targets.push(cs2[0]); } }
      } else if ((mm = text.match(/^\s*import\s+(.*)$/))) {
        for (const n of mm[1].split(',')) { const nm = n.trim().split(/\s+as\s+/)[0]; const cs = pyMods.get(nm); if (cs && cs.length === 1) targets.push(cs[0]); }
      }
      for (const t of targets) add(src, t);
    } else {
      const mm = text.match(/(?:from\s+|import\s+|require\()\s*['"]([^'"]+)['"]/); if (!mm) continue;
      let spec = mm[1];
      if (spec.startsWith('.')) { const base = path.posix.normalize(path.posix.join(path.posix.dirname(src), spec)); for (const e of exts) if (byPath.has(base + e)) { add(src, base + e); break; }
        // ts imports written with .js extension resolving to .ts
        if (/\.js$/.test(spec)) { const b2 = base.slice(0, -3); for (const e of ['.ts', '.tsx']) if (byPath.has(b2 + e)) { add(src, b2 + e); break; } } }
    }
  }
  return edges;
}

function main() {
  fs.mkdirSync(path.join(OUT, 'blocks'), { recursive: true });
  const raw = git('log', '--no-merges', '--format=%x01%H%x02%ct%x02%s%x03', '--name-status', '-M', '--reverse');
  let commits = parseLog(raw);
  // stable sort by committer time (git --reverse is topological-ish oldest first)
  commits = commits.map((c, i) => ({ ...c, i })).sort((a, b) => a.ct - b.ct || a.i - b.i);
  const rep = replay(commits);
  fs.writeFileSync(path.join(OUT, 'commits.jsonl'), rep.map((c) => JSON.stringify({ sha: c.sha, ct: c.ct, msg: c.msg, ev: c.ev })).join('\n') + '\n');
  const eligible = [];
  rep.forEach((c, i) => { const m = c.ev.filter((e) => e[1] === 'M').length; if (m >= MIN_F && m <= MAX_F) eligible.push(i); });
  const nE = eligible.length;
  let tune, test;
  if (NAME === 'zulip') { test = eligible.slice(-500); tune = eligible.slice(-700, -500); }
  else { const a = Math.floor(nE * 0.4), b = Math.floor(nE * 0.65); tune = eligible.slice(a, b); test = eligible.slice(b); }
  const mk = (list, split) => { const blocks = []; for (let i = 0; i < list.length; i += BLOCK) blocks.push({ split, tasks: list.slice(i, i + BLOCK) }); return blocks; };
  const TL = +process.env.D4_TUNE_LAST || 0; // stride pre-test: only the last TL tuning commits, no held-out blocks
  if (TL) { tune = tune.slice(-TL); test = []; }
  const blocks = [...mk(tune, 'tune'), ...mk(test, 'test')];
  blocks.forEach((b, k) => {
    b.k = k; const first = b.tasks[0];
    let h = first; while (h > 0 && rep[h - 1].ct >= rep[first].ct) h--; // strictly earlier committer time
    b.hend = h; b.cutoff_ct = rep[first].ct;
    const pm = pathsAt(commits, h); // path -> id at history end
    const alive = {}; for (const [p, id] of pm) alive[id] = p;
    let edges = [];
    if (h > 0) {
      const sha = commits[h - 1].sha;
      try {
        const g = execFileSync('git', ['-C', REPO, 'grep', '-I', '-n', '-E', '^\\s*(from\\s+\\S+\\s+import|import\\s+[A-Za-z_.]|import\\s+.*from|import\\s+[\'"]|.*\\brequire\\(\'|.*\\brequire\\(")', sha, '--', '*.py', '*.js', '*.jsx', '*.ts', '*.tsx', '*.mjs', '*.cjs'], { encoding: 'utf8', maxBuffer: 1 << 30 });
        edges = [...resolveImports(pm, g.split('\n'))];
      } catch (e) { edges = []; }
    }
    fs.writeFileSync(path.join(OUT, 'blocks', k + '.json'), JSON.stringify({ k, alive, imports: edges }));
  });
  const plan = { name: NAME, ncommits: rep.length, eligible: nE, block_size: BLOCK, blocks: blocks.map((b) => ({ k: b.k, split: b.split, tasks: b.tasks, hend: b.hend, cutoff_ct: b.cutoff_ct })) };
  fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(plan));
  console.log(NAME, 'commits', rep.length, 'eligible', nE, 'tune', tune.length, 'test', test.length, 'blocks', blocks.length);
}
if (process.argv[1] && process.argv[1].endsWith('extract.mjs')) main();
