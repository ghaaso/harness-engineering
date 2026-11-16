// Test worker for lib.test.mjs T79b: parses a large transcript under a small heap limit.
// Usage: node --max-old-space-size=64 parse-worker.mjs <lib file url> <transcript>
const [libUrl, file] = process.argv.slice(2);
const lib = await import(libUrl);
const p = await lib.parseTranscript(file, {});
const last = p.turnEnds.length ? p.turnEnds[p.turnEnds.length - 1].text : null;
process.stdout.write(
  JSON.stringify({
    calls: p.calls.length,
    turns: p.turnEnds.length,
    last,
    torn: p.torn,
    heapUsed: process.memoryUsage().heapUsed,
  }) + '\n',
);
