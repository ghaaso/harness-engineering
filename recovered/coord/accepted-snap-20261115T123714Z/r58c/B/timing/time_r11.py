"""Agent B, round 3: a full-size stand-in timing of the E5 route audit's graph work (step 9.2a, ktest-r11, ruling 97),
for LIMIT_R11. The audit's cost is its graph reads: for every held-out parent kge.read_graph + kge.neighbours, and for
every checkpoint kge.read_graph + one kge.area_triples per area. This reads EVERY graph folder of export/graphs0 (both
splits, a superset of what the audit reads) and does that work on each as a parent AND as a checkpoint, plus one
kge.route per file entity; it reads no held-out part, no stage-B table and nothing under grader-returns/.
Output: r58c/B/out/timing/time-r11.json (wall time, graphs, peak RSS, the cgroup's memory.peak).
usage (in a ktest-b container): python /w/r58c/B/timing/time_r11.py"""
import json, os, resource, sys, time
sys.path.insert(0, '/w/train')
t0 = time.perf_counter()
import kge
t_imp = time.perf_counter() - t0
ds = sorted(d for d in os.listdir(kge.G0) if os.path.isfile(os.path.join(kge.G0, d, 'triples.tsv')))
n_route = 0; t1 = time.perf_counter()
for d in ds:
    ents, tri = kge.read_graph(d); nb = kge.neighbours(tri)
    co = {A: any(x[1] == kge.CO for x in kge.area_triples(tri, ents, A)) for A in kge.AREAS}
    for e, v in ents.items():
        if v[0] == 'file': kge.route(e, ents, nb); n_route += 1
    del ents, tri, nb
wall = time.perf_counter() - t1
peak = None
for f in ('/sys/fs/cgroup/memory.peak', '/sys/fs/cgroup/memory/memory.max_usage_in_bytes'):
    try: peak = int(open(f).read().strip()); break
    except Exception: pass
R = dict(graphs=len(ds), routes=n_route, import_s=round(t_imp, 1), wall_s=round(wall, 1), total_s=round(t_imp + wall, 1),
         peak_rss_mb=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1), cgroup_peak_mb=round(peak / 2 ** 20, 1) if peak else None)
os.makedirs('/w/r58c/B/out/timing', exist_ok=True)
json.dump(R, open('/w/r58c/B/out/timing/time-r11.json', 'w'), indent=1)
print(json.dumps(R), flush=True)
print('RESULT PASS time_r11', flush=True)
