// writes the three verifiers' structured results (workflow wf_1b8aced2-a7b) to one file, in one write; prints its sha256
const fs = require("fs"), crypto = require("crypto");
const [, , src, dst] = process.argv;
const j = JSON.parse(fs.readFileSync(src, "utf8"));
const res = typeof j.result === "string" ? JSON.parse(j.result) : j.result;
if (!res || !res.recompute || !res.rule || !res.record) { console.error("the result lacks one of the three agents"); process.exit(1); }
if (fs.existsSync(dst)) { console.error("the target exists already"); process.exit(2); }
const out = { what: "independent verification of train/heldout/item27.json before the anchor (coordinator's workflow wf_1b8aced2-a7b; three read-only agents)",
  record_sha256: "55f8062cf602aed32561fb5686ed2c6fa426663558f8d6f86f98cd5f00b2d008",
  verdicts: { recompute: res.recompute.verdict, rule: res.rule.verdict, record: res.record.verdict },
  blind_result_sha256: "5414b7a56979ab56cd504e11a5af01aca262ade28b176a1362d62f5b1118a173",
  agents: res };
const text = JSON.stringify(out, null, 1) + "\n";
fs.writeFileSync(dst, text);
const back = fs.readFileSync(dst);
console.log("written", dst.split("/").slice(-2).join("/"), back.length, "bytes | sha256", crypto.createHash("sha256").update(back).digest("hex"), "| verdicts", JSON.stringify(out.verdicts),
  "| checks", res.recompute.checks.length, res.rule.checks.length, res.record.checks.length, "| failed checks", [res.recompute, res.rule, res.record].map((a) => a.checks.filter((c) => c.result !== "pass").length).join(","));
