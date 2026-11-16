// Coordinator check (ruling 113 (d)): the saved mount records of kge-S1 against r58c/sleep-check/mounts.txt
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const S = "r58c/sleep-check"; const BS = String.fromCharCode(92); const norm = (s) => String(s).split(BS).join("/");
const held = new Set(Object.keys(JSON.parse(fs.readFileSync("train/stageB/plan.json", "utf8")).heldout.assignment));
const list = fs.readFileSync(path.join(S, "mounts.txt"), "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const [mode, src, dst, rw] = l.split(/ +/); return { mode, src, dst, rw }; });
console.log("mounts.txt rows:", list.length, "| writable rows:", list.filter((r) => r.rw === "rw").map((r) => r.src).join(", "), "| sha256", crypto.createHash("sha256").update(fs.readFileSync(path.join(S, "mounts.txt"))).digest("hex").slice(0, 16));
let bad = 0;
for (const f of fs.readdirSync(path.join(S, "mount-records")).sort()) {
  const x = JSON.parse(fs.readFileSync(path.join(S, "mount-records", f), "utf8"))[0];
  const mode = f.includes("control") ? "control" : "heldout";
  const want = list.filter((r) => r.mode === "all" || r.mode === mode);
  const got = x.Mounts.map((m) => ({ src: norm(m.Source), dst: m.Destination, rw: m.RW }));
  const rel = (s) => { const i = s.indexOf("/embeddings/"), j = s.indexOf("/graph2/build/"); return i >= 0 ? "LANE/" + s.slice(i + 12) : j >= 0 ? "BUILD/" + s.slice(j + 14) : s; };
  const gotKeys = new Set(got.map((g) => rel(g.src) + " " + g.dst + " " + (g.rw ? "rw" : "ro")));
  const wantKeys = new Set(want.map((w) => w.src + " " + w.dst + " " + w.rw));
  const extra = [...gotKeys].filter((k) => !wantKeys.has(k)), missing = [...wantKeys].filter((k) => !gotKeys.has(k));
  const heldGraphs = got.filter((g) => { const p = g.src.split("/"); return held.has(p[p.length - 1]); }).map((g) => g.src.split("/").slice(-2).join("/").slice(0, 22));
  const sealed = got.some((g) => g.src.includes("/sealed"));
  const ok = extra.length === 0 && (missing.length === 0 || f === "kge-S1-S1-control-s2.json") && x.HostConfig.NetworkMode === "none" && x.HostConfig.Memory === 6 * 2 ** 30 && !sealed && got.filter((g) => g.rw).length === 1;
  if (!ok) bad++;
  console.log(f, "| image", String(x.Image).slice(7, 19), "| net", x.HostConfig.NetworkMode, "| mem MiB", x.HostConfig.Memory / 2 ** 20, "| mounts", got.length, "(listed for " + mode + ": " + want.length + ") | extra", extra.length, "| missing", missing.length, missing.length ? "(" + missing.join("; ").slice(0, 120) + ")" : "", "| writable:", got.filter((g) => g.rw).map((g) => rel(g.src)).join(","), "| held-out parent folders:", heldGraphs.join(",") || "none", "| sealed:", sealed, "| cmd:", (x.Config.Cmd || []).join(" ").slice(0, 90), "|", ok ? "OK" : "LOOK");
}
process.exit(bad ? 1 : 0);
