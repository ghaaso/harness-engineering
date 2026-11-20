// node typed.mjs "<words>" --out <file>
// Searches, locally, the owner's own typed turns in the top-level session transcripts of every project folder.
// A typed turn: a user record with turnOrigin "human" (or origin.kind "human"); where neither field exists (older
// records), a user record with no isMeta flag, no tool result and text not starting with "<". Never tool results,
// task notifications, peer/agent messages, host_synthetic turns, isMeta records, system-reminder blocks, or the
// "This session is being continued" summaries. Terms: separated by comma, semicolon or "|"; with none of those the
// whole string is one phrase. Case-insensitive.
import fs from 'node:fs';
import path from 'node:path';
import { PROJECTS } from './lib.mjs';

const a = process.argv.slice(2);
let out; const oi = a.indexOf('--out'); if (oi >= 0) { out = a[oi + 1]; a.splice(oi, 2); }
const words = a.join(' ').trim();
if (!words || !out) { console.log('usage: node typed.mjs "<words>" --out <file>'); process.exit(64); }
const terms = words.split(/[,;|]/).map(s => s.trim().toLowerCase()).filter(Boolean);

export function typedText(o) {
  if (!o || o.type !== 'user' || !o.message || o.isMeta || o.sourceToolUseID) return null;
  const human = o.turnOrigin === 'human' || (o.origin && o.origin.kind === 'human');
  const other = o.turnOrigin || (o.origin && o.origin.kind);
  if (other && !human) return null;
  let c = o.message.content, t;
  if (typeof c === 'string') t = c;
  else if (Array.isArray(c)) {
    if (c.some(x => x.type === 'tool_result')) return null;
    t = c.filter(x => x.type === 'text').map(x => x.text).join('\n');
  } else return null;
  t = t.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
  if (!t) return null;
  if (/^This session is being continued/.test(t) || /^\[Request interrupted/.test(t)) return null;
  if (!human && t.startsWith('<')) return null;
  return t;
}

const sentences = t => t.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
const matches = [];
let folders = [];
try { folders = fs.readdirSync(PROJECTS, { withFileTypes: true }).filter(d => d.isDirectory()); } catch {}
for (const d of folders) {
  let files; try { files = fs.readdirSync(path.join(PROJECTS, d.name)); } catch { continue; }
  for (const f of files) {
    if (!f.endsWith('.jsonl')) continue;
    let text; try { text = fs.readFileSync(path.join(PROJECTS, d.name, f), 'utf8'); } catch { continue; }
    for (const line of text.split('\n')) {
      if (!line) continue;
      let o; try { o = JSON.parse(line); } catch { continue; }
      const t = typedText(o);
      if (!t || !terms.some(x => t.toLowerCase().includes(x))) continue;
      const ss = sentences(t);
      const i = ss.findIndex(s => terms.some(x => s.toLowerCase().includes(x)));
      matches.push({ ts: o.timestamp || '', session: f.replace(/\.jsonl$/, ''), project: d.name, text: ss.slice(Math.max(0, i - 1), i + 2).join(' ') });
    }
  }
}
matches.sort((x, y) => (y.ts > x.ts ? 1 : y.ts < x.ts ? -1 : 0));
const shown = matches.slice(0, 200);
const sessions = new Set(shown.map(m => m.session)).size;
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, `# Typed turns matching "${words}" (${matches.length} found, ${shown.length} shown, newest first)\n\n` +
  shown.map(m => `- ${m.ts.slice(0, 10)} | session ${m.session} | ${m.project}\n  ${m.text.replace(/\n/g, ' ')}\n`).join('\n'));
console.log(`typed: ${shown.length} turns match "${words}" in ${sessions} sessions -> ${out}`);
