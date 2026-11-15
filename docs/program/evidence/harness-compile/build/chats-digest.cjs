// Saves the chat-ideas workflow result (what the owner typed in saved sessions, matched against the compile)
// into data/chats/chat-ideas.json and prints it by verdict.
// Usage: node chats-digest.cjs [workflow-output.json] [--verdict=missing|cut|covered|not_an_idea] [--full]
'use strict';
const fs = require('fs'), path = require('path');
const DATA = path.resolve(__dirname, '..', 'data');
const OUT = path.join(DATA, 'chats', 'chat-ideas.json');
const arg = process.argv.slice(2).find(a => !a.startsWith('--'));
const want = (process.argv.find(a => a.startsWith('--verdict=')) || '').slice(10);
const full = process.argv.includes('--full');
if (arg) {
  const raw = JSON.parse(fs.readFileSync(arg, 'utf8'));
  const r = raw.result || raw;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const items = [];
  r.forEach(c => c.items.forEach(i => { const m = (c.results || []).find(x => x.id === i.id) || {}; items.push(Object.assign({}, i, { verdict: m.verdict || 'unmatched', reference_ids: m.reference_ids || [], short_pages: m.short_pages || [], outcome: m.outcome || '', match_note: m.note || '', match_metrics: m.metrics || [] })); }));
  fs.writeFileSync(OUT, JSON.stringify({ note: 'Harness ideas, observations and requests the owner typed in saved Claude Code sessions (6 Oct to 14 Nov 2026), extracted by three Sonnet readers and matched against the compile by three Opus matchers on 14 Nov 2026. Quotes are the owner’s words.', items }, null, 1));
}
const D = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const c = {}; D.items.forEach(i => { c[i.verdict] = (c[i.verdict] || 0) + 1; });
console.log('items', D.items.length, JSON.stringify(c));
const k = {}; D.items.forEach(i => { k[i.kind] = (k[i.kind] || 0) + 1; }); console.log('kinds', JSON.stringify(k));
D.items.filter(i => !want || i.verdict === want).forEach(i => {
  if (!want && !full) return;
  console.log(`\n== ${i.id} [${i.verdict}] ${i.kind} · ${i.session.slice(0, 8)} L${i.line} ${i.ts} · metrics ${(i.metrics || []).join(',') || '-'}`);
  console.log('  SAYS: ' + i.statement);
  console.log('  QUOTE: ' + i.quote);
  if (i.reference_ids.length) console.log('  IN REFERENCE: ' + i.reference_ids.join(', ') + (i.short_pages.length ? '  SHORT p' + i.short_pages.join(',') : ''));
  console.log('  OUTCOME: ' + i.outcome);
  if (i.match_note) console.log('  NOTE: ' + i.match_note);
});
