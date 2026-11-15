// splice a clean isCheckCmd into r10-calls.cjs (replaces lines 23-29) and allow .claude/worktrees edits
const fs = require('fs');
const f = __dirname + '/r10-calls.cjs';
const lines = fs.readFileSync(f, 'utf8').split('\n');
const fn = [
  'function isCheckCmd(cmd) {',
  '  if (isLookupCmd(cmd)) return false;',
  "  const q = cmd.replace(/\"[^\"]*\"|'[^']*'/g, 'Q');",
  "  const segs = q.split(/&&|\\|\\||;|\\||\\n/).map(x => x.trim().replace(/^(timeout\\s+\\d+\\s+|env\\s+\\S+=\\S+\\s+|\\w+=\\S+\\s+|uv\\s+run\\s+|python3?\\s+-m\\s+|poetry\\s+run\\s+|\\.\\/node_modules\\/\\.bin\\/)+/i, ''));",
  "  return segs.some(x => /^(\\S*[\\/\\\\])?(pytest|vitest|jest|tsc|mypy|ruff|eslint|alembic|eas|railway|docker|npm|npx|make|lint-imports|gradlew|bash\\s+\\S*check|sh\\s+\\S*check|\\.\\/\\S*check|\\S*manage\\.py)\\b/i.test(x) && CHECK.test(x));",
  '}',
];
const start = lines.findIndex(l => l.startsWith('function isCheckCmd'));
const end = lines.findIndex((l, i) => i > start && l === '}');
lines.splice(start, end - start + 1, ...fn);
let s = lines.join('\n');
s = s.replace("!/scratchpad|\\/Temp\\/|\\/\\.claude\\/|\\/docs\\//i.test(p)", "!/scratchpad|\\/Temp\\/|\\/docs\\//i.test(p) && !/\\/\\.claude\\/(?!worktrees\\/)/i.test(p)");
fs.writeFileSync(f, s);
console.log('spliced', start, end, s.includes('(?!worktrees'));
