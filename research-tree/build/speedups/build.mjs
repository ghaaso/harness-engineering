// Builds speedups.html from SPEEDUPS.md and prints speedups.pdf with headless Edge.
// Usage: node build.mjs [scratch-folder]   (run from anywhere; paths are absolute)
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const scratch = process.argv[2] || join(here, '..', '..', '..', '.speedups-scratch');
mkdirSync(scratch, { recursive: true });
const md = readFileSync(join(here, 'SPEEDUPS.md'), 'utf8').replace(/\r/g, '').split('\n');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/`([^`]+)`/g, '<code>$1</code>');

let out = [];
let title = '';
let i = 0;
let inItem = false; let curGroup = "";
const closeItem = () => { if (inItem) { out.push('</div>'); inItem = false; } };

while (i < md.length) {
  const line = md[i];
  if (line.startsWith('# ')) {
    closeItem();
    if (!title) { title = line.slice(2); out.push(`<h1 class="title">${inline(title)}</h1>`); }
    else {
      const t = line.slice(2); curGroup = t;
      const isMap = t === 'The agent map';
      out.push(`<h2 class="group${isMap ? ' mapgroup' : ''}">${inline(t)}</h2>`);
    }
    i++;
  } else if (line.startsWith('## ')) {
    closeItem();
    const t = line.slice(3);
    const isTable = t === 'Every improvement, by what it improves';
    if (isTable || t === 'Summary') out.push(`<h2 class="sec">${inline(t)}</h2>`);
    else { out.push('<div class="item">'); inItem = true; out.push(`<h3>${inline(t)}</h3>`); }
    i++;
  } else if (line.startsWith('<div')) {
    const buf = [];
    while (i < md.length && md[i].trim() !== '') buf.push(md[i++]);
    out.push(buf.join('\n').replace('src="../tree/', 'src="../tree/'));
  } else if (line.startsWith('|')) {
    const rows = [];
    while (i < md.length && md[i].startsWith('|')) rows.push(md[i++]);
    const cells = (r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    const head = cells(rows[0]);
    let h = '<table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
    let prevGroup = '';
    for (const r of rows.slice(2)) {
      const c = cells(r);
      const newGroup = c[0] && head[0] === 'Group';
      if (newGroup) prevGroup = c[0];
      h += `<tr${newGroup ? ' class="gstart"' : ''}>` + c.map((x, k) => (k === 0 ? `<td class="g">${inline(x)}</td>` : `<td>${inline(x)}</td>`)).join('') + '</tr>';
    }
    h += '</tbody></table>';
    out.push(h);
  } else if (/^\d+\. /.test(line)) {
    const items = [];
    while (i < md.length && /^\d+\. /.test(md[i])) items.push(md[i++].replace(/^\d+\. /, ''));
    out.push('<ol>' + items.map((x) => `<li>${inline(x)}</li>`).join('') + '</ol>');
  } else if (line.startsWith('- ')) {
    const items = [];
    while (i < md.length && md[i].startsWith('- ')) items.push(md[i++].slice(2));
    out.push('<ul>' + items.map((x) => `<li>${inline(x)}</li>`).join('') + '</ul>');
  } else if (line.trim() === '') {
    i++;
  } else {
    // paragraph; a lone "How to read it." style stays a paragraph
    out.push(`<p${curGroup === "Sources" ? " class=\"last\"" : curGroup === "The agent map" ? " class=\"mapp\"" : ""}>${inline(line)}</p>`);
    i++;
  }
}
closeItem();

const css = `
@page { size: A4; margin: 12mm 13mm 13mm 13mm; }
@page map { size: A4 landscape; margin: 8mm; }
:root { --ink:#1b2430; --mute:#56606c; --line:#d5dae0; --accent:#1f5fa8; --tint:#eef3f9; --warn:#f5ecd9; }
* { box-sizing: border-box; }
body { font: 11pt/1.33 "Segoe UI", Arial, sans-serif; color: var(--ink); background:#fff; margin:0; }
h1.title { font-size: 21pt; line-height: 1.2; margin: 0 0 3mm; color: var(--accent); }
h2.sec { font-size: 14pt; margin: 6mm 0 2mm; border-bottom: 1.5px solid var(--accent); padding-bottom: 1mm; break-after: avoid; }
h2.group { font-size: 15pt; margin: 0 0 3mm; padding: 2mm 3mm; background: var(--accent); color:#fff; break-after: avoid; margin-top: 5mm; }
h2.group.mapgroup { break-before: page; page: map; margin: 0 0 2mm; padding: 1.5mm 3mm; font-size: 13pt; }
h3 { font-size: 11.5pt; margin: 0 0 1mm; color: var(--accent); }
.item { margin: 0 0 3mm; break-inside: avoid; }
.item p { margin: 0 0 1mm; }
p { margin: 0 0 2mm; }
ul, ol { margin: 0 0 2mm; padding-left: 6mm; }
li { margin: 0 0 .5mm; }
code { font: 9.5pt Consolas, monospace; background: var(--tint); padding: 0 1mm; }
table { border-collapse: collapse; width: 100%; font-size: 8.4pt; line-height: 1.28; }
th { background: var(--accent); color:#fff; text-align:left; padding: 1.2mm 1.5mm; }
td { border-bottom: 1px solid var(--line); padding: 1mm 1.5mm; vertical-align: top; }
td.g { font-weight: 700; color: var(--accent); width: 17%; }
tr.gstart td { border-top: 1.5px solid var(--accent); }
tr { break-inside: avoid; }
.fig { border: 1px solid var(--line); background: var(--tint); padding: 3mm; margin: 2mm 0 3mm; break-inside: avoid; font-size: 9.5pt; }
.figrow { margin-bottom: 3mm; }
.figrow:last-child { margin-bottom: 0; }
.figlabel { font-weight: 700; margin-bottom: 1.5mm; }
.fignote { color: var(--mute); margin-top: 1mm; font-style: italic; }
.lane { display: flex; align-items: center; gap: 2mm; margin-bottom: 1mm; }
.lane b { width: 18mm; }
.u { display:inline-block; background:#fff; border:1px solid #9aa7b5; padding: .6mm 2mm; border-radius: 1mm; }
.u.c { background:#fff; border-color: var(--accent); margin-right: 1.5mm; }
.arrow { margin: 1.5mm 0; padding-left: 8mm; color: var(--accent); font-weight: 700; }
.arrow::before { content: "\\2193  "; }
.shared { background: var(--accent); color:#fff; display:inline-block; padding: 1mm 4mm; border-radius: 1mm; }
.last { font-size: 8pt; }
.mapp { page: map; margin: 0 0 1.5mm; font-size: 10.5pt; }
.mappage { page: map; text-align: center; }
.mappage img { max-width: 100%; max-height: 138mm; }
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${out.join('\n')}</body></html>`;
writeFileSync(join(here, 'speedups.html'), html);

const outPdf = join(scratch, 'speedups.pdf'); try { rmSync(outPdf); } catch {}
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const r = spawnSync(edge, [
  '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${join(scratch, 'edge-profile')}`,
  '--no-pdf-header-footer', `--print-to-pdf=${outPdf}`,
  pathToFileURL(join(here, 'speedups.html')).href,
], { timeout: 120000, encoding: 'utf8' });
for (let k = 0; k < 40 && !existsSync(outPdf); k++) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
console.log('edge exit', r.status, (r.stderr || '').split('\n').slice(-3).join(' | '));
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
try { copyFileSync(outPdf, join(here, 'speedups.pdf')); console.log('copied'); } catch (e) { console.log('copy failed', e.code, 'PDF is at', outPdf); }
