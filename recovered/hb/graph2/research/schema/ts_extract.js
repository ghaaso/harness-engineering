// Read-only extraction of a typed graph from the mobile (TS) and web (JS/JSX) runtimes
// with the TypeScript compiler API found in technician-app/node_modules/typescript.
// Usage: node ts_extract.js <repo_root> <out_json>
const path = require("path");
const fs = require("fs");
const ROOT = process.argv[2];
const OUT = process.argv[3];
const ts = require(path.join(ROOT, "technician-app/node_modules/typescript"));
const t0 = Date.now();

function makeProgram(configPath, extra) {
  const cfg = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, path.dirname(configPath), extra || {});
  const files = parsed.fileNames.filter((f) => !/node_modules|\/dist\//.test(f));
  return { program: ts.createProgram(files, parsed.options), files };
}

const out = { defs: [], calls: [], urls: [], kinds: [], sendKinds: [], navigate: [], routesUI: [], imports: [], stats: {} };
const inc = (k, n = 1) => (out.stats[k] = (out.stats[k] || 0) + n);
const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");
const inRepo = (f) => !/node_modules|lib\.[^/]*\.d\.ts$/.test(f) && rel(f).indexOf("..") !== 0;

function declName(n) {
  // returns qualified name for a declaration node that is a "def", else null
  const sf = n.getSourceFile();
  if (ts.isFunctionDeclaration(n) && n.name) return n.name.text;
  if (ts.isClassDeclaration(n) && n.name) return n.name.text;
  if ((ts.isMethodDeclaration(n) || ts.isPropertyDeclaration(n)) && n.name && ts.isClassLike(n.parent))
    return (n.parent.name ? n.parent.name.text : "?") + "." + n.name.getText(sf);
  if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer &&
      (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer) || ts.isObjectLiteralExpression(n.initializer) || ts.isCallExpression(n.initializer)))
    return n.name.text;
  if ((ts.isPropertyAssignment(n) || ts.isMethodDeclaration(n) || ts.isShorthandPropertyAssignment(n)) && ts.isObjectLiteralExpression(n.parent)) {
    const holder = n.parent.parent;
    const hn = holder && ts.isVariableDeclaration(holder) && ts.isIdentifier(holder.name) ? holder.name.text : "{}";
    return hn + "." + n.name.getText(sf);
  }
  return null;
}
function enclosingDef(n) {
  let p = n.parent;
  while (p) {
    if (ts.isFunctionLike(p) || ts.isClassLike(p)) {
      let q = p;
      if ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && p.parent) q = p.parent;
      const nm = declName(q);
      if (nm) return rel(q.getSourceFile().fileName) + "#" + nm;
    }
    p = p.parent;
  }
  return rel(n.getSourceFile().fileName) + "#<module>";
}
function litText(e) {
  if (!e) return null;
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  if (ts.isTemplateExpression(e)) {
    let s = e.head.text;
    for (const sp of e.templateSpans) {
      const prevSlash = s.endsWith("/");
      s += (prevSlash ? "{}" : "{q}") + sp.literal.text;
    }
    return s;
  }
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = litText(e.left);
    return l ? l + "{}" : null;
  }
  return null;
}

function walkProgram(name, { program, files }) {
  const checker = program.getTypeChecker();
  const fileSet = new Set(files.map((f) => path.resolve(f)));
  for (const sf of program.getSourceFiles()) {
    if (!fileSet.has(path.resolve(sf.fileName))) continue;
    const r = rel(sf.fileName);
    const isTest = /\.test\.|__tests__|\/tests?\//.test(r);
    inc(name + ".files");
    const visit = (n) => {
      const nm = (ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n) || ts.isMethodDeclaration(n) || ts.isVariableDeclaration(n) || ts.isPropertyAssignment(n)) ? declName(n) : null;
      if (nm && (ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n) || ts.isMethodDeclaration(n) ||
          (n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))))) {
        const kind = ts.isClassDeclaration(n) ? "class" : ts.isMethodDeclaration(n) ? "method" : /^[A-Z]/.test(nm.split(".").pop()) && /x$/.test(r) ? "component" : "function";
        const s = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
        const e = sf.getLineAndCharacterOfPosition(n.getEnd()).line + 1;
        out.defs.push({ id: r + "#" + nm, runtime: name, kind, line: s, end: e, tokens: Math.round((n.getEnd() - n.getStart(sf)) / 4), test: isTest });
        inc(name + ".defs." + kind);
      }
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) inc(name + ".import_decls");
      if (ts.isCallExpression(n)) {
        inc(name + ".call_sites");
        const callee = n.expression;
        const nameNode = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
        let sym = null;
        try { sym = checker.getSymbolAtLocation(nameNode); } catch (e) {}
        if (sym && sym.flags & ts.SymbolFlags.Alias) { try { sym = checker.getAliasedSymbol(sym); } catch (e) {} }
        const decl = sym && sym.declarations && sym.declarations[0];
        let cls = "unresolved";
        if (decl) {
          const df = decl.getSourceFile().fileName;
          if (!inRepo(df)) cls = "external";
          else {
            let dn = declName(decl);
            if (!dn && (ts.isArrowFunction(decl) || ts.isFunctionExpression(decl))) dn = declName(decl.parent);
            if (dn) { cls = "repo_def"; out.calls.push({ src: enclosingDef(n), dst: rel(df) + "#" + dn, runtime: name, test: isTest, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1 }); }
            else if (ts.isParameter(decl) || ts.isBindingElement(decl)) cls = "repo_param_or_destructured";
            else cls = "repo_other";
          }
        } else if (ts.isPropertyAccessExpression(callee) || ts.isIdentifier(callee)) cls = "unresolved";
        inc(name + ".calls." + cls); if (cls==="unresolved"||cls==="repo_param_or_destructured"){out.unres=out.unres||{};const k=name+":"+cls[0]+":"+(ts.isPropertyAccessExpression(callee)?"."+callee.name.text:callee.getText(sf).slice(0,30))+(isTest?":T":"");out.unres[k]=(out.unres[k]||0)+1;}
        // URL literal call sites
        const u = litText(n.arguments[0]);
        if (u && u.startsWith("/api")) {
          let method = "GET";
          const a1 = n.arguments[1];
          if (a1 && ts.isStringLiteral(a1)) method = a1.text.toUpperCase();
          if (a1 && ts.isObjectLiteralExpression(a1)) {
            for (const p of a1.properties) if (p.name && p.name.getText(sf) === "method" && p.initializer && ts.isStringLiteral(p.initializer)) method = p.initializer.text.toUpperCase();
          }
          out.urls.push({ site: enclosingDef(n), file: r, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, method, url: u.split("?")[0].replace(/\{q\}.*$/, ""), callee: callee.getText(sf).slice(0, 40), runtime: name, test: isTest });
        } else if (n.arguments[0] && /^(request|apiGet|apiSend|fetch|apiFetch|opsGet)$/.test(nameNode.getText(sf)) && !u) inc(name + ".api_calls_nonliteral_url");
        const cn = callee.getText(sf);
        if (/navigate$/.test(cn) && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) out.navigate.push({ site: enclosingDef(n), screen: n.arguments[0].text, runtime: name });
        if (cn === "sendOrQueue" || cn === "enqueue" || cn === "makeItem") {
          ts.forEachChild(n, function f(c) {
            if (ts.isPropertyAssignment(c) && c.name.getText(sf) === "kind" && ts.isStringLiteral(c.initializer))
              out.sendKinds.push({ site: enclosingDef(n), kind: c.initializer.text, via: cn, test: isTest });
            ts.forEachChild(c, f);
          });
        }
      }
      if (ts.isCaseClause(n) && ts.isStringLiteral(n.expression)) {
        const sw = n.parent.parent;
        const disc = sw.expression.getText(sf);
        if (/kind/.test(disc)) {
          const targets = [];
          ts.forEachChild(n, function f(c) {
            if (ts.isCallExpression(c) && ts.isPropertyAccessExpression(c.expression)) targets.push(c.expression.getText(sf));
            ts.forEachChild(c, f);
          });
          out.kinds.push({ file: r, switchOn: disc, kind: n.expression.text, calls: targets, fn: enclosingDef(n) });
        }
      }
      if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) {
        inc(name + ".jsx_elements");
        let s2 = null; try { s2 = checker.getSymbolAtLocation(n.tagName); } catch (e) {}
        if (s2 && s2.flags & ts.SymbolFlags.Alias) { try { s2 = checker.getAliasedSymbol(s2); } catch (e) {} }
        const d2 = s2 && s2.declarations && s2.declarations[0];
        if (d2 && inRepo(d2.getSourceFile().fileName) && declName(d2)) { inc(name + ".renders_repo"); out.renders = out.renders || []; out.renders.push({ src: enclosingDef(n), dst: rel(d2.getSourceFile().fileName) + "#" + declName(d2), test: isTest }); }
      }
      if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && /Route$|Screen$/.test(n.tagName.getText(sf))) {
        const attrs = {};
        for (const a of n.attributes.properties) if (ts.isJsxAttribute(a) && a.initializer) attrs[a.name.getText(sf)] = a.initializer.getText(sf).slice(0, 60);
        out.routesUI.push({ file: r, tag: n.tagName.getText(sf), attrs, runtime: name });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
}
const tA = Date.now();
const mobile = makeProgram(path.join(ROOT, "technician-app/tsconfig.json"));
walkProgram("mobile", mobile);
const tB = Date.now();
const web = makeProgram(path.join(ROOT, "jsconfig.json"), { allowJs: true, checkJs: false, noEmit: true });
walkProgram("web", web);
const tC = Date.now();
out.stats.ms_mobile = tB - tA;
out.stats.ms_web = tC - tB;
out.stats.ms_total = Date.now() - t0;
fs.writeFileSync(OUT, JSON.stringify(out));
const by = (a, k) => a.reduce((m, x) => ((m[x[k]] = (m[x[k]] || 0) + 1), m), {});
console.log(JSON.stringify({ stats: out.stats, urls: out.urls.length, urls_nontest: out.urls.filter((u) => !u.test).length, urlsByRuntime: by(out.urls, "runtime"), kinds: out.kinds.map((k) => k.kind + "->" + k.calls.join(",")), sendKinds: by(out.sendKinds, "kind"), navigate: out.navigate.length, navScreens: Object.keys(by(out.navigate, "screen")).length, routesUI: out.routesUI.length, calls: out.calls.length, unres: Object.entries(out.unres).sort((a,b)=>b[1]-a[1]).slice(0,45), unresAll: out.unres }, null, 1));
