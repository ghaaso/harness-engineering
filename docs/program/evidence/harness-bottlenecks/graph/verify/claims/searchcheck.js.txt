// Re-classifies the extracted "searches": is the grep/ls the first command (a repo search) or only a filter after a pipe or a side command?
const fs=require('fs'); const L=fs.readFileSync('../../searches.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const c={total:L.length,shellGrep:0,grepOnlyAfterPipe:0,grepOnPipedTestOrGitOrLog:0,grepWithRecursiveOrPathArg:0,shellLs:0,lsOnlyAfterOtherCmd:0,toolGrepGlob:0,importShape:0,importShapeIsRealImportSearch:0};
const strip=q=>q.replace(/^\s*(cd\s+[^;&]+(&&|;)\s*|[A-Z]+=\S+;?\s*)+/,'');
for(const s of L){ const q=s.q;
  if(s.kind==='Grep'||s.kind==='Glob')c.toolGrepGlob++;
  if(s.kind==='shell-grep'){ c.shellGrep++; const body=strip(q); const first=body.split(/\s*(?:&&|;|\|\|)\s*/).map(x=>x.trim());
    const startsWithGrep=first.some(seg=>/^(grep|rg|git grep)\b/.test(seg));
    if(!startsWithGrep){ c.grepOnlyAfterPipe++; if(/^(\S*pytest|python|git (log|diff|show|status)|docker|cat|sed|head|tail|npm|node|curl|ls|find)/.test(body))c.grepOnPipedTestOrGitOrLog++; }
    if(/\bgrep\s+(-\w*r\w*|--include)|\bgrep\s+[^|]*\s(src|tests?|docs|\.)(\/|\s|$)/.test(q))c.grepWithRecursiveOrPathArg++; }
  if(s.kind==='shell-ls'){ c.shellLs++; if(!/^ls\b/.test(strip(q)))c.lsOnlyAfterOtherCmd++; }
  if(s.shape==='who imports'){ c.importShape++; if(/grep[^|]*(from [\w.]*\S* import|import\s|require\()/.test(q))c.importShapeIsRealImportSearch++; } }
console.log(JSON.stringify(c,null,1));
