"""Counts of one graphify graph.json (nodes, edges, relation kinds, file types, source files).
Usage: python graph_stats.py <graph.json> [<export root>]   -> JSON on stdout. Reads only."""
import collections
import hashlib
import json
import os
import sys

p = sys.argv[1]
raw = open(p, "rb").read()
g = json.loads(raw)
nodes = g["nodes"]
links = g.get("links", g.get("edges", []))
src_files = sorted({n.get("source_file") for n in nodes if n.get("source_file")})
out = {
    "graph_sha256": hashlib.sha256(raw).hexdigest(),
    "graph_bytes": len(raw),
    "nodes": len(nodes),
    "edges": len(links),
    "hyperedges": len(g.get("hyperedges") or []),
    "relations": dict(collections.Counter(l.get("relation") for l in links).most_common()),
    "confidence": dict(collections.Counter(l.get("confidence") for l in links).most_common()),
    "file_types": dict(collections.Counter(n.get("file_type") for n in nodes).most_common()),
    "edge_origin": dict(collections.Counter(l.get("_origin") for l in links).most_common()),
    "source_files": len(src_files),
    "nodes_without_location": sum(1 for n in nodes if not n.get("source_location")),
}
if len(sys.argv) > 2:
    root = sys.argv[2]
    n = 0
    for _d, _s, files in os.walk(root):
        n += len(files)
    out["export_files"] = n
print(json.dumps(out))
