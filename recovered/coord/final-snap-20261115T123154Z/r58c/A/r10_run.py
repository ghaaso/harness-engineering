"""Agent A, round 8: the ktest item that measures END-ORDER step 9.1 (the leak audit) on the full-size stand-in.
Run as a ktest.sh item "script:r58c/A/r10_run.py". First counts the stand-in records' mount sources this container
cannot see (each mapped as the audit maps it: the lane to /w, the build to /build), then runs step 9.1's command
(train/leak_audit.py with the real arguments, except --parts, --mounts, --plan and the two outputs, which point at the
stand-in and at /tmp/r10) under r10_mem.py, which prints the R10MEM line: wall s, peak RSS, the container's peak."""
import glob, json, os, subprocess, sys

L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings'
G = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build'
REC = '/w/r58c/A/out/r10stand/records'
miss, seen = [], 0
for f in sorted(glob.glob(REC + '/*.json')):
    for m in json.load(open(f))[0]['Mounts']:
        s = m['Source']
        loc = '/w' + s[len(L):] if s.startswith(L) else '/build' + s[len(G):] if s.startswith(G) else s
        seen += 1
        if not os.path.exists(loc) and loc not in miss:
            miss.append(loc)
print('R10SRC ' + json.dumps({'record_mounts': seen, 'absent_in_container': miss}), flush=True)
cmd = [sys.executable, '/w/r58c/A/r10_mem.py', sys.executable, 'leak_audit.py', '--repo', '/repo',
       '--facts', '/build/facts/cache', '--heldout-tasks', '/build/tasks/tasks.jsonl',
       '--lane-host', L, '--host-map', G + '=/build',
       '--scripts', '/w/orchestrator/guard-stageB.sh,/w/orchestrator/guard-stageB-r92.sh,/w/train/heldout.sh',
       '--mounts', '/w/orchestrator/kge-B1-inspect-20261114T190928Z.json,' + REC + ',/w/r58c/A/mounts-A.json,/w/r58c/B/mounts-B.json',
       '--self', 'ktest-r10',
       '--parts', 'tune=/w/r58c/B/out/timing/asm/train/stageB/parts,heldout=/w/r58c/A/out/r10stand/heldout_parts',
       '--plan', '/w/r58c/B/out/timing/asm/train/stageB/plan.json',
       '--out-md', '/tmp/r10/AUDIT-leak.md', '--out-json', '/tmp/r10/leak_audit.json']
os.chdir('/w/train')
rc = subprocess.call(cmd)
try:
    print(open('/tmp/r10/AUDIT-leak.md').read()[:1500], flush=True)
except Exception as e:
    print('no AUDIT-leak.md: %s' % e)
print('RESULT r10 measured (audit rc %d; the stand-in verdict is not the real one)' % rc)
sys.exit(0)
