const fs=require('fs');const code=/^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const tc=new Set(fs.readFileSync('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/eval/tune_commits.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).commit));
let cur=null;const st={},stAll={},ex=[];const nonCodeM={};
for(const l of fs.readFileSync('gl2.txt','utf8').split('\n')){if(l.startsWith('@@')){cur=l.slice(2).split('|')[0];continue;}if(!l.trim()||!tc.has(cur))continue;const p=l.split('\t');const s=p[0][0];stAll[s]=(stAll[s]||0)+1;if(code.test(p[p.length-1])){st[s]=(st[s]||0)+1;if(s==='D')ex.push(cur.slice(0,8)+' '+p[1]);}else if(s==='M'){const k=p[1].split('/')[0];nonCodeM[k]=(nonCodeM[k]||0)+1;}}
console.log('code statuses in 65 tune commits',st,'all',stAll,'deleted code',ex,'modified non-code top dirs',nonCodeM);
