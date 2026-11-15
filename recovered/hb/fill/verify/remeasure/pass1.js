const fs=require('fs'),rl=require('readline');const L=require('./lib.js');
const files=JSON.parse(fs.readFileSync('files.json','utf8'));
const blobs={},tools={},reqs={},shapes={},calls={},stat={};const inc=k=>stat[k]=(stat[k]||0)+1;
const tu2msg={},sig2msg={},txt2msg={};
const tkey=s=>s.length+'|'+s.slice(0,120);
function resChars(c){let ch=0,img=0;if(typeof c==='string')return [c.length,0];if(Array.isArray(c))for(const x of c){if(x.type==='text')ch+=(x.text||'').length;else if(x.type==='image'){img++;}else{inc('trinner:'+x.type);ch+=JSON.stringify(x).length;}}return [ch,img];}
function sumBlob(m){const b=[];const c=m.content;
 if(typeof c==='string'){b.push(['t',c.length]);return {r:m.role,b};}
 for(const x of c||[]){inc('blk:'+m.role+':'+x.type);
  if(x.type==='tool_use'){const inp=x.input||{};b.push(['u',JSON.stringify(inp).length+(x.name||'').length,x.id]);if(!tools[x.id]){const c2=L.classifyTool(x.name,inp);tools[x.id]={n:x.name,c:c2.cls,k:c2.key||'',g:c2.rng||'',w:c2.w||''};}}
  else if(x.type==='thinking')b.push(['k',(x.thinking||'').length,(x.signature||'').slice(0,80)]);
  else if(x.type==='redacted_thinking')b.push(['k',0,(x.data||'').slice(0,80)]);
  else if(x.type==='text')b.push(['t',(x.text||'').length,m.role==='assistant'?tkey(x.text||''):'']);
  else if(x.type==='tool_result'){const [ch,img]=resChars(x.content);b.push(['r',ch,x.tool_use_id,img,x.is_error?1:0]);}
  else if(x.type==='image')b.push(['i',0]);
  else b.push(['o',JSON.stringify(x).length,x.type]);}
 return {r:m.role,b};}
(async()=>{for(let fi=0;fi<files.length;fi++){const f=files[fi];
 const r=rl.createInterface({input:fs.createReadStream(f.p),crlfDelay:Infinity});
 for await(const l of r){let o;try{o=JSON.parse(l)}catch(e){inc('badline');continue}
  const t=o.type;
  if(t==='api-request-blob'){if(!blobs[o.hash])blobs[o.hash]=sumBlob(o.message);continue;}
  if(t==='api-request-shape'){if(!shapes[o.shapeHash]){const sh=o.shape||{};const sys=JSON.stringify(sh.system||'').length;const tl=JSON.stringify(sh.tools||'').length;const rest=JSON.stringify(sh).length-sys-tl;shapes[o.shapeHash]={sys,tl,rest,keys:Object.keys(sh).join(',')};}continue;}
  if(t==='api-request'){const p=o.params||{};inc('qs:'+o.querySource);inc('cm:'+JSON.stringify(p.context_management||null));
   reqs[o.id]={f:fi,b:o.base||null,k:o.keep||0,t:o.tail||[],s:o.shapeHash,q:o.querySource,ts:o.timestamp};continue;}
  if(t==='assistant'){const m=o.message||{};if(m.model==='<synthetic>')continue;const id=m.id;
   let c=calls[id];if(!c){c=calls[id]={f:fi,ref:o.requestRef||null,ts:o.timestamp,model:m.model,u:null,side:o.isSidechain?1:0};}
   const u=m.usage;if(u){const th=(u.output_tokens_details||{}).thinking_tokens||0;c.u=[u.input_tokens||0,u.cache_read_input_tokens||0,u.cache_creation_input_tokens||0,u.output_tokens||0,th];}
   if(!c.ref&&o.requestRef)c.ref=o.requestRef;
   for(const x of Array.isArray(m.content)?m.content:[]){if(x.type==='tool_use')tu2msg[x.id]=id;else if(x.type==='thinking'&&x.signature)sig2msg[x.signature.slice(0,80)]=id;else if(x.type==='redacted_thinking')sig2msg[(x.data||'').slice(0,80)]=id;else if(x.type==='text')txt2msg[tkey(x.text||'')]=id;}
   continue;}
  if(t==='user'&&o.isCompactSummary)inc('compact:'+f.kind);
 }
 process.stderr.write('.');}
 fs.writeFileSync('p1.json',JSON.stringify({blobs,tools,reqs,shapes,calls,tu2msg,sig2msg,txt2msg}));
 console.log(JSON.stringify(stat,null,0));
 console.log('blobs',Object.keys(blobs).length,'reqs',Object.keys(reqs).length,'calls',Object.keys(calls).length,'shapes',Object.keys(shapes).length,'tools',Object.keys(tools).length);
})();
