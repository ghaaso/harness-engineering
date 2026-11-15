"""Run graphify's own CLI commands for task seeds or questions, and read their printed results.

Runs ONLY inside graphtest-graphify:1, started with --network none. Mounts: /graphs (built graphs,
read-only), /adapter (this folder, read-only), /jobs (the job file, read-only), /out (results).

    python -I /adapter/calls.py /jobs/<job>.json

Job kinds:
  "tasks": {"kind": "tasks", "calls": {key: spec}, "groups": [{"graph": key, "tasks": [task, ...]}]}
           -> /out/<graph key>.jsonl.gz, one line per task (restartable: a finished group is skipped)
  "tq":    {"kind": "tq", "graph": key, "questions": [{id, split, question}], "variants": [{name, budget}]}
           -> /out/tq.<variant>.jsonl

What the adapter does with graphify (ADAPTER.md has the reasons):
  * every graphify call is the shipped CLI (`graphify affected|query|explain ...`) as a subprocess,
    exactly as a user or agent would type it, with --graph pointing at the parent's graph;
  * the seed definition is named by graphify's own node id, found in graph.json by file and line;
  * the printed result is parsed line by line in graphify's order; each printed node is mapped to its
    graph.json node (label + file) to get its source file and line.
Nothing here ranks, filters or reorders graphify's answer.
"""
import gzip
import json
import os
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

from graphify.security import sanitize_label  # the same label sanitising the CLI printer applies

WORKERS = int(os.environ.get("GFY_WORKERS", "6"))
TIMEOUT = 300


def log(msg):
    with open("/out/progress.log", "a") as f:
        f.write(time.strftime("%H:%M:%S ") + msg + "\n")


# ---------------------------------------------------------------- graph index (graph.json, read only)
class Index:
    def __init__(self, gpath):
        g = json.load(open(gpath))
        self.nodes = {n["id"]: n for n in g["nodes"]}
        self.by_label_file = {}
        self.by_label = {}
        self.by_file = {}
        for nid, n in self.nodes.items():
            lab = sanitize_label(n.get("label", nid))
            f = n.get("source_file") or ""
            self.by_label_file.setdefault((lab, f), []).append(nid)
            self.by_label.setdefault(lab, []).append(nid)
            if f:
                self.by_file.setdefault(f, []).append(nid)
        self.adj = {}
        for l in g.get("links", g.get("edges", [])):
            s, t = l["source"], l["target"]
            self.adj.setdefault(s, set()).add(t)
            self.adj.setdefault(t, set()).add(s)

    def line_of(self, nid):
        loc = str(self.nodes[nid].get("source_location") or "")
        m = re.match(r"^L(\d+)", loc)
        return int(m.group(1)) if m else None

    def item(self, nid, how, rel=None):
        n = self.nodes[nid]
        return {"label": n.get("label", nid), "file": n.get("source_file") or None, "line": self.line_of(nid),
                "ft": n.get("file_type"), "id": nid, "rel": rel, "how": how}


def bare(label):
    s = str(label or "").strip()
    if s.startswith("."):
        s = s[1:]
    if s.endswith("()"):
        s = s[:-2]
    return s


def is_file_node(n, path):
    base = os.path.basename(path)
    lab = str(n.get("label") or "")
    return str(n.get("source_location") or "") == "L1" and (lab == base or lab.endswith("/" + base) or lab == path)


def resolve_seed(ix, seed):
    """The seed file is passed to graphify as its path; the seed definition as graphify's node id,
    found in graph.json in the seed file by line (rules in order, first hit wins):
      line+name  a code node at the definition's first line whose bare label equals the name's last part
      name-in-range  a code node in [start, end] with that bare label (closest to start)
      line       any non-file code node at the definition's first line (smallest id)
    """
    path = seed["path"]
    in_file = ix.by_file.get(path, [])
    res = {"file_in_graph": bool(in_file), "def": None, "def_rule": None, "def_label": None}
    sym = seed.get("symbol")
    if not sym:
        res["def_rule"] = "no definition in seed"
        return res
    if not in_file:
        res["def_rule"] = "seed file not in graph"
        return res
    last = re.split(r"[.>]", sym["name"])[-1].strip()
    start, end = sym.get("start"), sym.get("end") or sym.get("start")
    code = [nid for nid in in_file if ix.nodes[nid].get("file_type") == "code" and not is_file_node(ix.nodes[nid], path)]
    hit = None
    rule = None
    c1 = sorted(nid for nid in code if ix.line_of(nid) == start and bare(ix.nodes[nid].get("label")) == last)
    if c1:
        hit, rule = c1[0], "line+name"
    if not hit:
        c2 = [nid for nid in code if bare(ix.nodes[nid].get("label")) == last and ix.line_of(nid) is not None and start <= ix.line_of(nid) <= end]
        if c2:
            hit, rule = sorted(c2, key=lambda x: (ix.line_of(x) - start, x))[0], "name-in-range"
    if not hit:
        c3 = sorted(nid for nid in code if ix.line_of(nid) == start)
        if c3:
            hit, rule = c3[0], "line"
    if hit:
        res.update({"def": hit, "def_rule": rule, "def_label": ix.nodes[hit].get("label")})
    else:
        res["def_rule"] = "definition not found in graph"
    return res


# ---------------------------------------------------------------- the graphify command lines
def query_text(seed):
    sym = seed.get("symbol")
    return (sym["name"] + " " + seed["path"]) if sym else seed["path"]


def argv_for(spec, seed, sres, gpath):
    """The exact command line, or None when the call needs a definition the graph does not have."""
    cmd = spec["cmd"]
    if cmd in ("affected", "explain"):
        if spec["target"] == "def":
            if not sres["def"]:
                return None
            target = sres["def"]
        else:
            target = seed["path"]
        a = ["graphify", cmd, target]
        if cmd == "affected" and spec.get("depth"):
            a += ["--depth", str(spec["depth"])]
        if cmd == "explain" and spec.get("all"):
            a += ["--all"]
        return a + ["--graph", gpath]
    if cmd == "query":
        a = ["graphify", "query", query_text(seed)]
        if spec["mode"] == "seed":
            if sres["def"]:
                a += ["--seed", sres["def"]]
            a += ["--seed", seed["path"]]
        if spec.get("dfs"):
            a += ["--dfs"]
        if spec.get("budget"):
            a += ["--budget", str(spec["budget"])]
        if spec.get("depth"):
            a += ["--depth", str(spec["depth"])]
        return a + ["--graph", gpath]
    raise ValueError("unknown command " + cmd)


def run(argv, cwd):
    t0 = time.perf_counter()
    try:
        p = subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=TIMEOUT)
        rc, out, err = p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired as e:
        rc, out, err = "timeout", (e.stdout or "") if isinstance(e.stdout, str) else "", "timeout after %ds" % TIMEOUT
    return {"exit": rc, "ms": round((time.perf_counter() - t0) * 1000, 3), "stdout": out, "stderr": err[-4000:]}


# ---------------------------------------------------------------- reading the printed results
NODE_RE = re.compile(r"^NODE (.*) \[src=(.*?) loc=(.*?) community=")
AFF_RE = re.compile(r"^- (.*) \[([A-Za-z_]+)\] (.*)$")
EXP_RE = re.compile(r"^  (-->|<--) (.*) \[([A-Za-z_]+)\] \[([^\]]*)\](?: (.*))?$")


def split_site(s):
    s = (s or "").strip()
    m = re.match(r"^(.*):(L\d+.*)$", s)
    if m:
        return m.group(1), m.group(2)
    return (None if s in ("", "-") else s), None


def parse_query(ix, text):
    items, unresolved = [], 0
    for line in text.split("\n"):
        if not line.startswith("NODE "):
            continue
        m = NODE_RE.match(line)
        if not m:
            unresolved += 1
            continue
        label, src, loc = m.group(1), m.group(2), m.group(3)
        src = None if src in ("", "None") else src
        loc = None if loc in ("", "None") else loc
        c = [nid for nid in ix.by_label_file.get((label, src or ""), [])
             if str(ix.nodes[nid].get("source_location") or "") == (loc or "")]
        if len(c) >= 1:
            it = ix.item(sorted(c)[0], "label+src+loc")
        else:
            ln = re.match(r"^L(\d+)", loc or "")
            it = {"label": label, "file": src, "line": int(ln.group(1)) if ln else None, "ft": None, "id": None, "rel": None, "how": "printed src"}
            unresolved += 1
        items.append(it)
    return items, unresolved


def parse_affected(ix, text):
    items, unresolved = [], 0
    for line in text.split("\n"):
        m = AFF_RE.match(line)
        if not m:
            continue
        label, rel, site = m.group(1), m.group(2), m.group(3)
        sfile, _sloc = split_site(site)
        c = ix.by_label_file.get((label, sfile or ""), [])
        if len(c) == 1:
            it = ix.item(c[0], "label+site file", rel)
        elif len(ix.by_label.get(label, [])) == 1:
            it = ix.item(ix.by_label[label][0], "unique label", rel)
        else:
            # several nodes share label and file (overloads), or none: the printed site file is the
            # hit's own file (affected.py: the edge's location in the source node's file)
            it = {"label": label, "file": sfile, "line": None, "ft": None, "id": None, "rel": rel, "how": "printed site file"}
            if not sfile:
                unresolved += 1
        items.append(it)
    return items, unresolved


def parse_explain(ix, text):
    items, unresolved = [], 0
    seed_id = None
    for line in text.split("\n"):
        if line.startswith("  ID:"):
            seed_id = line.split(":", 1)[1].strip()
            continue
        m = EXP_RE.match(line)
        if not m:
            continue
        arrow, label, rel, site = m.group(1), m.group(2), m.group(3), m.group(5)
        nb = sorted(n for n in ix.adj.get(seed_id, ()) if sanitize_label(ix.nodes[n].get("label", n)) == label) if seed_id in ix.nodes else []
        files = {ix.nodes[n].get("source_file") or "" for n in nb}
        if nb and len(files) == 1:
            it = ix.item(nb[0], "neighbour label", rel)
        elif arrow == "<--" and site:
            # an incoming edge's site lies in the neighbour's own file
            sfile, _ = split_site(site)
            it = {"label": label, "file": sfile, "line": None, "ft": None, "id": None, "rel": rel, "how": "printed site file (incoming)"}
        else:
            it = {"label": label, "file": None, "line": None, "ft": None, "id": None, "rel": rel, "how": "unresolved"}
            unresolved += 1
        items.append(it)
    return items, unresolved


def header_of(cmd, text):
    lines = text.split("\n")
    h = {"first": lines[0][:600] if lines else ""}
    if cmd == "query":
        h["truncated"] = any(l.startswith("[!] TRUNCATED") for l in lines[:3])
        h["context_filter"] = ("| Context:" in (lines[0] if lines else ""))
        m = re.search(r"\| (\d+) nodes found", lines[0] if lines else "")
        h["nodes_found"] = int(m.group(1)) if m else None
    return h


def read_result(ix, spec, res):
    text = res["stdout"]
    if spec["cmd"] == "query":
        items, unres = parse_query(ix, text)
    elif spec["cmd"] == "affected":
        items, unres = parse_affected(ix, text)
    else:
        items, unres = parse_explain(ix, text)
    return items, unres, header_of(spec["cmd"], text)


# ---------------------------------------------------------------- jobs
def stage_graph(key):
    src = os.path.join("/graphs", key, "graphify-out")
    dst_root = os.path.join("/tmp/g", key)
    dst = os.path.join(dst_root, "graphify-out")
    if not os.path.exists(os.path.join(dst, "graph.json")):
        os.makedirs(dst, exist_ok=True)
        for f in os.listdir(src):
            p = os.path.join(src, f)
            if os.path.isfile(p):
                shutil.copy(p, dst)
    return dst_root, os.path.join(dst, "graph.json")


def tasks_job(job):
    specs = job["calls"]
    for grp in job["groups"]:
        key = grp["graph"]
        outf = os.path.join("/out", key + ".jsonl.gz")
        want = sorted(t["id"] for t in grp["tasks"])
        if os.path.exists(outf):
            have = sorted(json.loads(l)["id"] for l in gzip.open(outf, "rt"))
            if have == want:
                log("skip %s (done, %d tasks)" % (key, len(want)))
                continue
        t0 = time.time()
        root, gpath = stage_graph(key)
        ix = Index(gpath)
        plan = []  # (task index, call key, argv)
        sres_all = []
        for ti, t in enumerate(grp["tasks"]):
            sres = resolve_seed(ix, t["seed"])
            sres_all.append(sres)
            for ck, spec in specs.items():
                plan.append((ti, ck, argv_for(spec, t["seed"], sres, gpath)))
        with ThreadPoolExecutor(WORKERS) as ex:
            futs = [ex.submit(run, a, root) if a else None for (_ti, _ck, a) in plan]
            results = [f.result() if f else None for f in futs]
        recs = [{"id": t["id"], "set": t["set"], "split": t["split"], "parent": t["parent"], "graph": key,
                 "seed": t["seed"], "seed_res": sres_all[i], "query_text": query_text(t["seed"]), "calls": {}}
                for i, t in enumerate(grp["tasks"])]
        for (ti, ck, a), res in zip(plan, results):
            if a is None:
                recs[ti]["calls"][ck] = {"skipped": "no definition node in graph", "argv": None, "exit": None, "ms": 0, "items": [], "unresolved": 0}
                continue
            items, unres, hdr = read_result(ix, specs[ck], res)
            recs[ti]["calls"][ck] = {"argv": [("<graph>" if x == gpath else x) for x in a], "exit": res["exit"], "ms": res["ms"],
                                    "items": items, "unresolved": unres, "header": hdr,
                                    "stdout": res["stdout"], "stderr": res["stderr"]}
        with gzip.open(outf + ".part", "wt") as f:
            for r in recs:
                f.write(json.dumps(r) + "\n")
        os.replace(outf + ".part", outf)
        shutil.rmtree(root, ignore_errors=True)
        log("done %s: %d tasks, %d calls, %.1f s" % (key, len(recs), sum(1 for p in plan if p[2]), time.time() - t0))


def tq_job(job):
    key = job["graph"]
    root, gpath = stage_graph(key)
    for v in job["variants"]:
        outf = os.path.join("/out", "tq." + v["name"] + ".jsonl")
        argvs = []
        for q in job["questions"]:
            a = ["graphify", "query", q["question"]]
            if v.get("budget"):
                a += ["--budget", str(v["budget"])]
            argvs.append(a + ["--graph", gpath])
        with ThreadPoolExecutor(WORKERS) as ex:
            results = list(ex.map(lambda a: run(a, root), argvs))
        with open(outf + ".part", "w") as f:
            for q, a, r in zip(job["questions"], argvs, results):
                f.write(json.dumps({"id": q["id"], "split": q["split"], "variant": v["name"],
                                    "argv": [("<graph>" if x == gpath else x) for x in a],
                                    "exit": r["exit"], "ms": r["ms"], "text": r["stdout"], "stderr": r["stderr"]}) + "\n")
        os.replace(outf + ".part", outf)
        log("tq %s: %d questions" % (v["name"], len(results)))


def main():
    job = json.load(open(sys.argv[1]))
    if job["kind"] == "tasks":
        tasks_job(job)
    elif job["kind"] == "tq":
        tq_job(job)
    else:
        raise SystemExit("unknown job kind")


if __name__ == "__main__":
    main()
