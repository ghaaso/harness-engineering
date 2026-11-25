// Round 9, the live feed behind the owner's session tool. Node built-ins only; listens on 127.0.0.1 only.
// Run: node server.mjs   (PORT, default 7419; HOOK_LOGS to point the hook tail at another folder, for tests)
//   GET /            the page (tool/index.html, read fresh)      GET /data.json   the latest TOOL_DATA (503 until the first read)
//   GET /live        server-sent events: data {madeMs}, hook {t, session, part, result}, tick every 15 s
//   GET /open?path=  VS Code on a file inside the repository or the home folder     POST /outbox  queue an answer/stop/prompt
//   GET /file?path=  the text of one file inside the repository, for the page's side panel (read-only; any other path is refused)
//   GET /fail?session=&part=hook:name&result=failed|refused   what that hook failed on or refused for that session (its log, the transcript)
// The read step is monitor/build/snapshot.mjs, called as monitor/app/server.mjs calls it (not edited).
import { createServer } from 'node:http';
import { readFileSync, existsSync, renameSync, watch, statSync, readdirSync, openSync, readSync, closeSync, appendFileSync, writeFileSync, realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { toToolData, hookLine, BASE_MS } from './live/convert.mjs';
import { readAsks } from './live/asks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 7419;
const REPO = resolve(HERE, '..', '..', '..', '..', '..');
const MON = join(REPO, 'docs', 'program', 'monitor');
const LIVE = join(HERE, 'live');
const LOGS = process.env.HOOK_LOGS ? resolve(process.env.HOOK_LOGS) : join(REPO, '.claude', 'logs');
const STORE = join(homedir(), '.claude', 'projects');
const dash = p => p.replace(/[:\\/]/g, '-');
const FOLDERS = [dash(REPO), dash(join(REPO, 'library')), 'C--research-runs-2026-11-harness-leads'].map(f => join(STORE, f)).filter(existsSync);
const SNAP = join(LIVE, 'snapshot.json'), NEXT = join(LIVE, 'snapshot.next.json'), OUTBOX = join(LIVE, 'outbox.jsonl');
const GAP = 30e3;                                                    // at most one read every 30 s

let dataJson = null, madeMs = 0, reading = false, lastRun = 0, timer = null, dirty = false;
const stats = { readMs: 0, convertMs: 0 };
const clients = new Set();
const push = (event, obj) => { const line = `event: ${event}\ndata: ${JSON.stringify(obj)}\n\n`; for (const r of clients) r.write(line); };

// ---- the read step: on a change of the session files, at most once per 30 s ---------------------------------------------
function read() {
  if (reading) { dirty = true; return; }
  reading = true; dirty = false; lastRun = Date.now();
  const t0 = Date.now();
  const p = spawn(process.execPath, [join(MON, 'build', 'snapshot.mjs'), NEXT, REPO, ...FOLDERS], { cwd: REPO, stdio: 'ignore', windowsHide: true });
  p.on('error', e => { reading = false; console.error(`live: cannot start the read step: ${e.code}`); });
  p.on('exit', code => {
    reading = false;
    if (code === 0 && existsSync(NEXT)) {
      stats.readMs = Date.now() - t0;
      try {
        renameSync(NEXT, SNAP);
        const t1 = Date.now();
        const snap = JSON.parse(readFileSync(SNAP, 'utf8'));
        dataJson = JSON.stringify(toToolData(snap, { logsDir: LOGS, asks: readAsks(snap.sessions, STORE, snap.made - 48 * 3600e3) }));
        stats.convertMs = Date.now() - t1; madeMs = snap.made;
        push('data', { madeMs });
        console.log(`live: read step ${stats.readMs} ms, conversion ${stats.convertMs} ms, ${(dataJson.length / 1024) | 0} KB`);
      } catch (e) { console.error(`live: conversion failed: ${e.message}`); }
    } else console.error(`live: the read step stopped with code ${code}`);
    if (dirty) soon();
  });
}
function soon() {
  if (timer) return;
  timer = setTimeout(() => { timer = null; read(); }, Math.max(0, lastRun + GAP - Date.now()));
}
for (const f of FOLDERS) {
  try { watch(f, { recursive: true }, (_, name) => { if (name && /\.jsonl$/.test(name)) soon(); }); }
  catch (e) { console.error(`live: cannot watch ${f}: ${e.code}`); }
}

// ---- the hook logs: remember each file's size; on a change read only the new bytes -------------------------------------
const tails = new Map();                                             // file -> { size, rest }
function listLogs() { try { return readdirSync(LOGS).filter(f => f.endsWith('.jsonl')); } catch { return []; } }
for (const f of listLogs()) { try { tails.set(f, { size: statSync(join(LOGS, f)).size, rest: '' }); } catch {} }
function checkLog(f) {
  let size; try { size = statSync(join(LOGS, f)).size; } catch { return; }
  let st = tails.get(f); if (!st) { st = { size: 0, rest: '' }; tails.set(f, st); }   // a file that appeared after the start: from its first byte
  if (size < st.size) { st.size = 0; st.rest = ''; }                 // truncated or replaced
  if (size === st.size) return;
  const buf = Buffer.alloc(size - st.size); let fd;
  try { fd = openSync(join(LOGS, f), 'r'); readSync(fd, buf, 0, buf.length, st.size); } catch { return; } finally { if (fd !== undefined) closeSync(fd); }
  st.size = size;
  const parts = (st.rest + buf.toString('utf8')).split('\n'); st.rest = parts.pop();
  const name = f.replace(/\.jsonl$/, '');
  for (const l of parts) {
    if (!l) continue; let o; try { o = JSON.parse(l); } catch { continue; }
    const h = hookLine(name, o); if (!h || !o.t) continue;
    push('hook', { t: Math.round((o.t - BASE_MS) / 6000) / 10, ms: o.t, session: h.session, part: h.part, result: h.result });
  }
}
function checkAll() { for (const f of new Set([...listLogs(), ...tails.keys()])) checkLog(f); }
try { watch(LOGS, (_, name) => { if (name && /\.jsonl$/.test(name)) checkLog(String(name)); else checkAll(); }); } catch (e) { console.error(`live: cannot watch ${LOGS}: ${e.code}`); }
setInterval(checkAll, 500);                                          // fallback: fs.watch on Windows can miss appends
setInterval(() => push('tick', { now: Date.now(), madeMs, reading }), 15e3);

// ---- requests ----------------------------------------------------------------------------------------------------------
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
// the page only: refuse other hosts (DNS rebinding) and other sites' requests (a web page cannot open files or queue answers)
function sameSite(req) {
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host || '')) return false;
  const sf = req.headers['sec-fetch-site']; if (sf && sf !== 'same-origin' && sf !== 'none') return false;
  const o = req.headers.origin; if (o && o !== 'http://' + req.headers.host) return false;
  return true;
}
function inside(base, p) { const r = relative(base, p); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); }
function openFile(url, res) {
  const raw = url.searchParams.get('path') || '';
  if (!raw || /["%\r\n\0`]/.test(raw)) return send(res, 400, { ok: false, reason: 'no usable path' });
  const p = resolve(REPO, raw);
  if (!inside(REPO, p) && !inside(homedir(), p)) return send(res, 403, { ok: false, reason: 'outside the repository and the home folder' });
  if (!existsSync(p)) return send(res, 404, { ok: false, reason: 'no such file' });
  const line = Number(url.searchParams.get('line')) || 0;
  const target = line > 0 ? `${p}:${line}` : p;
  const c = spawn(`code -g "${target}"`, { shell: true, windowsHide: true, detached: true, stdio: 'ignore' });
  c.on('error', () => {}); c.unref();
  send(res, 200, { ok: true });
}
// ---- read-only, for the side panel -------------------------------------------------------------------------------------
// One file's text. Only inside the repository (the real path too, so a link cannot lead out); never git internals or env files.
const REPO_REAL = (() => { try { return realpathSync(REPO); } catch { return REPO; } })();
const MAXFILE = 300000;                                              // bytes sent at most; the page says when a file is longer
function fileText(url, res) {
  const raw = url.searchParams.get('path') || '';
  if (!raw || /[\0\r\n]/.test(raw)) return send(res, 400, { ok: false, reason: 'no usable path' });
  const p = resolve(REPO, raw);
  if (!inside(REPO, p)) return send(res, 403, { ok: false, reason: 'it is outside the repository' });
  let real, st; try { real = realpathSync(p); st = statSync(real); } catch { return send(res, 404, { ok: false, reason: 'there is no such file' }); }
  if (!inside(REPO_REAL, real)) return send(res, 403, { ok: false, reason: 'it is outside the repository' });
  const segs = relative(REPO_REAL, real).split(sep);
  if (segs.includes('.git') || /^\.env/i.test(segs[segs.length - 1])) return send(res, 403, { ok: false, reason: 'git internals and env files are not shown' });
  if (st.isDirectory()) { let names = []; try { names = readdirSync(real).slice(0, 300); } catch {} return send(res, 200, { ok: true, dir: true, names }); }
  const n = Math.min(st.size, MAXFILE), buf = Buffer.alloc(n); let fd;
  try { fd = openSync(real, 'r'); readSync(fd, buf, 0, n, 0); } catch { return send(res, 500, { ok: false, reason: 'it could not be read' }); } finally { if (fd !== undefined) closeSync(fd); }
  if (buf.subarray(0, 8000).includes(0)) return send(res, 200, { ok: false, reason: 'it is not a text file' });
  send(res, 200, { ok: true, path: segs.join('/'), size: st.size, shown: n, text: buf.toString('utf8') });
}
// What a hook failed on, or refused, for one session. Two records: the hook's own log (a refusal with its reason; a window
// past its line), and the session's transcript (the error the app recorded from the hook when a turn ended).
const tcache = new Map();                                            // transcript -> { size, errs: [{ ms, text }] }
function hookErrors(file) {
  let size; try { size = statSync(file).size; } catch { return []; }
  const c = tcache.get(file); if (c && c.size === size) return c.errs;
  const errs = []; let text = ''; try { text = readFileSync(file, 'utf8'); } catch { return errs; }
  for (const l of text.split('\n')) {
    if (l.indexOf('stop_hook_summary') < 0) continue; let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.subtype !== 'stop_hook_summary') continue;
    for (const e of o.hookErrors || []) errs.push({ ms: Date.parse(o.timestamp) || 0, text: String(e) });
  }
  tcache.set(file, { size, errs }); return errs;
}
function failInfo(url, res) {
  const sid = url.searchParams.get('session') || '', part = url.searchParams.get('part') || '', want = url.searchParams.get('result') === 'refused' ? 'refused' : 'failed';
  if (!/^[0-9a-f]{8}$/.test(sid) || !/^hook:[a-z-]+$/.test(part)) return send(res, 400, { ok: false, reason: 'need session (8 hex digits) and part (hook:name)' });
  const name = part.slice(5), items = []; let first = null, worst = null, text = '';
  try { text = readFileSync(join(LOGS, name + '.jsonl'), 'utf8'); } catch {}
  for (const l of text.split('\n')) {
    if (!l || l.indexOf(sid) < 0) continue; let o; try { o = JSON.parse(l); } catch { continue; }
    const h = hookLine(name, o); if (!h || h.session !== sid || !o.t) continue;
    if (want === 'failed' && name === 'window-ceiling' && !o.agent && o.ctx && o.line && o.ctx > o.line) { if (!first) first = o; if (!worst || o.ctx / o.line > worst.ctx / worst.line) worst = o; }
    if (h.result !== want) continue;
    const { t, session, sess, decision, ev, why, error, ...rest } = o;
    items.push({ ms: o.t, src: 'log', text: String(why || error || ''), fields: JSON.stringify(rest).slice(0, 700) });
  }
  const win = o => 'The window was at ' + o.ctx.toLocaleString('en') + ' tokens, past its line of ' + o.line.toLocaleString('en') + (o.tool ? ' (at a ' + o.tool + ' call)' : '') + '.';
  if (first) items.push({ ms: first.t, src: 'log', text: 'First past the line. ' + win(first) });
  if (worst && worst !== first) items.push({ ms: worst.t, src: 'log', text: 'Furthest past the line. ' + win(worst) });
  if (want === 'failed') for (const dir of FOLDERS) {
    let f; try { f = readdirSync(dir).find(n => n.startsWith(sid) && n.endsWith('.jsonl')); } catch {}
    if (f) for (const e of hookErrors(join(dir, f))) if (e.text.replace(/\\/g, '/').includes('hooks/' + name + '.mjs')) items.push({ ms: e.ms, src: 'transcript', text: e.text.replace(/^\[[^\]]*\]:\s*/, '').trim().slice(0, 3000) });
  }
  items.sort((a, b) => a.ms - b.ms);
  send(res, 200, { ok: true, items: items.slice(-80) });
}
function outbox(req, res) {
  let body = '', big = false;
  req.on('data', d => { body += d; if (body.length > 65536) { big = true; req.destroy(); } });
  req.on('end', () => {
    if (big) return;
    let j; try { j = JSON.parse(body); } catch { return send(res, 400, { ok: false, reason: 'not JSON' }); }
    if (!j || !['answer', 'stop', 'undo-stop', 'prompt'].includes(j.kind) || typeof j.session !== 'string' || (j.text !== undefined && typeof j.text !== 'string'))
      return send(res, 400, { ok: false, reason: 'need {kind: answer|stop|undo-stop|prompt, session, text}' });
    appendFileSync(OUTBOX, JSON.stringify({ t: Date.now(), kind: j.kind, session: j.session, text: j.text || '' }) + '\n');
    send(res, 200, { ok: true, queued: true });
  });
}
function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    let page; try { page = readFileSync(join(HERE, 'index.html')); } catch { return send(res, 404, { ok: false, reason: 'index.html not there' }); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(page);
  } else if (req.method === 'GET' && url.pathname === '/data.json') {
    if (!dataJson) { res.writeHead(503, { 'cache-control': 'no-store' }); res.end(); return; }
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(dataJson);
  } else if (req.method === 'GET' && url.pathname === '/live') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(`event: tick\ndata: ${JSON.stringify({ now: Date.now(), madeMs, reading })}\n\n`);
    clients.add(res); req.on('close', () => clients.delete(res));
  } else if (req.method === 'GET' && url.pathname === '/open') {
    if (!sameSite(req)) return send(res, 403, { ok: false, reason: 'not from the page' });
    openFile(url, res);
  } else if (req.method === 'GET' && (url.pathname === '/file' || url.pathname === '/fail')) {
    if (!sameSite(req)) return send(res, 403, { ok: false, reason: 'not from the page' });
    if (url.pathname === '/file') fileText(url, res); else failInfo(url, res);
  } else if (req.method === 'POST' && url.pathname === '/outbox') {
    if (!sameSite(req)) return send(res, 403, { ok: false, reason: 'not from the page' });
    outbox(req, res);
  } else send(res, 404, { ok: false });
}

const server = createServer(handler);
server.on('error', e => { console.error(`live: cannot listen on 127.0.0.1:${PORT}: ${e.code}`); process.exit(1); });
server.listen(PORT, '127.0.0.1', () => {
  console.log(`live: http://127.0.0.1:${PORT}  (watching ${FOLDERS.length} session folders and ${listLogs().length} hook logs in ${LOGS})`);
  read();
});
