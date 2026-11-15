"""Check the redesigned restoration against the first review's six defects and the adversary's fifteen."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

CODE = Path(sys.argv[1]) / "tools" / "context_system"
REAL = [Path(p) for p in sys.argv[2:]]
tmp = Path(tempfile.mkdtemp(prefix="ctxv3-"))
os.environ["CLAUDE_CONFIG_DIR"] = str(tmp / "claude")
root = tmp / "proj"
(root / "docs/tasks/a").mkdir(parents=True)
(root / "docs/tasks/b").mkdir(parents=True)
os.environ["CLAUDE_PROJECT_DIR"] = str(root)
sys.path.insert(0, str(CODE))
import core  # noqa: E402
import hooks  # noqa: E402
import ledger  # noqa: E402
import recall  # noqa: E402

tdir = core.transcripts_dir(root)
tdir.mkdir(parents=True)
R = {}
_n = [0]


def uid():
    _n[0] += 1
    return f"{_n[0]:08d}-0000"


def rec(kind, content, **kw):
    r = {"type": kind, "message": {"role": kind, "content": content}, "uuid": uid(),
         "timestamp": "2026-10-10T00:00:00Z", "cwd": str(root)}
    r.update(kw)
    return r


def assistant(blocks, ctx=1000):
    r = rec("assistant", blocks)
    r["message"].update({"id": uid(), "model": "claude-opus-5-5", "usage": {"input_tokens": ctx, "output_tokens": 10}})
    return r


def write_ok(path, tid):
    return [assistant([{"type": "tool_use", "id": tid, "name": "Write", "input": {"file_path": str(path), "content": "x"}}]),
            rec("user", [{"type": "tool_result", "tool_use_id": tid, "content": "ok"}])]


def new_session(sid, records):
    tp = tdir / f"{sid}.jsonl"
    tp.write_text("".join(json.dumps(r) + "\n" for r in records), encoding="utf-8")
    return tp, {"transcript_path": str(tp), "session_id": sid, "trigger": "auto", "cwd": str(root)}


def boundary(tp):
    with open(tp, "a", encoding="utf-8") as fh:
        fh.write(json.dumps({"type": "system", "subtype": "compact_boundary"}) + "\n")


def append(tp, records):
    with open(tp, "a", encoding="utf-8") as fh:
        for r in records:
            fh.write(json.dumps(r) + "\n")


def restore(pl):
    return hooks.handle("SessionStart", dict(pl, source="compact"))["hookSpecificOutput"]["additionalContext"]


def archive(sid):
    return core.runtime_dir_for(str(tdir / f"{sid}.jsonl"), root) / "archive" / sid


A = root / "docs/tasks/a/task.md"

# T01: many short covered sections -> every covered block verbatim in restored text; obligations intact
A.write_text("Status: x\n\n## Decisions\n" + "".join(f"\n### Decision D{i:03d}\n" + ("- reason text " * 12) + "\n" for i in range(60))
             + "\n## Next action\n- N1 run the replay\n\n## Background\n" + ("filler\n" * 3000), encoding="utf-8")
tp, pl = new_session("s-t01", write_ok(A, "w1") + [rec("user", f"correction {i}", origin={"kind": "human"}) for i in range(12)])
instr = hooks.handle("PreCompact", pl)
meta = hooks.Ctx(pl).metas()[-1]
out = restore(pl)
text = ledger.read_state_text(A)[0]
cands = {b["label"]: b for b in ledger.restore_candidates(text, core.load_config()["restore_sections"], 100)}
R["T01 covered blocks all verbatim in restore"] = all(cands[c["label"]]["text"] in out for c in meta["covered"])
R["T01 restore within cap"] = len(out) <= 9800
R["T01 obligations never cut"] = ("must be carried by the summary" in instr or "must carry" in instr) and "user instruction and correction" in instr
R["T01 instr names exactly the covered labels"] = all(c["label"] in instr for c in meta["covered"])

# F1: long Current state; Next action + Decisions restored whole, Current state not claimed
A.write_text("Status: in progress\n\n## Current state\n" + ("- detail line about progress\n" * 400)
             + "\n## Decisions\n- D1 keep port 8471\n\n## Next action\n- N1 run the replay\n", encoding="utf-8")
tp, pl = new_session("s-f1", write_ok(A, "w1"))
instr = hooks.handle("PreCompact", pl)
out = restore(pl)
R["F1 next+decisions restored, current state not claimed"] = ("D1 keep port 8471" in out and "N1 run the replay" in out
                                                              and "Current state" not in instr.split("\n")[1])

# T02a: '#' inside code fence is not a heading; whole Next action restored
A.write_text("# Task X\n\n## Next action\n1. Rebuild:\n```powershell\n# build the fixture package\nGet-Item x\n```\n2. Step two\n3. Step three\n\n## Decisions\n- d1\n\n## Background\n" + ("b\n" * 6000), encoding="utf-8")
tp, pl = new_session("s-t02a", write_ok(A, "w1"))
hooks.handle("PreCompact", pl)
out = restore(pl)
R["T02a fenced '#' not a heading; steps 2-3 restored"] = "2. Step two" in out and "3. Step three" in out and "# build the fixture package" in out

# T02c: superseded parent excluded; current phase decisions restored with parent path label
A.write_text("# Task Y\n\n## Phase 1 (done, superseded)\n### Decisions\n- use SQLite\n### Next action\n- old\n\n## Phase 2 (current)\n### Decisions\n- use Postgres\n### Next action\n- new step\n#### Step detail\n- sub step text\n\n## Notes\n" + ("n\n" * 6000), encoding="utf-8")
tp, pl = new_session("s-t02c", write_ok(A, "w1"))
instr = hooks.handle("PreCompact", pl)
out = restore(pl)
R["T02c superseded excluded, current restored with subsections"] = ("use Postgres" in out and "sub step text" in out
                                                                    and "use SQLite" not in out and "Phase 2 (current) > Decisions" in instr)

# T03a: newest consumed; later compaction without PreCompact must NOT fall back to an older snapshot
A.write_text("## Next action\n- STEP-A\n", encoding="utf-8")
tp, pl = new_session("s-t03a", write_ok(A, "w1"))
hooks.handle("PreCompact", pl)                     # P1 (compaction then fails)
A.write_text("## Next action\n- STEP-B\n", encoding="utf-8")
time.sleep(1.1)
hooks.handle("PreCompact", pl)                     # P2
boundary(tp)
r1 = restore(pl)
A.write_text("## Next action\n- STEP-C\n", encoding="utf-8")
append(tp, [assistant([{"type": "text", "text": "more"}])])
boundary(tp)                                       # cycle 2, PreCompact did not run
r2 = restore(pl)
R["T03a cycle1 restores newest (STEP-B)"] = "STEP-B" in r1 and "STEP-A" not in r1
R["T03a cycle2 does not restore stale STEP-A"] = "STEP-A" not in r2 and "STEP-B" not in r2

# T03b: no wall-clock age limit; old-but-current snapshot still restored
A.write_text("## Next action\n- STEP-Q\n", encoding="utf-8")
tp, pl = new_session("s-t03b", write_ok(A, "w1"))
hooks.handle("PreCompact", pl)
mp = next(archive("s-t03b").glob("*-meta.json"))
m = json.loads(mp.read_text())
real_time = time.time
time.time = lambda: real_time() + 5000
boundary(tp)
r = restore(pl)
time.time = real_time
R["T03b restored regardless of elapsed time"] = "STEP-Q" in r

# boundary binding: snapshot from an earlier boundary count refused truthfully
A.write_text("## Next action\n- STEP-OLD\n", encoding="utf-8")
tp, pl = new_session("s-bind", write_ok(A, "w1"))
hooks.handle("PreCompact", pl)                     # saved at boundaries=0
boundary(tp); boundary(tp); boundary(tp)           # now 3: not this compaction
r = restore(pl)
R["binding: mismatched snapshot refused with truthful note"] = ("NOT restored" in r and "whole file" in r and "STEP-OLD" not in r)
print("binding note:", r[:420])

# T03c/T07: state updated after snapshot -> exact snapshot first, then 'changed on disk' with current text
A.write_text("## Next action\n- STEP-OLD: fixture v1\n\n## Decisions\n- d1\n", encoding="utf-8")
tp, pl = new_session("s-t03c", write_ok(A, "w1"))
hooks.handle("PreCompact", pl)
snap = next(archive("s-t03c").glob("*-restore.md")).read_text(encoding="utf-8")
A.write_text("## Next action\n- STEP-NEW: fixture v2 only (user correction)\n\n## Decisions\n- d1\n- d2 correction\n", encoding="utf-8")
boundary(tp)
r = restore(pl)
R["T03c snapshot bytes restored exactly as prefix"] = r.startswith(snap)
R["T03c newer on-disk text reported"] = "Changed on disk after this snapshot" in r and "STEP-NEW" in r and "d2 correction" in r

# unchanged file -> output equals snapshot exactly
A.write_text("## Next action\n- SAME\n", encoding="utf-8")
tp, pl = new_session("s-same", write_ok(A, "w1"))
hooks.handle("PreCompact", pl)
snap = next(archive("s-same").glob("*-restore.md")).read_text(encoding="utf-8")
boundary(tp)
R["unchanged file: output == snapshot bytes"] = restore(pl) == snap
second = restore(pl)   # the boundary exists now, so this is a later compaction with no new snapshot
R["later compaction without a snapshot: not restored again, truthful"] = ("SAME" not in second
                                                                         and "No snapshot was saved for this compaction" in second)

# T03d: same-second snapshots ordered by sequence, newest wins
A.write_text("## Next action\n- STEP-1 older\n", encoding="utf-8")
tp, pl = new_session("s-t03d", write_ok(A, "w1"))
real_stamp = core.utc_stamp
hooks.utc_stamp = lambda: "20261010T101500Z"
hooks.handle("PreCompact", pl)
A.write_text("## Next action\n- STEP-2 newer\n", encoding="utf-8")
hooks.handle("PreCompact", pl)
hooks.utc_stamp = real_stamp
boundary(tp)
R["T03d same-second: newest restored"] = "STEP-2 newer" in restore(pl)

# T03e: summary tagging; cycle 2 without PreCompact gets a nosnap tag, never cycle 1's
tp, pl = new_session("s-t03e", write_ok(A, "w1"))
hooks.handle("PreCompact", pl); boundary(tp); restore(pl)
hooks.handle("PostCompact", dict(pl, compact_summary="SUMMARY OF CYCLE 1"))
append(tp, [assistant([{"type": "text", "text": "more"}])]); boundary(tp); restore(pl)
hooks.handle("PostCompact", dict(pl, compact_summary="SUMMARY OF CYCLE 2"))
names = sorted(p.name for p in archive("s-t03e").glob("*-summary*.md"))
R["T03e summaries filed under distinct, correct tags"] = len(names) == 2 and any(n.startswith("nosnap-") for n in names) and any(n.startswith("s0001-c001") for n in names)

# F4: corrupt state never overwrites archive
tp, pl = new_session("s-f4", write_ok(A, "w1"))
hooks.handle("PreCompact", pl)
before = {p.name: p.read_bytes() for p in archive("s-f4").iterdir()}
sp = core.runtime_dir_for(str(tp), root) / "sessions" / "s-f4.json"
sp.parent.mkdir(parents=True, exist_ok=True); sp.write_text("{corrupt", encoding="utf-8")
boundary(tp); restore(pl); append(tp, [assistant([{"type": "text", "text": "w2"}])])
hooks.handle("PreCompact", pl)
R["F4 archive never overwritten"] = all((archive("s-f4") / n).read_bytes() == b for n, b in before.items())

# T04a: focus is per session
B = root / "docs/tasks/b/task.md"
A.write_text("## Next action\n- A-NEXT\n", encoding="utf-8"); B.write_text("## Next action\n- B-NEXT\n", encoding="utf-8")
tpA, plA = new_session("s-focus-a", write_ok(A, "w1"))
tpB, plB = new_session("s-focus-b", write_ok(B, "w1"))
py = sys.executable
fr = subprocess.run([py, "-I", "-B", str(CODE / "ctx.py"), "focus", "docs/tasks/a/task.md", "--session", "s-focus-a"],
                    capture_output=True, text=True, env=dict(os.environ), cwd=str(root / "docs"))
hooks.handle("PreCompact", plB); boundary(tpB)
R["T04a session B unaffected by A's focus"] = "B-NEXT" in restore(plB) and fr.returncode == 0
R["T04b focus from a subfolder lands in the session's state"] = hooks.Ctx(plA).state().get("focus") == "docs/tasks/a/task.md"

# T04c: outside-root focus rejected; outside-root state file never chosen
outside = tmp / "elsewhere" / "task.md"; outside.parent.mkdir(); outside.write_text("## Next action\n- OUTSIDE\n", encoding="utf-8")
fr2 = subprocess.run([py, "-I", "-B", str(CODE / "ctx.py"), "focus", str(outside), "--session", "s-focus-a"],
                     capture_output=True, text=True, env=dict(os.environ))
tp, pl = new_session("s-out", write_ok(outside, "w1"))
R["T04c outside-root focus rejected and file not chosen"] = fr2.returncode == 1 and hooks.Ctx(pl).state_file() is None

# T04d: archive/ handoff not chosen over the task being edited
(root / "archive/2025").mkdir(parents=True); H = root / "archive/2025/handoff.md"; H.write_text("## Next action\n- ARCHIVED\n", encoding="utf-8")
recs = []
for i in range(5):
    recs += write_ok(A, f"a{i}")
recs += write_ok(H, "h1")
tp, pl = new_session("s-t04d", recs)
R["T04d active task.md chosen over archived handoff"] = hooks.Ctx(pl).state_file() == "docs/tasks/a/task.md"

# T04e: Claude Code slug rule for >200-char paths
long_path = "C:\\" + "\\".join(["segment-with-some-length"] * 12)
slug = core.project_slug(long_path)
h = 0
for ch in long_path:
    h = (31 * h + ord(ch)) & 0xFFFFFFFF
h = h - 0x100000000 if h >= 0x80000000 else h
n, d = abs(h), ""
while True:
    n, r_ = divmod(n, 36); d = "0123456789abcdefghijklmnopqrstuvwxyz"[r_] + d
    if n == 0:
        break
R["T04e long-path slug = first 200 chars + '-' + base36 hash"] = len(long_path) > 200 and slug == core.project_slug(long_path)[:200] + "-" + d and len(slug) == 201 + len(d)

# T05: non-UTF-8 never claimed verbatim; BOM handled
A.write_bytes("## Next action\n- Paracetamol 500 mg \u2014 shelf B\n".encode("cp1252"))
tp, pl = new_session("s-t05", write_ok(A, "w1"))
instr = hooks.handle("PreCompact", pl)
R["T05 cp1252 file not claimed restored"] = "No task-state text is restored verbatim" in instr and not hooks.Ctx(pl).metas()[-1]["covered"]
A.write_bytes(b"\xef\xbb\xbf" + "## Next action\n- BOM-OK \u2014 fine\n".encode("utf-8"))
tp, pl = new_session("s-t05b", write_ok(A, "w1"))
hooks.handle("PreCompact", pl); boundary(tp)
R["T05 UTF-8 BOM file restored exactly"] = "BOM-OK \u2014 fine" in restore(pl)

# T08: exact names only (no substring false positives); numbering ignored
txt = "## Spending and expenses\nx\n\n## Resume parsing\ny\n\n## 4. Next action\n- real\n\n## Superseded decisions (historical)\n- old\n" + ("pad\n" * 4000)
labels = [b["label"] for b in ledger.restore_candidates(txt, core.load_config()["restore_sections"], 100)]
R["T08 exact heading names only"] = len(labels) == 1 and labels[0].startswith("4. Next action")

# markers override
txt = "intro\n<!-- ctx:restore -->\nKEEP THIS\n<!-- /ctx:restore -->\n## Next action\n- not marked\n" + ("pad\n" * 4000)
cb = ledger.restore_candidates(txt, core.load_config()["restore_sections"], 100)
R["marked blocks override names"] = len(cb) == 1 and cb[0]["text"] == "KEEP THIS"

# F2 failed edit; F3/F5 recall exact refs + subagents; isolation
l2 = ledger.build_ledger([(0, assistant([{"type": "tool_use", "id": "t1", "name": "Edit", "input": {"file_path": str(A), "old_string": "n", "new_string": "x"}}])),
                          (1, rec("user", [{"type": "tool_result", "tool_use_id": "t1", "is_error": True, "content": "not found"}]))], root)
R["F2 failed edit is a failure, not a change"] = not l2["changed"] and len(l2["failures"]) == 1
for sid, text in (("aaaaaaaa-1111", "alpha first session unrelated text"), ("bbbbbbbb-2222", "zebra second session target text")):
    d = tdir / "context-system" / "archive" / sid; d.mkdir(parents=True)
    (d / "s0001-c001-20261010T000000Z-window.jsonl").write_text(json.dumps(rec("user", text)) + "\n", encoding="utf-8")
hits = recall.search("zebra target", root)
shown = recall.show(hits[0]["ref"], root) if hits else ""
R["F3 exact refs across sessions"] = "zebra second" in shown and "alpha" not in shown
sub = tdir / "s-f4" / "subagents" / "agent-x.jsonl"; sub.parent.mkdir(parents=True)
sub.write_text(json.dumps(rec("user", "quokka delegated finding")) + "\n", encoding="utf-8")
h5 = recall.search("quokka delegated", root)
R["F5 subagent transcripts searchable"] = bool(h5) and h5[0]["kind"].startswith("sub:")
R["recall show rejects traversal"] = "No " in recall.show("../../../x.jsonl:0:0", root)

# real transcript copy in a sandbox: outside-root state file not picked up; instructions keep the corrections directive
for real in REAL:
    sb = tmp / "sandbox"; sb.mkdir(exist_ok=True)
    rdir = core.transcripts_dir(sb); rdir.mkdir(parents=True, exist_ok=True)
    cp = rdir / real.name; shutil.copyfile(real, cp)
    plr = {"transcript_path": str(cp), "session_id": real.stem, "trigger": "auto", "cwd": str(sb)}
    os.environ["CLAUDE_PROJECT_DIR"] = str(sb)
    s = time.perf_counter(); instr = hooks.handle("PreCompact", plr); t_pre = time.perf_counter() - s
    os.environ["CLAUDE_PROJECT_DIR"] = str(root)
    R[f"real {real.stem[:8]}: sandbox ignores real project's state file"] = "No task-state text is restored verbatim" in instr
    R[f"real {real.stem[:8]}: corrections directive present, <= budget"] = "user instruction and correction" in instr and len(instr) <= 6000
    print(f"{real.stem[:8]}: PreCompact {t_pre:.2f}s, instructions {len(instr)} chars")

fails = [k for k, v in R.items() if not v]
for k, v in R.items():
    print(f"{'PASS' if v else 'FAIL'}  {k}")
print(f"\n{len(R) - len(fails)}/{len(R)} passed")
