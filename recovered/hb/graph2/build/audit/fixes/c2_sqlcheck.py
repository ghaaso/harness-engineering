"""Check 2b: every SQL-text table edge (reads_table / writes_table with attrs.via == "sql",
migration_touches with attrs.op == "sql") must have its evidence line inside a string literal that
is NOT a docstring, and the literal text on that line must name the table after a SQL keyword.
Independent of py_extract.py: uses the stdlib ast only.
usage: python -I c2_sqlcheck.py <facts_dir> <export_dir> <out.json>
"""
import ast, json, re, sys, os

facts, exp, out = sys.argv[1], sys.argv[2], sys.argv[3]
nodes = {}
with open(os.path.join(facts, "nodes.jsonl"), encoding="utf-8") as f:
    for ln in f:
        n = json.loads(ln)
        nodes[n["id"]] = n
edges = []
with open(os.path.join(facts, "edges.jsonl"), encoding="utf-8") as f:
    for ln in f:
        e = json.loads(ln)
        a = e.get("attrs") or {}
        if (e["kind"] in ("reads_table", "writes_table") and a.get("via") == "sql") or (e["kind"] == "migration_touches" and a.get("op") == "sql"):
            edges.append(e)

cache = {}
def info(p):
    if p in cache:
        return cache[p]
    src = open(os.path.join(exp, p), encoding="utf-8").read()
    tree = ast.parse(src)
    doc, strs = [], []
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            b = node.body
            if b and isinstance(b[0], ast.Expr) and isinstance(b[0].value, ast.Constant) and isinstance(b[0].value.value, str):
                doc.append((b[0].value.lineno, b[0].value.end_lineno))
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            strs.append((node.lineno, node.end_lineno))
        if isinstance(node, ast.JoinedStr):
            strs.append((node.lineno, node.end_lineno))
    cache[p] = (src.split("\n"), doc, strs)
    return cache[p]

KW = r"(from|join|into|update|delete\s+from|truncate(?:\s+table)?|alter\s+table|insert\s+into)"
res = {"edges": len(edges), "in_docstring": [], "not_in_string": [], "table_not_on_line": [], "ok": 0, "by_kind": {}}
for e in edges:
    p, ln = e["evidence_path"], e["evidence_line"]
    lines, doc, strs = info(p)
    tbl = (nodes.get(e["dst"]) or {}).get("name") or e["dst"].split(":")[-1]
    tag = "%s %s -> %s @ %s:%s" % (e["kind"], e["src"], e["dst"], p, ln)
    k = e["kind"]
    res["by_kind"].setdefault(k, 0)
    res["by_kind"][k] += 1
    if any(a <= ln <= b for a, b in doc):
        res["in_docstring"].append(tag); continue
    if not any(a <= ln <= b for a, b in strs if (a, b) not in doc):
        res["not_in_string"].append(tag); continue
    if not re.search(KW + r"\s+(only\s+)?(\w+\.)?" + re.escape(tbl) + r"\b", lines[ln - 1], re.I):
        res["table_not_on_line"].append(tag + "  | " + lines[ln - 1].strip()[:140]); continue
    res["ok"] += 1
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in res.items()}))
