// Spot check: the largest single items per category in slice sessions, with the command that produced them.
const H = require('./fill.js');
const BS = String.fromCharCode(92);
(async () => {
  const top = {}, names = {};
  for (const d of H.dirs.filter((x) => x.includes('worktrees'))) {
    for (const f of H.walk(H.path.join(H.P, d), [])) {
      const rel = H.path.relative(H.path.join(H.P, d), f).split(H.path.sep).join('/');
      if (rel.includes('/')) continue;
      const tools = {}; let pend = [];
      const rl = H.readline.createInterface({ input: H.fs.createReadStream(f), crlfDelay: Infinity });
      for await (const line of rl) {
        if (line.indexOf('"type":"assistant"') < 0 && line.indexOf('"type":"user"') < 0) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        if (o.isSidechain || !o.message || !String(o.timestamp || '').startsWith('2026-11')) continue;
        const c = o.message.content; if (!Array.isArray(c)) continue;
        for (const b of c) {
          if (b.type === 'tool_use') { tools[b.id] = b; names[b.name] = (names[b.name] || 0) + JSON.stringify(b.input || {}).length; }
          if (b.type === 'tool_result') {
            const tu = tools[b.tool_use_id]; const [cat] = H.resultCat(tu); const n = H.resLen(b.content);
            const cmd = tu ? String((tu.input && (tu.input.command || tu.input.file_path || tu.input.pattern)) || '').split(BS).join('/').replace(/\s+/g, ' ').slice(0, 110) : '';
            const T = (top[cat] = top[cat] || { n: 0, ch: 0, big: [] }); T.n++; T.ch += n; T.big.push([n, cmd]); if (T.big.length > 400) { T.big.sort((x, y) => y[0] - x[0]); T.big.length = 6; }
          }
        }
      }
    }
  }
  console.log('tool-call input chars by tool:', Object.entries(names).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => k + ' ' + Math.round(v / 1000) + 'k').join(', '));
  for (const k of ['shell-read', 'shell-other', 'shell-run', 'file-read']) { const T = top[k]; if (!T) continue; T.big.sort((x, y) => y[0] - x[0]); console.log('\n' + k + ': results ' + T.n + ', chars ' + Math.round(T.ch / 1000) + 'k, mean ' + Math.round(T.ch / T.n)); for (const [n, c] of T.big.slice(0, 6)) console.log('  ' + String(n).padStart(7) + '  ' + c); }
})();
