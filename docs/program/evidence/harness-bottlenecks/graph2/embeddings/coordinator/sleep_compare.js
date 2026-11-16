// Coordinator's comparison for ruling 113 (ruling 68's rule for E1): the loss list, both score tables (gunzipped) and
// counts.json of a re-run part against the part of the real run, byte for byte.
// usage: node sleep_compare.js <label> <re-run part folder> <real part folder>
const fs = require("fs"), path = require("path"), zlib = require("zlib"), crypto = require("crypto");
const [, , label, A, B] = process.argv;
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const gz = (d, f) => zlib.gunzipSync(fs.readFileSync(path.join(d, f)));
const canon = (o) => JSON.stringify(o, Object.keys(o).sort ? undefined : undefined);
const sortKeys = (o) => Array.isArray(o) ? o.map(sortKeys) : o && typeof o === "object" ? Object.keys(o).sort().reduce((a, k) => { a[k] = sortKeys(o[k]); return a; }, {}) : o;
const out = { label, rerun: A, real: B, files_rerun: fs.readdirSync(A).sort(), files_real: fs.readdirSync(B).sort() };
const res = {};
for (const t of ["pool.tsv.gz", "unrestricted.tsv.gz"]) {
  const a = gz(A, t), b = gz(B, t);
  res[t] = { equal: a.equals(b), bytes: [a.length, b.length], rows: [a.toString("utf8").split("\n").filter(Boolean).length - 1, b.toString("utf8").split("\n").filter(Boolean).length - 1], sha256: [sha(a).slice(0, 16), sha(b).slice(0, 16)] };
  if (!res[t].equal) { const la = a.toString("utf8").split("\n"), lb = b.toString("utf8").split("\n"); let diff = 0, first = null, maxd = 0; for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) { diff++; if (first === null) first = i; const x = Number((la[i] || "").split("\t")[2]), y = Number((lb[i] || "").split("\t")[2]); if (Number.isFinite(x) && Number.isFinite(y)) maxd = Math.max(maxd, Math.abs(x - y)); } res[t].lines_different = diff; res[t].first_different_line = first; res[t].largest_score_difference = maxd; }
}
const ca = JSON.parse(fs.readFileSync(path.join(A, "counts.json"), "utf8")), cb = JSON.parse(fs.readFileSync(path.join(B, "counts.json"), "utf8"));
res["counts.json"] = { equal: JSON.stringify(sortKeys(ca)) === JSON.stringify(sortKeys(cb)), raw_bytes_equal: fs.readFileSync(path.join(A, "counts.json")).equals(fs.readFileSync(path.join(B, "counts.json"))) };
const ma = JSON.parse(fs.readFileSync(path.join(A, "meta.json"), "utf8")), mb = JSON.parse(fs.readFileSync(path.join(B, "meta.json"), "utf8"));
const la = ma.losses || [], lb = mb.losses || [];
let firstLoss = null, maxLoss = 0; for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) { if (firstLoss === null) firstLoss = i + 1; maxLoss = Math.max(maxLoss, Math.abs((la[i] || 0) - (lb[i] || 0))); }
res.losses = { equal: la.length === lb.length && firstLoss === null, n: [la.length, lb.length], first_different_epoch: firstLoss, largest_difference: maxLoss, sha256: [sha(Buffer.from(JSON.stringify(la))).slice(0, 16), sha(Buffer.from(JSON.stringify(lb))).slice(0, 16)] };
res.meta = { arm: [ma.arm, mb.arm], config_id: [ma.config_id, mb.config_id], seed: [ma.seed, mb.seed], checkpoint: [String(ma.checkpoint).slice(0, 12), String(mb.checkpoint).slice(0, 12)], epochs: [ma.epochs, mb.epochs], cfg_equal: JSON.stringify(sortKeys(ma.cfg)) === JSON.stringify(sortKeys(mb.cfg)), tasks: [JSON.stringify(ma.tasks).slice(0, 60), JSON.stringify(mb.tasks).slice(0, 60)], runner: [ma.runner, mb.runner], split: [ma.split, mb.split] };
out.result = res;
out.ALL_EQUAL = res["pool.tsv.gz"].equal && res["unrestricted.tsv.gz"].equal && res["counts.json"].equal && res.losses.equal;
console.log(JSON.stringify(out, null, 1));
process.exit(out.ALL_EQUAL ? 0 : 1);
