"""Create corpus snapshot S1-prime: a labelled modified copy of S1 for the changed-source case (C5).

Usage: python -I -B make_modified_snapshot.py SRC_CORPUS_DIR DEST_CORPUS_DIR
Copies SRC to DEST, then applies the edits below. Each edit must match exactly once, or the script fails.
The edits are test modifications, not clinic facts.
"""
import shutil
import sys
from pathlib import Path

EDITS = [
    # 1. Insert two lines after the definition-of-done paragraph; shifts every later line of the file by 2.
    ("docs/technical-plan/implementation-plan.md",
     "Do not substitute a percentage coverage target for these outcomes.\n",
     "Do not substitute a percentage coverage target for these outcomes.\n\n"
     "Revision note (test copy): slice prerequisites below were revised; check each slice's Depends on line.\n"),
    # 2. S06 now also depends on S07 cash accounts (S07 itself depends on S06 for supplier cash flows).
    ("docs/technical-plan/implementation-plan.md",
     "**Depends on:** S03/S02; S05 for correction/reversal UI.",
     "**Depends on:** S03/S02 and S07 cash accounts; S05 for correction/reversal UI."),
    # 3. Q-07 timing moved earlier.
    ("docs/technical-plan/decision-log.md",
     "| Q-07 before supplier settlement/openings |",
     "| Q-07 before S06 development starts |"),
]


def main(src, dst):
    src, dst = Path(src), Path(dst)
    if dst.exists():
        raise SystemExit(f"destination exists: {dst}")
    shutil.copytree(src, dst)
    for rel, old, new in EDITS:
        p = dst / rel
        text = p.read_bytes().decode("utf-8")
        if text.count(old) != 1:
            raise SystemExit(f"edit target not unique in {rel}: {old[:60]!r}")
        p.write_bytes(text.replace(old, new).encode("utf-8"))
    print(f"S1-prime written to {dst} ({len(EDITS)} edits)")


if __name__ == "__main__":
    main(*sys.argv[1:3])
