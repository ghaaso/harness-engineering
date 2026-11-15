"""Agent A, round r58c, round 8: measure one child command inside ktest-r10 (END-ORDER step 9.1, the leak audit).
usage: python /w/r58c/A/r10_mem.py <command ...>
Prints one line R10MEM {...}: wall_s, child rc, peak RSS of the child (getrusage RUSAGE_CHILDREN ru_maxrss, KB on
Linux), the cgroup's memory.peak (the container's peak, cgroup v2; memory.max_usage_in_bytes on v1), and a summary of
the audit's JSON output when one is named by --out-json (ok, counts of problems, rows). Writes nothing itself."""
import json, os, resource, subprocess, sys, time

cmd = sys.argv[1:]
t0 = time.time()
rc = subprocess.call(cmd)
wall = time.time() - t0
ru = resource.getrusage(resource.RUSAGE_CHILDREN)


def rd(p):
    try:
        return int(open(p).read().strip())
    except Exception:
        return None


peak = rd('/sys/fs/cgroup/memory.peak')
if peak is None:
    peak = rd('/sys/fs/cgroup/memory/memory.max_usage_in_bytes')
out = {'wall_s': round(wall, 1), 'rc': rc, 'peak_rss_mb': round(ru.ru_maxrss / 1024, 1),
       'cgroup_peak_mb': None if peak is None else round(peak / 1048576, 1),
       'cgroup_max_mb': (lambda v: None if v is None else round(v / 1048576, 1))(rd('/sys/fs/cgroup/memory.max')),
       'user_s': round(ru.ru_utime, 1), 'sys_s': round(ru.ru_stime, 1)}
if '--out-json' in cmd:
    p = cmd[cmd.index('--out-json') + 1]
    try:
        j = json.load(open(p))
        s = {'ok': j.get('ok')}
        for k, v in j.items():
            if isinstance(v, list):
                s[k + '_n'] = len(v)
            elif isinstance(v, dict):
                s[k + '_keys'] = len(v)
                if 'ok' in v:
                    s[k + '_ok'] = v['ok']
        out['audit'] = s
        out['audit_json_bytes'] = os.path.getsize(p)
    except Exception as e:
        out['audit'] = 'unreadable: %s' % e
print('R10MEM ' + json.dumps(out, sort_keys=True), flush=True)
sys.exit(rc)
