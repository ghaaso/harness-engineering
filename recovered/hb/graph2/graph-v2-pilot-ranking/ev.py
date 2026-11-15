import pickle,numpy as np,collections,math,random,sys
rows,commits=pickle.load(open(r'C:\Users\User\AppData\Local\Temp\pilot_rows.pkl','rb'))
nC=len(commits)
# seeds per commit
seeds=[]  # (ci, S, truthset)
for ci,(h,d,ex) in enumerate(commits):
    exs=['F:'+p for p in ex]
    for s in exs: seeds.append((ci,s,set(exs)-{s}))
print('commits',nC,'seeds',len(seeds),'rows',len(rows))
byseed=collections.defaultdict(list)
for i,r in enumerate(rows): byseed[(r['ci'],r['s'])].append(i)
print('seeds with no candidates',sum(1 for ci,s,t in seeds if (ci,s) not in byseed))
# features
NUM=['cn','ra','aa','jac','nN','ppr','katz','co_conf','co_sup','co_rec','deg_t']
BIN=['same_dir','same_slice','same_rt','cand_test','seed_test']+['k_'+g for g in ['imports','calls','test_calls_route','overrides','uses_constant','tables','calls_url','render','other']]
def build(cols_num,cols_bin,hopind=True):
    X=[]
    for r in rows:
        v=[r[c] for c in cols_num]+[r[c] for c in cols_bin]
        if hopind: v+= [int(r['hop']==1),int(r['hop']==2)]
        X.append(v)
    return np.array(X,float)
rng=np.random.default_rng(1)
jit=rng.random(len(rows))*1e-9
y=np.array([r['y'] for r in rows])
ci_arr=np.array([r['ci'] for r in rows])
def evaluate(score,commits_subset,K=10):
    """score: array per row. returns per-commit mean P@K, R@K, any-hit@K"""
    sc=score+jit
    per=collections.defaultdict(list)
    for ci,s,truth in seeds:
        if ci not in commits_subset: continue
        idxs=byseed.get((ci,s))
        if not idxs: per[ci].append((0,0,0));continue
        a=np.array(idxs); order=a[np.argsort(-sc[a])][:K]
        hits=int(y[order].sum())
        per[ci].append((hits/K,hits/len(truth),1 if hits>0 else 0))
    cs=sorted(per)
    arr=np.array([np.mean(per[c],axis=0) for c in cs])
    return cs,arr
def boot(arr,B=2000,seed=0):
    r=np.random.default_rng(seed);n=len(arr)
    m=[arr[r.integers(0,n,n)].mean(axis=0) for _ in range(B)]
    m=np.array(m);return np.percentile(m,[2.5,97.5],axis=0)
allc=set(range(nC)); late=set(range(15,nC))
def report(name,score,subset=allc,K=10):
    cs,arr=evaluate(score,subset,K);ci=boot(arr)
    print(f'{name:34s} P@{K} {arr[:,0].mean():.3f} [{ci[0,0]:.3f},{ci[1,0]:.3f}]  R@{K} {arr[:,1].mean():.3f} [{ci[0,1]:.3f},{ci[1,1]:.3f}]  any {arr[:,2].mean():.2f}')
    return arr
col=lambda k: np.array([r[k] for r in rows],float)
print('--- unsupervised single heuristics, 65 tuning commits, candidate pool = <=2 structural hops U co-change neighbours')
print('candidate pool recall ceiling: truth pairs in pool / all truth pairs', y.sum()/sum(len(t) for _,_,t in seeds))
res={}
res['random']=report('random in pool',np.zeros(len(rows)))
res['hop']=report('hop distance (closer better)',-col('hop'))
for k in ['cn','ra','aa','jac','katz','ppr','co_conf','co_sup','co_rec','same_dir','deg_t']:
    res[k]=report(k,col(k))
res['negdeg']=report('low degree first',-col('deg_t'))
# rank fusion ppr + co
def rank_in_seed(score):
    rk=np.zeros(len(rows))
    sc=score+jit
    for key,idxs in byseed.items():
        a=np.array(idxs);o=a[np.argsort(-sc[a])]
        rk[o]=np.arange(1,len(a)+1)
    return rk
rp=rank_in_seed(col('ppr'));rc=rank_in_seed(col('co_conf')+1e-6*col('ppr')*0)
has=col('co_conf')>0
rrf=1/(60+rp)+np.where(has,1/(60+rc),0)
res['rrf']=report('RRF(ppr, co_conf if present)',rrf)
# v1-like: ppr + co weight
res['ppr+co']=report('ppr*? + 0.05*co_conf (ppr scaled)',col('ppr')/ (col('ppr').max())+0.5*col('co_conf'))
pickle.dump(None,open(r'C:\Users\User\AppData\Local\Temp\dummy','wb'))

print('\n=== supervised, rolling origin: train on all commits before t (min 15), test on commit t; test commits',len(late))
def fit_ridge(X,yv,lam,iters=25):
    n,d=X.shape;Xb=np.hstack([np.ones((n,1)),X]);b=np.zeros(d+1)
    P=np.eye(d+1)*lam;P[0,0]=0
    for _ in range(iters):
        z=np.clip(Xb@b,-30,30);p=1/(1+np.exp(-z))
        g=Xb.T@(p-yv)+P@b
        Wt=p*(1-p)
        H=(Xb*Wt[:,None]).T@Xb+P+1e-6*np.eye(d+1)
        step=np.linalg.solve(H,g);b-=step
        if np.abs(step).max()<1e-6:break
    return b
def prep(cols_num,cols_bin,hopind):
    Xn=np.array([[r[c] for c in cols_num] for r in rows],float).reshape(len(rows),-1)
    Xb_=np.array([[r[c] for c in cols_bin] for r in rows],float).reshape(len(rows),-1)
    hop=np.array([[int(r['hop']==1),int(r['hop']==2)] for r in rows],float) if hopind else np.zeros((len(rows),0))
    return Xn,Xb_,hop
def rolling(name,cols_num,cols_bin,hopind,lam,verbose=True):
    Xn,Xb_,hop=prep(cols_num,cols_bin,hopind)
    score=np.zeros(len(rows))
    for t in sorted(late):
        tr=ci_arr<t; te=ci_arr==t
        if Xn.shape[1]:
            m=np.array([Xn[tr][:,j][Xn[tr][:,j]>0].mean() if (Xn[tr][:,j]>0).any() else 1.0 for j in range(Xn.shape[1])])
            Z=np.log1p(Xn/m)
        else: Z=Xn
        Zall=np.hstack([Z,Xb_,hop])
        mu=Zall[tr].mean(0);sd=Zall[tr].std(0)+1e-9
        Zs=(Zall-mu)/sd
        b=fit_ridge(Zs[tr],y[tr],lam)
        score[te]=b[0]+Zs[te]@b[1:]
    return score
sets={
 'A scalar graph+hist':(['cn','ra','aa','jac','nN','ppr','katz','co_conf','co_sup','co_rec','deg_t'],['same_dir','same_slice','same_rt','cand_test','seed_test'],True),
 'B A + direct-kind flags':(NUM,BIN,True),
 'C floor: dir/slice/rt/test only':([ 'deg_t'],['same_dir','same_slice','same_rt','cand_test','seed_test'],False),
 'D A without history':(['cn','ra','aa','jac','nN','ppr','katz','deg_t'],['same_dir','same_slice','same_rt','cand_test','seed_test'],True),
 'E tiny: ppr + co_conf':(['ppr','co_conf'],[],False),
 'F tiny+: ppr,katz,co_conf,co_sup,hop':(['ppr','katz','co_conf','co_sup'],[],True),
}
print('heuristic reference on same late commits:')
report('  ppr alone',col('ppr'),late);report('  co_conf alone',col('co_conf'),late);report('  RRF(ppr,co)',rrf,late);report('  random in pool',np.zeros(len(rows)),late)
store={}
for nm,(cn_,cb_,hi) in sets.items():
    for lam in (0.3,3,30,300):
        sc=rolling(nm,cn_,cb_,hi,lam)
        store[(nm,lam)]=sc
        report(f'{nm[:26]:26s} lam={lam}',sc,late)
pickle.dump(store,open(r'C:\Users\User\AppData\Local\Temp\pilot_store.pkl','wb'))

print('\n=== paired differences over the 50 late commits (bootstrap over commits, 95% CI)')
def paired(nameA,sa,nameB,sb,K=10,subset=late):
    cs,a=evaluate(sa,subset,K);_,b=evaluate(sb,subset,K)
    d=a-b;ci=boot(d,seed=3)
    print(f'{nameA} minus {nameB}: P@{K} {d[:,0].mean():+.3f} [{ci[0,0]:+.3f},{ci[1,0]:+.3f}]  R@{K} {d[:,1].mean():+.3f} [{ci[0,1]:+.3f},{ci[1,1]:+.3f}]')
E=store[('E tiny: ppr + co_conf',3)];A=store[('A scalar graph+hist',3)];B=store[('B A + direct-kind flags',3)];C=store[('C floor: dir/slice/rt/test only',3)];D=store[('D A without history',3)]
paired('RRF',rrf,'ppr alone',col('ppr'))
paired('RRF',rrf,'co_conf alone',col('co_conf'))
paired('E(ppr+co logistic)',E,'RRF',rrf)
paired('A(scalar logistic)',A,'E',E)
paired('B(+kind flags)',B,'E',E)
paired('A',A,'D (no history)',D)
paired('A',A,'C (floor)',C)
paired('ppr',col('ppr'),'hop',-col('hop'))
paired('katz',col('katz'),'ppr',col('ppr'))
paired('ra',col('ra'),'cn',col('cn'))
for K in (5,20):
    print('K=',K)
    report('  RRF',rrf,late,K);report('  A',A,late,K);report('  ppr',col('ppr'),late,K);report('  random',np.zeros(len(rows)),late,K)
# oracle within pool
orc=y.astype(float); report('ORACLE in pool',orc,late)
# per-seed stratification: seeds with any co-change candidate vs none
hasco={}
for (ci,s),idxs in byseed.items(): hasco[(ci,s)]=any(rows[i]['co_conf']>0 for i in idxs)
import collections
for lab,cond in (('seeds WITH co-change history',True),('seeds WITHOUT',False)):
    sub=[(ci,s,t) for ci,s,t in seeds if ci in late and hasco.get((ci,s),False)==cond]
    for nm,sc in (('ppr',col('ppr')),('RRF',rrf),('A',A),('random',np.zeros(len(rows)))):
        sc2=sc+jit;ps=[];rs=[]
        for ci,s,t in sub:
            idxs=byseed[(ci,s)];a=np.array(idxs);o=a[np.argsort(-sc2[a])][:10];h=int(y[o].sum());ps.append(h/10);rs.append(h/len(t))
        print(f'  {lab:30s} n={len(sub):3d} {nm:7s} P@10 {np.mean(ps):.3f} R@10 {np.mean(rs):.3f}')
# coefficient table for model B fit on all data (descriptive)
Xn,Xb_,hop=prep(NUM,BIN,True)
m=np.array([Xn[:,j][Xn[:,j]>0].mean() if (Xn[:,j]>0).any() else 1.0 for j in range(Xn.shape[1])])
Z=np.hstack([np.log1p(Xn/m),Xb_,hop]);mu=Z.mean(0);sd=Z.std(0)+1e-9;Zs=(Z-mu)/sd
b=fit_ridge(Zs,y,3.0)
names=NUM+BIN+['hop1','hop2']
print('\nfull-fit standardized coefficients (descriptive, in-sample):')
for n,c in sorted(zip(names,b[1:]),key=lambda x:-abs(x[1])): print(f'  {n:22s} {c:+.3f}')
# feature correlation between ppr/katz/ra
import itertools
M=np.array([np.log1p(col(k)/(col(k)[col(k)>0].mean() if (col(k)>0).any() else 1)) for k in ['cn','ra','aa','jac','ppr','katz','co_conf','deg_t']])
print('spearman-ish (pearson of log1p) corr cn,ra,aa,jac,ppr,katz,co,deg:');print(np.round(np.corrcoef(M),2))

print('\n=== latent (low-rank spectral) similarity, unsupervised, 65 commits and 50 late commits')
svd=pickle.load(open('C:/Users/User/AppData/Local/Temp/pilot_svd.pkl','rb'))
for r in (8,16,32,64,128):
    report(f'low-rank M_r rank={r} (65)',svd[r])
for r in (16,64,128):
    report(f'low-rank rank={r} (late 50)',svd[r],late)
report('ppr (late 50)',col('ppr'),late)
paired('svd64',svd[64],'ppr',col('ppr'))
paired('svd128',svd[128],'ppr',col('ppr'))
# adding svd as a feature to the scalar logistic? fuse by RRF
rs=rank_in_seed(svd[64])
rrf3=1/(60+rp)+np.where(has,1/(60+rc),0)+1/(60+rs)
report('RRF(ppr,co,svd64) late',rrf3,late)
paired('RRF3',rrf3,'RRF2',rrf)
