// Test worker for lib.test.mjs T55: one fence call under the run lock, result printed as JSON.
// Usage: node fence-worker.mjs <lib file url> <root> <task> <expect epoch> <reason> <go file>
import fs from 'node:fs';

const [libUrl, root, task, epoch, reason, goFile] = process.argv.slice(2);
const lib = await import(libUrl);
const START = '2026-11-17T09:00:00.0000000Z';
const proc = {
  list: () => [{ pid: process.pid, ppid: 0, name: 'node.exe', exe: process.execPath, cmdline: 'fence-worker', start_time: START }],
  alive: () => true,
  boot: () => null,
};
while (!fs.existsSync(goFile)) { /* spin */ }
let out;
try {
  out = await lib.withRunLock(
    root,
    { script: 'fence-worker', proc, now: '2026-11-17T10:00:00.000Z', retries: 1000, retryMs: 5 },
    async (h) => {
      const r = await lib.fence(root, h, {
        task,
        expectEpoch: Number(epoch),
        reason,
        host: false,
        tick: 1,
        readyCheck: () => false,
        cut: { files: {}, ledger_seq: 0 },
        spendAtFence: 0,
        R: 5,
        Hmax: 5,
      });
      return { ok: true, epoch: r.row.epoch };
    },
  );
} catch (e) {
  out = { ok: false, code: e.code, exit: e.exit };
}
process.stdout.write(JSON.stringify(out) + '\n');
