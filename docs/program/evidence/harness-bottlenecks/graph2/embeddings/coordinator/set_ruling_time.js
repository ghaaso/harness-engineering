// sets a ruling file's time placeholder (one write) and prints its sha256: node set_ruling_time.js <file>
const fs = require("fs"), crypto = require("crypto");
const f = process.argv[2];
let t = fs.readFileSync(f, "utf8");
if (!t.includes("@@TIME@@")) { console.error("no time placeholder (already set?)"); process.exit(1); }
const hm = new Date().toISOString().slice(11, 16) + "Z";
fs.writeFileSync(f, t.replace("@@TIME@@", hm));
console.log(f, "| time", hm, "| sha256", crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"), "| lines", t.split("\n").length - 1);
