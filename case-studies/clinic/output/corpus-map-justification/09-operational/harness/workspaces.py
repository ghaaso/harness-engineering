"""Build isolated trial workspaces and worker prompts (contract v1, section 3).

Usage: python -I -B workspaces.py --root tmp/trials --runs RUNS_JSON --out PROMPTS_JSON
RUNS_JSON: [{"arm":"M|R|G","case":"C1","run":1,"corpus":DIR,"store":DIR(M),"graph":DIR(G)}, ...]
Each workspace <root>/<arm>-<case>-r<run>/ holds a corpus copy plus that arm's materials only. Prompts are built from
validation/tasks.json (task text, common rules, answer format) and a short arm brief. No reference material is copied.
"""
import argparse
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
OPS = HERE.parent
REPO = OPS.parents[1]
PY = "C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe"
GRAPHIFY = (REPO / "tmp/graphify-venv/Scripts/graphify.exe").as_posix()
GRAPHIFY_QUERY_DOC = REPO / "tmp/graphify-venv/Lib/site-packages/graphify/skills/windows/references/query.md"


def brief(arm, ws):
    w = ws.as_posix()
    if arm == "M":
        return (f"Your workspace is {w}. The plan documents are in {w}/corpus (paths like docs/technical-plan/decision-log.md).\n"
                f"A persisted corpus map of these documents is available. Read {w}/map/QUICKSTART.md first, then use it with:\n"
                f"  CMAP = & \"{PY}\" -I -B \"{w}/map/tools/cmap.py\"\n  STORE = {w}/map/store\n  CORPUS = {w}/corpus\n"
                f"You may also read source lines from {w}/corpus directly.")
    if arm == "R":
        return (f"Your workspace is {w}. The plan documents are in {w}/corpus (paths like docs/technical-plan/decision-log.md).\n"
                f"Use the project's existing routed reading workflow to decide what to read: the AGENTS.md routing already in your "
                f"instructions, the coding launcher {w}/routing/docs/prompts/coding-task-launcher.md and the context map "
                f"{w}/routing/docs/agentic-coding/project-context-routing.md (copies). Links in those routing documents point to "
                f"documents under docs/; read them from {w}/corpus/docs/ (anything not present there is outside the provided documents).")
    if arm == "G":
        return (f"Your workspace is {w}. The plan documents are in {w}/corpus (paths like docs/technical-plan/decision-log.md).\n"
                f"A Graphify knowledge graph built over these documents is in {w}/corpus/graphify-out/ (graph.json, GRAPH_REPORT.md).\n"
                f"Read Graphify's own query instructions in {w}/GRAPHIFY-QUERY.md first, then use its CLI, for example:\n"
                f"  & \"{GRAPHIFY}\" query \"<question>\" --graph \"{w}/corpus/graphify-out/graph.json\" --budget 2000\n"
                f"  (also: path \"A\" \"B\", explain \"X\", affected \"X\", each with --graph). For the vocabulary step use python at "
                f"\"{REPO.as_posix()}/tmp/graphify-venv/Scripts/python.exe\" and print the vocabulary instead of writing files.\n"
                f"Do not run graphify install, hook, save-result, update, extract or any command that writes files. You may also read "
                f"source lines from {w}/corpus directly.")
    raise ValueError(arm)


def build(root, spec, tasks):
    ws = Path(root) / f"{spec['arm']}-{spec['case']}-r{spec['run']}"
    if ws.exists():
        shutil.rmtree(ws)
    ws.mkdir(parents=True)
    shutil.copytree(spec["corpus"], ws / "corpus", ignore=shutil.ignore_patterns("graphify-out"))
    if spec["arm"] == "M":
        shutil.copytree(spec["store"], ws / "map/store", ignore=shutil.ignore_patterns("incoming", "rejects.jsonl"))
        (ws / "map/tools").mkdir(parents=True)
        shutil.copy2(OPS / "tools/cmap.py", ws / "map/tools/cmap.py")
        shutil.copy2(OPS / "QUICKSTART.md", ws / "map/QUICKSTART.md")
        man = json.loads((ws / "map/store/manifest.json").read_text(encoding="utf-8"))
        man["corpus_root"] = "../../corpus"
        (ws / "map/store/manifest.json").write_text(json.dumps(man, indent=1, ensure_ascii=False), encoding="utf-8")
    elif spec["arm"] == "R":
        for rel in ("AGENTS.md", "docs/prompts/coding-task-launcher.md", "docs/agentic-coding/project-context-routing.md"):
            dst = ws / "routing" / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(REPO / rel, dst)
    elif spec["arm"] == "G":
        g = ws / "corpus/graphify-out"
        g.mkdir(parents=True)
        for name in ("graph.json", "GRAPH_REPORT.md", ".graphify_labels.json", ".graphify_analysis.json"):
            if (Path(spec["graph"]) / name).exists():
                shutil.copy2(Path(spec["graph"]) / name, g / name)
        shutil.copy2(GRAPHIFY_QUERY_DOC, ws / "GRAPHIFY-QUERY.md")
    case = tasks["cases"][spec["case"]]
    prompt = "\n\n".join([
        "You are answering a planning question about a software project's plan documents, in a fresh session.",
        brief(spec["arm"], ws),
        "Rules:\n" + "\n".join(f"- {r}" for r in tasks["common_rules"]),
        "Task:\n" + case["task"],
        "Answer format (your final reply must follow it exactly):\n" + tasks["answer_format"],
    ])
    (ws / "prompt.txt").write_text(prompt, encoding="utf-8")
    return ws, prompt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--runs", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    tasks = json.loads((OPS / "validation/tasks.json").read_text(encoding="utf-8"))
    specs = json.loads(Path(a.runs).read_text(encoding="utf-8"))
    out = []
    for s in specs:
        ws, prompt = build(a.root, s, tasks)
        out.append({"label": f"{s['arm']}-{s['case']}-r{s['run']}", "workspace": ws.as_posix(), "prompt": prompt})
        print(f"{out[-1]['label']}: {ws}  prompt {len(prompt)} chars")
    Path(a.out).write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
