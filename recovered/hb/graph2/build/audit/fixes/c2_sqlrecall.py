"""Check 2c: SQL recall probe. For every call to text()/execute()/exec_driver_sql() in backend
Python files, collect the string literals inside its arguments (and names bound to module- or
function-level literals), find "<keyword> <table>" for every known table, and check that the facts
hold a reads_table / writes_table / migration_touches edge from that file to that table.
usage: python -I c2_sqlrecall.py <facts_dir> <export_dir>
"""
import ast, json, re, sys, os
facts, exp = sys.argv[1], sys.argv[2]
tables = set()
for ln in open(os.path.join(facts, "nodes.jsonl"), encoding="utf-8"):
    n = json.loads(ln)
    if n["kind"] == "table":
        tables.add(n["name"])
have = set()
for ln in open(os.path.join(facts, "edges.jsonl"), encoding="utf-8"):
    e = json.loads(ln)
    if e["kind"] in ("reads_table", "writes_table", "migration_touches"):
        have.add((e["evidence_path"], e["dst"].split(":", 1)[1]))
KW = re.compile(r"\b(from|join|into|update|delete\s+from|truncate|alter\s+table)\s+(?:only\s+)?(?:public\.)?\"?([a-z_][a-z0-9_]*)", re.I)
miss, found = [], 0
for root, _, files in os.walk(os.path.join(exp, "backend")):
    for fn in files:
        if not fn.endswith(".py"):
            continue
        p = os.path.join(root, fn)
        rel = os.path.relpath(p, exp).replace("\\", "/")
        try:
            tree = ast.parse(open(p, encoding="utf-8").read())
        except Exception:
            continue
        lits = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
                lits[node.targets[0].id] = node.value
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            f = node.func
            name = f.attr if isinstance(f, ast.Attribute) else (f.id if isinstance(f, ast.Name) else "")
            if name not in ("text", "execute", "exec_driver_sql"):
                continue
            parts = []
            for a in node.args:
                todo = [a]
                while todo:
                    x = todo.pop()
                    if isinstance(x, ast.Name) and x.id in lits:
                        todo.append(lits[x.id]); continue
                    if isinstance(x, ast.Call):
                        continue  # nested text(...) is visited on its own
                    for y in ast.walk(x):
                        if isinstance(y, ast.Constant) and isinstance(y.value, str):
                            parts.append(y.value)
            txt = " ".join(parts)
            for m in KW.finditer(txt):
                t = m.group(2).lower()
                if t not in tables:
                    continue
                found += 1
                if (rel, t) not in have:
                    miss.append("%s:%d %s %s" % (rel, node.lineno, m.group(1), t))
print(json.dumps({"sql_table_mentions_in_calls": found, "missing_file_table_pairs": len(set(miss)), "misses": sorted(set(miss))[:40]}, indent=1))
