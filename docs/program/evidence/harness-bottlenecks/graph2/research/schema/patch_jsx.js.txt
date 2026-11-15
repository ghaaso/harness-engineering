// Adds a JSX "renders" edge (element tag resolved to an in-repo component) to ts_extract.js.
const fs=require("fs");const f=__dirname+"/ts_extract.js";let s=fs.readFileSync(f,"utf8");
const anchor="      if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && /Route$|Screen$/";
const add=`      if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) {
        inc(name + ".jsx_elements");
        let s2 = null; try { s2 = checker.getSymbolAtLocation(n.tagName); } catch (e) {}
        if (s2 && s2.flags & ts.SymbolFlags.Alias) { try { s2 = checker.getAliasedSymbol(s2); } catch (e) {} }
        const d2 = s2 && s2.declarations && s2.declarations[0];
        if (d2 && inRepo(d2.getSourceFile().fileName) && declName(d2)) { inc(name + ".renders_repo"); out.renders = out.renders || []; out.renders.push({ src: enclosingDef(n), dst: rel(d2.getSourceFile().fileName) + "#" + declName(d2), test: isTest }); }
      }
`;
if(!s.includes(".jsx_elements")) s=s.replace(anchor, add+anchor);
fs.writeFileSync(f,s);
