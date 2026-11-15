// Read-only: for peer files that follow one recipe, what share of their lines is shared shape?
// A line counts as "shape" if its normalised text occurs in >= THRESH of the peer files.
// Usage: node D2-boilerplate.js <repo>
const fs = require('fs');
const path = require('path');
const repo = process.argv[2];
const groups = {
  'alembic migration': () => fs.readdirSync(path.join(repo, 'backend/alembic/versions')).filter((f) => f.endsWith('.py')).map((f) => path.join(repo, 'backend/alembic/versions', f)),
};
const featDir = path.join(repo, 'backend/app/features');
for (const kind of ['router.py', 'service.py', 'repository.py', 'schemas.py', 'models.py', 'deps.py']) {
  groups['backend ' + kind] = () => fs.readdirSync(featDir).map((d) => path.join(featDir, d, kind)).filter((p) => fs.existsSync(p));
}
const webDir = path.join(repo, 'src/features');
groups['web feature index.js'] = () => fs.readdirSync(webDir).map((d) => path.join(webDir, d, 'index.js')).filter((p) => fs.existsSync(p));
const norm = (l) => l.trim().replace(/\s+/g, ' ');
const meaningful = (l) => l && !/^(#|\/\/|"""|\*|\/\*)/.test(l);
const res = {};
for (const [g, list] of Object.entries(groups)) {
  const files = list();
  if (files.length < 3) continue;
  const fileLines = files.map((f) => fs.readFileSync(f, 'utf8').split(/\r?\n/).map(norm).filter(meaningful));
  const df = new Map();
  for (const ls of fileLines) for (const l of new Set(ls)) df.set(l, (df.get(l) || 0) + 1);
  const row = { files: files.length };
  for (const th of [0.5, 0.25]) {
    let shapeLines = 0, total = 0; const per = [];
    for (const ls of fileLines) {
      const s = ls.filter((l) => df.get(l) / files.length >= th).length;
      shapeLines += s; total += ls.length; per.push(s / Math.max(1, ls.length));
    }
    per.sort((a, b) => a - b);
    row['shapeShare@' + th] = +(shapeLines / total).toFixed(3);
    row['medianFileShare@' + th] = +per[Math.floor(per.length / 2)].toFixed(3);
  }
  row.meanLines = Math.round(fileLines.reduce((a, b) => a + b.length, 0) / files.length);
  res[g] = row;
}
console.log(JSON.stringify(res, null, 1));
