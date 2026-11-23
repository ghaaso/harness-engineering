// check.mjs: what lies between the two calls of a flagged (or control) call. Prints line kinds only, no content.
// node check.mjs <n per class> <seed>  -> check.txt
import fs from 'node:fs';
const ROOT = 'C:/Users/User/.claude/projects/';
const fl = JSON.parse(fs.readFileSync('flagged.json', 'utf8'));
const N = +process.argv[2] || 20; let seed = +process.argv[3] || 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
function sample(arr, n) { const a = arr.slice(); const o = []; while (o.length < n && a.length) o.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return o; }
const pick = [...sample(fl.filter(x => x.cls === 'break'), N), ...sample(fl.filter(x => x.cls === 'lapse' && x.kind === 'helper'), N / 2), ...sample(fl.filter(x => x.cls === 'lapse' && x.kind === 'session'), N / 2)];
const out = [];
for (const x of pick) {
  const lines = fs.readFileSync(ROOT + x.file, 'utf8').split('\n');
  const seg = lines.slice(x.prevLine - 1, x.line);
  const kinds = []; const sids = new Set(); const models = new Set();
  for (const l of seg) {
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.sessionId) sids.add(o.sessionId);
    let k = o.type + (o.subtype ? ':' + o.subtype : '');
    if (o.type === 'attachment' && o.attachment) k += ':' + (o.attachment.type || '');
    if (o.type === 'assistant' && o.message) { models.add(o.message.model); const tu = (o.message.content || []).filter(c => c.type === 'tool_use').map(c => c.name); if (tu.length) k += '[' + tu.join(',') + ']'; }
    if (o.type === 'user' && o.message && Array.isArray(o.message.content)) { const tr = o.message.content.filter(c => c.type === 'tool_result'); if (tr.length) k += '{tr' + tr.length + ' ' + JSON.stringify(tr.map(t => t.content)).length + 'ch}'; else k += '{text}'; }
    else if (o.type === 'user') k += '{str}';
    if (o.isMeta) k += '!meta'; if (o.isCompactSummary) k += '!compactSummary';
    kinds.push(k);
  }
  out.push(`${x.cls} ${x.kind} ${x.project} gap=${x.gap}s ttl=${x.ttl} held=${x.held} cr=${x.cr} cc=${x.cc} lost=${x.lost} sids=${sids.size} models=${[...models].join('/')} ${x.file.split('/').slice(-1)[0].slice(0,14)}:${x.prevLine}-${x.line}\n   ${kinds.join(' > ').slice(0, 900)}`);
}
fs.writeFileSync('check.txt', out.join('\n') + '\n');
