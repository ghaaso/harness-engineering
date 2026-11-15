"""Print the lean workflow's resume state (args.state) from the files on disk.

Usage: python -B state.py <root>
"""
import json
import sys
from pathlib import Path

LANES = ["SLM-LOCAL", "PR-LOCAL", "PR-AI", "SLM-LIT", "HS-SD", "HS-HAZ", "WM-KD", "WM-SENSE", "WM-HW", "DES"]
WS = {"PROOF": "proof", "SLM-PLAN": "slm", "WM-FEAS": "wm"}


def jload(p):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def serious(review):
    return [x for x in (review or {}).get("issues", []) if x.get("severity") != "minor"]


def ws_state(folder):
    if (folder / "DONE.json").exists():
        return "final"
    review = jload(folder / "REVIEW.json")
    if review is not None:
        return "final" if not serious(review) else "reviewed"
    return "built" if (folder / "BUILD-REPORT.json").exists() else "none"


def main(root):
    r = Path(root)
    a = r / "A-research"
    lanes = {}
    for k in LANES:
        if jload(a / k / "claims.json") is not None:
            lanes[k] = "registered"
        elif jload(a / k / "claims.raw.json") is not None:
            lanes[k] = "raw"
        else:
            lanes[k] = "none"
    ws = {k: ws_state(r / "B-build" / f) for k, f in WS.items()}

    hs = r / "B-build" / "hs"
    plan = jload(hs / "model-plan.json")
    models = {}
    if plan is not None:
        for m in (plan.get("models") if isinstance(plan, dict) else plan) or []:
            key = m.get("key")
            if key:
                f = hs / "models" / key
                built = (f / "BUILD-REPORT.json").exists() and (f / "VALIDATION.md").exists()
                models[key] = {"title": m.get("title", key), "purpose": m.get("purpose", ""), "state": "built" if built else "none"}
    if (hs / "DONE.json").exists() and (hs / "HS-SUMMARY.md").exists():
        hs_state = "final"
    elif (hs / "REVIEW.json").exists():
        hs_state = "reviewed"
    elif plan is not None:
        hs_state = "planned"
    else:
        hs_state = "none"
    ws["HS"] = hs_state

    check = jload(r / "C-design" / "CHECK.json")
    deck = "spec" if (r / "C-design" / "deck-spec.json").exists() and check and not check.get("errors") else "none"
    d = r / "D-final"
    audit = {
        "audit": (d / "AUDIT.json").exists(),
        "qa": (d / "qa-prep.md").exists(),
        "final": (d / "slides.md").exists() and (d / "DONE.json").exists(),
    }
    print(json.dumps({"lanes": lanes, "ws": ws, "hsModels": models, "deck": deck, "audit": audit}))


if __name__ == "__main__":
    main(sys.argv[1])
