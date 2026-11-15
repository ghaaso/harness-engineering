"""T3 (documented chains) and T4 (defect register item -> fix files), protocol section 4.

  python build_t34.py <out.json>
T3: every item of the three docs at the frozen commit. Build commit = first parent of the first doc
version that contains the item's first line (the item's introduction; for the two audit docs this
is the doc's own adding commit unless the item came later). Anchors resolved at the build commit;
the doc itself is flagged for removal from the facts. Kept when the resolved anchors span >= 2
distinct files. Seed = first resolved anchor in text order; reference = the other anchors.
An anchor that resolves at the frozen commit but not at the build commit is UNREACHABLE (excluded,
counted); one that is ambiguous or missing at both is UNRESOLVED (dropped, counted).
T4: HANDOFF section 4 items with a fix commit (mapping below, with its evidence). Build commit =
the fix commit's first parent; seed = first anchor of the item resolved there; reference = the
other existing code/test/migration files and changed definitions of the fix commit.
"""
import collections, json, sys
from anchors import DOCS, Index, doc_items, resolve_item
from common import (FROZEN, Blobs, classify, cross_runtime, defs_for, git, is_ctm, is_test_path, map_file, parse_diff,
                    runtime, split_of, commit_date)

OUT = sys.argv[1]
blobs = Blobs()
items = doc_items(FROZEN)

# ---------- introduction commit of each item ----------
versions = {}
for label, path in DOCS:
    shas = git("log", FROZEN, "--reverse", "--format=%H", "--", path).split()
    versions[label] = [(s, blobs.get(s, path) or "") for s in shas]


def first_line(body):
    for l in body.strip("\n").splitlines():
        if l.strip():
            return l.strip()
    return ""


def intro_commit(it):
    fl = first_line(it["body"])
    keys = [fl, fl[:60], fl[:40], fl[:25]]
    for k in keys:
        if len(k) < 12:
            continue
        for s, txt in versions[it["doc"]]:
            if k in txt:
                return s, "first version containing: " + ("full first line" if k == fl else f"first {len(k)} chars")
    return None, "not found"


for it in items:
    s, how = intro_commit(it)
    it["intro_commit"], it["intro_how"] = s, how
    it["build_commit"] = git("rev-parse", f"{s}^1").strip() if s else None

# ---------- indexes ----------
IDX = {}


def index(sha):
    if sha not in IDX:
        IDX[sha] = Index(sha, blobs)
        print("indexed", sha[:9], len(IDX[sha].defs), "defs", file=sys.stderr)
    return IDX[sha]


frozen_idx = index(FROZEN)


def chain_task(anchors_build, anchors_frozen):
    ok = [a for a in anchors_build if a["status"] == "ok"]
    unreachable, unresolved = [], []
    fz = {(a["pos"], a["type"]): a for a in anchors_frozen}
    for a in anchors_build:
        if a["status"] in ("ok", "not_code"):
            continue
        f = fz.get((a["pos"], a["type"]))
        if f and f["status"] == "ok":
            unreachable.append({"text": a["text"], "type": a["type"], "frozen_path": f["path"]})
        else:
            unresolved.append({"text": a["text"], "type": a["type"], "status": a["status"]})
    return ok, unreachable, unresolved


def anchor_item(a):
    if a["type"] == "file":
        return {"type": "file", "path": a["path"]}
    return {"type": "sym", "path": a["path"], **a["def"], "via": a["via"]}


def flags(seed_path, path):
    return {"runtime": runtime(path), "class": classify(path)[0], "test": is_test_path(path),
            "cross_runtime": cross_runtime(seed_path, path)}


T3 = []
for it in items:
    if not it["build_commit"]:
        it["dropped"] = "no introduction commit"
        continue
    ab = resolve_item(it["body"], index(it["build_commit"]))
    af = resolve_item(it["body"], frozen_idx)
    ok, unreachable, unresolved = chain_task(ab, af)
    # dedupe anchors (same file twice, same definition twice), keep text order
    seen, uniq = set(), []
    for a in ok:
        k = (a["type"], a["path"], a.get("def", {}).get("name"), a.get("def", {}).get("occ"))
        if k not in seen:
            seen.add(k)
            uniq.append(a)
    files = list(dict.fromkeys(a["path"] for a in uniq))
    rec = {"doc": it["doc"], "doc_path": it["doc_path"], "item": it["item"], "intro_commit": it["intro_commit"],
           "intro_how": it["intro_how"], "parent": it["build_commit"], "date": commit_date(it["build_commit"]),
           "remove_paths": [it["doc_path"]], "anchors_ok": len(uniq), "distinct_files": len(files),
           "excluded_unreachable": unreachable, "unresolved": unresolved}
    if len(files) < 2:
        rec["kept"] = False
        T3.append(rec)
        continue
    seed = uniq[0]
    rest = uniq[1:]
    sp = seed["path"]
    rec.update({
        "kept": True, "split": split_of(rec["date"]),
        "seed": {"path": sp, "symbol": ({k: seed["def"][k] for k in ("name", "kind", "start", "end", "occ")}
                                        if seed["type"] == "sym" else None)},
        "files": [{"path": p, **flags(sp, p)} for p in files if p != sp],
        "defs": [{**{k: v for k, v in anchor_item(a).items() if k != "type"}, "same_file_as_seed": a["path"] == sp,
                  **flags(sp, a["path"])} for a in rest if a["type"] == "sym"],
    })
    T3.append(rec)

# ---------- T4 ----------
T4_MAP = [
    ("A1 ", "2fe77f52c4ab8a206fb9ce61ad749983d68dd71e", "content: body section 'ops-server: one unauthenticated POST killed the process' (#168)"),
    ("A6 ", "2fe77f52c4ab8a206fb9ce61ad749983d68dd71e", "content: body section 'metrics: adversarial paths produced phantom route labels', cites the handoff's prescription (#168)"),
    ("A2 ", "1c546a31060d0bb984b4f0a07a79f04d70410b1a", "id in body: 'Handoff item A2' (#169)"),
    ("C1 ", "8dafcec", "id in body: 'Closes C1 and C2' (sub-commit of #170 on branch fix/mobile-completion-guards)"),
    ("C2 ", "8dafcec", "id in body: 'Closes C1 and C2' (sub-commit of #170)"),
    ("B1 ", "c731e66", "doc: section 4.2 says B1-B3 are fixed on fix/mobile-completion-guards; body 'seeds dispatch_cursor' (sub-commit of #170)"),
    ("B2 ", "c731e66", "doc: section 4.2 says B1-B3 fixed there; diff adds the log_customer_message call (sub-commit of #170)"),
    ("B3 ", "c731e66", "doc: section 4.2 says B1-B3 fixed there; body 'claim row is durable before Meta is called' (sub-commit of #170)"),
    ("4.4 | identity | Lockout counter", "1c546a31060d0bb984b4f0a07a79f04d70410b1a", "content: body 'plus the lost-update row lock' (#169)"),
    ("4.4 | messaging | Non-ASCII", "2fe77f52c4ab8a206fb9ce61ad749983d68dd71e", "content: body 'Three non-ASCII compare_digest 500s' (#168)"),
    ("4.4 | ops | Non-ASCII", "2fe77f52c4ab8a206fb9ce61ad749983d68dd71e", "content: body 'on the ops gate' (#168)"),
    ("4.4 | messaging | Lost-race", "c731e66", "content: diff adds CustomerMessageRepository.savepoint (sub-commit of #170)"),
    ("4.4 | messaging | Preview hands out", "c731e66", "content: body 'no consent -> wa_me_url is None' (sub-commit of #170)"),
]
T4 = []
for prefix, fix, evidence in T4_MAP:
    it = next(i for i in items if i["doc"] == "handoff_s4" and i["item"].startswith(prefix))
    fix = git("rev-parse", fix).strip()
    parent = git("rev-parse", f"{fix}^1").strip()
    ab = resolve_item(it["body"], index(parent))
    ok = [a for a in ab if a["status"] == "ok" and (a["type"] == "sym" or classify(a["path"])[0] != "other")]
    rec = {"doc": "handoff_s4", "doc_path": it["doc_path"], "item": it["item"], "fix_commit": fix,
           "parent": parent, "date": commit_date(fix), "evidence": evidence, "remove_paths": [it["doc_path"]]}
    if not ok:
        rec["kept"] = False
        rec["why"] = "no anchor of the item resolves at the fix parent"
        T4.append(rec)
        continue
    seed = ok[0]
    sp = seed["path"]
    ssym = {k: seed["def"][k] for k in ("name", "kind", "start", "end", "occ")} if seed["type"] == "sym" else None
    fd = parse_diff(parent, fix)
    ex = [f for f in fd if f["status"] != "A" and f["status"] != "D" and is_ctm(f["old"])]
    added = [f["new"] for f in fd if f["status"] == "A" and is_ctm(f["new"])]
    jobs = []
    for f in ex:
        jobs.append((("p", f["old"]), f["old"], blobs.get(parent, f["old"])))
        jobs.append((("c", f["old"]), f["new"], blobs.get(fix, f["new"])))
    D = defs_for(jobs)
    files, defs, n_added_defs = [], [], 0
    for f in ex:
        p = f["old"]
        if p != sp:
            files.append({"path": p, **flags(sp, p)})
        ch, ad, _ = map_file(D[("p", p)]["defs"], D[("c", p)]["defs"], f["hunks"])
        n_added_defs += len(ad)
        for i, n in sorted(ch.items()):
            d = D[("p", p)]["defs"][i]
            if ssym and p == sp and d["name"] == ssym["name"] and d["occ"] == ssym["occ"]:
                continue
            defs.append({"path": p, "name": d["name"], "kind": d["kind"], "start": d["start"], "end": d["end"],
                         "occ": d["occ"], "changed_lines": n, "same_file_as_seed": p == sp, **flags(sp, p)})
    rec.update({"kept": True, "split": split_of(rec["date"]), "seed": {"path": sp, "symbol": ssym},
                "seed_in_fix": sp in [f["old"] for f in ex],
                "files": files, "defs": defs,
                "excluded_unreachable": {"added_files": added, "n_files": len(added), "n_defs": n_added_defs}})
    T4.append(rec)

blobs.close()
json.dump({"T3": T3, "T4": T4}, open(OUT, "w", encoding="utf-8"), indent=1)
k3 = [t for t in T3 if t.get("kept")]
print("T3 items", len(T3), "kept", len(k3), collections.Counter(t["doc"] for t in k3),
      collections.Counter(t["split"] for t in k3), file=sys.stderr)
print("T4 items", len(T4), "kept", sum(bool(t.get("kept")) for t in T4), file=sys.stderr)
