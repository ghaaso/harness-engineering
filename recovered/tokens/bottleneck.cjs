const fs=require('fs');const V=JSON.parse(fs.readFileSync('out/verify-raw.json'));const A={fixflow:JSON.parse(fs.readFileSync('out/fixflow.agg.json')),clinic:JSON.parse(fs.readFileSync('out/clinic.agg.json'))};
const P=JSON.parse(fs.readFileSync('pricing.json'));
const out={};let pooled={};
for(const g of ['fixflow','clinic']){const f=V.fill[g],T=A[g].total,ctx=T.ctx;
 const b={prefix_first_window:f.shares.window_start_prefix*ctx,prefix_after_compaction:f.shares.window_start_after_compaction*ctx,own_output_carried:f.shares.own_output*ctx,fetched_content:f.shares.fetched_content*ctx,shell_unclassified:f.shares.shell_other_unclassified*ctx,messages_in:f.shares.messages_in*ctx,rest:f.shares.rest*ctx};
 const own={};for(const [k,v] of Object.entries(f.ownOutputSplit))own[k]=v*ctx;
 // cost by token type with 1h/5m split, per role
 const cost={cache_write_1h:0,cache_write_5m:0,cache_read:0,output:0,input:0};const byRole={};
 for(const [m,v] of Object.entries(A[g].byModel)){}
 const rl=fs.readFileSync(`out/${g}.calls.jsonl`,'utf8').split('\n').filter(Boolean);
 for(const l of rl){const c=JSON.parse(l);const p=P[c.model]||P['claude-fable-5-1'];const r=byRole[c.role]||(byRole[c.role]={cw:0,cr:0,out:0,calls:0,ctx:0,usd:0});
  const cw1=c.cc1h||0,cw5=(c.cc5m||0)+((c.cc1h||c.cc5m)?0:c.cc);cost.cache_write_1h+=cw1*p.cache_write_1h/1e6;cost.cache_write_5m+=cw5*p.cache_write_5m/1e6;cost.cache_read+=c.cr*p.cache_read/1e6;cost.output+=c.out*p.output/1e6;cost.input+=c.in*p.input/1e6;
  const u=(c.in*p.input+cw1*p.cache_write_1h+cw5*p.cache_write_5m+c.cr*p.cache_read+c.out*p.output)/1e6;r.usd+=u;r.cw+=(cw1*p.cache_write_1h+cw5*p.cache_write_5m)/1e6;r.cr+=c.cr*p.cache_read/1e6;r.out+=c.out*p.output/1e6;r.calls++;r.ctx+=c.in+c.cc+c.cr;}
 out[g]={ctx,usd:T.usd,buckets:b,own,cost,byRole,byGroupFill:f.byGroup};
 for(const [k,v] of Object.entries(b))pooled[k]=(pooled[k]||0)+v;}
const tot=out.fixflow.ctx+out.clinic.ctx;
const pct=(x,y)=>(100*x/y).toFixed(1)+'%';const B=x=>(x/1e9).toFixed(2)+'B';
console.log('CONTEXT TOKENS PROCESSED, by what the window held (fill method), pooled '+B(tot));
for(const [k,v] of Object.entries(pooled).sort((a,b)=>b[1]-a[1]))console.log(' ',k.padEnd(26),B(v).padStart(7),pct(v,tot).padStart(6),' fixflow',pct(out.fixflow.buckets[k],out.fixflow.ctx).padStart(6),' clinic',pct(out.clinic.buckets[k],out.clinic.ctx).padStart(6));
for(const g of ['fixflow','clinic']){console.log('\n'+g+' own-output split (share of ctx):',Object.entries(out[g].own).map(([k,v])=>k+' '+pct(v,out[g].ctx)).join(', '));
 console.log(g+' cost by type: ',Object.entries(out[g].cost).map(([k,v])=>k+' $'+v.toFixed(0)+' ('+pct(v,out[g].usd)+')').join(', '));
 console.log(g+' cost by role:');for(const [r,v] of Object.entries(out[g].byRole))console.log('   ',r.padEnd(9),'$'+v.usd.toFixed(0).padStart(5),pct(v.usd,out[g].usd).padStart(6),'calls',v.calls,'avgctx',Math.round(v.ctx/v.calls/1000)+'k','$/call',(v.usd/v.calls).toFixed(3),' write',pct(v.cw,v.usd),'read',pct(v.cr,v.usd),'out',pct(v.out,v.usd));
 console.log(g+' fill by group:');for(const r of out[g].byGroupFill)if(r.group!=='all')console.log('   ',r.group.padEnd(10),B(r.contextTokens),'start',pct(r.start,1),'own',pct(r.own,1),'fetched',pct(r.fetched,1));}
fs.writeFileSync('out/bottleneck.json',JSON.stringify({pooledBuckets:pooled,totalCtx:tot,perRepo:out},null,1));
