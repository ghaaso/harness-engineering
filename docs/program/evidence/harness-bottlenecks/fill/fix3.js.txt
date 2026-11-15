// Fold the window-fill measurement into the compile (section 6, section 0, section 3.6, appendix).
const fs = require('fs'); const F = 'HARNESS-BOTTLENECKS-2026-11.md';
let t = fs.readFileSync(F, 'utf8'); let n = 0;
const rep = (a, b) => { if (!t.includes(a)) { console.log('MISSING: ' + a.slice(0, 70)); return; } t = t.replace(a, b); n++; };
const P = [
  '**The ceiling on recall, measured (added 2026-11-11, after the owner questioned this section).** The first version said recall cannot help slice-session windows. That was too strong: nobody had measured what fills them.',
  "Of November's 4.33 billion context tokens, **26.9 % was content the sessions fetched by reading and searching** (26.0 % in slice sessions, 14.8 % in the root, 40.1 % in subagents).",
  "32.5 % was the model's own earlier output carried forward: thinking, commands and the code it wrote.",
  '28.6 % was the start of each window, re-read on every call: the system prompt, tool definitions and instructions, and after a compaction the summary and re-attached files.',
  'The rest is messages (3.1 %), shell commands the script could not classify (4.3 %, some of them reads) and small items (4.6 %).',
  'So an index, a graph or a cache can touch at most about 27 %, and only the part of it that was a wrong turn.',
  'Inside the fetched share, 18.7 points are the first open of a file in a window and 7.0 points are a file opened again in the same window. The second figure is an upper bound on repeat reading: it includes a different range of the same file and a re-read after an edit.',
  'Sessions already fetch narrowly: in slice sessions range reads (`sed`) are 8.0 % and search hits (`grep`) 5.0 %, against 4.9 % for whole files (`cat`) and 5.4 % for the Read tool.',
  'Reads spread over 2,179 files; the 30 most-read hold 7.7 % of all tokens, and the ten documents among them 3.0 %.',
  '**How much of the fetched share was unnecessary is not measured**, so no saving can be claimed.',
  'These are estimates: context growth between calls, shared out by character count where several things arrived together, and weighted by how many later calls re-read each piece (`fill/window-fill-output.txt`).',
].join(' ');
rep('the fixed 70k per agent; slice-session windows, the largest sink.', 'the fixed 70k per agent; and the three quarters of every window that is not fetched content (next paragraph).\n\n' + P);
rep('not a graph server, not embeddings (§6).', "not a graph server, not embeddings (§6). Content fetched by reading and searching is 26.9 % of November's tokens, so that is the most any recall layer could touch.");
rep('(3) the root, 15 %.', '(3) the root, 15 %. Measured later: content fetched by reading and searching is 26.9 % of all tokens, which caps what any index or recall layer can save (§6).');
const row = '| `fit/*.js.txt` | §9: the build, render and workflow scripts as run |';
rep(row, row + '\n| `fill/window-fill-output.txt`, `fill/fill-result.json`, `fill/*.js.txt` | §6: what fills the session windows, by kind of content, and the scripts as run |');
fs.writeFileSync(F, t); console.log('replacements ' + n);
