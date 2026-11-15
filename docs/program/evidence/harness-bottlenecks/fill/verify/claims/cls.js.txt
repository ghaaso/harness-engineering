// Finer classification of a read-type tool call (for the claims check).
const BS = String.fromCharCode(92);
const strip = (c) => String(c || '').split(BS).join('/').replace(/^\s*cd\s+("[^"]*"|\S+)\s*&&\s*/, '');
function pathOf(s) {
  const t = String(s || '').split(BS).join('/').replace(/^cd\s+("[^"]*"|\S+)\s*&&/, '');
  const m = t.match(/[\w.\/~-]+\.[A-Za-z0-9]{1,6}(?![\w.\/])/);
  return m ? m[0].split('/').slice(-2).join('/').toLowerCase() : '';
}
function first(cmd) {
  const segs = strip(cmd).split(/&&|;|\n/).map((x) => x.trim()).filter(Boolean);
  for (const seg of segs) { const w = seg.replace(/^(\w+=\S+\s+)+/, '').split(/\s+/)[0].split('/').pop(); if (['cd', 'export', 'set', 'echo', 'mkdir', 'source', 'pushd'].includes(w)) continue; return [w, seg]; }
  return ['', ''];
}
function fine(tn, ti) {
  ti = ti || {};
  if (tn === 'Read') return (ti.offset != null || ti.limit != null) ? 'Read tool, ranged (offset/limit)' : 'Read tool, whole file';
  if (tn === 'Grep') return 'Grep tool'; if (tn === 'Glob') return 'Glob tool';
  if (tn !== 'Bash' && tn !== 'PowerShell') return 'other';
  const [w, seg] = first(ti.command); const piped = /\|\s*(head|tail)\b/.test(seg);
  if (w === 'sed') {
    if (/\s-i\b|\s-i['"]|--in-place/.test(seg)) return 'sed -i (edit)';
    const all = [...seg.matchAll(/(\d+),(\d+)p/g)];
    if (!all.length) return 'sed, no numeric range';
    const n = all.reduce((s, m) => s + Math.max(0, +m[2] - +m[1] + 1), 0);
    return 'sed range ' + (n <= 60 ? '<=60' : n <= 150 ? '61-150' : n <= 300 ? '151-300' : n <= 600 ? '301-600' : '>600') + ' lines';
  }
  if (w === 'cat') return /<</.test(seg) || />\s*\S/.test(seg.split('|')[0]) ? 'cat, write/heredoc' : piped ? 'cat | head/tail' : 'cat';
  if (w === 'grep' || w === 'rg' || w === 'egrep') return (/\s-[a-zA-Z]*[ABC]\s*\d|\s--context/.test(seg) ? 'grep with context lines' : /\s-[a-zA-Z]*[rR]/.test(seg) || w === 'rg' ? 'grep recursive' : 'grep in file(s)');
  if (w === 'head' || w === 'tail') return 'head/tail';
  if (w === 'git') { const sub = (seg.match(/git\s+(?:-C\s+\S+\s+|-c\s+\S+\s+|--no-pager\s+)*(\S+)/) || [])[1] || ''; return 'git ' + sub; }
  if (['ls', 'find', 'tree', 'wc'].includes(w)) return 'locate: ' + w;
  return 'shell ' + w;
}
const LOCATE = (f) => /^(Grep tool|Glob tool|grep recursive|locate: )/.test(f);
module.exports = { pathOf, fine, LOCATE, strip };
