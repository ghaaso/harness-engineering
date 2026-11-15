import sys, json
from collections import Counter
src = open("impact_vs_hops.py", encoding="utf-8").read()
sys.argv = ["x", "C:/Users/User/Documents/projects/EMS_workshop1", "nul_out.json", "split"]
ns = {}
exec(compile(src, "m", "exec"), ns)
queries, bfs, NL, idx, code, slice_of = ns["queries"], ns["bfs"], ns["NL"], ns["idx"], ns["code"], ns["slice_of"]
def rt(f):
    if f.startswith("backend/"): return "backend"
    if f.startswith("technician-app/"): return "mobile"
    if f.startswith("src/"): return "web"
    return "other"
def kind(f):
    if "/tests/" in f or ".test." in f or f.startswith("backend/tests"): return "test"
    return "src"
cat = Counter(); tot = Counter()
for f, truth, _ in queries:
    d = bfs(NL["U"], idx[f], 8)
    for t in truth:
        k = d.get(idx[t])
        band = "hop1" if k == 1 else "hop2" if k == 2 else "hop3+" if k else "unreached"
        same_rt = rt(f) == rt(t)
        same_slice = (slice_of(f) is not None and slice_of(f) == slice_of(t))
        key = (band, "same_runtime" if same_rt else "cross_runtime", "same_slice" if same_slice else "diff_or_noslice", kind(f) + "->" + kind(t))
        cat[key] += 1
        tot[band] += 1
print("pairs", sum(tot.values()), dict(tot))
for band in ("hop1", "hop2", "hop3+", "unreached"):
    print("==", band)
    for (b, a, c, e), v in sorted(cat.items(), key=lambda kv: -kv[1]):
        if b == band and v >= 3: print("  ", a, c, e, v)
# share of pairs by runtime relation
rtc = Counter()
for (b, a, c, e), v in cat.items(): rtc[a] += v
print(rtc)
sl = Counter()
for (b, a, c, e), v in cat.items(): sl[c] += v
print(sl)
