"""Agent B, round 3 (the coordinator: peak memory of the change-5 timings, the same figures as agent A's for r4).
Runs one command as a child, waits, and records, before the container is removed (this runs inside it):
  peak_rss_mb    getrusage(RUSAGE_CHILDREN).ru_maxrss: the largest resident set of any ONE waited-for descendant
                 (the process tree's largest process, not a sum), as agent A's r58c/A/time_tune.py;
  cgroup_peak_mb the container's own peak, /sys/fs/cgroup/memory.peak (cgroup v2) or
                 /sys/fs/cgroup/memory/memory.max_usage_in_bytes (v1): every process in the container since it started;
  cap_mb         the container's cap, memory.max (v2) or memory.limit_in_bytes (v1); at_cap when the peak is within 8 MB.
usage (in a ktest-b container): python /w/r58c/B/timing/mem_run.py <label> <command> [args...]
Prints `MEMORY <label> ...` and writes /w/r58c/B/out/timing/mem-<label>.json; exits with the command's exit code.
"""
import json, os, resource, subprocess, sys, time

label, cmd = sys.argv[1], sys.argv[2:]


def first(*paths):
    for p in paths:
        try:
            v = open(p).read().strip()
            return None if v == 'max' else int(v)
        except (OSError, ValueError):
            pass
    return None


t0 = time.monotonic(); rc = subprocess.call(cmd); wall = time.monotonic() - t0
ru = resource.getrusage(resource.RUSAGE_CHILDREN)
cg = first('/sys/fs/cgroup/memory.peak', '/sys/fs/cgroup/memory/memory.max_usage_in_bytes')
cap = first('/sys/fs/cgroup/memory.max', '/sys/fs/cgroup/memory/memory.limit_in_bytes')
mb = lambda b: None if b is None else round(b / 2.0 ** 20, 1)
res = dict(label=label, cmd=cmd, rc=rc, wall_s=round(wall, 1), peak_rss_mb=round(ru.ru_maxrss / 1024.0, 1),
           cgroup_peak_mb=mb(cg), cap_mb=mb(cap), at_cap=None if cg is None or cap is None else cap - cg <= 8 * 2 ** 20)
os.makedirs('/w/r58c/B/out/timing', exist_ok=True)
json.dump(res, open('/w/r58c/B/out/timing/mem-%s.json' % label, 'w'), indent=1)
print('MEMORY %s rc %s wall_s %s peak_rss_mb %s cgroup_peak_mb %s cap_mb %s at_cap %s'
      % (label, rc, res['wall_s'], res['peak_rss_mb'], res['cgroup_peak_mb'], res['cap_mb'], res['at_cap']), flush=True)
sys.exit(rc)
