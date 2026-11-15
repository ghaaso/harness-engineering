import sys
src = open("impact_vs_hops.py", encoding="utf-8").read()
cut = src.index("cov = {")
sys.argv = ["x", "C:/Users/User/Documents/projects/EMS_workshop1", "nul", "head"]
ns = {}
exec(compile(src[:cut], "m", "exec"), ns)
queries, S, idx, cnt, hashes, SPLIT, git = ns["queries"], ns["S"], ns["idx"], ns["cnt"], ns["hashes"], ns["SPLIT"], ns["git"]
at_split = set(git("ls-tree", "-r", "--name-only", hashes[SPLIT-1]).splitlines())
n = len(queries); new = [q for q in queries if q[0] not in at_split]; old = [q for q in queries if q[0] in at_split]
def link(q): f, t, _ = q; return any(S[idx[f]][idx[x]] > 0 for x in t)
print("head queries", n, "seed new since split", len(new), "seed existed", len(old))
print("cov all", sum(map(link, queries))/n, "cov new", (sum(map(link,new))/len(new)) if new else None, "cov existed", sum(map(link,old))/len(old))
print("existed seeds with zero train count under HEAD name", sum(1 for q in old if cnt[q[0]]==0))
