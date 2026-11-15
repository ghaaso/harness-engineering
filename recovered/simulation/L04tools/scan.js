// usage: RX=<regex> node scan.js <dir1> [dir2...]
const fs=require('fs'),path=require('path');
const re=new RegExp(process.env.RX,'i');
const dirs=process.argv.slice(2);
function walk(d,out){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p,out);else if(f.name.endsWith('.jsonl'))out.push(p);}return out;}
let files=[];for(const d of dirs){if(fs.statSync(d).isDirectory())walk(d,files);else files.push(d);}
let hits=0;
for(const f of files){
  const lines=fs.readFileSync(f,'utf8').split('\n');
  lines.forEach((ln,i)=>{
    const m=ln.match(re); if(!m) return;
    let ts='',type='',role='';
    try{const o=JSON.parse(ln);ts=o.timestamp||'';type=o.type||'';role=(o.message&&o.message.role)||'';}catch(e){}
    const idx=m.index; const s=ln.slice(Math.max(0,idx-(+process.env.B||250)),idx+(+process.env.A||350)).replace(/\n/g,' ');
    console.log(`${ts} ${path.basename(path.dirname(f)).slice(-24)}/${path.basename(f)}:${i+1} ${type}/${role}\n   ${s}\n`);
    hits++;
  });
}
console.error('hits',hits,'files',files.length);
