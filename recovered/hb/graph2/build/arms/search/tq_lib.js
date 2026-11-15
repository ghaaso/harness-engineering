'use strict';
// Helpers for the scripted plain-search TQ answers: scopes, comment detection, enclosing names,
// route lookup. Every grep or read goes through the Ledger so lookups and tokens are counted.
const path = require('path');
const L = require('./lib');
const S = require('./spell');

const isClient = (p) => (p.startsWith('src/') || p.startsWith('technician-app/') || p === 'ops-server.mjs');
const isProd = (p) => L.CODE_EXT.some((e) => p.endsWith(e)) && !L.isTestPath(p) && !/(^|\/)(vite|vitest|jest|eslint|babel|metro)\.config\./.test(p);

// Lines inside a Python docstring / triple-quoted string, or a JS block comment, per file (cached).
const strCache = new Map();
function commentLines(ctx, p) {
  const key = ctx.sha + ':' + p;
  if (strCache.has(key)) return strCache.get(key);
  const set = new Set(); const ls = ctx.lines.get(p) || [];
  let inTri = null; let inBlock = false;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]; const t = l.trim();
    if (p.endsWith('.py')) {
      if (inTri) { set.add(i + 1); if (l.includes(inTri)) inTri = null; continue; }
      const m = t.match(/^[rRbBuU]?("""|''')/);
      if (m) { set.add(i + 1); const rest = t.slice(t.indexOf(m[1]) + 3); if (!rest.includes(m[1])) inTri = m[1]; continue; }
      if (t.startsWith('#')) set.add(i + 1);
    } else {
      if (inBlock) { set.add(i + 1); if (l.includes('*/')) inBlock = false; continue; }
      if (t.startsWith('/*')) { set.add(i + 1); if (!t.includes('*/')) inBlock = true; continue; }
      if (t.startsWith('//') || t.startsWith('*')) set.add(i + 1);
    }
  }
  strCache.set(key, set); return set;
}
// Strip a trailing comment from a code line (rough: # in Python, // in JS outside quotes is ignored).
const codePart = (p, line) => (p.endsWith('.py') ? line.replace(/\s#.*$/, '') : line.replace(/\s\/\/.*$/, ''));

// Enclosing definition name as path::Name (qualified), or path::NAME for a module-level assignment.
function encName(ctx, p, line) {
  const e = L.enclosing(ctx.nodes, p, line);
  if (e && e.kind !== 'constant' && e.kind !== 'variable') return e.name.replace(/^test:/, '');
  const text = (ctx.lines.get(p) || [])[line - 1] || '';
  const m = text.match(/^(?:export\s+)?(?:const|let|var)?\s*([A-Za-z_]\w*)\s*(?::[^=]*)?=/);
  if (m) return m[1];
  return e ? e.name : null;
}

// Grep with the ledger; scope is a path predicate.
function grep(ctx, ledger, label, re, scope) {
  const hits = ctx.grep(re, scope);
  ledger.grepCost(label, hits);
  return hits;
}

// Backend routes: [{method, path, file, fn, line}] from decorators + APIRouter prefix + '/api' mount.
function backendRoutes(ctx, files) {
  const out = [];
  for (const p of files) {
    const text = ctx.files.get(p) || ''; const ls = ctx.lines.get(p) || [];
    const prefixes = {};
    for (const m of text.matchAll(/^(\w+)\s*=\s*APIRouter\(([^)]*)\)/gms)) { const pm = m[2].match(/prefix\s*=\s*["']([^"']*)["']/); prefixes[m[1]] = pm ? pm[1] : ''; }
    for (let i = 0; i < ls.length; i++) {
      const m = ls[i].match(/^@(\w+)\.(get|post|put|patch|delete)\(/); if (!m) continue;
      const chunk = ls.slice(i, i + 4).join(' '); const pm = chunk.match(/\(\s*["']([^"']*)["']/);
      let j = i + 1; while (j < ls.length && !/^\s*(async\s+)?def\s+/.test(ls[j])) j++;
      const fm = (ls[j] || '').match(/def\s+(\w+)/);
      out.push({ method: m[2].toUpperCase(), path: ('/api' + (prefixes[m[1]] || '') + (pm ? pm[1] : '')).replace(/\/$/, ''), file: p, fn: fm ? fm[1] : null, line: j + 1 });
    }
  }
  return out;
}
// HTTP method used at a client call line (looks at the line and the next two).
function methodAt(ls, i) {
  const chunk = ls.slice(i, i + 3).join(' ');
  const m = chunk.match(/["'](POST|PUT|PATCH|DELETE|GET)["']/) || chunk.match(/method:\s*["'](POST|PUT|PATCH|DELETE|GET)["']/i);
  if (m) return m[1].toUpperCase();
  const k = chunk.match(/\b(?:api|http|client)\.?(post|put|patch|delete|get)\b/i) || chunk.match(/\b(?:apiPost|apiPut|apiPatch|apiDelete)\b/);
  if (k) return (k[1] || k[0].slice(3)).toUpperCase();
  return 'GET';
}

module.exports = { isClient, isProd, commentLines, codePart, encName, grep, backendRoutes, methodAt, esc: S.esc };
