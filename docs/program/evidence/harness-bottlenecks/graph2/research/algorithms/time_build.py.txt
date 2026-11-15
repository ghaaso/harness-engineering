import sys, time
src = open("impact_vs_hops.py", encoding="utf-8").read()
cut = src.index("# ---------------- hop growth")
pre = src[:cut]
for mode in ("head",):
    ts = []
    for _ in range(5):
        sys.argv = ["x", "C:/Users/User/Documents/projects/EMS_workshop1", "nul", mode]
        t = time.perf_counter()
        ns = {}
        exec(compile(pre, "pre", "exec"), ns)
        ts.append(time.perf_counter() - t)
    print(mode, "files", ns["N"], "edges", ns["n_imp"], "seconds per full build (git ls-files + git log + parse all py/js + adjacency):", [round(x, 2) for x in ts])
