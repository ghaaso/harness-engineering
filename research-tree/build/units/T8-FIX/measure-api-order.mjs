// Where the app writes its "api-request" lines (unit T8-FIX, 2026-11-24; fix B2). Read only, over every main and
// helper transcript of this project. Counts (a) new assistant messages that follow tool results: was an api-request
// line written after the last of those results and before the message? (b) tool results of one message that come
// after an api-request line with no assistant line between (a request sent before all its tools returned).
// Usage: node measure-api-order.mjs [projects dir]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const P = process.argv[2] || 'C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering';
const files = [];
for (const n of readdirSync(P)) {
  if (n.endsWith('.jsonl')) files.push(join(P, n));
  const d = join(P, n, 'subagents'); if (existsSync(d)) for (const f of readdirSync(d)) if (/^agent-.*\.jsonl$/.test(f)) files.push(join(d, f));
}
let follow = 0, withReq = 0, withoutReq = 0, resultAfterReq = 0, filesWithReq = 0; const misses = [];
for (const f of files) {
  let lastMsg = null, trSince = false, reqAfterTr = false, any = false;
  for (const l of readFileSync(f, 'utf8').split('\n')) {
    if (l.startsWith('{"type":"api-request"')) { any = true; if (trSince) reqAfterTr = true; continue; }
    if (!l.startsWith('{"parentUuid"')) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    const c = o.message && Array.isArray(o.message.content) ? o.message.content : [];
    if (o.type === 'user' && c.some((b) => b.type === 'tool_result')) { if (reqAfterTr) resultAfterReq++; trSince = true; continue; }
    if (o.type === 'assistant' && o.message && o.message.id && o.message.id !== lastMsg) {
      if (trSince) { follow++; if (reqAfterTr) withReq++; else { withoutReq++; if (misses.length < 5) misses.push(f.slice(P.length + 1, P.length + 60) + ' ' + o.message.id); } }
      lastMsg = o.message.id; trSince = false; reqAfterTr = false;
    }
  }
  if (any) filesWithReq++;
}
console.log(JSON.stringify({ transcripts: files.length, filesWithApiRequest: filesWithReq, messagesAfterToolResults: follow, withRequestBetween: withReq, without: withoutReq, toolResultsAfterARequestOfTheirMessage: resultAfterReq, misses }));
