const fs = require("fs"); const f = process.argv[2]; let s = fs.readFileSync(f, "utf8");
const a = 'fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(s, to); const h = sha(to);';
const b = 'fs.mkdirSync(path.dirname(to), { recursive: true }); if (!(fs.existsSync(to) && sha(to) === sha(s))) { if (fs.existsSync(to)) fs.chmodSync(to, 0o666); fs.copyFileSync(s, to); fs.chmodSync(to, 0o666); } const h = sha(to);';
if (!s.includes(a)) { console.error("anchor not found"); process.exit(1); }
fs.writeFileSync(f, s.replace(a, b)); console.log("patched: a copy is skipped when the bytes are equal, and a read-only target is made writable first");
