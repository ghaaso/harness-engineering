import json,sys,collections
d=sys.argv[1]
nk=collections.Counter(); ek=collections.Counter(); conf=collections.defaultdict(collections.Counter)
ids=set()
for l in open(d+'/nodes.jsonl',encoding='utf-8'):
    n=json.loads(l); nk[n['kind']]+=1; ids.add(n['id'])
for l in open(d+'/edges.jsonl',encoding='utf-8'):
    e=json.loads(l); ek[e['kind']]+=1; conf[e['kind']][round(e.get('confidence',1),2) if e.get('confidence') is not None else None]+=1
print('nodes',sum(nk.values()),dict(nk.most_common()))
print('edges',sum(ek.values()),dict(ek.most_common()))
for k in ['cites','mentions','constrains','co_changed','calls']:
    c=conf[k]; print(k,'conf values',dict(c.most_common(6)))
cs=[json.loads(l) for l in open(d+'/commits.jsonl',encoding='utf-8')]
import statistics
nf=[c['n_files'] for c in cs]
print('commits',len(cs),'n_files median',statistics.median(nf),'p90',sorted(nf)[int(.9*len(nf))],'max',max(nf))
used=[c for c in cs if c.get('used')]
print('used',len(used),'sum k(k-1)/2 for used',sum(c['n_files']*(c['n_files']-1)//2 for c in used))
