// classification of tool calls into read/search categories
const SKIP=new Set(['cd','pushd','popd','export','set','source','.',':','true','unset','local','declare','shopt','setopt','trap','ulimit','umask','time','command','builtin','exec','nohup','env']);
const READ_FILE=new Set(['cat','head','tail','get-content','gc','type','nl','less','more','bat']);
const SEARCH=new Set(['grep','egrep','fgrep','rg','find','ls','wc','awk','jq','tree','select-string','sls','get-childitem','gci','dir','stat','file','du','fd']);
const GIT_READ=new Set(['diff','show','log','status','grep','blame']);
function isWrite(seg){seg=seg.split('2>&1').join('').split('2>/dev/null').join('').split('2> /dev/null').join('');return seg.includes('<<')||/(^|[ ])>>?[ ]*[^ &]/.test(seg);}
function tokenize(s){const out=[];const re=/"([^"]*)"|'([^']*)'|(\S+)/g;let m;while((m=re.exec(s)))out.push(m[1]!==undefined?m[1]:m[2]!==undefined?m[2]:m[3]);return out;}
function firstReal(cmd){
  const segs=String(cmd||'').split(/&&|\|\||;|\r?\n|\|/);let cdir='';
  for(let s of segs){s=s.trim();if(!s||s.startsWith('#'))continue;
    s=s.replace(/^[({]\s*/,'');
    let t=tokenize(s);
    while(t.length&&/^[A-Za-z_][A-Za-z0-9_]*=/.test(t[0]))t.shift();
    if(!t.length)continue;
    let w=t[0].split(/[\/]/).pop().toLowerCase().replace(/\.exe$/,'');
    if(SKIP.has(w)){if((w==='cd'||w==='pushd')&&t[1])cdir=t[1];continue;}
    if(w==='sudo'){t.shift();if(!t.length)continue;w=t[0].toLowerCase();}
    return {w,t:t.slice(1),seg:s,cdir};}
  return null;}
// returns {cls:'file'|'search'|'other', key, rng}
function classifyTool(name,input){input=input||{};
  if(name==='Read')return {cls:'file',key:input.file_path||input.path||'',rng:(input.offset||'')+':'+(input.limit||'')+':'+(input.pages||'')};
  if(name==='Grep'||name==='Glob')return {cls:'search'};
  if(name==='Bash'||name==='PowerShell'){
    const f=firstReal(input.command);if(!f)return {cls:'other',w:''};
    const w=f.w;
    if(READ_FILE.has(w)&&isWrite(f.seg))return {cls:'other',w:w+'-write'};
    if(READ_FILE.has(w)){const args=f.t.filter(a=>!a.startsWith('-')&&!/^\d+$/.test(a)&&!/^[<>]/.test(a));
      return {cls:'file',key:join(f.cdir,args[0]||''),rng:w+' '+f.t.filter(a=>a.startsWith('-')||/^\d+$/.test(a)).join(' '),w};}
    if(w==='sed'){if(f.t.includes('-n')||f.t.some(a=>/^-[a-zA-Z]*n/.test(a))){
      const args=f.t.filter(a=>!a.startsWith('-'));// first is script
      return {cls:'file',key:join(f.cdir,args[1]||''),rng:'sed '+(args[0]||''),w};}
      return {cls:'other',w};}
    if(SEARCH.has(w))return {cls:'search',w};
    if(w==='git'){let t=f.t.slice();while(t.length&&t[0].startsWith('-')){const x=t.shift();if(x==='-C'||x==='-c')t.shift();}
      if(t.length&&GIT_READ.has(t[0]))return {cls:'search',w:'git '+t[0]};return {cls:'other',w:'git '+(t[0]||'')};}
    return {cls:'other',w};}
  return {cls:'other',w:''};}
function join(d,p){if(!d||!p)return p;const B=String.fromCharCode(92);if(/^[a-zA-Z]:/.test(p)||p[0]==='/'||p[0]==='~'||p[0]===B)return p;while(d.endsWith('/')||d.endsWith(B))d=d.slice(0,-1);return d+'/'+p;}
function normKey(k){if(!k)return '';k=String(k).split(String.fromCharCode(92)).join('/').toLowerCase().trim();
  k=k.replace(/^\/([a-z])\//,'$1:/');
  return k;}
function repoRel(k){k=normKey(k);const i=k.indexOf('24_clinic_workshop/');if(i<0)return k;k=k.slice(i+19);k=k.replace(/^\.claude\/worktrees\/[^/]+\//,'');return k;}
module.exports={classifyTool,firstReal,normKey,repoRel};
