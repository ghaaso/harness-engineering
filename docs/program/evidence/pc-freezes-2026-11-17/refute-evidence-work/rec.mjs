// parse recorder.log -> array of samples
import fs from 'node:fs';
const B='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/tcb-build';
export function load(){
  const L=fs.readFileSync(B+'/lane/recorder.log','utf8').split(/\r?\n/);
  const out=[];
  for(const l of L){
    const m=l.match(/^(\d\d):(\d\d):(\d\d) (.*)$/); if(!m) continue;
    const s=+m[1]*3600+ +m[2]*60+ +m[3];
    const o={t:m[1]+':'+m[2]+':'+m[3],s,raw:l};
    for(const kv of m[4].split(' ')){const i=kv.indexOf('=');if(i<0)continue;const k=kv.slice(0,i),v=kv.slice(i+1);
      if(k==='top'){o.top=v.split(',').map(x=>{const j=x.lastIndexOf(':');return [x.slice(0,j),+x.slice(j+1)]});}
      else o[k]=parseFloat(v);}
    out.push(o);
  }
  return out;
}
