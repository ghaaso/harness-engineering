const {L,j}=require('./p.js');const T=j(L+'/train/report/tune.json');
const word=c=>{ if(c.lo>0&&c.diff>=0.02) return 'adds'; if(c.lo>=-0.02&&c.hi<=0.02) return 'matches'; return c.hi<0?'cannot tell (lower)':'cannot tell'; };
const C=T.contrasts.late50, V=T.verdicts.late50; let n=0,bad=0;
const map={primary:['pool','fused'],fused_pool:['pool','fused'],alone_pool:['pool','alone'],fused_unrestricted:['unrestricted','fused'],alone_unrestricted:['unrestricted','alone']};
for(const a of Object.keys(V)) for(const k of Object.keys(map)){const [sc,v]=map[k];const c=C[sc][a+'_'+v].vs_RRF['P@10'];const w=word(c);n++;
  const also=C[sc][a+'_'+v].verdict_P10;
  const ok=w===V[a][k]&&also===V[a][k]; if(!ok)bad++;
  console.log(a,k,c.diff.toFixed(4),'['+c.lo.toFixed(4)+','+c.hi.toFixed(4)+']','derived:',w,'stored:',V[a][k],'verdict_P10:',also,ok?'':'<<MISMATCH');}
// nearest-to-boundary margins
let m=1e9,where='';for(const sc of ['pool','unrestricted'])for(const lab of Object.keys(C[sc])){const c=C[sc][lab].vs_RRF['P@10'];for(const [x,t] of [[c.lo,-0.02],[c.hi,0.02],[c.hi,0],[c.lo,0]]){const d=Math.abs(x-t);if(d<m){m=d;where=sc+' '+lab+' '+x+' vs '+t;}}}
console.log('derived',n,'mismatch',bad,'closest to a boundary:',m.toExponential(2),where);
// the RESULT claim: fused pool diffs range and intervals inside +-0.02
let lo=1,hi=-1,ext=0;for(const a of ['E1','E2','E3','E4','E5']){const c=C.pool[a+'_fused'].vs_RRF['P@10'];lo=Math.min(lo,c.diff);hi=Math.max(hi,c.diff);ext=Math.max(ext,Math.abs(c.lo),Math.abs(c.hi));}
console.log('fused pool diff range',lo,hi,'max |bound|',ext);
