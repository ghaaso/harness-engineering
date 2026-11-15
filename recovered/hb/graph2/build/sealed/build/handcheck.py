"""Independent re-derivation of selected tasks, for a by-hand comparison with references.jsonl.

  python handcheck.py <ids.json> > handcheck.txt
Method (deliberately different from the builders): export the parent and the task commit with
`git archive <sha> -- <paths> | tar -x` into build/tmp/hc/, read `git diff -U0 --name-status` and the
-U0 hunks, and for every hunk find the enclosing definition by a regex/indent scan of the exported
parent file (python: def/class lines at lower indent; JS/TS: function/class/const/method/describe/it
lines at lower indent). Prints the derived files and definitions next to the sealed reference.
"""
import io, json, os, re, shutil, subprocess, sys, tarfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import REPO, TMP, is_ctm

ids = json.load(open(sys.argv[1]))
R = {}
for l in open(os.path.join(os.path.dirname(__file__), "..", "references.jsonl"), encoding="utf-8"):
    r = json.loads(l)
    if r["id"] in ids:
        R[r["id"]] = r
HC = os.path.join(TMP, "hc")


def export(sha, paths, dest):
    os.makedirs(dest, exist_ok=True)
    data = subprocess.run(["git", "-C", REPO, "archive", "--format=tar", sha, "--", *paths], capture_output=True).stdout
    if data:
        tarfile.open(fileobj=io.BytesIO(data)).extractall(dest)


PY_DEF = re.compile(r"^(\s*)(?:async\s+def|def|class)\s+([A-Za-z_]\w*)")
TS_DEF = re.compile(r"^(\s*)(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s*\*?\s*([A-Za-z_$][\w$]*)|class\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[=:]|(?:describe|it|test)\(\s*['\"`]([^'\"`]*))")
PY_VAR = re.compile(r"^([A-Za-z_]\w*)\s*(?::[^=]*)?=")


def enclosing(lines, ln, py):
    """Walk upward from line ln; collect def headers with strictly decreasing indent."""
    chain, cur_indent = [], None
    for i in range(min(ln, len(lines)) - 1, -1, -1):
        s = lines[i]
        if not s.strip():
            continue
        ind = len(s) - len(s.lstrip())
        m = (PY_DEF if py else TS_DEF).match(s)
        if m and (cur_indent is None or ind < cur_indent):
            name = next(g for g in m.groups()[1:] if g)
            chain.append((name, i + 1, ind))
            cur_indent = ind
            if ind == 0:
                break
        elif cur_indent is None and ind == 0 and py and PY_VAR.match(s) and i == ln - 1:
            chain.append((PY_VAR.match(s).group(1), i + 1, 0))
            break
    return chain


for tid in ids:
    r = R[tid]
    print("=" * 100)
    print(tid, r["set"], r["split"], "parent", r["parent"][:9], "seed", r["seed"]["path"], (r["seed"].get("symbol") or {}).get("name"))
    commit = r.get("commit") or r.get("fix_commit")
    if r["set"] == "T3":
        print("  item:", r["item"][:90], "| doc", r["doc_path"], "| intro", r["intro_commit"][:9])
        print("  ref files:", [f["path"] for f in r["files"]])
        print("  ref defs:", [(d["path"].rsplit("/", 1)[-1], d["name"], d["start"], d["end"]) for d in r["defs"]])
        paths = [r["seed"]["path"]] + [f["path"] for f in r["files"]] + [d["path"] for d in r["defs"]]
        dest = os.path.join(HC, tid, "parent")
        export(r["parent"], sorted(set(paths)), dest)
        for d in r["defs"] + ([dict(r["seed"]["symbol"], path=r["seed"]["path"])] if r["seed"].get("symbol") else []):
            lines = open(os.path.join(dest, d["path"]), encoding="utf-8", errors="replace").read().split("\n")
            print(f"  at parent {d['path'].rsplit('/', 1)[-1]}:{d['start']}: {lines[d['start'] - 1].strip()[:90]}")
        doc_at_parent = subprocess.run(["git", "-C", REPO, "cat-file", "-e", f"{r['parent']}:{r['doc_path']}"]).returncode == 0
        print("  doc exists at parent:", doc_at_parent)
        continue
    ns = subprocess.run(["git", "-C", REPO, "diff", "--name-status", "-M", r["parent"], commit], capture_output=True,
                        text=True, encoding="utf-8").stdout.split("\n")
    existing = [l.split("\t")[1] for l in ns if l and not l.startswith(("A", "D")) and is_ctm(l.split("\t")[1])]
    added = [l.split("\t")[1] for l in ns if l.startswith("A") and is_ctm(l.split("\t")[1])]
    print("  git: existing ctm", len(existing), "added ctm", len(added))
    dp, dc = os.path.join(HC, tid, "parent"), os.path.join(HC, tid, "child")
    export(r["parent"], existing, dp)
    derived = {}
    for p in existing:
        diff = subprocess.run(["git", "-C", REPO, "diff", "-U0", "-M", r["parent"], commit, "--", p], capture_output=True,
                              text=True, encoding="utf-8").stdout
        lines = open(os.path.join(dp, p), encoding="utf-8", errors="replace").read().split("\n")
        py = p.endswith(".py")
        names = set()
        for m in re.finditer(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", diff, re.M):
            a, b = int(m.group(1)), int(m.group(2) or 1)
            probe = [a] if b == 0 else list(range(a, a + b))   # b == 0: insertion after line a
            for ln in probe:
                ch = enclosing(lines, ln if b else ln + 1, py)
                if ch:
                    names.add(ch[-1][0] if len(ch) == 1 else ".".join(c[0] for c in reversed(ch[-2:])))
        derived[p] = sorted(names)
    sealed_files = {f["path"] for f in r["files"]} | {r["seed"]["path"]}
    if r["set"] == "T2":
        print("  T2: reference = existing test files; derived test files:", [p for p in existing if "test" in p.lower()])
    print("  files: derived-not-sealed", sorted(set(existing) - sealed_files) if r["set"] != "T2" else "-",
          "| sealed-not-derived", sorted(sealed_files - set(existing)))
    sd = {}
    for d in r["defs"]:
        sd.setdefault(d["path"], []).append(d["name"])
    for p in existing:
        if r["set"] == "T2" and p not in sealed_files:
            continue
        print(f"  {p.rsplit('/', 1)[-1]:40s} regex-scan: {derived[p]}")
        print(f"  {'':40s} sealed defs: {sorted(sd.get(p, []))}" + ("  [+seed symbol]" if p == r["seed"]["path"] and r["seed"].get("symbol") else ""))
    print("  excluded unreachable:", {k: v for k, v in r["excluded_unreachable"].items() if k.startswith("n_")})
shutil.rmtree(HC, ignore_errors=True)
