"""cmap: operational corpus map prototype (experimental successor 09-operational, not an adopted design).

Implements the method in ../METHOD.md. It extends the proposed design (04-design/design.md) only through the
deltas listed there (D-*), and never edits the frozen design, E1 or the historical evaluators.

Stores (one directory per map, `--store`):
  committed map   s1.jsonl (S1 attested records), s2.jsonl (codebook decisions), s3.jsonl (identity decisions),
                  s4.jsonl (gap annotations)
  candidate index candidates.jsonl (S5 only; read by `find`/`candidates` and the labelled packet section only)
  coverage ledger chunks.jsonl + ledger.json (read / linked / unresolved per file version)
  derived         index.json, results/ (S6 caches; recomputable, never read as base facts)

Run with: python -I -B cmap.py <command> --store DIR ...   (`python cmap.py -h` lists commands)
"""
import argparse
import hashlib
import json
import posixpath
import re
import sys
import time
import urllib.parse
from collections import Counter, defaultdict, deque
from pathlib import Path

METHOD_VERSION = "cmap-0.1"
CHUNK_MAX = 6000          # characters a reader may receive as its own read range (context lines are extra)
CHUNK_MIN = 2400          # small sections merge forward until this size (never beyond CHUNK_MAX)
GAP_CLAIM_KINDS = {"decision", "recommendation", "conclusion"}
READER_TYPES = {"edge", "intro", "identity", "reldef", "untyped", "header", "claim", "idscheme"}
ID_TOKEN = re.compile(r"(?<![A-Za-z0-9])[A-Z][A-Z]{0,5}(?:-[A-Z]{1,5})*-?\d{1,3}(?![A-Za-z0-9])")
LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
ARROW = re.compile(r"\s*(-{2,3}>|-\.->|={2,3}>|-{3})(\|[^|]*\|)?\s*")
NODE = re.compile(r"^([A-Za-z][A-Za-z0-9_]*)\s*(\[\(|\(\(|\[\[|\[|\(|\{|>)?")
ABBR = {"clinic-planning-brief.md": "BR", "README.md": "RM", "architecture.md": "AR", "decision-log.md": "DL",
        "implementation-plan.md": "IP", "operations-and-costs.md": "OC", "contracts-and-permissions.md": "CP",
        "domain-and-data-model.md": "DM", "requirements-traceability.md": "RT", "system-dynamics.md": "SD",
        "reading-coverage.md": "RC"}


# ----------------------------------------------------------------------------------------------- basic helpers
def ws(s):
    return " ".join(str(s or "").split())


def sha(b):
    return hashlib.sha256(b if isinstance(b, bytes) else b.encode("utf-8")).hexdigest()


def tok(s):
    return max(1, round(len(s) / 4))


def jload(p, default=None):
    p = Path(p)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def jlines(p):
    p = Path(p)
    if not p.exists():
        return []
    return [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]


def jwrite(p, obj):
    Path(p).write_text(json.dumps(obj, indent=1, ensure_ascii=False), encoding="utf-8")


def jwrite_lines(p, rows):
    Path(p).write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")


def abbr(path):
    name = posixpath.basename(path)
    return ABBR.get(name) or "".join(w[0] for w in re.split(r"[-_. ]", name) if w).upper()[:3]


def span_lines(s):
    nums = [int(n) for n in re.findall(r"\d+", str(s))] or [0]
    return min(nums), max(nums)


def slug(text):
    """GitHub-style heading anchor."""
    t = ws(text).lower()
    t = re.sub(r"[^\w\- ]", "", t)
    return t.replace(" ", "-")


def norm_map(s, strip_markup):
    out, idx, prev = [], [], False
    for i, ch in enumerate(s):
        if strip_markup and ch in "*`":
            continue
        if ch.isspace():
            if prev:
                continue
            out.append(" ")
            idx.append(i)
            prev = True
        else:
            out.append(ch)
            idx.append(i)
            prev = False
    return "".join(out), idx


def locate(text, quote):
    """Find quote in text: exact, then whitespace-normalised, then markup-stripped. -> (start, end, level) or None."""
    if not quote:
        return None
    i = text.find(quote)
    if i >= 0:
        return i, i + len(quote), "exact"
    for strip in (False, True):
        nt, idx = norm_map(text, strip)
        nq, _ = norm_map(quote, strip)
        nq = nq.strip()
        if not nq:
            continue
        j = nt.find(nq)
        if j >= 0:
            return idx[j], idx[j + len(nq) - 1] + 1, "markup-stripped" if strip else "whitespace"
    return None


def id_tokens(text):
    return ID_TOKEN.findall(text or "")


def expand_ids(text):
    """IDs a list or range mentions (reporting and candidate generation only; never identity)."""
    out = []
    for m in re.finditer(r"(?<![A-Za-z0-9])([A-Z][A-Z]{0,5}(?:-[A-Z]{1,5})*-?)(\d{1,3})((?:/\d{1,3})+)", text):
        pre, first = m.group(1), m.group(2)
        out += [pre + first] + [pre + n.zfill(len(first)) for n in m.group(3).strip("/").split("/")]
    for m in re.finditer(r"(?<![A-Za-z0-9])([A-Z][A-Z]{0,5}(?:-[A-Z]{1,5})*-?)(\d{1,3})\s*[–-]\s*(?:\1)?(\d{1,3})(?![0-9])", text):
        a, b = int(m.group(2)), int(m.group(3))
        if 0 < b - a <= 40:
            out += [m.group(1) + str(n).zfill(len(m.group(2))) for n in range(a, b + 1)]
    for t in id_tokens(text):
        if t not in out:
            out.append(t)
    return out


# ------------------------------------------------------------------------------------------- markdown structure
def scan_blocks(lines):
    """Fence ranges (1-based inclusive), table runs and heading lines."""
    fences, tables, headings = [], [], []
    i, n = 0, len(lines)
    while i < n:
        s = lines[i].strip()
        if s.startswith("```") or s.startswith("~~~"):
            mark = s[:3]
            j = i + 1
            while j < n and not lines[j].strip().startswith(mark):
                j += 1
            fences.append((i + 1, min(j + 1, n), lines[i].strip()[3:].strip()))
            i = j + 1
            continue
        if s.startswith("|"):
            j = i
            while j < n and lines[j].strip().startswith("|"):
                j += 1
            tables.append((i + 1, j))
            i = j
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", lines[i])
        if m:
            headings.append((i + 1, len(m.group(1)), m.group(2).strip()))
        i += 1
    return fences, tables, headings


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def chunk_file(path, text):
    """Deterministic, edit-local chunking: heading sections; tiny sections merge forward; large sections split at
    blank lines or table-row boundaries (continuations carry the table header as context)."""
    lines = text.splitlines()
    fences, tables, headings = scan_blocks(lines)
    starts = sorted({1} | {h[0] for h in headings})
    sections = [(s, (starts[k + 1] - 1) if k + 1 < len(starts) else len(lines)) for k, s in enumerate(starts)]
    sections = [s for s in sections if s[0] <= s[1]]
    size = lambda a, b: sum(len(lines[i - 1]) + 1 for i in range(a, b + 1))
    merged, cur = [], None
    for a, b in sections:
        if cur is None:
            cur = [a, b]
        elif size(*cur) < CHUNK_MIN and size(cur[0], b) <= CHUNK_MAX:
            cur[1] = b
        else:
            merged.append(tuple(cur))
            cur = [a, b]
    if cur:
        merged.append(tuple(cur))
    in_fence = lambda ln: any(f[0] <= ln <= f[1] for f in fences)
    table_of = lambda ln: next((t for t in tables if t[0] <= ln <= t[1]), None)
    pieces = []
    for a, b in merged:
        if size(a, b) <= CHUNK_MAX:
            pieces.append((a, b))
            continue
        start, acc = a, 0
        for ln in range(a, b + 1):
            acc += len(lines[ln - 1]) + 1
            nxt = ln + 1
            boundary = nxt <= b and not in_fence(nxt) and (not lines[ln - 1].strip() or (
                table_of(ln) and table_of(nxt) == table_of(ln) and ln >= table_of(ln)[0] + 1))
            if acc >= CHUNK_MAX * 0.75 and boundary:
                pieces.append((start, ln))
                start, acc = nxt, 0
        if start <= b:
            pieces.append((start, b))
    out, seen = [], Counter()
    for a, b in pieces:
        body = "\n".join(lines[a - 1:b])
        ctx = []
        hs = [h for h in headings if h[0] < a]
        crumb, levels = [], {}
        for h in hs:
            levels = {k: v for k, v in levels.items() if k < h[1]}
            levels[h[1]] = h
        crumb = [levels[k] for k in sorted(levels)]
        ctx += [(h[0], lines[h[0] - 1]) for h in crumb]
        t = table_of(a)
        if t and a > t[0]:
            ctx += [(t[0], lines[t[0] - 1])] + ([(t[0] + 1, lines[t[0]])] if t[0] + 1 < a else [])
        f = next((f for f in fences if f[0] < a <= f[1]), None)
        if f:
            ctx.append((f[0], lines[f[0] - 1]))
        base = f"{abbr(path)}-{sha(abbr(path) + chr(10) + body)[:10]}"
        seen[base] += 1
        cid = base if seen[base] == 1 else f"{base}-{seen[base]}"
        out.append({"id": cid, "file": path, "start": a, "end": b, "text_sha": sha(body), "chars": len(body),
                    "context": [[n, t] for n, t in sorted(set((n, t) for n, t in ctx))]})
    return out


def structural_records(path, version, text, chunks):
    """Deterministic S1 records (actor: structural pass): headings, mermaid declarations and arrows, table row keys
    (E1 exact `ID` header; D-IDLED for ID-led first-column keys under a header containing the word ID)."""
    lines = text.splitlines()
    fences, tables, headings = scan_blocks(lines)
    chunk_of = lambda ln: next(c["id"] for c in chunks if c["start"] <= ln <= c["end"])
    recs, n = [], Counter()

    def add(ln, rec):
        cid = chunk_of(ln)
        n[cid] += 1
        rec.update({"id": f"{cid}.s{n[cid]:03d}", "status": "S1", "file": path, "version": version, "chunk": cid,
                    "actor": "structural", "actor_type": "automated"})
        recs.append(rec)

    for ln, level, title in headings:
        lead = ID_TOKEN.match(title)
        aliases = [lead.group(0)] if lead and re.match(r"^\S+\s*([—–:-]|$)", title) else []
        add(ln, {"type": "intro", "intro_kind": "heading", "lines": str(ln), "quote": title, "name": title,
                 "level": level, "anchor": slug(title), "aliases": aliases,
                 "rule": "RP-2" + (" + D-IDLED (leading ID alias)" if aliases else "")})
    for a, b in tables:
        head = cells(lines[a - 1])
        if b - a < 2 or not re.match(r"^\s*\|\s*:?-", lines[a]):
            continue
        id_col = head.index("ID") if "ID" in head else None
        idled = id_col is None and head and re.search(r"\bID\b", head[0])
        for ln in range(a + 2, b + 1):
            row = cells(lines[ln - 1])
            if id_col is not None and id_col < len(row) and row[id_col]:
                add(ln, {"type": "intro", "intro_kind": "rowkey", "lines": str(ln), "quote": row[id_col],
                         "name": row[id_col], "aliases": [row[id_col]] if ID_TOKEN.fullmatch(row[id_col]) else [],
                         "table": {"header_line": a, "column": id_col, "header": "ID"}, "rule": "D-E1 (E1 applied experimentally)"})
            elif idled and row and row[0]:
                m = ID_TOKEN.match(row[0])
                if m:
                    add(ln, {"type": "intro", "intro_kind": "rowkey", "lines": str(ln), "quote": row[0], "name": row[0],
                             "aliases": [m.group(0)], "table": {"header_line": a, "column": 0, "header": head[0]},
                             "rule": "D-IDLED (ID-led key under compound ID header)"})
    for fa, fb, lang in fences:
        if lang != "mermaid":
            continue
        block = f"{abbr(path)}-B{fa}"
        declared = set()
        for ln in range(fa + 1, fb):
            raw = lines[ln - 1].strip()
            if not raw or raw.startswith(("flowchart", "graph", "end", "%%", "classDef", "style")):
                continue
            if raw.startswith("subgraph"):
                m = re.match(r"subgraph\s+([A-Za-z][\w]*)\s*\[(.*)\]", raw)
                if m and m.group(1) not in declared:
                    declared.add(m.group(1))
                    add(ln, {"type": "intro", "intro_kind": "node-declaration", "lines": str(ln), "quote": raw,
                             "name": m.group(2), "node_id": m.group(1), "block_id": block, "rule": "RP-2 / ID-3 d"})
                continue
            parts = ARROW.split(raw)
            nodes, arrows = parts[0::3], [(parts[i], parts[i + 1]) for i in range(1, len(parts) - 1, 3)]
            ends = []
            for frag in nodes:
                frag = frag.strip()
                m = NODE.match(frag)
                if not m:
                    ends.append(None)
                    continue
                nid = m.group(1)
                ends.append((nid, frag))
                if m.group(2) and nid not in declared:
                    declared.add(nid)
                    label = re.sub(r"^[\[\(\{>]+|[\]\)\}]+$", "", frag[len(nid):].strip())
                    add(ln, {"type": "intro", "intro_kind": "node-declaration", "lines": str(ln), "quote": frag,
                             "name": label, "node_id": nid, "block_id": block, "rule": "RP-2 / ID-3 d"})
            for k, (arrow, lab) in enumerate(arrows):
                a_, b_ = ends[k], ends[k + 1] if k + 1 < len(ends) else None
                label = arrow + (lab or "")
                expr = lambda e: [{"quote": e[0], "lines": str(ln), "type": "name", "block_id": block, "node_id": e[0]}] if e else []
                add(ln, {"type": "edge", "lines": str(ln), "quote": raw, "label": label, "cue_class": "diagram-arrow",
                         "arg1": expr(a_), "arg2": expr(b_), "joint": False, "block_id": block, "rule": "RP-3 (diagram arrow)"})
    return recs


# ----------------------------------------------------------------------------------------------------- the store
class Store:
    def __init__(self, root):
        self.root = Path(root)
        self.manifest = jload(self.root / "manifest.json", {})
        self.chunks = {c["id"]: c for c in jlines(self.root / "chunks.jsonl")}
        self.s1 = jlines(self.root / "s1.jsonl")
        self.s2 = jlines(self.root / "s2.jsonl")
        self.s3 = jlines(self.root / "s3.jsonl")
        self.s4 = jlines(self.root / "s4.jsonl")

    @property
    def corpus(self):
        return (self.root / self.manifest["corpus_root"]).resolve()

    def save(self, parts=("manifest", "chunks", "s1", "s2", "s3", "s4")):
        if "manifest" in parts:
            jwrite(self.root / "manifest.json", self.manifest)
        if "chunks" in parts:
            jwrite_lines(self.root / "chunks.jsonl", sorted(self.chunks.values(), key=lambda c: (c["file"], c["start"])))
        for k in ("s1", "s2", "s3", "s4"):
            if k in parts:
                jwrite_lines(self.root / f"{k}.jsonl", getattr(self, k))

    def log(self, event):
        event = dict(event, at=time.strftime("%Y-%m-%dT%H:%M:%S"))
        with open(self.root / "ledger_events.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")

    def lines(self, path):
        return (self.corpus / path).read_bytes().decode("utf-8").splitlines()

    def live(self):
        """Current S1 records (superseded ones are kept in the file but excluded)."""
        return [r for r in self.s1 if not r.get("superseded")]

    def freshness(self, corpus=None):
        """Compare registered file versions with the corpus on disk. -> {path: 'current'|'changed'|'missing'}"""
        root = Path(corpus).resolve() if corpus else self.corpus
        out = {}
        for path, f in self.manifest["files"].items():
            p = root / path
            out[path] = "missing" if not p.exists() else ("current" if sha(p.read_bytes()) == f["sha256"] else "changed")
        return out


def cmd_init(a):
    root, corpus = Path(a.store), Path(a.corpus).resolve()
    if (root / "manifest.json").exists():
        raise SystemExit("store exists; use refresh")
    root.mkdir(parents=True, exist_ok=True)
    rel = posixpath.relpath(corpus.as_posix(), root.resolve().as_posix())
    st = Store(root)
    st.manifest = {"method": METHOD_VERSION, "corpus_root": rel, "files": {}, "created": time.strftime("%Y-%m-%d")}
    for p in sorted(corpus.rglob("*.md")):
        path = p.relative_to(corpus).as_posix()
        register_file(st, path, p.read_bytes())
    st.save()
    st.log({"op": "init", "files": len(st.manifest["files"]), "chunks": len(st.chunks)})
    print(f"initialised {root}: {len(st.manifest['files'])} files, {len(st.chunks)} chunks, {len(st.s1)} structural records")


def register_file(st, path, raw):
    text = raw.decode("utf-8")
    version = sha(raw)
    chunks = chunk_file(path, text)
    for c in chunks:
        c.update({"version": version, "status": "unread", "reader": None})
        st.chunks[c["id"]] = c
    st.manifest["files"][path] = {"sha256": version, "lines": len(text.splitlines()), "chunks": [c["id"] for c in chunks]}
    st.s1 += structural_records(path, version, text, chunks)
    return chunks


# ----------------------------------------------------------------------------------------------------- reading
def cmd_chunks(a):
    st = Store(a.store)
    for c in sorted(st.chunks.values(), key=lambda c: (c["file"], c["start"])):
        if c["status"] == "retired" and not a.all:
            continue
        if a.pending and c["status"] != "unread":
            continue
        print(f"{c['id']}\t{c['status']}\t{c['file']}:{c['start']}-{c['end']}\t{c['chars']} chars")


def chunk_view(st, cid):
    c = st.chunks[cid]
    lines = st.lines(c["file"])
    out = [f"CHUNK {cid}  file={c['file']}  lines {c['start']}-{c['end']}  version={c['version'][:12]}",
           "Context lines (read-only, outside your range; do not record them):"]
    out += [f"  {n:>4}| {t}" for n, t in c["context"]] or ["  (none)"]
    out.append("Your range (record only from these lines):")
    out += [f"{n:>4}| {lines[n - 1]}" for n in range(c["start"], c["end"] + 1)]
    links = [(n, m.group(0)) for n in range(c["start"], c["end"] + 1) for m in LINK.finditer(lines[n - 1])]
    out.append("Markdown links in range (each must appear in some record; bare links get an automatic '(link)' edge): "
               + ("; ".join(f"{n}: {l}" for n, l in links) or "none"))
    return "\n".join(out)


def cmd_chunk_show(a):
    print(chunk_view(Store(a.store), a.chunk))


def validate_expr(e, lines, c, default_lines):
    e = dict(e)
    e.setdefault("lines", default_lines)
    lo, hi = span_lines(e["lines"])
    if lo < c["start"] or hi > c["end"]:
        ctx = {n for n, _ in c["context"]}
        if not ({lo, hi} <= ctx):
            return None, f"expression lines {e['lines']} outside chunk"
    text = "\n".join(lines[lo - 1:hi])
    loc = locate(text, e.get("quote"))
    if not loc:
        return None, f"expression quote not found at {e['lines']}: {str(e.get('quote'))[:60]!r}"
    e["match"] = loc[2]
    m = LINK.search(e["quote"])
    if m and not e.get("link_target"):
        e["link_target"] = m.group(2)
    e.setdefault("type", "name")
    q = e["quote"]
    if e.get("list") is None and len(q) <= 60 and (len(id_tokens(q)) >= 2 or re.search(r"[A-Z]-?\d+/\d", q)):
        e["list"] = "range" if re.search(r"\d\s*[–-]\s*[A-Z]*-?\d", q) else "list"
    return e, None


def cmd_ingest(a):
    st = Store(a.store)
    c = st.chunks[a.chunk]
    if c["status"] == "retired":
        raise SystemExit("chunk retired")
    lines = st.lines(c["file"])
    raw = [json.loads(l) for l in Path(a.file).read_text(encoding="utf-8").splitlines() if l.strip()]
    st.s1 = [r for r in st.s1 if not (r["chunk"] == c["id"] and r.get("actor") != "structural")]
    ok, rejects, k = [], [], 0
    for r in raw:
        why = None
        t = r.get("type")
        if t not in READER_TYPES:
            why = f"unknown type {t!r}"
        else:
            lo, hi = span_lines(r.get("lines", "0"))
            ctx = {n for n, _ in c["context"]}
            in_range = c["start"] <= lo and hi <= c["end"]
            if not in_range and not (t == "header" and {lo, hi} <= ctx):
                why = f"lines {r.get('lines')} outside chunk {c['start']}-{c['end']}"
            else:
                loc = locate("\n".join(lines[lo - 1:hi]), r.get("quote"))
                if not loc:
                    why = f"quote not found at {r.get('lines')}: {str(r.get('quote'))[:60]!r}"
        if not why and t == "edge":
            for slot in ("arg1", "arg2"):
                fixed = []
                for e in r.get(slot) or []:
                    ee, err = validate_expr(e, lines, c, r["lines"])
                    if err:
                        why = f"{slot}: {err}"
                        break
                    fixed.append(ee)
                r[slot] = fixed
                if why:
                    break
            if not why and r.get("table"):
                hl = r["table"].get("header_line")
                if not hl or ws(r.get("label")) not in [ws(x) for x in cells(lines[hl - 1])]:
                    why = "table edge label is not a header cell of the stated header line"
        if not why and t == "identity":
            for side in ("a", "b"):
                ee, err = validate_expr(r.get(side) or {}, lines, c, r["lines"])
                if err:
                    why = f"identity {side}: {err}"
                    break
                r[side] = ee
        if why:
            rejects.append({"chunk": c["id"], "record": r, "reason": why})
            continue
        base = {"status": "S1", "file": c["file"], "version": c["version"], "chunk": c["id"], "actor": a.reader,
                "actor_type": "model reader", "match": loc[2]}
        items = [r]
        if t == "edge" and r.get("split") and not r.get("joint") and len(r.get("arg2") or []) > 1:
            items = [dict(r, arg2=[e], sibling_group=f"{c['id']}.r{len(ok) + 1:03d}") for e in r["arg2"]]
        for it in items:
            k += 1
            it = dict(it)
            it.pop("split", None)
            it.update(base)
            it["id"] = f"{c['id']}.{k:03d}"
            ok.append(it)
    covered = {(span_lines(e["lines"])[0], e.get("link_target")) for r in ok for s in ("arg1", "arg2", "a", "b")
               for e in (r.get(s) or [] if s.startswith("arg") else [r[s]] if r.get(s) else []) if e.get("link_target")}
    auto = 0
    for n in range(c["start"], c["end"] + 1):
        for m in LINK.finditer(lines[n - 1]):
            if (n, m.group(2)) not in covered:
                k += 1
                auto += 1
                ok.append({"type": "edge", "lines": str(n), "quote": m.group(0), "label": "(link)", "cue_class": "link",
                           "arg1": [], "arg2": [{"quote": m.group(0), "lines": str(n), "type": "name", "link_target": m.group(2),
                                                 "match": "exact"}], "joint": False, "id": f"{c['id']}.{k:03d}",
                           "status": "S1", "file": c["file"], "version": c["version"], "chunk": c["id"],
                           "actor": "structural", "actor_type": "automated", "rule": "RP-5 (bare link not recorded by reader)"})
    if getattr(a, "dry", False):
        print(f"VALIDATE {c['id']}: {len(ok)} records would be committed ({auto} automatic links), {len(rejects)} rejected")
        for r in rejects:
            print("  REJECT", r["reason"], "|", json.dumps(r["record"], ensure_ascii=False)[:200])
        return
    st.s1 += ok
    c.update({"status": "read", "reader": a.reader, "read_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
              "records": len(ok), "rejected": len(rejects), "auto_links": auto})
    with open(st.root / "rejects.jsonl", "a", encoding="utf-8") as f:
        for r in rejects:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    st.save(("chunks", "s1"))
    st.log({"op": "ingest", "chunk": c["id"], "records": len(ok), "rejected": len(rejects), "auto_links": auto, "reader": a.reader})
    print(f"{c['id']}: {len(ok)} records ({auto} automatic links), {len(rejects)} rejected")
    for r in rejects:
        print("  REJECT", r["reason"])


# ------------------------------------------------------------------------------------------------- resolution
class Map:
    """Resolution, gaps, chains and packets over one store at one level. Derived only (S6)."""

    def __init__(self, st, level="L3"):
        self.st, self.level = st, level
        self.recs = st.live()
        self.by_id = {r["id"]: r for r in self.recs}
        self.files = set(st.manifest["files"])
        self.intros = [r for r in self.recs if r["type"] == "intro"]
        self.edges = [r for r in self.recs if r["type"] == "edge"]
        self.heading = {}
        self.first_heading = {}
        self.nodes = {}
        for i in self.intros:
            if i.get("intro_kind") == "heading":
                self.heading.setdefault((i["file"], i["anchor"]), i["id"])
                self.first_heading.setdefault(i["file"], i["id"])
            if i.get("intro_kind") == "node-declaration":
                self.nodes[(i["block_id"], i["node_id"])] = i["id"]
        self.alias = defaultdict(list)          # (file, token) -> intro ids  (row keys, ID-led headings)
        for i in self.intros:
            for al in i.get("aliases") or []:
                self.alias[(i["file"], al)].append(i["id"])
        self.schemes = [r for r in self.recs if r["type"] == "idscheme"]
        self.identities = [r for r in self.recs if r["type"] == "identity"]
        self.codebook = self._codebook()
        # decisions whose spans in view changed are not applied until re-reviewed (no stale reasoning served as current)
        self.s3 = [d for d in st.s3 if not d.get("superseded") and not d.get("needs_review")] if level == "L3" else []
        self.s3_same = defaultdict(set)         # expression or item key -> referents
        self.s3_split = {}                      # expression key -> items
        self.s3_diff = []
        for d in self.s3:
            if d["value"] == "split":
                self.s3_split[d["expr"]] = [dict(it, key=f"{d['expr']}/i{n}") for n, it in enumerate(d["items"], 1)]
            elif d["value"] == "same":
                ref = d["referent"] if d.get("referent") else f"S3:{d['id']}"
                for m in d["members"]:
                    self.s3_same[m].add((ref, d["id"]))
            elif d["value"] == "different":
                self.s3_diff.append(d)
        self._memo = {}

    def _codebook(self):
        cb = {}
        if self.level == "L1":
            return cb
        for d in sorted((d for d in self.st.s2 if not d.get("superseded")), key=lambda d: d.get("version", 0)):
            for lab in d["labels"]:
                cur = cb.setdefault(ws(lab), {"direction": None, "consequence": None, "walkable": None, "source": []})
                for k in ("direction", "consequence", "walkable"):
                    if d.get(k) is not None:
                        cur[k] = d[k]
                cur["source"].append(d["id"])
        return cb

    # -- expressions
    def exprs(self, rec):
        for slot in ("arg1", "arg2"):
            for n, e in enumerate(rec.get(slot) or []):
                yield slot, n, e, f"{rec['id']}|{slot}|{n}"

    def slot_items(self, rec, slot):
        """Slot expressions; at L3 an analyst split replaces a list expression by its items."""
        out = []
        for n, e in enumerate(rec.get(slot) or []):
            key = f"{rec['id']}|{slot}|{n}"
            if self.level == "L3" and key in self.s3_split:
                out += [(dict(e, quote=it["text"], overlay_item=True), it["key"]) for it in self.s3_split[key]]
            else:
                out.append((e, key))
        return out

    def resolve(self, e, key, file):
        if key in self._memo:
            return self._memo[key]
        self._memo[key] = ([], [], None, "resolution cycle through identity statements")   # in-progress marker
        refs, basis, ext = {}, [], None
        if e.get("type") == "clause":
            r = (["C:" + key], [{"via": "clause (ID-2 b)"}], None, "resolved")
            self._memo[key] = r
            return r
        tgt = e.get("link_target")
        if tgt and not e.get("overlay_item"):
            path, _, anchor = urllib.parse.unquote(tgt).partition("#")
            if re.match(r"^[a-z]+:", path):
                ext = tgt
            else:
                rp = posixpath.normpath(posixpath.join(posixpath.dirname(file), path)) if path else file
                if rp not in self.files:
                    ext = rp
                elif anchor:
                    h = self.heading.get((rp, anchor.lower()))
                    if h:
                        refs[h] = "definition link (ID-3 a)"
                else:
                    refs["D:" + rp] = "whole-file link to a document referent (D-DOC)"
        text = ws(e.get("quote"))
        if e.get("block_id") and e.get("node_id"):
            r = self.nodes.get((e["block_id"], e["node_id"]))
            if r:
                refs[r] = "declared identifier (ID-3 d)"
        if not e.get("overlay_item"):
            lo, hi = span_lines(e.get("lines"))
            for i in self.intros:
                if i["file"] == file and span_lines(i["lines"])[0] <= hi and lo <= span_lines(i["lines"])[1] and ws(i.get("quote")) == text:
                    refs[i["id"]] = "introducing span (ID-3 c)"
            for idr in self.identities:
                if idr["file"] == file and text in (ws(idr["a"]["quote"]), ws(idr["b"]["quote"])):
                    side = "a" if ws(idr["b"]["quote"]) == text else "b"
                    other = idr[side]
                    if ws(other["quote"]) != text and f"{idr['id']}|ident-{side}" != key:
                        for rr in self.resolve(other, f"{idr['id']}|ident-{side}", file)[0]:
                            refs[rr] = f"explicit identity statement {idr['id']} (ID-3 b)"
            if ID_TOKEN.fullmatch(text):
                for s in self.schemes:
                    if s["file"] == file and scheme_covers(s, text):
                        tf = scheme_target(s, file)
                        for rr in self.alias.get((tf, text), []):
                            refs[rr] = f"ID-scheme statement {s['id']} (D-SCHEME)"
        if self.level == "L3":
            for ref, did in self.s3_same.get(key, ()):
                refs[ref] = f"S3 analyst hop {did}"
        for d in self.s3_diff:
            if key in d["members"]:
                basis.append({"via": f"S3 different {d['id']}"})
        uniq = sorted(refs)
        basis += [{"ref": r, "via": refs[r]} for r in uniq]
        if len(uniq) == 1:
            out = (uniq, basis, ext, "resolved")
        elif len(uniq) > 1:
            out = ([], basis, ext, "conflict: several reachable referents (ID-8)")
        else:
            out = ([], basis, ext, "external target outside mapped scope" if ext else "no resolution statement")
        self._memo[key] = out
        return out

    def referent_name(self, ref):
        if ref.startswith("D:"):
            h = self.first_heading.get(ref[2:])
            return f"document {ref[2:]}" + (f" ('{self.by_id[h]['name']}')" if h else "")
        if ref.startswith("C:"):
            return "proposition"
        if ref.startswith("S3:"):
            return f"analyst-created referent {ref}"
        r = self.by_id.get(ref)
        return r.get("name") if r else ref

    def kind(self, label):
        p = self.codebook.get(ws(label))
        if not p:
            return "inert", {"direction": None, "consequence": None, "walkable": None, "source": []}
        if p["walkable"] == "yes" and p["direction"] in ("toward_arg1", "toward_arg2"):
            return "walkable", p
        if p["walkable"] == "no":
            return "terminal", p
        return "inert", p

    # -- candidates (S5), computed for the candidate index only
    def candidates(self):
        names = defaultdict(list)
        for i in self.intros:
            for al in sorted(set([ws(i.get("name"))] + list(i.get("aliases") or []))):
                if al:
                    names[al.casefold()].append(i["id"])
        idx_tokens = defaultdict(set)
        for i in self.intros:
            for t in set(re.findall(r"[a-z0-9]{3,}", ws(i.get("name")).casefold())):
                idx_tokens[t].add(i["id"])
        out = []
        for rec in self.edges + self.identities:
            for slot, n, e, key in (self.exprs(rec) if rec["type"] == "edge" else
                                    [("a", 0, rec["a"], f"{rec['id']}|ident-a"), ("b", 0, rec["b"], f"{rec['id']}|ident-b")]):
                if e.get("type") == "clause":
                    continue
                text = ws(e.get("quote"))
                seen = set()
                for t in expand_ids(text):
                    for iid in names.get(t.casefold(), []):
                        if iid not in seen:
                            seen.add(iid)
                            out.append({"method": "exact-id-token", "score": 1.0, "expr": key, "intro": iid, "token": t})
                for iid in names.get(text.casefold(), []):
                    if iid not in seen:
                        seen.add(iid)
                        out.append({"method": "exact-name", "score": 1.0, "expr": key, "intro": iid})
                toks = set(re.findall(r"[a-z0-9]{3,}", text.casefold()))
                if toks:
                    pool = Counter(iid for t in sorted(toks) for iid in sorted(idx_tokens.get(t, ())))
                    for iid, hits in sorted(pool.items(), key=lambda kv: (-kv[1], kv[0]))[:3]:   # deterministic ties
                        if iid in seen:
                            continue
                        it = set(re.findall(r"[a-z0-9]{3,}", ws(self.by_id[iid].get("name")).casefold()))
                        j = hits / len(toks | it) if (toks | it) else 0
                        if j >= 0.34:
                            out.append({"method": "token-jaccard", "score": round(j, 2), "expr": key, "intro": iid})
        for n, c in enumerate(out, 1):
            c.update({"id": f"C{n:05d}", "status": "S5", "disposition": "open"})
        return out

    # -- gaps (S6)
    def named_in_scope(self, text):
        """Coverage check, not identity: does any committed introduction carry exactly this name or ID?"""
        if not hasattr(self, "_names"):
            self._names = set()
            for i in self.intros:
                self._names.add(ws(i.get("name")).casefold())
                self._names.update(a.casefold() for a in i.get("aliases") or [])
        t = ws(text).casefold()
        return t in self._names or any(x.casefold() in self._names for x in expand_ids(text))

    def gaps(self, _unused=None):
        out, unread = [], [c["id"] for c in self.st.chunks.values() if c["status"] == "unread"]
        for rec in self.edges:
            kind, props = self.kind(rec["label"])
            for slot in ("arg1", "arg2"):
                items = self.slot_items(rec, slot)
                if not items:
                    g = {"edge": rec["id"], "file": rec["file"], "slot": slot, "role": "dangling endpoint", "why": "absent slot",
                         "expr": None}
                    if props.get("consequence") == "fails_to_follow" and foundation_slot(props) in (slot, "both"):
                        g["qualifier"] = "missing premise (D-MISSPREM: absent foundation of a fails_to_follow kind)"
                    out.append(g)
                    continue
                for e, key in items:
                    refs, basis, ext, why = self.resolve(e, key, rec["file"])
                    if refs:
                        if props.get("consequence") not in (None, "none") and foundation_slot(props) in (slot, "both") \
                                and all(r.startswith("S3:") for r in refs):
                            role = {"fails_to_build": "missing foundation", "fails_to_follow": "missing premise",
                                    "fails_to_resolve": "unspecified name"}[props["consequence"]]
                            out.append({"edge": rec["id"], "file": rec["file"], "slot": slot, "role": role,
                                        "why": "foundation resolves only to an ungrounded analyst referent", "expr": ws(e.get("quote"))})
                        continue
                    sub = "external" if ext else ("conflict" if why.startswith("conflict") else
                                                  ("unresolved; an introduction with the same name/ID exists (identity not established)"
                                                   if self.named_in_scope(e.get("quote")) else
                                                   "named, not specified in mapped scope" if e.get("type") != "clause" else "unresolved"))
                    out.append({"edge": rec["id"], "file": rec["file"], "slot": slot, "role": "dangling endpoint",
                                "why": why, "subtype": sub, "expr": ws(e.get("quote")), "external_target": ext, "key": key})
                    break
        if unread:
            for g in out:
                if g["role"] == "dangling endpoint" and g.get("subtype", "").startswith(("named, not specified", "unresolved")):
                    g["provisional"] = f"{len(unread)} unread chunk(s) could hold the missing statement (GM-7)"
        covered = defaultdict(list)
        for rec in self.edges:
            covered[rec["file"]].append((span_lines(rec["lines"]), rec["id"]))
        for cl in (r for r in self.recs if r["type"] == "claim" and r.get("claim_kind") in GAP_CLAIM_KINDS):
            lo, hi = span_lines(cl["lines"])
            touching = [rid for (a, b), rid in covered[cl["file"]] if a <= hi and lo <= b]
            if not touching:
                out.append({"claim": cl["id"], "file": cl["file"], "role": "claim without attested premise in mapped scope",
                            "why": "no relation cue on the claim's lines (D-CLAIM; a review flag, not proof of no support)",
                            "expr": ws(cl["quote"])[:160]})
        return out


def foundation_slot(props):
    return {"toward_arg2": "arg2", "toward_arg1": "arg1"}.get(props.get("direction"), "both" if props.get("direction") == "none" else None)


def scheme_covers(s, token):
    m = re.match(r"^(.*?)(\d+)$", token)
    if not m or m.group(1) != s.get("prefix"):
        return False
    return int(s.get("from", 0)) <= int(m.group(2)) <= int(s.get("to", -1))


def scheme_target(s, file):
    t = (s.get("target") or {}).get("link_target") or ""
    path = urllib.parse.unquote(t).partition("#")[0]
    return posixpath.normpath(posixpath.join(posixpath.dirname(file), path)) if path else file


def reconcile_tables(st):
    """CL-10 reconciliation (D-RECON), a procedure fixed before trials: when readers of different chunks decided the same
    table header differently, the disagreement is kept in the ledger and the header is treated as a cue (one reader's
    omission is not evidence against an attested relation header). Rows whose reader recorded no edge for that column get
    deterministic cell edges: arg1 = key cell, arg2 = the whole cell (unsplit), borderline, actor 'reconciliation'."""
    st.s1 = [r for r in st.s1 if r.get("actor") != "reconciliation"]
    live = st.live()
    decisions = defaultdict(list)
    for r in live:
        if r["type"] == "header":
            decisions[(r["file"], span_lines(r["lines"])[0], r.get("column"))].append(r)
    added, disagreements = 0, []
    for (path, hl, col), rs in decisions.items():
        cues = {bool(r.get("cue")) for r in rs}
        if len(cues) < 2:
            continue
        disagreements.append({"file": path, "header_line": hl, "column": col, "header": ws(rs[0]["quote"]),
                              "decisions": [[r["chunk"], bool(r.get("cue"))] for r in rs]})
        lines = st.lines(path)
        head = cells(lines[hl - 1])
        label = head[col] if col is not None and col < len(head) else ws(rs[0]["quote"])
        n = hl + 2
        covered = {span_lines(r["lines"])[0] for r in live if r["type"] == "edge" and r["file"] == path
                   and (r.get("table") or {}).get("header_line") == hl and (r.get("table") or {}).get("column") == col}
        while n <= len(lines) and lines[n - 1].strip().startswith("|"):
            row = cells(lines[n - 1])
            if n not in covered and col < len(row) and row[col] and row[0]:
                chunk = next(c for c in st.chunks.values() if c["file"] == path and c["status"] == "read" and c["start"] <= n <= c["end"])
                added += 1
                st.s1.append({"type": "edge", "lines": str(n), "quote": row[col], "label": label, "cue_class": "table-header",
                              "table": {"header_line": hl, "column": col, "row_key": row[0]},
                              "arg1": [{"quote": row[0], "lines": str(n), "type": "name", "match": "exact"}],
                              "arg2": [{"quote": row[col], "lines": str(n), "type": "name", "match": "exact"}],
                              "joint": False, "borderline": True, "id": f"{chunk['id']}.x{added:03d}", "status": "S1",
                              "file": path, "version": chunk["version"], "chunk": chunk["id"], "actor": "reconciliation",
                              "actor_type": "automated", "rule": "D-RECON (CL-10 union reconciliation of header decisions)"})
            n += 1
    return added, disagreements


def cmd_resolve(a):
    st = Store(a.store)
    added, disagreements = reconcile_tables(st)
    st.save(("s1",))
    jwrite(st.root / "reconciliation.json", {"rule": "D-RECON", "edges_added": added, "header_disagreements": disagreements})
    m = Map(st, "L3")
    cands = m.candidates()
    old = {(c["expr"], c["intro"], c["method"]): c for c in jlines(st.root / "candidates.jsonl")}
    for c in cands:
        prev = old.get((c["expr"], c["intro"], c["method"]))
        if prev:
            c["disposition"] = prev.get("disposition", "open")
            c["decision"] = prev.get("decision")
    decided = {mem for d in st.s3 if not d.get("superseded") for mem in d.get("members", []) + [d.get("expr")]}
    for c in cands:
        if c["expr"] in decided and c["disposition"] == "open":
            c["disposition"] = "reviewed"
    jwrite_lines(st.root / "candidates.jsonl", cands)
    write_ledger(st, cands)
    print(f"resolved: {len(cands)} candidates; ledger written")


def write_ledger(st, cands):
    by_expr = defaultdict(list)
    for c in cands:
        by_expr[c["expr"]].append(c)
    ledger = {"method": METHOD_VERSION, "files": {}, "levels": {}}
    for level in ("L1", "L2", "L3"):
        m = Map(st, level)
        g = m.gaps(by_expr)
        ledger["levels"][level] = {"dangling": sum(x["role"] == "dangling endpoint" for x in g),
                                   "by_subtype": dict(Counter(x.get("subtype") or x.get("why") for x in g if x["role"] == "dangling endpoint")),
                                   "consequence_gaps": dict(Counter(x["role"] for x in g if x["role"] not in ("dangling endpoint",))),
                                   "conflicts": sum(x.get("subtype") == "conflict" for x in g)}
        if level == "L3":
            gaps3 = g
    m3 = Map(st, "L3")
    for path, f in st.manifest["files"].items():
        chs = [st.chunks[c] for c in f["chunks"]]
        read = [(c["start"], c["end"]) for c in chs if c["status"] == "read"]
        unread = [(c["start"], c["end"]) for c in chs if c["status"] == "unread"]
        recs = [r for r in m3.recs if r["file"] == path]
        labels = Counter(ws(r["label"]) for r in recs if r["type"] == "edge")
        inert = sorted(l for l in labels if m3.kind(l)[0] == "inert")
        ext = sorted({x["external_target"] for x in gaps3 if x["file"] == path and x.get("external_target")})
        ledger["files"][path] = {
            "version": f["sha256"], "state": "read" if not unread else ("partly read" if read else "unread"),
            "read_ranges": read, "unread_ranges": unread,
            "linked": dict(Counter(r["type"] if r["type"] != "intro" else f"intro:{r.get('intro_kind')}" for r in recs)),
            "untyped_cues": sum(r["type"] == "untyped" for r in recs),
            "labels": len(labels), "inert_labels": len(inert),
            "dangling_L3": dict(Counter(x.get("subtype") or x["why"] for x in gaps3 if x["file"] == path and x["role"] == "dangling endpoint")),
            "claims_without_attested_premise": sum(1 for x in gaps3 if x.get("claim") and x["file"] == path),
            "external_targets": ext,
            "open_candidates": sum(1 for c in cands if c["disposition"] == "open" and c["expr"].split("|")[0] in {r["id"] for r in recs}),
        }
    ledger["corpus_trail"] = {"identified": len(st.manifest["files"]),
                              "read": sum(v["state"] == "read" for v in ledger["files"].values()),
                              "partly_read": sum(v["state"] == "partly read" for v in ledger["files"].values()),
                              "unread": sum(v["state"] == "unread" for v in ledger["files"].values())}
    jwrite(st.root / "ledger.json", ledger)


# ------------------------------------------------------------------------------------------------- analysts
def cmd_worklist(a):
    st = Store(a.store)
    m = Map(st, "L2")
    cands = jlines(st.root / "candidates.jsonl")
    out = []
    if a.kind == "s3":
        decided = {mem for d in st.s3 if not d.get("superseded") for mem in d.get("members", []) + [d.get("expr")]}
        exprs = {}
        for rec in m.edges + m.identities:
            pairs = list(m.exprs(rec)) if rec["type"] == "edge" else [("a", 0, rec["a"], f"{rec['id']}|ident-a"), ("b", 0, rec["b"], f"{rec['id']}|ident-b")]
            for slot, n, e, key in pairs:
                exprs[key] = (rec, e)
        lines_cache = {}
        line = lambda f, n: lines_cache.setdefault(f, st.lines(f))[n - 1]
        for key, (rec, e) in exprs.items():
            if key in decided or e.get("type") == "clause":
                continue
            refs, *_ = m.resolve(e, key, rec["file"])
            if refs and not e.get("list"):
                continue
            cs = [c for c in cands if c["expr"] == key and c["method"] in ("exact-id-token", "exact-name")]
            if not cs and not e.get("list"):
                continue
            lo = span_lines(e["lines"])[0]
            out.append({"expr": key, "file": rec["file"], "line": lo, "quote": e["quote"], "list": e.get("list"),
                        "line_text": line(rec["file"], lo)[:400], "edge_label": rec.get("label"),
                        "candidates": [{"candidate": c["id"], "intro": c["intro"], "method": c["method"], "token": c.get("token"),
                                        "intro_file": m.by_id[c["intro"]]["file"], "intro_line": m.by_id[c["intro"]]["lines"],
                                        "intro_text": line(m.by_id[c["intro"]]["file"], span_lines(m.by_id[c["intro"]]["lines"])[0])[:300]}
                                       for c in cs]})
    else:
        labels = defaultdict(list)
        for r in m.edges:
            labels[ws(r["label"])].append(r)
        decided = {ws(l) for d in st.s2 if not d.get("superseded") for l in d["labels"]}
        lines_cache = {}
        line = lambda f, n: lines_cache.setdefault(f, st.lines(f))[n - 1]
        for lab, rs in sorted(labels.items(), key=lambda kv: -len(kv[1])):
            if len(rs) < a.min or lab in decided:
                continue
            sample = rs[:: max(1, len(rs) // a.sample)][:a.sample]
            out.append({"label": lab, "attestations": len(rs), "files": sorted({r["file"] for r in rs}),
                        "sample": [{"edge": r["id"], "file": r["file"], "line": r["lines"], "line_text": line(r["file"], span_lines(r["lines"])[0])[:300],
                                    "arg1": [ws(e["quote"]) for e in r.get("arg1") or []], "arg2": [ws(e["quote"]) for e in r.get("arg2") or []]}
                                   for r in sample]})
    jwrite_lines(a.out, out)
    print(f"{len(out)} {a.kind} work items -> {a.out}")


def cmd_decide(a):
    st = Store(a.store)
    rows = [json.loads(l) for l in Path(a.file).read_text(encoding="utf-8").splitlines() if l.strip()]
    target = st.s2 if a.kind == "s2" else st.s3
    version = max([d.get("version", 0) for d in st.s2] + [0])
    m = Map(st, "L1")
    known_exprs = {key for rec in m.edges for _, _, _, key in m.exprs(rec)}
    known_exprs |= {f"{r['id']}|ident-{s}" for r in m.identities for s in "ab"}
    accepted, rejected = 0, []
    for d in rows:
        d = dict(d)
        if a.kind == "s3":
            if d.get("value") not in ("same", "different", "cannot tell", "split"):
                rejected.append((d, "bad value"))
                continue
            mem = d.get("members", [])
            base = [x.split("/i")[0] for x in mem] + ([d["expr"]] if d.get("expr") else [])
            if any(b not in known_exprs for b in base):
                rejected.append((d, "unknown expression key"))
                continue
            if d.get("referent") and d["referent"] not in m.by_id and not d["referent"].startswith("D:"):
                rejected.append((d, "unknown referent"))
                continue
            d["id"] = f"S3-{len(st.s3) + 1:04d}"
        else:
            version += 1
            d.update({"id": f"S2-{len(st.s2) + 1:04d}", "version": version})
        d.update({"status": a.kind.upper(), "who": a.analyst, "actor_type": a.actor_type, "when": time.strftime("%Y-%m-%dT%H:%M:%S")})
        target.append(d)
        accepted += 1
    if getattr(a, "dry", False):
        print(f"CHECK {a.kind}: {accepted} decisions would be recorded, {len(rejected)} rejected")
        for d, why in rejected[:40]:
            print("  REJECT", why, json.dumps(d, ensure_ascii=False)[:200])
        return
    st.save((a.kind,))
    st.log({"op": f"decide-{a.kind}", "accepted": accepted, "rejected": len(rejected), "analyst": a.analyst})
    print(f"{accepted} {a.kind} decisions recorded, {len(rejected)} rejected")
    for d, why in rejected[:20]:
        print("  REJECT", why, json.dumps(d, ensure_ascii=False)[:160])


# ---------------------------------------------------------------------------------------------------- queries
def match_starts(m, terms):
    out, notes = [], []
    for t in terms:
        if t in m.by_id or t.startswith("D:"):
            out.append(t)
            continue
        hits = [i["id"] for i in m.intros if ws(i.get("name")).casefold() == ws(t).casefold() or t in (i.get("aliases") or [])]
        if not hits:
            hits = [i["id"] for i in m.intros if i.get("intro_kind") == "heading" and ws(i.get("name")).casefold().startswith(ws(t).casefold())]
        if hits:
            out += hits
            if len(hits) > 1:
                notes.append(f"'{t}' names {len(hits)} introductions; all are used as starts (equal names are not identity)")
        else:
            notes.append(f"'{t}' matches no introduction exactly; try `find`")
    return list(dict.fromkeys(out)), notes


def section_range(m, intro):
    """Lines covered by a heading's section (until the next heading of the same or higher level)."""
    if intro.get("intro_kind") != "heading":
        lo, hi = span_lines(intro["lines"])
        return lo, hi
    lo = span_lines(intro["lines"])[0]
    later = sorted(span_lines(h["lines"])[0] for h in m.intros if h["file"] == intro["file"] and h.get("intro_kind") == "heading"
                   and span_lines(h["lines"])[0] > lo and h["level"] <= intro["level"])
    return lo, (later[0] - 1 if later else 10 ** 6)


def render_expr(m, rec, e, key):
    refs, basis, ext, why = m.resolve(e, key, rec["file"])
    q = ws(e.get("quote"))[:120]
    if refs:
        via = "; ".join(sorted({b["via"] for b in basis if b.get("ref") in refs}))
        return f'"{q}" -> {", ".join(m.referent_name(r) + f" [{r}]" for r in refs)} ({via})', refs
    return f'"{q}" -> UNRESOLVED: {why}' + (f" [target {ext}]" if ext else ""), []


def render_record(m, rec, fresh):
    loc = f"{rec['file']}:{rec['lines']}"
    stale = "" if fresh.get(rec["file"]) == "current" else "  ** STALE: file changed since read; not current evidence **"
    if rec["type"] == "edge":
        kind, props = m.kind(rec["label"])
        head = (f"[{rec['id']}] {rec['status']} edge \"{ws(rec['label'])}\" ({rec.get('cue_class')}; kind {kind}"
                + (f", dir {props['direction']}, cons {props['consequence']}" if props.get("source") else "") + f") {loc}{stale}")
        parts, nxt = [head], []
        for slot in ("arg1", "arg2"):
            items = m.slot_items(rec, slot)
            if not items:
                parts.append(f"    {slot}: (absent)")
            for e, key in items:
                txt, refs = render_expr(m, rec, e, key)
                parts.append(f"    {slot}: {txt}" + ("  [analyst split item]" if e.get("overlay_item") else ""))
                nxt += refs
        if rec.get("joint"):
            parts.append("    joint: the text states these members act together (ID-10)")
        if rec.get("sibling_group"):
            parts.append(f"    sibling group {rec['sibling_group']} (coordinated items share one cue)")
        if rec.get("table"):
            parts.append(f"    table row key: {ws(rec['table'].get('row_key'))[:80]}")
        parts.append(f"    quote: \"{ws(rec['quote'])[:240]}\"")
        return "\n".join(parts), nxt
    if rec["type"] == "intro":
        head = f"[{rec['id']}] {rec['status']} introduction ({rec.get('intro_kind')}) \"{ws(rec.get('name'))[:160]}\" {loc}{stale}"
        if rec.get("intro_kind") == "rowkey" and not stale:
            row = m.st.lines(rec["file"])[span_lines(rec["lines"])[0] - 1]
            head += f"\n    row (source line): {ws(row)[:600]}"
        return head, []
    if rec["type"] == "identity":
        return f"[{rec['id']}] {rec['status']} identity statement \"{ws(rec['quote'])[:200]}\" {loc}{stale}", []
    return f"[{rec['id']}] {rec['status']} {rec['type']}" + (f" ({rec.get('claim_kind') or rec.get('reason') or ''})") + f" \"{ws(rec.get('quote'))[:220]}\" {loc}{stale}", []


def cmd_context(a):
    st = Store(a.store)
    m = Map(st, a.level)
    fresh = st.freshness(a.corpus)
    starts, notes = match_starts(m, a.start)
    cand_by_expr = defaultdict(list)
    if a.candidates:                    # the candidate index (S5) is read only for the labelled candidate section
        for c in jlines(st.root / "candidates.jsonl"):
            cand_by_expr[c["expr"]].append(c)
    gaps = m.gaps()
    gaps_by_edge = defaultdict(list)
    for g in gaps:
        if g.get("edge"):
            gaps_by_edge[g["edge"]].append(g)
    # expansion: section containment + incident edges, breadth-first by depth
    incident = defaultdict(list)
    for rec in m.edges:
        for slot in ("arg1", "arg2"):
            for e, key in m.slot_items(rec, slot):
                for r in m.resolve(e, key, rec["file"])[0]:
                    incident[r].append(rec["id"])
    seen_rec, seen_ref, groups, stale = set(), set(), [], []
    frontier = [(s, 0, "start") for s in starts]
    line_of = lambda rid: (m.by_id[rid]["file"], span_lines(m.by_id[rid]["lines"])[0], rid)
    while frontier:
        ref, depth, why = frontier.pop(0)
        if ref in seen_ref or depth > a.depth:
            continue
        seen_ref.add(ref)
        group = {"ref": ref, "depth": depth, "why": why, "items": []}
        intro = m.by_id.get(ref)
        members = []
        doc = ref.startswith("D:") or (intro is not None and intro.get("intro_kind") == "heading" and intro["level"] == 1 and depth > 0)
        if doc:
            # D-DOC: a whole-document referent expands to its outline, not to every record in the file
            path = ref[2:] if ref.startswith("D:") else intro["file"]
            members += [h["id"] for h in m.intros if h["file"] == path and h.get("intro_kind") == "heading" and h["level"] <= 2]
        elif intro is not None:
            members.append(intro["id"])
            if intro.get("intro_kind") == "heading":
                lo, hi = section_range(m, intro)
                members += sorted((r["id"] for r in m.recs if r["file"] == intro["file"] and lo < span_lines(r["lines"])[0] <= hi
                                   and not (r["type"] == "intro" and r.get("intro_kind") == "heading")), key=line_of)
        members += sorted(incident.get(ref, []), key=line_of)
        expanded = []
        for rid in dict.fromkeys(members):
            r = m.by_id.get(rid)
            if r is None:
                continue
            expanded.append(rid)
            if r.get("sibling_group"):         # siblings travel together (one cue, coordinated items)
                expanded += sorted((x["id"] for x in m.edges if x.get("sibling_group") == r["sibling_group"]), key=line_of)
        for rid in dict.fromkeys(expanded):
            if rid in seen_rec:
                continue
            seen_rec.add(rid)
            rec = m.by_id[rid]
            if fresh.get(rec["file"]) != "current":
                stale.append(rid)           # never presented as evidence, never expanded
                continue
            text, nxt = render_record(m, rec, fresh)
            gl = [f"    GAP {g['role']}: {g.get('subtype') or g['why']} ({g['slot']}: {g['expr'] or '-'})"
                  + (f" target {g['external_target']}" if g.get("external_target") else "")
                  + (f" [{g['qualifier']}]" if g.get("qualifier") else "") + (" PROVISIONAL" if g.get("provisional") else "")
                  for g in gaps_by_edge.get(rid, [])]
            group["items"].append({"rid": rid, "text": "\n".join([text] + gl), "unit": rec.get("sibling_group") or rid})
            for r in nxt:
                if r not in seen_ref:
                    frontier.append((r, depth + 1, f"reached from {rid}"))
        groups.append(group)
    # paginate by units: a sibling group is never split across pages
    budget_chars = a.budget * 4
    header = [f"CMAP CONTEXT PACKET  store-method={st.manifest.get('method')}  level={a.level}  budget={a.budget} tokens  page={a.page}",
              f"starts: {', '.join(m.referent_name(s) + f' [{s}]' for s in starts) or 'none'}"]
    header += [f"note: {n}" for n in notes]
    changed = [p for p, s in fresh.items() if s != "current"]
    header.append("freshness: " + ("all mapped files current" if not changed else
                                   f"CHANGED since mapping: {', '.join(changed)}. Records from these files are STALE (not current evidence); run refresh."))
    flat = [(g, it) for g in groups for it in g["items"]]
    units = []
    for g, it in flat:
        if units and units[-1][0] == (id(g), it["unit"]):
            units[-1][1].append((g, it))
        else:
            units.append(((id(g), it["unit"]), [(g, it)]))
    header_chars = sum(len(h) + 1 for h in header) + 600
    pages, cur, size = [], [], 0
    for _, members in units:
        n = sum(len(it["text"]) + 1 for _, it in members)
        if cur and size + n > budget_chars - header_chars:
            pages.append(cur)
            cur, size = [], 0
        cur += members
        size += n
    if cur:
        pages.append(cur)
    body = pages[a.page - 1] if 0 < a.page <= len(pages) else []
    out = header + [f"page {a.page} of {len(pages)} (records in this packet: {len(flat)})", ""]
    last = None
    for g, it in body:
        if g is not last:
            out.append(f"== {m.referent_name(g['ref'])} [{g['ref']}] depth {g['depth']} ({g['why']})")
            last = g
        out.append(it["text"])
    if stale:
        out.append(f"STALE (file changed since mapping; NOT current evidence, not expanded; run refresh): "
                   + ", ".join(f"{rid} {m.by_id[rid]['file']}" for rid in stale)[:900])
    unexpanded = [(r, d, w) for r, d, w in frontier if r not in seen_ref]
    out.append("")
    out.append(f"FRONTIER (not expanded; depth limit {a.depth}): " + (", ".join(sorted({f'{m.referent_name(r)} [{r}]' for r, _, _ in unexpanded}))[:1200] or "none"))
    if a.page < len(pages):
        out.append(f"MORE: {len(pages) - a.page} further page(s); rerun with --page {a.page + 1}. Omitted record ids on later pages: "
                   + ", ".join(it["rid"] for p in pages[a.page:] for _, it in p)[:900])
    ledger = jload(st.root / "ledger.json", {})
    touched = sorted({m.by_id[it['rid']]['file'] for _, it in flat})
    cov = [f"{p}: {ledger.get('files', {}).get(p, {}).get('state', '?')}" for p in touched]
    out.append("COVERAGE of files touched: " + "; ".join(cov) + ". Unread chunks in store: "
               + str(sum(c["status"] == "unread" for c in st.chunks.values())) + ". Out-of-scope targets reached: "
               + (", ".join(sorted({g['external_target'] for g in gaps if g.get('external_target') and g['edge'] in seen_rec}))[:600] or "none"))
    out.append("Absence of a relation in this packet does not establish independence; similarity is not evidence.")
    if a.candidates:
        out.append("")
        out.append("CANDIDATES (S5; similarity proposals only, NOT evidence; inspect before relying):")
        shown = 0
        for rid in seen_rec:
            for c in (c for k, v in cand_by_expr.items() if k.startswith(rid + "|") for c in v):
                if c["disposition"] == "open" and shown < 25:
                    out.append(f"  {c['id']} {c['method']} {c['score']}: {c['expr']} ~ {m.referent_name(c['intro'])} [{c['intro']}]")
                    shown += 1
    print("\n".join(out))


def cmd_find(a):
    st = Store(a.store)
    m = Map(st, "L1")
    q = set(re.findall(r"[a-z0-9]{2,}", a.text.casefold()))
    ids = set(expand_ids(a.text))
    scored = []
    for i in m.intros:
        nm = ws(i.get("name"))
        t = set(re.findall(r"[a-z0-9]{2,}", nm.casefold()))
        s = len(q & t) / len(q | t) if q | t else 0
        if ids & set(i.get("aliases") or []):
            s += 1
        if s > 0:
            scored.append((round(s, 2), i))
    scored.sort(key=lambda x: (-x[0], x[1]["file"], span_lines(x[1]["lines"])[0]))
    print(f"FIND (S5 candidate query; lexical similarity suggests where to look, it is not evidence) for: {a.text}")
    for s, i in scored[: a.limit]:
        print(f"  {s:.2f}  [{i['id']}] {i.get('intro_kind')} \"{ws(i.get('name'))[:110]}\" {i['file']}:{i['lines']}")


def cmd_show(a):
    st = Store(a.store)
    m = Map(st, a.level)
    fresh = st.freshness(a.corpus)
    for tgt in a.target:
        if tgt in m.by_id:
            print(render_record(m, m.by_id[tgt], fresh)[0])
            continue
        mm = re.match(r"^(.+?):(\d+)(?:-(\d+))?$", tgt)
        if not mm:
            print(f"unknown target {tgt}")
            continue
        path, lo, hi = mm.group(1), int(mm.group(2)), int(mm.group(3) or mm.group(2))
        root = Path(a.corpus).resolve() if a.corpus else st.corpus
        lines = (root / path).read_text(encoding="utf-8").splitlines()
        state = fresh.get(path, "not mapped")
        print(f"{path}:{lo}-{hi} (file {state})")
        for n in range(lo, min(hi, len(lines)) + 1):
            print(f"{n:>4}| {lines[n - 1]}")


def cmd_chain(a):
    st = Store(a.store)
    m = Map(st, a.level)
    starts, notes = match_starts(m, [a.start])
    if a.level == "L1":
        raise SystemExit("chain answers need L2 or L3 (QL-1)")
    out = [f"CHAIN ({'what stands on' if a.reverse else 'what it rests on'}) level={a.level} codebook entries={len(m.codebook)} start={', '.join(starts)}"]
    out += [f"note: {n}" for n in notes]
    hops, terminal, inert, dist, preds = [], [], [], {s: 0 for s in starts}, defaultdict(list)
    q = deque(starts)
    while q:
        ref = q.popleft()
        for rec in m.edges:
            kind, p = m.kind(rec["label"])
            a1 = [r for e, k in m.slot_items(rec, "arg1") for r in m.resolve(e, k, rec["file"])[0]]
            a2 = [r for e, k in m.slot_items(rec, "arg2") for r in m.resolve(e, k, rec["file"])[0]]
            if ref not in a1 + a2:
                continue
            if kind == "inert":
                inert.append((rec["id"], ws(rec["label"]), dist[ref]))
                continue
            found, dep = ("arg2", "arg1") if p["direction"] == "toward_arg2" else ("arg1", "arg2")
            frm, to = (found, dep) if a.reverse else (dep, found)
            if ref not in (a1 if frm == "arg1" else a2):
                continue
            targets = a2 if to == "arg2" else a1
            if kind == "terminal":
                terminal.append((rec["id"], ws(rec["label"]), dist[ref] + 1))
                continue
            hid = f"H{len(hops) + 1}"
            joint = len(targets) > 1 and rec.get("joint")
            hops.append((hid, rec, ref, targets or ["(unresolved)"], dist[ref] + 1, joint))
            for t in targets:
                if t not in dist:
                    dist[t] = dist[ref] + 1
                    q.append(t)
                preds[t].append(hid)
    for hid, rec, frm, to, d, joint in hops:
        out.append(f"{hid} d{d} {m.referent_name(frm)} --[{ws(rec['label'])}]--> " + ", ".join(m.referent_name(t) for t in to)
                   + (" (JOINT hop: all members required, DR-7)" if joint else "") + f"  edge {rec['id']} {rec['file']}:{rec['lines']} props {m.kind(rec['label'])[1]['source']}")
    for t, ps in preds.items():
        if len(ps) > 1:
            out.append(f"converging routes into {m.referent_name(t)}: {', '.join(ps)} (alternative predecessors; not a cycle)")
    reach = {h[0]: h for h in hops}
    cyc = [h for h in hops if any(t in starts for t in h[3])]
    for h in cyc:
        out.append(f"CYCLE: {h[0]} returns to the start")
    out.append(f"terminal hops: {terminal or 'none'}")
    out.append(f"unresolved vocabulary (inert kinds at reached referents): {len(inert)} " + str(inert[:15]))
    if not hops:
        out.append("no walkable hop: " + ("unresolved vocabulary" if inert else "empty (an empty answer does not establish independence)"))
    print("\n".join(out))


def cmd_gaps(a):
    st = Store(a.store)
    m = Map(st, a.level)
    cand_by_expr = defaultdict(list)
    for c in jlines(st.root / "candidates.jsonl"):
        cand_by_expr[c["expr"]].append(c)
    g = m.gaps(cand_by_expr)
    if a.file:
        g = [x for x in g if x["file"] == a.file]
    print(f"GAPS level={a.level}: {len(g)}  " + json.dumps(Counter(x.get('subtype') or x['role'] for x in g), ensure_ascii=False))
    for x in g[: a.limit]:
        print("  " + json.dumps(x, ensure_ascii=False)[:300])


def cmd_status(a):
    st = Store(a.store)
    fresh = st.freshness(a.corpus)
    cs = Counter(c["status"] for c in st.chunks.values())
    print(f"store {st.root} method={st.manifest.get('method')}  files={len(st.manifest['files'])}  chunks={dict(cs)}")
    print(f"records: S1 {len(st.live())} live ({len(st.s1) - len(st.live())} superseded)  S2 {len(st.s2)}  S3 {len(st.s3)}  S4 {len(st.s4)}  "
          f"S5 {len(jlines(st.root / 'candidates.jsonl'))}")
    for p, s in fresh.items():
        if s != "current":
            print(f"  {s.upper()}: {p}")
    if all(s == "current" for s in fresh.values()):
        print("  all mapped files current")
    stale_dec = sum(1 for d in st.s3 + st.s2 if d.get("needs_review"))
    if stale_dec:
        print(f"  {stale_dec} analyst decisions need review after source change")


def cmd_coverage(a):
    st = Store(a.store)
    led = jload(st.root / "ledger.json", {})
    print(json.dumps({"corpus_trail": led.get("corpus_trail"), "levels": led.get("levels")}, indent=1, ensure_ascii=False))
    for p, v in led.get("files", {}).items():
        print(f"{p}: {v['state']}; linked {v['linked']}; untyped {v['untyped_cues']}; labels {v['labels']} ({v['inert_labels']} inert); "
              f"dangling L3 {v['dangling_L3']}; external {len(v['external_targets'])}; open candidates {v['open_candidates']}")


# ------------------------------------------------------------------------------------------------- refresh
def cmd_refresh(a):
    """Detect changed file versions; keep records of chunks whose text is unchanged (remapping shifted lines);
    supersede records of changed or removed chunks; flag analyst decisions touching superseded records; invalidate
    derived results. New chunks are left unread for readers."""
    st = Store(a.store)
    root = Path(a.corpus).resolve() if a.corpus else st.corpus
    if a.corpus:
        st.manifest["corpus_root"] = posixpath.relpath(root.as_posix(), st.root.resolve().as_posix())
    report = {"changed": [], "unchanged": 0, "preserved_chunks": 0, "remapped_records": 0, "superseded_records": 0,
              "new_chunks": [], "retired_chunks": [], "flagged_decisions": 0, "new_files": [], "removed_files": []}
    disk = {p.relative_to(root).as_posix(): p for p in root.rglob("*.md")}
    superseded_ids = set()
    for path in sorted(set(st.manifest["files"]) | set(disk)):
        old = st.manifest["files"].get(path)
        if path not in disk:
            report["removed_files"].append(path)
            for cid in old["chunks"]:
                st.chunks[cid]["status"] = "retired"
            for r in st.s1:
                if r["file"] == path and not r.get("superseded"):
                    r["superseded"] = "file removed"
                    superseded_ids.add(r["id"])
            del st.manifest["files"][path]
            continue
        raw = disk[path].read_bytes()
        if old and sha(raw) == old["sha256"]:
            report["unchanged"] += 1
            continue
        text = raw.decode("utf-8")
        version = sha(raw)
        new_chunks = chunk_file(path, text)
        old_chunks = {st.chunks[c]["text_sha"]: st.chunks[c] for c in (old["chunks"] if old else [])}
        keep = {}
        for nc in new_chunks:
            oc = old_chunks.get(nc["text_sha"])
            if oc and oc["status"] == "read":
                keep[oc["id"]] = nc
        report["changed"].append(path) if old else report["new_files"].append(path)
        for r in st.s1:
            if r["file"] != path or r.get("superseded"):
                continue
            if r.get("actor") == "structural" and r.get("type") == "intro" or r.get("cue_class") == "diagram-arrow":
                r["superseded"] = "structural pass rerun on new version"
                continue
            nc = keep.get(r["chunk"])
            if nc:
                delta = nc["start"] - st.chunks[r["chunk"]]["start"]
                if delta:
                    shift_record(r, delta)
                    report["remapped_records"] += 1
                r["version"] = version
                r["chunk"] = nc["id"]
            else:
                r["superseded"] = "source chunk changed"
                superseded_ids.add(r["id"])
                report["superseded_records"] += 1
        for cid in (old["chunks"] if old else []):
            if cid not in keep:
                st.chunks[cid]["status"] = "retired"
                report["retired_chunks"].append(cid)
            else:
                report["preserved_chunks"] += 1
        for nc in new_chunks:
            prev = next((oc for ocid, oc in ((k, st.chunks[k]) for k in keep) if keep[ocid] is nc), None)
            nc.update({"version": version, "status": "read" if prev else "unread", "reader": prev["reader"] if prev else None})
            if prev:
                nc.update({k: prev.get(k) for k in ("read_at", "records", "rejected", "auto_links")})
                nc["preserved_from"] = prev["id"]
                if prev["id"] != nc["id"]:
                    st.chunks[prev["id"]]["status"] = "retired"
            else:
                report["new_chunks"].append(nc["id"])
            st.chunks[nc["id"]] = nc
        st.manifest["files"][path] = {"sha256": version, "lines": len(text.splitlines()), "chunks": [c["id"] for c in new_chunks]}
        st.s1 += structural_records(path, version, text, new_chunks)
    for d in st.s3 + st.s2 + st.s4:
        touched = [k.split("|")[0] for k in d.get("members", []) + ([d["expr"]] if d.get("expr") else [])]
        touched += d.get("spans_in_view_records", [])
        if any(t in superseded_ids for t in touched):
            d["needs_review"] = "a record in its spans in view was superseded by a source change"
            report["flagged_decisions"] += 1
    res = st.root / "results"
    if res.exists():
        for p in res.glob("*.json"):
            p.unlink()
    st.save()
    st.log({"op": "refresh", **{k: (len(v) if isinstance(v, list) else v) for k, v in report.items()}})
    print(json.dumps(report, indent=1, ensure_ascii=False))


def shift_record(r, delta):
    def sh(s):
        lo, hi = span_lines(s)
        return f"{lo + delta}" if lo == hi else f"{lo + delta}-{hi + delta}"
    r["lines"] = sh(r["lines"])
    for slot in ("arg1", "arg2"):
        for e in r.get(slot) or []:
            e["lines"] = sh(e["lines"])
    for side in ("a", "b"):
        if r.get(side):
            r[side]["lines"] = sh(r[side]["lines"])
    if r.get("table") and r["table"].get("header_line"):
        r["table"]["header_line"] += delta


# ----------------------------------------------------------------------------------------------------- main
def main(argv=None):
    ap = argparse.ArgumentParser(prog="cmap", description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("init", help="register a corpus snapshot: chunk it and run the structural pass")
    p.add_argument("--store", required=True)
    p.add_argument("--corpus", required=True)
    p.set_defaults(fn=cmd_init)
    p = sub.add_parser("chunks", help="list chunks and their read status")
    p.add_argument("--store", required=True)
    p.add_argument("--pending", action="store_true")
    p.add_argument("--all", action="store_true")
    p.set_defaults(fn=cmd_chunks)
    p = sub.add_parser("chunk-show", help="a reader's bounded view of one chunk")
    p.add_argument("--store", required=True)
    p.add_argument("chunk")
    p.set_defaults(fn=cmd_chunk_show)
    p = sub.add_parser("ingest", help="validate and commit a reader's records for one chunk (S1)")
    p.add_argument("--store", required=True)
    p.add_argument("--chunk", required=True)
    p.add_argument("--file", required=True)
    p.add_argument("--reader", required=True)
    p.set_defaults(fn=cmd_ingest, dry=False)
    p = sub.add_parser("validate", help="dry-run ingest: check a reader's records for one chunk without writing the store")
    p.add_argument("--store", required=True)
    p.add_argument("--chunk", required=True)
    p.add_argument("--file", required=True)
    p.add_argument("--reader", default="validator")
    p.set_defaults(fn=cmd_ingest, dry=True)
    p = sub.add_parser("resolve", help="rebuild the candidate index (S5) and the coverage ledger")
    p.add_argument("--store", required=True)
    p.set_defaults(fn=cmd_resolve)
    p = sub.add_parser("worklist", help="analyst work items: s3 (identity) or s2 (codebook)")
    p.add_argument("kind", choices=["s2", "s3"])
    p.add_argument("--store", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--min", type=int, default=3)
    p.add_argument("--sample", type=int, default=8)
    p.set_defaults(fn=cmd_worklist)
    p = sub.add_parser("decide", help="record analyst decisions (S2 or S3) from a JSONL file")
    p.add_argument("kind", choices=["s2", "s3"])
    p.add_argument("--store", required=True)
    p.add_argument("--file", required=True)
    p.add_argument("--analyst", required=True)
    p.add_argument("--actor-type", default="model analyst")
    p.add_argument("--dry", action="store_true", help="check the decisions without recording them")
    p.set_defaults(fn=cmd_decide)
    p = sub.add_parser("context", help="bounded context packet from start referents (names, IDs or record ids)")
    p.add_argument("--store", required=True)
    p.add_argument("--corpus", default=None, help="corpus on disk to check freshness against (default: registered)")
    p.add_argument("start", nargs="+")
    p.add_argument("--level", default="L3", choices=["L1", "L2", "L3"])
    p.add_argument("--budget", type=int, default=3000)
    p.add_argument("--depth", type=int, default=2)
    p.add_argument("--page", type=int, default=1)
    p.add_argument("--candidates", action="store_true", help="append the labelled S5 candidate section")
    p.set_defaults(fn=cmd_context)
    p = sub.add_parser("find", help="candidate query: introductions lexically similar to text (S5, not evidence)")
    p.add_argument("--store", required=True)
    p.add_argument("text")
    p.add_argument("--limit", type=int, default=12)
    p.set_defaults(fn=cmd_find)
    p = sub.add_parser("show", help="show records by id, or source lines as path:start-end (with freshness)")
    p.add_argument("--store", required=True)
    p.add_argument("--corpus", default=None)
    p.add_argument("--level", default="L3", choices=["L1", "L2", "L3"])
    p.add_argument("target", nargs="+")
    p.set_defaults(fn=cmd_show)
    p = sub.add_parser("chain", help="derived chain over walkable kinds (DR-3 to DR-7); needs L2 or L3")
    p.add_argument("--store", required=True)
    p.add_argument("start")
    p.add_argument("--level", default="L3", choices=["L1", "L2", "L3"])
    p.add_argument("--reverse", action="store_true", help="what stands on the start")
    p.set_defaults(fn=cmd_chain)
    p = sub.add_parser("gaps", help="gap records at a level")
    p.add_argument("--store", required=True)
    p.add_argument("--level", default="L3", choices=["L1", "L2", "L3"])
    p.add_argument("--file", default=None)
    p.add_argument("--limit", type=int, default=40)
    p.set_defaults(fn=cmd_gaps)
    p = sub.add_parser("status", help="freshness, chunk progress and record counts")
    p.add_argument("--store", required=True)
    p.add_argument("--corpus", default=None)
    p.set_defaults(fn=cmd_status)
    p = sub.add_parser("coverage", help="coverage ledger summary")
    p.add_argument("--store", required=True)
    p.set_defaults(fn=cmd_coverage)
    p = sub.add_parser("refresh", help="detect source changes; preserve unaffected records; invalidate affected ones")
    p.add_argument("--store", required=True)
    p.add_argument("--corpus", default=None)
    p.set_defaults(fn=cmd_refresh)
    a = ap.parse_args(argv)
    a.fn(a)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
