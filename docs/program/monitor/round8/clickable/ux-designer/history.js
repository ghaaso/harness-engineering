/* History: the week as seven strips, one day opened as session lanes with the hooks on the same clock. */
'use strict';
(function () {
  const A = window.App, D = A.D, S = A.S, $ = A.$, $$ = A.$$, esc = A.esc, hue = A.hue, hm = A.hm, dur = A.dur, tok = A.tok, GL = A.GL, RK = A.RK;
  const T0 = A.T0, SPAN = A.T1 - A.T0, NB = Math.ceil(SPAN / 5), FW = 64, GUT = 304, LH = 34, HR = 15;
  const days = D.week.days, tue = days[6];
  let day = 6, dom = [0, SPAN], filter = 'all', sc = null, raf = 0, built = false;
  const folds = [], gaps = [];
  (function () { let run = 0; for (let i = 0; i <= NB; i++) { const q = i < NB && tue.sessions[i] === 0 && tue.helpers[i] === 0; if (q) run++; else { if (run >= 4) { const g = [(i - run) * 5, Math.min(i * 5, SPAN)]; gaps.push(g); if (run >= 18) folds.push(g); } run = 0; } } })();

  /* rows: the 20 sessions as a tree, a child under its parent */
  const byId = {}; D.sessions.forEach(s => { byId[s.id] = s; });
  const kids = {}, roots = []; D.sessions.forEach(s => { if (s.parent && byId[s.parent]) (kids[s.parent] = kids[s.parent] || []).push(s); else roots.push(s); });
  const rowsAll = [], st = (a, b) => a.start - b.start;
  (function walk(list, d) { list.sort(st).forEach(s => { rowsAll.push({ s, d }); walk(kids[s.id] || [], d + 1); }); })(roots, 0);
  const maxTok = Math.max(...D.sessions.map(s => s.tokensTotal));
  const lane = {};
  D.sessions.forEach(s => {
    const conc = new Array(NB).fill(0); s.helpers.forEach(h => { const a = Math.max(0, Math.floor((h.start - T0) / 5)), b = Math.min(NB - 1, Math.floor(((h.end == null ? A.T1 : h.end) - T0) / 5)); for (let i = a; i <= b; i++) conc[i]++; });
    lane[s.id] = { segs: s.segs.map(g => [g[0] - T0, g[1] - T0]), waits: s.waits.map(w => [w[0] - T0, w[1] - T0, w[2]]), ev: D.events.filter(e => e.session === s.id && e.result !== 'passed'), owner: s.owner.map(m => m - T0), conc };
  });
  const hooks = D.parts.filter(p => p.group === 'Hooks');
  const hookRun = {};
  hooks.forEach(h => { const b = new Array(NB).fill(false); (A.evByPart[h.id] || []).forEach(e => { if (e.result === 'passed') { const i = Math.floor((e.t - T0) / 5); if (i >= 0 && i < NB) b[i] = true; } }); const runs = []; let r = 0; for (let i = 0; i <= NB; i++) { if (i < NB && b[i]) r++; else { if (r) runs.push([(i - r) * 5, i * 5]); r = 0; } } hookRun[h.id] = runs; });

  /* time scale with the long quiet stretch folded to a fixed width */
  function makeScale(d0, d1, L, R) {
    const fs = folds.filter(f => f[1] > d0 && f[0] < d1).map(f => [Math.max(f[0], d0), Math.min(f[1], d1)]);
    const fl = fs.reduce((a, f) => a + f[1] - f[0], 0), k = ((R - L) - fs.length * FW) / Math.max(1, (d1 - d0) - fl);
    const x = t => { let p = L, c = d0; for (const f of fs) { if (t <= f[0]) return p + (t - c) * k; p += (f[0] - c) * k; if (t <= f[1]) return p + (t - f[0]) / (f[1] - f[0]) * FW; p += FW; c = f[1]; } return p + (t - c) * k; };
    const inv = px => { let p = L, c = d0; for (const f of fs) { const e = p + (f[0] - c) * k; if (px <= e) return c + (px - p) / k; p = e; if (px <= p + FW) return f[0] + (px - p) / FW * (f[1] - f[0]); p += FW; c = f[1]; } return c + (px - p) / k; };
    return { x, inv, fs, k, L, R };
  }
  const tri = (x, y, s) => '<path d="M' + x + ' ' + (y - s) + ' l' + (s * .95) + ' ' + (s * 1.7) + ' h' + (-s * 1.9) + 'z" fill="#c0231a" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/>';
  const dot = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#d17a00" stroke="#fff" stroke-width="1.3"/>';
  const evTip = e => hm(e.t) + ' · ' + ((D.partById[e.part] || {}).name) + ' ' + A.RW[e.result] + ' · ' + ((byId[e.session] || {}).tag);

  /* ---------- the week ---------- */
  function buildWeek() {
    const host = $('#hWeek'); host.innerHTML = ''; const w = Math.max(300, host.clientWidth - 96);
    days.forEach((d, di) => {
      const l = document.createElement('button'); l.className = 'wl'; l.textContent = d.label; l.setAttribute('aria-pressed', di === day); l.onclick = () => selDay(di); host.appendChild(l);
      const s = document.createElement('div'); s.className = 'ws' + (di === day ? ' sel' : ''); s.dataset.d = di;
      const bw = w / 288; let g = '<svg width="' + w + '" height="26">';
      for (let i = 0; i < 288; i++) { const hv = Math.min(11, d.helpers[i] * .9); if (hv > 0) g += '<rect x="' + (i * bw) + '" y="' + (24 - hv) + '" width="' + (bw + .3) + '" height="' + hv + '" fill="#d9d4c8"/>'; }
      for (let i = 0; i < 288; i++) { const sv = Math.min(16, d.sessions[i] * 4.5); if (sv > 0) g += '<rect x="' + (i * bw) + '" y="' + (24 - sv) + '" width="' + (bw + .3) + '" height="' + sv + '" fill="#7d8aa0"/>'; }
      for (let i = 0; i < 288; i++) if (d.trouble[i] > 0) g += '<rect x="' + (i * bw - .5) + '" y="1" width="2.4" height="' + Math.min(9, 3 + d.trouble[i] * .5) + '" fill="#c0231a"/>';
      if (di === 6) { const bx = dom[0] / 1440 * w, bwid = Math.max(6, (dom[1] - dom[0]) / 1440 * w); g += '<rect x="' + bx + '" y="1" width="' + bwid + '" height="23" fill="rgba(28,27,25,.07)" stroke="#1c1b19" stroke-width="1.5" rx="3"/>'; }
      g += '</svg>'; s.innerHTML = g;
      s.onclick = e => { if (di === 6 && day === 6) { const b = s.getBoundingClientRect(), t = (e.clientX - b.left) / w * 1440, half = (dom[1] - dom[0]) / 2; let a = t - half; a = Math.max(0, Math.min(SPAN - 2 * half, a)); dom = [a, a + 2 * half]; schedule(); } else selDay(di); };
      host.appendChild(s);
    });
  }
  function selDay(di) { day = di; dom = [0, SPAN]; $('#hTitle').textContent = days[di].label; $('#hFilter').style.visibility = di === 6 ? '' : 'hidden'; buildWeek(); schedule(); }

  /* ---------- the day ---------- */
  function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderDay); }
  function renderDay() {
    if (S.page !== 'history') return;
    const root = $('#hDay'), W = root.clientWidth; if (!W) return; const L = GUT, R = W - 22; sc = makeScale(dom[0], dom[1], L, R);
    $('#hReset').hidden = !(dom[0] > .5 || dom[1] < SPAN - .5); $('#hWin').textContent = (dom[0] > .5 || dom[1] < SPAN - .5) ? hm(T0 + dom[0]) + ' to ' + hm(T0 + dom[1]) : '';
    if (day !== 6) return renderCounts(W);
    const x = sc.x, len = dom[1] - dom[0], step = len > 400 ? 60 : len > 150 ? 30 : len > 60 ? 10 : 5;
    const inFold = t => sc.fs.some(f => t > f[0] + 1 && t < f[1] - 1);
    const clipx = (a, b) => { const x1 = Math.max(x(a), L), x2 = Math.min(x(b), R); return x2 > x1 ? [x1, x2] : null; };
    /* axis */
    let ax = '<svg width="' + W + '" height="46"><rect x="0" y="0" width="' + W + '" height="46" fill="#fff"/>';
    for (let t = Math.ceil(dom[0] / step) * step; t <= dom[1]; t += step) { if (inFold(t)) continue; const px = x(t); if (px < L || px > R) continue; ax += '<line x1="' + px + '" x2="' + px + '" y1="30" y2="46" stroke="#cfc9bb"/><text x="' + px + '" y="22" text-anchor="middle" style="font-size:13px;font-weight:600;fill:#4e4b44">' + hm(T0 + t) + '</text>'; }
    sc.fs.forEach(f => { const a = x(f[0]), b = x(f[1]); ax += '<path d="M' + a + ' 40 v-8 h' + (b - a) + ' v8" fill="none" stroke="#6b675d" stroke-width="1.5"/><text x="' + (a + b) / 2 + '" y="22" text-anchor="middle" style="font-size:13px;font-weight:700;fill:#1c1b19">' + dur(f[1] - f[0]) + ' folded</text>'; });
    gaps.forEach(g => { if (folds.includes(g)) return; const c = clipx(g[0], g[1]); if (c && c[1] - c[0] > 4) ax += '<path d="M' + c[0] + ' 42 v-6 h' + (c[1] - c[0]) + ' v6" fill="none" stroke="#9a9588"/>' + (c[1] - c[0] > 118 ? '<text x="' + (c[0] + c[1]) / 2 + '" y="32" text-anchor="middle" style="font-size:12px;font-weight:600;fill:#6b675d">nothing ran ' + dur(g[1] - g[0]) + '</text>' : ''); });
    ax += '<text x="14" y="32" style="font-size:13px;font-weight:700;fill:#6b675d;letter-spacing:.06em">SESSIONS</text></svg>';
    $('#hAxis').innerHTML = ax;
    /* lanes */
    const rows = rowsAll.filter(r => filter === 'all' || (filter === 'trouble' ? lane[r.s.id].ev.length : lane[r.s.id].waits.length));
    const H = Math.max(rows.length * LH, 40);
    let ls = '<svg width="' + W + '" height="' + H + '"><defs><pattern id="bh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#e8eeff"/><line x1="0" y1="0" x2="0" y2="6" stroke="#1f56d6" stroke-width="2"/></pattern><pattern id="fh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#f6f4ef"/><line x1="0" y1="0" x2="0" y2="7" stroke="#dcd7cb" stroke-width="2.4"/></pattern></defs>';
    sc.fs.forEach(f => { ls += '<rect x="' + x(f[0]) + '" y="0" width="' + FW + '" height="' + H + '" fill="url(#fh)"/>'; });
    const gl = []; for (let t = Math.ceil(dom[0] / step) * step; t <= dom[1]; t += step) { if (inFold(t)) continue; const px = x(t); if (px >= L && px <= R) gl.push(px); }
    gl.forEach(px => { ls += '<line x1="' + px + '" x2="' + px + '" y1="0" y2="' + H + '" stroke="#efece4"/>'; });
    rows.forEach((r, i) => {
      const s = r.s, ln = lane[s.id], y = i * LH, ix = 14 + r.d * 16;
      ls += '<line x1="0" x2="' + W + '" y1="' + (y + LH - .5) + '" y2="' + (y + LH - .5) + '" stroke="#f0ede5"/>';
      if (r.d) ls += '<path d="M' + (ix - 8) + ' ' + y + ' V' + (y + 17) + ' H' + (ix - 2) + '" fill="none" stroke="#c9c4b6"/>';
      const tw = 14 + s.tag.length * 8, maxc = Math.max(8, Math.floor((GUT - ix - tw - 92) / 7.1)), title = s.name.length > maxc ? s.name.slice(0, maxc - 1) + '…' : s.name;
      ls += '<g class="lab" data-sess="' + s.id + '" tabindex="0" role="button" aria-label="' + esc(s.tag + ', ' + s.name) + '"><rect x="0" y="' + y + '" width="' + (GUT - 6) + '" height="' + (LH - 1) + '" fill="transparent"/><rect x="' + ix + '" y="' + (y + 8) + '" width="' + tw + '" height="17" rx="5" fill="' + hue(s.id) + '"/><text x="' + (ix + 7) + '" y="' + (y + 21) + '" style="fill:#fff;font-size:12.5px;font-weight:700">' + esc(s.tag) + '</text><text class="lt" x="' + (ix + tw + 8) + '" y="' + (y + 21) + '" style="font-size:14px;font-weight:600">' + esc(title) + '</text><rect x="' + (GUT - 70) + '" y="' + (y + 12) + '" width="' + Math.max(2, s.tokensTotal / maxTok * 58) + '" height="8" rx="2" fill="' + hue(s.id) + '" opacity=".5" data-tip="' + esc(s.tag + ' spent ' + tok(s.tokensTotal) + ' tokens (tool-call count)') + '"/></g>';
      const b0 = clipx(Math.max(0, s.start - T0), (s.end == null ? SPAN : s.end - T0)); if (b0) ls += '<line x1="' + b0[0] + '" x2="' + b0[1] + '" y1="' + (y + 11) + '" y2="' + (y + 11) + '" stroke="#c4bfb1" stroke-width="2"/>';
      for (let k = Math.max(0, Math.floor(dom[0] / 5)); k <= Math.min(NB - 1, Math.floor(dom[1] / 5)); k++) { const c = ln.conc[k]; if (!c) continue; const cc = clipx(k * 5, k * 5 + 5); if (cc) ls += '<rect x="' + cc[0] + '" y="' + (y + LH - 3 - Math.min(9, c * 1.4)) + '" width="' + (cc[1] - cc[0] + .4) + '" height="' + Math.min(9, c * 1.4) + '" fill="' + hue(s.id) + '" opacity=".35"/>'; }
      ln.waits.forEach(w => { const c = clipx(w[0], w[1]); if (c) ls += '<rect class="bar" data-sess="' + s.id + '" data-tip="' + esc(s.tag + ' waited for you ' + hm(T0 + w[0]) + ' to ' + hm(T0 + w[1]) + ' · ' + dur(w[1] - w[0])) + '" x="' + c[0] + '" y="' + (y + 5) + '" width="' + Math.max(3, c[1] - c[0]) + '" height="12" rx="3" fill="url(#bh)" stroke="#1f56d6" stroke-width="1.2"/>'; });
      ln.segs.forEach(g => { const c = clipx(g[0], g[1]); if (c) ls += '<rect class="bar" data-sess="' + s.id + '" data-tip="' + esc(s.tag + ' worked ' + hm(T0 + g[0]) + ' to ' + hm(T0 + g[1]) + ' · ' + dur(g[1] - g[0])) + '" x="' + c[0] + '" y="' + (y + 5) + '" width="' + Math.max(2, c[1] - c[0]) + '" height="12" rx="3" fill="' + hue(s.id) + '"/>'; });
      ln.owner.forEach(m => { const px = x(m); if (px >= L && px <= R) ls += '<circle cx="' + px + '" cy="' + (y + 23) + '" r="2.8" fill="#1f56d6"/>'; });
      ln.ev.forEach(e => { const px = x(e.t - T0); if (px < L || px > R) return; ls += '<g data-ev="' + e.i + '" data-tip="' + esc(evTip(e)) + '">' + (e.result === 'failed' ? tri(px, y + 11, 5.5) : e.result === 'refused' ? dot(px, y + 11, 4.6) : '') + '</g>'; });
    });
    if (!rows.length) ls += '<text x="' + (L + 20) + '" y="28" style="font-size:14px;fill:#6b675d">No session matches this filter.</text>';
    $('#hLanes').innerHTML = ls + '</svg>';
    /* hooks, pinned under the lanes, same clock */
    let hs = '<svg width="' + W + '" height="' + (hooks.length * HR + 22) + '"><text x="14" y="15" style="font-size:13px;font-weight:700;fill:#6b675d;letter-spacing:.06em">HOOKS</text>';
    sc.fs.forEach(f => { hs += '<rect x="' + x(f[0]) + '" y="22" width="' + FW + '" height="' + hooks.length * HR + '" fill="url(#fh)"/>'; });
    hooks.forEach((h, i) => {
      const y = 22 + i * HR; hs += '<g class="lab" data-hook="' + h.id + '" tabindex="0" role="button" aria-label="' + esc(h.name) + '"><rect x="0" y="' + y + '" width="' + (GUT - 6) + '" height="' + HR + '" fill="transparent"/><text class="lt" x="14" y="' + (y + 11.5) + '" style="font-size:13px;font-weight:600">' + esc(h.name) + '</text></g><line x1="' + L + '" x2="' + R + '" y1="' + (y + HR - .5) + '" y2="' + (y + HR - .5) + '" stroke="#f3f0e8"/>';
      if (!(A.evByPart[h.id] || []).length) hs += '<text x="' + (L + 8) + '" y="' + (y + 11.5) + '" style="font-size:12px;fill:#6b675d">never fired today</text>';
      hookRun[h.id].forEach(r => { const c = clipx(r[0], r[1]); if (c) hs += '<rect x="' + c[0] + '" y="' + (y + 5) + '" width="' + Math.max(1.5, c[1] - c[0]) + '" height="4.5" rx="1.5" fill="#d3cec1"/>'; });
      (A.evByPart[h.id] || []).forEach(e => { if (e.result === 'passed') return; const px = x(e.t - T0); if (px < L || px > R) return; hs += '<g data-ev="' + e.i + '" data-tip="' + esc(evTip(e)) + '">' + (e.result === 'failed' ? tri(px, y + 7.2, 4.2) : dot(px, y + 7.2, 3.6)) + '</g>'; });
    });
    $('#hHooks').innerHTML = hs + '</svg>';
  }
  function renderCounts(W) { // days other than Tuesday: counts only
    const d = days[day], L = GUT, R = W - 22, bw = (R - L) / 288; $('#hAxis').innerHTML = ''; $('#hHooks').innerHTML = '';
    let s = '<svg width="' + W + '" height="400">';
    [['SESSIONS WORKING', d.sessions, '#7d8aa0', 9], ['HELPERS RUNNING', d.helpers, '#b9b3a4', 3.2], ['HOOK TROUBLE', d.trouble, '#c0231a', 4]].forEach((c, k) => {
      const y0 = 26 + k * 124; s += '<text x="14" y="' + (y0 + 6) + '" style="font-size:13px;font-weight:700;fill:#6b675d;letter-spacing:.06em">' + c[0] + '</text><line x1="' + L + '" x2="' + R + '" y1="' + (y0 + 90) + '" y2="' + (y0 + 90) + '" stroke="#cfc9bb"/>';
      c[1].forEach((v, i) => { if (v > 0) s += '<rect x="' + (L + i * bw) + '" y="' + (y0 + 90 - Math.min(84, v * c[3])) + '" width="' + (bw + .3) + '" height="' + Math.min(84, v * c[3]) + '" fill="' + c[2] + '"/>'; });
    });
    for (let hh = 0; hh <= 24; hh += 3) s += '<text x="' + (L + hh / 24 * (R - L)) + '" y="392" text-anchor="middle" style="font-size:12.5px;font-weight:600;fill:#6b675d">' + String(hh % 24).padStart(2, '0') + ':00</text>';
    $('#hLanes').innerHTML = s + '</svg>';
  }

  /* ---------- interaction ---------- */
  const root = $('#hDay'), xh = $('#xhair'), tip = $('#tip');
  root.addEventListener('pointermove', e => {
    const b = root.getBoundingClientRect(), px = e.clientX - b.left;
    if (sc && day === 6 && px >= sc.L && px <= sc.R) { xh.hidden = false; xh.style.left = px + 'px'; $('span', xh).textContent = hm(T0 + sc.inv(px)); } else xh.hidden = true;
    const t = e.target.closest('[data-tip]'); if (t) { tip.hidden = false; tip.textContent = t.dataset.tip; tip.style.left = Math.min(innerWidth - 350, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 18) + 'px'; } else tip.hidden = true;
    $$('.hl', root).forEach(n => n.classList.remove('hl')); const ev = e.target.closest('[data-ev]'); if (ev) $$('[data-ev="' + ev.dataset.ev + '"]', root).forEach(n => n.classList.add('hl'));
    if (pn && day === 6) { const dx = e.clientX - pn.x; if (!pn.on && Math.abs(dx) > 5) { pn.on = true; A.hidePop(); } if (pn.on) { const dt = -dx / sc.k; let a = pn.d0 + dt, bb = pn.d1 + dt; if (a < 0) { bb -= a; a = 0; } if (bb > SPAN) { a -= bb - SPAN; bb = SPAN; } dom = [Math.max(0, a), Math.min(SPAN, bb)]; schedule(); } }
  });
  root.addEventListener('pointerleave', () => { xh.hidden = true; tip.hidden = true; });
  let pn = null;
  root.addEventListener('pointerdown', e => { if (day !== 6 || e.target.closest('.lab,[data-ev],.bar')) return; if (!(dom[0] > .5 || dom[1] < SPAN - .5)) return; pn = { x: e.clientX, d0: dom[0], d1: dom[1], on: false }; });
  window.addEventListener('pointerup', () => { if (pn && pn.on) { pn.sup = true; setTimeout(() => { pn = null; }, 0); } else pn = null; });
  root.addEventListener('wheel', e => {
    if (day !== 6 || !sc) return; e.preventDefault(); const b = root.getBoundingClientRect(), px = Math.max(sc.L, Math.min(sc.R, e.clientX - b.left)), t = sc.inv(px), f = Math.exp(e.deltaY * 0.0016);
    let a = t - (t - dom[0]) * f, bb = t + (dom[1] - t) * f; if (bb - a < 20) { const c = (a + bb) / 2; a = c - 10; bb = c + 10; } if (bb - a >= SPAN) { a = 0; bb = SPAN; } if (a < 0) { bb -= a; a = 0; } if (bb > SPAN) { a -= bb - SPAN; bb = SPAN; }
    dom = [a, bb]; schedule(); buildWeekBrush();
  }, { passive: false });
  function buildWeekBrush() { const s = $('#hWeek .ws.sel svg'); if (!s || day !== 6) return; let r = $('rect[data-brush]', s); const w = s.getAttribute('width'); if (!r) { r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('data-brush', 1); r.setAttribute('y', 1); r.setAttribute('height', 23); r.setAttribute('rx', 3); r.setAttribute('fill', 'rgba(28,27,25,.07)'); r.setAttribute('stroke', '#1c1b19'); r.setAttribute('stroke-width', 1.5); s.appendChild(r); } r.setAttribute('x', dom[0] / 1440 * w); r.setAttribute('width', Math.max(6, (dom[1] - dom[0]) / 1440 * w)); $$('rect[stroke="#1c1b19"]:not([data-brush])', s).forEach(n => n.remove()); }
  root.addEventListener('click', e => {
    if (pn && pn.sup) return;
    const ev = e.target.closest('[data-ev]');
    if (ev) { const x = D.events[+ev.dataset.ev], s = byId[x.session], p = D.partById[x.part]; return A.showPop(ev, '<h4>' + esc(p.name) + ' ' + A.RW[x.result] + '</h4><div class="sub">' + hm(x.t) + ' · ' + esc(s.tag) + ' · ' + esc(s.name) + '</div><div class="row"><button class="btn primary sm" data-s>Open ' + esc(s.tag) + '</button><button class="btn sm" data-p>Open ' + esc(p.name) + '</button></div>', el => { el.onclick = k => { if (k.target.closest('[data-s]')) A.openSession(s.id); else if (k.target.closest('[data-p]')) A.inspectPart(p.id, ev); }; }); }
    const hk = e.target.closest('[data-hook]'); if (hk) return A.inspectPart(hk.dataset.hook, hk);
    const sl = e.target.closest('[data-sess]'); if (sl) return A.openSession(sl.dataset.sess);
  });
  root.addEventListener('dblclick', e => { const hk = e.target.closest('[data-hook]'); if (hk) { A.hidePop(); A.openPart(hk.dataset.hook, hk); } });
  root.addEventListener('keydown', e => { const n = e.target.closest('.lab'); if (!n) return; if (e.key === 'Enter') { e.preventDefault(); if (n.dataset.sess) A.openSession(n.dataset.sess); else if (e.shiftKey) A.openPart(n.dataset.hook, n); else A.inspectPart(n.dataset.hook, n); } else if (e.key === 'o' && n.dataset.hook) A.openPart(n.dataset.hook, n); });
  $('#hFilter').onclick = e => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.f; $$('#hFilter button').forEach(x => x.setAttribute('aria-pressed', x === b)); schedule(); };
  $('#hReset').onclick = () => { dom = [0, SPAN]; schedule(); buildWeekBrush(); };
  window.addEventListener('resize', () => { if (S.page === 'history') { buildWeek(); schedule(); } });

  A.mods.push({
    init() {
      A.on('page', p => { if (p === 'history') { setTimeout(() => { buildWeek(); schedule(); }, 0); } });
      if (S.page === 'history') { setTimeout(() => { buildWeek(); schedule(); if (A.Q.get('day')) selDay(+A.Q.get('day')); if (A.Q.get('win')) { const [a, b] = A.Q.get('win').split('-').map(v => { const q = v.split(':'); return +q[0] * 60 + (+q[1] || 0); }); dom = [a, b]; schedule(); buildWeek(); } if (A.Q.get('filter')) { filter = A.Q.get('filter'); $$('#hFilter button').forEach(x => x.setAttribute('aria-pressed', x.dataset.f === filter)); schedule(); } }, 30); }
    }
  });
})();
