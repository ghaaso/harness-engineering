const fs = require('fs');
const doc = process.argv[2];
let s = fs.readFileSync(doc, 'utf8');
const rep = (anchor, to) => { const n = s.split(anchor).length - 1; if (n !== 1) throw new Error('anchor count ' + n + ': ' + anchor.slice(0, 70)); s = s.replace(anchor, () => to); };
rep('**Method.** Three workflows, 19 agents, about 2.3M subagent tokens.', '**Method.** Three workflows, 19 agents, about 2.2M subagent tokens.');
rep('A last pass checked this section against its own evidence.', 'A last pass of three agents recomputed this section\'s numbers from the raw data, attacked §9.4, and confirmed the compaction setting in Claude Code\'s documentation. Its corrections are applied and its output is `fit/check.txt`.');
fs.writeFileSync(doc, s);
console.log('method fixed');
