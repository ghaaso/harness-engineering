const fs=require('fs'),path=require('path'),cr=require('crypto');
const L=process.argv[2];process.chdir(L);
const files=process.argv.slice(3);
const dirs=['r58b/logs','r58c/A/logs','r58c/B/logs','r58c/B/out/logs'];
const logs=[];
for(const d of dirs){for(const f of fs.readdirSync(d)){const p=d+'/'+f;const st=fs.statSync(p);if(st.isFile())logs.push({p,m:st.mtimeMs,t:fs.readFileSync(p,'latin1')});}}
logs.sort((a,b)=>b.m-a.m);
for(const f of files){
 const h=cr.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 const base=path.basename(f);
 const hit=logs.filter(l=>l.t.includes(h));
 const other=[];
 for(const l of logs){const re=new RegExp('([0-9a-f]{64})[^\n]{0,8}?\S*'+base.replace(/\./g,'\.'),'g');let m;while((m=re.exec(l.t))){if(m[1]!==h){other.push(l.p+':'+m[1].slice(0,8));break;}}}
 console.log('== '+f+' '+h.slice(0,12));
 console.log('  current-hash logs: '+hit.slice(0,5).map(l=>l.p+'@'+new Date(l.m).toISOString().slice(5,16)+(/RESULT PASS/.test(l.t)?'[PASS]':'')+(/RESULT FAIL/.test(l.t)?'[FAIL]':'')).join(' | ')+(hit.length>5?' +'+(hit.length-5):''));
 console.log('  newest other-hash: '+other.slice(0,3).join(' | '));
}
