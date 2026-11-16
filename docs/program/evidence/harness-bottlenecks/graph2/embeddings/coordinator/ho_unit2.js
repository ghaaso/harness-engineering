// the suspended unit (seed 3) against its sibling seeds on the same checkpoint: loss curves and agreement of the score orders. No truth, no metric.
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const C = process.argv[2], base = "train/heldout/parts/E1/c04";
const meta = {}, pool = {};
for (const s of ["s1", "s2", "s3"]) {
  const d = path.join(base, s, C);
  meta[s] = JSON.parse(fs.readFileSync(path.join(d, "meta.json"), "utf8"));
  const rows = zlib.gunzipSync(fs.readFileSync(path.join(d, "pool.tsv.gz"))).toString("utf8").split("\n").filter(Boolean).slice(1).map((l) => l.split("\t"));
  pool[s] = new Map(rows.map((r) => [r[0] + "|" + r[1], Number(r[2])]));
  const L = meta[s].losses;
  console.log(s, "| epochs", meta[s].epochs, "| wall_s", meta[s].wall_s.toFixed(1), "| losses n", L.length, "first", L[0].toFixed(4), "min", Math.min(...L).toFixed(4), "last", L[L.length - 1].toFixed(4), "| largest rise between epochs", Math.max(...L.slice(1).map((x, i) => x - L[i])).toFixed(4), "at epoch", 1 + L.slice(1).map((x, i) => x - L[i]).indexOf(Math.max(...L.slice(1).map((x, i) => x - L[i]))) + 1, "| pool score rows", pool[s].size, "| all finite", [...pool[s].values()].every(Number.isFinite), "| peak_rss_mb", meta[s].peak_rss_mb.toFixed(0), "| cuda reserved", meta[s].peak_cuda_reserved_mb);
}
const L1 = meta.s1.losses, L2 = meta.s2.losses, L3 = meta.s3.losses;
const dev = (A, B) => Math.max(...A.map((x, i) => Math.abs(x - B[i])).slice(5));
console.log("largest loss gap after epoch 5: s1-s2", dev(L1, L2).toFixed(4), "| s1-s3", dev(L1, L3).toFixed(4), "| s2-s3", dev(L2, L3).toFixed(4));
console.log("loss every 10th epoch  s1:", L1.filter((_, i) => i % 10 === 9).map((x) => x.toFixed(3)).join(" "), "| s2:", L2.filter((_, i) => i % 10 === 9).map((x) => x.toFixed(3)).join(" "), "| s3:", L3.filter((_, i) => i % 10 === 9).map((x) => x.toFixed(3)).join(" "));
const spearman = (A, B) => { const keys = [...A.keys()].filter((k) => B.has(k)); const rk = (M) => { const s = keys.map((k) => [M.get(k), k]).sort((a, b) => a[0] - b[0]); const r = new Map(); s.forEach(([, k], i) => r.set(k, i)); return r; };
  const ra = rk(A), rb = rk(B), n = keys.length; let d2 = 0; for (const k of keys) d2 += (ra.get(k) - rb.get(k)) ** 2; return [n, 1 - 6 * d2 / (n * (n * n - 1))]; };
for (const [a, b] of [["s1", "s2"], ["s1", "s3"], ["s2", "s3"]]) { const [n, r] = spearman(pool[a], pool[b]); console.log("rank agreement of pool scores " + a + "-" + b + ": n " + n + " Spearman " + r.toFixed(4)); }
// the same agreement on five other checkpoints, as a yardstick
const others = fs.readdirSync(path.join(base, "s1")).filter((c) => c !== C).slice(0, 60).filter((_, i) => i % 12 === 0);
for (const c of others) { const P = {}; for (const s of ["s1", "s2", "s3"]) { const rows = zlib.gunzipSync(fs.readFileSync(path.join(base, s, c, "pool.tsv.gz"))).toString("utf8").split("\n").filter(Boolean).slice(1).map((l) => l.split("\t")); P[s] = new Map(rows.map((r) => [r[0] + "|" + r[1], Number(r[2])])); }
  console.log("  yardstick " + c.slice(0, 12) + ": s1-s2 " + spearman(P.s1, P.s2)[1].toFixed(4) + " s1-s3 " + spearman(P.s1, P.s3)[1].toFixed(4) + " s2-s3 " + spearman(P.s2, P.s3)[1].toFixed(4) + " (n " + spearman(P.s1, P.s2)[0] + ")"); }
