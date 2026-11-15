const fs=require('fs');let s=fs.readFileSync('forms.js','utf8');
s=s.replace("  if (!r) return /^https?:/.test(s) ? 'web' : 'unknown';\n  const low = r.toLowerCase();",
"  if (!r) return /^https?:/.test(s) ? 'web' : 'unknown';\n  const low = r.toLowerCase();\n  if (/^(backend|src|technician-app)(\/[\w.-]+)*\/?$/.test(low) && !/\.\w{1,5}$/.test(low)) return /(^|\/)(tests?|__tests__)$/.test(low) ? 'test' : 'code';\n  if (/^docs\/?$/.test(low)) return 'product-doc';");
s=s.replace("if (c.n === 'Read' || c.n === 'Grep' || c.n === 'Glob') { const z = pzone(c.t); return z === 'unknown' && (c.n !== 'Read') ? 'repo-wide' : z; }",
"if (c.n === 'Read' || c.n === 'Grep' || c.n === 'Glob') { const z = pzone(c.t); if (z !== 'unknown') return z; if (c.n === 'Read') return 'unknown'; return byResult(c) || (/\.(py|tsx?|jsx?)\b|\b(py|ts|js)\b/.test(String(c.g || '')) ? 'code' : 'repo-wide'); }");
s=s.replace("  if (!zs.length) return /\bgit\b|\bgh\b/.test(q) ? 'git' : 'repo-wide';",
"  if (!zs.length) return /\bgit\b|\bgh\b/.test(q) ? 'git' : byResult(c) || 'repo-wide';");
s=s.replace("function callZone(c) {","function byResult(c) { const zs = (c.paths || []).map(pzone).filter((z) => z !== 'unknown'); if (!zs.length) return null; const n = {}; for (const z of zs) n[z] = (n[z] || 0) + 1; return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0]; }\nfunction callZone(c) {");
s=s.replace("  if (z === 'scratch') return 'run-output-or-scratch';",
"  if (z === 'scratch') { const all = (c.t || '') + ' ' + q; if (/handoff|reviews?\/|verdict|report|findings|refute|critic|audit/i.test(all)) return 'prior-conclusions'; if (/\/tasks\/[\w-]+\.output|\.output\b|tool-results/.test(all)) return 'agent-or-job-output'; if (/\.log\b|tail\s|gate|ci-|pytest|jest|lab\//i.test(all)) return 'run-log'; return 'scratch-work-files'; }");
s=s.replace("  // code-side forms","  if (!['code', 'schema', 'test', 'config'].includes(z)) { if (c.k === 'look-search') return 'search-unresolved-target'; if (c.k === 'look-list') return 'locate-files'; return 'read-unresolved-target'; }\n  // code-side forms");
fs.writeFileSync('forms.js',s);
