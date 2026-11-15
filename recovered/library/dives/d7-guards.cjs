// D7: read-only. For each fix commit on main (subject starts with "fix" or "@ fix"),
// does it ship a guard in the same commit (a test file, CI/dependabot config, a
// lint/type config)? Usage: node d7-guards.cjs <repo>
const { execFileSync } = require("child_process");
const repo = process.argv[2];
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", maxBuffer: 1 << 28 });
const lines = git("log", "main", "--no-merges", "--format=%H%x09%ad%x09%s", "--date=short").trim().split("\n");
const fixes = lines.map(l => l.split("\t")).filter(([, , s]) => /^(@ )?fix\b/i.test(s));
const isTest = p => /(^|\/)tests?\//.test(p) || /\.test\.(ts|tsx|js|jsx|mjs)$/.test(p) || /(^|\/)test_[^/]*\.py$/.test(p) || /__tests__\//.test(p);
const isGuardCfg = p => /^\.github\/(workflows\/|dependabot)/.test(p) || /(^|\/)(eslint\.config|\.eslintrc|pyproject\.toml|mypy\.ini|tsconfig[^/]*\.json)$/.test(p);
let withTest = 0, withCfg = 0, withAny = 0, rows = [];
for (const [h, d, s] of fixes) {
  const files = git("show", "--name-only", "--format=", h).trim().split("\n").filter(Boolean);
  const t = files.some(isTest), c = files.some(isGuardCfg);
  if (t) withTest++; if (c) withCfg++; if (t || c) withAny++;
  rows.push(`${h.slice(0, 7)} ${d} test=${t ? 1 : 0} cfg=${c ? 1 : 0} ${s.slice(0, 80)}`);
}
console.log(rows.join("\n"));
console.log(`\nfix commits: ${fixes.length}; ship a test file: ${withTest}; ship CI/lint/dependabot config: ${withCfg}; either: ${withAny}`);
