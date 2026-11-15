import json,sys
d=json.load(open(sys.argv[1]))
m=d["meta"]; print({k:m[k] for k in m if k!="top_in_degree"})
print("COV",{k:(round(v,3) if isinstance(v,float) else v) for k,v in d["coverage"].items()})
print("TRUTH hop share",{k:round(v,3) for k,v in d["truth_hop_distance_share"].items()})
for n,rows in d["hop_growth"].items():
    print("GROWTH",n,[(r["k"],round(r["mean"],1),r["median"],round(r["p90"]),round(r["share_of_repo_mean"],3)) for r in rows])
R=d["results"]
for n in ("import_undirected","import_dependents_only","import_dependencies_only"):
    print(n)
    for r in R[n]: print("  k",r["k"],"size",round(r["mean_set_size"],1),"nonempty",round(r["share_nonempty"],2),"P",None if r["precision_when_nonempty"] is None else round(r["precision_when_nonempty"],3),"R",round(r["recall"],3),"hit",round(r["hit_rate_any"],3))
for n in R:
    if n.startswith("import_"): continue
    v=R[n]
    if "@5" in v: print(n," | ".join(f"{k}: P{x['precision']:.3f} R{x['recall']:.3f} hit{x['hit_rate_any']:.2f}" for k,x in v.items() if k.startswith("@")) + (" CI@10 P "+str([round(z,3) for z in v["@10"]["precision_ci95"]]) if "precision_ci95" in v["@10"] else ""))
    else: print(n,{a:round(b,3) if b is not None else None for a,b in v.items()})
