const fs=require('fs'),path=require('path'),crypto=require('crypto');
const LANE='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const OUT='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/freeze/hash-result.json';
const FREEZE_T=Date.parse('2026-11-15T16:48:03Z');
const lines=fs.readFileSync(LANE+'/orchestrator/freeze-list.txt','utf8').split(/\r?\n/);
let section='lane';const res={hashed:0,equal:0,diff:[],missing:[],sealed:[],images:[],bad:[],after_freeze:[],sections:{},maxmtime:null,dups:[]};
const seen=new Set();
for(const ln of lines){
  if(!ln.trim())continue;
  if(ln.startsWith('#')){section=ln.slice(1).trim();continue;}
  const m=ln.match(/^(\S+)  (.+)$/);
  if(!m){res.bad.push(ln);continue;}
  const [_,h,p]=m;
  if(section==='images'){res.images.push(ln);continue;}
  if(/sealed/i.test(p)){res.sealed.push(p);continue;}
  if(seen.has(p))res.dups.push(p);seen.add(p);
  const full=section==='outside'?p:path.posix.join(LANE,p);
  res.sections[section]=(res.sections[section]||0)+1;
  let buf;try{buf=fs.readFileSync(full);}catch(e){res.missing.push(p);continue;}
  res.hashed++;
  const got=crypto.createHash('sha256').update(buf).digest('hex');
  if(got===h)res.equal++;else res.diff.push({p,listed:h,got});
  const st=fs.statSync(full);
  if(st.mtimeMs>FREEZE_T)res.after_freeze.push({p,mtime:st.mtime.toISOString()});
  if(!res.maxmtime||st.mtimeMs>res.maxmtime.ms)res.maxmtime={p,ms:st.mtimeMs,iso:st.mtime.toISOString()};
}
const need=['train/selectB.py','train/report.py','train/item27.py','train/heldout.py','train/heldout.sh','train/kge.py','train/answer_level.py','train/leak_audit.py','train/item22.py','train/write_result.py','r58c/write_audit_claims.py','r58c/B/e5_route_audit.py','eval/evalcore.py'];
res.need={};for(const n of need)res.need[n]=seen.has(n);
res.protocol=[...seen].filter(p=>/protocol-addendum-8\.md$/.test(p));
res.endorder=[...seen].filter(p=>/END-ORDER/.test(p));
res.freezelist_sha=crypto.createHash('sha256').update(fs.readFileSync(LANE+'/orchestrator/freeze-list.txt')).digest('hex');
fs.writeFileSync(OUT,JSON.stringify(res,null,1));
console.log(JSON.stringify({hashed:res.hashed,equal:res.equal,diff:res.diff.length,missing:res.missing,sealed:res.sealed,bad:res.bad.length,dups:res.dups.length,after_freeze:res.after_freeze.length,sections:res.sections,maxmtime:res.maxmtime,need:res.need,protocol:res.protocol,endorder:res.endorder,freezelist_sha:res.freezelist_sha,images:res.images},null,1));
if(res.diff.length)console.log(JSON.stringify(res.diff.slice(0,40),null,1));
if(res.after_freeze.length)console.log(JSON.stringify(res.after_freeze.slice(0,40),null,1));
