// Fold the checkers' corrections into the compile: section 6 paragraph replaced, sections 0 and 3.6 reworded, the 6-17 % citation narrowed.
const fs = require('fs'); const F = 'HARNESS-BOTTLENECKS-2026-11.md';
let t = fs.readFileSync(F, 'utf8'); let n = 0;
const rep = (a, b) => { if (!t.includes(a)) { console.log('MISSING: ' + a.slice(0, 70)); return; } t = t.replace(a, b); n++; };
let neu = fs.readFileSync(process.argv[2], 'utf8').trim();
neu = neu.replace('(`fill/window-fill-output.txt`, `fill/verify/check.txt`).', 'The 9,342 slice calls counted there include 15 zero-usage placeholder lines; 9,327 are real calls (`fill/window-fill-output.txt`, `fill/verify/check.txt`).');
const a = t.indexOf('**The ceiling on recall, measured'); const b = t.indexOf('\n\n', a);
if (a < 0 || b < 0) console.log('MISSING: old paragraph'); else { t = t.slice(0, a) + neu + t.slice(b); n++; }
rep('; and the three quarters of every window that is not fetched content (next paragraph).', '. What recall could touch inside the windows is measured below.');
rep("Content fetched by reading and searching is 26.9 % of November's tokens, so that is the most any recall layer could touch.", "Content fetched by reading and searching is about 27 % of November's context tokens, and calls that only read or search re-read 43.6 % of them: two exposures for an index, neither of them a saving.");
rep('Measured later: content fetched by reading and searching is 26.9 % of all tokens, which caps what any index or recall layer can save (§6).', 'Measured later: content fetched by reading and searching is about 27 % of context tokens, and calls that only read or search re-read 43.6 % of them. Both are exposures for an index or for batching lookups, not savings (§6).');
rep('the context system used 6–17 % more tokens for the same recall, and the with-and-without trial showed identical results.', 'a Codex adapter that snapshots before compaction and restores after, tried on another project, used 6–17 % more tokens for the same recall, and the with-and-without trial showed identical results. None of these trials tested an index or a graph.');
rep('| §6: what fills the session windows, by kind of content, and the scripts as run |', '| §6: what fills the session windows, by kind of content, and the scripts as run |\n| `fill/verify/` | §6: the four checks of that measurement (method refuter, independent re-measurement, fidelity, claims refuter), their reports and scripts |');
fs.writeFileSync(F, t); console.log('replacements ' + n);
