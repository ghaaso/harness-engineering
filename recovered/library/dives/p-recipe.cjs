// Proponent dive: how much of FixFlow's main-line history is "recipe-shaped"
// (a recurring layer pattern a template could guide) vs one-off.
// Read-only: runs git log on the repo passed as argv[2].
const { execFileSync } = require('child_process');
const repo = process.argv[2];
const out = execFileSync('git', ['-C', repo, 'log', 'main', '--no-merges', '--format=@@%H|%s', '--name-only'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const commits = [];
let cur = null;
for (const line of out.split(/\r?\n/)) {
  if (line.startsWith('@@')) {
    const [h, ...s] = line.slice(2).split('|');
    cur = { h, s: s.join('|'), files: [] };
    commits.push(cur);
  } else if (line.trim() && cur) cur.files.push(line.trim());
}
const prefix = (s) => { const m = s.match(/^(\w+)(\(|:|!)/); return m ? m[1].toLowerCase() : 'other'; };
const layerOf = (f) => {
  if (/^backend\/alembic\/versions\//.test(f)) return 'migration';
  let m = f.match(/^backend\/app\/features\/[^/]+\/(router|service|repository|schemas|models|deps)\.py$/);
  if (m) return 'be:' + m[1];
  if (/^backend\/.*tests?\//.test(f) || /^backend\/tests\//.test(f)) return 'be:test';
  if (/^technician-app\/src\/features\//.test(f)) return /\.test\.tsx?$/.test(f) ? 'mob:test' : 'mob:feature';
  if (/^technician-app\/src\/lib\//.test(f)) return /\.test\.tsx?$/.test(f) ? 'mob:test' : 'mob:lib';
  if (/^src\/features\//.test(f)) return /\.test\.jsx?$/.test(f) ? 'web:test' : 'web:feature';
  if (/^docs\/|\.md$/.test(f)) return 'docs';
  if (/^\.github\/|eas\.json|app\.json|package(-lock)?\.json|pyproject\.toml|Dockerfile|railway|start\.sh|vite.*config/.test(f)) return 'config';
  return 'other';
};
const featOf = (f) => { const m = f.match(/features\/([^/]+)\//); return m ? m[1] : null; };
const byPrefix = {};
let migrations = 0, crossRuntime = 0, beSlice = 0, docsOnly = 0, configTouch = 0;
const shapeCount = {};
for (const c of commits) {
  const p = prefix(c.s); byPrefix[p] = (byPrefix[p] || 0) + 1;
  const layers = new Set(c.files.map(layerOf));
  if (layers.has('migration')) migrations++;
  if (layers.has('config')) configTouch++;
  if ([...layers].every((l) => l === 'docs')) docsOnly++;
  const beLayers = [...layers].filter((l) => l.startsWith('be:') && l !== 'be:test');
  if (beLayers.length >= 2) beSlice++;
  // same-named feature touched in 2+ runtimes
  const rt = {};
  for (const f of c.files) { const ft = featOf(f); if (!ft) continue; const r = f.split('/')[0]; (rt[ft] = rt[ft] || new Set()).add(r); }
  if (Object.values(rt).some((s) => s.size >= 2)) crossRuntime++;
  const shape = [...layers].filter((l) => l !== 'docs' && l !== 'other').sort().join('+') || '(docs/other)';
  shapeCount[shape] = (shapeCount[shape] || 0) + 1;
}
const n = commits.length;
const top = Object.entries(shapeCount).sort((a, b) => b[1] - a[1]);
const shapesSeen2 = top.filter(([, k]) => k >= 2).reduce((a, [, k]) => a + k, 0);
console.log(JSON.stringify({ n, byPrefix, migrations, configTouch, docsOnly, beSliceMultiLayer: beSlice, crossRuntimeSameFeature: crossRuntime,
  distinctShapes: top.length, commitsInShapesSeenTwiceOrMore: shapesSeen2, top12: top.slice(0, 12) }, null, 1));
