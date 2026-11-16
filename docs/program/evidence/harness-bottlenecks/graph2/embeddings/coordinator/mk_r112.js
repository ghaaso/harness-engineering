// sets the ruling file's time (one write), hashes it and writes the progress line's source file
const fs = require("fs"), crypto = require("crypto");
const f = "orchestrator/coordinator-rulings-112.md";
let t = fs.readFileSync(f, "utf8");
if (!t.includes("@@TIME@@")) { console.error("no time placeholder (already set?)"); process.exit(1); }
const hm = new Date().toISOString().slice(11, 16) + "Z";
t = t.replace("@@TIME@@", hm);
fs.writeFileSync(f, t);
const h = crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const line = { step: "coordinator", unit: "rulings_112", status: "ruled after the code freeze, after the held-out run of step 7 ended (rc 0) and before its hand-off went to the grader: the machine slept on its idle timer from 19:38:17Z to 21:38:12Z (Windows system log; the only sleep in 36 hours), freezing kge-H1; one unit was in training (E1, c04, seed 3, checkpoint f57288f1f9a1, four tasks; progress line 7,237.7 s, trainer clock 42.6 s); the run finished all 210 units with one start line and no failed line. The unit has 70 finite losses that follow its two sibling seeds (within 0.012 after epoch 5, no jump), and its 434 pool scores order as the siblings do (Spearman 0.917 and 0.921 against 0.944); the whole run holds no value that is not a finite number. The run stands and goes to the grader; the unit is not trained again (item 27: exactly one held-out run); that its bytes equal an uninterrupted run is likely and not proved; the coordinator report names it. The ruling goes to the protocol word for word after step 9.4. The coordinator session now asks the app to keep the machine awake.", file: f, sha256: h, t: "NOW" };
fs.writeFileSync(process.argv[2], JSON.stringify(line) + "\n");
console.log("ruling time", hm, "| sha256", h, "| lines", t.split("\n").length - 1);
