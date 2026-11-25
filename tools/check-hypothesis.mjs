// The form check of the hypothesis gate on one file (brief research-tree/build/briefs/HYPOTHESIS-GATE.md, point 2).
// Usage: node tools/check-hypothesis.mjs <file>
// Exit 0 and "ok", or exit 1 and one line per fault. References (N x.y, D x.y, record: <path>) are checked against this
// repository (or HYPOTHESIS_GATE_ROOT when set). Reads only.
import { readFileSync } from 'node:fs';
globalThis.HYPOTHESIS_GATE_IMPORT = true;
const { checkHypothesis, ROOT } = await import('../.claude/hooks/hypothesis-gate.mjs');

const file = process.argv[2];
if (!file) { process.stderr.write('usage: node tools/check-hypothesis.mjs <file>\n'); process.exit(1); }
let text;
try { text = readFileSync(file, 'utf8'); } catch (e) { process.stdout.write(`cannot read ${file}: ${e.message}\n`); process.exit(1); }
const faults = checkHypothesis(text, ROOT);
if (!faults.length) { process.stdout.write('ok\n'); process.exit(0); }
process.stdout.write(faults.join('\n') + '\n');
process.exit(1);
