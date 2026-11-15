const fs = require('fs');
const p = process.argv[2];
let s = fs.readFileSync(p, 'utf8');
const NL = String.fromCharCode(10);
const i = s.indexOf('const split =');
const j = s.indexOf(NL, i);
const line = "const BS = String.fromCharCode(92); const split = (line) => line.split(new RegExp('(?<!' + BS + BS + ')[|]')).map((s) => s.trim());";
s = s.slice(0, i) + line + s.slice(j);
fs.writeFileSync(p, s);
