// Coordinator helper: append ONE line to the lane's progress.jsonl and prove it landed.
// usage: node append_line.js <progress.jsonl> <file holding one JSON object>
// A field "t" with the value "NOW" is replaced by the current UTC time (seconds). The line is written with one
// append call (retried on a refusal, up to five times), then the file is read again: the old bytes must be an exact
// prefix, exactly one line must have been added, and that line must parse to the same object. Exit 0 only then.
const fs = require("fs");
const crypto = require("crypto");
const [, , target, src] = process.argv;
if (!target || !src) { console.error("usage: node append_line.js <progress.jsonl> <line.json>"); process.exit(2); }
const obj = JSON.parse(fs.readFileSync(src, "utf8"));
if (obj === null || typeof obj !== "object" || Array.isArray(obj)) { console.error("the source is not one JSON object"); process.exit(2); }
if (obj.t === "NOW") obj.t = new Date().toISOString().replace(/[.][0-9]+Z$/, "Z");
const text = JSON.stringify(obj);
if (text.includes("\n")) { console.error("the line holds a newline"); process.exit(2); }
const before = fs.readFileSync(target);
if (before.length && before[before.length - 1] !== 10) { console.error("the target does not end with a newline; nothing written"); process.exit(3); }
const linesBefore = before.toString("utf8").split("\n").filter(Boolean).length;
let done = false, err = null;
for (let i = 0; i < 5 && !done; i++) {
  try { fs.appendFileSync(target, text + "\n"); done = true; }
  catch (e) {
    err = e;
    const now = fs.readFileSync(target);
    if (now.length !== before.length) { console.error("the append failed AND the file changed size (" + before.length + " -> " + now.length + "); look before retrying: " + e.message); process.exit(4); }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 700);
  }
}
if (!done) { console.error("the append was refused five times: " + (err && err.message)); process.exit(5); }
const after = fs.readFileSync(target);
const added = after.subarray(before.length).toString("utf8");
const prefixOk = after.subarray(0, before.length).equals(before);
const lines = after.toString("utf8").split("\n").filter(Boolean);
const last = lines[lines.length - 1];
let same = false;
try { same = JSON.stringify(JSON.parse(last)) === text; } catch (e) { same = false; }
// Another writer may have appended between the two reads: then our line is not the last, but must be present once after the old bytes.
const mine = added.split("\n").filter(Boolean).filter((l) => l === text).length;
console.log("appended unit " + obj.unit + " at " + obj.t + " | lines " + linesBefore + " -> " + lines.length + " | old bytes are a prefix: " + prefixOk +
  " | my line among the added lines: " + mine + " | it is the last line: " + same + " | sha256 of the line " + crypto.createHash("sha256").update(text).digest("hex").slice(0, 16));
process.exit(prefixOk && mine === 1 ? 0 : 6);
