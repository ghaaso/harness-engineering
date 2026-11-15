"""FACTS stage: Python backend (stdlib ast only).

Usage: python py_extract.py <export_root> <out_json>

Reads a clean export (no .git). Emits nodes and edges in the shared schema
(nodes {id, kind, path, name, line_start, line_end, signature, ...};
edges {src, dst, kind, evidence_path, evidence_line, confidence, attrs})
plus raw records the join needs (pytest HTTP calls, routes, pydantic response
models). runtime / slice / is_test are recomputed from the path by the join,
so this stage does not decide them.

Derived from research/schema/py_extract.py. Changes: path-based ids; defs found
at any depth (inside if/try/with blocks); module-level code is owned by the file
node; evidence line on every edge; constructor and unit-of-work table edges
from test files dropped (counted); session.delete(obj) handled; reads vs writes
labelled; module singletons and chained constructors typed; new classes:
imports, inherits, overrides, mocks (string patch targets), contract
(import-linter), scheduler registration, uses_constant, shop settings."""
import ast, json, os, re, sys, time
from collections import Counter, defaultdict

T0 = time.time()
ROOT = sys.argv[1]
OUT = sys.argv[2]
SKIP_DIRS = {"venv", ".venv", "node_modules", "__pycache__", ".mypy_cache", ".pytest_cache", ".ruff_cache", ".git"}

def list_py():
    out = []
    base = os.path.join(ROOT, "backend")
    if not os.path.isdir(base):
        return out
    for dp, dns, fns in os.walk(base):
        dns[:] = sorted(d for d in dns if d not in SKIP_DIRS)
        for f in sorted(fns):
            if f.endswith(".py"):
                out.append(os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, "/"))
    return sorted(out)

def is_test_path(rel):
    return bool(re.search(r"(^|/)(tests|__tests__)/", rel) or re.search(r"(^|/)test_[^/]*\.py$", rel)
                or re.search(r"(^|/)conftest\.py$", rel) or re.search(r"\.(test|spec)\.[^/]+$", rel))

def modname(rel):
    p = rel[len("backend/"):-3].replace("/", ".")
    return p[:-9] if p.endswith(".__init__") else p

stats = Counter()
NODES = {}
EDGES = []
def node(nid, kind, path=None, name=None, ls=None, le=None, sig=None, tokens=None):
    if nid not in NODES:
        NODES[nid] = dict(id=nid, kind=kind, path=path, name=name, line_start=ls, line_end=le, signature=sig, tokens=tokens)
    return nid
def edge(kind, src, dst, path, line, conf=1.0, **attrs):
    EDGES.append(dict(src=src, dst=dst, kind=kind, evidence_path=path, evidence_line=line, confidence=conf, attrs=attrs or None))

pyfiles = list_py()
trees = {}
for rel in pyfiles:
    try:
        src = open(os.path.join(ROOT, rel), encoding="utf-8").read()
    except UnicodeDecodeError:
        src = open(os.path.join(ROOT, rel), encoding="latin-1").read()
    try:
        trees[rel] = (ast.parse(src), src)
    except SyntaxError:
        stats["syntax_errors"] += 1
mod2rel = {modname(r): r for r in trees}
DEFS_KIND = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)

def tok(text):
    return (len(text) + 3) // 4

def seg(src_lines, a, b):
    return "\n".join(src_lines[a - 1:b])

# ---------- pass 1: definitions (any depth), imports, owners ----------
defs = {}                         # did -> info
mod_imports = defaultdict(dict)   # mod -> local -> (target_mod, attr or None, line)
mod_toplevel = defaultdict(dict)  # mod -> name -> did
mod_vars = defaultdict(dict)      # mod -> name -> value expr (module-level assigns)
mod_consts = defaultdict(dict)    # mod -> NAME -> const id
class_methods = defaultdict(dict)
class_bases = defaultdict(list)   # cid -> [base expr]
annot_alias = defaultdict(dict)
tables = {}
owned = defaultdict(list)         # owner id (did or file id) -> [ast nodes owned directly]
CONST_RE = re.compile(r"^_?[A-Z][A-Z0-9_]{2,}$")

def resolve_rel_import(mod, level, target, rel):
    pkg = mod.split(".")
    if not rel.endswith("__init__.py"):
        pkg = pkg[:-1]
    if level > 1:
        pkg = pkg[: len(pkg) - (level - 1)]
    return ".".join(pkg + ([target] if target else []))

def signature_of(n, src_lines):
    if isinstance(n, ast.ClassDef):
        try:
            b = ", ".join(ast.unparse(x) for x in n.bases)
        except Exception:
            b = ""
        return ("class %s(%s)" % (n.name, b))[:240]
    try:
        a = ast.unparse(n.args)
    except Exception:
        a = "..."
    r = ""
    if n.returns is not None:
        try:
            r = " -> " + ast.unparse(n.returns)
        except Exception:
            pass
    pre = "async def " if isinstance(n, ast.AsyncFunctionDef) else "def "
    return (pre + n.name + "(" + a + ")" + r)[:240]

for rel, (tree, src) in trees.items():
    mod = modname(rel)
    lines = src.splitlines()
    fid = node("file:" + rel, "file", rel, os.path.basename(rel), 1, max(1, len(lines)), None, tok(src))

    def rec(n, owner, prefix, owner_kind):
        for ch in ast.iter_child_nodes(n):
            if isinstance(ch, DEFS_KIND):
                q = prefix + ch.name
                did = "sym:%s#%s" % (rel, q)
                if isinstance(ch, ast.ClassDef):
                    kind = "class"
                elif owner_kind == "class":
                    kind = "method"
                elif owner_kind == "module":
                    kind = "function"
                else:
                    kind = "nested"
                start = min([d.lineno for d in ch.decorator_list] + [ch.lineno])
                if did in defs:      # redefinition (e.g. if/else variants): keep first, count
                    stats["duplicate_def_ids"] += 1
                else:
                    defs[did] = dict(node=ch, mod=mod, rel=rel, cls=owner if owner_kind == "class" else None,
                                     kind=kind, owner=owner)
                    node(did, kind, rel, ch.name, start, ch.end_lineno, signature_of(ch, lines),
                         tok(seg(lines, start, ch.end_lineno)))
                    edge("defines", owner, did, rel, ch.lineno)
                    if owner_kind == "module":
                        mod_toplevel[mod][ch.name] = did
                    if kind == "method":
                        class_methods[owner][ch.name] = did
                    if kind == "class":
                        class_bases[did] = list(ch.bases)
                        for st in ch.body:
                            if isinstance(st, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "__tablename__" for t in st.targets):
                                if isinstance(st.value, ast.Constant) and isinstance(st.value.value, str):
                                    tables[did] = st.value.value
                owned[owner].append(ch)
                rec(ch, did, q + ".", "class" if isinstance(ch, ast.ClassDef) else "func")
            else:
                owned[owner].append(ch)
                rec(ch, owner, prefix, owner_kind)
    rec(tree, fid, "", "module")

    for n in ast.walk(tree):
        if isinstance(n, ast.ImportFrom):
            tm = resolve_rel_import(mod, n.level, n.module, rel) if n.level else (n.module or "")
            for a in n.names:
                mod_imports[mod][a.asname or a.name] = (tm, a.name, n.lineno)
        elif isinstance(n, ast.Import):
            for a in n.names:
                if a.asname:
                    mod_imports[mod][a.asname] = (a.name, None, n.lineno)
                else:
                    mod_imports[mod][a.name.split(".")[0]] = (a.name.split(".")[0], None, n.lineno)
    for st in tree.body:
        tgt = val = None
        if isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name):
            tgt, val = st.targets[0].id, st.value
        elif isinstance(st, ast.AnnAssign) and isinstance(st.target, ast.Name) and st.value is not None:
            tgt, val = st.target.id, st.value
        if tgt is None:
            continue
        mod_vars[mod][tgt] = val
        if isinstance(val, ast.Subscript) and ast.unparse(val.value) in ("Annotated", "typing.Annotated"):
            els = val.slice.elts if isinstance(val.slice, ast.Tuple) else [val.slice]
            dep = None
            for e in els[1:]:
                if isinstance(e, ast.Call) and ast.unparse(e.func) == "Depends" and e.args:
                    dep = e.args[0]
            annot_alias[mod][tgt] = (els[0], dep)
        if CONST_RE.match(tgt):
            cid = "const:%s#%s" % (rel, tgt)
            try:
                sig = (tgt + " = " + ast.unparse(val))[:240]
            except Exception:
                sig = tgt
            node(cid, "constant", rel, tgt, st.lineno, st.end_lineno, sig, tok(seg(lines, st.lineno, st.end_lineno)))
            edge("defines", fid, cid, rel, st.lineno)
            mod_consts[mod][tgt] = cid

# ---------- name resolution ----------
def lookup_name(mod, name, seen=None):
    seen = seen or set()
    if (mod, name) in seen:
        return None
    seen.add((mod, name))
    if name in mod_toplevel[mod]:
        return mod_toplevel[mod][name]
    if name in mod_imports[mod]:
        tm, attr, _ = mod_imports[mod][name]
        if attr is None:
            return ("mod", tm) if tm in mod2rel else ("ext", tm)
        if tm + "." + attr in mod2rel:
            return ("mod", tm + "." + attr)
        if tm in mod2rel:
            r = lookup_name(tm, attr, seen)
            return r if r else ("unres", tm + "." + attr)
        return ("ext", tm)
    return None

def lookup_const(mod, name, seen=None):
    seen = seen or set()
    if (mod, name) in seen:
        return None
    seen.add((mod, name))
    if name in mod_consts[mod]:
        return mod_consts[mod][name]
    if name in mod_imports[mod]:
        tm, attr, _ = mod_imports[mod][name]
        if attr and tm in mod2rel:
            return lookup_const(tm, attr, seen)
    return None

def var_type(mod, name, seen=None):
    """Module-level singleton: name = SomeClass(...) (followed through imports)."""
    seen = seen or set()
    if (mod, name) in seen:
        return None
    seen.add((mod, name))
    v = mod_vars[mod].get(name)
    if isinstance(v, ast.Call) and isinstance(v.func, ast.Name):
        r = lookup_name(mod, v.func.id)
        if isinstance(r, str) and defs.get(r, {}).get("kind") == "class":
            return r
    if v is None and name in mod_imports[mod]:
        tm, attr, _ = mod_imports[mod][name]
        if attr and tm in mod2rel:
            return var_type(tm, attr, seen)
    return None

def type_of_expr(mod, e):
    if e is None:
        return None
    if isinstance(e, ast.Constant) and isinstance(e.value, str):
        try:
            e = ast.parse(e.value, mode="eval").body
        except Exception:
            return None
    if isinstance(e, ast.BinOp):
        return type_of_expr(mod, e.left) or type_of_expr(mod, e.right)
    if isinstance(e, ast.Subscript):
        base = ast.unparse(e.value)
        if base in ("Annotated", "typing.Annotated", "Optional", "Mapped", "typing.Optional"):
            els = e.slice.elts if isinstance(e.slice, ast.Tuple) else [e.slice]
            return type_of_expr(mod, els[0])
        return None
    if isinstance(e, ast.Name):
        if e.id in annot_alias[mod]:
            return type_of_expr(mod, annot_alias[mod][e.id][0])
        r = lookup_name(mod, e.id)
        if isinstance(r, str) and defs.get(r, {}).get("kind") == "class":
            return r
        if isinstance(r, tuple) and r[0] == "ext" and e.id[:1].isupper():
            return "EXT"
        if e.id in mod_imports[mod]:
            tm, attr, _ = mod_imports[mod][e.id]
            if tm in mod2rel and attr in annot_alias[tm]:
                return type_of_expr(tm, annot_alias[tm][attr][0])
    if isinstance(e, ast.Attribute) and isinstance(e.value, ast.Name):
        r = lookup_name(mod, e.value.id)
        if isinstance(r, tuple) and r[0] == "mod":
            t = lookup_name(r[1], e.attr)
            if isinstance(t, str) and defs.get(t, {}).get("kind") == "class":
                return t
    return None

def resolve_class_expr(mod, b):
    """A base-class / patch.object target expression -> repo class/def id, ('mod', m), or None."""
    if isinstance(b, ast.Subscript):
        b = b.value
    if isinstance(b, ast.Name):
        return lookup_name(mod, b.id)
    if isinstance(b, ast.Attribute) and isinstance(b.value, ast.Name):
        r = lookup_name(mod, b.value.id)
        if isinstance(r, tuple) and r[0] == "mod":
            sub = r[1] + "." + b.attr
            if sub in mod2rel:
                return ("mod", sub)
            return lookup_name(r[1], b.attr)
        if isinstance(r, str) and defs.get(r, {}).get("kind") == "class":
            return method_of(r, b.attr) or r
    return None

def method_of(cls_id, name, depth=0):
    if not cls_id or cls_id == "EXT" or depth > 6 or cls_id not in defs:
        return None
    if name in class_methods[cls_id]:
        return class_methods[cls_id][name]
    cmod = defs[cls_id]["mod"]
    for b in class_bases[cls_id]:
        bid = resolve_class_expr(cmod, b)
        if isinstance(bid, str) and defs.get(bid, {}).get("kind") == "class":
            r = method_of(bid, name, depth + 1)
            if r:
                return r
    return None

# self attribute types per class
self_attr_types = defaultdict(dict)
for cid in sorted(defs):
    info = defs[cid]
    if info["kind"] != "class":
        continue
    n, mod = info["node"], info["mod"]
    for st in n.body:
        if isinstance(st, ast.AnnAssign) and isinstance(st.target, ast.Name):
            t = type_of_expr(mod, st.annotation)
            if t:
                self_attr_types[cid][st.target.id] = t
    init = class_methods[cid].get("__init__")
    if init:
        fn = defs[init]["node"]
        ptypes = {a.arg: type_of_expr(mod, a.annotation) for a in fn.args.args + fn.args.kwonlyargs}
        for st in ast.walk(fn):
            tgt, val, ann = None, None, None
            if isinstance(st, ast.Assign) and len(st.targets) == 1:
                tgt, val = st.targets[0], st.value
            elif isinstance(st, ast.AnnAssign):
                tgt, val, ann = st.target, st.value, st.annotation
            if isinstance(tgt, ast.Attribute) and isinstance(tgt.value, ast.Name) and tgt.value.id == "self":
                t = type_of_expr(mod, ann) if ann is not None else None
                if not t and isinstance(val, ast.Name):
                    t = ptypes.get(val.id)
                if not t and isinstance(val, ast.Call) and isinstance(val.func, ast.Name):
                    r = lookup_name(mod, val.func.id)
                    t = r if isinstance(r, str) and defs.get(r, {}).get("kind") == "class" else None
                if t:
                    self_attr_types[cid][tgt.attr] = t

model_classes = dict(tables)

def fixture_types(mod, ann):
    if ann is None:
        return None
    e = ann
    if isinstance(e, ast.Subscript) and ast.unparse(e.value).split(".")[-1] in ("Iterator", "AsyncIterator", "Generator", "AsyncGenerator"):
        e = e.slice.elts[0] if isinstance(e.slice, ast.Tuple) else e.slice
    if isinstance(e, ast.Subscript) and ast.unparse(e.value) == "tuple":
        els = e.slice.elts if isinstance(e.slice, ast.Tuple) else [e.slice]
        return [type_of_expr(mod, x) for x in els]
    return [type_of_expr(mod, e)]
fixtures = defaultdict(dict)
for did in sorted(defs):
    info = defs[did]
    n = info["node"]
    if isinstance(n, ast.ClassDef) or not any("fixture" in ast.unparse(d) for d in n.decorator_list):
        continue
    scope = os.path.dirname(info["rel"]) if info["rel"].endswith("conftest.py") else info["rel"]
    fixtures[scope][n.name] = fixture_types(info["mod"], n.returns)
    stats["fixtures"] += 1
def visible_fixture(rel, name):
    if name in fixtures.get(rel, {}):
        return fixtures[rel][name]
    d = os.path.dirname(rel)
    while d:
        if name in fixtures.get(d, {}):
            return fixtures[d][name]
        d = os.path.dirname(d)
    return None
all_def_names = Counter(d["node"].name for d in defs.values())

DECORATOR_IDS = set()
for _rel, (_tree, _src) in trees.items():
    for _n in ast.walk(_tree):
        if isinstance(_n, DEFS_KIND):
            for _d in _n.decorator_list:
                DECORATOR_IDS.add(id(_d))
unres_imports = Counter()

# ---------- pass 2: calls, table access, settings, Depends, overrides, mocks ----------
unres_names = Counter()
WRITE_FN = {"update", "insert", "delete", "pg_insert", "sqlite_insert"}
SQL_RE = re.compile(r"\b(from|join|update|into)\s+\"?([a-z_][a-z0-9_]*)\"?", re.I)
table_names = set(tables.values())
http_calls = []
CONF = dict(name=1.0, module=1.0, ctor=1.0, self=0.95, typed=0.9, singleton=0.9, chained_ctor=0.9)

def model_table(mod, e):
    if isinstance(e, ast.Name):
        r = lookup_name(mod, e.id)
        if isinstance(r, str) and r in model_classes:
            return model_classes[r]
    if isinstance(e, ast.Attribute):
        if isinstance(e.value, ast.Name):
            r = lookup_name(mod, e.value.id)
            if isinstance(r, tuple) and r[0] == "mod":       # models.Job
                t = lookup_name(r[1], e.attr)
                if isinstance(t, str) and t in model_classes:
                    return model_classes[t]
        return model_table(mod, e.value)                       # Job.id
    return None

def resolve_patch_target(target):
    """'app.x.y.name' -> (dst id, how). Longest module prefix, then attribute lookup."""
    parts = target.split(".")
    for i in range(len(parts), 0, -1):
        m = ".".join(parts[:i])
        if m in mod2rel:
            rest = parts[i:]
            if not rest:
                return "file:" + mod2rel[m], "module"
            r = lookup_name(m, rest[0])
            if isinstance(r, str):
                if len(rest) > 1 and defs.get(r, {}).get("kind") == "class":
                    return (method_of(r, rest[1]) or r), "attr"
                return r, "attr"
            c = lookup_const(m, rest[0])
            if c:
                return c, "const"
            return "file:" + mod2rel[m], "module_attr"
    return None, None

def owner_ctx(owner):
    """-> (mod, rel, cls, kind)"""
    if owner.startswith("file:"):
        rel = owner[5:]
        return modname(rel), rel, None, "module"
    info = defs[owner]
    return info["mod"], info["rel"], info["cls"], info["kind"]

def sort_key(n):
    return (getattr(n, "lineno", 0), getattr(n, "col_offset", 0), type(n).__name__)

for owner in sorted(owned):
    mod, rel, cls, okind = owner_ctx(owner)
    is_test = is_test_path(rel)
    body_nodes = sorted(owned[owner], key=sort_key)
    local, tuplelocal = {}, {}
    fn = defs[owner]["node"] if owner in defs else None
    if okind in ("function", "method", "nested"):
        if okind == "nested":
            par = defs[owner]["owner"]
            while par in defs and defs[par]["kind"] in ("function", "method", "nested"):
                pfn = defs[par]["node"]
                for a in pfn.args.args + pfn.args.kwonlyargs:
                    t = type_of_expr(defs[par]["mod"], a.annotation)
                    if t and a.arg not in local:
                        local[a.arg] = t
                if defs[par]["kind"] == "method":
                    cls = defs[par]["cls"]
                if defs[par]["kind"] != "nested":
                    break
                par = defs[par]["owner"]
        for a in fn.args.args + fn.args.kwonlyargs + fn.args.posonlyargs:
            t = type_of_expr(mod, a.annotation)
            if t:
                local[a.arg] = t
            elif a.annotation is None:
                ft = visible_fixture(rel, a.arg)
                if ft:
                    stats["fixture_params_typed"] += 1
                    if len(ft) == 1 and ft[0]:
                        local[a.arg] = ft[0]
                    elif len(ft) > 1:
                        tuplelocal[a.arg] = ft
            elif isinstance(a.annotation, ast.Subscript) and ast.unparse(a.annotation.value) == "tuple":
                tuplelocal[a.arg] = fixture_types(mod, a.annotation)
            ann = a.annotation
            dep = None
            if isinstance(ann, ast.Subscript) and ast.unparse(ann.value) in ("Annotated", "typing.Annotated"):
                els = ann.slice.elts if isinstance(ann.slice, ast.Tuple) else [ann.slice]
                for e in els[1:]:
                    if isinstance(e, ast.Call) and ast.unparse(e.func) == "Depends" and e.args:
                        dep = (mod, e.args[0])
            elif isinstance(ann, ast.Name):
                if ann.id in annot_alias[mod]:
                    d = annot_alias[mod][ann.id][1]
                    dep = (mod, d) if d is not None else None
                elif ann.id in mod_imports[mod]:
                    tm, attr, _ = mod_imports[mod][ann.id]
                    if tm in mod2rel and attr in annot_alias[tm] and annot_alias[tm][attr][1] is not None:
                        dep = (tm, annot_alias[tm][attr][1])
            if dep is None and a.annotation is not None:
                pass
            # default-value form: x = Depends(provider)
            if dep is None:
                defaults = fn.args.defaults
                pos = fn.args.args
                idx = pos.index(a) - (len(pos) - len(defaults)) if a in pos else -1
                dv = defaults[idx] if 0 <= idx < len(defaults) else None
                if a in fn.args.kwonlyargs:
                    k = fn.args.kwonlyargs.index(a)
                    dv = fn.args.kw_defaults[k]
                if isinstance(dv, ast.Call) and ast.unparse(dv.func) == "Depends" and dv.args:
                    dep = (mod, dv.args[0])
            if dep and isinstance(dep[1], ast.Name):
                r = lookup_name(dep[0], dep[1].id)
                if isinstance(r, str):
                    edge("depends_injects", owner, r, rel, a.lineno if hasattr(a, "lineno") else fn.lineno, 1.0, param=a.arg)
                    stats["depends_resolved"] += 1
                else:
                    stats["depends_unresolved"] += 1
    # local variable typing (source order)
    for n in body_nodes:
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Tuple) and isinstance(n.value, ast.Name) and n.value.id in tuplelocal:
            for tgt, ty in zip(n.targets[0].elts, tuplelocal[n.value.id]):
                if isinstance(tgt, ast.Name) and ty:
                    local[tgt.id] = ty
        if isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name):
            t = type_of_expr(mod, n.annotation)
            if t:
                local[n.target.id] = t
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name):
            v = n.value.value if isinstance(n.value, ast.Await) else n.value
            if not isinstance(v, ast.Call):
                continue
            f = v.func
            t = None
            if isinstance(f, ast.Name):
                r = lookup_name(mod, f.id)
                if isinstance(r, str) and defs.get(r, {}).get("kind") == "class":
                    t = r
                elif isinstance(r, str) and r in defs and defs[r]["node"].returns is not None and defs[r]["kind"] != "class":
                    t = type_of_expr(defs[r]["mod"], defs[r]["node"].returns)
            elif isinstance(f, ast.Attribute):
                rv, tgt = f.value, None
                if f.attr == "get" and v.args:        # x = await session.get(Model, id)
                    mt = model_table(mod, v.args[0]) if isinstance(v.args[0], ast.Name) else None
                    if mt:
                        r = lookup_name(mod, v.args[0].id)
                        t = r if isinstance(r, str) else None
                if t is None:
                    if isinstance(rv, ast.Name) and rv.id == "self" and cls:
                        tgt = method_of(cls, f.attr)
                    elif isinstance(rv, ast.Attribute) and isinstance(rv.value, ast.Name) and rv.value.id == "self" and cls:
                        tgt = method_of(self_attr_types[cls].get(rv.attr), f.attr)
                    elif isinstance(rv, ast.Name) and rv.id in local:
                        tgt = method_of(local[rv.id], f.attr)
                    if tgt and defs[tgt]["node"].returns is not None:
                        t = type_of_expr(defs[tgt]["mod"], defs[tgt]["node"].returns)
                        if t:
                            stats["locals_typed_from_return"] += 1
            if t and t != "EXT":
                local[n.targets[0].id] = t
    for n in body_nodes:
        # unit-of-work writes: loaded_model.attr = ...
        tg = n.targets if isinstance(n, ast.Assign) else ([n.target] if isinstance(n, (ast.AugAssign, ast.AnnAssign)) else [])
        for t in tg:
            if isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and local.get(t.value.id) in model_classes:
                tb = model_classes[local[t.value.id]]
                if is_test:
                    stats["dropped_test_uow_writes"] += 1
                    continue
                edge("writes_column", owner, "column:%s.%s" % (tb, t.attr), rel, n.lineno, 0.9, via="unit_of_work")
                edge("writes_table", owner, "table:" + tb, rel, n.lineno, 0.9, via="unit_of_work")
                stats["uow_attr_writes"] += 1
        # app.dependency_overrides[provider] = replacement
        if isinstance(n, ast.Assign):
            for t in n.targets:
                if isinstance(t, ast.Subscript) and isinstance(t.value, ast.Attribute) and t.value.attr == "dependency_overrides":
                    key = t.slice
                    r = resolve_class_expr(mod, key) if isinstance(key, (ast.Name, ast.Attribute)) else None
                    if isinstance(r, str):
                        try:
                            rep = ast.unparse(n.value)[:80]
                        except Exception:
                            rep = "?"
                        edge("overrides", owner, r, rel, n.lineno, 1.0, replacement=rep)
                        stats["overrides"] += 1
                    else:
                        stats["overrides_unresolved"] += 1
        if isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name) and n.value.id == "settings" and isinstance(n.ctx, ast.Load):
            edge("reads_setting", owner, "setting:" + n.attr, rel, n.lineno, 1.0)
            stats["settings_reads"] += 1
        if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load) and CONST_RE.match(n.id):
            c = lookup_const(mod, n.id)
            if c and not (owner.startswith("file:") and c.startswith("const:" + rel + "#")):
                edge("uses_constant", owner, c, rel, n.lineno, 1.0)
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and len(n.value) > 12:
            for m in SQL_RE.finditer(n.value):
                if m.group(2) in table_names:
                    w = m.group(1).lower() in ("update", "into")
                    edge("writes_table" if w else "reads_table", owner, "table:" + m.group(2), rel, n.lineno, 0.8, via="sql")
                    stats["sql_table_" + ("writes" if w else "reads")] += 1
        if not isinstance(n, ast.Call):
            continue
        stats["call_sites"] += 1
        for a in list(n.args) + [k.value for k in n.keywords]:
            if isinstance(a, ast.Name):
                local_def = owner + "." + a.id if owner.startswith("sym:") else None
                cand = local_def if local_def in defs else lookup_name(mod, a.id)
                if isinstance(cand, str) and cand in defs and defs[cand]["kind"] in ("function", "nested", "method"):
                    edge("passes_callable", owner, cand, rel, n.lineno, 1.0, into=ast.unparse(n.func)[:40])
                    stats["callable_args"] += 1
        f = n.func
        target, how = None, None
        fname = None
        # string patch targets: patch("a.b.c"), mocker.patch("..."), monkeypatch.setattr("a.b.c", v)
        fstr = ast.unparse(f)
        is_patch_fn = fstr == "patch" or fstr.endswith(".patch")
        is_patch_obj = fstr.endswith("patch.object")
        is_setattr = fstr.endswith("monkeypatch.setattr")
        if (is_patch_fn or is_patch_obj or is_setattr) and n.args:
            a0 = n.args[0]
            if (is_patch_fn or is_setattr) and isinstance(a0, ast.Constant) and isinstance(a0.value, str) and "." in a0.value:
                dst, phow = resolve_patch_target(a0.value)
                if dst:
                    edge("mocks", owner, dst, rel, n.lineno, 1.0 if phow in ("attr", "module", "const") else 0.7, via="patch", target=a0.value)
                    stats["py_patch_resolved"] += 1
                else:
                    stats["py_patch_external"] += 1
            elif (is_patch_obj or is_setattr) and len(n.args) >= 2 and isinstance(n.args[1], ast.Constant) and isinstance(n.args[1].value, str):
                r = resolve_class_expr(mod, n.args[0]) if isinstance(n.args[0], (ast.Name, ast.Attribute)) else None
                dst = None
                if isinstance(r, str) and defs.get(r, {}).get("kind") == "class":
                    dst = method_of(r, n.args[1].value) or r
                elif isinstance(r, tuple) and r[0] == "mod":
                    dst = lookup_name(r[1], n.args[1].value)
                    dst = dst if isinstance(dst, str) else "file:" + mod2rel[r[1]]
                elif isinstance(n.args[0], ast.Name) and n.args[0].id in local:
                    dst = method_of(local[n.args[0].id], n.args[1].value)
                elif ast.unparse(n.args[0]).split(".")[-1] == "settings":
                    dst = "setting:" + n.args[1].value
                if dst:
                    edge("mocks", owner, dst, rel, n.lineno, 0.9, via="patch.object", target=ast.unparse(n.args[0])[:40] + "." + n.args[1].value)
                    stats["py_patch_object_resolved"] += 1
                else:
                    stats["py_patch_object_unresolved"] += 1
        if id(n) in DECORATOR_IDS:
            stats["decorator_calls_skipped"] += 1
            continue
        if isinstance(f, ast.Name):
            fname = f.id
            if f.id in WRITE_FN or f.id == "select":
                for a in n.args[:1]:
                    t = model_table(mod, a)
                    if t:
                        w = f.id in WRITE_FN
                        edge("writes_table" if w else "reads_table", owner, "table:" + t, rel, n.lineno, 1.0, via="orm", op=f.id)
                        stats["orm_table_" + ("writes" if w else "reads")] += 1
            r = None
            cur = owner
            while cur in defs:                       # enclosing-scope nested defs (closures)
                if cur + "." + f.id in defs:
                    r = cur + "." + f.id
                    break
                cur = defs[cur]["owner"]
            if r is None:
                r = lookup_name(mod, f.id)
            if isinstance(r, str):
                if defs[r]["kind"] == "class":
                    target, how = class_methods[r].get("__init__", r), "ctor"
                    if r in model_classes:
                        if is_test:
                            stats["dropped_test_ctor_writes"] += 1
                        else:
                            edge("writes_table", owner, "table:" + model_classes[r], rel, n.lineno, 0.85, via="ctor")
                            stats["ctor_table_writes"] += 1
                else:
                    target, how = r, "name"
            elif isinstance(r, tuple):
                how = r[0]
        elif isinstance(f, ast.Attribute):
            fname = f.attr
            recv = f.value
            rt = None
            rhow = "typed"
            if isinstance(recv, ast.Name):
                if recv.id == "self" and cls:
                    target = method_of(cls, f.attr); how = "self" if target else None
                elif recv.id in local:
                    rt = local[recv.id]
                else:
                    r = lookup_name(mod, recv.id)
                    if isinstance(r, tuple) and r[0] == "mod":
                        tt = lookup_name(r[1], f.attr)
                        if isinstance(tt, str):
                            target, how = tt, "module"
                            if defs[tt]["kind"] == "class":
                                target = class_methods[tt].get("__init__", tt)
                                if tt in model_classes and not is_test:
                                    edge("writes_table", owner, "table:" + model_classes[tt], rel, n.lineno, 0.85, via="ctor")
                    elif isinstance(r, str) and defs[r]["kind"] == "class":
                        rt = r
                    elif isinstance(r, tuple) and r[0] == "ext":
                        how = "ext"
                    else:
                        vt = var_type(mod, recv.id)
                        if vt:
                            rt, rhow = vt, "singleton"
            elif isinstance(recv, ast.Attribute) and isinstance(recv.value, ast.Name) and recv.value.id == "self" and cls:
                rt = self_attr_types[cls].get(recv.attr)
                if rt is None:
                    for b in class_bases[cls]:
                        bid = resolve_class_expr(defs[cls]["mod"], b)
                        if isinstance(bid, str):
                            rt = self_attr_types[bid].get(recv.attr) or rt
            elif isinstance(recv, ast.Call) and isinstance(recv.func, ast.Name) and recv.func.id == "super" and cls:
                for b in class_bases[cls]:
                    bid = resolve_class_expr(defs[cls]["mod"], b)
                    if isinstance(bid, str) and defs.get(bid, {}).get("kind") == "class":
                        target = method_of(bid, f.attr)
                        if target:
                            how = "self"
                            break
                if not target:
                    how = "ext"
            elif isinstance(recv, ast.Call) and isinstance(recv.func, ast.Name):
                r = lookup_name(mod, recv.func.id)
                if isinstance(r, str) and defs[r]["kind"] == "class":
                    rt, rhow = r, "chained_ctor"
            if rt == "EXT":
                how = "ext"
            elif rt and not target:
                target = method_of(rt, f.attr); how = rhow if target else None
            if f.attr in ("get", "post", "put", "patch", "delete") and n.args and isinstance(n.args[0], (ast.Constant, ast.JoinedStr)):
                a0 = n.args[0]
                if isinstance(a0, ast.Constant):
                    url = a0.value
                else:
                    url = ""
                    for v in a0.values:
                        if isinstance(v, ast.Constant):
                            url += v.value
                        else:
                            url += "{}" if url.endswith("/") else "{q}"
                if isinstance(url, str) and url.startswith("/api"):
                    url = re.sub(r"\{q\}.*$", "", url.split("?")[0])
                    http_calls.append(dict(src=owner, method=f.attr.upper(), url=url, path=rel, line=n.lineno))
                    how = how or "http"
            if f.attr in ("add", "merge", "add_all") and n.args:
                a0 = n.args[0]
                t = None
                if isinstance(a0, ast.Call):
                    t = model_table(mod, a0.func)
                elif isinstance(a0, ast.Name):
                    t = model_classes.get(local.get(a0.id))
                if t:
                    edge("writes_table", owner, "table:" + t, rel, n.lineno, 0.95, via="orm", op=f.attr)
                    stats["orm_table_writes"] += 1
            if f.attr == "delete" and n.args and isinstance(n.args[0], ast.Name) and local.get(n.args[0].id) in model_classes:
                edge("writes_table", owner, "table:" + model_classes[local[n.args[0].id]], rel, n.lineno, 0.95, via="orm", op="session.delete")
                stats["orm_session_delete"] += 1
            if f.attr in ("get", "scalar", "scalars", "execute") and n.args and f.attr == "get":
                t = model_table(mod, n.args[0])
                if t:
                    edge("reads_table", owner, "table:" + t, rel, n.lineno, 1.0, via="orm", op="session.get")
                    stats["orm_table_reads"] += 1
            if f.attr in WRITE_FN | {"select"} and isinstance(recv, ast.Name) and recv.id in ("sa", "sqlalchemy") and n.args:
                t = model_table(mod, n.args[0])
                if t:
                    w = f.attr in WRITE_FN
                    edge("writes_table" if w else "reads_table", owner, "table:" + t, rel, n.lineno, 1.0, via="orm", op=f.attr)
                    stats["orm_table_" + ("writes" if w else "reads")] += 1
        if target:
            stats["calls_resolved_" + how] += 1
            edge("calls", owner, target, rel, n.lineno, CONF.get(how, 0.9), how=how)
        elif how == "ext":
            stats["calls_external"] += 1
        elif how == "http":
            stats["calls_http_test_client"] += 1
        else:
            if fname and all_def_names.get(fname):
                stats["calls_unresolved_name_matches_repo_def"] += 1
                unres_names[ast.unparse(f)[:50]] += 1
            else:
                stats["calls_unresolved_other"] += 1

# ---------- imports (file -> file) ----------
imp = defaultdict(lambda: [None, set()])
for rel, (tree, src) in trees.items():
    mod = modname(rel)
    for n in ast.walk(tree):
        if isinstance(n, ast.ImportFrom):
            tm = resolve_rel_import(mod, n.level, n.module, rel) if n.level else (n.module or "")
            for a in n.names:
                if tm + "." + a.name in mod2rel:
                    dst, nm = mod2rel[tm + "." + a.name], None
                elif tm in mod2rel:
                    dst, nm = mod2rel[tm], a.name
                else:
                    if tm.split(".")[0] in ("app", "tests", "scripts") or tm.startswith("alembic.versions"):
                        stats["imports_unresolved"] += 1
                        unres_imports[tm + ":" + a.name] += 1
                    else:
                        stats["imports_external"] += 1
                    continue
                k = (rel, dst)
                if imp[k][0] is None or n.lineno < imp[k][0]:
                    imp[k][0] = n.lineno
                if nm:
                    imp[k][1].add(nm)
        elif isinstance(n, ast.Import):
            for a in n.names:
                if a.name in mod2rel:
                    k = (rel, mod2rel[a.name])
                    if imp[k][0] is None or n.lineno < imp[k][0]:
                        imp[k][0] = n.lineno
                else:
                    stats["imports_external"] += 1
for (s, d) in sorted(imp):
    if s == d:
        continue
    line, names = imp[(s, d)]
    edge("imports", "file:" + s, "file:" + d, s, line, 1.0, names=sorted(names) if names else None)

# ---------- inherits ----------
for cid in sorted(defs):
    info = defs[cid]
    if info["kind"] != "class":
        continue
    for b in class_bases[cid]:
        r = resolve_class_expr(info["mod"], b)
        if isinstance(r, str) and defs.get(r, {}).get("kind") == "class":
            edge("inherits", cid, r, info["rel"], info["node"].lineno, 1.0)
            stats["inherits_repo"] += 1
        else:
            stats["inherits_external"] += 1

# ---------- routes ----------
routers = {}
for rel, (tree, src) in trees.items():
    mod = modname(rel)
    for st in tree.body:
        if isinstance(st, ast.Assign) and isinstance(st.value, ast.Call) and ast.unparse(st.value.func) in ("APIRouter", "FastAPI", "fastapi.APIRouter"):
            pre = ""
            for k in st.value.keywords:
                if k.arg == "prefix" and isinstance(k.value, ast.Constant):
                    pre = k.value.value
            for t in st.targets:
                if isinstance(t, ast.Name):
                    routers[(mod, t.id)] = (pre, ast.unparse(st.value.func) == "FastAPI")
mount = {}
MAIN = "backend/app/main.py"
if MAIN in trees:
    mtree, _ = trees[MAIN]
    for n in ast.walk(mtree):
        if isinstance(n, ast.Call) and ast.unparse(n.func).endswith("include_router") and n.args:
            pre = next((k.value.value for k in n.keywords if k.arg == "prefix" and isinstance(k.value, ast.Constant)), "")
            a0 = n.args[0]
            key = None
            if isinstance(a0, ast.Name):
                tm, attr, _ = mod_imports["app.main"].get(a0.id, (None, None, None))
                if tm is not None:
                    key = (tm, attr) if attr else None
            elif isinstance(a0, ast.Attribute) and isinstance(a0.value, ast.Name):   # jobs_router.router
                tm, attr, _ = mod_imports["app.main"].get(a0.value.id, (None, None, None))
                if tm is not None:
                    m2 = tm + "." + attr if attr and (tm + "." + attr) in mod2rel else tm
                    key = (m2, a0.attr)
            if key:
                mount[key] = pre
                if key[0] in mod2rel:
                    edge("includes_router", "file:" + MAIN, "file:" + mod2rel[key[0]], MAIN, n.lineno, 1.0, prefix=pre)
routes = []
for did in sorted(defs):
    info = defs[did]
    if info["kind"] not in ("function",):
        continue
    for dec in info["node"].decorator_list:
        if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and isinstance(dec.func.value, ast.Name):
            key = (info["mod"], dec.func.value.id)
            meth = dec.func.attr
            if key in routers and meth in ("get", "post", "put", "patch", "delete") and dec.args and isinstance(dec.args[0], ast.Constant):
                rpre, is_app = routers[key]
                if is_app:
                    full = rpre + dec.args[0].value
                    mounted = True
                else:
                    mounted = key in mount
                    full = mount.get(key, "") + rpre + dec.args[0].value
                if is_test_path(info["rel"]):
                    stats["routes_in_test_files_skipped"] += 1
                    continue
                rid = "route:backend %s %s" % (meth.upper(), full)
                node(rid, "route", info["rel"], "%s %s" % (meth.upper(), full), dec.lineno, dec.end_lineno, ast.unparse(dec)[:240], tok(ast.unparse(dec)))
                edge("registers_route", rid, did, info["rel"], dec.lineno, 1.0, mounted=mounted)
                rm = None
                for k in dec.keywords:
                    if k.arg == "response_model":
                        rm = k.value
                    if k.arg == "dependencies":
                        for e in ast.walk(k.value):
                            if isinstance(e, ast.Call) and ast.unparse(e.func) == "Depends" and e.args and isinstance(e.args[0], ast.Name):
                                r = lookup_name(info["mod"], e.args[0].id)
                                if isinstance(r, str):
                                    edge("depends_injects", did, r, info["rel"], e.lineno, 1.0, param="dependencies")
                if rm is None:
                    rm = info["node"].returns
                routes.append(dict(id=rid, method=meth.upper(), path=full, handler=did, mounted=mounted,
                                   response_expr=ast.unparse(rm)[:120] if rm is not None else None,
                                   _rm=rm, _mod=info["mod"]))

# ---------- pydantic response models (for the experimental field class) ----------
def is_pydantic(cid, depth=0):
    if depth > 8 or cid not in defs:
        return False
    for b in class_bases[cid]:
        s = ast.unparse(b)
        if s.split(".")[-1] in ("BaseModel", "RootModel"):
            return True
        r = resolve_class_expr(defs[cid]["mod"], b)
        if isinstance(r, str) and is_pydantic(r, depth + 1):
            return True
    return False
def models_in_expr(mod, e, acc):
    if e is None:
        return
    if isinstance(e, ast.Constant) and isinstance(e.value, str):
        try:
            e = ast.parse(e.value, mode="eval").body
        except Exception:
            return
    for x in ast.walk(e):
        if isinstance(x, (ast.Name, ast.Attribute)):
            r = resolve_class_expr(mod, x) if isinstance(x, ast.Attribute) else lookup_name(mod, x.id)
            if isinstance(r, str) and r in pyd:
                acc.add(r)
pyd = {}
for cid in sorted(defs):
    if defs[cid]["kind"] == "class" and is_pydantic(cid):
        pyd[cid] = []
for cid in sorted(pyd):
    for st in defs[cid]["node"].body:
        if isinstance(st, ast.AnnAssign) and isinstance(st.target, ast.Name) and not ast.unparse(st.annotation).startswith("ClassVar"):
            pyd[cid].append([st.target.id, st.lineno, st.annotation])
schema_models = {}
for cid in sorted(pyd):
    flds = []
    for name, line, ann in pyd[cid]:
        acc = set()
        models_in_expr(defs[cid]["mod"], ann, acc)
        flds.append(dict(name=name, line=line, nested=sorted(acc)))
    schema_models[cid] = dict(path=defs[cid]["rel"], fields=flds)
for r in routes:
    acc = set()
    models_in_expr(r["_mod"], r["_rm"], acc)
    r["response_models"] = sorted(acc)
    del r["_rm"], r["_mod"]

# ---------- tables, columns, FKs ----------
for cid in sorted(tables):
    tname = tables[cid]
    info = defs[cid]
    n = info["node"]
    node("table:" + tname, "table", info["rel"], tname, n.lineno, n.end_lineno, "__tablename__ = %r (%s)" % (tname, n.name), NODES[cid]["tokens"])
    edge("maps_table", cid, "table:" + tname, info["rel"], n.lineno, 1.0)
    for st in n.body:
        tgt = st.target if isinstance(st, ast.AnnAssign) else (st.targets[0] if isinstance(st, ast.Assign) and len(st.targets) == 1 else None)
        val = st.value if isinstance(st, (ast.AnnAssign, ast.Assign)) else None
        if isinstance(tgt, ast.Name) and isinstance(val, ast.Call) and ast.unparse(val.func) in ("mapped_column", "Column", "sa.Column", "sa.orm.mapped_column"):
            colname = tgt.id
            if val.args and isinstance(val.args[0], ast.Constant) and isinstance(val.args[0].value, str):
                colname = val.args[0].value
            colid = node("column:%s.%s" % (tname, colname), "column", info["rel"], colname, st.lineno, st.end_lineno, ast.unparse(st)[:240], tok(ast.unparse(st)))
            edge("has_column", "table:" + tname, colid, info["rel"], st.lineno, 1.0)
            for e in ast.walk(val):
                if isinstance(e, ast.Call) and ast.unparse(e.func) in ("ForeignKey", "sa.ForeignKey") and e.args and isinstance(e.args[0], ast.Constant):
                    edge("foreign_key", colid, "column:" + e.args[0].value, info["rel"], e.lineno, 1.0)

# ---------- settings (env Settings fields + shop_setting codes) ----------
CFG = "backend/app/core/config.py"
settings_fields = []
if CFG in trees:
    cfg_tree, cfg_src = trees[CFG]
    for n in ast.walk(cfg_tree):
        if isinstance(n, ast.ClassDef) and n.name == "Settings":
            for st in n.body:
                if isinstance(st, ast.AnnAssign) and isinstance(st.target, ast.Name):
                    settings_fields.append(st.target.id)
                    node("setting:" + st.target.id, "setting", CFG, st.target.id, st.lineno, st.end_lineno,
                         ("FIXFLOW_%s: %s" % (st.target.id.upper(), ast.unparse(st)))[:240], tok(ast.unparse(st)))
SPECS = "backend/app/features/tenancy/specs.py"
shop_keys = {}
if SPECS in trees:
    for name, cid in sorted(mod_consts[modname(SPECS)].items()):
        if name.startswith("KEY_"):
            v = mod_vars[modname(SPECS)].get(name)
            if isinstance(v, ast.Constant) and isinstance(v.value, str):
                sid = node("setting:shop/" + v.value, "setting", SPECS, v.value, NODES[cid]["line_start"], NODES[cid]["line_end"], "shop_setting " + NODES[cid]["signature"], NODES[cid]["tokens"])
                shop_keys[cid] = sid
                edge("defines", cid, sid, SPECS, NODES[cid]["line_start"], 1.0)
for e in list(EDGES):
    if e["kind"] == "uses_constant" and e["dst"] in shop_keys:
        edge("reads_setting", e["src"], shop_keys[e["dst"]], e["evidence_path"], e["evidence_line"], 0.9, via="shop_setting_key")

# ---------- migrations ----------
for rel in sorted(trees):
    if "/alembic/versions/" not in rel:
        continue
    tree, src = trees[rel]
    rev = down = None
    for st in tree.body:
        if isinstance(st, (ast.Assign, ast.AnnAssign)):
            tgt = st.targets[0] if isinstance(st, ast.Assign) else st.target
            if isinstance(tgt, ast.Name) and tgt.id in ("revision", "down_revision") and isinstance(st.value, ast.Constant):
                if tgt.id == "revision":
                    rev = st.value.value
                else:
                    down = st.value.value
    if rev is None:
        continue
    mid = node("migration:" + str(rev), "migration", rel, str(rev), 1, len(src.splitlines()), "revision %s <- %s" % (rev, down), tok(src))
    edge("defines", "file:" + rel, mid, rel, 1, 1.0)
    if down:
        edge("migration_follows", mid, "migration:" + str(down), rel, 1, 1.0)
    seen_t = set()
    for n in ast.walk(tree):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and isinstance(n.func.value, ast.Name) and n.func.value.id == "op":
            for a in n.args[:2]:
                if isinstance(a, ast.Constant) and isinstance(a.value, str) and a.value in table_names:
                    if (a.value, n.func.attr) not in seen_t:
                        seen_t.add((a.value, n.func.attr))
                        edge("migration_touches", mid, "table:" + a.value, rel, n.lineno, 1.0, op=n.func.attr)
                    break
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and len(n.value) > 12:
            for m in SQL_RE.finditer(n.value):
                if m.group(2) in table_names and (m.group(2), "sql") not in seen_t:
                    seen_t.add((m.group(2), "sql"))
                    edge("migration_touches", mid, "table:" + m.group(2), rel, n.lineno, 0.8, op="sql")

# ---------- scheduler registration ----------
def gates_of(tree):
    """map id(call) -> [setting names of enclosing `if settings.X` tests]"""
    out = {}
    def rec(n, gates):
        for ch in ast.iter_child_nodes(n):
            g = gates
            if isinstance(n, ast.If) and ch in n.body:
                g = gates + [a.attr for a in ast.walk(n.test) if isinstance(a, ast.Attribute) and isinstance(a.value, ast.Name) and a.value.id == "settings"]
            if isinstance(ch, ast.Call):
                out[id(ch)] = g
            rec(ch, g)
    rec(tree, [])
    return out
for rel in sorted(trees):
    tree, src = trees[rel]
    if is_test_path(rel) or "add_" not in src:
        continue
    gmap = None
    for owner in sorted(o for o in owned if (o.startswith("sym:" + rel + "#") or o == "file:" + rel)):
        for n in owned[owner]:
            if not (isinstance(n, ast.Call)):
                continue
            fs = ast.unparse(n.func).split(".")[-1]
            if not re.match(r"^add_\w*job$", fs):
                continue
            nm = next((k.value.value for k in n.keywords if k.arg in ("name", "id") and isinstance(k.value, ast.Constant)), None)
            cal = next((a for a in n.args if isinstance(a, ast.Name) and isinstance(lookup_name(defs[owner]["mod"] if owner in defs else modname(rel), a.id), str)), None)
            if not nm or cal is None:
                continue
            if gmap is None:
                gmap = gates_of(tree)
            mod = defs[owner]["mod"] if owner in defs else modname(rel)
            target = lookup_name(mod, cal.id)
            jid = node("job:" + nm, "scheduled_job", rel, nm, n.lineno, n.end_lineno, ast.unparse(n)[:240], tok(ast.unparse(n)))
            trig = {k.arg: ast.unparse(k.value)[:40] for k in n.keywords if k.arg not in ("name", "id")}
            edge("registers_job", owner, jid, rel, n.lineno, 1.0, trigger=fs, **trig)
            edge("runs", jid, target, rel, n.lineno, 1.0)
            for g in gmap.get(id(n), []):
                edge("reads_setting", jid, "setting:" + g, rel, n.lineno, 1.0, gate=True)
            stats["scheduled_jobs"] += 1

# ---------- import-linter contracts ----------
PYPROJ = os.path.join(ROOT, "backend", "pyproject.toml")
contracts = []
if os.path.exists(PYPROJ):
    try:
        import tomllib
        raw = open(PYPROJ, "rb").read()
        txt = raw.decode("utf-8")
        conf = tomllib.loads(txt)
        cl = conf.get("tool", {}).get("importlinter", {}).get("contracts", [])
        plines = txt.splitlines()
        def line_of(s, after=0):
            for i in range(after, len(plines)):
                if '"' + s + '"' in plines[i]:
                    return i + 1
            return None
        FEATURES = sorted({m.split(".")[2] for m in mod2rel if m.startswith("app.features.") and len(m.split(".")) >= 3})
        def mod_nodes(m):
            p = m.split(".")
            if m == "app.features":
                return ["slice:backend/" + f for f in FEATURES]
            if len(p) == 3 and p[:2] == ["app", "features"]:
                return ["slice:backend/" + p[2]]
            if m in ("app.core", "app.shared"):
                return ["slice:backend/" + p[1]]
            if m in mod2rel:
                return ["file:" + mod2rel[m]]
            return []
        def wild(pat):
            rx = re.compile("^" + re.escape(pat).replace(r"\*\*", ".+").replace(r"\*", "[^.]+") + "$")
            return sorted(m for m in mod2rel if rx.match(m))
        file_imports = {(e["src"], e["dst"]) for e in EDGES if e["kind"] == "imports"}
        for c in cl:
            name = c.get("name", "?")
            ctype = c.get("type", "?")
            cline = line_of(name) or 1
            attrs = dict(contract=name, contract_type=ctype)
            if ctype == "independence":
                ms = c.get("modules", [])
                for a in ms:
                    for b in ms:
                        if a != b:
                            for s in mod_nodes(a):
                                for d in mod_nodes(b):
                                    edge("contract", s, d, "backend/pyproject.toml", line_of(a, cline - 1) or cline, 1.0, rule="forbid", **attrs)
            elif ctype == "forbidden":
                for a in c.get("source_modules", []):
                    for b in c.get("forbidden_modules", []):
                        for s in mod_nodes(a):
                            for d in mod_nodes(b):
                                edge("contract", s, d, "backend/pyproject.toml", line_of(b, cline - 1) or cline, 1.0, rule="forbid", **attrs)
            elif ctype == "layers":
                ls = c.get("layers", [])
                for i, hi in enumerate(ls):
                    for lo in ls[i + 1:]:
                        for s in mod_nodes(lo):
                            for d in mod_nodes(hi):
                                edge("contract", s, d, "backend/pyproject.toml", cline, 1.0, rule="forbid", **attrs)
            for ig in c.get("ignore_imports", []):
                if "->" not in ig:
                    continue
                a, b = [x.strip() for x in ig.split("->", 1)]
                ln = line_of(ig, cline - 1) or cline
                if "*" in a or "*" in b:
                    A, B = wild(a), wild(b)
                    for x in A:
                        for y in B:
                            # only real imports, and only cross-slice ones: an allowance inside one slice is vacuous
                            sx = x.split(".")[2] if x.startswith("app.features.") else x
                            sy = y.split(".")[2] if y.startswith("app.features.") else y
                            if sx != sy and ("file:" + mod2rel[x], "file:" + mod2rel[y]) in file_imports:
                                edge("contract", "file:" + mod2rel[x], "file:" + mod2rel[y], "backend/pyproject.toml", ln, 1.0, rule="allow", pattern=ig, **attrs)
                    stats["contract_wildcards"] += 1
                else:
                    for s in mod_nodes(a):
                        for d in mod_nodes(b):
                            edge("contract", s, d, "backend/pyproject.toml", ln, 1.0, rule="allow", **attrs)
            contracts.append(name)
    except Exception as ex:
        stats["contract_parse_error"] += 1

# ---------- outputs ----------
ec = Counter(e["kind"] for e in EDGES)
nc = Counter(v["kind"] for v in NODES.values())
res = dict(nodes=[NODES[k] for k in sorted(NODES)], edges=EDGES, http_calls=http_calls, routes=routes,
           schema_models=schema_models, settings_fields=settings_fields, contracts=contracts,
           stats=dict(sorted(stats.items())), node_counts=dict(sorted(nc.items())), edge_counts=dict(sorted(ec.items())),
           py_files=len(trees), unresolved_imports=sorted(unres_imports.items()), top_unresolved_repo_named=sorted(unres_names.items(), key=lambda x: (-x[1], x[0]))[:200])
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(res, fh, default=str, sort_keys=True)
print(json.dumps(dict(stats=res["stats"], node_counts=res["node_counts"], edge_counts=res["edge_counts"], secs=round(time.time() - T0, 2))))
