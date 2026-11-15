import pickle,json,collections
rows,commits=pickle.load(open('/pilot/pilot_rows.pkl','rb'))
json.dump([[h,d,ex] for h,d,ex in commits],open('/out/eval/git/pilot_commits.json','w'))
with open('/out/eval/git/pilot_rows.tsv','w') as f:
    f.write('ci\ts\tt\ty\thop\tppr\tco_conf\tco_sup\tco_rec\n')
    for r in rows: f.write('\t'.join(str(r[k]) for k in ['ci','s','t','y','hop','ppr','co_conf','co_sup','co_rec'])+'\n')
print(len(commits),len(rows),sum(len(ex) for _,_,ex in commits))
print(commits[14][:2],commits[15][:2])
print(collections.Counter(d for _,d,_ in commits))
