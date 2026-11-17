// waits for the ladder to end (or a time limit), then prints a short status; flags a stall when the summary has not moved
// usage: node ladder_watch.js <build folder> [seconds]
const fs = require("fs"), path = require("path");
const [, , ROOT, maxSec = "540"] = process.argv;
const LOG = path.join(ROOT, "model/results/ladder.log"), SUM = path.join(ROOT, "model/results/SUMMARY.md"), REC = path.join(ROOT, "lane/recorder.log");
const sab = new Int32Array(new SharedArrayBuffer(4)), t0 = Date.now();
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch (e) { return ""; } };
const tailLines = (f, n, bytes = 4000) => { try { const st = fs.statSync(f), fd = fs.openSync(f, "r"), k = Math.min(st.size, bytes), b = Buffer.alloc(k); fs.readSync(fd, b, 0, k, st.size - k); fs.closeSync(fd); return b.toString("utf8").trim().split("\n").slice(-n); } catch (e) { return []; } };
const ended = () => /ladder (ended|stopped)/.test(tailLines(LOG, 3).join("\n"));
const age = () => { try { return Math.round((Date.now() - fs.statSync(SUM).mtimeMs) / 1000); } catch (e) { return -1; } };
let stalled = false;
while (!ended() && (Date.now() - t0) / 1000 < Number(maxSec)) { Atomics.wait(sab, 0, 0, 15000); if (age() > 1200) { stalled = true; break; } } // a large part can run for many minutes between two updates of the summary
const log = tailLines(LOG, 40).filter((l) => !l.startsWith("{")).slice(-3).map((l) => l.slice(0, 150));
const moves = tailLines(LOG, 40).filter((l) => l.startsWith("{")).map((l) => { try { const o = JSON.parse(l); return o.moved_from_size_mb + " MB: " + o.moved; } catch (e) { return ""; } }).filter(Boolean);
const parts = (read(SUM).split("\n").find((l) => l.startsWith("Parts:")) || "").slice(0, 170);
const hdr = (read(SUM).split("\n").find((l) => l.startsWith("Updated")) || "").replace(/^.*?; /, "").slice(0, 110);
console.log((ended() ? "LADDER ENDED" : stalled ? "STALL? summary not updated for " + age() + " s" : "running") + " after " + Math.round((Date.now() - t0) / 1000) + " s");
console.log(log.join("\n"));
if (moves.length) console.log("moved on to the next size so far: " + moves.join("; "));
console.log(hdr + "\n" + parts);
console.log("recorder: " + (tailLines(REC, 1)[0] || "").slice(0, 70) + " | governor lines: " + (read(REC).match(/GOVERNOR/g) || []).length);
