const { S, run } = require('./attr.js');
let cr = 0, cw = 0, inp = 0, out = 0, ctx = 0; for (const s of S) for (const c of s.calls) { cr += c.cr; cw += c.cw; inp += c.inp; out += c.out; ctx += c.ctx; }
console.log('tokens M: cache-read', (cr / 1e6).toFixed(0), 'cache-write', (cw / 1e6).toFixed(1), 'uncached input', (inp / 1e6).toFixed(2), 'output', (out / 1e6).toFixed(1), 'context', (ctx / 1e6).toFixed(0));
console.log('price-weighted (read 0.1, write 1.25, input 1, output 5): read', (cr * 0.1 / 1e6).toFixed(0), 'write', (cw * 1.25 / 1e6).toFixed(0), 'input', (inp / 1e6).toFixed(1), 'output', (out * 5 / 1e6).toFixed(0));
const pick = (r) => { const o = {}; for (const k of ['actM', 'attM', 'fetched', 'own', 'start', 'unclassified', 'messages', 'rest', 'first', 'again', 'outGen']) if (r[k] != null) o[k] = r[k]; return o; };
console.log('context-sum     ', JSON.stringify(pick(run())));
console.log('cost, input only', JSON.stringify(pick(run({ price: 'cost' }))));
console.log('cost + output 5x', JSON.stringify(pick(run({ price: 'cost', outPrice: true }))));
for (const g of ['slice-main', 'root-main', 'subagents']) console.log(g.padEnd(10), 'ctx', JSON.stringify(pick(run({ group: g }))), '\n           cost+out', JSON.stringify(pick(run({ group: g, price: 'cost', outPrice: true }))));
