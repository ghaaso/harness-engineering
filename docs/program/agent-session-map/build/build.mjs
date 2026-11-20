// Generator for the agent and session map. Usage: node build/build.mjs   (run from anywhere)
// Reads sessions.json, research-tree/build/plan.json and the transcripts' usage / timestamps / meta files
// (never message text), and writes agent-session-map.svg and agent-session-map.drawio beside this folder.
// The PNG is made from the SVG by build/shoot.sh (headless Edge). Token method: build/helper-tokens.mjs.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..');
const REPO = resolve(HERE, '../../../..');
const S = JSON.parse(readFileSync(resolve(OUT, 'sessions.json'), 'utf8'));
const PLAN = JSON.parse(readFileSync(resolve(REPO, 'research-tree/build/plan.json'), 'utf8'));
const TR = S.transcripts.replace(/\/$/, '');
const NOW = new Date();
const BUILD_UTC = NOW.toISOString().slice(0, 16).replace('T', ' ');

// ---------- text measuring (Arial advance widths) ----------
const AW = { ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191, '(': 333, ')': 333, '*': 389, '+': 584,
  ',': 278, '-': 333, '.': 278, '/': 278, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667,
  Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, '[': 278, ']': 278, '_': 556,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556,
  q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500, '|': 260, '~': 584, '·': 278, '→': 1000, '↳': 1000, '●': 600 };
for (const d of '0123456789') AW[d] = 556;
const tw = (s, fs, bold = false) => { let w = 0; for (const ch of s) w += AW[ch] ?? 600; return (w / 1000) * fs * (bold ? 1.08 : 1) * 1.03; };
const segW = (segs, fs) => segs.reduce((a, s) => a + tw(s.t, s.fs || fs, !!s.b), 0);

// ---------- data ----------
function usage(file) {
  const per = new Map(); let first = '', last = ''; const models = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue; let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.timestamp) { if (!first) first = o.timestamp; last = o.timestamp; }
    const u = o?.message?.usage, id = o?.message?.id; if (!u || !id) continue;
    const m = (o.message.model || '').match(/opus|sonnet|haiku|fable/); if (m) models[m[0]] = (models[m[0]] || 0) + 1;
    const p = per.get(id) || { i: 0, cc: 0, cr: 0, o: 0 };
    p.i = Math.max(p.i, u.input_tokens || 0); p.cc = Math.max(p.cc, u.cache_creation_input_tokens || 0);
    p.cr = Math.max(p.cr, u.cache_read_input_tokens || 0); p.o = Math.max(p.o, u.output_tokens || 0);
    per.set(id, p);
  }
  let t = 0; for (const p of per.values()) t += p.i + p.cc + p.cr + p.o;
  return { tokens: t, calls: per.size, first, last, models };
}
const EXTRA = ["P0", "GATE", "LANE", "DOCS", "FIX-GATE", "FIX-GUARD"];
const UNITS = new Set([...PLAN.units.map((u) => u.id), ...EXTRA]);
const batchOf = {}; for (const u of PLAN.units) if (!(u.id in batchOf)) batchOf[u.id] = u.batch;
const sliceOf = (unit) => { const b = batchOf[unit]; if (!b) return 'Other'; return b.startsWith('B0') || b === 'PROBE' ? 'Slice 0' : b.startsWith('B1') ? 'Slice 1' : 'Slice 2'; };

const sessions = S.sessions.map((s) => {
  const base = `${TR}/${s.transcript}`;
  const own = usage(`${base}.jsonl`);
  const dir = `${base}/subagents`; const helpers = [];
  if (existsSync(dir)) for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
    const id = f.slice(6, -6); let meta = {}; try { meta = JSON.parse(readFileSync(`${dir}/${f.replace('.jsonl', '.meta.json')}`, 'utf8')); } catch {}
    const u = usage(`${dir}/${f}`); const desc = meta.description || meta.agentType || '';
    const mm = desc.match(/^([a-z-]+):\s*(.*)$/); const kind = mm ? mm[1] : (meta.agentType || 'helper'); const rest = mm ? mm[2] : desc;
    const um = rest.match(/^([A-Z][A-Za-z0-9.\-]*)\b/); if (um && !UNITS.has(um[1])) um[1] = null;
    const model = meta.model || Object.entries(u.models).sort((a, b) => b[1] - a[1])[0]?.[0] || '?';
    helpers.push({ id, kind, rest, unit: um ? um[1] : null, model, finished: meta.finished === true, parent: meta.parentAgentId ? meta.parentAgentId.replace(/^agent-/, '') : null, depth: meta.spawnDepth, ...u });
  }
  const models = Object.entries(own.models).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  return { ...s, own, models, helpers, htokens: helpers.reduce((a, h) => a + h.tokens, 0) };
});
const byKey = Object.fromEntries(sessions.map((s) => [s.key, s]));
const totalTokens = sessions.reduce((a, s) => a + s.own.tokens + s.htokens, 0);
const totalHelpers = sessions.reduce((a, s) => a + s.helpers.length, 0);

// ---------- formatting ----------
const fmt = (t) => (t >= 1e6 ? (t / 1e6).toFixed(2) + ' M' : Math.round(t / 1e3) + ' K');
const when = (iso) => iso.slice(5, 10) + ' ' + iso.slice(11, 16);
const MC = { opus: '#6d28d9', sonnet: '#0369a1', haiku: '#15803d', fable: '#b45309', '?': '#475569' };
const INK = '#111827', MUTED = '#475569', RUN = '#d97706';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- line building ----------
// A line = { segs:[{t,c,b,fs}], x, fs }. Atoms are never broken; separators may start a continuation line.
function helperAtom(h) {
  const segs = [{ t: h.kind + ' ', c: INK }, { t: h.model, c: MC[h.model] || MC['?'], b: true }, { t: ' ' + fmt(h.tokens), c: INK }];
  if (!h.finished) segs.push({ t: ' ● running', c: RUN, b: true });
  return segs;
}
function flow(prefixSegs, atoms, x, hang, maxW, fs) {
  const lines = []; let cur = { segs: [...prefixSegs], x }; let w = x + segW(prefixSegs, fs); let started = prefixSegs.length === 0;
  atoms.forEach((a, i) => {
    const sepSegs = i === 0 ? [] : [{ t: a.sep, c: MUTED, b: true }];
    const need = segW(sepSegs, fs) + segW(a.segs, fs);
    if (cur.segs.length && w + need > x + maxW && (started || i > 0)) {
      lines.push(cur); cur = { segs: [], x: hang }; w = hang;
      if (i > 0) { cur.segs.push(...sepSegs); w += segW(sepSegs, fs); }
    } else if (i > 0) { cur.segs.push(...sepSegs); w += segW(sepSegs, fs); }
    cur.segs.push(...a.segs); w += segW(a.segs, fs); started = true;
  });
  lines.push(cur); return lines;
}
function wrapText(text, fs, maxW, bold = false) {
  const out = []; let line = '';
  for (const word of text.split(' ')) { const t = line ? line + ' ' + word : word; if (line && tw(t, fs, bold) > maxW) { out.push(line); line = word; } else line = t; }
  out.push(line); return out;
}

const FS = 14, LH = 19, PAD = 14, TFS = 19;
// Helper section of one session -> array of line objects {segs, x, fs, rel (y offset), gapBefore}
function helperLines(s, W) {
  const inner = W - 2 * PAD; const L = [];
  if (!s.helpers.length) return L;
  const roots = s.helpers.filter((h) => !h.parent || !s.helpers.find((p) => p.id === h.parent));
  const kids = (h) => s.helpers.filter((k) => k.parent === h.id).sort((a, b) => a.first.localeCompare(b.first));
  const groups = new Map(); // heading -> unit map
  for (const h of roots) {
    const head = s.key === 'root-1' ? (h.unit ? sliceOf(h.unit) : 'Other') : '';
    if (!groups.has(head)) groups.set(head, new Map());
    const ukey = h.unit || '\u0000' + h.id; const um = groups.get(head);
    if (!um.has(ukey)) um.set(ukey, []); um.get(ukey).push(h);
  }
  const order = ['', 'Slice 0', 'Slice 1', 'Slice 2', 'Other'];
  for (const head of order.filter((k) => groups.has(k))) {
    const um = groups.get(head);
    if (head) {
      const hs = [...um.values()].flat(); const all = hs.concat(hs.flatMap((h) => kids(h)));
      L.push({ segs: [{ t: `${head}: ${all.length} ${all.length === 1 ? 'helper' : 'helpers'}, ${fmt(all.reduce((a, h) => a + h.tokens, 0))} tokens`, c: INK, b: true }], x: PAD, fs: 15, gap: 8 });
    }
    const units = [...um.entries()].sort((a, b) => a[1][0].first.localeCompare(b[1][0].first));
    for (const [ukey, hs] of units) {
      hs.sort((a, b) => a.first.localeCompare(b.first));
      const unit = ukey[0] === '\u0000' ? null : ukey;
      const atoms = hs.map((h, i) => ({ segs: helperAtom(h), sep: h.first >= hs[i - 1]?.last ? ' → ' : ' + ' }));
      const LAB = unit ? Math.max(62, ...[...um.keys()].filter((k) => k.charCodeAt(0) !== 0).map((k) => tw(k, FS, true) + 12)) : 0;
      if (unit) {
        const lines = flow([], atoms, PAD + LAB, PAD + LAB, inner - LAB, FS);
        lines[0].lab = { t: unit, c: INK, b: true }; lines[0].labX = PAD;
        lines.forEach((l) => { l.fs = FS; }); L.push(...lines);
      } else {
        const h = hs[0]; const atom = helperAtom(h);
        const descLines = wrapText(h.rest, FS, inner - segW(atom, FS) - 20);
        L.push({ segs: [...atom, { t: '  ' + descLines[0], c: MUTED }], x: PAD, fs: FS });
        descLines.slice(1).forEach((d) => L.push({ segs: [{ t: d, c: MUTED }], x: PAD + 14, fs: FS }));
      }
      for (const h of hs) for (const k of kids(h)) {
        const a = helperAtom(k); L.push({ segs: [{ t: '↳ ', c: MUTED, b: true }, ...a, { t: '  ' + k.rest + ' (started by ' + (h.unit || h.rest) + ')', c: MUTED }], x: PAD + 24, fs: FS, wrapW: inner - 24 });
      }
    }
  }
  // wrap over-long single lines (nested helpers) by the segment's total
  const out = [];
  for (const l of L) {
    const maxW = l.wrapW || inner; const w = segW(l.segs, l.fs);
    if (w + (l.x - PAD) <= inner || !l.wrapW) { out.push(l); continue; }
    const full = l.segs.map((s) => s.t).join(''); const idx = full.indexOf('  ');
    out.push({ ...l, segs: l.segs.slice(0, -1) }); out.push({ segs: [{ t: l.segs.at(-1).t.trim(), c: MUTED }], x: l.x + 14, fs: l.fs });
  }
  return out;
}

// ---------- boxes ----------
function sessionBox(s, W) {
  const inner = W - 2 * PAD; const rows = []; // {segs,x,fs,gap}
  const titleLines = wrapText(s.title, TFS, inner, true);
  titleLines.forEach((t) => rows.push({ segs: [{ t, c: INK, b: true }], x: PAD, fs: TFS, lh: 25 }));
  const roleLines = wrapText(s.role, FS, inner);
  roleLines.forEach((t, i) => rows.push({ segs: [{ t, c: MUTED }], x: PAD, fs: FS, gap: i === 0 ? 4 : 0 }));
  const mods = s.models.length ? s.models : ['?'];
  const modSegs = []; mods.forEach((m, i) => { if (i) modSegs.push({ t: ', ', c: INK }); modSegs.push({ t: m, c: MC[m] || MC['?'], b: true }); });
  rows.push({ segs: [{ t: 'Model ', c: INK }, ...modSegs, { t: ' · ', c: MUTED }, s.isRunning ? { t: '● running', c: RUN, b: true } : { t: 'idle', c: INK }, { t: ' · own tokens ' + fmt(s.own.tokens), c: INK }], x: PAD, fs: FS, gap: 6 });
  rows.push({ segs: [{ t: s.helpers.length ? `Helpers ${s.helpers.length} · ${fmt(s.htokens)} tokens` + (s.helpers.some((h) => !h.finished) ? ` · ${s.helpers.filter((h) => !h.finished).length} running` : '') : 'No helpers', c: INK }], x: PAD, fs: FS });
  rows.push({ segs: [{ t: `First ${when(s.own.first)} · last ${when(s.own.last)} UTC`, c: INK }], x: PAD, fs: FS });
  const hl = helperLines(s, W);
  if (hl.length) { rows.push({ rule: true, gap: 8, lh: 8 }); hl.forEach((l) => rows.push(l)); }
  let y = PAD; const placed = [];
  for (const r of rows) {
    y += r.gap || 0; const lh = r.lh || (r.fs && r.fs > 15 ? 22 : LH);
    placed.push({ ...r, y }); y += lh;
  }
  return { h: Math.ceil(y + PAD - 4), rows: placed, W };
}

// ---------- layout ----------
const GAP = 80, M = 20;
const C = [{ x: M, w: 100 }, { x: M + 100 + GAP, w: 420 }, { x: M + 100 + GAP + 420 + GAP, w: 660 }, { x: M + 100 + GAP + 420 + GAP + 660 + GAP, w: 400 }];
const W = C[3].x + C[3].w + M;
const colOf = { top: 1, pipeline: 1, 'analyse-plan': 2, 'check-plan': 2, 'nesting-probe': 2, 'root-1': 2, 'root-2': 3 };
const TOPY = 150, VG = 28;
const boxes = {};
for (const s of sessions) { const b = sessionBox(s, C[colOf[s.key]].w); boxes[s.key] = { ...b, s, x: C[colOf[s.key]].x }; }
let y = TOPY;
const col3 = ['analyse-plan', 'check-plan', 'nesting-probe', 'root-1'].sort((a, b) => byKey[a].own.first.localeCompare(byKey[b].own.first));
for (const k of col3) { boxes[k].y = y; y += boxes[k].h + VG; }
boxes['root-2'].y = boxes['root-1'].y;
boxes.top.y = TOPY; boxes.pipeline.y = boxes.top.y + boxes.top.h + VG;
const youH = 70; const youY = Math.round((boxes.top.y + 30 + boxes.pipeline.y + 30) / 2 - 35);
boxes.you = { x: C[0].x, y: youY, w: C[0].w, h: youH };
const treeBottom = Math.max(y - VG, boxes.pipeline.y + boxes.pipeline.h, boxes['root-2'].y + boxes['root-2'].h);
const FOOT = treeBottom + 30; const H = FOOT + 60;

// edges: from parent's right side (y = parent.y+30) to child's left side (y = child.y+30)
const edges = [];
const addEdge = (p, c, t) => { const A = boxes[p], B = boxes[c]; const x1 = A.x + (A.W || A.w), y1 = A.y + 30, x2 = B.x, y2 = B.y + 30; edges.push({ p, c, x1, y1, x2, y2, tx: x1 + Math.round(GAP * 0.3), label: t }); };
addEdge('you', 'top', byKey.top.own.first); addEdge('you', 'pipeline', byKey.pipeline.own.first);
for (const s of sessions) if (s.startedBy && s.startedBy !== 'owner') addEdge(s.startedBy, s.key, s.own.first);

// ---------- SVG ----------
const svg = []; const FONT = 'Helvetica, Arial, sans-serif';
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`);
svg.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
const tspans = (segs, fs) => segs.map((g) => `<tspan fill="${g.c}"${g.b ? ' font-weight="700"' : ''}>${esc(g.t)}</tspan>`).join('');
const text = (x, y, segs, fs, extra = '') => `<text x="${x}" y="${y}" font-size="${fs}" xml:space="preserve" ${extra}>${tspans(segs, fs)}</text>`;
svg.push(text(M, 46, [{ t: `Sessions and helpers, ${BUILD_UTC} UTC`, c: INK, b: true }], 30));
// legend + totals
const legendY = 78; let lx = M;
const lg = (segs) => { svg.push(text(lx, legendY, segs, 15)); lx += segW(segs, 15) + 26; };
lg([{ t: 'Models: ', c: INK }, { t: 'opus', c: MC.opus, b: true }, { t: '  ', c: INK }, { t: 'sonnet', c: MC.sonnet, b: true }, { t: '  ', c: INK }, { t: 'haiku', c: MC.haiku, b: true }, { t: '  ', c: INK }, { t: 'fable', c: MC.fable, b: true }]);
lg([{ t: '● running', c: RUN, b: true }, { t: ' = helper not finished at build time, or session working when the session list was read; idle = session not working then', c: INK }]);
lg([{ t: 'Line between boxes = started, with start time (UTC, month-day hour:minute)', c: INK }]);
lx = M; const l2 = legendY + 24;
const lg2 = (segs) => { svg.push(text(lx, l2, segs, 15)); lx += segW(segs, 15) + 26; };
lg2([{ t: 'In a helper line: ', c: INK }, { t: '→', c: MUTED, b: true }, { t: ' next helper started after the one before it ended (successor); ', c: INK }, { t: '+', c: MUTED, b: true }, { t: ' ran at the same time; ', c: INK }, { t: '↳', c: MUTED, b: true }, { t: ' started by the helper above', c: INK }]);
const l3 = l2 + 24; lx = M;
svg.push(text(M, l3, [{ t: `Totals: ${sessions.length} sessions + the owner, ${totalHelpers} helpers, ${fmt(totalTokens)} tokens (sessions ${fmt(sessions.reduce((a, s) => a + s.own.tokens, 0))}, helpers ${fmt(sessions.reduce((a, s) => a + s.htokens, 0))}). Built ${BUILD_UTC} UTC.`, c: INK }], 15));

// edges first (under the boxes)
const drawEdge = (e) => {
  svg.push(`<polyline points="${e.x1},${e.y1} ${e.tx},${e.y1} ${e.tx},${e.y2} ${e.x2 - 2},${e.y2}" fill="none" stroke="#334155" stroke-width="2.5"/>`);
  svg.push(`<polygon points="${e.x2},${e.y2} ${e.x2 - 10},${e.y2 - 5} ${e.x2 - 10},${e.y2 + 5}" fill="#334155"/>`);
  const d = e.label.slice(5, 10), t = e.label.slice(11, 16);
  const lxm = e.tx + 6;
  svg.push(`<text x="${lxm}" y="${e.y2 - 6}" font-size="14" font-weight="700" fill="#334155">${d}</text>`);
  svg.push(`<text x="${lxm}" y="${e.y2 + 14}" font-size="14" font-weight="700" fill="#334155">${t}</text>`);
};
edges.forEach(drawEdge);
// you
{ const b = boxes.you;
  svg.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="#f1f5f9" stroke="#334155" stroke-width="2.5"/>`);
  svg.push(text(b.x + b.w / 2, b.y + 31, [{ t: 'You', c: INK, b: true }], 22, 'text-anchor="middle"'));
  svg.push(text(b.x + b.w / 2, b.y + 54, [{ t: 'the owner', c: MUTED }], 14, 'text-anchor="middle"')); }
for (const s of sessions) {
  const b = boxes[s.key]; const run = s.isRunning;
  svg.push(`<rect x="${b.x}" y="${b.y}" width="${b.W}" height="${b.h}" rx="10" fill="#ffffff" stroke="${run ? RUN : '#334155'}" stroke-width="${run ? 3.5 : 2.5}"/>`);
  for (const r of b.rows) {
    if (r.rule) { svg.push(`<line x1="${b.x + PAD}" x2="${b.x + b.W - PAD}" y1="${b.y + r.y + 3}" y2="${b.y + r.y + 3}" stroke="#94a3b8" stroke-width="1.5"/>`); continue; }
    if (r.lab) svg.push(text(b.x + r.labX, b.y + r.y + 14.5, [r.lab], r.fs));
    svg.push(text(b.x + (r.x ?? PAD), b.y + r.y + (r.fs > 15 ? 19 : 14.5), r.segs, r.fs));
  }
}
const foot = 'Not drawn: sessions before this tree (2026-11-19 06:48 UTC), including the earlier top session and its 11 harness sessions, and the product sessions in EMS_workshop1 (FixFlow).';
svg.push(text(M, FOOT + 8, [{ t: foot, c: MUTED }], 15));
svg.push('</svg>');
writeFileSync(resolve(OUT, 'agent-session-map.svg'), svg.join('\n') + '\n');

// ---------- draw.io ----------
const cells = []; let nid = 2;
const geo = (x, y, w, h) => `<mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" as="geometry"/>`;
const htmlSegs = (segs) => segs.map((g) => `<span style="color:${g.c};${g.b ? 'font-weight:bold;' : ''}white-space:pre;">${esc(g.t)}</span>`).join('');
const vtx = (id, value, style, x, y, w, h) => cells.push(`<mxCell id="${id}" value="${esc(value)}" style="${style}" vertex="1" parent="1">${geo(x, y, w, h)}</mxCell>`);
const base = 'html=1;whiteSpace=wrap;fontFamily=Helvetica;';
const txt = (v, x, y, w, h, fs, extra = '') => vtx('t' + nid++, v, `text;${base}align=left;verticalAlign=top;spacing=0;spacingLeft=0;fontSize=${fs};${extra}`, x, y, w, h);
txt(`<b>Sessions and helpers, ${BUILD_UTC} UTC</b>`, M, 14, 1200, 40, 30);
txt(`Models: <b style="color:${MC.opus}">opus</b> <b style="color:${MC.sonnet}">sonnet</b> <b style="color:${MC.haiku}">haiku</b> <b style="color:${MC.fable}">fable</b>&nbsp;&nbsp;&nbsp;<b style="color:${RUN}">● running</b> = helper not finished at build time, or session working when the session list was read; idle = session not working then&nbsp;&nbsp;&nbsp;Line between boxes = started, with start time (UTC, month-day hour:minute)`, M, 62, 1800, 22, 15);
txt(`In a helper line: <b>→</b> next helper started after the one before it ended (successor); <b>+</b> ran at the same time; <b>↳</b> started by the helper above`, M, 86, 1800, 22, 15);
txt(`Totals: ${sessions.length} sessions + the owner, ${totalHelpers} helpers, ${fmt(totalTokens)} tokens (sessions ${fmt(sessions.reduce((a, s) => a + s.own.tokens, 0))}, helpers ${fmt(sessions.reduce((a, s) => a + s.htokens, 0))}). Built ${BUILD_UTC} UTC.`, M, 110, 1800, 22, 15);
const idOf = { you: 'you' };
{ const b = boxes.you; vtx('you', '<b style="font-size:22px">You</b><br><span style="color:#475569">the owner</span>', `rounded=1;arcSize=12;${base}align=center;verticalAlign=middle;fillColor=#f1f5f9;strokeColor=#334155;strokeWidth=2.5;fontSize=14;fontColor=#111827;`, b.x, b.y, b.w, b.h); }
for (const s of sessions) {
  const b = boxes[s.key]; idOf[s.key] = 's-' + s.key;
  // box as a container cell with a title; each line is its own text cell on top so wrapping matches the PNG
  vtx('s-' + s.key, '', `rounded=1;arcSize=3;${base}fillColor=#ffffff;strokeColor=${s.isRunning ? RUN : '#334155'};strokeWidth=${s.isRunning ? 3.5 : 2.5};`, b.x, b.y, b.W, b.h);
  for (const r of b.rows) {
    if (r.rule) { vtx('r' + nid++, '', 'rounded=0;fillColor=#94a3b8;strokeColor=none;', b.x + PAD, b.y + r.y + 3, b.W - 2 * PAD, 1.5); continue; }
    if (r.lab) txt(htmlSegs([r.lab]), b.x + r.labX, b.y + r.y - 1, 60, 20, r.fs, 'whiteSpace=nowrap;');
    txt(htmlSegs(r.segs), b.x + (r.x ?? PAD), b.y + r.y - 1, b.W - (r.x ?? PAD) - 4, r.fs > 15 ? 24 : 20, r.fs, 'overflow=visible;whiteSpace=nowrap;');
  }
}
for (const e of edges) {
  const A = idOf[e.p], B = idOf[e.c];
  const ah = boxes[e.p].h || 70, bh = boxes[e.c].h || 70;
  const aw = boxes[e.p].W || boxes[e.p].w;
  cells.push(`<mxCell id="e${nid++}" value="" style="edgeStyle=none;rounded=0;html=1;exitX=1;exitY=${(30 / ah).toFixed(4)};exitDx=0;exitDy=0;entryX=0;entryY=${(30 / bh).toFixed(4)};entryDx=0;entryDy=0;endArrow=block;endFill=1;endSize=7;strokeWidth=2.5;strokeColor=#334155;" edge="1" parent="1" source="${A}" target="${B}"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="${e.tx}" y="${e.y1}"/><mxPoint x="${e.tx}" y="${e.y2}"/></Array></mxGeometry></mxCell>`);
  txt(`<b style="color:#334155">${e.label.slice(5, 10)}<br>${e.label.slice(11, 16)}</b>`, e.tx + 6, e.y2 - 22, 60, 40, 14);
}
txt(esc(foot), M, FOOT - 6, 1800, 22, 15, 'fontColor=#475569;');
writeFileSync(resolve(OUT, 'agent-session-map.drawio'), `<mxfile host="app.diagrams.net" agent="agent-session-map generator" version="24.7.17">\n<diagram id="map" name="Sessions and helpers">\n<mxGraphModel dx="1600" dy="900" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="${W}" pageHeight="${H}" math="0" shadow="0">\n<root>\n<mxCell id="0"/>\n<mxCell id="1" parent="0"/>\n${cells.join('\n')}\n</root>\n</mxGraphModel>\n</diagram>\n</mxfile>\n`);

console.log(JSON.stringify({ W, H, build: BUILD_UTC, sessions: sessions.length, helpers: totalHelpers, tokens: totalTokens, per: sessions.map((s) => [s.key, s.helpers.length, s.own.tokens, s.htokens, s.models.join('/'), s.helpers.filter((h) => !h.finished).length]) }));
