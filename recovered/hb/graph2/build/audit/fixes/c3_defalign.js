// Check 3c: share of TUNE T1 reference definitions that signature form can credit at all
// (some definition node of the same file at the parent has its start line inside the definition).
"use strict";
const fs=require("fs"),path=require("path");const B=path.resolve(__dirname,"..","..");
const DEF=new Set(["function","method","class","component","constant","test","migration"]);
const byP=new Map();let n=0,ok=0;const miss={};
for(const l of fs.readFileSync(path.join(B,"sealed/references.jsonl"),"utf8").split("\n")){if(!l)continue;const r=JSON.parse(l);if(r.set!=="T1"||r.split!=="tune")continue;
 if(!byP.has(r.parent)){const m=new Map();for(const x of fs.readFileSync(path.join(B,"facts/cache",r.parent,"nodes.jsonl"),"utf8").split("\n")){if(!x)continue;const o=JSON.parse(x);if(DEF.has(o.kind)&&o.line_start){if(!m.has(o.path))m.set(o.path,[]);m.get(o.path).push(o.line_start)}}byP.set(r.parent,m)}
 const m=byP.get(r.parent);for(const d of r.defs){n++;const ls=m.get(d.path)||[];if(ls.some(x=>x>=d.start&&x<=d.end))ok++;else{const k=(d.kind||"?")+" "+path.extname(d.path);miss[k]=(miss[k]||0)+1}}}
console.log(JSON.stringify({ref_defs:n,creditable_in_signature_form:ok,share:+(ok/n).toFixed(4),uncreditable_by_kind_ext:miss}));
