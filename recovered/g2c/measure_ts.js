// Measures how the call-resolution classes of the v1 mobile TypeScript pass change when the
// library type declarations are present (node_modules) versus absent (hermetic export).
// Usage: node measure_ts.js <root containing technician-app/> <label>
const path = require("path"), fs = require("fs");
const ts = require("C:/Users/User/Documents/projects/EMS_workshop1/technician-app/node_modules/typescript");
const ROOT = path.resolve(process.argv[2]);
const label = process.argv[3];
const dir = path.join(ROOT, "technician-app");
const EXPO_BASE = { allowJs: true, esModuleInterop: true, jsx: "react-native", lib: ["DOM", "ESNext"], moduleResolution: "node", noEmit: true, resolveJsonModule: true, skipLibCheck: true, target: "ESNext" };
const cfg = ts.readConfigFile(path.join(dir, "tsconfig.json"), (f) => fs.readFileSync(f, "utf8")).config || {};
const co = Object.assign({}, EXPO_BASE, cfg.compilerOptions || {});
const options = ts.convertCompilerOptionsFromJson(co, dir).options;
options.types = []; options.noEmit = true; options.skipLibCheck = true; options.noResolve = false;
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(path.join(d, e.name)); }
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) files.push(path.join(d, e.name).split(path.sep).join("/"));
  }
})(path.join(dir, "src"));
const prog = ts.createProgram(files, options);
const checker = prog.getTypeChecker();
const inRepo = (f) => { const r = path.relative(ROOT, f); return !r.startsWith("..") && !/node_modules|(^|[\\/])lib\.[^\\/]*\.d\.ts$/.test(r); };
const isTest = (f) => /(\.test\.|__tests__|jest\.setup)/.test(f);
const C = { all: 0, repo_def: 0, external: 0, unresolved: 0, param: 0, other: 0 };
const T = { all: 0, repo_def: 0, external: 0, unresolved: 0, param: 0, other: 0 };
const jsx = { all: 0, repo: 0, external: 0, unresolved: 0 };
function resolve(node) {
  let s = null;
  try { s = checker.getSymbolAtLocation(node); } catch (e) {}
  if (s && s.flags & ts.SymbolFlags.Alias) { try { s = checker.getAliasedSymbol(s); } catch (e) {} }
  return s;
}
for (const sf of prog.getSourceFiles()) {
  if (!inRepo(sf.fileName) || sf.isDeclarationFile) continue;
  const tgt = isTest(sf.fileName) ? T : C;
  (function visit(n) {
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const nameNode = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
      const sym = resolve(nameNode);
      const decl = sym && sym.declarations && sym.declarations[0];
      let cls = "unresolved";
      if (decl) {
        if (!inRepo(decl.getSourceFile().fileName)) cls = "external";
        else if (ts.isParameter(decl) || ts.isBindingElement(decl)) cls = "param";
        else if (ts.isFunctionDeclaration(decl) || ts.isMethodDeclaration(decl) || ts.isArrowFunction(decl) || ts.isFunctionExpression(decl) || ts.isVariableDeclaration(decl) || ts.isClassDeclaration(decl)) cls = "repo_def";
        else cls = "other";
      }
      tgt.all++; tgt[cls]++;
    }
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tn = n.tagName;
      if (ts.isIdentifier(tn) && /^[A-Z]/.test(tn.text)) {
        const sym = resolve(tn);
        const decl = sym && sym.declarations && sym.declarations[0];
        jsx.all++;
        if (!decl) jsx.unresolved++;
        else if (inRepo(decl.getSourceFile().fileName)) jsx.repo++;
        else jsx.external++;
      }
    }
    ts.forEachChild(n, visit);
  })(sf);
}
console.log(JSON.stringify({ label, files: files.length, nonTestCalls: C, testCalls: T, jsx }));
