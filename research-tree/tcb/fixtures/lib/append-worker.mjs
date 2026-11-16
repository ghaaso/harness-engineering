// Test worker for lib.test.mjs T46: appends N ledger lines through withRunLock, one lock turn each.
// Usage: node append-worker.mjs <lib file url> <root> <worker id> <n> <go file>
import fs from 'node:fs';

const [libUrl, root, id, n, goFile] = process.argv.slice(2);
const lib = await import(libUrl);
const START = '2026-11-17T09:00:00.0000000Z';
const proc = {
  list: () => [{ pid: process.pid, ppid: 0, name: 'node.exe', exe: process.execPath, cmdline: 'append-worker', start_time: START }],
  alive: () => true,
  boot: () => null,
};
const ctx = { script: 'append-worker', writerSha: '2'.repeat(64), ledgerSeq: [] };
// Start together with the other workers: wait (busy) for the go file.
while (!fs.existsSync(goFile)) { /* spin */ }
for (let i = 0; i < Number(n); i++) {
  await lib.withRunLock(
    root,
    { script: 'append-worker', proc, now: '2026-11-17T10:00:00.000Z', retries: 1000, retryMs: 5 },
    async (h) => {
      await lib.appendLedger(root, h, {
        ctx,
        kind: 'event',
        data: { worker: id, i },
        now: '2026-11-17T10:00:00.000Z',
      });
    },
  );
}
process.stdout.write(JSON.stringify({ done: true, worker: id, seqs: ctx.ledgerSeq }) + '\n');
