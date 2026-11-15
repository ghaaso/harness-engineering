// Read-only: per-call model latency vs tool time from Claude Code transcripts.
// Usage: node timing.cjs <out.jsonl> <storeDir>...
const fs=require('fs'),path=require('path'),readline=require('readline');
const [outF,...stores]=process.argv.slice(2);
const out=fs.createWriteStream(outF);
function walk(d,acc){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,acc);else if(e.name.endsWith('.jsonl'))acc.push(p);}return acc;}
async function one(f,role,store){
  const rl=readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity});
  let prevNonAsstTs=null, prevKind=null; const calls=new Map(); const order=[];
  let lastAsstId=null;
  for await(const line of rl){
    if(line.startsWith('{"type":"api-request-blob"')||line.startsWith('{"type":"file-history'))continue;
    let o;try{o=JSON.parse(line);}catch{continue;}
    const ts=o.timestamp?Date.parse(o.timestamp):null; if(!ts)continue;
    if(o.type==='assistant'&&o.message&&o.message.id&&o.message.model!=='<synthetic>'){
      const m=o.message,u=m.usage||{};
      let c=calls.get(m.id);
      if(!c){c={id:m.id,model:m.model,reqTs:prevNonAsstTs,reqKind:prevKind,first:ts,last:ts,ctx:0,out:0,nTool:0,toolNames:[],nextTs:null,nextKind:null};calls.set(m.id,c);order.push(c);}
      c.last=Math.max(c.last,ts);
      c.ctx=Math.max(c.ctx,(u.input_tokens||0)+(u.cache_creation_input_tokens||0)+(u.cache_read_input_tokens||0));
      c.out=Math.max(c.out,u.output_tokens||0);
      for(const b of (Array.isArray(m.content)?m.content:[])) if(b.type==='tool_use'){c.nTool++;c.toolNames.push(b.name);}
      lastAsstId=m.id; continue;
    }
    if(o.type==='user'&&o.message){
      const content=o.message.content; let kind='other';
      if(typeof content==='string') kind='human';
      else if(Array.isArray(content)){ if(content.some(b=>b.type==='tool_result')) kind='tool'; else kind='text'; }
      if(o.isCompactSummary) kind='compact';
      if(lastAsstId){const c=calls.get(lastAsstId); if(c&&c.nextTs==null){c.nextTs=ts;c.nextKind=kind;}}
      lastAsstId=null; prevNonAsstTs=ts; prevKind=kind; continue;
    }
    if(o.type==='system'){ prevNonAsstTs=ts; prevKind='system'; }
  }
  for(const c of order){ if(c.ctx===0&&c.out===0)continue;
    out.write(JSON.stringify({store,role,f:path.basename(f),model:c.model,ctx:c.ctx,out:c.out,lat:c.reqTs?(c.last-c.reqTs)/1000:null,reqKind:c.reqKind,tool:c.nextTs?(c.nextTs-c.last)/1000:null,nextKind:c.nextKind,nTool:c.nTool,tools:c.toolNames.slice(0,4)})+'\n');}
}
(async()=>{for(const s of stores){const mains=fs.readdirSync(s).filter(n=>n.endsWith('.jsonl'));
  for(const mf of mains){await one(path.join(s,mf),'main',path.basename(s)); const sd=path.join(s,mf.replace(/\.jsonl$/,''),'subagents');
    if(fs.existsSync(sd)) for(const sf of walk(sd,[])) await one(sf,sf.includes(path.sep+'workflows'+path.sep)?'workflow':'agent',path.basename(s));}
  process.stderr.write('done '+s+'\n');}
  out.end();})();
