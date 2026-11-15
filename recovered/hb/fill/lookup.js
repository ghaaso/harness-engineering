// Spot check of the claims refuter's figure: how much context was re-read by calls that only issued read or search tools.
const H = require('./fill.js');
const LOC = new Set('grep rg egrep find ls tree findstr'.split(' '));
(async () => {
  const G = {};
  for (const d of H.dirs) {
    const isWt = d.includes('worktrees');
    for (const f of H.walk(H.path.join(H.P, d), [])) {
      const rel = H.path.relative(H.path.join(H.P, d), f).split(H.path.sep).join('/');
      const isSub = rel.includes('/'); const g = isSub ? 'subagents' : isWt ? 'slice-main' : 'root-main';
      const R = (G[g] = G[g] || { calls: 0, ctx: 0, lkCalls: 0, lkCtx: 0, locCalls: 0, locCtx: 0, noTool: 0, noToolCtx: 0 });
      const byId = {};
      const rl = H.readline.createInterface({ input: H.fs.createReadStream(f), crlfDelay: Infinity });
      for await (const line of rl) {
        if (line.indexOf('"type":"assistant"') < 0) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        if (o.type !== 'assistant' || !o.message || !o.message.id || !o.message.usage) continue;
        if (!isSub && o.isSidechain) continue;
        const m = o.message, u = m.usage; const ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
        if (m.model === '<synthetic>' || ctx === 0 || !String(o.timestamp || '').startsWith('2026-11')) continue;
        const c = (byId[m.id] = byId[m.id] || { ctx: 0, n: 0, look: 0, loc: 0 });
        if (ctx > c.ctx) c.ctx = ctx;
        for (const b of (Array.isArray(m.content) ? m.content : [])) if (b.type === 'tool_use') {
          c.n++; const [cat, , w] = H.resultCat(b);
          if (cat === 'file-read' || cat === 'search' || cat === 'shell-read') c.look++;
          if (cat === 'search' || (cat === 'shell-read' && LOC.has(w))) c.loc++;
        }
      }
      for (const id in byId) { const c = byId[id]; R.calls++; R.ctx += c.ctx; if (c.n === 0) { R.noTool++; R.noToolCtx += c.ctx; } else if (c.look === c.n) { R.lkCalls++; R.lkCtx += c.ctx; if (c.loc === c.n) { R.locCalls++; R.locCtx += c.ctx; } } }
    }
  }
  const T = { calls: 0, ctx: 0, lkCalls: 0, lkCtx: 0, locCalls: 0, locCtx: 0, noTool: 0, noToolCtx: 0 };
  const pc = (a, b) => (100 * a / b).toFixed(1) + '%';
  const show = (g, R) => console.log(g.padEnd(11) + 'calls ' + R.calls + ', context ' + (R.ctx / 1e6).toFixed(0) + 'M | read/search-only calls ' + R.lkCalls + ' (' + pc(R.lkCalls, R.calls) + '), context ' + (R.lkCtx / 1e6).toFixed(0) + 'M (' + pc(R.lkCtx, R.ctx) + ') | locate-only calls ' + R.locCalls + ', context ' + (R.locCtx / 1e6).toFixed(0) + 'M (' + pc(R.locCtx, R.ctx) + ') | no-tool calls ' + R.noTool + ' (' + pc(R.noToolCtx, R.ctx) + ' of context)');
  for (const g of ['slice-main', 'root-main', 'subagents']) { show(g, G[g]); for (const k in T) T[k] += G[g][k]; }
  show('all', T);
})();
