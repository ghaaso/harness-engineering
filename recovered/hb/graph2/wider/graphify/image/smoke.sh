#!/bin/sh
# Smoke run inside graphtest-graphify:1, started with --network none.
# Mounts: /src = clean git-archive export (read-only), /out = output folder,
# /audit = our audit probe (read-only), /smoke.sh = this script (read-only).
set -u
G=/out/build/graphify-out/graph.json
step() { echo; echo "=== $1"; }
timed() { # name, command...
  name=$1; shift
  s=$(date +%s.%N)
  "$@" > "/out/calls/$name.stdout" 2> "/out/calls/$name.stderr"
  rc=$?
  e=$(date +%s.%N)
  echo "$name exit=$rc seconds=$(GFY_AUDIT_DIR=/out/audit-helper python3 -c "print(round($e-$s,3))")"
  echo "$name	$rc	$s	$e" >> /out/calls/times.tsv
}
mkdir -p /out/calls /out/build
step "environment"
id; echo "HOME=$HOME"; env | grep '^GRAPHIFY_' | sort
GFY_AUDIT_DIR=/out/audit-helper python3 - <<'EOF'
import socket
try:
    socket.create_connection(("1.1.1.1", 443), timeout=3); print("network: REACHABLE")
except OSError as e:
    print("network: unreachable (%s)" % e)
EOF
graphify --version
step "site-packages: .pth files and install-time hooks"
ls /opt/graphify/lib/python3.11/site-packages/*.pth 2>/dev/null || echo "no .pth files"
step "import every graphify module (import-time side effects go to the audit log)"
GFY_AUDIT_DIR=/out/audit-import python3 - <<'EOF'
import importlib, pkgutil, graphify
ok, failed = 0, []
for m in pkgutil.walk_packages(graphify.__path__, "graphify."):
    try:
        importlib.import_module(m.name); ok += 1
    except Exception as e:
        failed.append((m.name, type(e).__name__, str(e)[:120]))
print("imported", ok, "modules; failed", len(failed))
for f in failed: print("  import failed:", *f)
EOF
step "build: code-only graph"
timed extract graphify extract /src --code-only --out /out/build --max-workers 6
tail -40 /out/calls/extract.stdout; tail -20 /out/calls/extract.stderr
step "graph stats"
GFY_AUDIT_DIR=/out/audit-helper python3 - "$G" <<'EOF'
import json, sys, collections
g = json.load(open(sys.argv[1]))
nodes, links = g["nodes"], g.get("links", g.get("edges", []))
print("directed flag:", g.get("directed"), "multigraph flag:", g.get("multigraph"))
print("nodes:", len(nodes), "edges:", len(links), "hyperedges:", len(g.get("graph", {}).get("hyperedges", []) if isinstance(g.get("graph"), dict) else []))
for key in ("file_type",):
    print(key, dict(collections.Counter(n.get(key) for n in nodes).most_common()))
print("node kinds (node_kind/kind/type):", dict(collections.Counter(n.get("node_kind") or n.get("kind") or n.get("type") for n in nodes).most_common(20)))
print("relations:", dict(collections.Counter(l.get("relation") for l in links).most_common()))
print("confidence:", dict(collections.Counter(l.get("confidence") for l in links).most_common()))
srcs = collections.Counter((n.get("source_file") or "").split("/")[0] for n in nodes)
print("nodes by top folder:", dict(srcs.most_common(12)))
print("nodes with null source_location:", sum(1 for n in nodes if not n.get("source_location")))
print("node keys:", sorted({k for n in nodes for k in n}))
print("edge keys:", sorted({k for l in links for k in l}))
EOF
step "query"
timed query graphify query "app_client fixture in backend tests conftest" --graph "$G"
head -60 /out/calls/query.stdout
step "affected"
timed affected graphify affected "app_client" --graph "$G"
head -60 /out/calls/affected.stdout; cat /out/calls/affected.stderr
step "path"
timed path graphify path "app_client" "create_app" --graph "$G"
head -40 /out/calls/path.stdout; cat /out/calls/path.stderr
step "explain"
timed explain graphify explain "app_client" --graph "$G"
head -60 /out/calls/explain.stdout; cat /out/calls/explain.stderr
step "output folder"
find /out/build -type f -printf '%s\t%p\n' | sort -k2
step "audit summary"
for d in /out/audit /out/audit-import; do echo "--- $d"; cat $d/*.jsonl | GFY_AUDIT_DIR=/out/audit-helper python3 -c "
import sys, json, collections
c = collections.Counter(); ex = {}
for line in sys.stdin:
    r = json.loads(line); k = r['ev'] if r['ev'] != 'import' else 'import ' + r['mod']
    if r['ev'] in ('open-write', 'open-home'): k = r['ev'] + ' ' + '/'.join(r['path'].split('/')[:4])
    c[k] += 1; ex.setdefault(k, r)
for k, n in sorted(c.items()): print(n, k, '| e.g.', json.dumps(ex[k])[:260])
"; done
