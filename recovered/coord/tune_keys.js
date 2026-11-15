const fs = require("fs");
const j = JSON.parse(fs.readFileSync("train/report/tune.json", "utf8"));
const t = (v) => v === null ? "null" : Array.isArray(v) ? "array[" + v.length + "]" : typeof v === "object" ? "object{" + Object.keys(v).slice(0, 14).join(",") + (Object.keys(v).length > 14 ? ",...(" + Object.keys(v).length + ")" : "") + "}" : typeof v + " = " + String(v).slice(0, 80);
for (const k of Object.keys(j)) console.log(k + ": " + t(j[k]));
for (const k of ["arms", "comparators", "contrasts", "verdicts", "rank", "sets", "holm", "placebo", "sensitivity"]) {
  if (j[k] && typeof j[k] === "object") { const ks = Object.keys(j[k]); console.log("--- " + k + " [" + ks.length + " keys]: " + ks.slice(0, 40).join(", ")); const first = j[k][ks[0]]; if (first && typeof first === "object") { console.log("    first entry " + ks[0] + ": " + t(first)); for (const kk of Object.keys(first).slice(0, 12)) console.log("      ." + kk + ": " + t(first[kk])); } }
}
