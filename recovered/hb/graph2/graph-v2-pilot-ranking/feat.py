import re,json,os,collections,statistics,math,pickle,random
import numpy as np
CACHE='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache'
lines=open(r'C:\Users\User\AppData\Local\Temp\gl2.txt',encoding='utf-8',errors='replace').read().splitlines()
commits=[];cur=None
for l in lines:
    if l.startswith('@@'):
        h,d,p=l[2:].split('|'); cur={'h':h,'d':d,'p':p.split()[0] if p else None,'f':[]}; commits.append(cur)
    elif l.strip(): cur['f'].append(l.split('\t'))
code=re.compile(r'^(backend|src|technician-app)/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$')
tune=[]
for c in commits:
    if not ('2026-06-01'<=c['d']<'2026-07-01'): continue
    ex=[p[1] for p in c['f'] if p[0][0] in 'MR' and code.match(p[-1])]
    if 2<=len(ex)<=30: tune.append((c,ex))
tune.sort(key=lambda x:x[0]['d'])
DIRECT=['imports','calls','test_calls_route','overrides','uses_constant','tables','calls_url','render','other']
def kgroup(k):
    if k in('reads_table','writes_table','writes_column','foreign_key','migration_touches','has_column','maps_table'): return 'tables'
    if k in('renders','registers_screen','navigates'): return 'render'
    if k in DIRECT: return k
    return 'other'
rows=[] # per seed: dict
for ci,(c,ex) in enumerate(tune):
    d=os.path.join(CACHE,c['p'])
    nodes={}
    for l in open(d+'/nodes.jsonl',encoding='utf-8'):
        n=json.loads(l); nodes[n['id']]=n
    edges=[json.loads(l) for l in open(d+'/edges.jsonl',encoding='utf-8')]
    def key(i):
        n=nodes.get(i)
        if n is None: return None
        return 'F:'+n['path'] if n.get('path') else 'N:'+i
    nb=collections.defaultdict(dict); co=collections.defaultdict(dict)
    for e in edges:
        a=key(e['src']);b=key(e['dst'])
        if a is None or b is None or a==b: continue
        k=e['kind']
        if k=='co_changed':
            at=e.get('attrs') or {}
            v=(e.get('confidence') or 0, at.get('support',1), at.get('recency_weight',0))
            co[a][b]=v;co[b][a]=v;continue
        if k=='contains' and nodes[e['src']]['kind'] in('runtime','slice','invariant_group'): continue
        nb[a].setdefault(b,set()).add(k);nb[b].setdefault(a,set()).add(k)
    keys=list(nb.keys()); idx={k:i for i,k in enumerate(keys)}
    N=len(keys)
    src=[];dst=[]
    for a in nb:
        for b in nb[a]: src.append(idx[a]);dst.append(idx[b])
    src=np.array(src);dst=np.array(dst)
    deg=np.array([len(nb[k]) for k in keys],dtype=float)
    w=1.0/np.maximum(deg[src],1)
    fmeta={}
    for i,n in nodes.items():
        if n.get('path') and n['kind']=='file': fmeta['F:'+n['path']]=n
    exs=set('F:'+p for p in ex)
    for s in ex:
        S='F:'+s
        if S not in idx: 
            continue
        # BFS 2 hops
        dist={S:0};fr=[S]
        for h in (1,2):
            nf=[]
            for u in fr:
                for v in nb[u]:
                    if v not in dist: dist[v]=h;nf.append(v)
            fr=nf
        cands=set(k for k,dd in dist.items() if dd>0 and k.startswith('F:') and code.match(k[2:]))
        cands|=set(k for k in co.get(S,{}) if k.startswith('F:') and code.match(k[2:]))
        cands.discard(S)
        # ppr
        p=np.zeros(N);p[idx[S]]=1.0;e0=p.copy();pr=p.copy()
        for _ in range(25):
            pr=0.15*e0+0.85*np.bincount(dst,weights=pr[src]*w,minlength=N)
        # katz walks (undirected) length<=3
        x=e0.copy();kz=np.zeros(N)
        for L in (1,2,3):
            x=np.bincount(dst,weights=x[src],minlength=N); kz+= (0.1**L)*x
        NS=set(nb[S])
        sm=fmeta.get(S,{})
        for t in cands:
            NT=set(nb.get(t,{}))
            cn=NS&NT
            ra=sum(1.0/max(deg[idx[z]],1) for z in cn)
            aa=sum(1.0/math.log(max(deg[idx[z]],2)) for z in cn)
            jac=len(cn)/max(len(NS|NT),1)
            nN=sum(1 for z in cn if z.startswith('N:'))
            tm=fmeta.get(t,{})
            kinds=nb[S].get(t,set())
            kg=set(kgroup(k) for k in kinds)
            cf=co.get(S,{}).get(t,(0,0,0))
            sd=os.path.dirname(S[2:]);td=os.path.dirname(t[2:])
            r=dict(ci=ci,s=S,t=t,y=int(t in exs),hop=dist.get(t,9),cn=len(cn),ra=ra,aa=aa,jac=jac,nN=nN,
                   ppr=float(pr[idx[t]]) if t in idx else 0.0,katz=float(kz[idx[t]]) if t in idx else 0.0,
                   co_conf=cf[0],co_sup=cf[1],co_rec=cf[2],
                   same_dir=int(sd==td),same_slice=int(bool(sm.get('slice')) and sm.get('slice')==tm.get('slice')),
                   same_rt=int(sm.get('runtime')==tm.get('runtime')),cand_test=int(bool(tm.get('is_test'))),seed_test=int(bool(sm.get('is_test'))),
                   deg_t=float(deg[idx[t]]) if t in idx else 0.0)
            for g in DIRECT: r['k_'+g]=int(g in kg)
            rows.append(r)
    print(ci,c['d'],len(rows),flush=True) if ci%10==0 else None
pickle.dump((rows,[(c['h'],c['d'],ex) for c,ex in tune]),open(r'C:\Users\User\AppData\Local\Temp\pilot_rows.pkl','wb'))
print('done',len(rows))
