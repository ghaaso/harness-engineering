// How many property reads in the mobile app resolve (by the TypeScript checker) to a property declared in
// an interface/type alias whose name equals a backend response/request model name?
// This is the upper bound of the exact (checker-resolved) field-contract edges for the mobile runtime.
const path = require("path"), fs = require("fs");
const ts = require("C:/Users/User/Documents/projects/EMS_workshop1/technician-app/node_modules/typescript");
const ROOT = path.resolve(process.argv[2]);
const MODELS = new Set(JSON.parse(fs.readFileSync(process.argv[3], "utf8")));
const dir = path.join(ROOT, "technician-app");
const EXPO_BASE = { allowJs: true, esModuleInterop: true, jsx: "react-native", lib: ["DOM", "ESNext"], moduleResolution: "node", noEmit: true, resolveJsonModule: true, skipLibCheck: true, target: "ESNext" };
const cfg = ts.readConfigFile(path.join(dir, "tsconfig.json"), (f) => fs.readFileSync(f, "utf8")).config || {};
const options = ts.convertCompilerOptionsFromJson(Object.assign({}, EXPO_BASE, cfg.compilerOptions || {}), dir).options;
options.types = []; options.noEmit = true; options.skipLibCheck = true;
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) walk(path.join(d, e.name)); else if (/\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) files.push(path.join(d, e.name).split(path.sep).join("/")); } })(path.join(dir, "src"));
const prog = ts.createProgram(files, options);
const checker = prog.getTypeChecker();
const isTest = (f) => /(\.test\.|__tests__|jest\.setup)/.test(f);
let all = 0, repoDecl = 0, aligned = 0, alignedDistinctFields = new Set(), perModel = {};
for (const sf of prog.getSourceFiles()) {
  if (sf.isDeclarationFile || /node_modules/.test(sf.fileName) || isTest(sf.fileName)) continue;
  (function visit(n) {
    if (ts.isPropertyAccessExpression(n)) {
      all++;
      let s = null;
      try { s = checker.getSymbolAtLocation(n.name); } catch (e) {}
      const d = s && s.declarations && s.declarations[0];
      if (d && !/node_modules|lib\./.test(d.getSourceFile().fileName)) {
        repoDecl++;
        if (ts.isPropertySignature(d) && d.parent && (ts.isInterfaceDeclaration(d.parent) || (ts.isTypeLiteralNode(d.parent) && ts.isTypeAliasDeclaration(d.parent.parent)))) {
          const owner = ts.isInterfaceDeclaration(d.parent) ? d.parent.name.text : d.parent.parent.name.text;
          if (MODELS.has(owner)) { aligned++; alignedDistinctFields.add(owner + "." + n.name.text); perModel[owner] = (perModel[owner] || 0) + 1; }
        }
      }
    }
    ts.forEachChild(n, visit);
  })(sf);
}
console.log(JSON.stringify({ propertyAccesses: all, resolvedToRepoDecl: repoDecl, readsOfBackendNamedInterfaceProps: aligned, distinctFields: alignedDistinctFields.size, topModels: Object.entries(perModel).sort((a, b) => b[1] - a[1]).slice(0, 8) }));
