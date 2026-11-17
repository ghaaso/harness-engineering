// copies the build folder into the harness repository (durable copy), leaving out scratch folders
const fs = require("fs"), path = require("path");
const SRC = "C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/tcb-build";
const DST = "C:/Users/User/Documents/projects/harness-engineering/research-tree";
const skip = new Set(["tmp", "review-tmp", "work", "logs", "model-review"]);
// by path, not by name (fixtures have their own wt folders): e2e/w is the end-to-end run's temporary run root (about 1,900 files and a nested .git per run); a top-level wt is a stray attempt folder
const skipRel = new Set(["e2e/w", "wt"]);
let n = 0, bytes = 0, same = 0;
const walk = (d, rel) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name), r = rel ? rel + "/" + f.name : f.name;
    if (f.isDirectory()) { if (!skip.has(f.name) && !skipRel.has(r)) walk(p, r); continue; }
    if (f.name.endsWith(".READY")) continue;
    const to = path.join(DST, r); fs.mkdirSync(path.dirname(to), { recursive: true });
    const b = fs.readFileSync(p);
    if (fs.existsSync(to) && fs.readFileSync(to).equals(b)) { same++; continue; }
    fs.writeFileSync(to, b); n++; bytes += b.length;
  }
};
walk(SRC, "");
console.log("snapshot: " + n + " files written (" + bytes + " bytes), " + same + " unchanged, into " + DST);
