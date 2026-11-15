const fs=require('fs');
const pats=process.argv.slice(3).map(p=>new RegExp(p,'i'));
for(const l of fs.readFileSync(process.argv[2],'utf8').split('\n')){
 if(!l)continue; let o; try{o=JSON.parse(l)}catch{continue}
 const s=JSON.stringify(o.message?.content??o);
 for(const p of pats){const m=p.exec(s); if(m){console.log(o.timestamp, o.type, '::', s.slice(Math.max(0,m.index-200),m.index+400).replace(/\n/g,' ')); console.log('---'); break;}}
}
