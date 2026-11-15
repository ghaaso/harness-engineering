"""Read-only extraction of a typed graph from the backend with the stdlib ast module.
Usage: python py_extract.py <repo_root> <out_json>
Measures: defs (function/class/method), calls with a light type inference, routes,
Depends edges, tables/columns/FKs, table reads/writes, settings keys and uses,
migrations, tests. Prints stats; writes nodes/edges JSON."""
import ast, json, os, re, subprocess, sys, time
from collections import Counter, defaultdict

T0 = time.time()
ROOT = sys.argv[1]
OUT = sys.argv[2]
BE = os.path.join(ROOT, "backend")

files = subprocess.run(["git", "-C", ROOT, "ls-files", "backend"], capture_output=True, text=True).stdout.split()
files += subprocess.run(["git", "-C", ROOT, "ls-files", "--others", "--exclude-standard", "backend"], capture_output=True, text=True).stdout.split()
pyfiles = sorted(set(f for f in files if f.endswith(".py")))

def modname(rel):
    p = rel[len("backend/"):-3].replace("/", ".")
    return p[:-9] if p.endswith(".__init__") else p

stats = stats if "stats" in dir() else Counter()
nodes = {}          # id -> props
edges = []          # (type, src, dst, props)
def node(nid, typ, **kw):
    if nid not in nodes:
        nodes[nid] = dict(type=typ, **kw)
    return nid
def edge(t, s, d, **kw):
    edges.append((t, s, d, kw))

trees = {}
for rel in pyfiles:
    src = open(os.path.join(ROOT, rel), encoding="utf-8").read()
    try:
        trees[rel] = (ast.parse(src), src)
    except SyntaxError as e:
        print("syntax error", rel, e)
mod2rel = {modname(r): r for r in trees}

def runtime_slice(rel):
    m = re.match(r"backend/app/features/([^/]+)/", rel)
    return m.group(1) if m else ("core" if "/app/core/" in rel else ("shared" if "/app/shared/" in rel else rel.split("/")[1]))

# ---------- pass 1: definitions, imports, module aliases ----------
defs = {}                 # qualified id "mod:Qual" -> info
mod_imports = defaultdict(dict)   # mod -> local name -> (target_mod, attr or None)
mod_toplevel = defaultdict(dict)  # mod -> name -> def id
class_methods = defaultdict(dict) # class id -> method name -> def id
class_bases = defaultdict(list)   # class id -> base expressions (names)
annot_alias = defaultdict(dict)   # mod -> alias name -> (type_name_expr, depends_func_expr)
tables = {}               # class id -> tablename
nested = 0

def resolve_rel_import(mod, level, target, rel):
    pkg = mod.split(".")
    if not rel.endswith("__init__.py"):
        pkg = pkg[:-1]
    if level > 1:
        pkg = pkg[: len(pkg) - (level - 1)]
    return ".".join(pkg + ([target] if target else []))

def size_tok(src, n):
    seg = "\n".join(src.splitlines()[n.lineno - 1 : n.end_lineno])
    return len(seg) // 4

for rel, (tree, src) in trees.items():
    mod = modname(rel)
    fid = node("file:" + rel, "file", path=rel, runtime="backend", slice=runtime_slice(rel), tokens=len(src) // 4)
    for n in ast.walk(tree):
        if isinstance(n, ast.ImportFrom):
            tm = resolve_rel_import(mod, n.level, n.module, rel) if n.level else (n.module or "")
            for a in n.names:
                mod_imports[mod][a.asname or a.name] = (tm, a.name)
        elif isinstance(n, ast.Import):
            for a in n.names:
                mod_imports[mod][a.asname or a.name.split(".")[0]] = (a.name if a.asname else a.name.split(".")[0], None)
    def visit(body, prefix, cls_id, depth):
        global nested
        for n in body:
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                q = prefix + n.name
                did = f"sym:{mod}:{q}"
                kind = "class" if isinstance(n, ast.ClassDef) else ("method" if cls_id else ("function" if depth == 0 else "nested"))
                if kind == "nested":
                    nested += 1
                sig = None
                if not isinstance(n, ast.ClassDef):
                    try:
                        sig = n.name + "(" + ast.unparse(n.args)[:160] + ")"
                    except Exception:
                        sig = n.name
                node(did, kind, path=rel, mod=mod, name=n.name, line=n.lineno, end=n.end_lineno, sig=sig,
                     slice=runtime_slice(rel), runtime="backend", tokens=size_tok(src, n))
                defs[did] = dict(node=n, mod=mod, rel=rel, cls=cls_id, kind=kind)
                edge("defines", cls_id or fid, did)
                if depth == 0 and not cls_id:
                    mod_toplevel[mod][n.name] = did
                if cls_id and kind == "method":
                    class_methods[cls_id][n.name] = did
                if isinstance(n, ast.ClassDef):
                    class_bases[did] = [ast.unparse(b) for b in n.bases]
                    for st in n.body:
                        if isinstance(st, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "__tablename__" for t in st.targets):
                            if isinstance(st.value, ast.Constant):
                                tables[did] = st.value.value
                    visit(n.body, q + ".", did, depth + 1)
                else:
                    visit(n.body, q + ".", None, depth + 1)
    visit(tree.body, "", None, 0)
    for st in tree.body:
        if isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name):
            v = st.value
            if isinstance(v, ast.Subscript) and ast.unparse(v.value) in ("Annotated", "typing.Annotated"):
                els = v.slice.elts if isinstance(v.slice, ast.Tuple) else [v.slice]
                dep = None
                for e in els[1:]:
                    if isinstance(e, ast.Call) and ast.unparse(e.func) == "Depends" and e.args:
                        dep = e.args[0]
                annot_alias[mod][st.targets[0].id] = (els[0], dep)

# ---------- name resolution helpers ----------
def lookup_name(mod, name, seen=None):
    """Return def id (in-repo) or ('ext', module) for a bare name used in mod."""
    seen = seen or set()
    if (mod, name) in seen:
        return None
    seen.add((mod, name))
    if name in mod_toplevel[mod]:
        return mod_toplevel[mod][name]
    if name in mod_imports[mod]:
        tm, attr = mod_imports[mod][name]
        if attr is None:
            return ("mod", tm) if tm in mod2rel else ("ext", tm)
        if tm + "." + attr in mod2rel:
            return ("mod", tm + "." + attr)
        if tm in mod2rel:
            r = lookup_name(tm, attr, seen)   # follow re-exports
            return r if r else ("unres", tm + "." + attr)
        return ("ext", tm)
    return None

def type_of_expr(mod, e):
    """Annotation expression -> class def id, if in-repo."""
    if e is None:
        return None
    if isinstance(e, ast.Constant) and isinstance(e.value, str):
        try:
            e = ast.parse(e.value, mode="eval").body
        except Exception:
            return None
    if isinstance(e, ast.BinOp):   # X | None
        return type_of_expr(mod, e.left) or type_of_expr(mod, e.right)
    if isinstance(e, ast.Subscript):
        base = ast.unparse(e.value)
        if base in ("Annotated", "typing.Annotated", "Optional", "Mapped"):
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
        # alias imported from another module (e.g. JobsServiceDep)
        if e.id in mod_imports[mod]:
            tm, attr = mod_imports[mod][e.id]
            if tm in mod2rel and attr in annot_alias[tm]:
                return type_of_expr(tm, annot_alias[tm][attr][0])
    if isinstance(e, ast.Attribute):
        return None
    return None

def method_of(cls_id, name, depth=0):
    if not cls_id or cls_id == "EXT" or depth > 5:
        return None
    if name in class_methods[cls_id]:
        return class_methods[cls_id][name]
    cmod = defs[cls_id]["mod"]
    for b in class_bases[cls_id]:
        bid = lookup_name(cmod, b.split("[")[0]) if "." not in b else None
        if isinstance(bid, str):
            r = method_of(bid, name, depth + 1)
            if r:
                return r
    return None

# self attribute types per class
self_attr_types = defaultdict(dict)
for cid, info in defs.items():
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

model_classes = {cid: t for cid, t in tables.items()}

# pytest fixtures: name -> list of element types (tuple fixtures give several)
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
fixtures = defaultdict(dict)   # dir or module -> name -> types
for did, info in defs.items():
    n = info["node"]
    if isinstance(n, ast.ClassDef) or not any("fixture" in ast.unparse(d) for d in n.decorator_list):
        continue
    ft = fixture_types(info["mod"], n.returns)
    scope = os.path.dirname(info["rel"]) if info["rel"].endswith("conftest.py") else info["rel"]
    fixtures[scope][n.name] = ft
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

# ---------- pass 2: calls, table access, settings, Depends ----------
stats = stats if "stats" in dir() else Counter()
unres_names = Counter()
ext_names = Counter()
sample_resolved = []
WRITE_FN = {"update": "writes", "insert": "writes", "delete": "writes", "pg_insert": "writes"}
SQL_RE = re.compile(r"\b(from|join|update|into)\s+\"?([a-z_][a-z0-9_]*)\"?", re.I)
table_names = set(tables.values())
settings_uses = Counter()

def enclosing_defs():
    for did, info in defs.items():
        if info["kind"] in ("function", "method", "nested"):
            yield did, info

def model_table(mod, e):
    if isinstance(e, ast.Name):
        r = lookup_name(mod, e.id)
        if isinstance(r, str) and r in model_classes:
            return model_classes[r]
    if isinstance(e, ast.Attribute):    # Job.id column in select(Job.id)
        return model_table(mod, e.value)
    return None

for did, info in enclosing_defs():
    fn, mod = info["node"], info["mod"]
    cls = info["cls"]
    if info["kind"] == "method":
        cls = defs[did]["cls"]
    local = {}
    tuplelocal = {}
    if info["kind"] == "nested":   # closures see the enclosing function's typed parameters
        par = did.rsplit(".", 1)[0]
        while par in defs and defs[par]["kind"] in ("function", "method", "nested"):
            pfn = defs[par]["node"]
            for a in pfn.args.args + pfn.args.kwonlyargs:
                t = type_of_expr(defs[par]["mod"], a.annotation)
                if t and a.arg not in local:
                    local[a.arg] = t
                    stats["closure_params_inherited"] += 1
            if defs[par]["kind"] != "nested":
                if defs[par]["kind"] == "method":
                    cls = defs[par]["cls"]
                break
            par = par.rsplit(".", 1)[0]
    for a in fn.args.args + fn.args.kwonlyargs + fn.args.posonlyargs:
        t = type_of_expr(mod, a.annotation)
        if t:
            local[a.arg] = t
        elif a.annotation is None:
            ft = visible_fixture(info["rel"], a.arg)
            if ft:
                stats["fixture_params_typed"] += 1
                if len(ft) == 1 and ft[0]:
                    local[a.arg] = ft[0]
                elif len(ft) > 1:
                    tuplelocal[a.arg] = ft
        elif isinstance(a.annotation, ast.Subscript) and ast.unparse(a.annotation.value) == "tuple":
            tuplelocal[a.arg] = fixture_types(mod, a.annotation)
            stats["tuple_params_typed"] += 1
        # Depends edges from parameters
        ann = a.annotation
        dep = None
        if isinstance(ann, ast.Subscript) and ast.unparse(ann.value) in ("Annotated",):
            els = ann.slice.elts if isinstance(ann.slice, ast.Tuple) else [ann.slice]
            for e in els[1:]:
                if isinstance(e, ast.Call) and ast.unparse(e.func) == "Depends" and e.args:
                    dep = (mod, e.args[0])
        elif isinstance(ann, ast.Name):
            if ann.id in annot_alias[mod]:
                d = annot_alias[mod][ann.id][1]
                dep = (mod, d) if d is not None else None
            elif ann.id in mod_imports[mod]:
                tm, attr = mod_imports[mod][ann.id]
                if tm in mod2rel and attr in annot_alias[tm] and annot_alias[tm][attr][1] is not None:
                    dep = (tm, annot_alias[tm][attr][1])
        if dep and isinstance(dep[1], ast.Name):
            r = lookup_name(dep[0], dep[1].id)
            if isinstance(r, str):
                edge("depends_injects", did, r, param=a.arg)
                stats["depends_resolved"] += 1
            else:
                stats["depends_unresolved"] += 1
    # walk body without descending into nested defs
    stack = list(fn.body)
    body_nodes = []
    while stack:
        n = stack.pop()
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)) and n is not fn:
            continue
        body_nodes.append(n)
        stack.extend(ast.iter_child_nodes(n))
    for n in body_nodes:   # local var types from constructor assignment
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Tuple) and isinstance(n.value, ast.Name) and n.value.id in tuplelocal:
            for tgt, ty in zip(n.targets[0].elts, tuplelocal[n.value.id]):
                if isinstance(tgt, ast.Name) and ty:
                    local[tgt.id] = ty
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name) and isinstance(n.value, ast.Call):
            f = n.value.func
            if isinstance(f, ast.Name):
                r = lookup_name(mod, f.id)
                if isinstance(r, str) and defs.get(r, {}).get("kind") == "class":
                    local[n.targets[0].id] = r
                elif isinstance(r, str) and defs[r]["node"].returns is not None if isinstance(r, str) and r in defs and defs[r]["kind"] != "class" else False:
                    t = type_of_expr(defs[r]["mod"], defs[r]["node"].returns)
                    if t:
                        local[n.targets[0].id] = t
        elif isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name):
            t = type_of_expr(mod, n.annotation)
            if t:
                local[n.target.id] = t
        # x = await self.m(...) / await self._repo.m(...) / await local.m(...) -> return annotation
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name):
            v = n.value.value if isinstance(n.value, ast.Await) else n.value
            if isinstance(v, ast.Call) and isinstance(v.func, ast.Attribute):
                rv, tgt = v.func.value, None
                if isinstance(rv, ast.Name) and rv.id == "self" and cls:
                    tgt = method_of(cls, v.func.attr)
                elif isinstance(rv, ast.Attribute) and isinstance(rv.value, ast.Name) and rv.value.id == "self" and cls:
                    tgt = method_of(self_attr_types[cls].get(rv.attr), v.func.attr)
                elif isinstance(rv, ast.Name) and rv.id in local:
                    tgt = method_of(local[rv.id], v.func.attr)
                if tgt and defs[tgt]["node"].returns is not None:
                    t = type_of_expr(defs[tgt]["mod"], defs[tgt]["node"].returns)
                    if t and t != "EXT":
                        local[n.targets[0].id] = t
                        stats["locals_typed_from_return"] += 1
    for n in body_nodes:   # unit-of-work writes: loaded_model.attr = ...
        tg = n.targets if isinstance(n, ast.Assign) else ([n.target] if isinstance(n, ast.AugAssign) else [])
        for t in tg:
            if isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and local.get(t.value.id) in model_classes:
                tb = model_classes[local[t.value.id]]
                edge("writes_column", did, f"column:{tb}.{t.attr}", via="unit_of_work")
                edge("writes_table", did, "table:" + tb, via="unit_of_work")
                stats["uow_attr_writes"] += 1
    for n in body_nodes:
        if isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name) and n.value.id == "settings":
            settings_uses[n.attr] += 1
            edge("reads_setting", did, "setting:" + n.attr)
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and len(n.value) > 12:
            for m in SQL_RE.finditer(n.value):
                if m.group(2) in table_names:
                    edge("writes_table" if m.group(1).lower() in ("update", "into") else "reads_table", did, "table:" + m.group(2), via="sql")
                    stats["sql_table_refs"] += 1
        if not isinstance(n, ast.Call):
            continue
        stats["call_sites"] += 1
        # function references passed as arguments (callbacks, scheduler jobs, DI at the composition root)
        for a in list(n.args) + [k.value for k in n.keywords]:
            if isinstance(a, ast.Name):
                cand = f"{did}.{a.id}" if f"{did}.{a.id}" in defs else lookup_name(mod, a.id)
                if isinstance(cand, str) and cand in defs and defs[cand]["kind"] in ("function", "nested", "method"):
                    edge("passes_callable", did, cand, line=n.lineno, into=ast.unparse(n.func)[:40])
                    stats["callable_args"] += 1
        f = n.func
        target, how = None, None
        if isinstance(f, ast.Name):
            fname = f.id
            if f.id in WRITE_FN or f.id == "select":
                for a in n.args[:1]:
                    t = model_table(mod, a)
                    if t:
                        edge("writes_table" if f.id in WRITE_FN else "reads_table", did, "table:" + t, via="orm")
                        stats["orm_table_refs"] += 1
            r = lookup_name(mod, f.id)
            if isinstance(r, str):
                if defs[r]["kind"] == "class":
                    target, how = class_methods[r].get("__init__", r), "ctor"
                    if r in model_classes:
                        edge("writes_table", did, "table:" + model_classes[r], via="ctor")
                else:
                    target, how = r, "name"
            elif isinstance(r, tuple):
                how = r[0]
        elif isinstance(f, ast.Attribute):
            fname = f.attr
            recv = f.value
            rt = None
            if isinstance(recv, ast.Name):
                if recv.id == "self" and cls:
                    target = method_of(cls, f.attr); how = "self" if target else None
                elif recv.id in local:
                    rt = local[recv.id]
                else:
                    r = lookup_name(mod, recv.id)
                    if isinstance(r, tuple) and r[0] == "mod":
                        target = lookup_name(r[1], f.attr); how = "module" if isinstance(target, str) else None
                        target = target if isinstance(target, str) else None
                    elif isinstance(r, str) and defs[r]["kind"] == "class":
                        rt = r
                    elif isinstance(r, tuple) and r[0] == "ext":
                        how = "ext"
            elif isinstance(recv, ast.Attribute) and isinstance(recv.value, ast.Name) and recv.value.id == "self" and cls:
                rt = self_attr_types[cls].get(recv.attr)
                if rt is None:
                    # inherited attr types
                    for b in class_bases[cls]:
                        bid = lookup_name(defs[cls]["mod"], b.split("[")[0])
                        if isinstance(bid, str):
                            rt = self_attr_types[bid].get(recv.attr) or rt
            if rt == "EXT":
                how = "ext"
            elif rt and not target:
                target = method_of(rt, f.attr); how = "typed" if target else None
            if f.attr in ("get", "post", "put", "patch", "delete") and n.args and isinstance(n.args[0], (ast.Constant, ast.JoinedStr)):
                a0 = n.args[0]
                url = a0.value if isinstance(a0, ast.Constant) else "".join(v.value if isinstance(v, ast.Constant) else "{}" for v in a0.values)
                if isinstance(url, str) and url.startswith("/api"):
                    edge("calls_url", did, "url:" + f.attr.upper() + " " + url.split("?")[0], line=n.lineno)
                    how = how or "http"
            if f.attr in ("add", "merge") and n.args:
                a0 = n.args[0]
                t = model_table(mod, a0.func) if isinstance(a0, ast.Call) else (model_classes.get(local.get(a0.id)) if isinstance(a0, ast.Name) else None)
                if t:
                    edge("writes_table", did, "table:" + t, via="orm"); stats["orm_table_refs"] += 1
            if f.attr == "get" and n.args:
                t = model_table(mod, n.args[0])
                if t:
                    edge("reads_table", did, "table:" + t, via="orm"); stats["orm_table_refs"] += 1
        else:
            fname = None
        if target:
            stats["calls_resolved_" + how] += 1
            edge("calls", did, target, line=n.lineno)
            if len(sample_resolved) < 4000:
                sample_resolved.append((info["rel"], n.lineno, ast.unparse(n.func)[:60], target))
        elif how in ("ext",):
            stats["calls_external"] += 1
        elif how == "http":
            stats["calls_http_test_client"] += 1
        else:
            if fname and all_def_names.get(fname):
                stats["calls_unresolved_name_matches_repo_def"] += 1
                unres_names[ast.unparse(f)[:50]] += 1
            else:
                stats["calls_unresolved_other"] += 1
                if fname:
                    ext_names[fname] += 1

# ---------- routes ----------
routers = {}   # (mod, var) -> prefix
for rel, (tree, src) in trees.items():
    mod = modname(rel)
    for st in tree.body:
        if isinstance(st, ast.Assign) and isinstance(st.value, ast.Call) and ast.unparse(st.value.func) == "APIRouter":
            pre = ""
            for k in st.value.keywords:
                if k.arg == "prefix" and isinstance(k.value, ast.Constant):
                    pre = k.value.value
            for t in st.targets:
                if isinstance(t, ast.Name):
                    routers[(mod, t.id)] = pre
mount = {}
mtree, _ = trees["backend/app/main.py"]
for n in ast.walk(mtree):
    if isinstance(n, ast.Call) and ast.unparse(n.func).endswith("include_router") and n.args:
        pre = next((k.value.value for k in n.keywords if k.arg == "prefix"), "")
        nm = ast.unparse(n.args[0])
        tm, attr = mod_imports["app.main"].get(nm, (None, None))
        mount[(tm, attr)] = pre
        edge("includes_router", "file:backend/app/main.py", "file:" + mod2rel.get(tm, "?"), prefix=pre)
routes = []
for did, info in defs.items():
    if info["kind"] not in ("function",):
        continue
    for dec in info["node"].decorator_list:
        if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and isinstance(dec.func.value, ast.Name):
            key = (info["mod"], dec.func.value.id)
            if key in routers and dec.func.attr in ("get", "post", "put", "patch", "delete") and dec.args and isinstance(dec.args[0], ast.Constant):
                full = mount.get(key, "?") + routers[key] + dec.args[0].value
                rid = node(f"route:{dec.func.attr.upper()} {full}", "route", method=dec.func.attr.upper(), path=full, handler=did)
                edge("registers_route", rid, did)
                routes.append(dict(id=rid, method=dec.func.attr.upper(), path=full, handler=did, mounted=key in mount))
                for k in dec.keywords:
                    if k.arg == "dependencies":
                        for e in ast.walk(k.value):
                            if isinstance(e, ast.Call) and ast.unparse(e.func) == "Depends" and e.args and isinstance(e.args[0], ast.Name):
                                r = lookup_name(info["mod"], e.args[0].id)
                                if isinstance(r, str):
                                    edge("depends_injects", did, r, param="dependencies")

# ---------- tables, columns, FKs ----------
ncols = 0
for cid, tname in tables.items():
    node("table:" + tname, "table", name=tname, model=cid)
    edge("maps_table", cid, "table:" + tname)
    for st in defs[cid]["node"].body:
        tgt = st.target if isinstance(st, ast.AnnAssign) else (st.targets[0] if isinstance(st, ast.Assign) and len(st.targets) == 1 else None)
        val = st.value if isinstance(st, (ast.AnnAssign, ast.Assign)) else None
        if isinstance(tgt, ast.Name) and isinstance(val, ast.Call) and ast.unparse(val.func) in ("mapped_column", "Column", "sa.Column"):
            ncols += 1
            colid = node(f"column:{tname}.{tgt.id}", "column", table=tname, name=tgt.id)
            edge("has_column", "table:" + tname, colid)
            for e in ast.walk(val):
                if isinstance(e, ast.Call) and ast.unparse(e.func) in ("ForeignKey", "sa.ForeignKey") and e.args and isinstance(e.args[0], ast.Constant):
                    edge("foreign_key", colid, "column:" + e.args[0].value)

# ---------- settings ----------
cfg_tree, _ = trees["backend/app/core/config.py"]
settings_fields = []
for n in ast.walk(cfg_tree):
    if isinstance(n, ast.ClassDef) and n.name == "Settings":
        for st in n.body:
            if isinstance(st, ast.AnnAssign) and isinstance(st.target, ast.Name):
                settings_fields.append(st.target.id)
                node("setting:" + st.target.id, "setting", env="FIXFLOW_" + st.target.id.upper())

# ---------- migrations ----------
migs = {}
mig_ops = Counter()
for rel, (tree, src) in trees.items():
    if "/alembic/versions/" not in rel:
        continue
    rev = down = None
    for st in tree.body:
        if isinstance(st, (ast.Assign, ast.AnnAssign)):
            tgt = st.targets[0] if isinstance(st, ast.Assign) else st.target
            if isinstance(tgt, ast.Name) and tgt.id in ("revision", "down_revision") and isinstance(st.value, ast.Constant):
                if tgt.id == "revision": rev = st.value.value
                else: down = st.value.value
    mid = node("migration:" + str(rev), "migration", path=rel)
    migs[rev] = down
    if down:
        edge("migration_follows", mid, "migration:" + down)
    for n in ast.walk(tree):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and isinstance(n.func.value, ast.Name) and n.func.value.id == "op":
            mig_ops[n.func.attr] += 1
            for a in n.args[:2]:
                if isinstance(a, ast.Constant) and isinstance(a.value, str) and a.value in table_names:
                    edge("migration_touches", mid, "table:" + a.value, op=n.func.attr)
                    break
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and len(n.value) > 12:
            for m in SQL_RE.finditer(n.value):
                if m.group(2) in table_names:
                    edge("migration_touches", mid, "table:" + m.group(2), op="sql")

# ---------- tests ----------
test_funcs = [d for d, i in defs.items() if i["node"].name.startswith("test_") and i["kind"] in ("function", "method")]
fixture_uses = Counter()
for d in test_funcs:
    for a in defs[d]["node"].args.args:
        fixture_uses[a.arg] += 1

# ---------- outputs ----------
ec = Counter(e[0] for e in edges)
nc = Counter(v["type"] for v in nodes.values())
cal = [e for e in edges if e[0] == "calls"]
distinct_calls = set((e[1], e[2]) for e in cal)
indeg = Counter(e[2] for e in cal)
res = dict(
    files=len(trees), node_counts=nc, edge_counts=ec, nested_defs=nested, stats=stats,
    distinct_call_edges=len(distinct_calls), routes=len(routes), routes_unmounted=sum(1 for r in routes if not r["mounted"]),
    routers=len(routers), tables=len(tables), columns=ncols, settings_fields=len(settings_fields),
    settings_distinct_used=len(settings_uses), settings_unused=sorted(set(settings_fields) - set(settings_uses)),
    migrations=len(migs), mig_ops=mig_ops, test_functions=len(test_funcs), top_fixtures=fixture_uses.most_common(12),
    top_unresolved_repo_named=unres_names.most_common(400), top_unresolved_other=ext_names.most_common(40),
    top_call_indegree=[(k, v) for k, v in indeg.most_common(25)], elapsed_s=round(time.time() - T0, 2),
)
print(json.dumps(res, indent=1, default=str))
json.dump(dict(nodes=nodes, edges=edges, routes=routes, sample_resolved=sample_resolved), open(OUT, "w"), default=str)
