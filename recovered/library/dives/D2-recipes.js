// Read-only: classify main's non-merge commits by file-shape recipe.
// Usage: node D2-recipes.js <repo>
const { execSync } = require('child_process');
const repo = process.argv[2];
const sh = (c) => execSync(c, { cwd: repo, maxBuffer: 1 << 28 }).toString();
const raw = sh("git log main --no-merges --name-status --format=@@%h%x1f%ad%x1f%s --date=short");
const commits = [];
let cur = null;
for (const line of raw.split('\n')) {
  if (line.startsWith('@@')) {
    const [h, d, s] = line.slice(2).split("");
    cur = { h, d, s, files: [] };
    commits.push(cur);
  } else if (line.trim() && cur) {
    const parts = line.split('\t');
    const st = parts[0][0];
    const p = parts[parts.length - 1];
    cur.files.push({ st, p });
  }
}
const isDoc = (p) => p.startsWith('docs/') || /\.md$/i.test(p);
const recipes = {
  migration: (c) => c.files.some((f) => f.st === 'A' && /^backend\/alembic\/versions\/.*\.py$/.test(f.p)),
  newBackendSlice: (c) => c.files.some((f) => f.st === 'A' && /^backend\/app\/features\/[^/]+\/router\.py$/.test(f.p)),
  backendEndpoint: (c) => {
    const s = new Set();
    for (const f of c.files) { const m = f.p.match(/^backend\/app\/features\/([^/]+)\/(router|service|schemas)\.py$/); if (m) s.add(m[1] + ':' + m[2]); }
    const slices = {};
    for (const k of s) { const [sl, fl] = k.split(':'); (slices[sl] = slices[sl] || new Set()).add(fl); }
    return Object.values(slices).some((x) => x.has('router') && x.has('service'));
  },
  newWebFeature: (c) => c.files.some((f) => f.st === 'A' && /^src\/features\/[^/]+\/index\.jsx?$/.test(f.p)),
  newMobileFeatureFile: (c) => c.files.some((f) => f.st === 'A' && /^technician-app\/src\/features\/[^/]+\/[^/]+\.tsx?$/.test(f.p) && !/\.test\./.test(f.p)),
  outboxKind: (c) => c.files.some((f) => /technician-app\/src\/lib\/outbox(Sync)?\.ts$/.test(f.p)),
};
const out = { total: commits.length, byRecipe: {}, anyRecipe: 0, docsOnly: 0, fix: 0, fixAndRecipe: 0, codeCommits: 0, claudeMdCommits: 0 };
for (const k of Object.keys(recipes)) out.byRecipe[k] = 0;
const recipeCommits = [];
for (const c of commits) {
  const code = c.files.filter((f) => !isDoc(f.p));
  if (c.files.length && code.length === 0) out.docsOnly++;
  else out.codeCommits++;
  if (c.files.some((f) => f.p === 'CLAUDE.md')) out.claudeMdCommits++;
  const isFix = /^(@ )?fix/i.test(c.s);
  if (isFix) out.fix++;
  let any = false;
  for (const [k, fn] of Object.entries(recipes)) if (fn(c)) { out.byRecipe[k]++; any = true; }
  if (any) { out.anyRecipe++; recipeCommits.push(c.h); if (isFix) out.fixAndRecipe++; }
}
out.anyRecipeShareOfCode = +(out.anyRecipe / out.codeCommits).toFixed(3);
// Lines added per code commit, split recipe vs other.
function added(h) {
  const n = sh(`git show --numstat --format= ${h}`).split('\n').filter(Boolean);
  let a = 0; for (const l of n) { const [x, , p] = l.split('\t'); if (x !== '-' && !isDoc(p) && !/lock\.json$/.test(p)) a += +x; } return a;
}
let ra = 0, oa = 0;
const rs = new Set(recipeCommits);
for (const c of commits) { const code = c.files.filter((f) => !isDoc(f.p)); if (!code.length) continue; const a = added(c.h); if (rs.has(c.h)) ra += a; else oa += a; }
out.linesAddedRecipeCommits = ra; out.linesAddedOtherCode = oa;
out.recipeShareOfAddedLines = +(ra / (ra + oa)).toFixed(3);
console.log(JSON.stringify(out, null, 1));
