// analyse.mjs (replay-L8, Part B): new ruff/mypy flags per commit against its first parent; defect commits against control.
// Usage: node analyse.mjs [gate-replay.out.jsonl] > analyse.out.json   (reads gate-replay.out.jsonl; git read-only on the clinic repository)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const C = 'C:/Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop';
const git = (...a) => execFileSync('git', ['-C', C, ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
// Defect-making commits as located in RESULT.md (board line, then git): sha -> defects; fixing commit per defect.
const DEFECT = {
  '0dead1a': { ids: ['S01 V1 (P2)', 'S01 V2 (P2)'], fix: '8ce3193' },
  'a971319': { ids: ['S02 V1 (P2)'], fix: '5d0c8a4' },
  '06754a0': { ids: ['W1 (P1)'], fix: 'c489ad1' },
  '91fb5c0': { ids: ['W1 (P1), second commit'], fix: 'c489ad1' },
  '5d7be0f': { ids: ['S06 inert price check (P2)'], fix: '8ba7897' },
  '9db22c3': { ids: ['PQ-01 (P2)', 'PQ-02 (P2)'], fix: 'd460c0a' },
  'c1fb346': { ids: ['GD-01 (P1)'], fix: '1546deb' },
  'b6b510d': { ids: ['GV-01 (P1)', 'GV-02 (P1)'], fix: 'ec413dc' },
  '2fe142f': { ids: ['GV-01 (P1)', 'GV-02 (P1), second commit'], fix: 'ec413dc' },
};
const FIXMSG = /fix|answer|re-review|round [23]|correct/i;
const recs = new Map();
for (const l of fs.readFileSync(process.argv[2] || 'gate-replay.out.jsonl', 'utf8').split('\n')) if (l) { const o = JSON.parse(l); recs.set(o.sha, o); }
const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '');
function flags(o) {
  const out = [];
  for (const ln of o.mypy.out.split(/\r?\n/)) {
    const m = ln.match(/^(.+?\.pyi?):(?:(\d+):)? error: (.*?)\s*\[([a-z0-9-]+)\]$/); // line may be absent
    if (m) out.push({ tool: 'mypy', file: norm(m[1]), line: +(m[2] || 0), code: m[4], msg: m[3] });
  }
  for (const ln of o.ruff.out.split(/\r?\n/)) {
    const m = ln.match(/^(.+?\.pyi?):(\d+):\d+: ([A-Z]+\d+)\s+(.*)$/);
    if (m) out.push({ tool: 'ruff', file: norm(m[1]), line: +m[2], code: m[3], msg: m[4] });
  }
  for (const ln of o.fmt.out.split(/\r?\n/)) {
    const m = ln.match(/^Would reformat: (.+)$/);
    if (m) out.push({ tool: 'format', file: norm(m[1]), line: 0, code: 'fmt', msg: '' });
  }
  return out;
}
const key = (f) => `${f.tool}|${f.file}|${f.code}|${f.msg}`;
const rows = [];
const treesWithAny = { mypy: 0, ruff: 0, format: 0, crashed: 0 };
for (const o of recs.values()) {
  const fl = flags(o);
  for (const t of ['mypy', 'ruff', 'format']) if (fl.some((f) => f.tool === t)) treesWithAny[t]++;
  if (o.mypy.rc !== 0 && !fl.some((f) => f.tool === 'mypy')) treesWithAny.crashed++;
}
for (const [sha, o] of recs) {
  let full, parent, msg, merge;
  try { full = git('rev-parse', sha); parent = git('rev-parse', '--short=7', `${sha}^`); msg = git('log', '-1', '--format=%s', sha); merge = git('rev-list', '--parents', '-n1', sha).split(' ').length > 2; } catch { continue; }
  if (merge) continue;
  const p = [...recs.keys()].find((k) => parent.startsWith(k) || k.startsWith(parent));
  const defectKey = Object.keys(DEFECT).find((k) => sha.startsWith(k));
  const changed = git('diff', '--name-only', `${sha}^`, sha).split('\n').filter(Boolean);
  const pyChanged = changed.filter((f) => /\.pyi?$/.test(f));
  if (!p) { rows.push({ sha, msg, kind: defectKey ? 'defect' : 'noparent', parentRun: false, pyChanged: pyChanged.length }); continue; }
  const before = new Map();
  for (const f of flags(recs.get(p))) before.set(key(f), (before.get(key(f)) || 0) + 1);
  const added = [];
  for (const f of flags(o)) {
    const k = key(f);
    if (before.get(k) > 0) { before.set(k, before.get(k) - 1); continue; }
    if (changed.includes(f.file)) added.push(f);
  }
  const isFixedBy = Object.values(DEFECT).some((d) => sha.startsWith(d.fix));
  const kind = defectKey ? 'defect' : FIXMSG.test(msg) ? 'control-fix' : 'other';
  rows.push({ sha, msg: msg.slice(0, 100), kind, fixesADefect: isFixedBy, defects: defectKey ? DEFECT[defectKey].ids : undefined,
    pyChanged: pyChanged.length, changed: changed.length, newFlags: added });
}
const sum = (k) => {
  const r = rows.filter((x) => x.kind === k && x.newFlags);
  const by = (t) => r.filter((x) => x.newFlags.some((f) => f.tool === t)).length;
  return { commits: r.length, withPy: r.filter((x) => x.pyChanged).length, flaggedAny: r.filter((x) => x.newFlags.length).length,
    flaggedMypy: by('mypy'), flaggedRuff: by('ruff'), flaggedFormat: by('format'), flags: r.reduce((a, x) => a + x.newFlags.length, 0) };
};
console.log(JSON.stringify({ trees: recs.size, treesWithAny, summary: { defect: sum('defect'), controlFix: sum('control-fix'), other: sum('other') },
  defectRows: rows.filter((x) => x.kind === 'defect'), flaggedRows: rows.filter((x) => x.newFlags?.length),
  noParent: rows.filter((x) => x.kind === 'noparent' || x.parentRun === false).map((x) => x.sha) }, null, 1));
