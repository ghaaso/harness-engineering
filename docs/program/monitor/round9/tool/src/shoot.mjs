// Drives headless Edge over its debugging port: real screenshots (1870 x 1050 and the pane's 800 x 600), scripted clicks and a frame-time measure.
// Nothing is installed. Run: node src/shoot.mjs <profile-dir> [group] [url]
//   profile-dir: an empty scratch folder for Edge's own profile.  group: main, pane, ops, checks, links, live, side, disk (all but links, live, side and disk when left out).
//   side: the side panel, the wheel and the dragged box, on the served replay (start server.mjs first; url as for live).
//   disk: the panel on the page opened from the disk (no server). It runs alone: after a change of window size headless
//   Edge makes no new frame until a screenshot asks for one, so a shot taken after the pane-size shots shows a half-moved picture.
//   fix: the wheel with one session open, the step buttons and the result labels, each checked by script (served replay, as side).
//   url: for the live group, the server's address (http://127.0.0.1:7419/).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), tool = path.dirname(here), shots = path.join(tool, 'shots');
const profile = process.argv[2]; if (!profile) { console.error('usage: node shoot.mjs <profile-dir> [group] [url]'); process.exit(1); }
const only = process.argv[3] || '', liveUrl = process.argv[4] || 'http://127.0.0.1:7419/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', PORT = 9339;
const page = 'file:///' + path.join(tool, 'index.html').split(path.sep).join('/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(shots, { recursive: true });
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile.split(path.sep).join('/'), '--window-size=1870,1050', 'about:blank'], { stdio: 'ignore' });
let ws, seq = 0; const waits = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waits.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(shots, name + '.png'), Buffer.from(r.data, 'base64')); console.log('shot', name); };
const size = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
const set = async (o, wait = 900) => { await evalJs('window.__tool.set(' + JSON.stringify(o) + ')'); await sleep(wait); };
const state = async () => { const s = await evalJs('window.__tool.state()'); console.log('  ', JSON.stringify(s)); return s; };
const click = (sel) => evalJs('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');if(!e)return false;e.dispatchEvent(new MouseEvent("click",{bubbles:true}));return true})()');
const err = async () => { const e = await evalJs('document.getElementById("err").textContent'); if (e) console.log('PAGE ERROR', e); };
const go = async (url) => { await send('Page.navigate', { url }); await sleep(1500); await err(); };
const want = (g) => (only ? only === g : g !== 'live' && g !== 'links' && g !== 'side' && g !== 'disk' && g !== 'fix');
try {
  let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); if (list.some((t) => t.type === 'page')) break; } catch (e) { /* not up yet */ } await sleep(250); }
  ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); const w = waits.get(msg.id); if (w) { waits.delete(msg.id); msg.error ? w.rej(new Error(msg.error.message)) : w.res(msg.result); } };
  await send('Page.enable'); await send('Runtime.enable');
  await size(1870, 1050);
  if (want('main')) {
    await go(page + '?paused=1&t=03:29&level=0&dry=1');
    await set({ t: '03:29', level: 0, paused: true, instant: true }); await shot('level0-all-sessions'); await state();
    await set({ level: 1 }); await shot('level1-hooks');
    await set({ level: 2, open: 'BR1' }); await shot('level2-one-session'); await state();
    await set({ level: 3 }); await shot('level3-files'); await state();
    await set({ sel: 'doc:briefs' }); await shot('level3-file-links'); await state();
    // one real call: BR2 calls the Tier hook at 03:27 and is refused
    const f = await evalJs('(function(){var s=window.__tool.schedule().flights.filter(function(f){return f.tag==="BR2"&&f.part==="hook:tier-hook"&&f.result==="refused"})[0];return s&&{t:s.t,n:s.n}})()');
    const lag = 0.9 * 10 / 60;
    await set({ m: f.t - lag * 0.5, level: 1, paused: true, speed: 10, instant: true }); await shot('arrow-1-leaving');
    await set({ m: f.t - lag * 0.14 }); await shot('arrow-2-arriving');
    await set({ m: f.t + 0.1 }); await shot('arrow-3-result');
    // History: the whole day, then one stretch being played back
    await set({ page: 'history', level: 0, instant: true }, 1200); await shot('history-day'); await state();
    await set({ level: 1 }); await shot('history-day-hooks'); await state();
    await set({ t: '13:03', level: 1, paused: true, instant: true }); await shot('history-1303-hooks'); await state();
    await set({ level: 2, open: 'BR4' }); await shot('history-1303-one-session');
    await set({ m: f.t + 0.1, level: 1, instant: true }); await shot('history-playback-arrow'); await state();
  }
  if (want('pane')) {
    await size(800, 600);
    await go(page + '?paused=1&t=03:29&level=0&dry=1');
    await set({ t: '03:29', level: 0, paused: true, instant: true }); await shot('pane-level0'); await state();
    await set({ level: 1 }); await shot('pane-level1'); await state();
    await set({ level: 2, open: 'BR1' }); await shot('pane-level2'); await state();
    await evalJs('document.getElementById("stage").scrollTop = 520'); await sleep(300); await shot('pane-level2-scrolled');
    await set({ level: 3 }); await shot('pane-level3'); await state();
    await set({ page: 'history', level: 0, instant: true }, 1200); await shot('pane-history'); await state();
    await set({ page: 'now', level: 2, open: 'UX', t: '03:29', paused: true, instant: true }); await set({ answer: 'UX' }, 500); await shot('pane-answer');
    await size(1870, 1050);
  }
  if (want('ops')) {
    await go(page + '?paused=1&t=03:29&level=2&open=UX&dry=1');
    await set({ t: '03:29', level: 2, open: 'UX', paused: true, instant: true });
    await set({ answer: 'UX' }, 500); await shot('answer-in-place');
    await click('#sheet [data-q="Go on"]'); await sleep(900); await shot('answered');
    console.log('after the answer:', await evalJs('document.getElementById("chips").textContent'));
    await set({ level: 2, open: 'BR1' }); await set({ stop: 'BR1' }, 400); await shot('stop-ask');
    await click('#sheet [data-stop]'); await sleep(900); await shot('stopped-with-undo');
    console.log('after the stop:', await evalJs('document.getElementById("chips").textContent'), '|', await evalJs('document.getElementById("toast").textContent'));
    await click('#toast [data-undo]'); await sleep(700);
    console.log('after undo:', await evalJs('document.getElementById("chips").textContent'));
    await set({ level: 0 }); await set({ jump: 'br' }, 400); await shot('jump');
  }
  if (want('checks')) {
    await go(page + '?paused=1&t=03:29&level=0&dry=1');
    const lv = async () => { const s = await evalJs('window.__tool.state()'); return s.page + ' ' + s.level + (s.level >= 2 ? ':' + s.open : '') + (s.sel ? ' sel ' + s.sel : '') + (s.playing ? ' playing' : ''); };
    const steps = [];
    const dbl = (sel) => evalJs('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');if(!e)return false;e.dispatchEvent(new MouseEvent("dblclick",{bubbles:true}));return true})()');
    await set({ t: '03:29', level: 0, paused: true, instant: true }, 500);
    await click('[data-a="s:BR2"]'); await sleep(900); steps.push('click BR2 -> ' + await lv());
    await click('[data-a="s:BR2"]'); await sleep(900); steps.push('click BR2 again -> ' + await lv());
    await click('[data-a="f:doc:briefs"]'); await sleep(600); steps.push('click the file Briefs -> ' + await lv());
    await dbl('[data-k="p:doc:briefs"]'); await sleep(400); steps.push('double-click Briefs -> panel: ' + JSON.stringify(await evalJs('window.__tool.state().panes')));
    await evalJs('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))'); await sleep(300); steps.push('Esc -> panel: ' + JSON.stringify(await evalJs('window.__tool.state().panes')));
    await evalJs('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))'); await sleep(900); steps.push('Esc -> ' + await lv());
    await set({ level: 1 }); await click('[data-k="h:hook:tier-hook"]'); await sleep(400); steps.push('click Tier hook -> panel: ' + JSON.stringify(await evalJs('window.__tool.state().panes'))); await set({ panes: 0 }, 300);
    await click('#pages [data-p="history"]'); await sleep(1200); steps.push('History -> ' + await lv() + ' at ' + (await evalJs('window.__tool.state().clock')));
    await click('[data-a^="t:"]'); await sleep(700); steps.push('click the first time in the margin -> ' + await lv() + ' at ' + (await evalJs('window.__tool.state().clock')));
    await click('#pages [data-p="now"]'); await sleep(900); steps.push('Now -> ' + await lv() + ' at ' + (await evalJs('window.__tool.state().clock')));
    await set({ jump: 'tier' }, 300); await evalJs('document.getElementById("jumpin").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))'); await sleep(900); steps.push('jump "tier", Enter -> ' + await lv());
    await set({ jump: 'board' }, 300); await evalJs('document.getElementById("jumpin").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))'); await sleep(900); steps.push('jump "board", Enter -> ' + await lv());
    console.log(steps.join('\n')); await err();
    // frames: the replay at 10x through four changes of view, then History being played back, then the pane's size
    const run = async (label, start, moves) => { await set(start, 600); await evalJs('window.__tool.perf(true)'); for (const mv of moves) { await sleep(1800); await set(mv, 0); } await sleep(1800); console.log(label, JSON.stringify(await evalJs('window.__tool.perf(true)'))); };
    await run('frames, Now at 10x:', { page: 'now', t: '03:20', level: 0, paused: false, speed: 10, instant: true }, [{ level: 1 }, { level: 2, open: 'BR1' }, { level: 3 }, { level: 0 }]);
    await run('frames, History played back at 60x:', { page: 'history', t: '10:30', level: 1, paused: false, speed: 60, instant: true }, [{ level: 0 }, { level: 1 }]);
    await size(800, 600); await sleep(500);
    await run('frames, 800 x 600 at 10x:', { page: 'now', t: '03:20', level: 0, paused: false, speed: 10, instant: true }, [{ level: 1 }, { level: 2, open: 'BR1' }, { level: 0 }]);
    await size(1870, 1050);
  }
  if (only === 'links') {                                            // the Files view with one file picked: folded, then unfolded
    await go(page + '?paused=1&t=03:29&level=3&open=BR1&dry=1');
    await set({ t: '03:29', level: 3, open: 'BR1', paused: true, instant: true });
    await set({ sel: 'doc:briefs' }); await shot('level3-file-links'); await state();
    await click('[data-a="unfold"]'); await sleep(900); await shot('level3-file-links-unfolded'); await state();
    await err();
  }
  if (only === 'side' || only === 'disk') {
    const base = liveUrl + '?replay&paused=1&t=03:29&dry=1';
    const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'none', ...extra });
    const rect = (sel, scroll) => evalJs('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');if(!e)return null;' + (scroll ? 'e.scrollIntoView({block:"center",inline:"center"});' : '') + 'var b=e.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom]})()');
    const press = async (x, y, n) => { await mouse('mousePressed', x, y, { button: 'left', clickCount: n }); await mouse('mouseReleased', x, y, { button: 'left', clickCount: n }); };
    // a real click on the thing: brought into view first; "top" clicks its name row (a hook's lower rows hold tags)
    const clickAt = async (sel, twice, top) => { const r = await rect(sel, true); if (!r) { console.log('NOT FOUND', sel); return; } const x = top ? r[0] + 16 : (r[0] + r[2]) / 2, y = top ? r[1] + 14 : (r[1] + r[3]) / 2; await mouse('mouseMoved', x, y); await press(x, y, 1); if (twice) await press(x, y, 2); await sleep(1300); };
    const marks = (pts) => evalJs('(function(){document.querySelectorAll(".shotmark").forEach(function(e){e.remove()});' + JSON.stringify(pts) + '.forEach(function(p){var d=document.createElement("div");d.className="shotmark";d.style.cssText="position:fixed;left:"+(p[0]-8)+"px;top:"+(p[1]-8)+"px;width:12px;height:12px;border:2.5px solid #c2007a;border-radius:50%;z-index:9;pointer-events:none";var s=document.createElement("span");s.textContent=p[2];s.style.cssText="position:absolute;left:18px;top:-5px;font:600 13px Segoe UI;color:#c2007a;white-space:nowrap;background:#fff;padding:0 4px";d.appendChild(s);document.body.appendChild(d)})})()');
    const wheel = async (p) => { await mouse('mouseMoved', p[0], p[1]); await mouse('mouseWheel', p[0], p[1], { deltaX: 0, deltaY: -120 }); await sleep(1100); };
    const st = async (label) => { const s = await evalJs('window.__tool.state()'), e = await evalJs('document.getElementById("err").textContent'); console.log(label, '-> level', s.level, s.level >= 2 ? 'open ' + s.open : '', s.group.length ? 'group ' + s.group.join('+') : '', s.panes.length ? '| panel ' + JSON.stringify(s.panes) : '', s.rails ? '| rails' : '', e ? '| PAGE ERROR ' + e : ''); return s; };
    const home = async () => { await set({ page: 'now', panes: 0, level: 0, t: '03:29', paused: true, instant: true }, 1000); await evalJs('document.getElementById("err").textContent=""'); };
    const part = async (name, fn) => { if ((only === 'disk') !== /from the disk/.test(name)) return; try { await fn(); } catch (e) { console.log('PART FAILED:', name, String(e.message).slice(0, 300)); } };
    const where = async () => { const q = {}; for (const t of ['BR1', 'BR2', 'HAP', 'UX']) q[t] = await rect('[data-a="s:' + t + '"]'); q.sg = await rect('#stage'); return q; };
    if (only === 'side') await go(base + '&level=3&open=BR1');
    await part('the panel with files', async () => {
      await set({ t: '03:29', level: 3, open: 'BR1', paused: true, instant: true });
      const files = await evalJs('Array.prototype.map.call(document.querySelectorAll(\'[data-a^="f:"]\'),function(e){return e.getAttribute("data-k")})');
      await clickAt('[data-k="p:doc:briefs"]', true); await shot('panel-file'); await st('double-click the file Briefs');
      const others = files.filter((k) => k !== 'p:doc:briefs');
      await clickAt('[data-k="' + others[0] + '"]'); await st('one click on another file (' + others[0] + '): the panel switches');
      await click('#side [data-keep]'); await clickAt('[data-k="' + others[2] + '"]'); await click('#side .pane:last-child [data-keep]'); await sleep(300);
      await shot('panel-two-kept'); await st('Keep, click a third file (' + others[2] + '), Keep');
      await clickAt('[data-k="' + others[3] + '"]'); await st('click a fourth file with two kept');
    });
    await part('the panel with a hook', async () => {
      await set({ panes: 0, level: 1 }, 1000);
      await clickAt('[data-k="h:hook:tier-hook"]', false, true); await shot('panel-hook'); await st('click the Tier hook');
      await clickAt('[data-k="h:hook:plan-gate"]', false, true); await st('click the Plan gate (the panel switches)');
    });
    await part('the panel with a failure', async () => {
      await home();
      await clickAt('[data-ev^="failed|UX|"]'); await sleep(900); await shot('panel-failure'); await st('click "Owner report failed" under UX');
      console.log('   what it failed on:', JSON.stringify(await evalJs('(document.querySelector("#side .evw")||{}).textContent')).slice(0, 330));
      await click('#chips [data-evs]'); await sleep(900); await st('click the red chip in the header');
      await set({ panes: 0, level: 1 }, 1000);
      await clickAt('[data-ev^="refused|"]'); await sleep(700); await st('click a refused tag on a hook');
    });
    await part('frames with the panel open', async () => {
      await set({ t: '03:20', level: 0, paused: false, speed: 10, instant: true }, 600); await evalJs('window.__tool.perf(true)');
      for (const mv of [{ level: 1 }, { level: 2, open: 'BR1' }, { level: 2, group: ['BR1', 'BR2', 'UX'] }, { level: 3, open: 'BR1' }, { level: 0 }]) { await sleep(1800); await set(mv, 0); await st('   ' + JSON.stringify(mv)); }
      await sleep(1800); console.log('frames, panel open, Now at 10x:', JSON.stringify(await evalJs('window.__tool.perf(true)'))); await st('   after the run');
    });
    await part('the wheel', async () => {
      await home(); const q = await where(), b2 = q.BR2, hap = q.HAP, ux = q.UX, sg = q.sg;
      const near = [b2[2] + 16, (b2[1] + b2[3]) / 2], between = [(hap[2] + ux[0]) / 2, (hap[1] + hap[3]) / 2], far = [sg[0] + 170, b2[3] - 20], farR = [sg[2] - 40, sg[1] + 90];
      console.log('aim:', JSON.stringify({ near: await evalJs('window.__tool.aim(' + near + ')'), between: await evalJs('window.__tool.aim(' + between + ')'), far: await evalJs('window.__tool.aim(' + far + ')'), farRight: await evalJs('window.__tool.aim(' + farR + ')') }));
      await marks([[...near, '1  16 px beside BR2'], [...between, '2  between HAP and UX'], [...far, '3  far from every session'], [...farR, '4  far, at the right edge']]); await shot('wheel-0-where'); await marks([]);
      await wheel(near); await shot('wheel-1-near-one'); await st('wheel in, 16 px beside BR2');
      await home(); await wheel(farR); await st('back to All sessions, wheel in at the right edge (BR2 was opened last)');
      await home(); await wheel(between); await shot('wheel-2-between-two'); const s2 = await st('wheel in between HAP and UX'); console.log('   ', s2.rel);
      await home(); await wheel(far); await st('wheel in far from all, first turn'); await wheel(far); await shot('wheel-3-far'); await st('wheel in far from all, second turn');
    });
    await part('the dragged box', async () => {
      await home(); const q = await where(), b1 = q.BR1, b2 = q.BR2, ux = q.UX, sg = q.sg;
      const p0 = [b1[0] - 24, b1[1] - 22], p1 = [ux[2] - 60, b2[3] + 18];
      await mouse('mouseMoved', p0[0], p0[1]); await mouse('mousePressed', p0[0], p0[1], { button: 'left', clickCount: 1 });
      for (let i = 1; i <= 6; i++) await mouse('mouseMoved', p0[0] + (p1[0] - p0[0]) * i / 6, p0[1] + (p1[1] - p0[1]) * i / 6, { button: 'left', buttons: 1 });
      await sleep(400); await shot('box-1-dragging'); console.log('box label:', await evalJs('document.querySelector("#box span").textContent'));
      await mouse('mouseReleased', p1[0], p1[1], { button: 'left', clickCount: 1 }); await sleep(1300); await shot('box-2-view'); const sb = await st('release the box'); console.log('   ', sb.rel);
      const pk = await evalJs('(function(){var e=document.querySelector(\'[data-k^="p:doc"],[data-k^="p:script"]\');return e?e.getAttribute("data-k"):""})()');
      if (pk) { await clickAt('[data-k="' + pk + '"]'); await shot('box-3-view-with-panel'); await st('click the part ' + pk + ' in the several-sessions view'); }
      await home(); await mouse('mouseMoved', sg[0] + 30, sg[3] - 120); await mouse('mousePressed', sg[0] + 30, sg[3] - 120, { button: 'left', clickCount: 1 }); await mouse('mouseMoved', sg[0] + 200, sg[3] - 30, { button: 'left', buttons: 1 });
      console.log('a box on empty space:', await evalJs('document.querySelector("#box span").textContent')); await mouse('mouseReleased', sg[0] + 200, sg[3] - 30, { button: 'left', clickCount: 1 }); await sleep(600); await st('release it');
    });
    await part('a box in History', async () => {
      await home(); await set({ page: 'history', level: 0, instant: true }, 1300);
      const pills = await evalJs('(function(){var a=[];document.querySelectorAll(\'[data-a^="s:"]\').forEach(function(e){var b=e.getBoundingClientRect();a.push([b.left,b.top,b.right,b.bottom])});a.sort(function(x,y){return x[1]-y[1]});return a.slice(3,8)})()');
      const q0 = [Math.min(...pills.map((p) => p[0])) - 10, pills[0][1] - 4], q1 = [Math.min(...pills.map((p) => p[0])) + 70, pills[pills.length - 1][3] + 2];
      await mouse('mouseMoved', q0[0], q0[1]); await mouse('mousePressed', q0[0], q0[1], { button: 'left', clickCount: 1 }); await mouse('mouseMoved', (q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2, { button: 'left', buttons: 1 }); await mouse('mouseMoved', q1[0], q1[1], { button: 'left', buttons: 1 });
      await sleep(300); await shot('box-4-history-dragging'); console.log('box label:', await evalJs('document.querySelector("#box span").textContent'));
      await mouse('mouseReleased', q1[0], q1[1], { button: 'left', clickCount: 1 }); await sleep(1300); await shot('box-5-history-view'); await st('History: release a box over five rows');
    });
    await part('the pane size', async () => {
      await size(800, 600); await home(); await set({ level: 1 }, 900); await clickAt('[data-k="h:hook:tier-hook"]', false, true); await shot('pane-panel'); await st('800 x 600: click the Tier hook'); await size(1870, 1050);
    });
    await part('the page from the disk', async () => {
      const probe = async (label) => console.log('  ', label, JSON.stringify(await evalJs('(function(){var s=document.getElementById("stage"),ys={};document.querySelectorAll(\'[data-k^="h:"]\').forEach(function(e){ys[Math.round(e.getBoundingClientRect().top)]=1});var b=document.querySelector(\'[data-a="s:BR1"]\').getBoundingClientRect();return {stage:[s.clientWidth,s.clientHeight],scrolls:[s.scrollWidth,s.scrollHeight],hookRows:Object.keys(ys).length,BR1:[Math.round(b.left),Math.round(b.right)],rails:window.__tool.state().rails,scale:window.__tool.state().scale}})()')));
      await go(page + '?paused=1&t=03:29&level=1&dry=1'); await set({ t: '03:29', level: 1, paused: true, instant: true });
      await probe('before the click'); await clickAt('[data-k="h:hook:tier-hook"]', false, true); await probe('1.3 s after the click'); await shot('panel-from-disk'); await st('from the disk: click the Tier hook');
      await set({ panes: 0, level: 0 }, 900); await clickAt('[data-ev^="failed|UX|"]'); await probe('after the failure tag'); await shot('panel-failure-from-disk'); await st('from the disk: click the failure tag');
      console.log('   the panel says:', JSON.stringify(await evalJs('document.querySelector("#side .pb").innerText')).slice(0, 900));
    });
  }
  if (only === 'fix') {                                              // the three fixes of 2026-11-24, late: the wheel with one session open, the step buttons, the result labels (served replay)
    const base = liveUrl + '?replay&paused=1&t=03:29&dry=1';
    const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'none', ...extra });
    const rect = (sel) => evalJs('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');if(!e)return null;var b=e.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom]})()');
    const clickAt = async (sel) => { const r = await rect(sel); if (!r) { console.log('NOT FOUND', sel); return; } const x = (r[0] + r[2]) / 2, y = (r[1] + r[3]) / 2; await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, { button: 'left', clickCount: 1 }); await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 }); await sleep(1200); };
    const marks = (pts) => evalJs('(function(){document.querySelectorAll(".shotmark").forEach(function(e){e.remove()});' + JSON.stringify(pts) + '.forEach(function(p){var d=document.createElement("div");d.className="shotmark";d.style.cssText="position:fixed;left:"+(p[0]-8)+"px;top:"+(p[1]-8)+"px;width:12px;height:12px;border:2.5px solid #c2007a;border-radius:50%;z-index:9;pointer-events:none";var s=document.createElement("span");s.textContent=p[2];s.style.cssText="position:absolute;left:18px;top:-5px;font:600 13px Segoe UI;color:#c2007a;white-space:nowrap;background:#fff;padding:0 4px";d.appendChild(s);document.body.appendChild(d)})})()');
    const wheel = async (p) => { await mouse('mouseMoved', p[0], p[1]); await mouse('mouseWheel', p[0], p[1], { deltaX: 0, deltaY: -120 }); await sleep(1100); };
    const key = async (k) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, ...(k.length === 1 ? { text: k } : { windowsVirtualKeyCode: 27, code: k }) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k }); await sleep(1100); };
    let fails = 0;
    const st = async (label, want) => {
      const s = await evalJs('window.__tool.state()'), e = await evalJs('document.getElementById("err").textContent'), t = await evalJs('(function(){var t=document.getElementById("toast");return t.hidden?"":t.textContent})()');
      const got = s.level + '|' + (s.group.length ? s.group.join('+') : s.open), okay = want === undefined || got === want; if (!okay || e) fails++;
      console.log((okay ? 'ok   ' : 'WRONG'), label, '-> level', s.level, 'open', JSON.stringify(s.open), s.group.length ? 'group ' + s.group.join('+') : '', want !== undefined && !okay ? '(wanted ' + want + ')' : '', t ? '| says: ' + t.slice(0, 90) : '', e ? '| PAGE ERROR ' + e : ''); return s;
    };
    const home = async () => { await set({ page: 'now', panes: 0, level: 0, t: '03:29', paused: true, instant: true }, 1000); await evalJs('document.getElementById("err").textContent="";document.getElementById("toast").hidden=true'); await mouse('mouseMoved', 5, 5); };
    // every result label on show against every session, every hook and every other label, from the page as drawn
    const OVER = '(function(){function r(e){var b=e.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom]}function hit(a,b){return a[0]<b[2]-0.5&&a[2]>b[0]+0.5&&a[1]<b[3]-0.5&&a[3]>b[1]+0.5}' +
      'var L=[],O=[],out=[];document.querySelectorAll("rect.al").forEach(function(e){if(+(e.parentNode.style.opacity||1)>0.05)L.push({r:r(e),t:e.parentNode.querySelector("text").textContent})});' +
      'document.querySelectorAll(\'.n[data-k^="s:"] .hit, .n[data-k^="h:"] .hit\').forEach(function(e){var g=e.closest(".n");if(+(g.style.opacity||1)>0.05)O.push({r:r(e),t:g.getAttribute("data-k")})});' +
      'L.forEach(function(a,i){O.forEach(function(o){if(hit(a.r,o.r))out.push(a.t+" over "+o.t)});L.forEach(function(b,j){if(j>i&&hit(a.r,b.r))out.push(a.t+" over label "+b.t)})});return {labels:L.length,things:O.length,over:out}})()';
    const sweep = async (label, start, secs) => {
      await set(start, 700); await evalJs('window.__tool.perf(true)'); let seen = 0, most = 0, samples = 0; const over = {};
      for (let i = 0; i < secs * 4; i++) { await sleep(250); const o = await evalJs(OVER); samples++; seen += o.labels; most = Math.max(most, o.labels); o.over.forEach((x) => { over[x] = (over[x] || 0) + 1; }); }
      const p = await evalJs('window.__tool.perf(true)'), s = await evalJs('window.__tool.state()'), rows = await evalJs('(function(){var ys={};document.querySelectorAll(\'.n[data-k^="h:"]\').forEach(function(e){ys[Math.round(e.getBoundingClientRect().top)]=1});return Object.keys(ys).length})()'), n = Object.keys(over).length;
      if (n || p.over34) fails++;
      console.log(n ? 'WRONG' : 'ok   ', label, '| hook rows', rows, '| clock', s.clock, '| samples', samples, 'labels seen', seen, 'most at once', most, '| overlaps', n ? JSON.stringify(over) : 0, '| frames', JSON.stringify(p));
    };
    await go(base + '&level=0');
    await set({ t: '03:29', level: 0, paused: true, instant: true });

    console.log('--- 1. the wheel with one session open');
    await clickAt('[data-a="s:BR1"]'); await st('click BR1', '2|BR1');
    const b1 = await rect('[data-a="s:BR1"]'), sg = await rect('#stage'), hk = await rect('[data-k="h:hook:plan-gate"]');
    const on = [(b1[0] + b1[2]) / 2, (b1[1] + b1[3]) / 2]; let near = on;
    for (const p of [[b1[2] + 16, on[1]], [b1[0] - 16, on[1]], [on[0], b1[1] - 16], [on[0], b1[3] + 16]]) if (JSON.stringify(await evalJs('window.__tool.aim(' + p + ')')) === '["BR1"]') { near = p; break; }
    const far = [sg[2] - 60, sg[1] + 120], onHook = [(hk[0] + hk[2]) / 2, (hk[1] + hk[3]) / 2], low = [sg[0] + 260, sg[3] - 60];
    console.log('aim:', JSON.stringify({ near: await evalJs('window.__tool.aim(' + near + ')'), far: await evalJs('window.__tool.aim(' + far + ')'), onHook: await evalJs('window.__tool.aim(' + onHook + ')'), low: await evalJs('window.__tool.aim(' + low + ')') }));
    await marks([[...near, near === on ? '1  on BR1' : '1  16 px from BR1'], [...far, '2  far from every session'], [...onHook, '3  on a hook'], [...low, '4  low on the page']]); await shot('wheel-4-one-open-where'); await marks([]);
    await wheel(far); await st('BR1 open, wheel in far from every session', '2|BR1'); await shot('wheel-5-one-open-far');
    await wheel(onHook); await st('BR1 open, wheel in on a hook', '2|BR1');
    await wheel(low); await st('BR1 open, wheel in low on the page', '2|BR1');
    await mouse('mouseMoved', far[0], far[1]); await key('+'); await st('BR1 open, the + key with the cursor far away', '2|BR1');
    await wheel(near); await st('BR1 open, wheel in ' + (near === on ? 'on BR1' : '16 px from BR1'), '3|BR1'); await shot('wheel-6-one-open-near');
    await set({ level: 2, open: 'BR1' }, 900); await mouse('mouseMoved', on[0], on[1]); await key('+'); await st('BR1 open, the + key with the cursor on BR1', '3|BR1');
    await set({ level: 2, open: 'BR1' }, 900); await click('#narrower'); await sleep(1000); await st('BR1 open, the Narrower button', '3|BR1');
    await home(); await st('back to All sessions: the session is forgotten', '0|');
    await wheel(far); await st('All sessions, wheel in far away (BR1 was open)', '1|'); await wheel(far); await st('Hooks, wheel in far away', '1|');

    console.log('--- 2. the step buttons');
    await home(); await click('#l2'); await sleep(500); await st('All sessions, click the step "One session" (BR1 was open before)', '0|'); await shot('step-1-asks-to-pick');
    console.log('   outlined sessions:', await evalJs('document.querySelectorAll(\'.n.pick[data-k^="s:"]\').length'), ' button says:', JSON.stringify(await evalJs('document.getElementById("l2").textContent')), 'tip:', JSON.stringify(await evalJs('document.getElementById("l2").title')));
    await sleep(2000); console.log('   outlined 2 s later:', await evalJs('document.querySelectorAll(\'.n.pick[data-k^="s:"]\').length'));
    await click('#l3'); await sleep(500); await st('All sessions, click the step "Its files"', '0|');
    await click('#l1'); await sleep(900); await click('#l2'); await sleep(500); await st('Hooks, click the step "One session"', '1|');
    await home(); await clickAt('[data-a="s:UX"]'); await st('click UX on the picture', '2|UX');
    await click('#l3'); await sleep(1000); await st('UX open, the step "Files of UX"', '3|UX');
    await click('#l2'); await sleep(1000); await st('files of UX, the step "One session: UX"', '2|UX'); await shot('step-2-one-session-chosen');
    await click('#l1'); await sleep(1000); await st('the step "Hooks"', '1|');
    await click('#l2'); await sleep(500); await st('Hooks, the step "One session" (UX was open before)', '1|');
    await key('Escape'); await st('Esc', '0|'); await click('#narrower'); await sleep(1000); await st('All sessions, the Narrower button', '1|'); await click('#narrower'); await sleep(600); await st('Hooks, the Narrower button', '1|');
    await go(base + '&level=2'); await st('opened with level=2 and no session named', '1|');
    await go(base + '&level=0'); await set({ t: '03:29', level: 0, paused: true, instant: true });

    console.log('--- 3. the result labels, the panel closed and open');
    // walk: the replay stopped at every minute an arrow lands (thinned to 140 at most), the labels on show checked at each; at 60x, where labels stay longest and most are on show at once
    const four = ['BR1', 'BR2', 'HAP', 'UX'];
    const times = await evalJs('(function(){var s={},a=[];window.__tool.schedule().flights.forEach(function(f){var t=Math.floor(f.t)+0.98;if(!s[t]){s[t]=1;a.push(t)}});a.sort(function(x,y){return x-y});var k=Math.ceil(a.length/140),o=[];for(var i=0;i<a.length;i+=k)o.push(a[i]);return o})()');
    console.log('   minutes walked:', times.length);
    const walk = async (label, cfg) => {
      let seen = 0, most = 0, mostRows = 0; const over = {};
      for (const t of times) {
        await evalJs('window.__tool.set(' + JSON.stringify({ ...cfg, m: t, speed: 60, paused: true, instant: true }) + ')');
        const o = await evalJs('new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(function(){var o=' + OVER + ';var ys={};document.querySelectorAll(\'.n[data-k^="h:"]\').forEach(function(e){ys[Math.round(e.getBoundingClientRect().top)]=1});o.rows=Object.keys(ys).length;r(o)})})})');
        seen += o.labels; most = Math.max(most, o.labels); mostRows = Math.max(mostRows, o.rows); o.over.forEach((x) => { over[x] = (over[x] || 0) + 1; });
      }
      const n = Object.keys(over).length, e = await evalJs('document.getElementById("err").textContent'); if (n || e) fails++;
      console.log(n ? 'WRONG' : 'ok   ', label, '| hook rows up to', mostRows, '| labels seen', seen, 'most at once', most, '| overlaps', n ? JSON.stringify(over).slice(0, 500) : 0, e ? '| PAGE ERROR ' + e : '');
    };
    const toHooks = async () => { await evalJs('(function(){var s=document.getElementById("stage");if(s.scrollHeight>s.clientHeight+2)s.scrollTop=s.scrollHeight})()'); await sleep(500); };   // a picture taller than the window: down to the hooks
    for (const panel of [false, true]) {
      const tag = panel ? 'panel open' : 'panel closed', sfx = panel ? 'panel-open' : 'panel-closed';
      await home(); if (panel) { await set({ level: 1 }, 600); await set({ pane: 'doc:briefs' }, 1500); }
      await walk('All sessions, ' + tag, { page: 'now', level: 0 });
      await walk('Hooks, ' + tag, { page: 'now', level: 1 });
      await walk('one session (BR1), ' + tag, { page: 'now', level: 2, open: 'BR1' });
      await walk('four sessions, ' + tag, { page: 'now', level: 2, group: four });
      await walk('History, Hooks, ' + tag, { page: 'history', level: 1 });
      await set({ page: 'now', speed: 10, t: '03:29', level: 2, group: four, paused: true, instant: true }, 1300); await toHooks(); await shot(panel ? 'box-3-view-with-panel' : 'labels-four-sessions-panel-closed');
      await set({ t: '03:29', level: 1, paused: true, instant: true }, 1300); await toHooks(); await shot('labels-hooks-' + sfx);
      await set({ t: '03:29', level: 0, paused: true, instant: true }, 1300); await toHooks(); await shot('labels-all-sessions-' + sfx);
      await sweep('frames, Now at 60x, Hooks, ' + tag, { t: '03:00', level: 1, paused: false, speed: 60, instant: true }, 6);
    }
    await sweep('frames, History played back at 60x, Hooks, panel open', { page: 'history', t: '10:30', level: 1, paused: false, speed: 60, instant: true }, 6);
    await err(); console.log(fails ? fails + ' CHECKS WRONG' : 'every check as wanted');
  }
  if (only === 'live') {
    await go(liveUrl + '?dry=1'); await sleep(2500);
    await shot('live-now'); const s0 = await state();
    await sleep(6000); const s1 = await state(); console.log('hook calls seen in 6 s:', s1.calls - s0.calls, '; arrows on the picture now:', await evalJs('document.getElementById("arrows").children.length'));
    await set({ level: 1 }, 1500); await shot('live-hooks');
    await set({ page: 'history', level: 0 }, 1500); await shot('live-history'); await state();
    await size(800, 600); await set({ page: 'now', level: 0 }, 1500); await shot('live-pane'); await state();
    await err();
  }
} catch (e) { console.error('FAILED', e.message); }
finally { try { ws && ws.close(); } catch (e) { /* closed */ } edge.kill(); }
