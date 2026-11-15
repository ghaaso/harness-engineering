"""Per documented item, count backticked identifiers that resolve to a code definition at main.

  python -I doc_symbols.py <repo> <doc_chains.json> <out.json>
Definition index: python 'def|class NAME', JS/TS 'function NAME', 'const|let NAME =', module-level
UPPER_CASE constants. Items and bodies come from doc_chains.json. Zero model tokens.
"""
import json, re, subprocess, sys, collections

REPO, CHAINS, OUT = sys.argv[1:4]
chains = json.load(open(CHAINS, encoding="utf-8"))

out = subprocess.run(["git", "-C", REPO, "grep", "-n", "-E",
                      r"(def |class |function |const |let |^[A-Z_][A-Z0-9_]{2,} *[:=])", "main", "--",
                      "*.py", "*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs"],
                     capture_output=True, text=True, encoding="utf-8", errors="replace").stdout
pat = re.compile(r"^\s*(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)|"
                 r"(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)|"
                 r"(?:export\s+)?(?:const|let)\s+([A-Za-z_]\w*)\s*[:=]|"
                 r"^\s*([A-Z_][A-Z0-9_]{2,})\s*[:=]")
defs = collections.defaultdict(set)
for line in out.splitlines():
    parts = line.split(":", 3)
    if len(parts) < 4:
        continue
    path, src = parts[1], parts[3]
    if "/tests/" in path or ".test." in path:
        continue
    m = pat.search(src)
    if m:
        defs[next(g for g in m.groups() if g)].add(path)

TOK = re.compile(r"`([^`]+)`")
IDENT = re.compile(r"^([A-Za-z_]\w*)(?:\(.*\))?$")
res = {}
for label, v in chains.items():
    rows = []
    for r in v["rows"]:
        idents = []
        for t in TOK.findall(r["body"]):
            t = t.strip()
            last = t.split(".")[-1] if "." in t and not re.search(r"\.(py|tsx?|jsx?|mjs|md)\b", t) else t
            m = IDENT.match(last)
            if m:
                idents.append(m.group(1))
        idents = list(dict.fromkeys(idents))
        hit = {i: sorted(defs[i]) for i in idents if i in defs}
        files_from_syms = sorted({p for ps in hit.values() if len(ps) <= 3 for p in ps})
        all_files = sorted(set(files_from_syms) | set(r["resolved_code"]))
        rows.append({"item": r["item"], "identifiers": len(idents), "resolved_symbols": len(hit),
                     "ambiguous_symbols": sum(len(p) > 3 for p in hit.values()),
                     "files_named": len(r["resolved_code"]), "files_named_or_via_symbol": len(all_files),
                     "files": all_files})
    n = len(rows)
    res[label] = {"items": n,
                  "items_with_ge1_resolved_symbol": sum(x["resolved_symbols"] >= 1 for x in rows),
                  "resolved_symbols_total": sum(x["resolved_symbols"] for x in rows),
                  "items_ge2_files_named_or_via_symbol": sum(x["files_named_or_via_symbol"] >= 2 for x in rows),
                  "items_ge1_file_named_or_via_symbol": sum(x["files_named_or_via_symbol"] >= 1 for x in rows),
                  "rows": rows}
json.dump(res, open(OUT, "w", encoding="utf-8"), indent=1)
for k, v in res.items():
    print(k, {kk: vv for kk, vv in v.items() if kk != "rows"})
