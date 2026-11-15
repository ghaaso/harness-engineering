#!/bin/sh
# Plain timing and repeatability check (no audit probe). Network is off.
set -u
for run in 1 2; do
  rm -rf /out/t$run
  s=$(date +%s.%N)
  graphify extract /src --code-only --out /out/t$run --max-workers 6 > /out/t$run.log 2>&1
  rc=$?
  e=$(date +%s.%N)
  python3 -c "print('run $run exit=$rc seconds=%.1f' % ($e - $s))"
  grep "wrote .*graph.json" /out/t$run.log
done
# warm-cache rerun into t1 (incremental path)
s=$(date +%s.%N)
graphify extract /src --code-only --out /out/t1 --max-workers 6 > /out/t1-warm.log 2>&1
e=$(date +%s.%N)
python3 -c "print('warm rerun exit=$? seconds=%.1f' % ($e - $s))"
tail -3 /out/t1-warm.log
python3 - <<'EOF'
import json, hashlib
def canon(p):
    g = json.load(open(p))
    nodes = sorted(n["id"] for n in g["nodes"])
    edges = sorted((l["source"], l["target"], l.get("relation"), l.get("confidence")) for l in g["links"])
    comm = sorted((n["id"], n.get("community")) for n in g["nodes"])
    return nodes, edges, comm
a, b = canon("/out/t1/graphify-out/graph.json"), canon("/out/t2/graphify-out/graph.json")
print("same node ids:", a[0] == b[0], "| same edges:", a[1] == b[1], "| same communities:", a[2] == b[2])
for p in ("/out/t1/graphify-out/graph.json", "/out/t2/graphify-out/graph.json"):
    print(p, hashlib.sha256(open(p, "rb").read()).hexdigest()[:16])
EOF
