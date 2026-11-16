// scans a session transcript (JSONL, read as a stream) for the entries around a time gap; prints time, type and a short excerpt
const fs = require("fs"), readline = require("readline");
const [, , file, from, to] = process.argv;
const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
let prev = null, n = 0, shown = 0; const gaps = [];
rl.on("line", (line) => {
  n++; const m = /"timestamp":"([^"]+)"/.exec(line); if (!m) return; const t = m[1];
  if (prev && Date.parse(t) - Date.parse(prev.t) > 20 * 60 * 1000 && t >= from) gaps.push([prev.t, t, ((Date.parse(t) - Date.parse(prev.t)) / 3600000).toFixed(2)]);
  if (t >= from && t <= to) {
    let o; try { o = JSON.parse(line); } catch (e) { o = null; }
    const typ = o ? (o.type + (o.subtype ? "/" + o.subtype : "") + (o.isApiErrorMessage ? "/API-ERROR" : "") + (o.level ? "/" + o.level : "")) : "?";
    let txt = "";
    if (o) { const c = o.message && o.message.content; if (typeof c === "string") txt = c; else if (Array.isArray(c)) txt = c.map((x) => x.type === "text" ? x.text : x.type === "tool_use" ? "[tool_use " + x.name + "]" : x.type === "tool_result" ? "[tool_result]" : "[" + x.type + "]").join(" "); else if (o.content) txt = typeof o.content === "string" ? o.content : JSON.stringify(o.content); else if (o.error) txt = JSON.stringify(o.error); }
    if (shown < 60) { console.log(t + " | " + typ + " | " + String(txt).replace(/\s+/g, " ").slice(0, 170)); shown++; }
  }
  prev = { t };
});
rl.on("close", () => { console.log("lines " + n + " | gaps over 20 min since " + from + ": " + JSON.stringify(gaps)); });
