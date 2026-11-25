// node pdf.mjs [memoryDir] [diagram.svg] [out.pdf]  ->  <memoryDir>/<out.pdf>
//   defaults: harness-memory.svg -> memory-pipeline.pdf
//   harness-memory-only.svg -> memory-pipeline-and-benchmarks.pdf (no task pipeline)
// Page 1: the diagram (vector, fitted to an A4 page). Then the benchmarks from MEMORY-BENCHMARKS.md.
// Printed by headless Edge; nothing to install. Run build.mjs first.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const dir = resolve(process.argv[2] || '../memory');
const svgName = process.argv[3] || 'harness-memory.svg', pdfName = process.argv[4] || 'memory-pipeline.pdf';
const svg = readFileSync(join(dir, svgName), 'utf8');
const md = readFileSync(join(dir, 'MEMORY-BENCHMARKS.md'), 'utf8');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

// ---------- the small part of markdown the benchmarks file uses ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
function table(rows) {
  const cells = rows.filter((l) => !/^\|[\s:|-]+\|$/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim())));
  const [head, ...body] = cells;
  return `<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function mdToHtml(text) {
  const lines = text.split(/\r?\n/), out = [];
  let i = 0, inList = false, item = null;
  const flush = () => { if (item !== null) out.push(`<li>${item}</li>`); item = null; };
  const close = () => { flush(); if (inList) out.push('</ul>'); inList = false; };
  while (i < lines.length) {
    const raw = lines[i], t = raw.trim();
    if (!t) { i++; continue; }
    if (t.startsWith('|')) {
      const rows = []; while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim());
      if (item !== null) item += table(rows); else { close(); out.push(table(rows)); }
      continue;
    }
    const h = t.match(/^(#{1,6}) (.*)$/);
    if (h) { close(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (t.startsWith('- ') && !raw.startsWith(' ')) { if (!inList) out.push('<ul>'); inList = true; flush(); item = inline(t.slice(2)); i++; continue; }
    if (raw.startsWith('  ') && item !== null) { item += ' ' + inline(t); i++; continue; }
    close();
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#|- |\|)/.test(lines[i].trim())) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  close();
  return out.join('\n');
}

// ---------- the page ----------
const [W, H] = svg.match(/width="(\d+)" height="(\d+)"/).slice(1).map(Number);
const s = Math.min(190 / W, 277 / H);                       // A4 less 10 mm margins, in mm
const fitted = svg.replace('<svg ', `<svg style="width:${(W * s).toFixed(1)}mm;height:${(H * s).toFixed(1)}mm" `);
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Memory pipeline</title><style>
@page { size: A4; margin: 10mm; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; }
.diagram { height: 277mm; display: flex; justify-content: center; break-after: page; }
.text { font-size: 9.5pt; line-height: 1.38; padding: 2mm 4mm 0; }
h1 { font-size: 14.5pt; margin: 0 0 2mm; }
h2 { font-size: 11.5pt; margin: 4.5mm 0 1.8mm; break-after: avoid; }
p { margin: 0 0 1.8mm; }
ul { margin: 0; padding-left: 5mm; }
li { margin: 0 0 1.2mm; }
table { border-collapse: collapse; width: 100%; margin: 1.5mm 0 1mm; font-size: 8.8pt; line-height: 1.3; }
th, td { border: 0.6pt solid #cbd5e1; padding: 1.1mm 2mm; text-align: left; vertical-align: top; }
th:first-child, td:first-child { width: 26%; }
thead tr th:nth-child(2):not(:last-child) { width: 44%; }
li table { width: auto; break-inside: avoid; }
li table th:first-child, li table td:first-child { width: auto; padding-right: 8mm; }
th { background: #f1f5f9; }
tr { break-inside: avoid; }
code { font-family: Consolas, monospace; font-size: 9.5pt; }
</style></head><body>
<div class="diagram">${fitted}</div>
<div class="text">${mdToHtml(md)}</div>
</body></html>`;

const tmp = mkdtempSync(join(tmpdir(), 'memory-pdf-'));
const page = join(tmp, 'memory.html'), pdf = join(dir, pdfName);
writeFileSync(page, html);
execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${join(tmpdir(), 'harness-diagram-edge-profile')}`,
  '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, pathToFileURL(page).href], { stdio: 'ignore', timeout: 120000 });
rmSync(tmp, { recursive: true, force: true });
console.log(`${pdf}: diagram ${(W * s).toFixed(0)} x ${(H * s).toFixed(0)} mm on page 1`);
