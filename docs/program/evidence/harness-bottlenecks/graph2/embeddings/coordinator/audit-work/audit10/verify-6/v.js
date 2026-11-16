const z=require('zlib'),fs=require('fs'),path=require('path');
const D='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/train/heldout/ranked';
function load(v){const m={};for(const l of z.gunzipSync(fs.readFileSync(path.join(D,v+'_pool.jsonl.gz'))).toString().split('\n')){if(!l.trim())continue;const o=JSON.parse(l);m[o.id]=o.ranked;}return m;}
const setd=(a,b)=>{const A=a.slice(0,10),B=new Set(b.slice(0,10));return A.filter(x=>!B.has(x)).length;};
const posd=(a,b)=>{let n=0;for(let i=0;i<10;i++)if(a[i]!==b[i])n++;return n;};
const out={};
for(const kind of ['alone','fused']){
 const s=[1,2,3].map(i=>load('E1_'+kind+'_s'+i));
 const ids=Object.keys(s[0]).sort();
 const r={n_tasks:ids.length,targets:{},hist_set:{},hist_pos:{},isolated_set:[],isolated_pos:[],ge6_set:[],max_pair_set:0,mean_pair_set:0};
 let sum=0,cnt=0;
 for(const id of ids){
  const L=s.map(x=>x[id]);
  const ds={d12:setd(L[0],L[1]),d13:setd(L[0],L[2]),d23:setd(L[1],L[2])};
  const dp={d12:posd(L[0],L[1]),d13:posd(L[0],L[2]),d23:posd(L[1],L[2])};
  for(const k in ds){sum+=ds[k];cnt++;r.max_pair_set=Math.max(r.max_pair_set,ds[k]);}
  if(['T1-0557','T1-0558','T1-0559','T1-0560'].includes(id))r.targets[id]={set:ds,pos:dp,len:L.map(x=>x.length)};
  const sib={0:[ds.d12,ds.d13,ds.d23],1:[ds.d12,ds.d23,ds.d13],2:[ds.d13,ds.d23,ds.d12]};
  // seed i: distances to two siblings, and siblings' mutual distance
  const trip=[[ds.d12,ds.d13,ds.d23],[ds.d12,ds.d23,ds.d13],[ds.d13,ds.d23,ds.d12]];
  const tripP=[[dp.d12,dp.d13,dp.d23],[dp.d12,dp.d23,dp.d13],[dp.d13,dp.d23,dp.d12]];
  trip.forEach((t,i)=>{const m=Math.min(t[0],t[1]);r.hist_set[m]=(r.hist_set[m]||0)+1;if(m>=6){r.ge6_set.push(id+' s'+(i+1)+' min='+m+' sib='+t[2]);}if(m>=6&&t[2]<=1)r.isolated_set.push(id+' s'+(i+1));});
  tripP.forEach((t,i)=>{const m=Math.min(t[0],t[1]);r.hist_pos[m]=(r.hist_pos[m]||0)+1;if(m>=6&&t[2]<=1)r.isolated_pos.push(id+' s'+(i+1)+' min='+m+' sib='+t[2]);});
 }
 r.mean_pair_set=sum/cnt; out[kind]=r;
}
fs.writeFileSync(path.join(__dirname,'out.json'),JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
