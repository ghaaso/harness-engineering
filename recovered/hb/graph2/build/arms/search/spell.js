'use strict';
// What a careful person greps for: module-path and import spellings of a file, route strings,
// and how to read a hit line (definition, import, call or mention).
const path = require('path');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isPy = (p) => p.endsWith('.py');

// Aliases a person learns once from vite.config.js / jsconfig.json / technician-app/tsconfig.json.
const ALIASES = [
  ['@app/', 'src/app/'], ['@ops/', 'src/ops/'], ['@shared/', 'src/shared/'], ['@features/', 'src/features/'],
];
const JS_EXTS = ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];

// Resolve a JS/TS import specifier written in file `from` to a repo file (or null).
function resolveJs(spec, from, files) {
  let base = null;
  if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else if (spec.startsWith('@/') && from.startsWith('technician-app/')) base = 'technician-app/src/' + spec.slice(2);
  else { for (const [a, t] of ALIASES) if (spec.startsWith(a)) base = t + spec.slice(a.length); }
  if (!base) return null;
  for (const e of JS_EXTS) if (files.has(base + e)) return base + e;
  return null;
}
// Python module name of a backend file: backend/app/x/y.py -> app.x.y ; __init__.py -> package.
function pyModule(p) {
  if (!p.startsWith('backend/') || !p.endsWith('.py')) return null;
  let m = p.slice('backend/'.length, -3).replace(/\//g, '.');
  if (m.endsWith('.__init__')) m = m.slice(0, -'.__init__'.length);
  return m;
}
function resolvePy(mod, from, files) {
  // relative: from .x import / from .. import
  let abs = mod;
  if (mod.startsWith('.')) {
    const dots = mod.match(/^\.+/)[0].length;
    let pkg = pyModule(from).split('.');
    if (!from.endsWith('__init__.py')) pkg.pop();
    for (let i = 1; i < dots; i++) pkg.pop();
    const rest = mod.slice(dots);
    abs = pkg.join('.') + (rest ? '.' + rest : '');
  }
  const f = 'backend/' + abs.replace(/\./g, '/');
  if (files.has(f + '.py')) return f + '.py';
  if (files.has(f + '/__init__.py')) return f + '/__init__.py';
  return null;
}

// Every import statement of a file: [{line, spec, names:[...], resolved:[files]}].
// Python names that are themselves submodules (from pkg import service) resolve to that file.
function parseImports(p, text, files) {
  const out = [];
  const lines = text.split('\n');
  if (isPy(p)) {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      let m = l.match(/^\s*from\s+(\S+)\s+import\s+(.*)$/);
      if (m) {
        let body = m[2]; let j = i;
        if (body.includes('(') && !body.includes(')')) { while (j + 1 < lines.length && !lines[j].includes(')')) { j++; body += ' ' + lines[j]; } }
        const names = body.replace(/[()\\]/g, ' ').split(',').map((s) => s.trim().split(/\s+/)[0]).filter((s) => /^\w+$/.test(s));
        const res = new Set(); const r = resolvePy(m[1], p, files); if (r) res.add(r);
        for (const n of names) { const r2 = resolvePy(m[1].endsWith('.') ? m[1] + n : m[1] + '.' + n, p, files); if (r2) res.add(r2); }
        out.push({ line: i + 1, endLine: j + 1, spec: m[1], names, resolved: [...res] });
        i = j; continue;
      }
      m = l.match(/^\s*import\s+([\w.]+)/);
      if (m) { const r = resolvePy(m[1], p, files); out.push({ line: i + 1, endLine: i + 1, spec: m[1], names: [], resolved: r ? [r] : [] }); }
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!/^\s*(import|export)\b/.test(l) && !/\brequire\(|\bimport\(|\b(vi|jest)\.mock\(/.test(l)) continue;
      let j = i; let body = l;
      if (/^\s*(import|export)\b/.test(l) && !/['"]/.test(l.replace(/\/\/.*/, '')) && /[{,]\s*$|^\s*import\s*\{?\s*$|^\s*(import|export)\s+type\s*\{/.test(l)) {
        while (j + 1 < lines.length && j - i < 40 && !/from\s*['"]/.test(lines[j])) { j++; body += ' ' + lines[j]; }
      }
      const specs = [...body.matchAll(/(?:from\s*|require\(\s*|import\(\s*|mock\(\s*|^\s*import\s+)['"]([^'"]+)['"]/g)].map((x) => x[1]);
      if (!specs.length) continue;
      const nm = body.match(/\{([^}]*)\}/);
      const names = nm ? nm[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, '')).filter((s) => /^\w+$/.test(s)) : [];
      const def = body.match(/^\s*import\s+(\w+)/); if (def && def[1] !== 'type') names.push(def[1]);
      for (const spec of specs) { const r = resolveJs(spec, p, files); out.push({ line: i + 1, endLine: j + 1, spec, names, resolved: r ? [r] : [] }); }
      i = j;
    }
  }
  return out;
}

// Grep patterns a person types to find who imports file `p` (module path and import spellings).
function moduleSpellings(p) {
  const pats = [];
  if (isPy(p)) {
    const mod = pyModule(p); if (!mod) return pats;
    const parts = mod.split('.'); const stem = parts[parts.length - 1]; const pkg = parts.slice(0, -1).join('.');
    if (p.endsWith('__init__.py')) pats.push({ label: 'module ' + mod, re: new RegExp('\\b' + esc(mod) + '\\b(?![.\\w])') });
    else {
      pats.push({ label: 'module ' + mod, re: new RegExp('\\b' + esc(mod) + '\\b') });
      if (pkg) pats.push({ label: 'from ' + pkg + ' import ' + stem, re: new RegExp('from\\s+' + esc(pkg) + '\\s+import\\b.*\\b' + esc(stem) + '\\b') });
      pats.push({ label: 'relative ' + stem, re: new RegExp('from\\s+\\.+' + esc(stem) + '\\s+import\\b|from\\s+\\.+\\s+import\\b.*\\b' + esc(stem) + '\\b') });
    }
  } else {
    const base = path.posix.basename(p).replace(/\.[^.]+$/, '');
    const stem = base === 'index' ? path.posix.basename(path.posix.dirname(p)) : base;
    const tail = base === 'index' ? '(?:/index)?' : '';
    pats.push({ label: 'import spec */' + stem, re: new RegExp('[\'"][^\'"\\s]*\\b' + esc(stem) + tail + '(?:\\.[cm]?[jt]sx?)?[\'"]') , js: true });
  }
  return pats;
}

// Route strings inside text (client '/api/...' literals, backend decorators with router prefix).
function routeStrings(p, text, range) {
  const lines = text.split('\n');
  const lo = range ? range[0] : 1; const hi = range ? range[1] : lines.length;
  const out = [];
  if (isPy(p)) {
    let prefix = ''; const pm = text.match(/APIRouter\(\s*(?:[^)]*?)prefix\s*=\s*["']([^"']*)["']/s); if (pm) prefix = pm[1];
    for (let i = lo - 1; i < Math.min(hi, lines.length); i++) {
      if (!/@\w*router\.(get|post|put|patch|delete|api_route)\(/.test(lines[i])) continue;
      const chunk = lines.slice(i, i + 4).join(' ');
      const m = chunk.match(/\(\s*["']([^"']*)["']/); if (!m) continue;
      out.push(('/api' + prefix + m[1]).replace(/\/+$/, '') || '/api');
    }
    for (let i = lo - 1; i < Math.min(hi, lines.length); i++) for (const m of lines[i].matchAll(/["'](\/api\/[^"'\s]*)["']/g)) out.push(m[1]);
  } else {
    for (let i = lo - 1; i < Math.min(hi, lines.length); i++) {
      for (const m of lines[i].matchAll(/["'`]([^"'`]*\/api\/[^"'`]*?)(?:["'`]|$)/g)) {
        let s = m[1].slice(m[1].indexOf('/api/'));
        s = s.replace(/\$\{[^}]*\}/g, '{}').split('?')[0];
        out.push(s);
      }
    }
  }
  return [...new Set(out)];
}
// Grep pattern for a route: its last two segments (params as wildcards) inside a string.
function routePattern(route) {
  const segs = route.split('/').filter(Boolean).filter((s, i) => !(i === 0 && s === 'api'));
  if (!segs.length) return null;
  const isParam = (s) => /^\{.*\}$/.test(s) || s.includes('{');
  const P = '(?:\\{[^}]*\\}|\\$\\{[^}]*\\}|[^/"\'`\\s]+)';
  let k = Math.min(2, segs.length);
  while (k < segs.length && segs.slice(-k).every(isParam)) k++;
  const tail = segs.slice(-k);
  if (tail.every(isParam)) return null;
  const body = tail.map((s) => (isParam(s) ? P : esc(s))).join('/');
  return { label: 'route ' + route, re: new RegExp('/' + body + '(?=["\'`?]|/?["\'`])'), literals: segs.filter((s) => !isParam(s)) };
}

// Definition / import / call classification of one hit line for name `t`.
function hitType(p, line, t, importLines, lineNo) {
  if (importLines && importLines.has(lineNo)) return 'import';
  const e = esc(t);
  if (isPy(p)) {
    if (new RegExp('^\\s*(async\\s+)?def\\s+' + e + '\\b|^\\s*class\\s+' + e + '\\b|^' + e + '\\s*(:[^=]*)?=').test(line)) return 'def';
  } else if (new RegExp('function\\s*\\*?\\s*' + e + '\\b|\\b(const|let|var|class|interface|type|enum)\\s+' + e + '\\b|^\\s*(async\\s+)?' + e + '\\s*[(:]\\s*.*[{>]?\\s*$').test(line) && !new RegExp('\\b' + e + '\\s*\\(.*\\)\\s*;\\s*$').test(line)) return 'def';
  if (/^\s*(import|from)\b|\brequire\(/.test(line)) return 'import';
  if (/\b(patch|mock|monkeypatch|vi\.mock|jest\.mock|spyOn)\b/.test(line)) return 'mock';
  return 'call';
}

module.exports = { esc, resolveJs, resolvePy, pyModule, parseImports, moduleSpellings, routeStrings, routePattern, hitType };
