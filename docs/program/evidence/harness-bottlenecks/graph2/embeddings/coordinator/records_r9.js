// Coordinator check (step 8): the saved mount record of ktest-r9 against the plan's held-out parent set (ruling 102).
const fs = require("fs"), path = require("path");
const LANE = process.argv[2]; const BS = String.fromCharCode(92); const norm = (s) => String(s).split(BS).join("/");
const plan = JSON.parse(fs.readFileSync(path.join(LANE, "train/stageB/plan.json"), "utf8"));
const held = new Set(Object.keys(plan.heldout.assignment));
const x = JSON.parse(fs.readFileSync(path.join(LANE, "r58c/mounts/ktest-r9.json"), "utf8"))[0];
const g = [], other = [];
for (const m of x.Mounts) { const s = norm(m.Source); const p = s.split("/"); const last = p[p.length - 1], dir = p[p.length - 2], up = p[p.length - 3];
  const isHex = last.length === 40 && [...last].every((c) => "0123456789abcdef".includes(c));
  if (isHex && up === "export" && (dir === "graphs" || dir === "graphs0")) g.push({ p: last, rw: m.RW });
  else { const i = s.indexOf("/embeddings/"), j = s.indexOf("/graph2/"); other.push((m.RW ? "rw " : "ro ") + (i >= 0 ? s.slice(i + 12) : j >= 0 ? "../../" + s.slice(j + 8) : s) + " -> " + m.Destination); } }
const sealed = x.Mounts.some((m) => norm(m.Source).includes("/sealed"));
const ok = g.length === held.size && g.every((e) => held.has(e.p)) && new Set(g.map((e) => e.p)).size === held.size && !g.some((e) => e.rw) && !x.Mounts.some((m) => m.RW) && x.HostConfig.NetworkMode === "none" && !sealed;
console.log("ktest-r9 | image", String(x.Image).slice(0, 19), "| net", x.HostConfig.NetworkMode, "| mem", x.HostConfig.Memory / 2 ** 20, "MiB | graph folders", g.length, "| all are held-out parents of the plan:", g.every((e) => held.has(e.p)), "| held-out parents not mounted:", [...held].filter((p) => !g.some((e) => e.p === p)).length, "| any writable mount:", x.Mounts.some((m) => m.RW), "| any sealed path:", sealed, "|", ok ? "OK" : "PROBLEM");
console.log("   other rows (" + other.length + "): " + other.join("; "));
process.exit(ok ? 0 : 1);
