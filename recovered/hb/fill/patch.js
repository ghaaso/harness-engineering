const fs = require('fs');
let a = fs.readFileSync('fill.js', 'utf8');
a = a.replace("function resultCat(tu) {", "function pathOf(s) { const m = String(s || '').replace(/^cd\s+(\"[^\"]*\"|\S+)\s*&&/, '').match(/[\w.\/:~-]+\.[A-Za-z0-9]{1,6}(?![\w.])/); return m ? m[0].split('/').slice(-2).join('/').toLowerCase() : ''; }\nfunction resultCat(tu) {");
a = a.replace("return ['file-read', fileKind(inp.file_path), String(inp.file_path || '')];", "return ['file-read', fileKind(inp.file_path), String(inp.file_path || ''), pathOf(String(inp.file_path || '').split(BS).join('/'))];");
a = a.replace("return [k, k === 'shell-read' ? fileKind(String(inp.command || '').replace(/^cd\s+\S+\s*&&/, '')) : '', w]; }", "return [k, k === 'shell-read' ? fileKind(String(inp.command || '').replace(/^cd\s+\S+\s*&&/, '')) : '', w, k === 'shell-read' ? pathOf(inp.command) : '']; }");
fs.writeFileSync('fill.js', a);
let p = fs.readFileSync('parse.js', 'utf8');
p = p.replace("const [cat, kind, extra] = H.resultCat(tools[b.tool_use_id]); cur.inc.push({ cat, kind, extra, ch:", "const [cat, kind, extra, fp] = H.resultCat(tools[b.tool_use_id]); cur.inc.push({ cat, kind, extra, fp, ch:");
fs.writeFileSync('parse.js', p);
let r = fs.readFileSync('run.js', 'utf8');
r = r.replace("const G = {};", "const G = {}; const TOP = {}; let WIN = 0;");
r = r.replace("const seen = {};", "const seen = {}; WIN++;");
r = r.replace("if (it.cat === 'file-read') { if (seen[it.extra]) add(R.repeat, 'file opened again in the same window', t); else add(R.repeat, 'first open', t); seen[it.extra] = 1; }",
  "if ((it.cat === 'file-read' || it.cat === 'shell-read') && it.fp) { add(R.repeat, seen[it.fp] ? 'opened again in the same window' : 'first open in the window', t); seen[it.fp] = 1; const T = (TOP[it.fp] = TOP[it.fp] || { t: 0, w: {}, g: {} }); T.t += t; T.w[WIN] = 1; add(T.g, s.g, t); } else if (it.cat === 'file-read' || it.cat === 'shell-read') add(R.repeat, 'no file path in the command', t);");
r = r.replace("H.fs.writeFileSync('fill-result.json', JSON.stringify({ cpt, G }, null, 1));", "const top = Object.entries(TOP).map(([k, v]) => ({ path: k, tokens: Math.round(v.t), windows: Object.keys(v.w).length, groups: v.g })).sort((x, y) => y.tokens - x.tokens);\n  H.fs.writeFileSync('fill-result.json', JSON.stringify({ cpt, G, windows: WIN, distinctPaths: top.length, top: top.slice(0, 60) }, null, 1));");
fs.writeFileSync('run.js', r);
console.log(a.includes('function pathOf'), p.includes('extra, fp'), r.includes('TOP[it.fp]'), r.includes('distinctPaths'));
