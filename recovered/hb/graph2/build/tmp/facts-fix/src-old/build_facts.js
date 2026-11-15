#!/usr/bin/env node
// Shared FACTS extractor (protocol section 3). One command:
//   node build_facts.js <commit-sha> <outdir> [--task <sha>[,<sha>]] [--skip k1,k2] [--only k1,k2] [--keep-export]
// Exports <commit-sha> from the read-only repo with `git archive`, runs every stage on the clean
// export, and writes <outdir>/nodes.jsonl, edges.jsonl, commits.jsonl, meta.json and
// experimental/response_fields.{nodes,edges}.jsonl. A stage that fails degrades to empty and is
// recorded in meta.json; the build itself never fails because of a stage.
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const crypto = require("crypto");
const { runDocs } = require("./docs_extract.js");
const { cochange } = require("./git_extract.js");

const REPO = process.env.FACTS_REPO || "C:/Users/User/Documents/projects/EMS_workshop1";
const FROZEN = process.env.FACTS_FROZEN || "a31924a3818f4ac94b695906d107c72c912792b2";
const PY = process.env.FACTS_PY || "C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const HERE = __dirname;
const TMP = process.env.FACTS_TMP || path.join(HERE, "..", "tmp");
const SOURCES = ["build_facts.js", "py_extract.py", "ts_extract.js", "docs_extract.js", "git_extract.js"];

// ---------- path classification (the single source of truth for runtime / slice / is_test) ----------
function isTestPath(p) {
  if (!p) return false;
  return /(^|\/)(tests|__tests__)\//.test(p) || /(^|\/)test_[^/]*\.py$/.test(p) || /(^|\/)conftest\.py$/.test(p) || /\.(test|spec)\.[^/]+$/.test(p);
}
function runtimeOf(p) {
  if (!p) return null;
  if (p.startsWith("backend/")) return "backend";
  if (p.startsWith("technician-app/")) return "mobile";
  if (/^(ops-server\.mjs|ops\.html|vite\.ops\.config\.js|Dockerfile\.ops)$/.test(p) || p.startsWith("src/ops/") || p.startsWith("src/features/ops/") || /^tests\/ops-server/.test(p)) return "ops";
  if (p.startsWith("src/") || p.startsWith("public/") || p.startsWith("tests/") || /^(index\.html|vite\.config\.js|vitest\.config\.js|vitest\.setup\.js|eslint\.config\.js|jsconfig\.json|package\.json|package-lock\.json|Dockerfile\.web)$/.test(p)) return "web";
  if (p.startsWith("docs/") || (!p.includes("/") && p.endsWith(".md"))) return "docs";
  return "repo";
}
function sliceOf(p) {
  const rt = runtimeOf(p);
  if (!rt) return null;
  let m;
  if (rt === "backend") {
    if ((m = p.match(/^backend\/app\/features\/([^/]+)\//))) return m[1];
    if ((m = p.match(/^backend\/app\/([^/]+)\//))) return m[1];
    if (/^backend\/app\/[^/]+$/.test(p)) return "app";
    if ((m = p.match(/^backend\/([^/]+)\//))) return m[1];
    return "root";
  }
  if (rt === "mobile") {
    if ((m = p.match(/^technician-app\/src\/features\/([^/]+)\//))) return m[1];
    if ((m = p.match(/^technician-app\/src\/([^/]+)\//))) return m[1];
    if (/^technician-app\/src\/[^/]+$/.test(p)) return "src";
    return "root";
  }
  if (rt === "web" || rt === "ops") {
    if ((m = p.match(/^src\/features\/([^/]+)\//))) return m[1];
    if ((m = p.match(/^src\/([^/]+)\//))) return m[1];
    if (p === "ops-server.mjs") return "server";
    if (p.startsWith("tests/")) return "tests";
    return "root";
  }
  if (rt === "docs") { if ((m = p.match(/^docs\/([^/]+)\//))) return m[1]; return "docs"; }
  if ((m = p.match(/^([^/]+)\//))) return m[1];
  return "root";
}
const sliceDir = (p) => {
  const rt = runtimeOf(p), s = sliceOf(p);
  const tries = { backend: ["backend/app/features/" + s, "backend/app/" + s, "backend/" + s], mobile: ["technician-app/src/features/" + s, "technician-app/src/" + s], web: ["src/features/" + s, "src/" + s], ops: ["src/features/" + s, "src/" + s], docs: ["docs/" + s] };
  for (const t of tries[rt] || [s]) if (p.startsWith(t + "/")) return t;
  return null;
};

// ---------- helpers ----------
const now = () => Number(process.hrtime.bigint() / 1000000n);
function stable(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  return "{" + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
}
const NODE_KEYS = ["id", "kind", "path", "name", "line_start", "line_end", "signature", "runtime", "slice", "is_test", "tokens"];
const EDGE_KEYS = ["src", "dst", "kind", "evidence_path", "evidence_line", "confidence", "attrs"];
const nodeLine = (n) => "{" + NODE_KEYS.map((k) => JSON.stringify(k) + ":" + stable(n[k] === undefined ? null : n[k])).join(",") + "}";
const edgeLine = (e) => "{" + EDGE_KEYS.map((k) => JSON.stringify(k) + ":" + stable(e[k] === undefined ? null : e[k])).join(",") + "}";
function listExport(root) {
  const res = [];
  const SKIP = new Set(["node_modules", ".git", "venv", ".venv", "__pycache__"]);
  const walk = (d, r) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const rp = r ? r + "/" + e.name : e.name;
      if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(d, e.name), rp); }
      else res.push(rp);
    }
  };
  walk(root, "");
  return res;
}
const BINARY = /\.(png|jpe?g|gif|webp|ico|bmp|svg|ttf|otf|woff2?|eot|mp3|mp4|m4a|wav|ogg|pdf|zip|gz|jar|keystore|jks|apk|aab|db|sqlite)$/i;
function runAsync(cmd, args, env) {
  return new Promise((resolve) => {
    const t = now();
    const ch = cp.spawn(cmd, args, { env: Object.assign({}, process.env, env || {}), windowsHide: true });
    let out = "", err = "";
    ch.stdout.on("data", (d) => (out += d));
    ch.stderr.on("data", (d) => (err += d));
    ch.on("close", (code) => resolve({ code, out, err, ms: now() - t }));
    ch.on("error", (e) => resolve({ code: -1, out, err: String(e), ms: now() - t }));
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const pos = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["--keep-export"].includes(argv[i - 1])));
  const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  if (pos.length < 2) { console.error("usage: node build_facts.js <commit-sha> <outdir> [--task sha,..] [--skip kinds] [--only kinds] [--keep-export]"); process.exit(2); }
  const [shaArg, outdir] = pos;
  const skip = new Set((opt("--skip") || "").split(",").filter(Boolean));
  const only = opt("--only") ? new Set(opt("--only").split(",").filter(Boolean)) : null;
  const taskShas = opt("--task") ? opt("--task").split(",").filter(Boolean) : null;
  const T = {}, ST = {};
  const t0 = now();
  const sha = cp.execFileSync("git", ["-C", REPO, "rev-parse", "--verify", shaArg + "^{commit}"], { encoding: "utf8" }).trim();
  fs.mkdirSync(outdir, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });
  // ---- export ----
  let t = now();
  const exp = path.join(TMP, "export-" + sha.slice(0, 12) + "-" + process.pid);
  fs.rmSync(exp, { recursive: true, force: true });
  fs.mkdirSync(exp, { recursive: true });
  const tar = cp.execFileSync("git", ["-C", REPO, "archive", "--format=tar", sha], { maxBuffer: 1 << 30 });
  const tx = cp.spawnSync("tar", ["-x", "-C", exp.split(path.sep).join("/")], { input: tar, maxBuffer: 1 << 30 });
  if (tx.status !== 0) throw new Error("tar failed: " + String(tx.stderr).slice(0, 300));
  const files = listExport(exp);
  T.export = now() - t; ST.export = { status: "ok", files: files.length, tar_bytes: tar.length };
  // ---- py + ts stages in parallel (two processes) ----
  t = now();
  const pyOut = path.join(TMP, "py-" + sha.slice(0, 12) + "-" + process.pid + ".json");
  const tsOut = path.join(TMP, "ts-" + sha.slice(0, 12) + "-" + process.pid + ".json");
  const [pr, tr] = await Promise.all([
    runAsync(PY, ["-I", path.join(HERE, "py_extract.py"), exp, pyOut], { PYTHONHASHSEED: "0" }),
    runAsync(process.execPath, [path.join(HERE, "ts_extract.js"), exp, tsOut]),
  ]);
  T.py = pr.ms; T.ts = tr.ms;
  let py = { nodes: [], edges: [], http_calls: [], routes: [], schema_models: {}, stats: {} };
  let tsg = { nodes: [], edges: [], urls: [], kinds: [], sendKinds: [], navigate: [], screens: [], propReads: [], envReads: [], stats: {} };
  if (pr.code === 0 && fs.existsSync(pyOut)) { py = JSON.parse(fs.readFileSync(pyOut, "utf8")); ST.py = { status: py.nodes.length ? "ok" : "empty", stats: py.stats }; }
  else ST.py = { status: "failed_degraded_to_empty", code: pr.code, error: pr.err.slice(-600) };
  if (tr.code === 0 && fs.existsSync(tsOut)) {
    tsg = JSON.parse(fs.readFileSync(tsOut, "utf8"));
    const errs = Object.keys(tsg.stats).filter((k) => /\.error$/.test(k));
    const progs = {};
    for (const p of ["mobile", "web"]) progs[p] = tsg.stats[p + ".error"] ? "failed_degraded_to_empty" : tsg.stats[p + ".skipped"] ? "absent_at_commit_empty" : (tsg.stats[p + ".files"] ? "ok" : "empty");
    ST.ts = { status: errs.length ? "partial" : (tsg.nodes.length ? "ok" : "empty"), programs: progs, typescript: tsg.tsVersion, stats: tsg.stats };
  } else ST.ts = { status: "failed_degraded_to_empty", code: tr.code, error: tr.err.slice(-600) };
  for (const f of [pyOut, tsOut]) fs.rmSync(f, { force: true });

  // ---- join ----
  t = now();
  const N = new Map();
  const E = [];
  const addNode = (n) => { if (!N.has(n.id)) N.set(n.id, n); return n.id; };
  for (const n of py.nodes) addNode(n.kind === "nested" ? Object.assign({}, n, { kind: "function" }) : n);
  for (const n of tsg.nodes) addNode(n);
  for (const e of py.edges) E.push(e);
  for (const e of tsg.edges) E.push(e);
  // test functions in Python -> kind test
  for (const n of N.values()) if (n.id.startsWith("sym:backend/") && (n.kind === "function" || n.kind === "method") && isTestPath(n.path) && /^test_/.test(n.name)) n.kind = "test";
  // every other exported text file is a file node (configs, docs are added by the docs stage)
  const fileSet = new Set(files);
  const tok = (s) => Math.ceil(s.length / 4);
  for (const f of files) {
    if (N.has("file:" + f) || BINARY.test(f) || f.endsWith(".md")) continue;
    let txt = "";
    try { const b = fs.readFileSync(path.join(exp, f)); if (b.includes(0)) continue; txt = b.toString("utf8"); } catch (e) { continue; }
    addNode({ id: "file:" + f, kind: "file", path: f, name: path.posix.basename(f), line_start: 1, line_end: txt.split("\n").length, signature: null, tokens: tok(txt) });
  }
  // ops-server routes (regex over the BFF's dispatch chain)
  const routes = (py.routes || []).map((r) => ({ id: r.id, method: r.method, path: r.path, server: "backend", handler: r.handler, response_models: r.response_models || [] }));
  const opsSrc = fileSet.has("ops-server.mjs") ? fs.readFileSync(path.join(exp, "ops-server.mjs"), "utf8") : "";
  if (opsSrc) {
    const lines = opsSrc.split("\n");
    const defsIn = [...N.values()].filter((n) => n.path === "ops-server.mjs" && n.id.startsWith("sym:"));
    lines.forEach((ln, i) => {
      for (const m of ln.matchAll(/pathname === "(\/api\/[^"]+)"(?:\s*&&\s*req\.method === "(\w+)")?/g)) {
        const method = m[2] || "GET";
        const id = "route:ops " + method + " " + m[1];
        if (N.has(id)) continue;
        addNode({ id, kind: "route", path: "ops-server.mjs", name: method + " " + m[1], line_start: i + 1, line_end: i + 1, signature: ln.trim().slice(0, 240), tokens: tok(ln) });
        const enc = defsIn.filter((d) => d.line_start <= i + 1 && d.line_end >= i + 1).sort((a, b) => (b.line_start - a.line_start) || (a.line_end - b.line_end))[0];
        if (enc) E.push({ src: id, dst: enc.id, kind: "registers_route", evidence_path: "ops-server.mjs", evidence_line: i + 1, confidence: 0.9, attrs: { inline: true } });
        routes.push({ id, method, path: m[1], server: "ops", handler: enc ? enc.id : null, response_models: [] });
      }
    });
  }
  // URL matching: server preference, then more literal segments wins; a remaining tie is a TRUE ambiguity
  const literalSegs = (p) => p.split("/").filter((s) => s && !/^\{.*\}$/.test(s)).length;
  const routeRx = routes.map((r) => ({ ...r, re: new RegExp("^" + r.path.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\\{[^}]*\\\}|\{[^}]*\}/g, "[^/]+") + "/?$") }));
  function matchUrl(method, url, prefer) {
    const u = (url.replace(/\{\}/g, "X").replace(/\/$/, "")) || "/";
    let c = routeRx.filter((r) => (method === "*" || r.method === method) && r.re.test(u));
    const n0 = c.length;
    const rules = [];
    if (c.length > 1 && prefer) { const p = c.filter((r) => r.server === prefer); if (p.length && p.length < c.length) { c = p; rules.push("server"); } }
    if (c.length > 1) { const mx = Math.max(...c.map((r) => literalSegs(r.path))); const k = c.filter((r) => literalSegs(r.path) === mx); if (k.length < c.length) { c = k; rules.push("literal_segments"); } }
    return { c, n0, rule: rules.join("+") || null, methodMiss: !n0 && routeRx.some((r) => r.re.test(u)) };
  }
  const US = { client: { sites: 0, prod_sites: 0, matched: 0, multi_candidate: 0, resolved_by_rule: {}, true_ambiguous: 0, unmatched: [] }, pytest: { calls: 0, matched: 0, multi_candidate: 0, true_ambiguous: 0, unmatched: [] } };
  for (const u of tsg.urls || []) {
    const prefer = runtimeOf(u.path) === "ops" && u.path !== "ops-server.mjs" ? "ops" : "backend";
    const m = matchUrl(u.method, u.url, prefer);
    const B = US.client;
    B.sites++; if (!isTestPath(u.path)) B.prod_sites++;
    const siteId = "urlsite:" + u.path + ":" + u.line + ":" + u.method + " " + u.url;
    addNode({ id: siteId, kind: "client_url_site", path: u.path, name: u.method + " " + u.url, line_start: u.line, line_end: u.line, signature: (u.callee + "(" + u.raw + ")").slice(0, 240), tokens: tok(u.raw) });
    E.push({ src: u.site, dst: siteId, kind: "contains", evidence_path: u.path, evidence_line: u.line, confidence: 1, attrs: null });
    if (!m.c.length) { B.unmatched.push(u.path + ":" + u.line + " " + u.method + " " + u.url + (m.methodMiss ? " (path matches, method differs)" : "")); continue; }
    B.matched++;
    if (m.n0 > 1) { B.multi_candidate++; if (m.c.length === 1) B.resolved_by_rule[m.rule] = (B.resolved_by_rule[m.rule] || 0) + 1; }
    if (m.c.length > 1) B.true_ambiguous++;
    for (const r of m.c) E.push({ src: u.site, dst: r.id, kind: isTestPath(u.path) ? "test_calls_route" : "calls_url", evidence_path: u.path, evidence_line: u.line, confidence: Math.round(1e4 / m.c.length) / 1e4, attrs: { method: u.method, url: u.url, site: siteId, candidates: m.n0, rule: m.rule, ambiguous: m.c.length > 1 } });
  }
  for (const h of py.http_calls || []) {
    const m = matchUrl(h.method, h.url, "backend");
    const B = US.pytest;
    B.calls++;
    if (!m.c.length) { B.unmatched.push(h.path + ":" + h.line + " " + h.method + " " + h.url); continue; }
    B.matched++;
    if (m.n0 > 1) B.multi_candidate++;
    if (m.c.length > 1) B.true_ambiguous++;
    const kind = isTestPath(h.path) ? "test_calls_route" : "calls_url";
    for (const r of m.c) E.push({ src: h.src, dst: r.id, kind, evidence_path: h.path, evidence_line: h.line, confidence: Math.round(1e4 / m.c.length) / 1e4, attrs: { method: h.method, url: h.url, candidates: m.n0, rule: m.rule, ambiguous: m.c.length > 1 } });
  }
  US.backend_routes = routes.filter((r) => r.server === "backend").length;
  US.ops_routes = routes.filter((r) => r.server === "ops").length;
  const hit = new Set(E.filter((e) => e.kind === "calls_url").map((e) => e.dst));
  US.backend_routes_with_client = routes.filter((r) => r.server === "backend" && hit.has(r.id)).length;
  // outbox kinds
  const kindHome = new Map();
  for (const k of tsg.kinds || []) if (!kindHome.has(k.kind)) kindHome.set(k.kind, k);
  const API_TARGET = /Api\.(ts|js)#|#\w*[aA]pi\./;
  const kindNode = (k, rt, p, line) => addNode({ id: "kind:" + k, kind: "outbox_kind", path: p || null, name: k, line_start: line || null, line_end: line || null, signature: null, tokens: 0, _runtime: rt });
  for (const k of tsg.kinds || []) {
    kindNode(k.kind, k.runtime === "mobile" ? "mobile" : runtimeOf(k.path), (kindHome.get(k.kind) || k).path, (kindHome.get(k.kind) || k).line);
    for (const tgt of k.targets) if (API_TARGET.test(tgt)) E.push({ src: "kind:" + k.kind, dst: tgt, kind: "kind_handled_by", evidence_path: k.path, evidence_line: k.line, confidence: 1, attrs: { switch_on: k.switchOn, dispatcher: k.fn } });
  }
  for (const s of tsg.sendKinds || []) {
    kindNode(s.kind, runtimeOf(s.path), null, null);
    E.push({ src: s.site, dst: "kind:" + s.kind, kind: "enqueues_kind", evidence_path: s.path, evidence_line: s.line, confidence: 1, attrs: { via: s.via } });
  }
  // screens and navigation
  for (const s of tsg.screens || []) {
    const rt = runtimeOf(s.path);
    const id = "screen:" + rt + "/" + s.screen;
    addNode({ id, kind: "screen", path: s.path, name: s.screen, line_start: s.line, line_end: s.line, signature: "<" + s.tag + " " + s.screen + ">", tokens: 0 });
    if (s.component) E.push({ src: id, dst: s.component, kind: "registers_screen", evidence_path: s.path, evidence_line: s.line, confidence: 1, attrs: { tag: s.tag } });
  }
  for (const v of tsg.navigate || []) {
    const rt = runtimeOf(v.path);
    const id = "screen:" + rt + "/" + v.screen;
    if (!N.has(id)) addNode({ id, kind: "screen", path: null, name: v.screen, line_start: null, line_end: null, signature: null, tokens: 0, _runtime: rt });
    E.push({ src: v.site, dst: id, kind: "navigates", evidence_path: v.path, evidence_line: v.line, confidence: 1, attrs: null });
  }
  // env and config reads
  for (const r of tsg.envReads || []) {
    if (r.key) {
      const id = "setting:env/" + r.key;
      addNode({ id, kind: "setting", path: null, name: r.key, line_start: null, line_end: null, signature: "env " + r.key, tokens: 0, _runtime: /^EXPO_PUBLIC_/.test(r.key) ? "mobile" : /^VITE_/.test(r.key) ? "web" : runtimeOf(r.path) });
      E.push({ src: r.src, dst: id, kind: "reads_setting", evidence_path: r.path, evidence_line: r.line, confidence: 1, attrs: { via: "env" } });
    } else if (r.cfg) {
      const id = "setting:" + r.cfg.path + "#" + r.cfg.name;
      addNode({ id, kind: "setting", path: r.cfg.path, name: r.cfg.name, line_start: r.cfg.line, line_end: r.cfg.line, signature: r.cfg.sig, tokens: tok(r.cfg.sig) });
      E.push({ src: r.src, dst: id, kind: "reads_setting", evidence_path: r.path, evidence_line: r.line, confidence: 1, attrs: { via: "config_object" } });
    }
  }
  // web contract edges from ESLint no-restricted-imports (eslint.config.js): files-glob -> group patterns
  try {
    if (fileSet.has("eslint.config.js")) {
      const src = fs.readFileSync(path.join(exp, "eslint.config.js"), "utf8");
      let alias = {};
      try { const jc = JSON.parse(fs.readFileSync(path.join(exp, "jsconfig.json"), "utf8")); for (const [k, v] of Object.entries((jc.compilerOptions || {}).paths || {})) alias[k.replace(/\/\*$/, "")] = String(v[0]).replace(/\/\*$/, ""); } catch (e) {}
      const lineAtPos = (pos) => src.slice(0, pos).split("\n").length;
      const strs = (s) => [...s.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
      const filesUnder = (dir) => files.filter((f) => f.startsWith(dir + "/") && /\.(js|jsx|ts|tsx|mjs)$/.test(f));
      const slicesUnder = (dir) => [...new Set(filesUnder(dir).map((f) => "slice:" + runtimeOf(f) + "/" + sliceOf(f)))].sort();
      for (const m of src.matchAll(/files:\s*\[([^\]]*)\](?:(?!files:)[\s\S])*?["']no-restricted-imports["'](?:(?!files:)[\s\S])*?group:\s*\[([^\]]*)\](?:,\s*message:\s*\n?\s*["']([^"']*)["'])?/g)) {
        const srcDirs = strs(m[1]).map((g) => g.replace(/\/\*\*.*$/, ""));
        const pats = strs(m[2]);
        const line = lineAtPos(m.index + m[0].indexOf("group"));
        const msg = (m[3] || "").slice(0, 160);
        const srcSlices = [...new Set(srcDirs.flatMap(slicesUnder))];
        const res = (p) => { const a = p.replace(/^!/, "").replace(/\/\*$/, ""); for (const [k, v] of Object.entries(alias)) if (a === k || a.startsWith(k + "/")) return v + a.slice(k.length); return null; };
        for (const p of pats) {
          const dir = res(p);
          if (!dir) continue;
          if (p.startsWith("!")) {
            for (const s of srcSlices) for (const f of filesUnder(dir).concat(fileSet.has(dir + ".jsx") ? [dir + ".jsx"] : [])) E.push({ src: s, dst: "file:" + f, kind: "contract", evidence_path: "eslint.config.js", evidence_line: line, confidence: 1, attrs: { contract: msg || "eslint no-restricted-imports", contract_type: "eslint_no_restricted_imports", rule: "allow", pattern: p } });
          } else {
            for (const s of srcSlices) for (const d of slicesUnder(dir)) if (s !== d) E.push({ src: s, dst: d, kind: "contract", evidence_path: "eslint.config.js", evidence_line: line, confidence: 1, attrs: { contract: msg || "eslint no-restricted-imports", contract_type: "eslint_no_restricted_imports", rule: "forbid", pattern: p } });
          }
        }
      }
    }
  } catch (e) { ST.eslint_contracts = { status: "failed_degraded_to_empty", error: String(e).slice(0, 300) }; }
  // implicit nodes for references whose owner exists (inherited columns, Settings properties)
  for (const e of E) {
    if (e.dst && e.dst.startsWith("column:") && !N.has(e.dst)) {
      const [tb, col] = e.dst.slice(7).split(".");
      const tn = N.get("table:" + tb);
      if (tn && col) addNode({ id: e.dst, kind: "column", path: tn.path, name: col, line_start: null, line_end: null, signature: "(implicit: inherited or not a mapped_column)", tokens: 0 });
    }
    if (e.dst && /^setting:[a-z_0-9]+$/.test(e.dst) && !N.has(e.dst) && N.has("file:backend/app/core/config.py")) addNode({ id: e.dst, kind: "setting", path: "backend/app/core/config.py", name: e.dst.slice(8), line_start: null, line_end: null, signature: "(Settings attribute, not a declared field)", tokens: 0 });
  }
  T.join_core = now() - t;
  // ---- docs ----
  t = now();
  try {
    const d = runDocs(exp, files, N, routes);
    for (const n of d.nodes) addNode(n);
    for (const e of d.edges) E.push(e);
    ST.docs = { status: d.nodes.length ? "ok" : "empty", stats: d.stats };
  } catch (e) { ST.docs = { status: "failed_degraded_to_empty", error: String(e && e.stack || e).slice(0, 600) }; }
  T.docs = now() - t;
  // ---- runtime / slice / capability structure ----
  t = now();
  for (const n of N.values()) {
    n.runtime = n.path ? runtimeOf(n.path) : (n._runtime || (n.id.startsWith("route:backend") ? "backend" : n.id.startsWith("route:ops") ? "ops" : null));
    n.slice = n.path ? sliceOf(n.path) : null;
    n.is_test = isTestPath(n.path);
    delete n._runtime;
  }
  const sliceIds = new Map();
  for (const n of [...N.values()]) {
    if (!(n.kind === "file" || n.kind === "doc") || !n.path) continue;
    const sid = "slice:" + n.runtime + "/" + n.slice;
    if (!sliceIds.has(sid)) {
      sliceIds.set(sid, true);
      addNode({ id: sid, kind: "slice", path: sliceDir(n.path), name: n.slice, line_start: null, line_end: null, signature: null, tokens: 0, runtime: n.runtime, slice: n.slice, is_test: false });
      const rid = "runtime:" + n.runtime;
      addNode({ id: rid, kind: "runtime", path: null, name: n.runtime, line_start: null, line_end: null, signature: null, tokens: 0, runtime: n.runtime, slice: null, is_test: false });
      E.push({ src: rid, dst: sid, kind: "contains", evidence_path: null, evidence_line: null, confidence: 1, attrs: null });
    }
    E.push({ src: sid, dst: n.id, kind: "contains", evidence_path: n.path, evidence_line: null, confidence: 1, attrs: null });
  }
  const caps = { backend: "backend/app/features/", mobile: "technician-app/src/features/", web: "src/features/", ops: "src/features/" };
  const capRt = new Map();
  for (const f of files) for (const [rt, pre] of Object.entries(caps)) if (f.startsWith(pre) && runtimeOf(f) === rt) { const c = f.slice(pre.length).split("/")[0]; if (f.slice(pre.length).includes("/")) { if (!capRt.has(c)) capRt.set(c, new Set()); capRt.get(c).add(rt); } }
  for (const [c, rts] of [...capRt.entries()].sort()) {
    const L = [...rts].sort();
    for (const a of L) for (const b of L) if (a !== b && N.has("slice:" + a + "/" + c) && N.has("slice:" + b + "/" + c)) E.push({ src: "slice:" + a + "/" + c, dst: "slice:" + b + "/" + c, kind: "same_capability", evidence_path: caps[a] + c, evidence_line: null, confidence: 1, attrs: null });
  }
  T.structure = now() - t;
  // ---- git co-change ----
  t = now();
  let commitsOut = [];
  try {
    const g = cochange({ repo: REPO, sha, frozen: FROZEN, taskShas, fileSet: new Set([...N.values()].filter((n) => n.kind === "file" || n.kind === "doc").map((n) => n.path)) });
    for (const e of g.edges) E.push(e);
    commitsOut = g.commits;
    ST.git = { status: "ok", stats: g.stats };
  } catch (e) { ST.git = { status: "failed_degraded_to_empty", error: String(e && e.message || e).slice(0, 600) }; }
  T.git = now() - t;
  // ---- experimental: response-schema field -> client reader (jobs, attendance) ----
  t = now();
  const X = { nodes: new Map(), edges: [] };
  try {
    const CAPS = ["jobs", "attendance"];
    const models = py.schema_models || {};
    const fieldsByCap = new Map(CAPS.map((c) => [c, new Map()]));
    for (const r of routes) {
      if (r.server !== "backend" || !r.handler) continue;
      const cap = sliceOf((N.get(r.handler) || {}).path || "");
      if (!CAPS.includes(cap)) continue;
      const seen = new Set();
      const stack = [...(r.response_models || [])];
      for (const m0 of r.response_models || []) X.edges.push({ src: r.id, dst: m0, kind: "returns_model", evidence_path: (N.get(r.handler) || {}).path, evidence_line: (N.get(r.id) || {}).line_start, confidence: 1, attrs: null });
      while (stack.length) {
        const m = stack.pop();
        if (seen.has(m) || !models[m]) continue;
        seen.add(m);
        for (const f of models[m].fields) {
          const fid = "field:" + m.slice(4) + "." + f.name;
          if (!X.nodes.has(fid)) {
            X.nodes.set(fid, { id: fid, kind: "response_field", path: models[m].path, name: f.name, line_start: f.line, line_end: f.line, signature: null, tokens: 0, runtime: "backend", slice: sliceOf(models[m].path), is_test: false });
            X.edges.push({ src: m, dst: fid, kind: "has_field", evidence_path: models[m].path, evidence_line: f.line, confidence: 1, attrs: null });
          }
          if (!fieldsByCap.get(cap).has(f.name)) fieldsByCap.get(cap).set(f.name, new Set());
          fieldsByCap.get(cap).get(f.name).add(fid);
          for (const nm of f.nested) stack.push(nm);
        }
      }
    }
    const capOfClient = (p) => {
      if (isTestPath(p)) return null;
      const rt = runtimeOf(p);
      if (rt !== "mobile" && rt !== "web") return null;
      const s = sliceOf(p);
      if (CAPS.includes(s)) return s;
      const b = path.posix.basename(p).toLowerCase();
      for (const c of CAPS) if (b.startsWith(c) || b.startsWith(c.replace(/s$/, ""))) return c;
      return null;
    };
    const seenX = new Set();
    for (const pr0 of tsg.propReads || []) {
      const cap = capOfClient(pr0.path);
      if (!cap) continue;
      const fs_ = fieldsByCap.get(cap).get(pr0.key);
      if (!fs_) continue;
      const L = [...fs_].sort();
      for (const fid of L) {
        const k = pr0.src + "|" + fid + "|" + pr0.line;
        if (seenX.has(k)) continue;
        seenX.add(k);
        X.edges.push({ src: pr0.src, dst: fid, kind: "reads_response_field", evidence_path: pr0.path, evidence_line: pr0.line, confidence: Math.round(1e4 / L.length) / 1e4, attrs: { key: pr0.key, form: pr0.form, candidates: L.length } });
      }
    }
    ST.response_fields = { status: "ok", fields: X.nodes.size, reads: X.edges.filter((e) => e.kind === "reads_response_field").length };
  } catch (e) { ST.response_fields = { status: "failed_degraded_to_empty", error: String(e && e.stack || e).slice(0, 600) }; }
  T.response_fields = now() - t;

  // ---- validate, switch, sort, write ----
  t = now();
  const dangling = {};
  const kept = [];
  const seenE = new Set();
  const PAIR_DEDUPE = new Set(["uses_constant"]);
  const pairSeen = new Set();
  for (const e of E) {
    if (skip.has(e.kind) || (only && !only.has(e.kind))) continue;
    if (!N.has(e.src) || !N.has(e.dst)) { dangling[e.kind] = (dangling[e.kind] || 0) + 1; continue; }
    if (e.src === e.dst && e.kind !== "co_changed") { dangling[e.kind + ":self"] = (dangling[e.kind + ":self"] || 0) + 1; continue; }
    if (PAIR_DEDUPE.has(e.kind)) { const pk = e.kind + "|" + e.src + "|" + e.dst; if (pairSeen.has(pk)) continue; pairSeen.add(pk); }
    const line = edgeLine(e);
    if (seenE.has(line)) continue;
    seenE.add(line);
    kept.push([e.kind, e.src, e.dst, e.evidence_path || "", e.evidence_line || 0, line]);
  }
  kept.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : a[4] - b[4] || (a[5] < b[5] ? -1 : a[5] > b[5] ? 1 : 0)));
  const nodeIds = [...N.keys()].sort();
  fs.writeFileSync(path.join(outdir, "nodes.jsonl"), nodeIds.map((id) => nodeLine(N.get(id))).join("\n") + "\n");
  fs.writeFileSync(path.join(outdir, "edges.jsonl"), kept.map((k) => k[5]).join("\n") + "\n");
  fs.writeFileSync(path.join(outdir, "commits.jsonl"), commitsOut.map(stable).join("\n") + (commitsOut.length ? "\n" : ""));
  fs.mkdirSync(path.join(outdir, "experimental"), { recursive: true });
  const xn = [...X.nodes.keys()].sort().map((id) => nodeLine(X.nodes.get(id)));
  const xe = X.edges.filter((e) => N.has(e.src) || X.nodes.has(e.src)).map(edgeLine).sort();
  fs.writeFileSync(path.join(outdir, "experimental", "response_fields.nodes.jsonl"), xn.join("\n") + (xn.length ? "\n" : ""));
  fs.writeFileSync(path.join(outdir, "experimental", "response_fields.edges.jsonl"), xe.join("\n") + (xe.length ? "\n" : ""));
  T.write = now() - t;
  if (!argv.includes("--keep-export")) fs.rmSync(exp, { recursive: true, force: true });
  T.total = now() - t0;
  const nc = {}, ec = {};
  for (const id of nodeIds) { const k = N.get(id).kind; nc[k] = (nc[k] || 0) + 1; }
  for (const k of kept) ec[k[0]] = (ec[k[0]] || 0) + 1;
  const h = crypto.createHash("sha256");
  for (const f of SOURCES) h.update(f + "\0" + fs.readFileSync(path.join(HERE, f)));
  const sha256 = (f) => crypto.createHash("sha256").update(fs.readFileSync(path.join(outdir, f))).digest("hex");
  const meta = {
    commit: sha,
    commit_time: Number(cp.execFileSync("git", ["-C", REPO, "show", "-s", "--format=%ct", sha], { encoding: "utf8" }).trim()),
    extractor_version: h.digest("hex").slice(0, 16),
    tools: { node: process.version, typescript: tsg.tsVersion || null, python: (cp.spawnSync(PY, ["-V"], { encoding: "utf8" }).stdout || "").trim() },
    switches: { skip: [...skip].sort(), only: only ? [...only].sort() : null, task: taskShas },
    counts: { nodes: nc, edges: ec, nodes_total: nodeIds.length, edges_total: kept.length, experimental_response_fields: { nodes: xn.length, edges: xe.length } },
    dropped_dangling_edges: dangling,
    stages: ST,
    urls: US,
    output_sha256: { "nodes.jsonl": sha256("nodes.jsonl"), "edges.jsonl": sha256("edges.jsonl"), "commits.jsonl": sha256("commits.jsonl") },
    timings_ms: T,
  };
  fs.writeFileSync(path.join(outdir, "meta.json"), JSON.stringify(meta, null, 1) + "\n");
  console.log(JSON.stringify({ commit: sha.slice(0, 12), nodes: nodeIds.length, edges: kept.length, ms: T, stages: Object.fromEntries(Object.entries(ST).map(([k, v]) => [k, v.status])) }));
}
main().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
