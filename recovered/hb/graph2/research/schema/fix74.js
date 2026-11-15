// One-off: repair line 74 of docs_extract.js (backslashes lost through the shell).
const fs = require("fs");
const f = __dirname + "/docs_extract.js";
const lines = fs.readFileSync(f, "utf8").split("\n");
lines[73] = '  for (const m of txt.matchAll(/^(?:#{1,6} |\\| ?\\*{0,2}|- \\*\\*)((?:KS-)?[A-Z]{1,3}\\d{1,3}[a-z]?)\\b/gm)) { const pre=m[1].replace(/\\d.*$/,""); (idDefs[pre]=idDefs[pre]||new Set()).add(d+":"+m[1]); }';
fs.writeFileSync(f, lines.join("\n"));
