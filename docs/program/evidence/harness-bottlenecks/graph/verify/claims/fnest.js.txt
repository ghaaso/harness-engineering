// Estimates a function-level call graph's size: defined names (def/class/function/const-arrow/method) and call sites naming one of them.
const fs=require('fs'),cp=require('child_process'); const repo=process.argv[2];
const files=cp.execSync('git -C '+repo+' ls-files',{encoding:'utf8'}).split('\n').filter(f=>/\.(py|ts|tsx|js|jsx|mjs)$/.test(f));
const defs=new Map(); const srcs={}; let defCount=0;
const reDef=[/^[ \t]*(?:async[ \t]+)?def[ \t]+(\w+)/gm,/^[ \t]*class[ \t]+(\w+)/gm,/\bfunction\s*\*?\s*(\w+)/g,/\b(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*(?::[^=\n]+)?=>/g,/^[ \t]+(?:public |private |protected |static |async )*(\w+)\s*\([^)]*\)\s*(?::[^{\n]+)?\{/gm];
for(const f of files){ let s; try{s=fs.readFileSync(repo+'/'+f,'utf8');}catch(e){continue;} srcs[f]=s;
  for(const re of reDef){ let m; re.lastIndex=0; while((m=re.exec(s))){ const n=m[1]; if(/^(if|for|while|switch|catch|return|function|constructor)$/.test(n))continue; defCount++; defs.set(n,(defs.get(n)||0)+1); } } }
let calls=0; const pairs=new Set(); const callRe=/\b([A-Za-z_]\w*)\s*\(/g;
for(const f in srcs){ let m; while((m=callRe.exec(srcs[f]))){ const n=m[1]; if(defs.has(n)&&n.length>2){ calls++; pairs.add(f+'|'+n); } } }
console.log(JSON.stringify({codeFiles:files.length,definitions:defCount,distinctNames:defs.size,callSitesNamingADefinedName:calls,distinctFileToNamePairs:pairs.size}));
