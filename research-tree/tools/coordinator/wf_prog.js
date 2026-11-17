// waits for a workflow's output file (or a time limit), then prints which agents are done and which are running
const fs = require("fs");
const [, , out, journal, maxSec = "560"] = process.argv;
const sab = new Int32Array(new SharedArrayBuffer(4)), t0 = process.hrtime.bigint();
const done = () => { try { return fs.statSync(out).size > 0; } catch (e) { return false; } };
while (!done() && Number(process.hrtime.bigint() - t0) / 1e9 < Number(maxSec)) Atomics.wait(sab, 0, 0, 15000);
const L = (() => { try { return fs.readFileSync(journal, "utf8").split("\n").filter(Boolean).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean); } catch (e) { return []; } })();
const lab = {}; for (const o of L) if (o.type === "started") lab[o.key] = o.label;
const fin = L.filter((o) => o.type === "result").map((o) => lab[o.key] + (o.result == null ? "(NULL)" : ""));
const run = Object.values(lab).filter((l) => !fin.includes(l) && !fin.includes(l + "(NULL)"));
console.log((done() ? "FINISHED" : "running") + " after " + Math.round(Number(process.hrtime.bigint() - t0) / 1e9) + " s | done " + fin.length + ": " + fin.join(", "));
console.log("running " + run.length + ": " + run.join(", "));
