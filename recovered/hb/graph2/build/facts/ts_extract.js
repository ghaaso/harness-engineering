// FACTS stage: mobile (TS) and web/ops (JS/JSX/MJS) through the TypeScript compiler API.
// Usage: node ts_extract.js <export_root> <out_json>
// Derived from research/schema/ts_extract.js. Changes: hermetic and pinned (no node_modules,
// no tsconfig "extends" lookup: the Expo base options are inlined; file lists are enumerated
// and sorted by this script, so two builds of one commit are byte-identical); nested defs are
// qualified by their enclosing def (no id collisions); jest/vitest test cases are nodes; calls
// resolve through a declaration->id map; new classes: imports, mocks (jest.mock / vi.mock /
// spyOn), inherits, env and config reads, constants, screens, response-key reads (experimental).
"use strict";
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(process.argv[2]);
const OUT = process.argv[3];
const TS_PATH = process.env.FACTS_TS || "C:/Users/User/Documents/projects/EMS_workshop1/technician-app/node_modules/typescript";
const ts = require(TS_PATH);
const t0 = Date.now();

const out = { tsVersion: ts.version, nodes: [], edges: [], urls: [], kinds: [], sendKinds: [], navigate: [], screens: [], propReads: [], envReads: [], stats: {} };
const inc = (k, n = 1) => (out.stats[k] = (out.stats[k] || 0) + n);
const rel = (f) => path.relative(ROOT, path.resolve(f)).split(path.sep).join("/");
const inRepo = (f) => { const r = rel(f); return !r.startsWith("..") && !/node_modules|(^|\/)lib\.[^/]*\.d\.ts$/.test(r); };
const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;
// same rule as build_facts.js isTestPath (protocol: by path, never by symbol id)
const isTestFile = (p) => /(^|\/)(tests|__tests__)\//.test(p) || /(^|\/)test_[^/]*\.py$/.test(p) || /(^|\/)[^/]*_test\.py$/.test(p) || /(^|\/)vitest\.setup\.[^/]+$/.test(p) || /(^|\/)conftest\.py$/.test(p) || /\.(test|spec)\.[^/]+$/.test(p);
const CONST_RE = /^_?[A-Z][A-Z0-9_]{2,}$/;
const tok = (s) => Math.ceil(s.length / 4);
const SKIP = new Set(["node_modules", ".expo", "dist", "dist-ops", "build", ".git", "coverage", "android", "ios"]);
function listFiles(dirRel, re) {
  const res = [];
  const base = path.join(ROOT, dirRel);
  if (!fs.existsSync(base)) return res;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(d, e.name)); }
      else if (re.test(e.name)) res.push(path.join(d, e.name));
    }
  };
  walk(base);
  return res.map((f) => f.split(path.sep).join("/"));
}
function readJsonc(p) {
  if (!fs.existsSync(p)) return null;
  const r = ts.readConfigFile(p, (f) => fs.readFileSync(f, "utf8"));
  return r.error ? null : r.config;
}
const EXPO_BASE = { allowJs: true, esModuleInterop: true, jsx: "react-native", lib: ["DOM", "ESNext"], moduleResolution: "node", noEmit: true, resolveJsonModule: true, skipLibCheck: true, target: "ESNext" };
function optionsFrom(json, basePath) {
  const conv = ts.convertCompilerOptionsFromJson(json, basePath);
  const o = conv.options;
  o.types = []; o.noEmit = true; o.skipLibCheck = true; o.noResolve = false;
  return o;
}
function viteAliases() {
  const al = {};
  for (const f of ["vite.config.js", "vite.ops.config.js", "vitest.config.js"]) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const s = fs.readFileSync(p, "utf8");
    for (const m of s.matchAll(/["'](@\w+)["']\s*:\s*fileURLToPath\(\s*new URL\(\s*["']\.\/([^"']+)["']/g)) al[m[1] + "/*"] = [m[2].replace(/\/$/, "") + "/*"];
  }
  return al;
}
function mobileProgram() {
  const dir = path.join(ROOT, "technician-app");
  if (!fs.existsSync(dir)) return null;
  const cfg = readJsonc(path.join(dir, "tsconfig.json")) || {};
  const co = Object.assign({}, EXPO_BASE, cfg.compilerOptions || {});
  const options = optionsFrom(co, dir);
  const files = listFiles("technician-app", /\.(ts|tsx)$/).filter((f) => !/\.d\.ts$/.test(f) || /expo-env\.d\.ts$/.test(f));
  return { options, files };
}
function webProgram() {
  const cfg = readJsonc(path.join(ROOT, "jsconfig.json")) || { compilerOptions: { baseUrl: ".", jsx: "react-jsx", module: "ESNext", moduleResolution: "Bundler", target: "ESNext" } };
  const co = Object.assign({ jsx: "react-jsx" }, cfg.compilerOptions || {}, { allowJs: true, checkJs: false });
  co.paths = Object.assign({}, viteAliases(), co.paths || {});
  if (!co.baseUrl) co.baseUrl = ".";
  const options = optionsFrom(co, ROOT);
  const files = listFiles("src", /\.(js|jsx|ts|tsx|mjs)$/)
    .concat(listFiles("tests", /\.(js|jsx|mjs|ts|tsx)$/))
    .concat(["ops-server.mjs", "vitest.setup.js"].map((f) => path.join(ROOT, f).split(path.sep).join("/")).filter((f) => fs.existsSync(f)));
  return { options, files: [...new Set(files)].sort() };
}

// ---------------- defs ----------------
const WRAPPERS = /^(React\.)?(useCallback|useMemo|memo|forwardRef|useEffectEvent)$/;
const wrapped = (e) => e && ts.isCallExpression(e) && WRAPPERS.test(e.expression.getText()) && e.arguments[0] && (ts.isArrowFunction(e.arguments[0]) || ts.isFunctionExpression(e.arguments[0])) ? e.arguments[0] : null;
const fnInit = (e) => e && (ts.isArrowFunction(e) || ts.isFunctionExpression(e) || ts.isClassExpression(e) || !!wrapped(e));
const TEST_FNS = /^(it|test)(\.(only|skip|concurrent|todo|failing))?$/;
const SUITE_FNS = /^describe(\.(only|skip|each))?$/;
function holderChain(objLit, throughWrappers) {
  // object literal -> "var" or "var.prop" chain if it is held by a variable (possibly nested), else null.
  // throughWrappers (config reads only): walk through `as const` / `satisfies` / parentheses. Without
  // it the walk stops at the wrapper, as it always did for definitions, so every member of
  // `export const config = {...} as const` had no holder and no config read was ever recorded.
  // Definitions keep the old behaviour (switching it on there would turn every member of a
  // jest.mock factory's `() => ({...})` into a new definition node).
  const names = [];
  let o = objLit;
  while (o) {
    if (!throughWrappers && !ts.isObjectLiteralExpression(o)) return null;
    const p = o.parent;
    if (!p) return null;
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return { names: [p.name.text, ...names], top: p };
    if (ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.parent)) { names.unshift(p.name.getText()); o = p.parent; continue; }
    if (ts.isAsExpression(p) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(p)) || ts.isParenthesizedExpression(p) || (ts.isTypeAssertionExpression && ts.isTypeAssertionExpression(p))) { o = p; continue; }
    if (ts.isExportAssignment(p)) return { names: ["default", ...names], top: p };
    if (ts.isReturnStatement(p) || ts.isArrowFunction(p)) return { names: ["return", ...names], top: p };
    return null;
  }
  return null;
}
function localName(n, sf) {
  if (ts.isFunctionDeclaration(n)) return n.name ? n.name.text : (n.modifiers || []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ? "default" : null;
  if (ts.isClassDeclaration(n)) return n.name ? n.name.text : null;
  if ((ts.isMethodDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n) || (ts.isPropertyDeclaration(n) && fnInit(n.initializer))) && n.name && ts.isClassLike(n.parent)) return n.name.getText(sf);
  if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && fnInit(n.initializer)) return n.name.text;
  if ((ts.isMethodDeclaration(n) || (ts.isPropertyAssignment(n) && fnInit(n.initializer))) && ts.isObjectLiteralExpression(n.parent)) {
    const h = holderChain(n.parent);
    return h ? h.names.join(".") + "." + n.name.getText(sf) : null;
  }
  return null;
}
function calleeText(c) { try { return c.expression.getText(); } catch (e) { return ""; } }
function isTestCall(n) {
  return ts.isCallExpression(n) && TEST_FNS.test(calleeText(n)) && n.arguments.length >= 2 && (ts.isStringLiteralLike(n.arguments[0]) || ts.isTemplateExpression(n.arguments[0])) && fnInit(n.arguments[1]);
}
function suiteTitle(n) {
  const t = [];
  let p = n.parent;
  while (p) {
    if (ts.isCallExpression(p) && SUITE_FNS.test(calleeText(p)) && p.arguments[0] && ts.isStringLiteralLike(p.arguments[0])) t.unshift(p.arguments[0].text);
    p = p.parent;
  }
  return t;
}
function sigOf(n, sf) {
  let start = n.getStart(sf), end = n.getEnd();
  let body = n.body || (n.initializer && n.initializer.body);
  if (ts.isClassDeclaration(n)) { const ob = n.members.pos; end = ob; }
  else if (body) end = body.getStart(sf);
  if (ts.isVariableDeclaration(n) && n.parent && n.parent.parent && ts.isVariableStatement(n.parent.parent)) start = n.parent.parent.getStart(sf);
  return sf.text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 240);
}
function spanOf(n, sf) {
  let s = n.getStart(sf);
  if (ts.isVariableDeclaration(n) && n.parent && n.parent.parent && ts.isVariableStatement(n.parent.parent)) s = n.parent.parent.getStart(sf);
  return { s, e: n.getEnd() };
}
const lineOf = (sf, pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

function unwrapExpr(e) {
  while (e && (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression;
  return e;
}
function litText(e) {
  if (!e) return null;
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  if (ts.isTemplateExpression(e)) {
    let s = e.head.text;
    for (const sp of e.templateSpans) s += (s.endsWith("/") ? "{}" : "{q}") + sp.literal.text;
    return s;
  }
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = litText(e.left);
    return l ? l + (l.endsWith("/") ? "{}" : "{q}") : null;
  }
  return null;
}

function runProgram(name, prog) {
  if (!prog || !prog.files.length) { inc(name + ".skipped"); return; }
  const program = ts.createProgram(prog.files, prog.options);
  const checker = program.getTypeChecker();
  const sfs = prog.files.map((f) => program.getSourceFile(f)).filter(Boolean);
  const programFiles = new Set(sfs.map((sf) => path.resolve(sf.fileName)));
  inc(name + ".files", sfs.length);
  const declToId = new Map();     // declaration node -> def id
  const constDecl = new Map();    // VariableDeclaration -> const id
  const idCount = new Map();
  const uniq = (id) => { const k = idCount.get(id) || 0; idCount.set(id, k + 1); return k ? id + "~" + (k + 1) : id; };
  // ---- pass A: definitions ----
  for (const sf of sfs) {
    const r = rel(sf.fileName);
    const fileId = "file:" + r;
    out.nodes.push({ id: fileId, kind: "file", path: r, name: path.posix.basename(r), line_start: 1, line_end: sf.getLineAndCharacterOfPosition(sf.getEnd()).line + 1, signature: null, tokens: tok(sf.text) });
    const isX = /x$/.test(r);
    const visit = (n, parentQual, parentId) => {
      let q = parentQual, pid = parentId;
      let ln = null, kind = null;
      if (isTestCall(n)) {
        const title = [...suiteTitle(n), litText(n.arguments[0]) || "?"].join(" > ");
        ln = "test:" + title.replace(/\s+/g, " ").slice(0, 160);
        kind = "test";
      } else {
        ln = localName(n, sf);
        if (ln) {
          const last = ln.split(".").pop();
          const isFnLike = !(ts.isClassDeclaration(n) || (n.initializer && ts.isClassExpression(n.initializer)));
          if (!isFnLike) kind = "class";
          else if (ts.isClassLike(n.parent)) kind = "method";
          else if (/^[A-Z]/.test(last) && isX) kind = "component";
          else kind = "function";
        }
      }
      if (ln) {
        q = (parentQual ? parentQual + "." : "") + ln;
        const id = uniq("sym:" + r + "#" + q);
        const sp = kind === "test" ? { s: n.getStart(sf), e: n.getEnd() } : spanOf(n, sf);
        const sig = kind === "test" ? sf.text.slice(n.getStart(sf), n.arguments[0].getEnd() + 1).replace(/\s+/g, " ").slice(0, 240) : sigOf(n, sf);
        out.nodes.push({ id, kind, path: r, name: ln.split(".").pop(), line_start: lineOf(sf, sp.s), line_end: lineOf(sf, sp.e), signature: sig, tokens: tok(sf.text.slice(sp.s, sp.e)) });
        out.edges.push({ src: parentId, dst: id, kind: "defines", evidence_path: r, evidence_line: lineOf(sf, sp.s), confidence: 1, attrs: null });
        declToId.set(n, id);
        if (ts.isVariableDeclaration(n) || ts.isPropertyAssignment(n) || ts.isPropertyDeclaration(n)) if (n.initializer) { declToId.set(n.initializer, id); const w = wrapped(n.initializer); if (w) declToId.set(w, id); }
        if (kind === "test") declToId.set(n.arguments[1], id);
        pid = id;
        inc(name + ".defs." + kind);
      } else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && CONST_RE.test(n.name.text) && n.parent && n.parent.parent && ts.isVariableStatement(n.parent.parent) && n.parent.parent.parent === sf) {
        const id = "const:" + r + "#" + n.name.text;
        const sp = spanOf(n, sf);
        out.nodes.push({ id, kind: "constant", path: r, name: n.name.text, line_start: lineOf(sf, sp.s), line_end: lineOf(sf, sp.e), signature: sf.text.slice(sp.s, Math.min(sp.e, sp.s + 240)).replace(/\s+/g, " "), tokens: tok(sf.text.slice(sp.s, sp.e)) });
        out.edges.push({ src: fileId, dst: id, kind: "defines", evidence_path: r, evidence_line: lineOf(sf, sp.s), confidence: 1, attrs: null });
        constDecl.set(n, id);
      }
      ts.forEachChild(n, (c) => visit(c, q, pid));
    };
    visit(sf, "", fileId);
  }
  const enclosing = (n) => {
    let p = n.parent;
    while (p) { if (declToId.has(p)) return declToId.get(p); p = p.parent; }
    return "file:" + rel(n.getSourceFile().fileName);
  };
  const resolveSym = (node) => {
    let s = null;
    try { s = checker.getSymbolAtLocation(node); } catch (e) {}
    if (s && s.flags & ts.SymbolFlags.Alias) { try { s = checker.getAliasedSymbol(s); } catch (e) {} }
    return s;
  };
  const declId = (d) => {
    if (!d) return null;
    if (declToId.has(d)) return declToId.get(d);
    if ((ts.isArrowFunction(d) || ts.isFunctionExpression(d)) && declToId.has(d.parent)) return declToId.get(d.parent);
    return null;
  };
  const resolveModule = (spec, fromFile) => {
    try {
      const r = ts.resolveModuleName(spec, fromFile, prog.options, ts.sys);
      const f = r.resolvedModule && r.resolvedModule.resolvedFileName;
      if (f && inRepo(f) && !/\.d\.ts$/.test(f)) return rel(f);
    } catch (e) {}
    return null;
  };
  // ---- pass B: references ----
  for (const sf of sfs) {
    const r = rel(sf.fileName);
    const fileId = "file:" + r;
    const importSeen = new Map();
    const addImport = (dst, line, names, kind) => {
      if (!dst || dst === r) return;
      const k = kind + "|" + dst;
      if (!importSeen.has(k)) { importSeen.set(k, { line, names: new Set() }); }
      const v = importSeen.get(k);
      for (const nm of names || []) v.names.add(nm);
    };
    const visit = (n) => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        const dst = resolveModule(n.moduleSpecifier.text, sf.fileName);
        const names = [];
        const ic = n.importClause;
        if (ic) {
          if (ic.name) names.push("default");
          if (ic.namedBindings && ts.isNamedImports(ic.namedBindings)) for (const e of ic.namedBindings.elements) names.push((e.propertyName || e.name).text);
          if (ic.namedBindings && ts.isNamespaceImport(ic.namedBindings)) names.push("*");
        }
        if (n.exportClause && ts.isNamedExports(n.exportClause)) for (const e of n.exportClause.elements) names.push((e.propertyName || e.name).text);
        if (dst) addImport(dst, lineOf(sf, n.getStart(sf)), names, "imports"); else inc(name + ".imports_unresolved_or_external");
      }
      if (ts.isCallExpression(n)) {
        inc(name + ".call_sites");
        const callee = n.expression;
        const ct = callee.getText(sf);
        const line = lineOf(sf, n.getStart(sf));
        const a0 = n.arguments[0];
        // module references: require / import() / jest.mock / vi.mock / requireActual
        if (a0 && ts.isStringLiteralLike(a0)) {
          if (ct === "require" || callee.kind === ts.SyntaxKind.ImportKeyword) { const d = resolveModule(a0.text, sf.fileName); if (d) addImport(d, line, [], "imports"); }
          else if (/^(jest|vi)\.(mock|doMock|unstable_mockModule)$/.test(ct)) {
            const d = resolveModule(a0.text, sf.fileName);
            if (d) out.edges.push({ src: enclosing(n), dst: "file:" + d, kind: "mocks", evidence_path: r, evidence_line: line, confidence: 1, attrs: { via: ct, target: a0.text, factory: n.arguments.length > 1 } });
            else inc(name + ".mocks_external");
          } else if (/^(jest|vi)\.(requireActual|importActual)$/.test(ct)) { const d = resolveModule(a0.text, sf.fileName); if (d) addImport(d, line, [], "imports"); }
        }
        if (/^(jest|vi)\.spyOn$/.test(ct) && n.arguments.length >= 2 && ts.isStringLiteralLike(n.arguments[1])) {
          let dst = null;
          try {
            const t = checker.getTypeAtLocation(n.arguments[0]);
            const p = t && t.getProperty(n.arguments[1].text);
            const d = p && p.declarations && p.declarations[0];
            dst = declId(d);
            if (!dst && d && inRepo(d.getSourceFile().fileName)) dst = "file:" + rel(d.getSourceFile().fileName);
            // a spy on a test-local object (an in-file fake store) is not a mock of repo code
            if (d && isTestFile(rel(d.getSourceFile().fileName))) { dst = null; inc(name + ".spyOn_on_test_local"); }
          } catch (e) {}
          if (dst) out.edges.push({ src: enclosing(n), dst, kind: "mocks", evidence_path: r, evidence_line: line, confidence: 0.9, attrs: { via: ct, target: n.arguments[0].getText(sf).slice(0, 40) + "." + n.arguments[1].text } });
          else inc(name + ".spyOn_unresolved");
        }
        // call resolution
        const nameNode = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
        const sym = resolveSym(nameNode);
        const decl = sym && sym.declarations && sym.declarations[0];
        let cls = "unresolved";
        if (decl) {
          if (!inRepo(decl.getSourceFile().fileName)) cls = "external";
          else {
            const dst = declId(decl);
            if (dst) { cls = "repo_def"; out.edges.push({ src: enclosing(n), dst, kind: "calls", evidence_path: r, evidence_line: line, confidence: 1, attrs: null }); }
            else if (ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name) && decl.initializer && programFiles.has(path.resolve(decl.getSourceFile().fileName))) {
              // a callable produced by a factory (const locked = makeLock()): node created on first call
              const dsf = decl.getSourceFile();
              const dr = rel(dsf.fileName);
              let par = decl.parent; let owner = "file:" + dr;
              while (par) { if (declToId.has(par)) { owner = declToId.get(par); break; } par = par.parent; }
              const q = owner.startsWith("sym:") ? owner.split("#")[1] + "." + decl.name.text : decl.name.text;
              const id = "sym:" + dr + "#" + q;
              if (!declToId.has(decl)) {
                const sp = spanOf(decl, dsf);
                out.nodes.push({ id, kind: "function", path: dr, name: decl.name.text, line_start: lineOf(dsf, sp.s), line_end: lineOf(dsf, sp.e), signature: dsf.text.slice(sp.s, Math.min(sp.e, sp.s + 240)).replace(/\s+/g, " "), tokens: tok(dsf.text.slice(sp.s, sp.e)) });
                out.edges.push({ src: owner, dst: id, kind: "defines", evidence_path: dr, evidence_line: lineOf(dsf, sp.s), confidence: 1, attrs: { lazy: true } });
                declToId.set(decl, id);
                inc(name + ".lazy_callable_nodes");
              }
              cls = "repo_def";
              out.edges.push({ src: enclosing(n), dst: declToId.get(decl), kind: "calls", evidence_path: r, evidence_line: line, confidence: 0.9, attrs: { via: "factory_value" } });
            }
            else if (ts.isParameter(decl) || ts.isBindingElement(decl)) cls = "repo_param_or_destructured";
            else cls = "repo_other";
          }
        }
        inc(name + ".calls." + cls);
        // URL literal sites: the literal itself, both arms of a ternary, or the array a for-of loop
        // variable iterates over (for (const url of ["/api/a", "/api/b"]) ...)
        let uExprs = [a0];
        const a0u = unwrapExpr(a0);
        if (a0u && ts.isConditionalExpression(a0u)) { uExprs = [a0u.whenTrue, a0u.whenFalse]; inc(name + ".url_ternary_calls"); }
        else if (a0u && ts.isIdentifier(a0u)) {
          const s0 = resolveSym(a0u);
          const d0 = s0 && s0.declarations && s0.declarations[0];
          const fo = d0 && ts.isVariableDeclaration(d0) && d0.parent && d0.parent.parent;
          if (fo && ts.isForOfStatement(fo) && fo.initializer === d0.parent && ts.isArrayLiteralExpression(unwrapExpr(fo.expression))) { uExprs = unwrapExpr(fo.expression).elements.slice(); inc(name + ".url_loop_calls"); }
        }
        const lastName = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : "";
        const uSeen = new Set();
        let anyU = false;
        for (const ue of uExprs) {
          const u = litText(unwrapExpr(ue));
          if (u) anyU = true;
          if (u && u.startsWith("/api") && /^(startsWith|endsWith|includes|indexOf|match|replace|split|test|slice)$/.test(lastName)) inc(name + ".url_string_ops_skipped");
          else if (u && u.startsWith("/api")) {
            let method = "GET";
            const last = lastName.toLowerCase();
            if (["get", "post", "put", "patch", "delete"].includes(last)) method = last.toUpperCase();
            // assertion about a URL in a test (expect(url).toContain("/api/...")): method unknown, matched on path only
            if (/^(toContain|toBe|toEqual|toStrictEqual|toMatch|toHaveBeenCalledWith|toHaveBeenLastCalledWith|stringContaining)$/.test(lastName)) method = "*";
            const a1 = n.arguments[1];
            if (a1 && ts.isStringLiteral(a1) && /^(GET|POST|PUT|PATCH|DELETE)$/i.test(a1.text)) method = a1.text.toUpperCase();
            if (a1 && ts.isObjectLiteralExpression(a1)) for (const p of a1.properties) if (p.name && p.name.getText(sf) === "method" && p.initializer && ts.isStringLiteralLike(p.initializer)) method = p.initializer.text.toUpperCase();
            const url = u.split("?")[0].replace(/\{q\}.*$/, "");
            const uline = ue === a0 ? line : lineOf(sf, ue.getStart(sf));
            if (uSeen.has(method + " " + url)) continue;
            uSeen.add(method + " " + url);
            out.urls.push({ site: enclosing(n), path: r, line: uline, method, url, raw: ue.getText(sf).slice(0, 120), callee: ct.slice(0, 40), runtime: name });
          }
        }
        if (!anyU && a0 && /^(request|apiGet|apiSend|fetch|apiFetch|opsGet|backendOps)$/.test(nameNode.getText(sf))) inc(name + ".api_calls_nonliteral_url");
        if (/(^|\.)(navigate|push|replace)$/.test(ct) && a0 && ts.isStringLiteralLike(a0) && (/(^|\.)navigate$/.test(ct) || /(navigation|navigator|router|history|nav)\.(push|replace)$/i.test(ct))) {
          out.navigate.push({ site: enclosing(n), screen: a0.text, path: r, line, runtime: name });
        }
        if (/(^|\.)(sendOrQueue|enqueue|makeItem|enqueuePunch|queuePunch)$/.test(ct)) {
          ts.forEachChild(n, function f(c) {
            if (ts.isPropertyAssignment(c) && c.name.getText(sf) === "kind" && ts.isStringLiteralLike(c.initializer))
              out.sendKinds.push({ site: enclosing(n), kind: c.initializer.text, via: ct, path: r, line: lineOf(sf, c.getStart(sf)) });
            ts.forEachChild(c, f);
          });
        }
      }
      if (ts.isCaseClause(n) && ts.isStringLiteralLike(n.expression)) {
        const sw = n.parent.parent;
        const disc = sw.expression.getText(sf);
        if (/kind/i.test(disc)) {
          const targets = [];
          ts.forEachChild(n, function f(c) {
            if (ts.isCallExpression(c)) {
              const nn = ts.isPropertyAccessExpression(c.expression) ? c.expression.name : c.expression;
              const s = resolveSym(nn);
              const d = s && s.declarations && s.declarations[0];
              const id = declId(d);
              if (id) targets.push(id);
            }
            ts.forEachChild(c, f);
          });
          out.kinds.push({ path: r, line: lineOf(sf, n.getStart(sf)), switchOn: disc.slice(0, 60), kind: n.expression.text, targets: [...new Set(targets)], fn: enclosing(n), runtime: name });
        }
      }
      if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) {
        inc(name + ".jsx_elements");
        const s2 = resolveSym(n.tagName);
        const d2 = s2 && s2.declarations && s2.declarations[0];
        const dst = declId(d2);
        const line = lineOf(sf, n.getStart(sf));
        if (dst) { inc(name + ".renders_repo"); out.edges.push({ src: enclosing(n), dst, kind: "renders", evidence_path: r, evidence_line: line, confidence: 1, attrs: null }); }
        const tag = n.tagName.getText(sf);
        if (/Screen$|^Route$/.test(tag)) {
          const attrs = {};
          for (const a of n.attributes.properties) if (ts.isJsxAttribute(a) && a.initializer) attrs[a.name.getText(sf)] = a.initializer;
          let screen = null, comp = null;
          if (/Screen$/.test(tag) && attrs.name && ts.isStringLiteral(attrs.name)) screen = attrs.name.text;
          if (tag === "Route" && attrs.path && ts.isStringLiteral(attrs.path)) screen = attrs.path.text;
          const ce = attrs.component || attrs.element;
          if (ce && ts.isJsxExpression(ce) && ce.expression) {
            let e = ce.expression;
            if (ts.isJsxSelfClosingElement(e) || ts.isJsxElement(e)) e = ts.isJsxElement(e) ? e.openingElement.tagName : e.tagName;
            const s3 = resolveSym(e);
            comp = declId(s3 && s3.declarations && s3.declarations[0]);
          }
          if (screen) out.screens.push({ screen, component: comp, path: r, line, tag, runtime: name, site: enclosing(n) });
        }
      }
      if (ts.isClassDeclaration(n) && n.heritageClauses) {
        const src = declToId.get(n);
        for (const hc of n.heritageClauses) for (const t of hc.types) {
          const s = resolveSym(t.expression);
          const d = s && s.declarations && s.declarations[0];
          const dst = declId(d);
          if (src && dst) out.edges.push({ src, dst, kind: "inherits", evidence_path: r, evidence_line: lineOf(sf, t.getStart(sf)), confidence: 1, attrs: { clause: hc.token === ts.SyntaxKind.ExtendsKeyword ? "extends" : "implements" } });
          else inc(name + ".inherits_external");
        }
      }
      if (ts.isPropertyAccessExpression(n)) {
        const t = n.getText(sf);
        const m = t.match(/^(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]*)$/);
        if (m) out.envReads.push({ src: enclosing(n), key: m[1], path: r, line: lineOf(sf, n.getStart(sf)) });
        else {
          const nm = n.name.text;
          const isWrite = n.parent && ts.isBinaryExpression(n.parent) && n.parent.left === n && n.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
          if (SNAKE.test(nm) && !isWrite) out.propReads.push({ src: enclosing(n), key: nm, path: r, line: lineOf(sf, n.getStart(sf)), form: "prop" });
          // config object reads: resolved declaration is a non-function property in a config file
          if (!ts.isCallExpression(n.parent) || n.parent.expression !== n) {
            const s = resolveSym(n.name);
            const d = s && s.declarations && s.declarations[0];
            const leaf = d && ((ts.isPropertyAssignment(d) && !fnInit(d.initializer) && !ts.isObjectLiteralExpression(unwrapExpr(d.initializer))) || ts.isShorthandPropertyAssignment(d));
            if (leaf && inRepo(d.getSourceFile().fileName) && /(^|\/)config\.(ts|js)$/.test(rel(d.getSourceFile().fileName))) {
              const h = holderChain(d.parent, true);
              if (h) {
                const dsf = d.getSourceFile();
                out.envReads.push({ src: enclosing(n), key: null, cfg: { path: rel(dsf.fileName), name: h.names.join(".") + "." + d.name.getText(dsf), line: lineOf(dsf, d.getStart(dsf)), sig: d.getText(dsf).replace(/\s+/g, " ").slice(0, 240) }, path: r, line: lineOf(sf, n.getStart(sf)) });
              }
            }
          }
        }
      }
      if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent)) {
        const k = n.propertyName ? n.propertyName.getText(sf) : n.name.getText(sf);
        if (SNAKE.test(k)) out.propReads.push({ src: enclosing(n), key: k, path: r, line: lineOf(sf, n.getStart(sf)), form: "destructure" });
      }
      if (ts.isElementAccessExpression(n) && n.argumentExpression && ts.isStringLiteralLike(n.argumentExpression) && SNAKE.test(n.argumentExpression.text)) {
        out.propReads.push({ src: enclosing(n), key: n.argumentExpression.text, path: r, line: lineOf(sf, n.getStart(sf)), form: "index" });
      }
      if (ts.isIdentifier(n) && CONST_RE.test(n.text) && !(n.parent && ts.isVariableDeclaration(n.parent) && n.parent.name === n) && !(n.parent && (ts.isImportSpecifier(n.parent) || ts.isExportSpecifier(n.parent) || ts.isImportClause(n.parent)))) {
        const s = resolveSym(n);
        const d = s && s.declarations && s.declarations[0];
        if (d && constDecl.has(d)) out.edges.push({ src: enclosing(n), dst: constDecl.get(d), kind: "uses_constant", evidence_path: r, evidence_line: lineOf(sf, n.getStart(sf)), confidence: 1, attrs: null });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    for (const [k, v] of [...importSeen.entries()].sort()) {
      const [kind, dst] = k.split("|");
      out.edges.push({ src: fileId, dst: "file:" + dst, kind, evidence_path: r, evidence_line: v.line, confidence: 1, attrs: v.names.size ? { names: [...v.names].sort() } : null });
    }
  }
}
const tA = Date.now();
try { runProgram("mobile", mobileProgram()); } catch (e) { out.stats["mobile.error"] = String(e && e.message || e).slice(0, 200); }
const tB = Date.now();
try { runProgram("web", webProgram()); } catch (e) { out.stats["web.error"] = String(e && e.message || e).slice(0, 200); }
const tC = Date.now();
// env reads in root-level build configs that neither program compiles (vite.config.js: process.env.VITE_BASE)
try {
  const PROG = new Set(["ops-server.mjs", "vitest.setup.js"]);
  for (const dir of ["", "technician-app"]) {
    const base = path.join(ROOT, dir);
    if (!fs.existsSync(base)) continue;
    const names = fs.readdirSync(base, { withFileTypes: true }).filter((e) => e.isFile() && /\.(js|mjs|cjs)$/.test(e.name)).map((e) => e.name).sort();
    for (const nm of names) {
      const r = dir ? dir + "/" + nm : nm;
      if (PROG.has(r)) continue;
      const lines = fs.readFileSync(path.join(base, nm), "utf8").split("\n");
      lines.forEach((ln, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(ln)) return;
        for (const m of ln.matchAll(/(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]*)/g)) { out.envReads.push({ src: "file:" + r, key: m[1], path: r, line: i + 1 }); inc("config_files.env_reads"); }
      });
    }
  }
} catch (e) { out.stats["config_files.error"] = String(e && e.message || e).slice(0, 200); }
fs.writeFileSync(OUT, JSON.stringify(out));
const ec = {}; for (const e of out.edges) ec[e.kind] = (ec[e.kind] || 0) + 1;
const nc = {}; for (const n of out.nodes) nc[n.kind] = (nc[n.kind] || 0) + 1;
console.log(JSON.stringify({ ms_mobile: tB - tA, ms_web: tC - tB, nodes: nc, edges: ec, urls: out.urls.length, kinds: out.kinds.length, sendKinds: out.sendKinds.length, navigate: out.navigate.length, screens: out.screens.length, propReads: out.propReads.length, envReads: out.envReads.length, stats: out.stats }));
// timing goes to stdout only; the JSON written above carries no timing, so it is deterministic.
void t0;
