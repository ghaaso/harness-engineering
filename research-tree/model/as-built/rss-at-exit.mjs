// Preload for measuring a check run's peak resident memory without touching check.mjs:
//   node --import ./model/as-built/rss-at-exit.mjs model/as-built/check.mjs <ID> --mem-mb 400
// Prints one line "[rss] max_rss_mb=N wall_s=S" on stderr when the process exits. Changes nothing else.
const t0 = Date.now();
process.on('exit', () => {
  process.stderr.write(`[rss] max_rss_mb=${Math.round(process.resourceUsage().maxRSS / 1024)} wall_s=${((Date.now() - t0) / 1000).toFixed(1)}\n`);
});
