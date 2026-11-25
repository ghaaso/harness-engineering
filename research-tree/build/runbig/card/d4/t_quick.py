import time, d4lib as L
for name in ['fixflow','clinic']:
    t=time.time(); r=L.Repo(name); ks=r.block_ids(); b=r.block(ks[0]); print(name,'blocks',len(ks),'N',b.N,'hist',b.hist_n,'pairs',len(b.pI),'tasks',len(b.tasks),'imports',len(b.imports), round(time.time()-t,1),'s')
    S=L.arm_decay(b); print(' pc',L.per_commit(b,S) and sum(v[0] for v in L.per_commit(b,S).values())/len(L.per_commit(b,S)))
