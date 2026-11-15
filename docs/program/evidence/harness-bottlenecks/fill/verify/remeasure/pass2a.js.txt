// walk transcripts; emit windows with calls and pieces
const fs=require('fs'),rl=require('readline');const L=require('./lib.js');
const files=JSON.parse(fs.readFileSync('files.json','utf8'));
const P1=JSON.parse(fs.readFileSync('p1.json','utf8'));const CALLS=P1.calls,REQS=P1.reqs;
const lenOf=id=>{const r=REQS[id];return r?r.k+r.t.length:0;};
const out=fs.createWriteStream('windows.ndjson');const st={};const inc=(k,v=1)=>st[k]=(st[k]||0)+v;
function resInfo(c){let ch=0,img=0;if(typeof c==='string')return [c.length,0];if(Array.isArray(c))for(const x of c){if(x.type==='text')ch+=(x.text||'').length;else if(x.type==='image')img++;else ch+=JSON.stringify(x).length;}return [ch,img];}
(async()=>{for(let fi=0;fi<files.length;fi++){const f=files[fi];
 const tools={};let win=null,prevWin=null,compact=false;const seen=new Set();
 const flush=()=>{if(win&&win.calls.length){out.write(JSON.stringify(win)+'\n');prevWin=win;}win=null;};
 const add=p=>{if(!win){inc('piece-before-first-call');win={f:fi,kind:f.kind,calls:[],pieces:[],why:'pre'};}p.g=win.calls.length;win.pieces.push(p);};
 const r=rl.createInterface({input:fs.createReadStream(f.p),crlfDelay:Infinity});
 for await(const l of r){if(l.length<20)continue;let o;try{o=JSON.parse(l)}catch(e){continue}
  const t=o.type;
  if(t==='assistant'){const m=o.message||{};if(m.model==='<synthetic>')continue;
   for(const x of Array.isArray(m.content)?m.content:[])if(x.type==='tool_use'&&!tools[x.id]){const c=L.classifyTool(x.name,x.input);tools[x.id]={n:x.name,c:c.cls,k:c.key?L.repoRel(c.key):'',nk:c.key?L.normKey(c.key):'',g:c.rng||'',w:c.w||''};}
   if(seen.has(m.id))continue;seen.add(m.id);
   const C=CALLS[m.id];const req=REQS[C.ref]||null;const A=C.u[0]+C.u[1]+C.u[2];
   let why=null;
   if(!win||!win.calls.length)why=win?win.why:'first';
   else if(compact)why='compact';
   else if(!req||!req.b)why='nobase';
   else if(req.k<0.5*lenOf(req.b))why='keepdrop';
   else{const last=win.calls[win.calls.length-1].A;if(A<0.7*last)why='drop';}
   if(why&&win&&win.calls.length){const pending=win.pieces.filter(p=>p.g===win.calls.length);win.pieces=win.pieces.filter(p=>p.g<win.calls.length);flush();win={f:fi,kind:f.kind,calls:[],pieces:pending.map(p=>(p.g=0,p)),why};}
   if(!win)win={f:fi,kind:f.kind,calls:[],pieces:[],why:why||'first'};
   if(why){inc('win:'+why);win.why=why;if(prevWin&&why!=='first'){const pl=prevWin.calls[prevWin.calls.length-1];win.prevA=pl.A;win.prevF=prevWin.id;}win.id=fi+':'+win.calls.length+':'+C.ts;}
   compact=false;
   const nov=(C.ts||'').startsWith('2026-11')?1:0;
   win.calls.push({A,nov,o:C.u[3],th:C.u[4],ts:C.ts,keep:req?req.k:-1,len:req?req.k+req.t.length:-1});
   add({c:'b',out:C.u[3],th:C.u[4]});
   continue;}
  if(t==='user'){const m=o.message||{};if(o.isCompactSummary){compact=true;inc('compactline');}
   const sub=o.isCompactSummary?'compact':(o.isMeta?'meta':'user');
   if(typeof m.content==='string'){add({c:'d',s:sub,ch:m.content.length});continue;}
   for(const x of m.content||[]){
    if(x.type==='tool_result'){const tl=tools[x.tool_use_id];const [ch,img]=resInfo(x.content);
     if(!tl){inc('orphan-result');add({c:'d',s:'orphan-result',ch,img});continue;}
     if(tl.c==='file'||tl.c==='search')add({c:'a',s:tl.c,n:tl.n,w:tl.w,k:tl.k,nk:tl.nk,g2:tl.g,ch,img,err:x.is_error?1:0});
     else add({c:'d',s:'tool:'+tl.n,w:tl.w,ch,img});}
    else if(x.type==='text')add({c:'d',s:sub+'-text',ch:(x.text||'').length});
    else if(x.type==='image')add({c:'d',s:'image',ch:0,img:1});
    else add({c:'d',s:'other:'+x.type,ch:JSON.stringify(x).length});}
   continue;}
  if(t==='attachment'){const rd=o.rendered;if(Array.isArray(rd)&&rd.length){let ch=0;for(const x of rd)ch+=(x.content||'').length;add({c:'d',s:'att:'+(o.attachment||{}).type,ch});}else inc('att-unrendered:'+(o.attachment||{}).type);continue;}
 }
 flush();process.stderr.write('.');}
 out.end();console.log(JSON.stringify(st));})();
