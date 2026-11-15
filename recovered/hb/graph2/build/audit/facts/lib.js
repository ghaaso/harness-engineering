// Independent audit helpers. Written from scratch for the audit; does NOT import or copy the extractor.
"use strict";
const fs = require("fs"), path = require("path");

function loadFacts(dir) {
  const rd = (f) => fs.readFileSync(path.join(dir, f), "utf8").split("\n").filter(Boolean).map(JSON.parse);
  const nodes = rd("nodes.jsonl"), edges = rd("edges.jsonl");
  const N = new Map(nodes.map((n) => [n.id, n]));
  return { nodes, edges, N };
}

function mkRepo(root) {
  const cache = new Map();
  const text = (p) => {
    if (!p) return null;
    if (cache.has(p)) return cache.get(p);
    let t = null;
    try { t = fs.readFileSync(path.join(root, p), "utf8"); } catch (e) {}
    cache.set(p, t);
    return t;
  };
  const lines = (p) => { const t = text(p); return t == null ? null : t.split("\n"); };
  const exists = (p) => { try { return fs.statSync(path.join(root, p)).isFile(); } catch (e) { return false; } };
  const window = (p, l, a = 0, b = 2) => { const L = lines(p); if (!L || !l) return ""; return L.slice(Math.max(0, l - 1 - a), l + b).join("\n"); };
  const all = [];
  const walk = (d, r) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (["node_modules", ".git"].includes(e.name)) continue; const rp = r ? r + "/" + e.name : e.name; if (e.isDirectory()) walk(path.join(d, e.name), rp); else all.push(rp); } };
  walk(root, "");
  all.sort();
  return { root, text, lines, exists, window, files: all };
}

// ---------- Python module resolution ----------
function pyModPath(repo, mod) {
  // backend is the import root
  const base = "backend/" + mod.replace(/\./g, "/");
  if (repo.exists(base + ".py")) return base + ".py";
  if (repo.exists(base + "/__init__.py")) return base + "/__init__.py";
  return null;
}
function pyRel(file, dots, mod) {
  let d = path.posix.dirname(file);
  for (let i = 1; i < dots; i++) d = path.posix.dirname(d);
  const rel = d.replace(/^backend\/?/, "").replace(/\//g, ".");
  return [rel, mod].filter(Boolean).join(".");
}
// name -> {mod, orig} for a python file
function pyImports(repo, file) {
  const t = repo.text(file) || "";
  const m = new Map();
  const flat = t.replace(/\(\s*([^)]*?)\s*\)/gs, (s, inner) => (/^[\w\s,]*$/.test(inner) ? inner.replace(/\s+/g, " ") : s));
  for (const x of flat.matchAll(/^[ \t]*from\s+(\.*)([\w.]*)\s+import\s+([^\n#]+)/gm)) {
    const mod = x[1] ? pyRel(file, x[1].length, x[2]) : x[2];
    for (const part of x[3].split(",")) {
      const p = part.trim().replace(/[()]/g, "");
      if (!p) continue;
      const mm = p.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
      if (!mm) continue;
      m.set(mm[2] || mm[1], { mod, orig: mm[1] });
    }
  }
  for (const x of t.matchAll(/^[ \t]*import\s+([\w.]+)(?:\s+as\s+(\w+))?/gm)) m.set(x[2] || x[1].split(".")[0], { mod: x[2] ? x[1] : x[1].split(".")[0], orig: null, whole: x[1] });
  return m;
}
// resolve a local name in a python file to candidate {path, name} (follows one re-export level)
function pyResolveName(repo, file, name, depth = 0) {
  const t = repo.text(file) || "";
  const defRx = new RegExp("^(?:async\\s+)?(?:def|class)\\s+" + name + "\\b|^" + name + "\\s*(?::[^=]*)?=", "m");
  if (defRx.test(t)) return [{ path: file, name }];
  const imp = pyImports(repo, file).get(name);
  if (!imp) return [];
  if (imp.orig == null) { const p = pyModPath(repo, imp.whole || imp.mod); return p ? [{ path: p, name: null, module: true }] : []; }
  const asMod = pyModPath(repo, imp.mod + "." + imp.orig);
  if (asMod) return [{ path: asMod, name: null, module: true }];
  const p = pyModPath(repo, imp.mod);
  if (!p) return [];
  if (depth < 3) { const r = pyResolveName(repo, p, imp.orig, depth + 1); if (r.length) return r; }
  return [{ path: p, name: imp.orig }];
}

// ---------- TS/JS module resolution ----------
const ALIAS = [["@app/", "src/app/"], ["@ops/", "src/ops/"], ["@shared/", "src/shared/"], ["@features/", "src/features/"], ["@/", "technician-app/src/"]];
const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
function tsResolveSpec(repo, file, spec) {
  let base = null;
  if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
  else for (const [a, b] of ALIAS) if (spec.startsWith(a)) { base = b + spec.slice(a.length); break; }
  if (!base) return null;
  for (const e of EXTS) if (repo.exists(base + e)) return base + e;
  return null;
}
function tsImports(repo, file) {
  const t = repo.text(file) || "";
  const m = new Map();
  for (const x of t.matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g)) {
    const spec = x[3], what = x[2];
    if (/^import/.test(what)) continue;
    const res = tsResolveSpec(repo, file, spec);
    const def = what.match(/^([A-Za-z_$][\w$]*)\s*(,|$)/);
    if (def) m.set(def[1], { spec, path: res, orig: "default" });
    const ns = what.match(/\*\s+as\s+([\w$]+)/);
    if (ns) m.set(ns[1], { spec, path: res, orig: "*" });
    const br = what.match(/\{([\s\S]*?)\}/);
    if (br) for (const part of br[1].split(",")) {
      const p = part.trim().replace(/^type\s+/, "");
      if (!p) continue;
      const mm = p.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
      if (mm) m.set(mm[2] || mm[1], { spec, path: res, orig: mm[1] });
    }
  }
  return m;
}
// follow barrels: does `path` export `name` defined in dstPath?
function tsExportReaches(repo, p, name, dstPath, depth = 0) {
  if (!p) return false;
  if (p === dstPath) return true;
  if (depth > 4) return false;
  const t = repo.text(p) || "";
  for (const x of t.matchAll(/export\s+(?:type\s+)?\{([\s\S]*?)\}\s*from\s+["']([^"']+)["']/g)) {
    for (const part of x[1].split(",")) {
      const mm = part.trim().match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
      if (mm && (mm[2] || mm[1]) === name) { const r = tsResolveSpec(repo, p, x[2]); if (tsExportReaches(repo, r, mm[1], dstPath, depth + 1)) return true; }
    }
  }
  for (const x of t.matchAll(/export\s+\*\s+from\s+["']([^"']+)["']/g)) { const r = tsResolveSpec(repo, p, x[1]); if (tsExportReaches(repo, r, name, dstPath, depth + 1)) return true; }
  // import-then-export: import { a } from "./x"; export { a };
  const im = tsImports(repo, p).get(name);
  if (im && new RegExp("export\\s*\\{[^}]*\\b" + name + "\\b").test(t)) return tsExportReaches(repo, im.path, im.orig, dstPath, depth + 1);
  return false;
}

// ---------- my own route table (backend + ops-server) ----------
function routeTable(repo) {
  const R = [];
  const main = repo.text("backend/app/main.py") || "";
  const inc = new Map(); // local router var -> prefix
  for (const x of main.matchAll(/include_router\(\s*(\w+)(?:\.router)?\s*,\s*prefix\s*=\s*["']([^"']*)["']/g)) inc.set(x[1], x[2]);
  const imps = pyImports(repo, "backend/app/main.py");
  for (const f of repo.files.filter((f) => /^backend\/app\/.*router\.py$/.test(f))) {
    const t = repo.text(f);
    const pref = new Map();
    for (const x of t.matchAll(/^(\w+)\s*=\s*APIRouter\(/gm)) { const rest = t.slice(x.index, x.index + 400); const end = rest.search(/\)\s*\n(?!\s)/); const body = end > 0 ? rest.slice(0, end) : rest; const p = body.match(/prefix\s*=\s*["']([^"']*)["']/); pref.set(x[1], p ? p[1] : ""); }
    // the outer prefix for each router var in this file, via main.py imports
    const outer = (v) => { for (const [loc, pr] of inc) { const im = imps.get(loc); if (im && pyModPath(repo, im.mod) === f && (im.orig === v || (v === "router" && im.orig === "router"))) return pr; } return null; };
    for (const x of t.matchAll(/^@(\w+)\.(get|post|put|patch|delete)\(\s*["']([^"']*)["']/gm)) {
      const op = outer(x[1]);
      if (op == null || !pref.has(x[1])) continue;
      R.push({ server: "backend", method: x[2].toUpperCase(), path: op + pref.get(x[1]) + x[3], file: f, line: t.slice(0, x.index).split("\n").length });
    }
  }
  const ops = repo.text("ops-server.mjs") || "";
  ops.split("\n").forEach((ln, i) => { for (const x of ln.matchAll(/pathname\s*===\s*["'](\/api\/[^"']+)["']([^\n]*)/g)) { const mm = x[2].match(/method\s*===\s*["'](\w+)["']/); R.push({ server: "ops", method: mm ? mm[1] : "GET", path: x[1], file: "ops-server.mjs", line: i + 1 }); } });
  for (const r of R) r.rx = new RegExp("^" + r.path.replace(/\{[^}]+\}/g, "\u0000").replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\u0000/g, "[^/]+") + "/?$");
  return R;
}

// seeded shuffle (mulberry32)
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function sample(arr, n, seed) { const r = rng(seed); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }

module.exports = { loadFacts, mkRepo, pyModPath, pyImports, pyResolveName, tsResolveSpec, tsImports, tsExportReaches, routeTable, sample };
