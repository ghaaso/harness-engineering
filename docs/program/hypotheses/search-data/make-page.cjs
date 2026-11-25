// Builds the owner's page of a hypothesis from the hypothesis file itself and a small config.
// Usage: node make-page.cjs <hypothesis.md> <config.json> <out.html>
// The page shows no file path and no record id: references to our own files become "our own record".
const fs = require('fs');
const [, , hypFile, cfgFile, outFile] = process.argv;
const text = fs.readFileSync(hypFile, 'utf8').replace(/\r/g, '');
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
const prefix = /^### M\d+\. /m.test(text) ? 'M' : 'D';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inl(raw) {
  let s = esc(raw);
  const keep = [];
  const hold = (html) => { keep.push(html); return '\u0001' + (keep.length - 1) + '\u0002'; };
  s = s.replace(/record: `[^`]+`/g, 'our own record').replace(/record: [^\s;,)]+/g, 'our own record');
  s = s.replace(/`([^`]+)`/g, (m, c) => (/[\\/]/.test(c) ? 'our own record' : hold('<code>' + c + '</code>')));
  s = s.replace(/(?<![A-Za-z0-9])D (\d+\.\d+)/g, (m, e) => hold('<span class="e ed">Data ' + e + '</span>'));
  s = s.replace(/(?<![A-Za-z0-9])N (\d+(?:\.\d+)?)/g, (m, e) => hold('<span class="e en">Model ' + e + '</span>'));
  s = s.replace(new RegExp('(?<![A-Za-z0-9])' + prefix + '(\\d+)(?![0-9]|[.][0-9])', 'g'), (m, n) => hold('<a class="dref" href="#d' + n + '">decision ' + n + '</a>'));
  if (prefix === 'M') s = s.replace(/(?<![A-Za-z0-9])D(\d+)(?![0-9]|[.][0-9])/g, (m, n) => 'data decision ' + n);
  s = s.replace(/(?<![A-Za-z0-9])([PVMW])(\d+)(?![0-9]|[.][0-9])/g, (m, k, n) => {
    const name = (cfg.codes || {})[k + n];
    return name ? hold('<span class="code">' + esc(name) + '</span>') : m;
  });
  s = s.replace(/(?<![A-Za-z0-9'])([A-Z])(?![A-Za-z0-9'])/g, (m, l) => {
    const d = (cfg.designs || []).find((x) => x.letter === l);
    return d ? hold('<span class="dz">' + esc(d.name) + '</span>') : m;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s.replace(/\u0001(\d+)\u0002/g, (m, i) => keep[+i]);
}
// A paragraph that may hold "- " list lines.
function para(raw) {
  const lines = raw.split('\n');
  const out = []; let buf = [], items = [];
  const flushP = () => { if (buf.length) { out.push('<p>' + inl(buf.join(' ')) + '</p>'); buf = []; } };
  const flushL = () => { if (items.length) { out.push('<ul>' + items.map((i) => '<li>' + inl(i) + '</li>').join('') + '</ul>'); items = []; } };
  for (const l of lines) {
    if (/^- /.test(l)) { flushP(); items.push(l.slice(2)); }
    else if (/^ {2,}\S/.test(l) && items.length) items[items.length - 1] += ' ' + l.trim();
    else if (!l.trim()) { flushP(); flushL(); }
    else { flushL(); buf.push(l.trim()); }
  }
  flushP(); flushL();
  return out.join('');
}
function section(startRe) {
  const m = text.match(startRe); if (!m) return '';
  const from = m.index + m[0].length;
  const next = text.slice(from).search(/\n## /);
  return text.slice(from, next < 0 ? text.length : from + next).trim();
}
function listItems(body) {
  const items = [];
  for (const l of body.split('\n')) {
    if (/^(\d+\.|-) /.test(l)) items.push(l.replace(/^(\d+\.|-) /, ''));
    else if (/^ {2,}\S/.test(l) && items.length) items[items.length - 1] += ' ' + l.trim();
    else if (!l.trim()) continue;
    else if (items.length && !/^\|/.test(l)) items.push('\u0000' + l.trim());
  }
  return items;
}

// ---- decisions ----
const heads = [...text.matchAll(new RegExp('^### ' + prefix + '(\\d+)\\. (.*)$', 'gm'))];
const labels = ['Depends on', 'Alternatives', 'Ruled out', 'Choice', 'Why', 'Rests on', 'Refuted if'];
const decisions = heads.map((h, i) => {
  const end = i + 1 < heads.length ? heads[i + 1].index : text.indexOf('\n## ', h.index);
  const body = text.slice(h.index + h[0].length, end);
  const d = { n: +h[1], title: h[2].trim() };
  labels.forEach((lab, j) => {
    const a = body.indexOf('**' + lab + '.**');
    const b = j + 1 < labels.length ? body.indexOf('**' + labels[j + 1] + '.**') : body.length;
    d[lab] = body.slice(a + lab.length + 5, b).trim();
  });
  d.deps = [...d['Depends on'].matchAll(new RegExp('(?<![A-Za-z0-9])' + prefix + '(\\d+)(?![0-9]|[.][0-9])', 'g'))].map((m) => +m[1]).filter((x) => x !== d.n);
  if (/ to /.test(d['Depends on'])) for (const m of d['Depends on'].matchAll(new RegExp(prefix + '(\\d+) to ' + prefix + '(\\d+)', 'g'))) for (let k = +m[1]; k <= +m[2]; k++) if (!d.deps.includes(k) && k !== d.n) d.deps.push(k);
  return d;
});
const byN = Object.fromEntries(decisions.map((d) => [d.n, d]));
// transitive reduction, then layers by longest path
const reach = (a, b, seen = new Set()) => byN[a].deps.some((x) => x === b || (!seen.has(x) && (seen.add(x), reach(x, b, seen))));
for (const d of decisions) d.edges = d.deps.filter((p) => !d.deps.some((q) => q !== p && reach(q, p)));
const layer = {};
const lay = (n) => (n in layer ? layer[n] : (layer[n] = byN[n].deps.length ? 1 + Math.max(...byN[n].deps.map(lay)) : 0));
decisions.forEach((d) => lay(d.n));
const cols = []; decisions.forEach((d) => (cols[layer[d.n]] ||= []).push(d));
const CW = 152, CH = 70, GX = 28, GY = 14;
const maxRows = Math.max(...cols.map((c) => c.length));
const H = maxRows * (CH + GY) - GY, W = cols.length * (CW + GX) - GX;
const pos = {};
cols.forEach((c, x) => { const off = (H - (c.length * (CH + GY) - GY)) / 2; c.forEach((d, y) => { pos[d.n] = { x: x * (CW + GX), y: off + y * (CH + GY) }; }); });
const paths = decisions.flatMap((d) => d.edges.map((p) => {
  const a = pos[p], b = pos[d.n]; const x1 = a.x + CW, y1 = a.y + CH / 2, x2 = b.x, y2 = b.y + CH / 2, mx = (x1 + x2) / 2;
  return '<path d="M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '"/>';
})).join('');
const short = (t) => (cfg.shortTitles && cfg.shortTitles[t.n]) || t.title;
const nodes = decisions.map((d) => '<a class="node" href="#d' + d.n + '" style="left:' + pos[d.n].x + 'px;top:' + pos[d.n].y + 'px;width:' + CW + 'px;height:' + CH + 'px"><b>' + d.n + '</b><span>' + esc(short(d)) + '</span></a>').join('');

const restChips = (raw) => raw.split(';').map((r) => r.replace(/\s+/g, ' ').trim()).filter(Boolean).map((r) => {
  if (/^record:/.test(r)) return null;
  if (/^count first:/.test(r)) return '<span class="e ec">count first: ' + inl(r.replace(/^count first:\s*/, '')) + '</span>';
  if (r === 'assumption') return '<span class="e ea">assumption (its reasoning is in "why")</span>';
  return inl(r);
}).filter(Boolean).join(' ') + (/record:/.test(raw) ? ' <span class="e er">our own record</span>' : '');

function options(d) {
  const parts = d.Alternatives.replace(/\n/g, ' ').split(/\(([a-z])\) /);
  const inChoice = new Set([...d.Choice.matchAll(/\(([a-z])\)/g)].map((m) => m[1]));
  const inOut = new Set([...d['Ruled out'].matchAll(/\(([a-z])\)/g)].map((m) => m[1]));
  const rows = [];
  for (let i = 1; i < parts.length; i += 2) {
    const l = parts[i], t = parts[i + 1].trim();
    const st = inChoice.has(l) && inOut.has(l) ? 'part' : inChoice.has(l) ? 'yes' : 'no';
    const word = { yes: 'chosen', part: 'kept in part', no: 'not chosen' }[st];
    rows.push('<li class="opt ' + st + '"><span class="ol">(' + l + ')</span><span class="ot">' + inl(t) + '</span><span class="os">' + word + '</span></li>');
  }
  return '<ul class="opts">' + rows.join('') + '</ul>';
}
const cards = decisions.map((d) => '<section class="card" id="d' + d.n + '"><h3><b>' + d.n + '</b>' + esc(d.title) + '</h3>' +
  '<h4>The options weighed</h4>' + options(d) + '<div class="two"><div><h4>The choice</h4>' + para(d.Choice) + '</div><div><h4>Why</h4>' + para(d.Why) + '</div></div>' +
  '<details><summary>Why the others lost</summary>' + para(d['Ruled out']) + '</details>' +
  '<div class="foot"><div><h4>It rests on</h4><p>' + restChips(d['Rests on']) + '</p></div><div><h4>It is wrong if</h4>' + para(d['Refuted if']) + '</div></div></section>').join('');

// ---- other sections ----
const answer = listItems(section(/^## The answer in short\n/m)).map((i) => '<li>' + inl(i) + '</li>').join('');
const faultsBody = section(/^## 1\. .*\n/m);
const faults = listItems(faultsBody).filter((i) => i[0] !== '\u0000').map((i) => '<li>' + inl(i) + '</li>').join('');
const sound = (faultsBody.match(/\nWhat is sound[\s\S]*$/) || [''])[0].trim();
const openRows = [...section(/^## 6\. .*\n/m).matchAll(/^\| (?!Open|---)(.+?) \| (.+?) \|$/gm)].map((m) => '<div class="open"><div>' + inl(m[1]) + '</div><div class="arrow">settled by</div><div>' + inl(m[2]) + '</div></div>').join('');
const s7 = section(/^## 7\. .*\n/m);
const counts = listItems(s7.split(/\n\n(?=His word|What needs)/)[0]).filter((i) => i[0] !== '\u0000').map((i) => '<li>' + inl(i) + '</li>').join('');
const word = (s7.match(/\n\n((?:His word|What needs)[\s\S]*)$/) || ['', ''])[1];
const wrong = listItems(section(/^## 8\. .*\n/m)).map((i) => '<li>' + inl(i) + '</li>').join('');

const designs = cfg.designs.map((d) => '<div class="dsg ' + (d.kept ? 'kept' : 'gone') + '"><div class="dn">' + esc(d.name) + '</div><div class="ds">' + esc(d.start) + '</div><div class="dv">' + esc(d.verdict) + '</div></div>').join('');
const steps = cfg.steps.map((s) => '<div class="step"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>').join('<div class="sarrow">&rarr;</div>');
const limits = cfg.limits.map((l) => '<li>' + esc(l) + '</li>').join('');
const legend = (cfg.designs || []).map((d) => '<span class="dz">' + esc(d.name) + '</span>').join(' ');

const css = fs.readFileSync(__dirname + '/page.css', 'utf8');
const html = '<title>' + esc(cfg.title) + '</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n' + css + '\n</style>\n' +
'<div class="wrap">' +
'<header><div class="tag">' + esc(cfg.tag) + '</div><h1>' + esc(cfg.h1) + '</h1><p class="lead">' + esc(cfg.lead) + '</p></header>' +
'<section class="box"><h2>The answer in short</h2><ol class="ans">' + answer + '</ol></section>' +
'<section><h2>How it was reached</h2><p class="mute">' + esc(cfg.reached) + '</p><div class="steps">' + steps + '</div><div class="dsgs">' + designs + '</div>' +
'<div class="box lim"><h4>Limits, said plainly</h4><ul>' + limits + '</ul></div></section>' +
'<section><h2>The ' + decisions.length + ' decisions and what each needs settled before it</h2><p class="mute">Read left to right. Select a box to jump to that decision.</p>' +
'<div class="scroll"><div class="g" style="width:' + W + 'px;height:' + H + 'px"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="The decisions in the order they depend on each other">' + paths + '</svg>' + nodes + '</div></div></section>' +
'<section class="box"><h2>' + esc(cfg.faultsTitle) + '</h2><ol class="faults">' + faults + '</ol>' + (sound ? '<p class="sound">' + inl(sound.replace(/\n/g, ' ')) + '</p>' : '') + '</section>' +
'<section><h2>The decisions</h2><p class="mute">Each shows the choice and the reason first. The small marks name the entries of the two learning files it rests on (' + '<span class="e ed">Data</span> <span class="e en">Model</span>' + '). Designs are named ' + legend + '.</p>' + cards + '</section>' +
'<section class="box"><h2>What stays open, and what settles it</h2><p class="mute">Where the designs disagreed and argument alone did not decide.</p>' + openRows + '</section>' +
'<section class="two top"><div class="box"><h2>' + esc(cfg.countsTitle) + '</h2><ol class="counts">' + counts + '</ol></div><div class="box"><h2>What needs your word</h2>' + para(word) + '<h2 class="gap">It is wrong as a whole if</h2><ul>' + wrong + '</ul></div></section>' +
'</div>\n';
fs.writeFileSync(outFile, html);
const leak = html.replace(/<style>[\s\S]*?<\/style>/, '').match(/r5\d-\d{4}|research-tree|docs\/program|\.md\b|\.mjs\b|\.jsonl\b/g);
console.log(outFile + ': ' + html.length + ' bytes, ' + decisions.length + ' decisions' + (leak ? ', LEAKS: ' + [...new Set(leak)].join(' ') : ', no path or record id'));
