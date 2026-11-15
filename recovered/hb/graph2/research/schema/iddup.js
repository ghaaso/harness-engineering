// Which ids are defined (heading / table row / bold bullet at line start) in more than one doc?
const fs=require("fs"),cp=require("child_process");const R=process.argv[2];
const files=cp.execSync("git ls-files docs CLAUDE.md && git ls-files --others --exclude-standard docs",{cwd:R,encoding:"utf8"}).split("\n").filter(f=>f.endsWith(".md"));
const def={};const re=new RegExp("^(?:#{1,6} |[|] ?[*]{0,2}|- [*][*])((?:KS-)?[A-Z]{1,3}[0-9]{1,3}[a-z]?)(?![A-Za-z0-9])","gm");
for(const f of files){const t=fs.readFileSync(R+"/"+f,"utf8");for(const m of t.matchAll(re)){(def[m[1]]=def[m[1]]||new Set()).add(f);}}
const ids=Object.keys(def);const multi=ids.filter(i=>def[i].size>1);
console.log("ids with a defining row:",ids.length,"defined in >1 doc:",multi.length);
console.log(multi.slice(0,25).map(i=>i+"x"+def[i].size).join(" "));
