// prints the line numbers of the coordinator's units that item27.py orders, and the last tune_rank_check line's bound hashes
const fs = require("fs"), crypto = require("crypto");
const L = fs.readFileSync("progress.jsonl", "utf8").split("\n").filter(Boolean).map((s, i) => { try { return [i + 1, JSON.parse(s)]; } catch (e) { return [i + 1, null]; } });
const bad = L.filter(([, o]) => o === null).map(([i]) => i);
const idx = (u) => L.filter(([, o]) => o && o.step === "coordinator" && o.unit === u).map(([i]) => i);
for (const u of ["tables_digest", "code_freeze", "grader_frozen", "tune_report", "tune_rank_check", "item27_freeze", "nonfinite_heldout"]) console.log(u, "at lines", JSON.stringify(idx(u)));
const last = L.filter(([, o]) => o && o.unit === "tune_rank_check").pop();
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const ret = JSON.parse(fs.readFileSync("grader-returns/tune-rank.json", "utf8"));
console.log("lines", L.length, "| unparsable lines", JSON.stringify(bad));
console.log("last tune_rank_check: line", last[0], "| status starts accepted:", String(last[1].status).startsWith("accepted"), "| t", last[1].t,
  "| sha256 == return:", last[1].sha256 === sha("grader-returns/tune-rank.json"), "| handoff_sha256 == hand-off on disk:", last[1].handoff_sha256 === sha("train/report/answer_level/handoff/HANDOFF.json"),
  "| == the return's own handoff_sha256:", last[1].handoff_sha256 === ret.handoff_sha256, "| after the last code_freeze and tune_report:", last[0] > Math.max(...idx("code_freeze")) && last[0] > Math.max(...idx("tune_report")));
