// Canonical definitions of TS/JS files, through the TypeScript compiler API (parser only, no program).
//   node defs_ts.js <in.jsonl> <out.jsonl>
// in:  one JSON object per line {key, path, text}
// out: one JSON object per line {key, ok, defs:[{name, kind, start, end}], attrs:[{name, owner}]}
// Canonical definition units (the reference granularity):
//   top-level function declarations; top-level classes and their members (methods, constructors,
//   accessors, function-valued properties) as Class.member; top-level variable declarations
//   (function-valued -> function/component, object literals -> object, anything else -> variable);
//   function-valued members of a top-level object literal as obj.member; test blocks
//   (describe/it/test calls with a string title) as test blocks, nested titles joined by " > ".
// A line belongs to the innermost canonical unit containing it. Nested closures inside a function
// belong to that function. Deterministic: same input -> same output.
"use strict";
const fs = require("fs");
const ts = require("C:/Users/User/Documents/projects/EMS_workshop1/technician-app/node_modules/typescript");

const [, , IN, OUT] = process.argv;
const lines = fs.readFileSync(IN, "utf8").split("\n").filter((l) => l.trim());
const out = [];

function kindFor(path) {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".ts")) return ts.ScriptKind.TS;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS; // .js .mjs .cjs (JSX in .js is tolerated by the JS kind parser)
}
const isFn = (e) => e && (ts.isArrowFunction(e) || ts.isFunctionExpression(e));
function wrapsFn(e) {
  // memo(() => ...), forwardRef(function X() {...}), React.memo(...)
  return e && ts.isCallExpression(e) && e.arguments.some((a) => isFn(a) || wrapsFn(a));
}
const TEST_CALLS = new Set(["describe", "it", "test", "describe.each", "it.each", "test.each",
  "describe.skip", "it.skip", "test.skip", "describe.only", "it.only", "test.only"]);
function testTitle(node, sf) {
  if (!ts.isCallExpression(node)) return null;
  let callee = node.expression;
  if (ts.isCallExpression(callee)) callee = callee.expression; // describe.each(table)(title, fn)
  const cname = callee.getText(sf);
  if (!TEST_CALLS.has(cname)) return null;
  const a0 = node.arguments[0];
  if (!a0) return null;
  if (ts.isStringLiteral(a0) || ts.isNoSubstitutionTemplateLiteral(a0)) return a0.text;
  if (ts.isTemplateExpression(a0)) return a0.getText(sf).slice(1, -1);
  return null;
}

for (const line of lines) {
  const job = JSON.parse(line);
  const rec = { key: job.key, ok: true, defs: [], attrs: [] };
  try {
    const sf = ts.createSourceFile(job.path, job.text, ts.ScriptTarget.Latest, true, kindFor(job.path));
    if (sf.parseDiagnostics && sf.parseDiagnostics.length) rec.parse_errors = sf.parseDiagnostics.length;
    const L = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
    const add = (name, kind, node, rangeNode) => {
      const r = rangeNode || node;
      rec.defs.push({ name, kind, start: L(r.getStart(sf)), end: L(r.getEnd()) });
    };
    const isComponentName = (n) => /^[A-Z]/.test(n) && /x$/.test(job.path);
    const fnKind = (n) => (isComponentName(n) ? "component" : "function");

    function classMembers(cls, cname) {
      for (const m of cls.members) {
        let mn = m.name ? m.name.getText(sf) : null;
        if (ts.isConstructorDeclaration(m)) mn = "constructor";
        if (!mn) continue;
        if (ts.isMethodDeclaration(m) || ts.isConstructorDeclaration(m) || ts.isGetAccessor(m) || ts.isSetAccessor(m)) {
          add(cname + "." + mn, "method", m);
        } else if (ts.isPropertyDeclaration(m)) {
          if (isFn(m.initializer)) add(cname + "." + mn, "method", m);
          else rec.attrs.push({ name: mn, owner: cname });
        }
      }
    }
    function objectMembers(obj, oname) {
      for (const p of obj.properties) {
        if (!p.name) continue;
        const pn = p.name.getText(sf);
        if (ts.isMethodDeclaration(p) || (ts.isPropertyAssignment(p) && (isFn(p.initializer) || wrapsFn(p.initializer)))) {
          add(oname + "." + pn, "method", p);
        } else {
          rec.attrs.push({ name: pn, owner: oname });
          if (ts.isPropertyAssignment(p) && p.initializer && ts.isObjectLiteralExpression(p.initializer)) {
            for (const q of p.initializer.properties) if (q.name) rec.attrs.push({ name: q.name.getText(sf), owner: oname });
          }
        }
      }
    }
    function testBlocks(node, prefix) {
      // walk any depth for describe/it/test calls; record each titled block
      const visit = (n, pre) => {
        const t = testTitle(n, sf);
        if (t !== null) {
          const name = pre ? pre + " > " + t : t;
          add(name, "test", n);
          n.arguments.forEach((a) => visit(a, name));
          return;
        }
        ts.forEachChild(n, (c) => visit(c, pre));
      };
      visit(node, prefix);
    }

    for (const st of sf.statements) {
      if (ts.isFunctionDeclaration(st)) {
        const n = st.name ? st.name.text : "default";
        add(n, fnKind(n), st);
      } else if (ts.isClassDeclaration(st)) {
        const n = st.name ? st.name.text : "default";
        add(n, "class", st);
        classMembers(st, n);
      } else if (ts.isVariableStatement(st)) {
        const decls = st.declarationList.declarations;
        for (const d of decls) {
          if (!ts.isIdentifier(d.name)) continue; // destructuring stays module-level
          const n = d.name.text;
          const rng = decls.length === 1 ? st : d;
          const init = d.initializer;
          if (isFn(init) || wrapsFn(init)) add(n, fnKind(n), d, rng);
          else if (init && ts.isObjectLiteralExpression(init)) { add(n, "object", d, rng); objectMembers(init, n); }
          else if (init && ts.isClassExpression(init)) { add(n, "class", d, rng); classMembers(init, n); }
          else add(n, "variable", d, rng);
          if (init && !isFn(init)) testBlocks(init, "");
        }
      } else if (ts.isExpressionStatement(st)) {
        testBlocks(st, "");
      }
    }
    // inner names: bindings declared inside a canonical definition (closures, handlers, state
    // setters). Used only to resolve a name a document cites to its enclosing definition.
    rec.inner = [];
    const innerVisit = (n, owner) => {
      if (ts.isFunctionDeclaration(n) && n.name) rec.inner.push({ name: n.name.text, owner });
      if (ts.isVariableDeclaration(n)) {
        const names = [];
        const collect = (b) => {
          if (ts.isIdentifier(b)) names.push(b.text);
          else if (ts.isObjectBindingPattern(b) || ts.isArrayBindingPattern(b))
            b.elements.forEach((e) => { if (ts.isBindingElement(e)) collect(e.name); });
        };
        collect(n.name);
        names.forEach((nm) => rec.inner.push({ name: nm, owner }));
      }
      ts.forEachChild(n, (c) => innerVisit(c, owner));
    };
    const canon = rec.defs.map((d) => d.name);
    const byRange = (pos) => {
      let best = null;
      rec.defs.forEach((d, i) => {
        if (d.start <= pos && pos <= d.end && (best === null || d.end - d.start < rec.defs[best].end - rec.defs[best].start)) best = i;
      });
      return best;
    };
    const sf2 = sf;
    const walk = (n) => {
      if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.body) {
        const line = sf2.getLineAndCharacterOfPosition(n.getStart(sf2)).line + 1;
        const i = byRange(line);
        if (i !== null) { innerVisit(n.body, canon[i]); return; }
      }
      ts.forEachChild(n, walk);
    };
    walk(sf2);
  } catch (e) {
    rec.ok = false;
    rec.error = String(e && e.message ? e.message : e).slice(0, 200);
  }
  out.push(JSON.stringify(rec));
}
fs.writeFileSync(OUT, out.join("\n") + "\n");
