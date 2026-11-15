// Render driver: opens the built HTML in headless Chrome (or Edge) over the DevTools protocol,
// waits for the paginator, prints the PDF, and saves one PNG per page for visual checks.
// No dependencies (node >= 22 has fetch and WebSocket built in).
// Usage: node render.cjs <page.html> <out.pdf> [shotsDir] [--pages=1,2,5-9] [--scale=1.5] [--noshots]
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const argv = process.argv.slice(2);
const pos = argv.filter(a => !a.startsWith('--'));
const opt = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v == null ? true : v]; }));
const htmlPath = path.resolve(pos[0]);
const pdfPath = path.resolve(pos[1]);
const shotsDir = pos[2] ? path.resolve(pos[2]) : null;
const scale = Number(opt.scale || 1.5);

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const exe = BROWSERS.find(b => fs.existsSync(b));
if (!exe) { console.error('no Chrome or Edge'); process.exit(2); }
const port = 9700 + (process.pid % 250);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-render-'));
const child = spawn(exe, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--window-size=1000,1400', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJson(u) { const r = await fetch(u); return r.json(); }
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0; const waiting = new Map(); const listeners = [];
    ws.onopen = () => resolve({
      send(method, params) { return new Promise((res, rej) => { const i = ++id; waiting.set(i, { res, rej, method }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); }); },
      once(event) { return new Promise(res => listeners.push({ event, res })); },
      close() { try { ws.close(); } catch (e) {} },
    });
    ws.onerror = () => reject(new Error('websocket error'));
    ws.onmessage = m => {
      const msg = JSON.parse(typeof m.data === 'string' ? m.data : Buffer.from(m.data).toString('utf8'));
      if (msg.id && waiting.has(msg.id)) { const w = waiting.get(msg.id); waiting.delete(msg.id); if (msg.error) w.rej(new Error(w.method + ': ' + msg.error.message)); else w.res(msg.result); }
      else if (msg.method) { for (let i = listeners.length - 1; i >= 0; i--) if (listeners[i].event === msg.method) { listeners[i].res(msg.params); listeners.splice(i, 1); } }
    };
  });
}
function parsePages(spec, total) {
  if (!spec || spec === true) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [];
  String(spec).split(',').forEach(part => {
    const m = part.split('-').map(Number);
    if (m.length === 2) for (let i = m[0]; i <= Math.min(m[1], total); i++) out.push(i); else if (m[0] <= total) out.push(m[0]);
  });
  return out;
}
async function main() {
  let version = null;
  for (let i = 0; i < 100 && !version; i++) { try { version = await getJson('http://127.0.0.1:' + port + '/json/version'); } catch (e) { await sleep(150); } }
  if (!version) throw new Error('the browser did not start');
  const target = (await getJson('http://127.0.0.1:' + port + '/json/list')).find(t => t.type === 'page');
  const page = await connect(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable');
  const consoleMsgs = [];
  await page.send('Log.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 1400, deviceScaleFactor: scale, mobile: false });
  await page.send('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  async function ev(expression) {
    const r = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page script failed: ' + String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text).slice(0, 400));
    return r.result.value;
  }
  const loaded = page.once('Page.loadEventFired');
  await page.send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') });
  await loaded;
  let paged = null;
  for (let i = 0; i < 200 && !paged; i++) { paged = await ev('window.__paged ? JSON.stringify(window.__paged) : null'); if (!paged) await sleep(100); }
  if (!paged) throw new Error('the paginator never finished');
  const info = JSON.parse(paged);
  const errs = await ev('JSON.stringify(window.__errors || [])');
  console.log('pages ' + info.pages + '  overflow ' + info.overflow.length + '  sparse ' + JSON.stringify(info.sparse) + '  tocMissing ' + JSON.stringify(info.tocMissing));
  info.overflow.forEach(o => console.log('  OVERFLOW p' + o.page + ': ' + o.what));
  if (errs !== '[]') console.log('  page errors: ' + errs);
  const pdf = await page.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, generateDocumentOutline: true, generateTaggedPDF: true });
  const buf = Buffer.from(pdf.data, 'base64');
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.writeFileSync(pdfPath, buf);
  const pdfPages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log('pdf ' + pdfPath + '  ' + Math.round(buf.length / 1024) + ' KB  pdfPages ' + pdfPages + (pdfPages !== info.pages ? '  MISMATCH with ' + info.pages + ' page boxes' : ''));
  if (shotsDir && !opt.noshots) {
    fs.mkdirSync(shotsDir, { recursive: true });
    const want = parsePages(opt.pages, info.pages);
    for (const n of want) {
      const r = JSON.parse(await ev('(()=>{const e=document.querySelector(".page[data-n=\\"' + n + '\\"]");const b=e.getBoundingClientRect();return JSON.stringify({x:b.left+scrollX,y:b.top+scrollY,w:b.width,h:b.height})})()'));
      const png = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 }, captureBeyondViewport: true });
      fs.writeFileSync(path.join(shotsDir, 'p' + String(n).padStart(2, '0') + '.png'), Buffer.from(png.data, 'base64'));
    }
    console.log('shots ' + want.length + ' in ' + shotsDir);
  }
  fs.writeFileSync(pdfPath.replace(/\.pdf$/i, '.render.json'), JSON.stringify(Object.assign({ pdfPages, bytes: buf.length }, info), null, 1));
  page.close();
  try { const b = await connect(version.webSocketDebuggerUrl); await b.send('Browser.close'); b.close(); } catch (e) {}
}
main().catch(e => { console.error('error: ' + e.message); process.exitCode = 1; }).finally(async () => {
  await sleep(300); try { child.kill(); } catch (e) {}
  await sleep(300); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
});
