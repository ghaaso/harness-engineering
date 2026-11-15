// print snippets around a needle in a jsonl file, with timestamp and role
const fs=require('fs');const [f,needle,max]=[process.argv[2],process.argv[3],+(process.argv[4]||8)];
let n=0;
for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l.includes(needle)) continue; let o; try{o=JSON.parse(l)}catch{continue}
  const s=JSON.stringify(o.message&&o.message.content||o); let i=s.indexOf(needle);
  while(i>=0 && n<max){ console.log('['+o.timestamp+' '+(o.message&&o.message.role)+' '+o.type+']', s.slice(Math.max(0,i-500),i+400).replace(/\n/g,' ')); console.log('---'); n++; i=s.indexOf(needle,i+needle.length); if(n>=max)break;}
  if(n>=max)break;}
