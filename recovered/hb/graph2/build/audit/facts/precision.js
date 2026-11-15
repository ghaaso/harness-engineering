// Independent precision check per edge kind. node precision.js <factsdir> <exportdir> <outdir> [n=30] [seed=7]
// Each sampled edge gets OK (my own resolver confirms it), PLAUS (text supports it, identity not provable by my
// resolver; hand-checked from the printed sample file) or FAIL (my resolver contradicts it). Writes
// <outdir>/<kind>.txt with every sampled edge, its evidence text and the verdict, and summary.json.
"use strict";
const fs = require("fs"), path = require("path");
const L = require("./lib.js");
const [factsDir, expDir, outDir, nArg, seedArg] = process.argv.slice(2);
const n = Number(nArg || 30), seed = Number(seedArg || 7);
const F = L.loadFacts(factsDir), repo = L.mkRepo(expDir), R = L.routeTable(repo);
fs.mkdirSync(outDir, { recursive: true });
const N = F.N;
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const symOf = (id) => { const i = id.indexOf("#"); return i < 0 ? null : id.slice(i + 1); };
const pathOf = (id) => { const m = id.match(/^(?:sym|file|const):([^#]+)/); return m ? m[1] : (N.get(id) || {}).path || null; };
const isPy = (p) => /\.py$/.test(p || "");

function resolvesTo(srcPath, name, dstPath) {
  if (isPy(srcPath)) return L.pyResolveName(repo, srcPath, name).some((c) => c.path === dstPath);
  const t = repo.text(srcPath) || "";
  if (srcPath === dstPath) return true;
  const im = L.tsImports(repo, srcPath).get(name);
  if (!im || !im.path) return false;
  return im.path === dstPath || L.tsExportReaches(repo, im.path, im.orig, dstPath);
}
function definedHere(p, name) {
  const t = repo.text(p) || "";
  return new RegExp("(^|\\n)\\s*(export\\s+)?(default\\s+)?(async\\s+)?(def|class|function|const|let|var)\\s+" + esc(name) + "\\b").test(t);
}

function checkCall(e) {
  const d = N.get(e.dst), s = N.get(e.src);
  const sp = e.evidence_path, dp = d.path, sym = symOf(e.dst) || "";
  const parts = sym.split(".");
  const last = parts[parts.length - 1];
  const win = repo.window(sp, e.evidence_line, 0, 3);
  const isCtor = d.kind === "class";
  if (s && s.line_start && s.path === sp && !(s.line_start <= e.evidence_line && e.evidence_line <= s.line_end)) return ["FAIL", "evidence line outside src"];
  if (!new RegExp("\\b" + esc(last) + "\\s*(\\(|<|\\?\\.\\()").test(win) && !new RegExp("\\b" + esc(last) + "\\b").test(win)) return ["FAIL", "name " + last + " not at evidence"];
  if (parts.length === 1) {
    // bare or module-qualified
    const bare = new RegExp("(^|[^.\\w])" + esc(last) + "\\s*[(<]").test(win) || new RegExp("new\\s+" + esc(last) + "\\b").test(win);
    if (sp === dp && definedHere(sp, last)) return ["OK", "same-file def"];
    // an alias: any imported name whose orig is last and resolves to dst
    if (isPy(sp)) {
      for (const [loc, im] of L.pyImports(repo, sp)) if ((im.orig === last || loc === last) && L.pyResolveName(repo, sp, loc).some((c) => c.path === dp) && new RegExp("\\b" + esc(loc) + "\\b").test(win)) return ["OK", "import " + loc];
      const mq = win.match(new RegExp("(\\w+)\\." + esc(last) + "\\s*\\("));
      if (mq && L.pyResolveName(repo, sp, mq[1]).some((c) => c.path === dp && c.module)) return ["OK", "module." + last];
      if (mq && mq[1] === "self") return ["FAIL", "self." + last + " but dst is module-level"];
    } else {
      for (const [loc, im] of L.tsImports(repo, sp)) if ((im.orig === last || loc === last) && new RegExp("\\b" + esc(loc) + "\\b").test(win) && im.path && (im.path === dp || L.tsExportReaches(repo, im.path, im.orig, dp))) return ["OK", "import " + loc];
      const mq = win.match(new RegExp("(\\w+)\\." + esc(last) + "\\s*\\("));
      if (mq) { const im = L.tsImports(repo, sp).get(mq[1]); if (im && im.orig === "*" && im.path === dp) return ["OK", "ns." + last]; }
      if (!isPy(sp) && new RegExp("(^|\\n)\\s*vi\\.mock|jest\\.mock").test(repo.text(sp) || "") && 0) return ["PLAUS", "mocked"];
    }
    return [bare ? "PLAUS" : "PLAUS", "unresolved by my resolver"];
  }
  // owner.member
  const owner = parts[parts.length - 2];
  const sSym = symOf(e.src) || "";
  if (new RegExp("\\b(self|cls|this)\\s*\\.\\s*" + esc(last) + "\\b").test(win)) {
    if (sp === dp && sSym.split(".")[0] === owner) return ["OK", "self call same class"];
    const tsrc = repo.text(sp) || "";
    const cls = sSym.split(".")[0];
    const m = tsrc.match(new RegExp("class\\s+" + esc(cls) + "\\s*\\(([^)]*)\\)"));
    if (m && m[1].split(",").some((b) => b.trim().split(".").pop() === owner)) return ["OK", "self call inherited"];
    return ["FAIL", "self." + last + " resolves to own class " + cls + ", dst owner " + owner];
  }
  if (new RegExp("\\b" + esc(owner) + "\\s*\\.\\s*" + esc(last) + "\\b").test(win) && (resolvesTo(sp, owner, dp) || (sp === dp))) return ["OK", owner + "." + last];
  if (sp === dp && parts.length >= 2 && definedHere(sp, parts[0]) && new RegExp("(^|[^.\\w])" + esc(last) + "\\s*\\(").test(win)) return ["OK", "nested/local"];
  if (new RegExp("\\b" + esc(owner) + "\\s*\\(\\s*[\\w.]*\\s*\\)\\s*\\.\\s*" + esc(last)).test(win)) return [resolvesTo(sp, owner, dp) || sp === dp ? "OK" : "PLAUS", "ctor-chain"];
  const t = repo.text(sp) || "";
  if (new RegExp("\\b" + esc(owner) + "\\b").test(t)) return ["PLAUS", "typed receiver; owner named in src file"];
  return ["FAIL", "receiver type " + owner + " not named in src file"];
}

function checkUrl(e) {
  const r = N.get(e.dst);
  const [method, rpath] = [r.name.split(" ")[0], r.name.split(" ")[1]];
  const mine = R.find((x) => "route:" + x.server + " " + x.method + " " + x.path === e.dst);
  if (!mine) return ["FAIL", "route not in my table"];
  const win = repo.window(e.evidence_path, e.evidence_line, 0, 2);
  const lits = [...win.replace(/\$?\{[^{}]*\}/g, "X").matchAll(/["'`](\/api\/[^"'`?]*)/g)].map((m) => m[1].replace(/\/$/, ""));
  if (!lits.length) {
    // pytest form: client.get(f"{BASE}/x") or URL constants
    if (/\{\w+\}|\bf["']/.test(win) || /\b[A-Z_]{3,}\b/.test(win)) return ["PLAUS", "url built from a variable/f-string"];
    return ["FAIL", "no /api literal at evidence"];
  }
  const hit = lits.some((u) => mine.rx.test(u.replace(/\{[^}]*\}/g, "X")));
  if (!hit) return ["FAIL", "literal " + lits.join(",") + " does not match " + rpath];
  const meth = (win.match(/\b(get|post|put|patch|delete)\b/i) || [])[1];
  const mm = win.match(/method:\s*["'](\w+)["']/);
  const wm = mm ? mm[1].toUpperCase() : null;
  if (wm && wm !== method) return ["FAIL", "method " + wm + " vs " + method];
  const others = R.filter((x) => x !== mine && lits.some((u) => x.rx.test(u.replace(/\{[^}]*\}/g, "X"))) && x.method === method);
  if (others.length && e.confidence === 1) return ["PLAUS", "another route also matches: " + others.map((o) => o.server + " " + o.path).join(";")];
  return ["OK", "literal+method" + (meth ? "" : "?")];
}

// table maps: class -> table
const tableOfClass = new Map();
for (const f of repo.files.filter((f) => /^backend\/.*\.py$/.test(f))) {
  const t = repo.text(f);
  for (const c of t.split(/^(?=class\s)/m)) { const a = c.match(/^class\s+(\w+)/); const b = c.match(/__tablename__\s*(?::[^=]*)?=\s*["'](\w+)["']/); if (a && b) tableOfClass.set(a[1], b[1]); }
}
const classesOf = (tb) => [...tableOfClass].filter(([c, t]) => t === tb).map(([c]) => c);
function checkTable(e, write) {
  const tb = N.get(e.dst).name, cls = classesOf(tb);
  const via = (e.attrs || {}).via;
  const s = N.get(e.src);
  const body = s && s.line_start ? repo.lines(s.path).slice(s.line_start - 1, s.line_end).join("\n") : repo.text(e.evidence_path) || "";
  const win = repo.window(e.evidence_path, e.evidence_line, 0, 3);
  const C = cls.map(esc).join("|") || "\\u0000";
  const sqlW = new RegExp("(INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|ALTER\\s+TABLE|TRUNCATE)\\s+\"?" + esc(tb) + "\\b", "i");
  const sqlR = new RegExp("(FROM|JOIN)\\s+\"?" + esc(tb) + "\\b", "i");
  if (write) {
    if (new RegExp("\\b(insert|update|delete|pg_insert)\\(\\s*(" + C + ")\\b").test(body) && /orm/.test(via || "orm")) return ["OK", "insert/update/delete(Model)"];
    if (/\.add(_all)?\(/.test(win) && new RegExp("\\b(" + C + ")\\s*\\(").test(body)) return ["OK", "session.add of an instance built in body"];
    if (/\.add(_all)?\(/.test(win) && new RegExp("\\b(" + C + ")\\b").test(body)) return ["PLAUS", "session.add of a typed instance"];
    if (via === "ctor" && new RegExp("\\b(" + C + ")\\s*\\(").test(win)) return ["OK", "ctor at line"];
    if (via === "sql" && sqlW.test(body)) return ["OK", "sql write"];
    if (via === "delete" && /\.delete\(/.test(win)) return ["PLAUS", "session.delete(x)"];
    if (via === "uow" || via === "unit_of_work") return ["PLAUS", "uow: attribute assignment on loaded row"];
    if (new RegExp("\\b(" + C + ")\\s*\\(").test(body)) return ["PLAUS", "ctor somewhere in body"];
    return ["FAIL", "no write of " + tb + " found (via " + via + ")"];
  }
  if (new RegExp("\\b(select|get|query|exists)\\(\\s*(" + C + ")\\b").test(body)) return ["OK", "select/get(Model)"];
  if (new RegExp("\\b(" + C + ")\\.\\w+").test(body) && /select\(/.test(body)) return ["OK", "select on Model columns"];
  if (sqlR.test(body)) return ["OK", "sql read"];
  return ["FAIL", "no read of " + tb + " found (via " + via + ")"];
}

function checkGeneric(e) {
  const k = e.kind, d = N.get(e.dst), s = N.get(e.src);
  const win = repo.window(e.evidence_path, e.evidence_line, 0, 2);
  const last = (symOf(e.dst) || d.name || "").split(".").pop();
  switch (k) {
    case "imports": {
      const specs = [...win.matchAll(/from\s+["']([^"']+)["']|import\s+["']([^"']+)["']|require\(\s*["']([^"']+)["']/g)].map((m) => m[1] || m[2] || m[3]);
      if (specs.some((sp) => L.tsResolveSpec(repo, e.evidence_path, sp) === d.path)) return ["OK", "ts import"];
      const py = repo.window(e.evidence_path, e.evidence_line, 0, 0);
      const m = py.match(/from\s+(\.*)([\w.]*)\s+import\s+(.*)/) || py.match(/import\s+([\w.]+)/);
      if (m && isPy(e.evidence_path)) {
        const names = (e.attrs && e.attrs.names) || [];
        const imps = L.pyImports(repo, e.evidence_path);
        for (const nm of names.length ? names : [...imps.keys()]) { const c = L.pyResolveName(repo, e.evidence_path, nm); if (c.some((x) => x.path === d.path) || [...imps.values()].some((v) => L.pyModPath(repo, v.mod) === d.path)) return ["OK", "py import"]; }
        return ["FAIL", "py import does not resolve to " + d.path];
      }
      return ["FAIL", "no import resolving to dst at line"];
    }
    case "renders": return new RegExp("<\\s*" + esc(last) + "\\b").test(win) ? (resolvesTo(e.evidence_path, last, d.path) || (e.evidence_path === d.path) ? ["OK", "jsx"] : ["PLAUS", "jsx, import not resolved"]) : (new RegExp("\\b" + esc(last) + "\\b").test(win) ? ["PLAUS", "name as value (component prop)"] : ["FAIL", "no <" + last + " at line"]);
    case "depends_injects": case "passes_callable": {
      if (!new RegExp("\\b" + esc(last) + "\\b").test(win)) {
        const ann = (repo.window(e.evidence_path, e.evidence_line, 0, 0).match(/(\w+)\s*:\s*(\w+)/) || [])[2];
        const anns = [...repo.window(e.evidence_path, e.evidence_line, 0, 0).matchAll(/\w+\s*:\s*(\w+)/g)].map((m) => m[1]);
        for (const an of anns) { const c = L.pyResolveName(repo, e.evidence_path, an); for (const x of c) { const tt = repo.text(x.path) || ""; const m = tt.match(new RegExp("^" + esc(an) + "\\s*=\\s*Annotated\\[[^\\n]*?Depends\\(\\s*(\\w+)", "m")); if (m && (m[1] === last) && L.pyResolveName(repo, x.path, m[1]).some((y) => y.path === d.path)) return ["OK", "Annotated alias " + an]; } }
        if (k === "passes_callable" && new RegExp("\\b" + esc(last) + "\\b").test(repo.window(e.evidence_path, e.evidence_line, 0, 12))) return ["OK", "multi-line call arg"];
        return ["FAIL", last + " not at line" + (ann ? " (ann " + ann + ")" : "")];
      }
      const m = win.match(new RegExp("(\\w+)\\s*(?=\\)|,|\\s*$)"));
      return resolvesTo(e.evidence_path, last, d.path) || L.pyImports(repo, e.evidence_path).has(last) || definedHere(e.evidence_path, last) ? ["OK", "named+resolved"] : ["PLAUS", "named, alias?"];
    }
    case "overrides": {
      const w = repo.window(e.evidence_path, e.evidence_line, 0, 1);
      const m = w.match(/dependency_overrides\[\s*([\w.]+)\s*\]/);
      if (!m) return ["FAIL", "no dependency_overrides[] at line"];
      const nm = m[1].split(".").pop(), q = m[1].split(".");
      if (q.length === 2 && L.pyResolveName(repo, e.evidence_path, q[0]).some((c) => c.module && c.path === d.path) && d.name === nm) return ["OK", "module.attr"];
      const c = L.pyResolveName(repo, e.evidence_path, q[0]);
      return c.some((x) => x.path === d.path && (x.name === d.name || x.name == null)) ? ["OK", "resolved " + m[1]] : ["FAIL", m[1] + " -> " + JSON.stringify(c)];
    }
    case "mocks": {
      const w = repo.window(e.evidence_path, e.evidence_line, 0, 1);
      const m = w.match(/(?:vi|jest)\.(?:mock|doMock|spyOn)\(\s*["']([^"']+)["']/);
      if (m) return L.tsResolveSpec(repo, e.evidence_path, m[1]) === d.path ? ["OK", "mock spec"] : ["FAIL", "spec " + m[1] + " -> " + L.tsResolveSpec(repo, e.evidence_path, m[1])];
      const p = w.match(/patch(?:\.object)?\(\s*["']([\w.]+)["']/);
      if (p) { const parts = p[1].split("."); for (let i = parts.length; i > 0; i--) { const mp = L.pyModPath(repo, parts.slice(0, i).join(".")); if (mp) return mp === d.path || (d.path === mp) ? ["OK", "patch target module"] : ["FAIL", "patch " + p[1] + " -> " + mp]; } }
      const mp = repo.window(e.evidence_path, e.evidence_line, 0, 3).replace(/\s+/g, " ").match(/monkeypatch\.setattr\(\s*([\w.]+)\s*,\s*["'](\w+)["']/);
      if (mp) { const head = mp[1].split(".")[0]; const c = L.pyResolveName(repo, e.evidence_path, head); const tgt = mp[2]; if (e.dst.startsWith("setting:") && d.name === tgt) return ["OK", "monkeypatch settings." + tgt]; if (c.some((x) => x.module && (x.path === d.path || L.pyResolveName(repo, x.path, tgt).some((y) => y.path === d.path)))) return ["OK", "monkeypatch " + mp[1] + "." + tgt]; return ["FAIL", "monkeypatch " + mp[1] + "." + tgt]; }
      const so = w.match(/spyOn\(\s*(\w+)/);
      if (so) return resolvesTo(e.evidence_path, so[1], d.path) ? ["OK", "spyOn imported obj"] : ["FAIL", "spyOn " + so[1]];
      return ["FAIL", "no mock call at line"];
    }
    case "inherits": { const w = repo.window(e.evidence_path, e.evidence_line, 0, 0); const m = w.match(/class\s+\w+\s*\(([^)]*)\)/) || w.match(/extends\s+([\w.]+)/); if (!m) return ["FAIL", "no class bases"]; return m[1].split(",").map((b) => b.trim().split(".").pop()).includes(d.name) && (resolvesTo(e.evidence_path, d.name, d.path) || e.evidence_path === d.path) ? ["OK", "base"] : ["FAIL", "bases " + m[1]]; }
    case "foreign_key": { const w = repo.window(e.evidence_path, e.evidence_line, 0, 2); const tgt = e.dst.slice(7); return new RegExp("ForeignKey\\(\\s*[\"']" + esc(tgt) + "[\"']").test(w) ? ["OK", "ForeignKey"] : ["FAIL", "no ForeignKey(" + tgt + ")"]; }
    case "has_column": { const col = d.name; const w = repo.window(e.evidence_path, e.evidence_line, 0, 0); return new RegExp("^\\s*" + esc(col) + "\\s*:\\s*Mapped|^\\s*" + esc(col) + "\\s*=\\s*(mapped_column|Column)").test(w) && tableOfClass.get(((repo.text(e.evidence_path) || "").slice(0, (repo.text(e.evidence_path) || "").split("\n").slice(0, e.evidence_line).join("\n").length).match(/class\s+(\w+)\(/g) || []).pop().replace(/class\s+|\(/g, "")) === e.src.slice(6) ? ["OK", "mapped col in class"] : ["PLAUS", "col line; owner class check failed (mixin?)"]; }
    case "maps_table": return tableOfClass.get(d ? symOf(e.src) : "") === d.name ? ["OK", "__tablename__"] : ["FAIL", "tablename mismatch"];
    case "migration_follows": { const t = repo.text(s.path) || ""; const m = t.match(/down_revision[^=]*=\s*["'](\w+)["']/); return m && m[1].replace(/^0*/, "") === d.name.replace(/^0*/, "") || (m && d.path && (repo.text(d.path) || "").includes("revision = \"" + m[1]) ) ? ["OK", "down_revision"] : (m && (repo.text(d.path) || "").match(new RegExp("^revision[^=]*=\\s*[\"']" + esc(m[1]) + "[\"']", "m")) ? ["OK", "down_revision=rev id"] : ["FAIL", "down_revision " + (m && m[1])]); }
    case "migration_touches": { const w = repo.window(e.evidence_path, e.evidence_line, 0, 3); return new RegExp("[\"'\\s(]" + esc(d.name) + "[\"'\\s(,.]").test(w) ? ["OK", "table named at line"] : ["FAIL", "table " + d.name + " not at line"]; }
    case "reads_setting": {
      const w = repo.window(e.evidence_path, e.evidence_line, 0, 1);
      const nm = d.name;
      if (new RegExp("settings\\s*\\.\\s*" + esc(nm) + "\\b|get_settings\\(\\)\\s*\\.\\s*" + esc(nm) + "\\b").test(w)) return ["OK", "settings." + nm];
      if (/^setting:env\//.test(e.dst) && new RegExp("env\\b[\\s\\S]{0,40}" + esc(nm) + "|[\"']" + esc(nm) + "[\"']").test(w)) return ["OK", "env " + nm];
      if (new RegExp("\\b" + esc(nm) + "\\b").test(w)) return ["PLAUS", "name at line (config object or shop setting)"];
      const keyc = [...w.matchAll(/\b(KEY_[A-Z0-9_]+)\b/g)].map((m) => m[1]);
      if (e.dst.startsWith("setting:shop/") && keyc.some((kc) => F.edges.some((x) => x.kind === "defines" && x.src.endsWith("#" + kc) && x.dst === e.dst))) return [/\[\s*KEY_\w+\s*\]\s*=(?!=)/.test(w) ? "PLAUS" : "OK", "KEY_ constant of the setting"];
      if ((e.attrs || {}).gate) return ["PLAUS", "scheduler gate; check if-block"];
      return ["FAIL", nm + " not at evidence"];
    }
    case "uses_constant": return new RegExp("\\b" + esc(d.name) + "\\b").test(repo.window(e.evidence_path, e.evidence_line, 0, 0)) ? (resolvesTo(e.evidence_path, d.name, d.path) || definedHere(e.evidence_path, d.name) && e.evidence_path === d.path ? ["OK", "const"] : ["PLAUS", "name at line, import unresolved"]) : ["FAIL", "const not at line"];
    case "writes_column": { const w = repo.window(e.evidence_path, e.evidence_line, 0, 0); return new RegExp("\\.\\s*" + esc(d.name) + "\\s*(=|\\+=|-=)(?!=)|\\b" + esc(d.name) + "\\s*=(?!=)|[\"']" + esc(d.name) + "[\"']\\s*:").test(w) ? ["PLAUS", "assignment of ." + d.name + " (owner type not proven)"] : ["FAIL", d.name + " not assigned at line"]; }
    case "enqueues_kind": return new RegExp("[\"']" + esc(d.name) + "[\"']").test(repo.window(e.evidence_path, e.evidence_line, 1, 3)) ? ["OK", "kind literal"] : ["FAIL", "kind literal not near line"];
    case "kind_handled_by": { const w = repo.window(e.evidence_path, e.evidence_line, 0, 8); return new RegExp("case\\s+[\"']" + esc(N.get(e.src).name) + "[\"']").test(w) && new RegExp("\\b" + esc(last) + "\\s*\\(").test(w) ? ["OK", "case + call"] : ["FAIL", "case/call not found"]; }
    case "navigates": return new RegExp("(navigat\\w*|replace|push|reset)\\(\\s*[\"']" + esc(d.name) + "[\"']").test(repo.window(e.evidence_path, e.evidence_line, 0, 1)) ? ["OK", "navigate"] : ["FAIL", "no navigate(" + d.name + ")"];
    case "registers_screen": { const w = repo.window(e.evidence_path, e.evidence_line, 0, 3); return new RegExp("[\"']" + esc(s.name) + "[\"']").test(w) && new RegExp("\\b" + esc(last) + "\\b").test(w) ? ["OK", "screen+component"] : ["FAIL", "screen/component not at line"]; }
    case "registers_route": { const mine = R.find((x) => "route:" + x.server + " " + x.method + " " + x.path === e.src); if (!mine) return ["FAIL", "route not mine"]; const t = repo.lines(mine.file); const after = t.slice(mine.line - 1, mine.line + 30).join("\n"); const m = after.match(/(?:async\s+)?def\s+(\w+)|(?:async\s+)?function\s+(\w+)/); return d.path === mine.file && m && (m[1] || m[2]) === last ? ["OK", "decorated def"] : (mine.server === "ops" && d.path === "ops-server.mjs" && d.line_start <= mine.line && d.line_end >= mine.line ? ["OK", "ops enclosing fn"] : ["FAIL", "handler " + (m && (m[1] || m[2]))]); }
    case "includes_router": return /include_router/.test(win) && resolvesTo("backend/app/main.py", (win.match(/include_router\(\s*(\w+)/) || [])[1] || "", d.path) ? ["OK", "include_router"] : ["PLAUS", "include_router var alias"];
    case "registers_job": return new RegExp("[\"']" + esc(d.name) + "[\"']").test(repo.window(e.evidence_path, e.evidence_line, 0, 6)) ? ["OK", "job name"] : ["FAIL", "job name missing"];
    case "runs": return new RegExp("\\b" + esc(last) + "\\b").test(repo.window(e.evidence_path, e.evidence_line, 0, 6)) ? ["OK", "fn named"] : ["FAIL", "fn not named"];
    case "same_capability": return repo.files.some((f) => f.startsWith(N.get(e.src).path + "/")) && repo.files.some((f) => f.startsWith(d.path + "/")) && N.get(e.src).name === d.name ? ["OK", "dirs"] : ["FAIL", "dirs"];
    case "defines": { if (e.src.startsWith("file:") && d.path === s.path) return ["OK", "def in file"]; if (d.path === s.path && d.line_start >= s.line_start && d.line_end <= s.line_end) return ["OK", "nested def"]; if (e.dst.startsWith("setting:shop/") && new RegExp("[\"']" + esc(d.name) + "[\"']").test(repo.window(e.evidence_path, e.evidence_line, 0, 0))) return ["OK", "key const"]; return ["PLAUS", "other defines form"]; }
    case "contains": { if (s.kind === "runtime") return d.runtime === s.name ? ["OK", "rt"] : ["FAIL", "rt"]; if (s.kind === "slice") return d.path && s.path && d.path.startsWith(s.path + "/") ? ["OK", "slice dir"] : (d.slice === s.name ? ["PLAUS", "slice by name"] : ["FAIL", "slice"]); if (d.path === s.path || (d.path === e.evidence_path)) return ["OK", "same file"]; return ["PLAUS", "other contains"]; }
    case "co_changed": return ["PLAUS", "checked separately by recount"];
    default: return null;
  }
}

const byKind = {};
for (const e of F.edges) (byKind[e.kind] = byKind[e.kind] || []).push(e);
const summary = {};
for (const k of Object.keys(byKind).sort()) {
  const S = L.sample(byKind[k], n, seed + k.length);
  const res = { n: S.length, total: byKind[k].length, OK: 0, PLAUS: 0, FAIL: 0, NOCHECK: 0 };
  const out = [];
  for (const e of S) {
    let v;
    try {
      if (k === "calls") v = checkCall(e);
      else if (k === "calls_url" || k === "test_calls_route") v = checkUrl(e);
      else if (k === "writes_table") v = checkTable(e, true);
      else if (k === "reads_table") v = checkTable(e, false);
      else v = checkGeneric(e);
    } catch (err) { v = ["FAIL", "checker error " + err.message]; }
    if (!v) { v = ["NOCHECK", "manual"]; }
    res[v[0]]++;
    const ev = repo.window(e.evidence_path, e.evidence_line, 0, 0).trim().slice(0, 200);
    out.push(`[${v[0]}] ${v[1]}\n   ${e.src} -> ${e.dst} (conf ${e.confidence} ${JSON.stringify(e.attrs || {}).slice(0, 120)})\n   @${e.evidence_path}:${e.evidence_line}: ${ev}`);
  }
  summary[k] = res;
  fs.writeFileSync(path.join(outDir, k + ".txt"), out.join("\n") + "\n");
}
fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 1));
for (const [k, v] of Object.entries(summary)) console.log(k.padEnd(18), JSON.stringify(v));
