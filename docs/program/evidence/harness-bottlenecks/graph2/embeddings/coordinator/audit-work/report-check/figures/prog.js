const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const lines = fs.readFileSync(L + 'progress.jsonl', 'utf8').split('\n');
console.log('total lines (split)', lines.length, 'nonempty', lines.filter(Boolean).length);
const from = +(process.argv[2] || 223), to = +(process.argv[3] || 235);
for (let i = from; i <= to; i++) console.log('--- line', i, ':', lines[i - 1]);
