const H = require('./fill.js'), parse = require('./parse2.js');
(async () => {
  let n = 0, dup = 0, chars = 0, dupch = 0, ex = [];
  for (const d of H.dirs.filter((x) => x.includes('worktrees')).slice(0, 6)) for (const f of H.walk(H.path.join(H.P, d), [])) {
    const C = await parse(f, H.path.relative(H.path.join(H.P, d), f).includes(H.path.sep));
    const seen = new Map();
    for (const c of C) for (const it of c.inc) { if (!['file-read', 'shell-read'].includes(it.cat)) continue; const ti = it.ti || {}; const sig = it.tn + '|' + (ti.command != null ? ti.command : JSON.stringify([ti.file_path, ti.offset, ti.limit])); n++; chars += it.ch; if (seen.has(sig)) { dup++; dupch += it.ch; if (ex.length < 6) ex.push(sig.slice(0, 120) + ' ch=' + it.ch); } seen.set(sig, 1); }
  }
  console.log({ n, dup, chars, dupch }); console.log(ex.join('\n'));
})();
