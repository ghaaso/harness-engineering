#!/usr/bin/env node
// Check 4: the padding tail is one shared function of (task, pad), identical across arms.
// For 10 TUNE T1 tasks (seeded) and pad DIR and CO, at file granularity, signature form:
//  (a) the DIR and CO orders are recomputed here from the protocol text and the facts files
//      (nodes.jsonl, commits.jsonl), without arms/common/padding.js;
//  (b) the floor answers (floor-dir, floor-co) must be exactly that order (no head, every item pad=1);
//  (c) every arm's pad=DIR / pad=CO answer: its tail must be exactly that order minus the arm's own head
//      files and the seed file, and each tail item must be rendered byte-identically to the floor's item
//      for the same file (tokens and shown lines);
//  (d) per budget, tail tokens recompute from the items, and two arms whose heads are the same set
//      have identical tails.
//   node c4_padding.js
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const BUILD = path.resolve(__dirname, "..", "..");
const R = path.join(BUILD, "results");
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString().split("\n").filter(Boolean).map((l) => JSON.parse(l));
function findFile(dir, pred) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".T1.jsonl.gz"))) { const a = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString().split("\n", 1)[0]); if (pred(a)) return path.join(dir, f); }
  return null;
}
const ARMDIR = { relational: "relational/tune", reference: "reference/tune", search: "search/tune", ladybug: "ladybug/stage1/ladybug/tune", duckpgq: "duckpgq/tune" };
const sig = (a, pad) => a.granularity === "file" && a.form === "signature" && a.pad === pad;
const files = {};
for (const pad of ["DIR", "CO"]) {
  files[pad] = { floor: findFile(path.join(R, pad === "DIR" ? "floor-dir/tune" : "floor-co/tune"), (a) => sig(a, pad)) };
  for (const [arm, d] of Object.entries(ARMDIR)) files[pad][arm] = findFile(path.join(R, d), (a) => sig(a, pad));
}
const load = {}; for (const pad in files) { load[pad] = {}; for (const k in files[pad]) load[pad][k] = files[pad][k] ? new Map(rd(files[pad][k]).map((a) => [a.id, a])) : null; }

// ---- independent orders (protocol addendum 2 B.7 and the floor definitions)
const CODE = [".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
const ext = (p) => { const b = p.split("/").pop(); const i = b.lastIndexOf("."); return i > 0 ? b.slice(i).toLowerCase() : ""; };
const isTest = (p) => { const l = p.toLowerCase(), n = l.split("/").pop(); return l.includes("/tests/") || l.startsWith("tests/") || l.includes("/__tests__/") || n.startsWith("test_") || n.endsWith("_test.py") || n.includes(".test.") || n.includes(".spec.") || n === "conftest.py" || n.startsWith("vitest.setup") || n.startsWith("jest.setup"); };
const rt = (p) => (p.startsWith("backend/") ? "b" : p.startsWith("technician-app/") ? "m" : p.startsWith("src/") || p === "ops-server.mjs" ? "w" : null);
const ctm = (p) => CODE.includes(ext(p)) && !p.toLowerCase().endsWith(".md") && (p.includes("/alembic/versions/") || isTest(p) || rt(p));
const cap = (p) => { const m = /^(?:backend\/app|technician-app\/src|src)\/features\/([^/]+)\//.exec(p); return m ? m[1] : null; };
const dirn = (p) => { const i = p.lastIndexOf("/"); return i < 0 ? "" : p.slice(0, i); };
const byDepth = (a, b) => a.split("/").length - b.split("/").length || (a < b ? -1 : a > b ? 1 : 0);
function myDir(uni, seed) {
  const out = [], seen = new Set([seed]); const add = (xs) => { for (const x of xs) if (!seen.has(x)) { seen.add(x); out.push(x); } };
  add(uni.filter((f) => dirn(f) === dirn(seed)));
  const c = cap(seed); if (c) add(uni.filter((f) => cap(f) === c).sort(byDepth));
  const parts = seed.split("/");
  for (let d = parts.length - 1; d >= 0; d--) { const pre = d ? parts.slice(0, d).join("/") + "/" : ""; add(uni.filter((f) => f.startsWith(pre)).sort(byDepth)); }
  return out;
}
function myCo(uni, commits, seed) {
  const U = new Set(uni); const tP = Math.max(...commits.map((c) => c.time));
  const n = new Map(), w = new Map();
  for (const c of commits) {
    if (!c.used || !c.files.includes(seed)) continue;
    const wt = Math.pow(0.5, (tP - c.time) / 86400 / 30);
    for (const f of c.files) if (f !== seed && U.has(f)) { n.set(f, (n.get(f) || 0) + 1); w.set(f, (w.get(f) || 0) + wt); }
  }
  const r = [...n.keys()].sort((a, b) => n.get(b) - n.get(a) || w.get(b) - w.get(a) || (a < b ? -1 : 1));
  const s = new Set(r); for (const x of myDir(uni, seed)) if (!s.has(x)) r.push(x);
  return r;
}
// ---- tasks
const tasks = fs.readFileSync(path.join(BUILD, "tasks/tasks.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((t) => t.set === "T1" && t.split === "tune");
let s = 7; const pick = [];
while (pick.length < 10) { s = (s * 1103515245 + 12345) % 2147483648; const t = tasks[s % tasks.length]; if (!pick.includes(t)) pick.push(t); }
const out = { files: Object.fromEntries(Object.entries(files).map(([p, v]) => [p, Object.fromEntries(Object.entries(v).map(([k, f]) => [k, f ? path.relative(BUILD, f) : null]))])), tasks: pick.map((t) => t.id), checks: { floor_order_ok: 0, floor_order_bad: [], tail_ok: 0, tail_bad: [], render_mismatch: 0, budget_tail_tok_bad: 0, same_head_pairs: 0, same_head_tail_differs: 0, arms_compared: 0, tail_items_compared: 0, uncheckable_beyond_floor: 0 } };
const C = out.checks;
for (const t of pick) {
  const F = path.join(BUILD, "facts/cache", t.parent);
  const uni = [...new Set(fs.readFileSync(path.join(F, "nodes.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((n) => n.kind === "file" && n.path && ctm(n.path)).map((n) => n.path))].sort();
  const commits = fs.readFileSync(path.join(F, "commits.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const pad of ["DIR", "CO"]) {
    const order = pad === "DIR" ? myDir(uni, t.seed.path) : myCo(uni, commits, t.seed.path);
    const fl = load[pad].floor.get(t.id);
    const flPaths = fl.items.map((i) => i.path);
    const okFloor = fl.n_head === 0 && fl.items.every((i) => i.pad === 1) && JSON.stringify(flPaths) === JSON.stringify(order.slice(0, flPaths.length));
    if (okFloor) C.floor_order_ok++; else C.floor_order_bad.push(t.id + " " + pad + " first diff at " + flPaths.findIndex((p, i) => p !== order[i]));
    const flItem = new Map(fl.items.map((i) => [i.path, i]));
    const tails = {};
    for (const arm of Object.keys(ARMDIR)) {
      const m = load[pad][arm]; if (!m) continue; const a = m.get(t.id); if (!a) continue;
      C.arms_compared++;
      const head = a.items.filter((i) => i.pad === 0).map((i) => i.path);
      const tail = a.items.filter((i) => i.pad === 1);
      const hs = new Set(head);
      const exp = order.filter((p) => !hs.has(p) && p !== t.seed.path);
      const got = tail.map((i) => i.path);
      const ok = JSON.stringify(got) === JSON.stringify(exp.slice(0, got.length)) && a.items.findIndex((i) => i.pad === 1) >= head.length;
      if (ok) C.tail_ok++; else C.tail_bad.push(`${t.id} ${pad} ${arm} first diff at ${got.findIndex((p, i) => p !== exp[i])}`);
      for (const it of tail) { const f = flItem.get(it.path); if (!f) { C.uncheckable_beyond_floor++; continue; } C.tail_items_compared++; if (f.tok !== it.tok || JSON.stringify(f.shown) !== JSON.stringify(it.shown)) C.render_mismatch++; }
      for (const [b, bb] of Object.entries(a.budgets)) {
        let tt = 0; for (let i = 0; i < bb.n_full; i++) if (a.items[i].pad) tt += a.items[i].tok;
        if (bb.cut && bb.cut.pad) tt += bb.cut.tok;
        if (tt !== bb.tail_tok) C.budget_tail_tok_bad++;
      }
      tails[arm] = { headKey: [...hs].sort().join("|"), tail: JSON.stringify(Object.fromEntries(Object.entries(a.budgets).map(([b, bb]) => [b, { items: a.items.slice(0, bb.n_full).filter((i) => i.pad).map((i) => [i.path, i.tok]), cut: bb.cut && bb.cut.pad ? bb.cut : null }]))) };
    }
    const names = Object.keys(tails);
    for (let x = 0; x < names.length; x++) for (let y = x + 1; y < names.length; y++) if (tails[names[x]].headKey === tails[names[y]].headKey) { C.same_head_pairs++; if (tails[names[x]].tail !== tails[names[y]].tail) C.same_head_tail_differs++; }
  }
}
fs.writeFileSync(path.join(__dirname, "c4_padding.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
