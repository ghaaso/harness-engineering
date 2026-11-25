/* Now: one canvas of sessions, helpers and the real parts; semantic zoom; time strip underneath. */
'use strict';
(function () {
  const A = window.App, D = A.D, S = A.S, $ = A.$, $$ = A.$$, esc = A.esc, hue = A.hue, hm = A.hm, dur = A.dur, tok = A.tok, GL = A.GL, RK = A.RK;
  const stage = $('#stage'), world = $('#world'), links = $('#links');
  const CW = 178, CH = 36, GAP = 8, LAB = 28, BX = -12, BY = -8, BW = 2160, BH = 936;
  const cam = { x: 0, y: 0, z: 1 }; let fitZ = 1, userMoved = false, tw = 0, dragMoved = false;
  const N = { part: {}, hook: {}, sess: {} }; const vis = { key: '' }; let lay = { out: {} }; const lastUse = {}; let lastMi = -1;
  const el = (c, h) => { const d = document.createElement('div'); d.className = c; if (h != null) d.innerHTML = h; return d; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- static canvas: islands, hooks, parts ---------- */
  const ZN = [
    { t: 'Helper kinds', g: ['Helper kinds'], x: 1392, y: 152, c: 4 },
    { t: 'Commands', g: ['Commands'], x: 1392, y: 334, c: 4 },
    { t: 'Skills', g: ['Skills', 'Slash commands'], x: 1392, y: 470, c: 4 },
    { t: 'Scripts', g: ['Scripts'], x: 0, y: 656, c: 3 },
    { t: 'Tests and git', g: ['Tests and git'], x: 586, y: 656, c: 2 },
    { t: 'Stores and settings', g: ['Stores and settings'], x: 986, y: 656, c: 2 },
    { t: 'Documents', g: ['Documents'], x: 1392, y: 656, c: 4 }
  ];
  const regions = [];
  function island(x, y, w, h, label, n, cls) {
    const z = el('zone'); Object.assign(z.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    world.insertBefore(z, links.nextSibling);
    const l = el('zlabel', esc(label) + (n != null ? '<b>' + n + '</b>' : '')); l.style.left = (x + 12) + 'px'; l.style.top = (y + 8) + 'px'; world.appendChild(l);
    regions.push({ x, y, w, h, cls: cls || '' });
  }
  function buildStatic() {
    island(BX, BY, 2160, 140, 'Hooks', null, 'h');
    island(BX, 144, 1380, 496, 'Sessions', null, 's');
    $$('.zlabel', world).forEach(l => { if (l.textContent.startsWith('Hooks')) { l.style.top = '0px'; } });
    ZN.forEach(z => {
      const ps = D.parts.filter(p => z.g.includes(p.group)); const rows = Math.ceil(ps.length / z.c);
      island(z.x - 12, z.y - 8, z.c * (CW + GAP) - GAP + 24, LAB + rows * (CH + GAP) + 6, z.t, ps.length);
      $$('.zlabel', world).pop().style.top = (z.y - 2) + 'px';
      ps.forEach((p, i) => {
        const b = document.createElement('button'); b.className = 'part'; b.dataset.part = p.id; b.dataset.group = p.group;
        b.style.left = (z.x + (i % z.c) * (CW + GAP)) + 'px'; b.style.top = (z.y + LAB + Math.floor(i / z.c) * (CH + GAP)) + 'px';
        b.setAttribute('aria-label', p.name + ', ' + p.group);
        b.innerHTML = '<span class="p-name">' + (p.group === 'Slash commands' ? '/' : '') + esc(p.name) + '</span>' + (p.model ? '<span class="p-sub">' + esc(p.model) + '</span>' : '') + '<span class="dots"></span><span class="p-path">' + esc(p.file) + '</span>';
        world.appendChild(b); N.part[p.id] = b;
      });
    });
    D.parts.filter(p => p.group === 'Hooks').forEach((p, i) => {
      const b = document.createElement('button'); b.className = 'hook'; b.dataset.part = p.id; b.style.left = (i * 214.9) + 'px'; b.style.top = '28px'; b.style.width = '202px';
      b.setAttribute('aria-label', p.name + ', hook');
      b.innerHTML = '<div class="h-top"><span>' + esc(p.name) + '</span><i class="h-live"></i></div><div class="h-strip">' + '<i></i>'.repeat(12) + '</div><div class="h-foot"></div>';
      if (!A.evByPart[p.id]) b.classList.add('dead');
      world.appendChild(b); N.hook[p.id] = b;
    });
  }

  /* ---------- session cards ---------- */
  function addCard(s) {
    const c = document.createElement('div'); c.className = 'sess gone'; c.tabIndex = 0; c.setAttribute('role', 'button'); c.dataset.id = s.id; c.style.setProperty('--h', hue(s.id));
    c.innerHTML = '<div class="s-head"><span class="tag">' + esc(s.tag) + '</span><span class="s-title"></span><span class="s-marks"></span></div><div class="s-state"><i></i><b></b><span class="s-step"></span></div><div class="s-ask"></div><div class="s-help"></div><div class="s-more"></div>' +
      '<div class="s-foot"><span class="s-spark"></span><span class="s-tok" style="margin-left:auto"></span></div>' +
      '<div class="s-act"><button class="btn primary sm" data-act="answer">Answer</button><button class="btn danger sm" data-act="stop">Stop</button></div>' +
      '<div class="s-conf"><span>Stop ' + esc(s.tag) + '?</span><button class="btn danger sm" data-act="stop-yes">Stop it</button><button class="btn sm" data-act="stop-no">Keep it</button></div>';
    world.appendChild(c); N.sess[s.id] = c; return c;
  }
  function doLayout(list) {
    const ids = new Set(list.map(s => s.id)), kids = {}, roots = [];
    list.forEach(s => { if (s.parent && ids.has(s.parent)) (kids[s.parent] = kids[s.parent] || []).push(s); else roots.push(s); });
    const byStart = (a, b) => a.start - b.start; roots.sort(byStart); Object.keys(kids).forEach(k => kids[k].sort(byStart));
    let row = 0, maxD = 0; const pos = {};
    const place = (s, d) => { maxD = Math.max(maxD, d); const k = kids[s.id] || []; if (!k.length) pos[s.id] = { d, r: row++ }; else { const f = row; k.forEach(c => place(c, d + 1)); pos[s.id] = { d, r: (f + row - 1) / 2 }; } };
    roots.forEach(r => place(r, 0));
    const rows = Math.max(1, row), cols = maxD + 1, gx = 30, gy = 10, AW = 1356, AH = 452, Y0 = 184;
    const want = s => s.state === 'waiting' ? 136 : s.state === 'working' ? (rows <= 4 ? 150 : 98) : s.state === 'quiet' ? 68 : 48;
    const rowH = new Array(rows).fill(48);
    list.forEach(s => { const f = Math.floor(pos[s.id].r); rowH[f] = Math.max(rowH[f], want(s)); });
    const gaps = (rows - 1) * gy, sum = rowH.reduce((a, b) => a + b, 0), k = sum + gaps > AH ? (AH - gaps) / sum : 1;
    const rowTop = []; let acc = 0; for (let i = 0; i < rows; i++) { rowH[i] *= k; rowTop.push(acc); acc += rowH[i] + gy; }
    const used = acc - gy, oy = Y0 + Math.max(0, Math.min(40, (AH - used) / 2));
    const cw = Math.min(420, (AW - (cols - 1) * gx) / cols); const out = {};
    list.forEach(s => {
      const p = pos[s.id], f = Math.floor(p.r), cf = Math.min(rows - 1, Math.ceil(p.r)), y = rowTop[f] + (p.r - f) * ((rowTop[cf] || 0) - rowTop[f]);
      out[s.id] = { x: p.d * (cw + gx), y: oy + y, w: cw, h: rowH[f] };
    });
    lay = { out };
    Object.keys(N.sess).forEach(id => {
      const c = N.sess[id], o = out[id];
      if (!o) { c.classList.add('gone'); return; }
      if (!c._placed) { c.style.transition = 'none'; }
      c.style.transform = 'translate(' + o.x + 'px,' + o.y + 'px)'; c.style.width = o.w + 'px'; c.style.height = o.h + 'px';
      c.classList.toggle('compact', o.h < 66); c.classList.toggle('tight', o.h < 108); c.classList.toggle('roomy', o.h >= 138);
      if (!c._placed) { c.classList.remove('gone'); void c.offsetWidth; c.style.transition = ''; c._placed = true; }
      c.classList.remove('gone');
    });
    drawLinks();
  }
  const stateWord = s => ({ working: 'working', waiting: 'waits for you · ' + dur(S.m - (s.since || S.m)), quiet: 'quiet' + (S.m - (s.since || S.m) >= 1 ? ' · ' + dur(S.m - (s.since || S.m)) : ''), ended: s.stopped ? 'stopped by you' : 'ended ' + (s.end ? hm(s.end) : '') }[s.state]);
  function sparkOf(s) {
    const meta = D.sessionById[s.id]; if (!meta || !meta.tokens.length) return [];
    const t = meta.tokens; let i = t.length - 1; while (i > 0 && t[i][0] > S.m) i--;
    const d = []; for (let k = Math.max(1, i - 7); k <= i; k++) d.push(t[k][1] - t[k - 1][1]); return d;
  }
  function updateCard(s) {
    const c = N.sess[s.id]; if (!c) return;
    const o = lay.out[s.id]; const roomy = o && o.h >= 138;
    const mk = { f: 0, r: 0, n: 0 }; (S.view.marks || []).forEach(m => { if (m.session === s.id) mk[RK[m.result]]++; });
    const hr = s.helpersRunning || [], g = {}; hr.forEach(h => { g[h.kind] = (g[h.kind] || 0) + 1; });
    const sp = sparkOf(s), sm = Math.max(1, ...sp);
    const meta = D.sessionById[s.id], plan = meta ? meta.plan : [], cur = s.state === 'ended' ? plan.length + 1 : (s.stepIndex || 1);
    const sig = [s.state, s.name, s.step, s.stepIndex, hr.length, Object.keys(g).join(), s.helpersDone, Math.floor(S.m / 5), mk.f, mk.r, mk.n, s.stopped, s.answered, Math.round(s.tokens / 1e4), roomy, s.wait && s.wait.question].join('|');
    if (c._sig === sig) return; c._sig = sig;
    c.dataset.state = s.state; $('.s-title', c).textContent = s.name; $('.s-state b', c).textContent = stateWord(s);
    $('.s-step', c).innerHTML = s.stepCount ? '<b>' + s.stepIndex + '/' + s.stepCount + '</b> ' + esc(s.step) : esc(s.step || '');
    $('.s-ask', c).textContent = s.wait ? s.wait.question : '';
    $('.s-help', c).innerHTML = Object.keys(g).map(k => '<span class="pill"><i class="' + (hr.find(h => h.kind === k) || {}).model + '"></i>' + esc(k) + (g[k] > 1 ? ' ×' + g[k] : '') + '</span>').join('') + (s.helpersDone ? '<span class="pill done">' + s.helpersDone + ' done</span>' : '');
    $('.s-marks', c).innerHTML = (mk.f ? '<span class="g f">' + GL.f + mk.f + '</span>' : '') + (mk.r ? '<span class="g r">' + GL.r + mk.r + '</span>' : '') + (mk.n ? '<span class="g n">' + GL.n + mk.n + '</span>' : '');
    $('.s-spark', c).innerHTML = sp.map(v => '<i style="height:' + Math.max(2, Math.round(v / sm * 16)) + 'px"></i>').join('');
    $('.s-tok', c).textContent = s.tokens ? tok(s.tokens) : '';
    $('.s-more', c).innerHTML = plan.length ? '<ul>' + plan.slice(0, 7).map((p, i) => { const k = i + 1 < cur ? 'done' : i + 1 === cur ? 'cur' : ''; return '<li class="' + k + '"><span class="ck">' + (k === 'done' ? '✓' : k === 'cur' ? '●' : '○') + '</span>' + esc(p.text) + '</li>'; }).join('') + '</ul>' : '';
    c.setAttribute('aria-label', s.tag + ', ' + s.name + ', ' + stateWord(s));
    if (s.state === 'waiting' && !c._wasWaiting) { c.classList.add('fresh'); setTimeout(() => c.classList.remove('fresh'), 1000); }
    c._wasWaiting = s.state === 'waiting';
  }

  /* ---------- hooks and parts ---------- */
  function updateHooks(v, sn) {
    const b0 = Math.floor(S.m / 5) * 5;
    Object.keys(N.hook).forEach(id => {
      const t = N.hook[id], evs = A.evByPart[id] || [];
      const bars = $$('.h-strip i', t), ms = v.marks.filter(m => m.part === id);
      const sig = b0 + '|' + ms.map(m => m.t).join() + '|' + ((sn.hookUse[id] || []).length > 0);
      if (t._sig === sig) return; t._sig = sig;
      let pass1h = 0;
      bars.forEach((bi, k) => {
        const a = b0 - 55 + 5 * k, bb = a + 5; let n = 0, f = 0, r = 0;
        evs.forEach(e => { if (e.t >= a && e.t < bb) { if (e.result === 'passed') n += e.n || 1; else if (e.result === 'failed') f++; else r++; } });
        pass1h += n; bi.style.height = (f || r) ? '34px' : (n ? Math.min(30, 4 + n * 3) + 'px' : '2px'); bi.className = f ? 'f' : r ? 'r' : '';
      });
      const cf = ms.filter(m => m.result === 'failed').length, cr = ms.filter(m => m.result === 'refused').length, cn = ms.filter(m => m.result === 'not-on').length;
      const tags = []; ms.forEach(m => { if (!tags.includes(m.session)) tags.push(m.session); });
      t.classList.toggle('tr-f', cf > 0); t.classList.toggle('tr-r', !cf && cr > 0);
      t.classList.toggle('active', (sn.hookUse[id] || []).length > 0);
      const foot = $('.h-foot', t);
      if (!evs.length) foot.innerHTML = 'never fired today';
      else if (ms.length) foot.innerHTML = (cf ? '<span class="g f">' + GL.f + cf + '</span>' : '') + (cr ? '<span class="g r">' + GL.r + cr + '</span>' : '') + (cn ? '<span class="g n">' + GL.n + cn + '</span>' : '') + tags.slice(0, 3).map(sid => '<span class="tag tg" style="--h:' + hue(sid) + '">' + esc((A.sessView(sid) || {}).tag) + '</span>').join('') + (tags.length > 3 ? '+' + (tags.length - 3) : '');
      else foot.textContent = pass1h ? pass1h + ' let through' : 'quiet';
    });
  }
  function updateParts(sn) {
    if (Math.abs(S.m - lastMi) > 30) Object.keys(lastUse).forEach(k => delete lastUse[k]); lastMi = S.m;
    Object.keys(N.part).forEach(id => {
      const b = N.part[id], u = sn.partUse[id] || [];
      if (u.length) lastUse[id] = S.m;
      const st = u.length ? 'on' : (lastUse[id] != null && S.m - lastUse[id] < 25 ? 'recent' : '');
      const sig = st + u.join();
      if (b._sig === sig) return; b._sig = sig;
      b.classList.toggle('on', st === 'on'); b.classList.toggle('recent', st === 'recent');
      $('.dots', b).innerHTML = u.slice(0, 3).map(sid => '<i style="--h:' + hue(sid) + '"></i>').join('') + (u.length > 3 ? '<em>+' + (u.length - 3) + '</em>' : '');
    });
  }

  /* ---------- links: who started whom always; one session's parts only on focus ---------- */
  const center = id => { const o = lay.out[id]; return o ? { x: o.x + o.w / 2, y: o.y + o.h / 2 } : null; };
  function nodeCenter(n) { return { x: n.offsetLeft + n.offsetWidth / 2, y: n.offsetTop + n.offsetHeight / 2 }; }
  function drawLinks() {
    let h = '';
    Object.keys(lay.out).forEach(id => {
      const s = A.sessView(id); if (!s || !s.parent || !lay.out[s.parent]) return;
      const p = lay.out[s.parent], c = lay.out[id], x1 = p.x + p.w, y1 = p.y + p.h / 2, x2 = c.x, y2 = c.y + c.h / 2;
      h += '<path class="lk-par" d="M' + x1 + ' ' + y1 + ' C' + (x1 + 16) + ' ' + y1 + ' ' + (x2 - 16) + ' ' + y2 + ' ' + x2 + ' ' + y2 + '"/>';
    });
    const fid = S.hover || S.sel;
    if (fid && lay.out[fid]) {
      const s = A.sessView(fid), o = lay.out[fid], sx = o.x + o.w / 2, sy = o.y + o.h / 2;
      const to = (n, cls, col) => { const c = nodeCenter(n); h += '<path class="' + cls + '" ' + (col ? 'stroke="' + col + '"' : '') + ' d="M' + sx + ' ' + sy + ' C' + (sx + (c.x - sx) * .5) + ' ' + sy + ' ' + (sx + (c.x - sx) * .5) + ' ' + c.y + ' ' + c.x + ' ' + c.y + '"/>'; };
      (s.parts || []).forEach(pid => { if (N.part[pid]) to(N.part[pid], 'lk-focus', hue(fid)); });
      (s.hooks || []).forEach(pid => { if (N.hook[pid]) to(N.hook[pid], 'lk-focus', hue(fid)); });
      S.view.marks.filter(m => m.session === fid && N.hook[m.part]).forEach(m => to(N.hook[m.part], 'lk-break'));
    }
    links.innerHTML = h;
  }
  let fkey = '';
  function refocus() {
    const id = S.hover || S.sel, s = id && A.sessView(id), key = id ? id + '|' + (s ? s.parts.join() + s.hooks.join() : '') + S.view.marks.length : '';
    if (key === fkey) return; fkey = key;
    $$('.rel', world).forEach(n => n.classList.remove('rel'));
    if (!id || !N.sess[id] || N.sess[id].classList.contains('gone')) { stage.classList.remove('has-focus'); drawLinks(); return; }
    stage.classList.add('has-focus'); N.sess[id].classList.add('rel');
    (s.parts || []).forEach(p => N.part[p] && N.part[p].classList.add('rel'));
    (s.hooks || []).forEach(p => N.hook[p] && N.hook[p].classList.add('rel'));
    S.view.marks.filter(m => m.session === id).forEach(m => N.hook[m.part] && N.hook[m.part].classList.add('rel'));
    drawLinks();
  }

  /* ---------- tick ---------- */
  function onTick() {
    const v = S.view, sn = v.snap;
    v.sessions.forEach(s => { if (!N.sess[s.id]) addCard(s); });
    const key = v.sessions.map(s => s.id + (s.state === 'waiting' ? '!' : '')).join(',');
    if (key !== vis.key) { vis.key = key; doLayout(v.sessions); }
    v.sessions.forEach(updateCard);
    $$('.sess', world).forEach(c => c.classList.toggle('sel', c.dataset.id === S.sel));
    updateParts(sn); updateHooks(v, sn); banner(v); chips(v); fkey = fkey + '*'; refocus();
  }
  let bannerSig = '';
  function banner(v) {
    const w = v.sessions.filter(s => s.state === 'waiting').sort((a, b) => a.since - b.since), bn = $('#needBanner');
    const sig = w.map(s => s.id).join() + (w[0] ? Math.floor((S.m - w[0].since)) : '');
    if (sig === bannerSig) return; bannerSig = sig;
    bn.hidden = !w.length; if (!w.length) return;
    bn.innerHTML = '<span class="tag">' + esc(w[0].tag) + '</span><span>waits for you · ' + dur(S.m - w[0].since) + (w.length > 1 ? ' · +' + (w.length - 1) + ' more' : '') + '</span><button>Answer</button>';
    bn.dataset.id = w[0].id;
  }
  $('#needBanner').addEventListener('click', e => { const id = e.currentTarget.dataset.id; focusSession(id); setTimeout(() => { const c = N.sess[id]; if (c) A.showPop(c, A.replyBox(id)); }, A.reduced ? 0 : 340); });
  let chipSig = '';
  function chips(v) {
    const ch = $('#quietChip'); let h = '';
    const aw = D.owner.away.filter(a => a.minutes >= 45 && a.back <= S.m && S.m - a.back < 25 && a.back > A.T0)[0];
    if (aw) h = '<button class="btn sm" data-away="' + aw.left + '">Back after ' + dur(aw.minutes) + ' · see what happened</button>';
    else if (!v.counts.working && !v.counts.waiting) {
      let last = A.T0; D.sessions.forEach(s => s.segs.forEach(g => { if (g[0] <= S.m) last = Math.max(last, Math.min(g[1], S.m)); }));
      h = 'Nothing is working · last active ' + hm(last);
    }
    if (h === chipSig) return; chipSig = h; ch.hidden = !h; ch.innerHTML = h; ch.style.padding = aw ? '3px 4px' : '';
  }
  $('#quietChip').addEventListener('click', e => { const b = e.target.closest('[data-away]'); if (b) catchUp(D.owner.away.find(a => a.left == b.dataset.away), b); });

  /* ---------- camera ---------- */
  function applyCam() {
    world.style.transform = 'translate(' + cam.x + 'px,' + cam.y + 'px) scale(' + cam.z + ')';
    stage.style.setProperty('--z', cam.z.toFixed(3));
    const lod = cam.z < 0.62 ? 'far' : cam.z > 1.55 ? 'near' : 'mid'; if (stage.dataset.lod !== lod) stage.dataset.lod = lod;
    $('#zVal').textContent = Math.round(cam.z * 100) + '%'; updateMinimap();
  }
  function tweenTo(t, ms) {
    cancelAnimationFrame(tw); if (A.reduced) { Object.assign(cam, t); applyCam(); return; }
    const a = { x: cam.x, y: cam.y, z: cam.z }, t0 = performance.now(); ms = ms || 340;
    const step = n => { const k = Math.min(1, (n - t0) / ms), e = 1 - Math.pow(1 - k, 3); cam.x = a.x + (t.x - a.x) * e; cam.y = a.y + (t.y - a.y) * e; cam.z = a.z + (t.z - a.z) * e; applyCam(); if (k < 1) tw = requestAnimationFrame(step); };
    tw = requestAnimationFrame(step);
  }
  function fit(animate) {
    const r = stage.getBoundingClientRect(), pad = 14, z = Math.min((r.width - 2 * pad) / BW, (r.height - 2 * pad) / BH); fitZ = z;
    const t = { z, x: (r.width - BW * z) / 2 - BX * z, y: (r.height - BH * z) / 2 - BY * z }; userMoved = false;
    if (animate) tweenTo(t); else { Object.assign(cam, t); applyCam(); }
  }
  function zoomAt(px, py, nz, animate) {
    nz = clamp(nz, 0.25, 4); const k = nz / cam.z, t = { z: nz, x: px - (px - cam.x) * k, y: py - (py - cam.y) * k }; userMoved = true;
    if (animate) tweenTo(t, 220); else { cancelAnimationFrame(tw); Object.assign(cam, t); applyCam(); }
  }
  function centerOn(wx, wy, z) { const r = stage.getBoundingClientRect(); userMoved = true; tweenTo({ z, x: r.width / 2 - wx * z, y: r.height / 2 - wy * z }); }
  function ping(n) { n.classList.remove('ping'); void n.offsetWidth; n.classList.add('ping'); setTimeout(() => n.classList.remove('ping'), 1000); }
  function focusSession(id) {
    const c = N.sess[id], o = lay.out[id];
    if (!c || !o) { const m = D.sessionById[id]; if (m) A.toast(m.tag + ' is no longer on the canvas', { sub: 'It ended ' + hm(m.end || 0), ms: 3500 }); return; }
    centerOn(o.x + o.w / 2, o.y + o.h / 2, Math.max(cam.z, fitZ * 1.2, 1.0)); ping(c);
  }
  function focusPart(id) {
    const n = N.part[id] || N.hook[id]; if (!n) return;
    centerOn(n.offsetLeft + n.offsetWidth / 2, n.offsetTop + n.offsetHeight / 2, Math.max(1.3, cam.z)); ping(n);
    setTimeout(() => A.inspectPart(id, n), A.reduced ? 0 : 360);
  }
  stage.addEventListener('wheel', e => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, cam.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016))); }, { passive: false });
  let pan = null;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('#zoomCtl,#minimap,#needBanner,#quietChip,.btn')) return;
    pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, on: false, id: e.pointerId };
  });
  window.addEventListener('pointermove', e => {
    if (!pan) return; const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
    if (!pan.on && Math.hypot(dx, dy) > 5) { pan.on = true; dragMoved = true; stage.classList.add('panning'); cancelAnimationFrame(tw); A.hidePop(); try { stage.setPointerCapture(pan.id); } catch (x) { } }
    if (pan.on) { cam.x = pan.cx + dx; cam.y = pan.cy + dy; userMoved = true; applyCam(); }
  });
  window.addEventListener('pointerup', () => { if (pan && pan.on) setTimeout(() => { dragMoved = false; }, 0); stage.classList.remove('panning'); pan = null; });
  stage.addEventListener('scroll', () => { stage.scrollLeft = 0; stage.scrollTop = 0; });
  $('#zIn').onclick = () => { const r = stage.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, cam.z * 1.25, true); };
  $('#zOut').onclick = () => { const r = stage.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, cam.z / 1.25, true); };
  $('#zFit').onclick = () => fit(true);
  window.addEventListener('resize', () => { if (!userMoved) fit(false); else applyCam(); if (A.S.page === 'now') buildStrip(); });

  /* ---------- minimap ---------- */
  const mm = $('#minimap'), mmv = $('#mmView'), MS = 200 / BW;
  function buildMini() { regions.forEach(r => { const d = el('mm ' + r.cls); Object.assign(d.style, { left: (r.x - BX) * MS + 'px', top: (r.y - BY) * MS + 'px', width: r.w * MS + 'px', height: r.h * MS + 'px' }); mm.insertBefore(d, mmv); }); }
  function updateMinimap() {
    const r = stage.getBoundingClientRect(); const far = Math.abs(cam.z - fitZ) > 0.04 || userMoved; mm.hidden = !far; if (!far) return;
    const x0 = -cam.x / cam.z, y0 = -cam.y / cam.z, w = r.width / cam.z, h = r.height / cam.z;
    Object.assign(mmv.style, { left: (x0 - BX) * MS + 'px', top: (y0 - BY) * MS + 'px', width: w * MS + 'px', height: h * MS + 'px' });
  }
  function mmGo(e) { const b = mm.getBoundingClientRect(), wx = (e.clientX - b.left) / MS + BX, wy = (e.clientY - b.top) / MS + BY, r = stage.getBoundingClientRect(); cam.x = r.width / 2 - wx * cam.z; cam.y = r.height / 2 - wy * cam.z; applyCam(); }
  mm.addEventListener('pointerdown', e => { mm.setPointerCapture(e.pointerId); mmGo(e); mm.onpointermove = mmGo; });
  mm.addEventListener('pointerup', () => { mm.onpointermove = null; });

  /* ---------- clicks on the canvas ---------- */
  stage.addEventListener('click', e => {
    if (dragMoved) return;
    const act = e.target.closest('[data-act]'), card = e.target.closest('.sess');
    if (act && card) {
      const id = card.dataset.id, a = act.dataset.act;
      if (a === 'answer') return A.showPop(card, A.replyBox(id));
      if (a === 'stop') { card.classList.add('confirm'); return; }
      if (a === 'stop-yes') { card.classList.remove('confirm'); return A.doStop(id); }
      if (a === 'stop-no') { card.classList.remove('confirm'); return; }
    }
    if (card) return A.openSession(card.dataset.id);
    const p = e.target.closest('.part,.hook'); if (p) return A.inspectPart(p.dataset.part, p);
    if (e.target.closest('#zoomCtl,#minimap,#needBanner,#quietChip')) return;
    A.hidePop(); if (S.sel) A.closeDrawer();
  });
  stage.addEventListener('dblclick', e => { const p = e.target.closest('.part,.hook'); if (p) { A.hidePop(); A.openPart(p.dataset.part, p); } });
  stage.addEventListener('pointerover', e => { const c = e.target.closest('.sess'), id = c ? c.dataset.id : null; if (id !== S.hover) { S.hover = id; refocus(); } });
  stage.addEventListener('pointerleave', () => { if (S.hover) { S.hover = null; refocus(); } });
  stage.addEventListener('focusin', e => { stage.scrollLeft = 0; stage.scrollTop = 0; const n = e.target.closest('.sess,.part,.hook'); if (n) ensureVisible(n); });
  function ensureVisible(n) {
    const r = n.getBoundingClientRect(), s = stage.getBoundingClientRect(), m = 40; let dx = 0, dy = 0;
    if (r.left < s.left + m) dx = s.left + m - r.left; else if (r.right > s.right - m) dx = s.right - m - r.right;
    if (r.top < s.top + m) dy = s.top + m - r.top; else if (r.bottom > s.bottom - m) dy = s.bottom - m - r.bottom;
    if (dx || dy) { userMoved = true; tweenTo({ z: cam.z, x: cam.x + dx, y: cam.y + dy }, 200); }
  }
  function navArrow(key) {
    const all = $$('.sess:not(.gone),.part,.hook', world), cur = document.activeElement.closest && document.activeElement.closest('.sess,.part,.hook');
    if (!cur) { const f = all.find(n => n.classList.contains('sess')) || all[0]; f && f.focus({ preventScroll: true }); return; }
    const cr = cur.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2; let best = null, bd = 1e9;
    all.forEach(n => {
      if (n === cur) return; const r = n.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy; let ok, d;
      if (key === 'ArrowRight') { ok = x > 8 && Math.abs(y) < x * 1.6 + 30; d = x + Math.abs(y) * 2; }
      else if (key === 'ArrowLeft') { ok = x < -8 && Math.abs(y) < -x * 1.6 + 30; d = -x + Math.abs(y) * 2; }
      else if (key === 'ArrowDown') { ok = y > 8 && Math.abs(x) < y * 1.6 + 60; d = y + Math.abs(x) * 2; }
      else { ok = y < -8 && Math.abs(x) < -y * 1.6 + 60; d = -y + Math.abs(x) * 2; }
      if (ok && d < bd) { bd = d; best = n; }
    });
    if (best) best.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', e => {
    if (S.page !== 'now' || /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    const r = stage.getBoundingClientRect(), n = document.activeElement.closest && document.activeElement.closest('.sess,.part,.hook');
    if (e.key === '+' || e.key === '=') zoomAt(r.width / 2, r.height / 2, cam.z * 1.25, true);
    else if (e.key === '-') zoomAt(r.width / 2, r.height / 2, cam.z / 1.25, true);
    else if (e.key === '0') zoomAt(r.width / 2, r.height / 2, 1, true);
    else if (e.key === 'f' || e.key === 'F' || (e.shiftKey && e.key === '!')) fit(true);
    else if (/^Arrow/.test(e.key)) { e.preventDefault(); if (document.activeElement === stage || !n) { const d = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] }[e.key]; userMoved = true; tweenTo({ z: cam.z, x: cam.x + d[0], y: cam.y + d[1] }, 160); } else navArrow(e.key); }
    else if (n && (e.key === 'Enter' || e.key === 'o' || e.key === 'O')) {
      e.preventDefault();
      if (n.classList.contains('sess')) A.openSession(n.dataset.id);
      else if (e.key === 'Enter' && !e.shiftKey) A.inspectPart(n.dataset.part, n); else A.openPart(n.dataset.part, n);
    }
  });

  /* ---------- time strip ---------- */
  function catchUp(a, anchor) {
    const T = A.T0, inW = t => t >= a.left && t <= a.back;
    const st = D.sessions.filter(s => s.start >= a.left && s.start <= a.back), en = D.sessions.filter(s => s.end != null && inW(s.end)), wt = D.waiting.filter(w => inW(w.from));
    const tr = {}; A.trouble.forEach(e => { if (inW(e.t)) { const k = e.part + '|' + e.result; tr[k] = (tr[k] || 0) + 1; } });
    const tg = (s, x) => '<button class="tag" style="--h:' + hue(s.id) + ';border:0;cursor:pointer" data-sess="' + s.id + '">' + esc(s.tag) + '</button>';
    let h = '<h4>While you were away</h4><div class="sub">' + hm(a.left) + ' to ' + hm(a.back) + ' · ' + dur(a.minutes) + '</div>';
    const rows = [];
    if (st.length) rows.push('<div class="mk" style="cursor:default"><b>Started</b><span class="row">' + st.map(tg).join('') + '</span></div>');
    if (en.length) rows.push('<div class="mk" style="cursor:default"><b>Ended</b><span class="row">' + en.map(tg).join('') + '</span></div>');
    if (wt.length) rows.push('<div class="mk" style="cursor:default"><b style="color:var(--blue)">Waited for you</b><span class="row">' + wt.map(w => tg(D.sessionById[w.session])).join('') + '</span></div>');
    Object.keys(tr).sort((x, y) => tr[y] - tr[x]).slice(0, 5).forEach(k => { const [p, r] = k.split('|'); rows.push('<div class="mk" data-part="' + esc(p) + '"><span class="g ' + RK[r] + '">' + GL[RK[r]] + '</span><span>' + esc((D.partById[p] || {}).name) + ' ' + A.RW[r] + '</span><span class="t">× ' + tr[k] + '</span></div>'); });
    h += rows.length ? rows.join('') : '<div class="sub">Nothing happened while you were away.</div>';
    A.showPop(anchor, h, el => { el.onclick = e => { const s = e.target.closest('[data-sess]'); if (s) { A.hidePop(); focusSession(s.dataset.sess); A.openSession(s.dataset.sess); return; } const p = e.target.closest('[data-part]'); if (p) { A.hidePop(); focusPart(p.dataset.part); } }; });
  }
  let sv = null, ph = null, fut = null, sw = 0, sx = null;
  function buildStrip() {
    const host = $('#strip'); sw = host.clientWidth || 1870; if (!sw) return; const h = 112, L = 16, R = 16, span = A.T1 - A.T0, nb = Math.ceil(span / 5);
    const x = m => L + (m - A.T0) / span * (sw - L - R); sx = x; const day = D.week.days[6];
    let s = '<svg width="' + sw + '" height="' + h + '" role="img" aria-label="Tuesday 24 November: how many sessions were working, helpers, trouble marks, your messages">';
    s += '<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#f6f4ef"/><line x1="0" y1="0" x2="0" y2="7" stroke="#dcd7cb" stroke-width="2.4"/></pattern></defs>';
    for (let hh = 0; hh <= 14; hh += 2) { const gx = x(A.T0 + hh * 60); s += '<line x1="' + gx + '" x2="' + gx + '" y1="30" y2="72" stroke="#ece8de"/><text x="' + gx + '" y="107" text-anchor="' + (hh === 0 ? 'start' : 'middle') + '">' + String(hh).padStart(2, '0') + ':00</text>'; }
    // away bands
    D.owner.away.filter(a => a.back > A.T0 && a.left < A.T1 && a.minutes >= 45).forEach(a => {
      const x1 = x(Math.max(a.left, A.T0)), x2 = x(Math.min(a.back, A.T1));
      s += '<g class="away" data-away="' + a.left + '"><rect x="' + x1 + '" y="32" width="' + (x2 - x1) + '" height="40" fill="rgba(31,86,214,.07)" stroke="rgba(31,86,214,.35)" stroke-dasharray="4 3"/>' + (x2 - x1 > 170 ? '<text x="' + (x1 + x2) / 2 + '" y="48" text-anchor="middle" style="fill:#1f56d6">you were away ' + dur(a.minutes) + '</text>' : '') + '</g>';
    });
    // quiet stretches
    let run = 0;
    for (let i = 0; i <= nb; i++) {
      const q = i < nb && day.sessions[i] === 0 && day.helpers[i] === 0;
      if (q) run++; else { if (run >= 4) { const x1 = x(A.T0 + (i - run) * 5), x2 = x(A.T0 + i * 5); s += '<rect x="' + x1 + '" y="34" width="' + (x2 - x1) + '" height="36" fill="url(#hatch)" opacity=".95"/>' + (x2 - x1 > 120 ? '<text x="' + (x1 + x2) / 2 + '" y="' + (x2 - x1 > 400 ? 62 : 56) + '" text-anchor="middle">nothing ran ' + dur(run * 5) + '</text>' : ''); } run = 0; }
    }
    for (let i = 0; i < nb; i++) { const hv = Math.min(36, day.helpers[i] * 2.4); if (hv > 0) s += '<rect x="' + x(A.T0 + i * 5) + '" y="' + (70 - hv) + '" width="' + ((sw - L - R) / span * 5 + .5) + '" height="' + hv + '" fill="#ddd8cc"/>'; }
    let p = 'M' + x(A.T0) + ' 70'; for (let i = 0; i < nb; i++) { const y = 70 - Math.min(36, day.sessions[i] * 9); p += 'H' + x(A.T0 + i * 5) + 'V' + y + 'H' + x(A.T0 + i * 5 + 5); } p += 'V70Z';
    s += '<path d="' + p + '" fill="#7d8aa0" opacity=".9"/><line x1="' + L + '" x2="' + (sw - R) + '" y1="70.5" y2="70.5" stroke="#b9b3a4"/>';
    D.waiting.forEach(w => { if (w.to > A.T0 && w.from < A.T1 && w.minutes >= 8) s += '<rect x="' + x(Math.max(w.from, A.T0)) + '" y="71" width="' + Math.max(2, x(Math.min(w.to, A.T1)) - x(Math.max(w.from, A.T0))) + '" height="4" rx="2" fill="#1f56d6"/>'; });
    A.trouble.forEach(e => { if (e.t < A.T0 || e.t > A.T1) return; const cx = x(e.t); s += e.result === 'failed' ? '<path d="M' + cx + ' 78 l4.4 8 h-8.8z" fill="#c0231a"/>' : e.result === 'refused' ? '<circle cx="' + cx + '" cy="82" r="3.4" fill="#d17a00"/>' : ''; });
    D.owner.messages.forEach(m => { if (m >= A.T0 && m <= A.T1) s += '<circle cx="' + x(m) + '" cy="93" r="2.8" fill="#1f56d6"/>'; });
    // starts, staggered on two rows
    const rowEnd = [-99, -99];
    D.sessions.filter(q => q.start >= A.T0 && q.start <= A.T1).forEach(q => {
      const cx = x(q.start), w = 10 + q.tag.length * 7.6; let r = rowEnd[0] + 3 < cx ? 0 : rowEnd[1] + 3 < cx ? 1 : -1;
      s += '<line x1="' + cx + '" x2="' + cx + '" y1="' + (r < 0 ? 30 : 3 + r * 14 + 14) + '" y2="70" stroke="' + hue(q.id) + '" stroke-opacity=".45"/>';
      if (r >= 0) { rowEnd[r] = cx + w; s += '<g class="start" data-sess="' + q.id + '" style="cursor:pointer"><rect x="' + cx + '" y="' + (3 + r * 14) + '" width="' + w + '" height="14" rx="4" fill="' + hue(q.id) + '"/><text x="' + (cx + 5) + '" y="' + (14 + r * 14) + '" style="fill:#fff;font-size:11.5px;font-weight:700">' + esc(q.tag) + '</text></g>'; }
    });
    s += '<rect id="fut" x="0" y="0" width="0" height="112" fill="#fff" opacity=".62" pointer-events="none"/><g id="ph" pointer-events="none"><line x1="0" x2="0" y1="0" y2="112" stroke="#1c1b19" stroke-width="2"/><rect x="-20" y="94" width="40" height="17" rx="5" fill="#1c1b19"/><text id="phT" x="0" y="106.5" text-anchor="middle" style="fill:#fff;font-size:12px;font-weight:700"></text></g></svg>';
    host.innerHTML = s; sv = $('svg', host); ph = $('#ph', host); fut = $('#fut', host); framePh(true);
  }
  let lastPx = -1;
  function framePh(force) {
    if (!sx || !ph) return; const px = sx(S.m); if (!force && Math.abs(px - lastPx) < 0.25) return; lastPx = px;
    ph.setAttribute('transform', 'translate(' + px + ',0)'); $('#phT', ph).textContent = hm(S.m); fut.setAttribute('x', px); fut.setAttribute('width', Math.max(0, sw - px));
  }
  const strip = $('#strip');
  strip.addEventListener('pointerdown', e => {
    if (e.target.closest('.away,.start')) return;
    S.drag = true; strip.setPointerCapture(e.pointerId); const mv = ev => { const b = strip.getBoundingClientRect(); A.seek(A.T0 + (ev.clientX - b.left - 16) / (sw - 32) * (A.T1 - A.T0)); framePh(); }; mv(e); strip.onpointermove = mv;
  });
  strip.addEventListener('pointerup', () => { S.drag = false; strip.onpointermove = null; });
  strip.addEventListener('click', e => {
    const a = e.target.closest('.away'); if (a) return catchUp(D.owner.away.find(x => x.left == a.dataset.away), a);
    const s = e.target.closest('.start'); if (s) { focusSession(s.dataset.sess); A.openSession(s.dataset.sess); }
  });

  /* ---------- module ---------- */
  A.mods.push({
    init() {
      buildStatic(); buildMini(); fit(false); buildStrip();
      A.on('tick', onTick); A.on('frame', () => framePh(false)); A.on('sel', () => { fkey += '*'; $$('.sess', world).forEach(c => c.classList.toggle('sel', c.dataset.id === S.sel)); refocus(); });
      A.on('page', p => { if (p === 'now') { setTimeout(() => { buildStrip(); if (!userMoved) fit(false); }, 0); } });
      if (A.Q.get('zoom')) setTimeout(() => {
        const r = stage.getBoundingClientRect(), z = +A.Q.get('zoom'), at = A.Q.get('at'); let wx = 1080, wy = 460;
        const sd = D.sessions.find(s => s.tag === at), o = sd && lay.out[sd.id], n = N.part[at] || N.hook[at];
        if (o) { wx = o.x + o.w / 2; wy = o.y + o.h / 2; } else if (n) { wx = n.offsetLeft + n.offsetWidth / 2; wy = n.offsetTop + n.offsetHeight / 2; }
        cam.z = z; cam.x = r.width / 2 - wx * z; cam.y = r.height / 2 - wy * z; userMoved = true; applyCam();
      }, 400);
      if (false) { const r = stage.getBoundingClientRect(), z = +A.Q.get('zoom'); if (A.Q.get('at')) { const n = N.sess[(D.sessions.find(s => s.tag === A.Q.get('at')) || {}).id] || N.part[A.Q.get('at')] || N.hook[A.Q.get('at')]; if (n) { cam.z = z; cam.x = r.width / 2 - (n.offsetLeft + n.offsetWidth / 2) * z; cam.y = r.height / 2 - (n.offsetTop + n.offsetHeight / 2) * z; userMoved = true; applyCam(); } } else { cam.z = z; cam.x = r.width / 2 - 974 * z; cam.y = r.height / 2 - 460 * z; userMoved = true; applyCam(); } }
      if (A.Q.get('pop') === 'reply') setTimeout(() => { const w = S.view.sessions.find(s => s.state === 'waiting'); if (w && N.sess[w.id]) A.showPop(N.sess[w.id], A.replyBox(w.id)); }, 700);
      if (A.Q.get('pop') === 'part') setTimeout(() => { const n = N.hook['hook:window-ceiling']; if (n) A.inspectPart('hook:window-ceiling', n); }, 700);
      if (A.Q.get('pop') === 'away') setTimeout(() => { const a = $('#strip .away'); if (a) catchUp(D.owner.away.find(x => x.left == a.dataset.away), a); }, 700);
    }
  });
  window.Now = { focusSession, focusPart, fit };
})();
