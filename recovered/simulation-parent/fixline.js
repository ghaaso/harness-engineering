const fs = require('fs');
const f = 'build-page.js.txt';
const lines = fs.readFileSync(f, 'utf8').split('\n');
const i = lines.findIndex(l => l.startsWith('  const RB = R.html.replace('));
lines[i] = "  const RB = R.html.replace(/<script\\b[\\s\\S]*?<\\/script>/g, '');";
fs.writeFileSync(f, lines.join('\n'));
console.log(i + 1, lines[i]);
