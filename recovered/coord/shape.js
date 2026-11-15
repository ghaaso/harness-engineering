// prints the SHAPE (keys, types, lengths) of a JSON file, to a small depth; values only for short scalars at depth <= 2
const fs = require("fs");
const [, , file, maxDepthArg] = process.argv;
const maxDepth = Number(maxDepthArg || 3);
const j = JSON.parse(fs.readFileSync(file, "utf8"));
const show = (o, p, d) => {
  if (o === null || typeof o !== "object") { console.log(p + ": " + typeof o + (d <= 2 && String(o).length <= 60 ? " = " + JSON.stringify(o) : "")); return; }
  if (Array.isArray(o)) { console.log(p + ": array[" + o.length + "]" + (o.length && typeof o[0] !== "object" ? " of " + typeof o[0] + (o.length <= 6 ? " = " + JSON.stringify(o) : "") : "")); if (o.length && typeof o[0] === "object" && d < maxDepth) show(o[0], p + "[0]", d + 1); return; }
  const ks = Object.keys(o);
  console.log(p + ": object{" + ks.length + "} " + (ks.length <= 14 ? ks.join(",") : ks.slice(0, 8).join(",") + ",... (" + ks.length + " keys)"));
  if (d >= maxDepth) return;
  const lim = ks.length > 14 ? 2 : ks.length;
  for (const k of ks.slice(0, lim)) show(o[k], p + "." + k, d + 1);
};
show(j, "$", 0);
