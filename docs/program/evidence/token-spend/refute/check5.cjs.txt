// check5.cjs — calibrate the prefix estimate: first api-request's cache breakpoints vs first call's cache_read
const fs = require('fs'), path = require('path'), readline = require('readline');
const D = path.join(__dirname, '..');
const P = 'C:/Users/User/.claude/projects';
(async () => {
  const rows = [];
  for (const g of ['fixflow', 'clinic']) {
    const sess = JSON.parse(fs.readFileSync(path.join(D, 'out', `${g}.sessions.json`), 'utf8'));
    for (const s of sess) {
      const f = path.join(P, s.store, s.sid + '.jsonl');
      const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
      let shape = null, req = null, first = null, blobs = new Map();
      for await (const line of rl) {
        if (line.startsWith('{"type":"api-request-blob"')) { if (!first) { const o = JSON.parse(line); blobs.set(o.hash, JSON.stringify(o.message.content).length); } continue; }
        if (line.startsWith('{"type":"api-request-shape"') && !shape) { shape = JSON.parse(line); continue; }
        if (line.startsWith('{"type":"api-request"') && !req) { req = JSON.parse(line); continue; }
        if (!first && line.includes('"type":"assistant"')) { const o = JSON.parse(line); if (o.type === 'assistant' && o.message && o.message.usage && o.message.model !== '<synthetic>') { first = o.message.usage; break; } }
      }
      if (!shape || !first || !shape.shape) continue;
      const sys = Array.isArray(shape.shape.system) ? shape.shape.system.map(b => (b.text || '').length) : [];
      const toolsCh = JSON.stringify(shape.shape.tools || []).length;
      const globalCh = toolsCh + (sys[0] || 0) + (sys[1] || 0);
      const msgCh = req ? (req.tail || []).reduce((a, h) => a + (blobs.get(h) || 0), 0) : null;
      const ctx = first.input_tokens + first.cache_creation_input_tokens + first.cache_read_input_tokens;
      rows.push({ g, sid: s.sid.slice(0, 8), nSys: sys.length, sysCh: sys, toolsCh, crFirst: first.cache_read_input_tokens, ccFirst: first.cache_creation_input_tokens, ctx, chPerTokGlobal: +(globalCh / first.cache_read_input_tokens).toFixed(2), estChars4: Math.round((toolsCh + sys.reduce((a, b) => a + b, 0)) / 4), msgCh, chPerTokAll: msgCh ? +((toolsCh + sys.reduce((a, b) => a + b, 0) + msgCh) / ctx).toFixed(2) : null, cacheControl: req && JSON.stringify(req.cacheControl) });
    }
  }
  fs.writeFileSync(path.join(__dirname, 'check5.json'), JSON.stringify(rows, null, 1));
  for (const r of rows) console.log(r.g, r.sid, 'sys', r.sysCh.join('/'), 'tools', r.toolsCh, 'crFirst', r.crFirst, 'ccFirst', r.ccFirst, 'ch/tok(global part)', r.chPerTokGlobal, 'est(ch/4)', r.estChars4, 'ch/tok(all)', r.chPerTokAll);
  const v = rows.map(r => r.chPerTokGlobal).filter(x => x > 1 && x < 8).sort((a, b) => a - b); console.log('median ch/tok global', v[Math.floor(v.length / 2)], 'n', v.length);
  const w = rows.map(r => r.chPerTokAll).filter(x => x).sort((a, b) => a - b); console.log('median ch/tok all', w[Math.floor(w.length / 2)], 'n', w.length);
})();
