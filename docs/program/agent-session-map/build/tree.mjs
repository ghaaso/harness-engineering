// tree.mjs: the agent tree (second version, 2026-11-20).
// Every session and every helper is one node, joined by a line to the session or helper that started it.
// Reads sessions.json and each session's helper meta files (no message text, no token counts).
// Writes agent-session-map.svg and agent-session-map.drawio beside sessions.json; build/shoot.sh makes the PNG.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = JSON.parse(readFileSync(join(OUT, 'sessions.json'), 'utf8'));
const NAME = { top: 'Top session', 'analyse-plan': 'Build plan', 'check-plan': 'Harness check and plan',
  'nesting-probe': 'Nesting test', 'root-1': 'Build root 1', 'root-2': 'Build root 2', pipeline: 'Pipeline diagram' };
const ROLE = { 'build-invariant': 'build', build: 'build', refute: 'review', analyse: 'analysis', read: 'read',
  run: 'run', test: 'test', extract: 'extract', collect: 'collect' };

function label(desc) {
  const m = /^([a-z-]+):\s*(.*)$/.exec(desc || '');
  if (!m) return (desc || 'helper').slice(0, 50);
  const first = m[2].split(/\s+/)[0];
  if (/^[A-Z][A-Z0-9.\-]{0,9}[a-z]?$/.test(first) && first !== 'PC') return first + ' ' + (ROLE[m[1]] || m[1]);
  const t = m[2].replace(/\s*\([^)]*\)/g, '').trim();
  return t.length > 50 ? t.slice(0, 49).trimEnd() + '…' : t;
}
const born = (f) => { try { const s = statSync(f); return s.birthtimeMs || s.mtimeMs; } catch { return 0; } };

const nodes = new Map();
const add = (n) => nodes.set(n.id, n);
add({ id: 'you', label: 'You', kind: 'you', t: 0, children: [] });
for (const s of S.sessions) add({ id: 's:' + s.key, label: NAME[s.key] || s.title, kind: 'session', children: [],
  t: born(S.transcripts + s.transcript + '.jsonl'), parent: s.startedBy === 'owner' ? 'you' : 's:' + s.startedBy });
for (const s of S.sessions) {
  const dir = S.transcripts + s.transcript + '/subagents';
  if (!existsSync(dir)) continue;
  const hs = readdirSync(dir).filter((f) => f.endsWith('.meta.json')).map((f) => {
    const aid = f.slice(6, -10); let m = {};
    try { m = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch {}
    return { aid, m, t: born(join(dir, `agent-${aid}.jsonl`)) };
  }).sort((a, b) => a.t - b.t);
  const seen = {};
  for (const h of hs) {
    const base = label(h.m.description); const k = (seen[base] = (seen[base] || 0) + 1);
    add({ id: `h:${s.key}:${h.aid}`, label: k > 1 ? `${base} ${k}` : base, kind: 'helper', running: h.m.finished !== true,
      t: h.t, children: [], parent: h.m.parentAgentId ? `h:${s.key}:${h.m.parentAgentId}` : 's:' + s.key, session: 's:' + s.key });
  }
}
for (const n of nodes.values()) if (n.parent) (nodes.get(n.parent) || nodes.get(n.session) || nodes.get('you')).children.push(n);
const size = (n) => 1 + n.children.reduce((a, c) => a + size(c), 0);
// Under each node: its helpers in the order they started, then its child sessions, smallest first.
for (const n of nodes.values()) n.children.sort((a, b) => n.kind === 'you' ? a.t - b.t
  : ((a.kind === 'session') - (b.kind === 'session')) || (a.kind === 'session' ? size(a) - size(b) : 0) || a.t - b.t);

const ST = {
  you: { fs: 18, h: 36, px: 18, fill: '#1f2933', stroke: '#1f2933', ink: '#ffffff', bold: true },
  session: { fs: 15, h: 28, px: 13, fill: '#2f5d8a', stroke: '#2f5d8a', ink: '#ffffff', bold: true },
  helper: { fs: 13, h: 20, px: 10, fill: '#eef2f7', stroke: '#b6c2cf', ink: '#24313f', bold: false },
  running: { fs: 13, h: 20, px: 10, fill: '#fff0d9', stroke: '#e8890c', ink: '#24313f', bold: false } };
const st = (n) => ST[n.kind === 'helper' && n.running ? 'running' : n.kind];
function tw(s, fs, bold) {
  let w = 0;
  for (const ch of s) w += " iljtfI.,:;|!'".includes(ch) ? 0.3 : 'mwMW'.includes(ch) ? 0.86 : /[A-Z0-9]/.test(ch) ? 0.67 : 0.54;
  return w * fs * (bold ? 1.07 : 1);
}
const GAPY = 4, GAPX = 60, TOP = 124, LEFT = 28;
let cursor = TOP; const colW = [];
function place(n, d) {
  const s = st(n); n.d = d; n.h = s.h; n.w = Math.ceil(tw(n.label, s.fs, s.bold) + 2 * s.px);
  colW[d] = Math.max(colW[d] || 0, n.w);
  if (!n.children.length) { n.y = cursor; cursor += n.h + GAPY; return; }
  cursor += Math.max(0, (n.h - ST.helper.h) / 2);
  for (const c of n.children) place(c, d + 1);
  const c0 = n.children[0]; n.y = c0.y + c0.h / 2 - n.h / 2;
}
place(nodes.get('you'), 0);
const colX = [LEFT];
for (let d = 1; d < colW.length; d++) colX[d] = colX[d - 1] + colW[d - 1] + GAPX;
for (const n of nodes.values()) n.x = colX[n.d];
const W = Math.ceil(Math.max(colX[colW.length - 1] + colW[colW.length - 1] + LEFT, 1180));
const HT = Math.ceil(cursor + 44);

const cy = (m) => m.y + m.h / 2;
const edges = [];
for (const n of nodes.values()) {
  if (!n.children.length) continue;
  const tx = colX[n.d + 1] - GAPX / 2, first = n.children[0], last = n.children[n.children.length - 1];
  let p = `M${n.x + n.w},${cy(n)} H${tx}`;
  if (n.children.length > 1) p += ` M${tx},${cy(first)} V${cy(last)}`;
  for (const c of n.children) p += ` M${tx},${cy(c)} H${c.x}`;
  edges.push(p);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
const helpers = [...nodes.values()].filter((n) => n.kind === 'helper');
const nRun = helpers.filter((n) => n.running).length;
const legendText = `A line joins each one to the one that started it. ${S.sessions.length} sessions, ${helpers.length} helpers.`;
const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HT}" viewBox="0 0 ${W} ${HT}" font-family="Helvetica, Arial, sans-serif">`,
  `<rect width="${W}" height="${HT}" fill="#ffffff"/>`,
  `<text x="${LEFT}" y="46" font-size="26" font-weight="700" fill="#1f2933">Agents and sessions, ${now} UTC</text>`];
let lx = LEFT; const ly = 84;
for (const [k, t] of [['session', 'Session'], ['helper', 'Helper'], ['running', 'Helper still running']]) {
  const s = ST[k];
  svg.push(`<rect x="${lx}" y="${ly - 10}" width="30" height="20" rx="10" fill="${s.fill}" stroke="${s.stroke}"/>`);
  svg.push(`<text x="${lx + 38}" y="${ly}" font-size="15" dominant-baseline="central" fill="#24313f">${t}</text>`);
  lx += 38 + tw(t, 15, false) + 30;
}
svg.push(`<text x="${lx + 10}" y="${ly}" font-size="15" dominant-baseline="central" fill="#24313f">${esc(legendText)}</text>`);
svg.push(`<path d="${edges.join(' ')}" fill="none" stroke="#8d99a6" stroke-width="1.4"/>`);
for (const n of nodes.values()) {
  const s = st(n);
  svg.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.h / 2}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="1.2"/>`);
  svg.push(`<text x="${n.x + n.w / 2}" y="${cy(n)}" font-size="${s.fs}"${s.bold ? ' font-weight="700"' : ''} text-anchor="middle" dominant-baseline="central" fill="${s.ink}">${esc(n.label)}</text>`);
}
svg.push(`<text x="${LEFT}" y="${HT - 18}" font-size="13" fill="#5b6876">Not drawn: sessions before 2026-11-19 06:48 UTC, and the product's own sessions.</text>`);
svg.push('</svg>');
writeFileSync(join(OUT, 'agent-session-map.svg'), svg.join('\n'));

const cid = (id) => id.replace(/[^A-Za-z0-9]/g, '_');
const style = (s) => `rounded=1;arcSize=50;whiteSpace=nowrap;html=1;fillColor=${s.fill};strokeColor=${s.stroke};fontColor=${s.ink};fontSize=${s.fs};${s.bold ? 'fontStyle=1;' : ''}`;
const cells = [
  `<mxCell id="title" value="${esc(`Agents and sessions, ${now} UTC`)}" style="text;html=1;align=left;verticalAlign=middle;fontSize=26;fontStyle=1;fontColor=#1f2933;" vertex="1" parent="1"><mxGeometry x="${LEFT}" y="22" width="900" height="40" as="geometry"/></mxCell>`,
  `<mxCell id="legend" value="${esc(`Dark blue: session. Light: helper. Orange: helper still running. ${legendText}`)}" style="text;html=1;align=left;verticalAlign=middle;fontSize=15;fontColor=#24313f;" vertex="1" parent="1"><mxGeometry x="${LEFT}" y="70" width="1100" height="28" as="geometry"/></mxCell>`];
for (const n of nodes.values()) cells.push(`<mxCell id="${cid(n.id)}" value="${esc(n.label)}" style="${style(st(n))}" vertex="1" parent="1"><mxGeometry x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" as="geometry"/></mxCell>`);
let e = 0;
for (const n of nodes.values()) for (const c of n.children) cells.push(`<mxCell id="e${e++}" style="edgeStyle=elbowEdgeStyle;elbow=horizontal;rounded=0;html=1;endArrow=none;strokeColor=#8d99a6;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="${cid(n.id)}" target="${cid(c.id)}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
writeFileSync(join(OUT, 'agent-session-map.drawio'), `<mxfile host="agent-session-map"><diagram id="agents" name="Agents and sessions"><mxGraphModel dx="0" dy="0" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="${W}" pageHeight="${HT}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel></diagram></mxfile>`);
console.log(JSON.stringify({ W, H: HT, sessions: S.sessions.length, helpers: helpers.length, running: nRun, columns: colW.length, colW }));
