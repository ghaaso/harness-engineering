"""Documented items (lifecycle audit, HANDOFF section 4, CLAUDE.md invariants) and their code anchors.

Item parsing is the scoring lane's doc_chains.py, unchanged. Anchors are resolved at a given commit:
  file anchor   backticked token with a code extension (optionally :line), brace groups expanded,
                plus bare NAME.ext:line outside backticks; resolved by exact path, unique path
                suffix, or a suffix sharing a directory with a file already resolved in the item.
  symbol anchor backticked identifier, dotted identifier or call (`foo()`, `repo.try_transition`);
                a plain lowercase word is skipped unless written as a call (it is prose: `ready`);
                resolved against the canonical definitions of every code file at that commit
                (full dotted suffix, then last component narrowed by the module/class hint, then
                class or object attributes -> their owner definition); test definitions only when
                nothing else matches; several candidates are narrowed by files named in the item,
                then by slice folders named in the item; still several = ambiguous (dropped).
"""
import collections, re
from common import Blobs, classify, defs_for, git, is_test_path, CODE_EXT

DOCS = [("lifecycle_audit", "docs/lifecycle-audit-followups-2026-07.md"),
        ("handoff_s4", "docs/HANDOFF-2026-07-28-open-work.md"),
        ("claude_md_invariants", "CLAUDE.md")]


def items_lifecycle(txt):
    parts = re.split(r"\n(?=### |## Test-layer|## Deferred)", txt)
    return [(p.splitlines()[0][:80], p) for p in parts if p.startswith(("### ", "## Test-layer"))]


def items_handoff(txt):
    s4 = txt.split("## 4. Issue register", 1)[1].split("## 5. Unfinished", 1)[0]
    items = []
    for m in re.finditer(r"\*\*([A-C]\d)\. (.*?)(?=\n\*\*[A-C]\d\. |\n### |\Z)", s4, re.S):
        items.append((m.group(1) + " " + m.group(2)[:60], m.group(0)))
    tbl = s4.split("### 4.4", 1)[1].split("### 4.5", 1)[0]
    for row in tbl.splitlines():
        if row.startswith("| ") and not row.startswith("| Slice") and not row.startswith("| ---"):
            items.append(("4.4 " + row[:70], row))
    c45 = s4.split("### 4.5", 1)[1]
    for m in re.finditer(r"\n(\d)\. (.*?)(?=\n\d\. |\Z)", c45, re.S):
        items.append(("4.5." + m.group(1) + " " + m.group(2)[:60], m.group(0)))
    return items


def items_claude(txt):
    inv = txt.split("## Invariants you must respect", 1)[1].split("\n## Where things live", 1)[0]
    out = []
    for m in re.finditer(r"\n- (.*?)(?=\n- |\n### |\Z)", inv, re.S):
        out.append((m.group(1)[:70], m.group(0)))
    return out


PARSERS = {"lifecycle_audit": items_lifecycle, "handoff_s4": items_handoff, "claude_md_invariants": items_claude}

TOK = re.compile(r"`([^`]+)`")
FILE = re.compile(r"([A-Za-z0-9_./\-\[\]{},]+\.(?:py|tsx|ts|jsx|js|mjs|cjs))(?::[\d\-/:]+)?")
BARE = re.compile(r"(?<![`/\w.-])([A-Za-z0-9_]+\.(?:py|tsx|ts|jsx|js|mjs))(?::\d+)")
IDENT = re.compile(r"^[A-Za-z_$][\w$]*$")


def expand_braces(s):
    m = re.search(r"\{([^{}]*)\}", s)
    if not m:
        return [s]
    out = []
    for alt in m.group(1).split(","):
        out += expand_braces(s[:m.start()] + alt.strip() + s[m.end():])
    return out


def raw_anchors(body):
    """Ordered list of (pos, 'file'|'sym', text)."""
    out = []
    for m in TOK.finditer(body):
        t = m.group(1).strip()
        fm = list(FILE.finditer(t))
        if fm:
            for f in fm:
                for e in expand_braces(f.group(1)):
                    out.append((m.start(1) + f.start(), "file", e))
            continue
        out.append((m.start(1), "sym", t))
    taken = {p for p, _, _ in out}
    for m in BARE.finditer(body):
        if m.start(1) not in taken:
            out.append((m.start(1), "file", m.group(1)))
    return sorted(out)


def sym_key(t):
    base = re.sub(r"\(.*\)$", "", t.strip())
    parts = base.split(".")
    if not parts or not all(IDENT.match(p) for p in parts):
        return None
    last = parts[-1]
    called = t.strip().endswith(")")
    if len(last) < 3:
        return None
    wordlike = last.islower() and "_" not in last
    if wordlike and not called:
        return None
    return base, parts


class Index:
    """Files and canonical definitions of every code file at one commit."""

    def __init__(self, sha, blobs):
        self.sha = sha
        self.files = [f for f in git("ls-tree", "-r", "--name-only", sha).split("\n") if f]
        self.fileset = set(self.files)
        code = [f for f in self.files if f.lower().endswith(CODE_EXT) and classify(f)[0] != "other"
                and "node_modules/" not in f]
        res = defs_for([(f, f, blobs.get(sha, f)) for f in code])
        self.defs, self.by_last, self.attrs = [], collections.defaultdict(list), collections.defaultdict(list)
        self.inner = collections.defaultdict(list)
        for f in code:
            r = res[f]
            byname = {d["name"]: d for d in r["defs"]}
            for d in r["defs"]:
                rec = {"path": f, **d}
                self.defs.append(rec)
                self.by_last[d["name"].split(".")[-1]].append(rec)
            for a in r.get("attrs", []):
                own = byname.get(a["owner"])
                if own:
                    self.attrs[a["name"]].append({"path": f, **own})
            for a in r.get("inner", []):
                own = byname.get(a["owner"])
                if own:
                    self.inner[a["name"]].append({"path": f, **own})

    def resolve_file(self, name, ctx_dirs):
        name = name.lstrip("./")
        if name in self.fileset:
            return name, "exact"
        hits = [f for f in self.files if f.endswith("/" + name)]
        if len(hits) == 1:
            return hits[0], "suffix"
        if len(hits) > 1:
            pref = [h for h in hits if any(h.startswith(d) for d in ctx_dirs)]
            if len(pref) == 1:
                return pref[0], "suffix+ctx"
            return None, "ambiguous"
        return None, "missing"

    def resolve_sym(self, base, parts, item_files, text):
        last = parts[-1]
        hint = parts[-2].lower() if len(parts) >= 2 else None
        test_ok = last.lower().startswith("test")

        def narrow_hint(cs):
            if not hint or len(cs) <= 1:
                return cs
            n = [c for c in cs if c["path"].rsplit("/", 1)[-1].split(".")[0].lower() == hint
                 or c["name"].split(".")[0].lower() == hint or ("/" + hint + "/") in c["path"].lower()]
            return n or cs

        def usable(cs):
            # a test file's definitions (often local fakes) only answer a test name or a named test file
            return [c for c in cs if test_ok or not is_test_path(c["path"]) or c["path"] in item_files]
        stages = []
        if len(parts) >= 2:
            stages.append(("def", [d for d in self.defs if d["name"] == base or d["name"].endswith("." + base)]))
        stages += [("def", list(self.by_last.get(last, []))), ("attr", list(self.attrs.get(last, []))),
                   ("inner", list(self.inner.get(last, [])))]
        cands, via = [], None
        for via, cs in stages:
            cands = narrow_hint(usable(cs))
            if cands:
                break
        uniq = {}
        for c in cands:
            uniq[(c["path"], c["name"], c["occ"])] = c
        cands = list(uniq.values())
        prod = [c for c in cands if not is_test_path(c["path"])]
        if prod:
            cands = prod
        if len(cands) > 1:
            n = [c for c in cands if c["path"] in item_files]
            if n:
                cands = n
        if len(cands) > 1:
            slices = set(re.findall(r"(?:features/)?([a-z_]+)/", text))
            n = [c for c in cands if any(f"/features/{s}/" in c["path"] or f"/{s}/" in c["path"] for s in slices)]
            if n:
                cands = n
        if len(cands) == 1:
            return cands[0], via
        return None, ("ambiguous" if cands else "missing")


def resolve_item(body, idx):
    """-> ordered anchors [{pos, type, text, status, path, def}] resolved at idx.sha."""
    raw = raw_anchors(body)
    out, files_named, dirs = [], set(), set()
    for pos, typ, t in raw:
        if typ == "file":
            p, how = idx.resolve_file(t, dirs)
            if p:
                files_named.add(p)
                dirs.add(p.rsplit("/", 1)[0] + "/")
                if classify(p)[0] in ("code", "test", "migration", "config_code"):
                    out.append({"pos": pos, "type": "file", "text": t, "status": "ok", "path": p})
                else:
                    out.append({"pos": pos, "type": "file", "text": t, "status": "not_code", "path": p})
            else:
                out.append({"pos": pos, "type": "file", "text": t, "status": how})
    for pos, typ, t in raw:
        if typ != "sym":
            continue
        k = sym_key(t)
        if not k:
            continue
        d, how = idx.resolve_sym(k[0], k[1], files_named, body)
        if d:
            out.append({"pos": pos, "type": "sym", "text": t, "status": "ok", "via": how, "path": d["path"],
                        "def": {kk: d[kk] for kk in ("name", "kind", "start", "end", "occ")}})
        else:
            out.append({"pos": pos, "type": "sym", "text": t, "status": how})
    return sorted(out, key=lambda a: a["pos"])


def doc_items(sha=None):
    from common import FROZEN
    sha = sha or FROZEN
    out = []
    for label, path in DOCS:
        txt = git("show", f"{sha}:{path}")
        for title, body in PARSERS[label](txt):
            out.append({"doc": label, "doc_path": path, "item": title, "body": body})
    return out
