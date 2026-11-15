const fs=require("fs"),path=require("path"),crypto=require("crypto");
const F=path.resolve(__dirname,"../../facts"), C=path.join(F,"cache");
const h=crypto.createHash("sha256");for(const f of ["build_facts.js","py_extract.py","ts_extract.js","docs_extract.js","git_extract.js"])h.update(f+"\0"+fs.readFileSync(path.join(F,f)));
const V=h.digest("hex").slice(0,16);
const lines=fs.readFileSync(path.resolve(__dirname,"../../tasks/parents.txt"),"utf8").split("\n").filter(l=>l&&!l.startsWith("#"));
const shas=[...new Set(lines.map(l=>l.split("\t")[0]))];
let ok=0,missing=[],badver=[],degraded=[],shaMismatch=[];
for(const s of shas){const d=path.join(C,s);if(!fs.existsSync(path.join(d,"meta.json"))){missing.push(s);continue;}
const m=JSON.parse(fs.readFileSync(path.join(d,"meta.json"),"utf8"));
if(m.extractor_version!==V)badver.push(s.slice(0,8)+":"+m.extractor_version);
if(m.commit!==s)shaMismatch.push(s);
const st=Object.entries(m.stages).filter(([k,v])=>v.status!=="ok").map(([k,v])=>k+"="+v.status+(v.programs?JSON.stringify(v.programs):""));
if(st.length)degraded.push(s.slice(0,8)+" "+st.join(";"));
for(const f of ["nodes.jsonl","edges.jsonl","commits.jsonl"]){const x=crypto.createHash("sha256").update(fs.readFileSync(path.join(d,f))).digest("hex");if(x!==m.output_sha256[f])shaMismatch.push(s.slice(0,8)+" "+f);}
ok++;}
const removes=lines.filter(l=>l.split("\t")[3]&&l.split("\t")[3]!=="-").map(l=>l.split("\t")[0].slice(0,8)+" "+l.split("\t")[3]);
const cacheDirs=fs.readdirSync(C).filter(x=>/^[0-9a-f]{40}$/.test(x));
const allv={};for(const s of cacheDirs){const m=JSON.parse(fs.readFileSync(path.join(C,s,"meta.json"),"utf8"));allv[m.extractor_version]=(allv[m.extractor_version]||0)+1;}
console.log(JSON.stringify({current_version:V,parent_lines:lines.length,distinct:shas.length,present:ok,missing,badver,shaMismatch,degraded,removes,cacheDirs:cacheDirs.length,versions_in_cache:allv},null,1));
