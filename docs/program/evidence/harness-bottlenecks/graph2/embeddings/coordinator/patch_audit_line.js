const fs = require("fs"); const f = process.argv[2]; const [r1a, r1b, r2a, r2b] = process.argv.slice(3);
const o = JSON.parse(fs.readFileSync(f, "utf8")); let s = o.status;
const rep = (a, b) => { if (!s.includes(a)) { console.error("text not found: " + a); process.exit(1); } s = s.replace(a, b); };
rep("22:57Z to 23:16Z", r1a + " to " + r1b); rep("23:19Z to 23:39Z", r2a + " to " + r2b);
rep("177 checks, 12 not passed, each of them a statement the deliverable lacks or misstates and none a wrong figure", "177 checks: 11 failed and one could not be done (it would need new training); the failed ones are statements the deliverable lacks or misstates, and the pilot's gate figure taken on the date-order set, which ruling 32 explains; none is a wrong figure");
o.status = s; fs.writeFileSync(f, JSON.stringify(o) + "\n"); console.log("patched; status length", s.length);
