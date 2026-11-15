const S = JSON.parse(require('fs').readFileSync('calls.json', 'utf8'));
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
const models = {}, g = {}; let nNov = 0, nAll = 0, thCalls = 0, thEmpty = 0, outTh = 0, outNo = 0, ctxNov = 0, ctxNonNov = 0, multiLineOut = 0;
const ids = {}; let dupIds = 0, dupCtx = 0;
for (const s of S) { add(g, s.g + ' sidechainSkipped', s.stats.sidechainSkipped); add(g, s.g + ' synthetic', s.stats.synthetic);
  for (const c of s.calls) { nAll++; add(models, c.model + (c.nov ? ' nov' : ' pre'), 1); if (c.nov) { nNov++; ctxNov += c.ctx; } else ctxNonNov += c.ctx;
    if (c.th) { thCalls++; if (c.thc === 0) thEmpty++; outTh += c.out; } else outNo += c.out;
    if (ids[c.id]) { dupIds++; if (c.nov) dupCtx += c.ctx; ids[c.id].push(s.f); } else ids[c.id] = [s.f]; } }
console.log({ nAll, nNov, ctxNovM: ctxNov / 1e6, ctxNonNovM: ctxNonNov / 1e6, thCalls, thEmpty, outThM: outTh / 1e6, outNoM: outNo / 1e6, dupIds, dupCtxM: dupCtx / 1e6 });
console.log(models); console.log(g);
const ex = Object.entries(ids).filter(([k, v]) => v.length > 1).slice(0, 5); console.log(ex);
