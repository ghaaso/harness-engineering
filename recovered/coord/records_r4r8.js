// Coordinator check (step 5): the saved mount records of ktest-r4 and ktest-r8 against the plan's parent sets.
// usage: node records_r4r8.js <lane folder> [record name ...]
// It reads only the lane's records, the plan and the tuning commit list. No backslash regex (the shell mangles them inline).
const fs = require("fs");
const path = require("path");
const LANE = process.argv[2];
const names = process.argv.slice(3).length ? process.argv.slice(3) : ["ktest-r4", "ktest-r8"];
const BS = String.fromCharCode(92);
const norm = (s) => String(s).split(BS).join("/");
const plan = JSON.parse(fs.readFileSync(path.join(LANE, "train/stageB/plan.json"), "utf8"));
const held = new Set(Object.keys((plan.heldout && plan.heldout.assignment) || {}));
const rows = fs.readFileSync(path.join(LANE, "eval/tune_commits.jsonl"), "utf8").split("\n").filter(Boolean).map((s) => JSON.parse(s));
console.log("tune_commits.jsonl: rows", rows.length, "| keys of row 0:", Object.keys(rows[0]).join(","));
const lateRows = rows.filter((r) => r.late50 === true);
const late = new Set(lateRows.map((r) => r.parent));
const all = new Set(rows.map((r) => r.parent));
console.log("late-50 rows", lateRows.length, "| late-50 parents", late.size, "| all tuning parents", all.size, "| held-out parents in the plan", held.size,
  "| late-50 and held-out share:", [...late].filter((p) => held.has(p)).length);
let bad = 0;
for (const n of names) {
  const file = path.join(LANE, "r58c/mounts", n + ".json");
  const x = JSON.parse(fs.readFileSync(file, "utf8"))[0];
  const g = [], other = [];
  for (const m of x.Mounts) {
    const s = norm(m.Source);
    const parts = s.split("/");
    const last = parts[parts.length - 1], dir = parts[parts.length - 2], up = parts[parts.length - 3];
    const isHex = last.length === 40 && [...last].every((c) => "0123456789abcdef".includes(c));
    if (isHex && up === "export" && (dir === "graphs" || dir === "graphs0")) g.push({ p: last, rw: m.RW, dir });
    else {
      const i = s.indexOf("/embeddings/"), j = s.indexOf("/graph2/");
      other.push((m.RW ? "rw " : "ro ") + (i >= 0 ? s.slice(i + 12) : j >= 0 ? "../../" + s.slice(j + 8) : s) + " -> " + m.Destination);
    }
  }
  const inLate = g.every((e) => late.has(e.p)), anyHeld = g.some((e) => held.has(e.p)), anyRw = g.some((e) => e.rw);
  const uniq = new Set(g.map((e) => e.p)).size;
  const missing = [...late].filter((p) => !g.some((e) => e.p === p)).length;
  const sealed = x.Mounts.some((m) => norm(m.Source).includes("/sealed"));
  const ok = inLate && !anyHeld && !anyRw && x.HostConfig.NetworkMode === "none" && !sealed;
  if (!ok) bad++;
  console.log(n, "| image", String(x.Image).slice(0, 19), "| net", x.HostConfig.NetworkMode, "| mem", x.HostConfig.Memory / 2 ** 20, "MiB | graph folders", g.length,
    "(distinct " + uniq + ", dirs " + [...new Set(g.map((e) => e.dir))].join("+") + ")", "| all in the late-50 set:", inLate, "| late-50 parents not mounted:", missing,
    "| any held-out:", anyHeld, "| any graph folder writable:", anyRw, "| any sealed path:", sealed, "|", ok ? "OK" : "PROBLEM");
  console.log("   other rows (" + other.length + "): " + other.join("; "));
}
process.exit(bad ? 1 : 0);
