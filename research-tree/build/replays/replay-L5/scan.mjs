// replay-L5 scan: held reads made stale by later edits, reads never needed, in-window re-fetch (L4), cost of a drop.
// Scoring: SCORING.md in this folder. Read-only over transcripts. Usage: node scan.mjs <outdir> [groupFilter]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const P = 'C:/Users/User/.claude/projects';
const OUT = process.argv[2] || '.';
const ONLY = process.argv[3] || '';
const log = (s) => fs.appendFileSync(path.join(OUT, 'scan.log'), new Date().toISOString() + ' ' + s + '\n');

function groupOf(d) {
  if (d.includes('harness-engineering')) return 'harness';
  if (d === 'C--research-runs-2026-11-harness-leads') return 'run';
  if (d.includes('EMS-workshop1') || d.endsWith('23-FixFlow')) return 'fixflow';
  if (d.includes('Clinic-Workshop')) return 'clinic';
  return null;
}
const walk = (d, out) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.jsonl')) out.push(p); } return out; };
const files = [];
for (const d of fs.readdirSync(P)) {
  const g = groupOf(d); if (!g || (ONLY && g !== ONLY)) continue;
  for (const f of walk(path.join(P, d), [])) {
    const rel = path.relative(path.join(P, d), f).split(path.sep);
    const helper = rel.length > 1;
    const session = d + '/' + (helper ? rel[0] : rel[0].replace(/\.jsonl$/, ''));
    files.push({ f, g, session, helper });
  }
}
log(`files ${files.length}`);

const norm = (p) => String(p || '').split('\\').join('/').replace(/\/+/g, '/').toLowerCase();
const tsOf = (o) => { const t = Date.parse(o.timestamp || ''); return Number.isFinite(t) ? t : null; };
const EDIT = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit']);
const editPath = (inp) => norm(inp.file_path || inp.notebook_path || '');
const editOld = (n, inp) => n === 'Edit' ? [String(inp.old_string || '')] : n === 'MultiEdit' ? (inp.edits || []).map((e) => String(e.old_string || '')) : null; // null = whole file

// ---------- pass 1: every successful edit and every edited_text_file notice ----------
const edits = new Map(); // path -> [{ts, win, session, helper, whole, olds}]
const notices = new Map(); // win -> [{path, ts}]
for (const fi of files) {
  const txt = fs.readFileSync(fi.f, 'utf8');
  if (!/"name":"(Edit|MultiEdit|Write|NotebookEdit)"|edited_text_file/.test(txt)) continue;
  const pending = new Map(); const failed = new Set();
  for (const line of txt.split('\n')) {
    if (!line) continue;
    const hasEdit = line.includes('"tool_use"') && /"name":"(Edit|MultiEdit|Write|NotebookEdit)"/.test(line);
    const hasErr = line.includes('"is_error":true');
    const hasNote = line.includes('edited_text_file');
    if (!hasEdit && !hasErr && !hasNote) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const ts = tsOf(o);
    if (hasNote && o.attachment && o.attachment.type === 'edited_text_file') {
      if (!notices.has(fi.f)) notices.set(fi.f, []);
      notices.get(fi.f).push({ path: norm(o.attachment.filename), ts });
    }
    const c = (o.type === 'assistant' || o.type === 'user') && o.message && Array.isArray(o.message.content) ? o.message.content : [];
    for (const b of c) {
      if (b.type === 'tool_use' && ts != null && !pending.has(b.id) && EDIT.has(b.name)) {
        const inp = b.input || {}; const olds = editOld(b.name, inp);
        pending.set(b.id, { path: editPath(inp), ts, win: fi.f, session: fi.session, helper: fi.helper, whole: olds === null, olds: olds ? olds.map((s) => s.slice(0, 400)) : [] });
      }
      if (b.type === 'tool_result' && b.is_error) failed.add(b.tool_use_id);
    }
  }
  for (const [id, e] of pending) {
    if (failed.has(id) || !e.path || e.ts == null) continue;
    if (!edits.has(e.path)) edits.set(e.path, []);
    edits.get(e.path).push(e);
  }
}
for (const a of edits.values()) a.sort((x, y) => x.ts - y.ts);
log(`pass1 edited paths ${edits.size}`);

// ---------- helpers for reads ----------
const READ_W = new Set('cat head tail sed less nl more type gc Get-Content'.split(' ').map((s) => s.toLowerCase()));
function shellReadPath(cmd, cwd) {
  const segs = String(cmd || '').split(/&&|;|\n|\|/).map((x) => x.trim()).filter(Boolean);
  for (const seg of segs) {
    const w0 = seg.replace(/^(\w+=\S+\s+)+/, '').split(/\s+/)[0].split('/').pop().toLowerCase();
    if (w0 === 'cd' || w0 === 'set-location' || w0 === 'export') continue;
    let isRead = READ_W.has(w0);
    if (w0 === 'git' && /git\s+(?:-C\s+\S+\s+)?(show|diff)\b/.test(seg)) isRead = true;
    if (!isRead) return null;
    if (/\s-i\b/.test(seg) && w0 === 'sed') return null;
    const toks = seg.match(/"[^"]+"|'[^']+'|\S+/g) || [];
    for (let t of toks.slice(1)) {
      t = t.replace(/^["']|["']$/g, '').replace(/^[^:]*:(?=[A-Za-z]:)/, '');
      if (t.startsWith('-')) continue;
      if (/\.[A-Za-z0-9]{1,6}$/.test(t) && !/^\d/.test(t)) {
        const abs = /^([A-Za-z]:|\/)/.test(t) ? t : path.posix.join(norm(cwd), t);
        return norm(abs.replace(/^\/([a-z])\//i, '$1:/'));
      }
    }
    return null;
  }
  return null;
}
function grepPaths(text, inp, cwd) {
  const out = new Set();
  for (const l of text.split('\n')) {
    const m = l.match(/^(.+?\.[A-Za-z0-9]{1,6})[:-]\d+[:-]/);
    if (m) out.add(norm(/^([A-Za-z]:|\/)/.test(m[1]) ? m[1] : path.posix.join(norm(cwd), m[1].split('\\').join('/'))));
  }
  if (!out.size && inp.path && /\.[A-Za-z0-9]{1,6}$/.test(inp.path)) out.add(norm(inp.path));
  return [...out];
}
const stripNums = (t) => t.split('\n').map((l) => l.replace(/^\s*\d+(\t|\u2192)/, '')).join('\n');
const resText = (c) => typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => x.type === 'text' ? x.text || '' : '').join('\n') : '';
const hasImage = (c) => Array.isArray(c) && c.some((x) => x.type === 'image');
function rangeHit(e, read) {
  if (e.whole) return true;
  if (read.whole) return true;
  if (read.kind === 'grep') { return e.olds.some((o) => read.lines.some((l) => o.includes(l))); }
  return e.olds.some((o) => { const k = o.split('\n').find((x) => x.trim().length >= 6); return k ? read.text.includes(k) : false; });
}

// ---------- pass 2 ----------
const G = {};
const gs = (g) => G[g] || (G[g] = {
  windows: 0, helpers: 0, calls: 0, ctxTokens: 0, editsOwn: 0, editErrStale: 0, calChars: 0, calTok: 0,
  reads: 0, readChars: 0, readCarried: 0, pathLists: 0, pathListChars: 0, stubs: 0,
  staleFile: { n: 0, chars: 0, carried: 0 }, staleRange: { n: 0, chars: 0, carried: 0 },
  byWho: {}, invisible: { n: 0, chars: 0, carried: 0, noticed: 0 }, actedOnStale: 0,
  callsCarried: [], unneeded: { chars: 0, carried: 0 }, unneededEditWin: { chars: 0, carried: 0, all: 0, allCarried: 0 },
  refetch: { n: 0, chars: 0, carried: 0, nRead: 0, charsRead: 0, samePathRange: 0, samePathRangeChars: 0, samePathAny: 0, samePathAnyChars: 0, overlapReads: 0, overlapChars: 0 }, samples: [],
  drop: { events: 0, savedTok: 0, rewriteTok: 0, net125: 0, net2: 0, positive125: 0, invisEvents: 0, invisSaved: 0, invisRewrite: 0 },
  byMonth: {},
});
let done = 0;
for (const fi of files) {
  const st = gs(fi.g); st.windows++; if (fi.helper) st.helpers++;
  const lines = fs.readFileSync(fi.f, 'utf8').split('\n');
  // events in order
  const calls = []; const seen = new Set(); const uses = new Map(); let seg = 0; const segEnd = [];
  const reads = []; const ownEdits = []; let lastTs = null; let month = null;
  let prevCallIdx = -1; let pendChars = 0; let onlyResults = true;
  for (const line of lines) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const ts = tsOf(o) ?? lastTs; if (ts != null) lastTs = ts;
    if (o.type === 'system' && o.subtype === 'compact_boundary') { segEnd[seg] = ts; seg++; prevCallIdx = -1; continue; }
    const m = o.message;
    if (o.type === 'assistant' && m && m.usage && m.id) {
      const c = Array.isArray(m.content) ? m.content : [];
      for (const b of c) if (b.type === 'tool_use') uses.set(b.id, { name: b.name, input: b.input || {}, callIdx: calls.length, cwd: o.cwd || '' });
      if (seen.has(m.id)) { // same message split over lines: update the latest call's tool uses only
        for (const b of c) if (b.type === 'tool_use') uses.get(b.id).callIdx = calls.length - 1;
        if (calls.length) calls[calls.length - 1].out = Math.max(calls[calls.length - 1].out, m.usage.output_tokens || 0);
        continue;
      }
      seen.add(m.id);
      const u = m.usage; const ctx = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
      if (prevCallIdx >= 0 && onlyResults && pendChars > 0) {
        const d = ctx - calls[prevCallIdx].ctx - calls[prevCallIdx].out;
        if (d > 0) { st.calChars += pendChars; st.calTok += d; }
      }
      calls.push({ ts, ctx, out: u.output_tokens || 0, seg });
      st.calls++; st.ctxTokens += ctx; if (!month && ts) month = new Date(ts).toISOString().slice(0, 7);
      prevCallIdx = calls.length - 1; pendChars = 0; onlyResults = true;
      for (const b of c) if (b.type === 'tool_use') uses.get(b.id).callIdx = calls.length - 1;
      continue;
    }
    if (o.type === 'user' && m && Array.isArray(m.content)) {
      for (const b of m.content) {
        if (b.type !== 'tool_result') { if (b.type === 'text') onlyResults = false; continue; }
        const u = uses.get(b.tool_use_id); const txt = resText(b.content); pendChars += txt.length; if (hasImage(b.content)) onlyResults = false;
        if (!u) continue;
        if (EDIT.has(u.name)) {
          if (b.is_error) { if (/modified since|has been modified|read it first|changed since/i.test(txt)) st.editErrStale++; }
          else { st.editsOwn++; ownEdits.push({ path: editPath(u.input), ts, callIdx: u.callIdx }); }
          continue;
        }
        if (b.is_error || hasImage(b.content)) continue;
        let kind = null, paths = [], whole = false;
        if (u.name === 'Read') { kind = 'read'; paths = [norm(u.input.file_path)]; whole = u.input.offset == null && u.input.limit == null; }
        else if (u.name === 'Grep') { if (u.input.output_mode === 'content') { kind = 'grep'; paths = grepPaths(txt, u.input, u.cwd); } else kind = 'list'; }
        else if (u.name === 'Glob') kind = 'list';
        else if (u.name === 'Bash' || u.name === 'PowerShell') { const p = shellReadPath(u.input.command, u.cwd); if (p) { kind = 'shell'; paths = [p]; } }
        if (!kind) continue;
        if (kind === 'list') { st.pathLists++; st.pathListChars += txt.length; }
        if (u.name === 'Read' && txt.length < 400 && /unchanged since|file unchanged/i.test(txt)) { st.stubs++; continue; }
        const body = kind === 'read' ? stripNums(txt) : txt;
        reads.push({ lineNos: kind === 'read' ? (txt.match(/^\s*\d+(?=\t|→)/gm) || []).map(Number) : [], rng: kind === 'read' ? String(u.input.offset) + ':' + String(u.input.limit) : '', kind, paths, whole, ts, seg, chars: txt.length, callIdx: u.callIdx, text: kind === 'grep' ? '' : body,
          lines: kind === 'grep' ? txt.split('\n').map((l) => l.replace(/^.+?[:-]\d+[:-]/, '').trim()).filter((l) => l.length >= 8) : [],
          hash: crypto.createHash('md5').update(txt).digest('hex') });
      }
      continue;
    }
    if (o.type === 'user' || o.type === 'attachment') onlyResults = false;
  }
  segEnd[seg] = lastTs;
  // calls per segment after a time
  const callsAfter = (s, t) => { let n = 0; for (const c of calls) if (c.seg === s && c.ts > t) n++; return n; };
  const firstCallAfter = (s, t) => calls.findIndex((c) => c.seg === s && c.ts > t);
  const winNotices = notices.get(fi.f) || [];
  const mo = st.byMonth[month || '?'] || (st.byMonth[month || '?'] = { readChars: 0, readCarried: 0, invisCarried: 0, staleRangeCarried: 0, refetchChars: 0, ctxTokens: 0 });
  for (const c of calls) mo.ctxTokens += c.ctx;
  const winHasEdit = ownEdits.length > 0;
  const heldHashes = new Map(); // seg -> Set
  const drops = new Map(); // callIdx -> [{pos, chars, n, invis}]
  for (const r of reads) {
    const end = segEnd[r.seg] ?? lastTs; const carriedN = callsAfter(r.seg, r.ts); const carried = r.chars * carriedN;
    st.reads++; st.readChars += r.chars; st.readCarried += carried; mo.readChars += r.chars; mo.readCarried += carried;
    if (r.kind === 'list') continue;
    // L4 re-fetch
    st.refetch.nRead++; st.refetch.charsRead += r.chars;
    const hs = heldHashes.get(r.seg) || new Set(); heldHashes.set(r.seg, hs);
    if (hs.has(r.hash) && r.chars >= 50) { st.refetch.n++; st.refetch.chars += r.chars; st.refetch.carried += carried; mo.refetchChars += r.chars; }
    hs.add(r.hash);
    const editedBetween = (p, t0) => (edits.get(p) || []).some((e) => e.ts > t0 && e.ts < r.ts);
    const prev = reads.filter((q) => q !== r && q.seg === r.seg && q.ts < r.ts && q.kind !== 'list');
    if (r.kind === 'read' && prev.some((q) => q.kind === 'read' && q.paths[0] === r.paths[0] && q.rng === r.rng && !editedBetween(r.paths[0], q.ts))) { st.refetch.samePathRange++; st.refetch.samePathRangeChars += r.chars; }
    if (r.kind === 'read' && r.lineNos.length) { const cov = new Set(); for (const q of prev) if (q.kind === 'read' && q.paths[0] === r.paths[0] && !editedBetween(r.paths[0], q.ts)) for (const x of q.lineNos) cov.add(x); const ov = r.lineNos.filter((x) => cov.has(x)).length; if (ov) { st.refetch.overlapReads++; st.refetch.overlapChars += r.chars * ov / r.lineNos.length; } }
    if (r.paths.length === 1 && prev.some((q) => q.paths.includes(r.paths[0]) && !editedBetween(r.paths[0], q.ts))) { st.refetch.samePathAny++; st.refetch.samePathAnyChars += r.chars; }
    // unneeded: no later own edit of any of its paths in the segment
    const needed = ownEdits.some((e) => e.ts > r.ts && e.ts <= end && r.paths.includes(e.path));
    if (!needed) { st.unneeded.chars += r.chars; st.unneeded.carried += carried; }
    if (winHasEdit) { st.unneededEditWin.all += r.chars; st.unneededEditWin.allCarried += carried; if (!needed) { st.unneededEditWin.chars += r.chars; st.unneededEditWin.carried += carried; } }
    // stale: first edit of any of its paths after the read, before segment end
    let first = null, firstRange = null;
    for (const p of r.paths) for (const e of edits.get(p) || []) {
      if (e.ts <= r.ts || e.ts > end) continue;
      if (!first || e.ts < first.ts) first = e;
      if (rangeHit(e, r) && (!firstRange || e.ts < firstRange.ts)) firstRange = e;
    }
    if (!first) continue;
    const nF = callsAfter(r.seg, first.ts);
    st.staleFile.n++; st.staleFile.chars += r.chars; st.staleFile.carried += r.chars * nF;
    if (!firstRange) continue;
    const e = firstRange; const nR = callsAfter(r.seg, e.ts);
    st.staleRange.n++; st.staleRange.chars += r.chars; st.staleRange.carried += r.chars * nR; mo.staleRangeCarried += r.chars * nR;
    st.callsCarried.push(nR);
    const who = e.win === fi.f ? 'same' : e.session === fi.session ? (!fi.helper && e.helper ? 'helper' : fi.helper && !e.helper ? 'parent' : 'sibling') : 'other';
    const w = st.byWho[who] || (st.byWho[who] = { n: 0, chars: 0, carried: 0 }); w.n++; w.chars += r.chars; w.carried += r.chars * nR;
    let invis = false;
    if (who !== 'same') {
      const noticed = winNotices.some((nt) => r.paths.includes(nt.path) && nt.ts >= e.ts && nt.ts <= end);
      if (noticed) st.invisible.noticed++;
      else {
        invis = true; st.invisible.n++; st.invisible.chars += r.chars; st.invisible.carried += r.chars * nR; mo.invisCarried += r.chars * nR;
        // acted on stale: an own edit of the file after e, before any re-read of the file
        const nextOwn = ownEdits.find((x) => x.ts > e.ts && x.ts <= end && r.paths.includes(x.path));
        if (nextOwn && !reads.some((q) => q.ts > e.ts && q.ts < nextOwn.ts && q.paths.some((p) => r.paths.includes(p)))) { st.actedOnStale++; if (st.samples.length < 40) st.samples.push({ kind: 'acted', win: fi.f.slice(P.length), read: new Date(r.ts).toISOString(), edit: new Date(e.ts).toISOString(), by: e.win.slice(P.length), own: new Date(nextOwn.ts).toISOString(), path: r.paths[0] }); }
        else if (st.samples.length < 40) st.samples.push({ kind: 'invisible', who, win: fi.f.slice(P.length), read: new Date(r.ts).toISOString(), edit: new Date(e.ts).toISOString(), by: e.win.slice(P.length), path: r.paths[0] });
      }
    }
    // drop at the first call after the edit
    const d = firstCallAfter(r.seg, e.ts);
    if (d >= 0 && r.callIdx >= 0 && r.callIdx < calls.length) {
      const pos = calls[r.callIdx].ctx + calls[r.callIdx].out;
      if (!drops.has(d)) drops.set(d, []);
      drops.get(d).push({ pos, chars: r.chars, n: nR, invis });
    }
  }
  // batch drops per call
  for (const [d, arr] of drops) {
    const ratio = st.calTok > 0 ? st.calChars / st.calTok : 3.5;
    const pos = Math.min(...arr.map((a) => a.pos)); const dropTok = arr.reduce((s, a) => s + a.chars / ratio, 0);
    const rewrite = Math.max(0, calls[d].ctx - pos - dropTok);
    const saved = arr.reduce((s, a) => s + (a.chars / ratio) * a.n, 0);
    st.drop.events++; st.drop.savedTok += saved; st.drop.rewriteTok += rewrite;
    const n125 = saved * 0.01 - rewrite * (1.25 - 0.01); const n2 = saved * 0.01 - rewrite * (2 - 0.01);
    st.drop.net125 += n125; st.drop.net2 += n2; if (n125 > 0) st.drop.positive125++;
    if (arr.some((a) => a.invis)) { st.drop.invisEvents++; st.drop.invisSaved += saved; st.drop.invisRewrite += rewrite; }
  }
  if (++done % 200 === 0) log(`pass2 ${done}/${files.length}`);
}
for (const g of Object.keys(G)) { const a = G[g].callsCarried.sort((x, y) => x - y); G[g].callsCarriedMedian = a.length ? a[a.length >> 1] : null; G[g].callsCarriedP90 = a.length ? a[Math.floor(a.length * 0.9)] : null; G[g].callsCarriedSum = a.reduce((s, x) => s + x, 0); delete G[g].callsCarried; G[g].charsPerToken = G[g].calTok ? G[g].calChars / G[g].calTok : null; }
fs.writeFileSync(path.join(OUT, ONLY ? `raw-${ONLY}.json` : 'raw.json'), JSON.stringify(G, null, 1));
log('done');
