const fs = require("fs"), path = require("path");
const L = fs.readFileSync("train/heldout/progress.jsonl", "utf8").split("\n").filter(Boolean).map((s) => JSON.parse(s));
const done = L.filter((o) => o.status === "done" && typeof o.wall_s === "number");
const slow = done.filter((o) => o.wall_s > 200); console.log("units over 200 s:", slow.map((o) => o.unit + " wall_s " + o.wall_s + " tasks " + o.tasks + " done " + o.t).join(" | "));
const u = slow[0]; if (!u) process.exit(0);
const [, arm, cid, s, C] = u.unit.split("/");
const dir = path.join("train/heldout/parts", arm, cid);
console.log("part folder of the unit:", fs.readdirSync(path.join(dir, s, C)).join(", "));
for (const seed of ["s1", "s2", "s3"]) { const d = path.join(dir, seed, C); if (!fs.existsSync(d)) { console.log(seed, "no folder"); continue; }
  for (const f of fs.readdirSync(d)) { const st = fs.statSync(path.join(d, f)); console.log("  " + seed + "/" + f + " " + st.size + " bytes, mtime " + st.mtime.toISOString()); } }
