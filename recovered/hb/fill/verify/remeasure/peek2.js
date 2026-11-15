const fs=require('fs'),rl=require('readline');
const f=process.argv[2];let n=0;const seq=[];
const r=rl.createInterface({input:fs.createReadStream(f)});
r.on('line',l=>{let o;try{o=JSON.parse(l)}catch(e){return}
 if(o.type==='api-request'){n++;if(n===3)console.log(JSON.stringify(o).replace(/"betas":\[[^\]]*\]/,''));}
 if(o.type==='assistant'&&n===3&&!global.done){global.done=1;const m=o.message;console.log(Object.keys(o).join(','));console.log(JSON.stringify(Object.assign({},o,{message:Object.assign({},m,{content:'..'})})));}
 seq.push(o.type==='assistant'?'A:'+o.message.id.slice(-6):o.type==='api-request'?'R':o.type==='user'?'U':o.type[0]);
});
r.on('close',()=>console.log(seq.slice(0,200).join(' ')));
