// Session monitor, round 7: the local program behind the page.
// Node built-ins only; listens on this machine only (127.0.0.1 and ::1). Run: node docs/program/monitor/app/server.mjs
// Live: it watches the session files; when they change it runs the read step (build/snapshot.mjs, about 6 s) at most
// once every 30 s, writes app/data.json and tells every open page by server push, and the page redraws itself.
import { createServer } from 'node:http';
import { readFileSync, existsSync, renameSync, watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 7417;
const REPO = join(HERE, '..', '..', '..', '..');
const STORE = join(homedir(), '.claude', 'projects');
const dash = p => p.replace(/[:\\/]/g, '-');
// The session folders the read step takes (as in the monitor's README): this repository, its library, the research runs.
const FOLDERS = [dash(REPO), dash(join(REPO, 'library')), 'C--research-runs-2026-11-harness-leads']
  .map(f => join(STORE, f)).filter(existsSync);
const DATA = join(HERE, 'data.json'), NEXT = join(HERE, 'data.next.json');
const GAP = 30e3;                                   // at most one read every 30 s

let made = 0, reading = false, lastRun = 0, timer = null, dirty = false;
const clients = new Set();
const push = (event, obj) => { const line = `event: ${event}\ndata: ${JSON.stringify(obj)}\n\n`; for (const r of clients) r.write(line); };

function read() {
  if (reading) { dirty = true; return; }
  reading = true; dirty = false; lastRun = Date.now();
  const p = spawn(process.execPath, [join(HERE, '..', 'build', 'snapshot.mjs'), NEXT, REPO, ...FOLDERS], { cwd: REPO, stdio: 'ignore', windowsHide: true });
  p.on('exit', code => {
    reading = false;
    if (code === 0 && existsSync(NEXT)) { renameSync(NEXT, DATA); made = Date.now(); push('data', { made }); }
    else console.error(`monitor: the read step stopped with code ${code}`);
    if (dirty) soon();
  });
}
function soon() {                                   // a change was seen: read now, or as soon as 30 s have passed
  if (timer) return;
  timer = setTimeout(() => { timer = null; read(); }, Math.max(0, lastRun + GAP - Date.now()));
}
for (const f of FOLDERS) {
  try { watch(f, { recursive: true }, (_, name) => { if (name && /\.jsonl$/.test(name)) soon(); }); }
  catch (e) { console.error(`monitor: cannot watch ${f}: ${e.code}`); }
}
read();
setInterval(() => push('tick', { now: Date.now(), made, reading }), 15e3);

function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(readFileSync(join(HERE, 'page.html')));
  } else if (url.pathname === '/data.json') {
    if (!existsSync(DATA)) { res.writeHead(503); res.end(); return; }
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(readFileSync(DATA));
  } else if (url.pathname === '/live') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(`event: tick\ndata: ${JSON.stringify({ now: Date.now(), made, reading })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  } else {
    res.writeHead(404); res.end();
  }
}

let listening = 0;
for (const host of ['127.0.0.1', '::1']) {
  const s = createServer(handler);
  s.on('error', e => { if (host === '127.0.0.1') { console.error(`monitor: cannot listen on ${host}:${PORT}: ${e.code}`); process.exit(1); } });
  s.listen(PORT, host, () => { if (++listening === 1) console.log(`monitor: http://localhost:${PORT} (watching ${FOLDERS.length} session folders)`); });
}
