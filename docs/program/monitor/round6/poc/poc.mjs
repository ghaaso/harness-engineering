// Round 6 proof of concept: the owner's harness map as fixed ground, four frames side by side.
// Square = tokens spent at a pipeline; arrow = moves of work between steps (thicker = more); tags = where each session is
// at the frame's end; red = a rule broke there. Static picture only. Usage: node poc.mjs <data.json> <out.html> <start ISO> <minutes per frame>
import fs from 'node:fs';
const [, , DATA, OUT, START = '2026-11-24T01:00:00+05:00', MIN = '45'] = process.argv;
const d = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pipe = i => String(d.places[i]).split('.')[0];
const A = new Date(START).getTime(), F = +MIN * 60e3, NF = 4;
const hm = t => new Date(t + 5 * 3600e3).toISOString().slice(11, 16);
const SHORT = { ad4e59df: 'Top 7', '6d4e3fd7': 'Top 8', '6e74b4b6': 'Monitor', '869a4ba2': 'Top 9', ec3389d4: 'Top 9b', '26ad649f': 'Monitor r3', '589e137c': 'Big run', ad87c695: 'Creep hook', '0a5d672e': 'Monitor r4', c599f391: 'Big run 2', '6aaa8789': 'Monitor r5' };
const short = s => SHORT[s.id] || s.title.replace(/^[a-z-]+: /, '').slice(0, 12);
const NAME = { S1: 'Plan', S2: 'Admit', S3: 'Work', S4: 'Check', S5: 'Land', S6: 'Learn', B5: 'Notes', B3: 'Library', C: 'Guards', D: 'Limits', E: 'Context', F: 'Recovery', G: 'Measure' };
const MAIN = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const SIDE = { C: 'S1', D: 'S2', E: 'S3', F: 'S4', G: 'S6' }; // his map: the controls sit under these steps
const PROB = { hookfail: 'hook failed', window: 'window past limit', nohook: 'hook off', off: 'hook off', norecord: 'start, no record', bypass: 'bypassed' };
const all = []; for (const s of d.sessions) { all.push([s, s]); for (const h of s.helpers || []) all.push([h, s]); }
const frames = [];
for (let f = 0; f < NF; f++) {
  const a = A + f * F, b = a + F, tok = {}, mv = {}, prob = {}, ref = {}; let nh = 0, side = 0;
  for (const [x, s] of all) {
    let prev = null, any = false;
    for (const e of x.ev || []) {
      const t = d.base + e[0] * 1e3, p = pipe(e[2]);
      if (t >= a && t < b) { any = true; tok[p] = (tok[p] || 0) + e[3]; if (prev && prev !== p) { if (MAIN.includes(prev) && MAIN.includes(p)) mv[prev + '>' + p] = (mv[prev + '>' + p] || 0) + 1; else side++; } }
      prev = p;
    }
    if (any && x !== s) nh++;
    for (const m of x.marks || []) { const t = d.base + m[0] * 1e3; if (t < a || t >= b) continue; const p = pipe(m[1]); if (m[2] === 'refused') ref[p] = (ref[p] || 0) + 1; else { prob[p] = prob[p] || {}; prob[p][m[2]] = (prob[p][m[2]] || 0) + 1; } }
  }
  const tags = {};
  for (const s of d.sessions) {
    if (!(s.t0 < b && s.t1 >= a)) continue; const ev = s.ev.filter(e => d.base + e[0] * 1e3 < b); if (!ev.length) continue;
    const p = pipe(ev[ev.length - 1][2]); const col = MAIN.includes(p) ? p : (SIDE[p] || p);
    (tags[col] = tags[col] || []).push({ n: short(s) + (col !== p ? ' · ' + (NAME[p] || p).toLowerCase() : ''), run: s.t1 >= b - 60e3 });
  }
  frames.push({ a, b, tok, mv, prob, ref, nh, side, tags, total: Object.values(tok).reduce((x, y) => x + y, 0), ns: Object.values(tags).flat().length });
}
const MAXT = Math.max(...frames.flatMap(fr => Object.values(fr.tok)));
const sq = (t, cap) => t > 0 ? Math.max(3, Math.min(cap, 90 * Math.sqrt(t / MAXT))) : 0;
const M = v => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + ' M' : v > 0 ? Math.round(v) + ' K' : '';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const GREY = '#6b7785', INK = '#1b1f24', RED = '#c62828', BLUE = '#1f4fbf';
let svg = '';
const W = 940, BW = 98, GAP = 40, C1 = 80;
frames.forEach((fr, i) => {
  const ox = 13 + (i % 2) * (W + 1), oy = 50 + Math.floor(i / 2) * 512;
  const colX = c => ox + 22 + C1 + GAP + MAIN.indexOf(c) * (BW + GAP);
  const BY = oy + 128, BH = 168, BM = BY + 72;
  svg += `<rect x="${ox}" y="${oy}" width="${W - 6}" height="500" rx="8" fill="#fff" stroke="#d8dde3"/>`;
  svg += `<text x="${ox + 18}" y="${oy + 30}" font-size="20" font-weight="700" fill="${INK}">${hm(fr.a)} to ${hm(fr.b)}</text>`;
  svg += `<text x="${ox + 160}" y="${oy + 30}" font-size="16" fill="${GREY}">${M(fr.total)} tokens · ${fr.ns} sessions · ${fr.nh} helpers</text>`;
  // forward moves to the next step: arrows in the gaps; every move back to an earlier step: one return loop under the step it went back to
  let skip = 0; const back = {};
  for (const [k, n] of Object.entries(fr.mv)) { const [p, q] = k.split('>'), di = MAIN.indexOf(q) - MAIN.indexOf(p); if (di < 0) back[q] = (back[q] || 0) + n; else if (di > 1) skip += n; }
  for (let c = 0; c < MAIN.length - 1; c++) {
    const n = fr.mv[MAIN[c] + '>' + MAIN[c + 1]] || 0; if (!n) continue;
    const x1 = colX(MAIN[c]) + BW + 3, x2 = colX(MAIN[c + 1]) - 3, w = Math.min(18, 2 + 1.5 * n), h = w / 2 + 5, base = x2 - 11;
    svg += `<line x1="${x1}" y1="${BM}" x2="${base}" y2="${BM}" stroke="${GREY}" stroke-width="${w}"/><path d="M${base},${BM - h} L${x2},${BM} L${base},${BM + h} Z" fill="${GREY}"/>`;
    svg += `<text x="${(x1 + x2) / 2}" y="${BM - h - 5}" text-anchor="middle" font-size="13" fill="${GREY}">${n}</text>`;
  }
  for (const [q, n] of Object.entries(back)) {
    const x = colX(q), y0 = BY + BH, w = Math.min(16, 2 + 1.5 * n), L = x + 22, R = x + BW - 14, yb = y0 + 22 + w / 2;
    svg += `<path d="M${R},${y0 + 2} L${R},${yb - 10} Q${R},${yb} ${R - 10},${yb} L${L + 10},${yb} Q${L},${yb} ${L},${yb - 10} L${L},${y0 + 13}" fill="none" stroke="${GREY}" stroke-width="${w}"/>`;
    svg += `<path d="M${L - w / 2 - 6},${y0 + 15} L${L},${y0 + 2} L${L + w / 2 + 6},${y0 + 15} Z" fill="${GREY}"/>`;
    svg += `<text x="${x + BW / 2}" y="${yb + w / 2 + 16}" text-anchor="middle" font-size="13" fill="${GREY}">${n} back</text>`;
  }
  const probText = p => Object.entries(fr.prob[p] || {}).map(([k, n]) => `${PROB[k] || k} ${n}`).join(', ');
  // main steps
  for (const c of MAIN) {
    const x = colX(c), t = fr.tok[c] || 0, s = sq(t, 90), bad = fr.prob[c];
    svg += `<rect x="${x}" y="${BY}" width="${BW}" height="${BH}" rx="6" fill="#f4f6f8" stroke="${bad ? RED : '#9aa3ad'}" stroke-width="${bad ? 3 : 1.5}"/>`;
    svg += `<text x="${x + BW / 2}" y="${BY + 20}" text-anchor="middle" font-size="16" font-weight="700" fill="${INK}">${NAME[c]}</text>`;
    if (s) svg += `<rect x="${x + BW / 2 - s / 2}" y="${BY + 72 - s / 2}" width="${s}" height="${s}" fill="#4a5a6c"/>`;
    svg += `<text x="${x + BW / 2}" y="${BY + 136}" text-anchor="middle" font-size="15" fill="${INK}">${M(t)}</text>`;
    if (bad) svg += `<text x="${x + BW / 2}" y="${BY + BH - 10}" text-anchor="middle" font-size="13" font-weight="700" fill="${RED}">${esc(probText(c))}</text>`;
  }
  // side chips: notes and library left of Plan, the controls under their steps
  const chip = (p, x, y, w, h) => {
    const t = fr.tok[p] || 0, s = sq(t, h - 14), bad = fr.prob[p], r = fr.ref[p];
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#fafbfc" stroke="${bad ? RED : '#c3c9d0'}" stroke-width="${bad ? 3 : 1}"/>`;
    svg += `<text x="${x + 7}" y="${y + 17}" font-size="14" font-weight="700" fill="${t || bad ? INK : '#9aa3ad'}">${NAME[p]}</text><text x="${x + 7}" y="${y + 34}" font-size="13" fill="${INK}">${M(t)}</text>`;
    if (r) svg += `<text x="${x + 7}" y="${y + h - 6}" font-size="12" fill="${GREY}">${r} refused</text>`;
    if (bad) svg += `<text x="${x + 7}" y="${y + h + 15}" font-size="13" font-weight="700" fill="${RED}">${esc(probText(p))}</text>`;
    if (s) svg += `<rect x="${x + w - 8 - s}" y="${y + h / 2 - s / 2}" width="${s}" height="${s}" fill="#4a5a6c"/>`;
  };
  chip('B5', ox + 22, BY, C1, 78); chip('B3', ox + 22, BY + 90, C1, 78);
  for (const [p, under] of Object.entries(SIDE)) chip(p, colX(under), oy + 372, BW, 56);
  // where each session is at the frame's end
  for (const [col, list] of Object.entries(fr.tags)) {
    const x = col === 'B5' || col === 'B3' ? ox + 22 : colX(col); if (x === undefined || isNaN(x)) continue;
    list.sort((p, q) => q.run - p.run); const show = list.slice(0, list.length > 5 ? 4 : 5);
    show.forEach((g, j) => { const y = BY - 8 - (show.length - 1 - j) * 17 - (list.length > 5 ? 17 : 0);
      svg += `<circle cx="${x + 6}" cy="${y - 5}" r="5" fill="${g.run ? BLUE : '#fff'}" stroke="${g.run ? BLUE : '#8a939e'}" stroke-width="1.5"/><text x="${x + 15}" y="${y}" font-size="14" fill="${g.run ? INK : '#8a939e'}" font-weight="${g.run ? 600 : 400}">${esc(g.n)}</text>`; });
    if (list.length > 5) svg += `<text x="${x + 15}" y="${BY - 8}" font-size="13" fill="${GREY}">+${list.length - 4} more</text>`;
  }
  svg += `<text x="${ox + 18}" y="${oy + 488}" font-size="13" fill="${GREY}">Not drawn: ${skip} moves that skipped a step, ${fr.side} moves to or from the side boxes.</text>`;
});
const title = `Where the work went · Tue 24 Nov, ${hm(A)} to ${hm(A + NF * F)}`;
const legend = 'square = tokens spent there · arrow = work moving on to the next step · loop = work sent back to this step · thicker = more often · ● still running ○ ended · red = a rule broke there';
fs.writeFileSync(OUT, `<!doctype html><meta charset="utf-8"><title>Monitor proof of concept</title><style>body{margin:0;background:#eef1f4}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" font-family="Segoe UI, system-ui, sans-serif"><rect width="1920" height="1080" fill="#eef1f4"/>
<text x="16" y="32" font-size="22" font-weight="700" fill="${INK}">${esc(title)}</text><text x="1904" y="31" text-anchor="end" font-size="14" fill="${GREY}" id="legend">${esc(legend)}</text>${svg}</svg>`);
console.log(frames.map(fr => `${hm(fr.a)} ${M(fr.total)} s${fr.ns} h${fr.nh} side${fr.side}`).join(' | '));
