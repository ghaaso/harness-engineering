// November token tally by per-call context size, to see what a compaction threshold of 200k or 400k would touch.
// Same transcript set, month filter and de-duplication as tally.js. Context per call = input + cache-read + cache-write tokens.
const fs = require('fs'), path = require('path'), readline = require('readline');
const P = 'C:/Users/User/.claude/projects';
const dirs = fs.readdirSync(P).filter((d) => d.startsWith('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop'));
const groups = {};
const walk = (d, out) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.jsonl')) out.push(p); } return out; };
const bucket = (c) => (c < 200000 ? 'under 200k' : c < 400000 ? '200k to 400k' : 'over 400k');
(async () => {
  for (const d of dirs) {
    const isWt = d.includes('worktrees');
    for (const f of walk(path.join(P, d), [])) {
      const rel = path.relative(path.join(P, d), f).split(path.sep).join('/');
      const g = (isWt ? 'slice' : 'root') + (rel.includes('/') ? '-subagents' : '-main');
      const G = (groups[g] = groups[g] || { ids: new Set(), b: {}, cr: 0, over400: 0, over200: 0, max: 0 });
      const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
      for await (const line of rl) {
        if (line.indexOf('"usage"') < 0 || line.indexOf('"timestamp":"2026-11') < 0) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        const m = o.message; if (!m || !m.usage || !m.id) continue;
        if (G.ids.has(m.id)) continue; G.ids.add(m.id);
        const u = m.usage; const cr = u.cache_read_input_tokens || 0;
        const ctx = cr + (u.cache_creation_input_tokens || 0) + (u.input_tokens || 0);
        const k = bucket(ctx); const B = (G.b[k] = G.b[k] || { calls: 0, cr: 0 });
        B.calls++; B.cr += cr; G.cr += cr; if (ctx > G.max) G.max = ctx;
        G.over400 += Math.max(0, ctx - 400000); G.over200 += Math.max(0, ctx - 200000);
      }
    }
  }
  let tot = 0; for (const g in groups) tot += groups[g].cr;
  const M = (n) => (n / 1e6).toFixed(1) + 'M';
  const pc = (n, d) => (100 * n / d).toFixed(1) + '%';
  console.log('total cache-read ' + M(tot));
  for (const g of Object.keys(groups).sort()) {
    const G = groups[g];
    console.log(g + ': cache-read ' + M(G.cr) + ' (' + pc(G.cr, tot) + ' of all), largest call context ' + Math.round(G.max / 1000) + 'k');
    for (const k of ['under 200k', '200k to 400k', 'over 400k']) { const B = G.b[k] || { calls: 0, cr: 0 }; console.log('   ' + k.padEnd(13) + ' calls ' + String(B.calls).padStart(6) + '  cache-read ' + M(B.cr).padStart(9) + '  ' + pc(B.cr, G.cr).padStart(6) + ' of group, ' + pc(B.cr, tot).padStart(6) + ' of all'); }
    console.log('   tokens above the 400k line: ' + M(G.over400) + ' (' + pc(G.over400, tot) + ' of all); above the 200k line: ' + M(G.over200) + ' (' + pc(G.over200, tot) + ' of all)');
  }
  let a4 = 0, a2 = 0; for (const g in groups) { a4 += groups[g].over400; a2 += groups[g].over200; }
  console.log('all groups, tokens above the 400k line: ' + M(a4) + ' (' + pc(a4, tot) + '); above the 200k line: ' + M(a2) + ' (' + pc(a2, tot) + ')');
})();
