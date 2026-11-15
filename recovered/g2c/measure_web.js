// Web manager app (plain JS/JSX): how many non-test call sites the checker leaves unresolved, and how many of
// those carry a callee name that matches exactly one / several repo-defined functions or methods.
const path = require("path"), fs = require("fs");
const ts = require("C:/Users/User/Documents/projects/EMS_workshop1/technician-app/node_modules/typescript");
const ROOT = path.resolve(process.argv[2]);
const al = { "@app/*": ["src/app/*"], "@ops/*": ["src/ops/*"], "@shared/*": ["src/shared/*"], "@features/*": ["src/features/*"] };
const options = ts.convertCompilerOptionsFromJson({ allowJs: true, checkJs: false, jsx: "react-jsx", module: "ESNext", moduleResolution: "Bundler", target: "ESNext", baseUrl: ".", paths: al }, ROOT).options;
options.types = []; options.noEmit = true; options.skipLibCheck = true;
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) walk(path.join(d, e.name)); else if (/\.(js|jsx|mjs)$/.test(e.name)) files.push(path.join(d, e.name).split(path.sep).join("/")); } })(path.join(ROOT, "src"));
const prog = ts.createProgram(files, options);
const checker = prog.getTypeChecker();
const inRepo = (f) => { const r = path.relative(ROOT, f); return !r.startsWith("..") && !/node_modules|(^|[\\/])lib\.[^\\/]*\.d\.ts$/.test(r); };
const isTest = (f) => /(\.test\.|[\\/]__tests__[\\/]|vitest\.setup)/.test(f);
const defNames = new Map();
for (const sf of prog.getSourceFiles()) {
  if (!inRepo(sf.fileName) || sf.isDeclarationFile || isTest(sf.fileName)) continue;
  (function v(n) {
    let nm = null;
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isClassDeclaration(n)) && n.name) nm = n.name.getText();
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) nm = n.name.text;
    else if (ts.isPropertyAssignment(n) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) nm = n.name.getText();
    if (nm) defNames.set(nm, (defNames.get(nm) || 0) + 1);
    ts.forEachChild(n, v);
  })(sf);
}
const C = { all: 0, repo_def: 0, external: 0, unresolved: 0, param: 0, other: 0 };
let unresolvedOneMatch = 0, unresolvedManyMatch = 0, unresolvedNoMatch = 0;
const sample = {};
for (const sf of prog.getSourceFiles()) {
  if (!inRepo(sf.fileName) || sf.isDeclarationFile || isTest(sf.fileName)) continue;
  (function visit(n) {
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const nameNode = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
      let s = null; try { s = checker.getSymbolAtLocation(nameNode); } catch (e) {}
      if (s && s.flags & ts.SymbolFlags.Alias) { try { s = checker.getAliasedSymbol(s); } catch (e) {} }
      const d = s && s.declarations && s.declarations[0];
      let cls = "unresolved";
      if (d) { if (!inRepo(d.getSourceFile().fileName)) cls = "external"; else if (ts.isParameter(d) || ts.isBindingElement(d)) cls = "param"; else cls = "repo_def"; }
      C.all++; C[cls]++;
      if (cls === "unresolved" && ts.isPropertyAccessExpression(callee)) {
        const k = defNames.get(callee.name.text) || 0;
        if (k === 0) unresolvedNoMatch++; else if (k === 1) { unresolvedOneMatch++; sample[callee.name.text] = (sample[callee.name.text] || 0) + 1; } else unresolvedManyMatch++;
      } else if (cls === "unresolved") unresolvedNoMatch++;
    }
    ts.forEachChild(n, visit);
  })(sf);
}
console.log(JSON.stringify({ files: files.length, nonTestCalls: C, unresolved_memberOrBare_nameMatch: { none: unresolvedNoMatch, oneRepoDef: unresolvedOneMatch, severalRepoDefs: unresolvedManyMatch }, oneMatchNames: Object.entries(sample).sort((a, b) => b[1] - a[1]).slice(0, 12) }));
