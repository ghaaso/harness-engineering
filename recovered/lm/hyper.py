import json, collections, itertools
D="C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache/a31924a3818f4ac94b695906d107c72c912792b2"
cs=[json.loads(l) for l in open(D+'/commits.jsonl',encoding='utf-8')]
used=[c for c in cs if c.get('used')]
print('commits listed',len(cs),'used',len(used))
ks=[c['n_files'] for c in used]
import statistics
print('k distribution used: min',min(ks),'median',statistics.median(ks),'mean',round(sum(ks)/len(ks),1),'max',max(ks))
buckets=[(2,3),(4,7),(8,15),(16,30)]
tot=sum(k*(k-1)//2 for k in ks)
for lo,hi in buckets:
    sel=[k for k in ks if lo<=k<=hi]
    pi=sum(k*(k-1)//2 for k in sel)
    print('k in [%d,%d]: commits %d (%.0f%%), pair incidences %d (%.0f%%)'%(lo,hi,len(sel),100*len(sel)/len(ks),pi,100*pi/tot))
# edges supported only by big commits
ed=[json.loads(l) for l in open(D+'/edges.jsonl',encoding='utf-8')]
co=[e for e in ed if e['kind']=='co_changed']
byid={c['sha'][:12]:c for c in cs}
onlybig=0; allsupp=0
for e in co:
    sup=e['attrs']['commits']
    sizes=[byid[s]['n_files'] for s in sup if s in byid]
    if sizes and min(sizes)>=10: onlybig+=1
print('co_changed edges',len(co),'whose every supporting commit has >=10 files:',onlybig,'(%.0f%%)'%(100*onlybig/len(co)))
sup2=[e for e in co if e['attrs']['support']>=3]
print('support>=3',len(sup2))
# number of distinct files in used commits and share of commits touching >=2 code files
print('commits with k>2 :',sum(1 for k in ks if k>2),'of',len(ks))
