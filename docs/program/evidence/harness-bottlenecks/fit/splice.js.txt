// Splices section 9 into the compile and makes the linked edits. Every anchor must match exactly once.
const fs = require('fs');
const [doc, secFile] = process.argv.slice(2);
const NL = String.fromCharCode(10);
let s = fs.readFileSync(doc, 'utf8');
const crlf = s.indexOf(String.fromCharCode(13, 10)) >= 0;
if (crlf) s = s.split(String.fromCharCode(13, 10)).join(NL);
const sec = fs.readFileSync(secFile, 'utf8');
const once = (anchor) => { const n = s.split(anchor).length - 1; if (n !== 1) throw new Error('anchor count ' + n + ': ' + anchor.slice(0, 60)); };
const rep = (anchor, to) => { once(anchor); s = s.replace(anchor, () => to); };
if (s.indexOf('## 9. How the Horthy and BAML ideas fit') >= 0) throw new Error('section 9 already present');

rep('are already compiled and are cited here by id, not repeated.', 'are already compiled; §9 maps every one of them onto the bottlenecks.');
rep('Limits are in §8.', 'Limits are in §8. §9 was added later the same day, at the owner\'s request, by three further workflows; its method and limits are in §9 itself.');
rep('**The first moves, in order.**', '**What the Horthy and BAML ideas add (§9).** Every idea from both sweeps was run against the 21 bottlenecks. Of the 87 ideas the sweeps kept, 29 fit a bottleneck, and one dropped idea was promoted. They sharpen fix rounds, overstated reports and review, by turning those first steps into scripts that can fail. They reach nothing on the machine: eleven bottlenecks get no idea at all, so the first moves below do not change. One number came out of it: four in ten of November\'s tokens were read above Horthy\'s current 400k compaction line.' + NL + NL + '**The first moves, in order.**');
const a149 = s.slice(s.indexOf('Already written in this repository and cited, not repeated:'));
const line149 = a149.slice(0, a149.indexOf(NL));
rep(line149, 'How the Horthy and BAML ideas attach to these three rows is in §9.2 and §9.3: the replay seal, the gate-round verdict script, the fix-round clauses, the merge refusal and the finding table. The ship plan\'s reviewer rule (head SHA, fail-before and pass-after per finding) already exists in this repository.');
rep('Rerun the October forensics script on November to get per-slice figures.', 'Rerun the October forensics script on November to get per-slice figures. Lever (1) now has a number: 39.8 % of November\'s tokens were read in calls above 400k of context, 26.8 % of them in slice sessions (§9.4).');
rep('| card A2-08; mapper M4 |', 'The 10 November merges followed the owner\'s wrap-up instruction (card A2-11), so part of this was a decision. | cards A2-08, A2-11; mapper M4 |');
rep('| Transcript forensics rerun, then one token budget | B03, B04 |', '| Transcript forensics rerun, then one token budget | B03, B04 |' + NL + '| A seal on every replay and a stub run of every new gate script before either is trusted (§9.3, mechanisms 1 and 5) | B01, B04, B12, B17 |');
rep('## Appendix — evidence index', '---' + NL + NL + sec.replace(/^\s+|\s+$/g, '') + NL + NL + '## Appendix — evidence index');
rep('| `manifest.sha256` | Digests of every file above |', '| `fit/FIT-LIST.md`, `fit/DROPPED-RESCREEN.md` | §9: every kept idea with its final fit; every re-screened dropped idea with its verdict |' + NL + '| `fit/map.json`, `fit/map.txt`, `fit/review.json`, `fit/review.txt`, `fit/fit-final.json`, `fit/check.json`, `fit/check.txt` | §9: the mapping, the review, the final list and the last check, raw and rendered |' + NL + '| `fit/in/`, `fit/in2/` | §9: the brief and the lane files the agents read, built from the two PRs by script |' + NL + '| `fit/tally-buckets.js.txt`, `fit/tally-buckets-output.txt` | §9.4: November tokens by per-call context size |' + NL + '| `fit/*.js.txt` | §9: the build, render and workflow scripts as run |' + NL + '| `manifest.sha256` | Digests of every file above |');
if (crlf) s = s.split(NL).join(String.fromCharCode(13, 10));
fs.writeFileSync(doc, s);
console.log('spliced; lines', s.split(NL).length, 'bytes', Buffer.byteLength(s), 'crlf', crlf);
