const fs = require("fs"), crypto = require("crypto"), path = require("path");
const dir = process.argv[2]; const out = { what: "ruling 113: the coordinator's byte comparison of four re-run parts with the real parts (ruling 68's rule for E1: losses, both score tables gunzipped, counts.json)", compared: [] };
for (const k of ["control", "s1", "s2", "s3"]) { const j = JSON.parse(fs.readFileSync(path.join(dir, "sleep-compare-" + k + ".json"), "utf8")); const r = j.result;
  out.compared.push({ label: j.label, all_equal: j.ALL_EQUAL, pool: r["pool.tsv.gz"], unrestricted: r["unrestricted.tsv.gz"], counts: r["counts.json"], losses: r.losses, meta: r.meta, rerun: j.rerun, real: j.real }); }
out.all_four_equal = out.compared.every((c) => c.all_equal);
console.log(JSON.stringify(out, null, 1));
