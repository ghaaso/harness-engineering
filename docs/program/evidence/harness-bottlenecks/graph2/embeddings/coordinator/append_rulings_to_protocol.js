// Appends coordinator rulings to the protocol word for word (the form of the earlier blocks), in ONE write, and proves
// that the frozen bytes are an exact prefix of the new file.
// usage: node append_rulings_to_protocol.js <protocol> <frozen sha256> <lane folder> <N=sha256> [<N=sha256> ...]
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const [, , proto, frozen, lane, ...pairs] = process.argv;
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const old = fs.readFileSync(proto);
if (sha(old) !== frozen) { console.error("the protocol is not the frozen one: " + sha(old)); process.exit(1); }
if (old[old.length - 1] !== 10) { console.error("the protocol does not end with a newline"); process.exit(1); }
let add = "";
const bodies = [];
for (const p of pairs) {
  const [n, h] = p.split("=");
  const rel = "orchestrator/coordinator-rulings-" + n + ".md";
  const b = fs.readFileSync(path.join(lane, rel));
  if (sha(b) !== h) { console.error("ruling " + n + " is not " + h + ": " + sha(b)); process.exit(1); }
  const t = b.toString("utf8");
  const lines = t.split("\n");
  if (!lines[0].startsWith("# Coordinator ruling " + n + ",") || lines[1] !== "") { console.error("ruling " + n + ": unexpected first lines"); process.exit(1); }
  let body = lines.slice(2).join("\n"); if (!body.endsWith("\n")) body += "\n";
  if (old.toString("utf8").includes("\n" + n + ". ")) { console.error("the protocol already holds a paragraph " + n + "."); process.exit(1); }
  add += "\nRuling " + n + " (copied word for word from `" + rel + "`, sha256 " + h + "):\n\n" + body;
  bodies.push([n, body]);
}
const now = Buffer.concat([old, Buffer.from(add, "utf8")]);
fs.writeFileSync(proto, now);
const back = fs.readFileSync(proto);
const prefixOk = back.subarray(0, old.length).equals(old) && sha(back.subarray(0, old.length)) === frozen;
const text = back.toString("utf8");
const wordForWord = bodies.every(([, body]) => text.includes(body));
console.log(JSON.stringify({ frozen_sha256: frozen, frozen_bytes: old.length, frozen_lines: old.toString("utf8").split("\n").length - 1, new_sha256: sha(back), new_bytes: back.length, new_lines: text.split("\n").length - 1,
  frozen_bytes_are_an_exact_prefix: prefixOk, every_ruling_word_for_word: wordForWord, rulings: bodies.map(([n]) => n) }, null, 1));
process.exit(prefixOk && wordForWord ? 0 : 2);
