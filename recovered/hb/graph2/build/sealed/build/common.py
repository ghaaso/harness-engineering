"""Shared helpers for the sealed task build: git reads, file classes, definitions, hunk mapping.

Read-only against the repo: only `git log/diff/ls-tree/cat-file/blame/rev-parse/rev-list` are run.
"""
import ast, json, os, re, subprocess, tempfile

REPO = "C:/Users/User/Documents/projects/EMS_workshop1"
FROZEN = "a31924a3818f4ac94b695906d107c72c912792b2"
SPLIT_DATE = "2026-07-01"
HERE = os.path.dirname(os.path.abspath(__file__))
TMP = os.path.normpath(os.path.join(HERE, "..", "..", "tmp", "sealed-builder"))
CODE_EXT = (".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs")
TS_EXT = (".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs")


def git(*args, check=True):
    return subprocess.run(["git", "-c", "core.quotepath=false", "-C", REPO, *args], capture_output=True,
                          text=True, encoding="utf-8", errors="replace", check=check).stdout


# ---------- file classes (the scoring lane's classify, unchanged, plus the protocol's test rule) ----------
def classify(path):
    p = path.replace("\\", "/")
    low = p.lower()
    name = low.rsplit("/", 1)[-1]
    if low.endswith(".md"):
        return "doc", None
    rt = None
    if p.startswith("backend/"):
        rt = "backend"
    elif p.startswith("technician-app/"):
        rt = "mobile"
    elif p.startswith("src/") or p in ("ops-server.mjs",):
        rt = "web"
    if not low.endswith(CODE_EXT):
        return "other", rt
    is_test = ("/tests/" in low or "/__tests__/" in low or name.startswith("test_")
               or ".test." in name or ".spec." in name or name == "conftest.py"
               or name.startswith("vitest.setup") or name.startswith("jest.setup"))
    if "/alembic/versions/" in low:
        return "migration", rt
    if is_test:
        return "test", rt
    if rt is None:
        return "config_code", rt
    return "code", rt


def is_ctm(path):
    return classify(path)[0] in ("code", "test", "migration")


def is_test_path(path):
    """Protocol rule: tests/, __tests__/, test_*.py, *.test.*, conftest.py (path only)."""
    low = path.lower()
    name = low.rsplit("/", 1)[-1]
    return ("/tests/" in "/" + low or "/__tests__/" in "/" + low or (name.startswith("test_") and name.endswith(".py"))
            or ".test." in name or name == "conftest.py")


def runtime(path):
    return classify(path)[1]


# ---------- blobs ----------
class Blobs:
    """git cat-file --batch reader (read-only object reads; no checkout, no index)."""

    def __init__(self):
        self.p = subprocess.Popen(["git", "-C", REPO, "cat-file", "--batch"], stdin=subprocess.PIPE,
                                  stdout=subprocess.PIPE)
        self.cache = {}

    def get(self, sha, path):
        k = (sha, path)
        if k in self.cache:
            return self.cache[k]
        self.p.stdin.write(f"{sha}:{path}\n".encode("utf-8"))
        self.p.stdin.flush()
        header = self.p.stdout.readline().decode("utf-8", "replace").rstrip("\n")
        if header.endswith("missing") or header.endswith("ambiguous"):
            self.cache[k] = None
            return None
        size = int(header.split()[2])
        data = self.p.stdout.read(size)
        self.p.stdout.read(1)
        text = data.decode("utf-8", "replace")
        if len(self.cache) > 20000:
            self.cache.clear()
        self.cache[k] = text
        return text

    def close(self):
        self.p.stdin.close()
        self.p.wait()


# ---------- definitions ----------
def py_defs(text):
    """Canonical Python definition units: top-level functions, classes, class members as Class.m,
    nested classes as Class.Inner, top-level simple-name assignments as variables. Lines inside a
    function (incl. nested defs) belong to the function. Decorators belong to their definition."""
    try:
        tree = ast.parse(text)
    except (SyntaxError, ValueError):
        return {"ok": False, "defs": [], "attrs": []}
    defs, attrs = [], []

    def start(n):
        return min([n.lineno] + [d.lineno for d in getattr(n, "decorator_list", [])])

    def do_class(n, q):
        defs.append({"name": q, "kind": "class", "start": start(n), "end": n.end_lineno})
        for m in n.body:
            if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef)):
                defs.append({"name": q + "." + m.name, "kind": "method", "start": start(m), "end": m.end_lineno})
            elif isinstance(m, ast.ClassDef):
                do_class(m, q + "." + m.name)
            elif isinstance(m, (ast.Assign, ast.AnnAssign)):
                tg = m.targets if isinstance(m, ast.Assign) else [m.target]
                for t in tg:
                    if isinstance(t, ast.Name):
                        attrs.append({"name": t.id, "owner": q})
                        if t.id == "__tablename__" and isinstance(m.value, ast.Constant) and isinstance(m.value.value, str):
                            attrs.append({"name": m.value.value, "owner": q})  # a table name cites its model

    def top(body):
        for n in body:
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                defs.append({"name": n.name, "kind": "function", "start": start(n), "end": n.end_lineno})
            elif isinstance(n, ast.ClassDef):
                do_class(n, n.name)
            elif isinstance(n, (ast.Assign, ast.AnnAssign)):
                tg = n.targets if isinstance(n, ast.Assign) else [n.target]
                for t in tg:
                    if isinstance(t, ast.Name):
                        defs.append({"name": t.id, "kind": "variable", "start": n.lineno, "end": n.end_lineno})
            elif isinstance(n, (ast.If, ast.Try, ast.With, ast.AsyncWith)):
                top(getattr(n, "body", []))
                top(getattr(n, "orelse", []))
                top(getattr(n, "finalbody", []))
                for h in getattr(n, "handlers", []):
                    top(h.body)
    top(tree.body)
    # inner names (nested functions/classes inside a function or method): only used to resolve a
    # name a document cites to its enclosing canonical definition
    inner = []
    spans = [(d["start"], d["end"], d["name"]) for d in defs if d["kind"] in ("function", "method")]
    for n in ast.walk(tree):
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            own = [s for s in spans if s[0] < start(n) <= s[1]]
            if own:
                o = min(own, key=lambda s: s[1] - s[0])
                inner.append({"name": n.name, "owner": o[2]})
    return {"ok": True, "defs": defs, "attrs": attrs, "inner": inner}


def ts_defs_batch(jobs):
    """jobs: list of (key, path, text) -> {key: rec}. One node process for the whole batch."""
    if not jobs:
        return {}
    os.makedirs(TMP, exist_ok=True)
    fd_in, p_in = tempfile.mkstemp(suffix=".jsonl", dir=TMP)
    fd_out, p_out = tempfile.mkstemp(suffix=".jsonl", dir=TMP)
    os.close(fd_out)
    with os.fdopen(fd_in, "w", encoding="utf-8") as fh:
        for k, p, t in jobs:
            fh.write(json.dumps({"key": k, "path": p, "text": t}) + "\n")
    subprocess.run(["node", os.path.join(HERE, "defs_ts.js"), p_in, p_out], check=True)
    res = {}
    with open(p_out, encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                r = json.loads(line)
                res[tuple(r["key"]) if isinstance(r["key"], list) else r["key"]] = r
    os.remove(p_in)
    os.remove(p_out)
    return res


def defs_for(jobs):
    """jobs: list of (key, path, text|None) -> {key: rec}; py via ast, TS/JS via the compiler."""
    res, tsj = {}, []
    for k, p, t in jobs:
        if t is None:
            res[k] = {"ok": False, "defs": [], "attrs": [], "missing": True}
        elif p.endswith(".py"):
            res[k] = py_defs(t)
        elif p.endswith(TS_EXT):
            tsj.append((k, p, t))
        else:
            res[k] = {"ok": False, "defs": [], "attrs": []}
    res.update(ts_defs_batch(tsj))
    for r in res.values():  # stable occurrence index for duplicate names (overloads, redefinitions)
        seen = {}
        for d in r["defs"]:
            seen[d["name"]] = seen.get(d["name"], 0) + 1
            d["occ"] = seen[d["name"]]
    return res


def innermost(defs, line):
    best = None
    for i, d in enumerate(defs):
        if d["start"] <= line <= d["end"]:
            span = d["end"] - d["start"]
            if best is None or span < best[0] or (span == best[0] and i > best[1]):
                best = (span, i)
    return None if best is None else best[1]


def enclosing(defs, line):
    hits = [(d["end"] - d["start"], -i, i) for i, d in enumerate(defs) if d["start"] <= line <= d["end"]]
    return [i for _, _, i in sorted(hits)]


# ---------- diff ----------
HUNK = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")


def parse_diff(parent, child, paths=None):
    """-U0 diff with rename detection -> list of {status, old, new, hunks:[(a,b,c,d)]}."""
    args = ["diff", "-U0", "-M", "--no-color", "--no-ext-diff", "--src-prefix=a/", "--dst-prefix=b/", parent, child]
    if paths:
        args += ["--", *paths]
    out = git(*args)
    files, cur = [], None
    for line in out.splitlines():
        if line.startswith("diff --git "):
            m = re.match(r"diff --git a/(.*) b/(.*)$", line)
            cur = {"status": "M", "old": m.group(1), "new": m.group(2), "hunks": []}
            files.append(cur)
        elif cur is None:
            continue
        elif line.startswith("new file mode"):
            cur["status"] = "A"
        elif line.startswith("deleted file mode"):
            cur["status"] = "D"
        elif line.startswith("rename from "):
            cur["status"] = "R"
            cur["old"] = line[len("rename from "):]
        elif line.startswith("rename to "):
            cur["new"] = line[len("rename to "):]
        elif line.startswith("--- ") or line.startswith("+++ "):
            pass
        else:
            m = HUNK.match(line)
            if m:
                a, b, c, d = m.groups()
                cur["hunks"].append((int(a), 1 if b is None else int(b), int(c), 1 if d is None else int(d)))
    return files


def map_file(pdefs, cdefs, hunks):
    """Changed parent definitions of one existing file.
    Returns (changed: {parent_def_index: changed_line_count}, added: [child def names not at parent],
             module_lines: count of changed lines outside any definition)."""
    # Rules. Rewrite hunk (b > 0): every parent-side line goes to its innermost parent definition;
    # every child-side line goes to its innermost child definition when that name exists at the
    # parent, else the name is ADDED (no further attribution: the parent side already names what
    # was replaced, so a renamed method does not mark its whole class).
    # Pure insertion (b == 0, after parent line a): the insertion point's enclosing parent
    # definition is the innermost one holding both line a and line a+1. Child lines whose innermost
    # child definition exists at the parent go to it; the others are ADDED and go to the insertion
    # point's definition. When the insertion point is outside every parent definition (e.g. a new
    # method appended after a class's last line), the child side decides: the nearest enclosing
    # child definition that exists at the parent (the class), else module level.
    pindex = {(d["name"], d["occ"]): i for i, d in enumerate(pdefs)}
    changed, added, module = {}, set(), 0

    def bump(i):
        changed[i] = changed.get(i, 0) + 1
    for a, b, c, d in hunks:
        for ln in range(a, a + b):
            i = innermost(pdefs, ln)
            if i is None:
                module += 1
            else:
                bump(i)
        ins = None
        if b == 0:
            hold = [(p["end"] - p["start"], -k, k) for k, p in enumerate(pdefs) if p["start"] <= a and a + 1 <= p["end"]]
            ins = sorted(hold)[0][2] if hold else None
        for ln in range(c, c + d):
            chain = enclosing(cdefs, ln)    # innermost first
            if chain:
                cd = cdefs[chain[0]]
                i = pindex.get((cd["name"], cd["occ"]))
                if i is not None:
                    bump(i)
                    continue
                added.add(cd["name"])
            if b > 0:
                module += 1
                continue
            if ins is not None:
                bump(ins)
                continue
            hit = None
            for j in chain[1:]:
                cd = cdefs[j]
                i = pindex.get((cd["name"], cd["occ"]))
                if i is None:
                    added.add(cd["name"])
                else:
                    hit = i
                    break
            if hit is None:
                module += 1
            else:
                bump(hit)
    return changed, sorted(added), module


def commit_date(sha):
    return git("log", "-1", "--format=%aI", sha).strip()[:10]


def split_of(date):
    return "tune" if date < SPLIT_DATE else "heldout"


def cross_runtime(a, b):
    """True only when both files belong to a known runtime (backend, web, mobile) and they differ."""
    ra, rb = runtime(a), runtime(b)
    return bool(ra and rb and ra != rb)
