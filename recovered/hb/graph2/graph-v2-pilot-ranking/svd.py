import re,json,os,collections,pickle,numpy as np,time
src=open('C:/Users/User/AppData/Local/Temp/pilot/feat.py').read()
head=src.split('rows=[] # per seed')[0]
exec(head)
rows,commits=pickle.load(open('C:/Users/User/AppData/Local/Temp/pilot_rows.pkl','rb'))
byc=collections.defaultdict(list)
for i,r in enumerate(rows): byc[r['ci']].append(i)
RANKS=(8,16,32,64,128)
out={r:np.zeros(len(rows)) for r in RANKS}
t0=time.time()
for ci,(c,ex) in enumerate(tune):
    d=os.path.join(CACHE,c['p'])
    nodes={}
    for l in open(d+'/nodes.jsonl',encoding='utf-8'):
        n=json.loads(l); nodes[n['id']]=n
    nb=collections.defaultdict(set)
    for l in open(d+'/edges.jsonl',encoding='utf-8'):
        e=json.loads(l)
        k=e['kind']
        if k=='co_changed': continue
        a=nodes.get(e['src']);b=nodes.get(e['dst'])
        if a is None or b is None: continue
        if k=='contains' and a.get('kind') in('runtime','slice','invariant_group'): continue
        ka='F:'+a['path'] if a.get('path') else 'N:'+e['src']
        kb='F:'+b['path'] if b.get('path') else 'N:'+e['dst']
        if ka!=kb: nb[ka].add(kb);nb[kb].add(ka)
    keys=list(nb);idx={k:i for i,k in enumerate(keys)};N=len(keys)
    A=np.zeros((N,N))
    for a in nb:
        for b in nb[a]: A[idx[a],idx[b]]=1
    dg=A.sum(1);dg[dg==0]=1
    M=A/np.sqrt(dg)[:,None]/np.sqrt(dg)[None,:]
    w,V=np.linalg.eigh(M)
    order=np.argsort(-np.abs(w))
    for r in RANKS:
        sel=order[:r];Vs=V[:,sel]*w[sel][None,:]
        for i in byc[ci]:
            s=idx.get(rows[i]['s']);t=idx.get(rows[i]['t'])
            if s is None or t is None: continue
            out[r][i]=float(Vs[s]@V[t,sel])
    if ci%10==0: print(ci,N,round(time.time()-t0),flush=True)
pickle.dump(out,open('C:/Users/User/AppData/Local/Temp/pilot_svd.pkl','wb'))
print('done')
