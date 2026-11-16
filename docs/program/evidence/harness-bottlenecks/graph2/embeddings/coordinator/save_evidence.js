// Copies a curated set of the lane's records, code and primary data, and the coordinator's own files, from the session
// scratchpad into the project's evidence folder (durable). Read-only on the sources. Writes a manifest per folder.
// usage: node save_evidence.js <lane folder> <coord folder> <dest folder> [--dry]
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const [, , LANE, COORD, DEST, flag] = process.argv; const DRY = flag === "--dry";
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const picked = []; // [src abs, dest rel]
const walk = (dir, out = []) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (e.isFile()) out.push(p); } return out; };
const rel = (base, p) => path.relative(base, p).split(path.sep).join("/");
const add = (base, p, destRoot) => picked.push([p, destRoot + "/" + rel(base, p)]);
const topFiles = (dir, maxBytes, ok = () => true) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && fs.statSync(path.join(dir, e.name)).size <= maxBytes && ok(e.name)).map((e) => path.join(dir, e.name)) : [];
const tree = (dir, maxBytes, ok = () => true) => fs.existsSync(dir) ? walk(dir).filter((p) => fs.statSync(p).size <= maxBytes && ok(p)) : [];
const L = (...a) => path.join(LANE, ...a); const MB = 1048576;
const notBin = (n) => !/\.(pt|pyc|whl|tar|zip|part)$/i.test(n) && !n.includes("__pycache__");
// the lane: records at the top
for (const p of topFiles(LANE, 2 * MB, notBin)) add(LANE, p, "lane");
// the coordinator's folder inside the lane (rulings, the order, reviews, the freeze list, the audit, checks)
for (const p of topFiles(L("orchestrator"), 3 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("orchestrator", "end-of-run"), 2 * MB, notBin)) add(LANE, p, "lane");
// code and small records of training, evaluation and the report
for (const p of topFiles(L("train"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of topFiles(L("train", "stageA"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("train", "stageA"), 1 * MB, (q) => /meta\.json$/.test(q))) add(LANE, p, "lane");
for (const p of topFiles(L("train", "stageB"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("train", "stageB", "tables"), 8 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("train", "selectB"), 1 * MB, (q) => /choices\.json$/.test(q))) add(LANE, p, "lane");
for (const p of topFiles(L("train", "report"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("train", "report", "e5_route"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of topFiles(L("train", "report", "answer_level"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of topFiles(L("train", "report", "answer_level", "handoff"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("train", "heldout"), 8 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("train", "leak_audit"), 12 * MB, notBin)) add(LANE, p, "lane");
for (const p of topFiles(L("train", "probe"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("eval"), 3 * MB, notBin)) add(LANE, p, "lane");
for (const p of topFiles(L("grader-returns"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("heldout-launch"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("src"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of topFiles(L("gpu"), 1 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("fixes", "e4"), 1 * MB, (q) => /\.(json|md|txt)$/.test(q))) add(LANE, p, "lane");
// the end-order machinery: scripts, lists, records, step logs, the re-run check, the sleep check
for (const p of topFiles(L("r58c"), 1 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("r58c", "mounts"), 1 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("r58c", "sleep-check"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of topFiles(L("r58c", "rehearsal"), 1 * MB, notBin)) add(LANE, p, "lane");
for (const p of topFiles(L("r58c", "A"), 1 * MB, notBin)) add(LANE, p, "lane");
for (const p of topFiles(L("r58c", "B"), 1 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("r58c", "B", "lane-steps"), 1 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("r58c", "B", "tests"), 1 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("r58c", "B", "rerun"), 1 * MB, notBin)) add(LANE, p, "lane");
for (const p of topFiles(L("r58c", "B", "rerun-out", "20261115T131745Z"), 2 * MB, notBin)) add(LANE, p, "lane");
for (const p of tree(L("r58c", "closed-lists"), 1 * MB, notBin)) add(LANE, p, "lane");
// the coordinator's own scratch: scripts, drivers, grading outputs, the lines it appended, comparisons
for (const p of topFiles(COORD, 2 * MB, (n) => /\.(js|sh|json|out|md|txt)$/.test(n))) add(COORD, p, "coordinator");
// refuse anything that could be a reference answer
const bad = picked.filter(([s]) => s.split(path.sep).join("/").includes("/sealed/"));
if (bad.length) { console.error("a picked path lies under sealed: " + bad[0][0]); process.exit(1); }
const seen = new Map(); for (const [s, d] of picked) seen.set(d, s);
const list = [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
let bytes = 0; const byTop = {};
for (const [d, s] of list) { const n = fs.statSync(s).size; bytes += n; const k = d.split("/").slice(0, 3).join("/"); byTop[k] = (byTop[k] || 0) + n; }
console.log((DRY ? "DRY RUN: " : "") + "files " + list.length + " | " + (bytes / MB).toFixed(1) + " MB");
for (const k of Object.keys(byTop).sort((a, b) => byTop[b] - byTop[a]).slice(0, 22)) console.log("  " + (byTop[k] / MB).toFixed(1).padStart(7) + " MB  " + k);
if (DRY) process.exit(0);
const lines = { lane: [], coordinator: [] };
for (const [d, s] of list) { const to = path.join(DEST, d); fs.mkdirSync(path.dirname(to), { recursive: true }); if (!(fs.existsSync(to) && sha(to) === sha(s))) { if (fs.existsSync(to)) fs.chmodSync(to, 0o666); fs.copyFileSync(s, to); fs.chmodSync(to, 0o666); } const h = sha(to); if (h !== sha(s)) { console.error("copy differs: " + d); process.exit(2); } const top = d.split("/")[0]; lines[top].push(h + " *" + d.split("/").slice(1).join("/")); }
for (const top of Object.keys(lines)) fs.writeFileSync(path.join(DEST, top, "MANIFEST.sha256"), lines[top].join("\n") + "\n");
console.log("copied and verified: lane " + lines.lane.length + " files, coordinator " + lines.coordinator.length + " files; a MANIFEST.sha256 in each");
