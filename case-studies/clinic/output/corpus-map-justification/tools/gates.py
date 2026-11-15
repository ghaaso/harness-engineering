"""Mechanical checks for gates G4 (design) and G5 (attacks and responses); renders review tables.

Usage:
  python gates.py g4 --workdir W     design sections, rejection check, borrowed-vs-required, citations
  python gates.py g5a --workdir W    attacks: schema, rule quotes, passages quote-checked against the pilot
  python gates.py g5b --workdir W    responses: one per attack, accept->diff, reject->G1|G2 with evidence
Exit status 1 when any error is found. g4 also writes rejection-check.md and borrowed-required.md.
"""
import argparse
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from textnorm import find_quote, normalize  # noqa: E402

SECTIONS = ["Candidate formalisms", "Status model", "Kind model and codebook", "Identity layer", "Gap model",
            "Derived results and path semantics", "Query levels", "Candidate index", "Coverage ledger",
            "Reading procedure", "Packaging and D9 proof", "Overrides", "Unresolved claims"]
R_RULES = [f"R{i}" for i in range(1, 7)]
D_RULES = [f"D{i}" for i in range(1, 12)]
CLASS_RULES = {"reading-procedure": {"R1", "R2", "R3"}, "model-store": {"R4", "R5", "R6"}}
QID = re.compile(r"\bL[1-8]-F\d{2,3}\.q\d+\b")
PILOT_TABLE = "03-pilot/pilot-files.json"   # frozen path -> SHA-256; loaded only by the G5 checks


def jsonl(path, errors):
    rows = []
    if not path.exists():
        errors.append(f"{path.name} missing")
        return rows
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.strip():
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                errors.append(f"{path.name} line {n}: invalid JSON ({exc})")
    return rows


def supported_quotes(W):
    ok, known = set(), set()
    for line in (W / "02-pack" / "pack.jsonl").read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        if r.get("record") == "finding":
            for q in r["quotes"]:
                known.add(q["quote_id"])
                if q["verified"] and not q.get("in_abstract") and r["support"] == "supported":
                    ok.add(q["quote_id"])
    return ok, known


def cell(s):
    return str(s).replace("|", "/").replace("\n", " ")


def g4(W):
    errors, D = [], W / "04-design"
    design = (D / "design.md").read_text(encoding="utf-8") if (D / "design.md").exists() else ""
    if not design:
        errors.append("design.md missing")
    heads = {h.strip().lower() for h in re.findall(r"^##\s+(.+)$", design, re.M)}
    for s in SECTIONS:
        if s.lower() not in heads:
            errors.append(f"design.md lacks section '## {s}'")
    ok, known = supported_quotes(W)
    for q in sorted(set(QID.findall(design))):
        if q not in known:
            errors.append(f"design.md cites {q}, which is not in the pack")
        elif q not in ok:
            errors.append(f"design.md cites {q} as a source, but it is not a verified quote of a supported finding")
    rc = jsonl(D / "rejection-check.jsonl", errors)
    by_cand = {}
    for n, r in enumerate(rc, 1):
        miss = {"candidate", "candidate_class", "rule", "score", "reason", "quote_ids"} - r.keys()
        if miss:
            errors.append(f"rejection-check line {n}: missing {sorted(miss)}")
            continue
        if r["score"] not in ("pass", "fail", "N/A"):
            errors.append(f"rejection-check line {n}: score must be pass|fail|N/A")
        if not str(r["reason"]).strip():
            errors.append(f"rejection-check line {n}: blank reason")
        cls = r["candidate_class"]
        if cls not in ("reading-procedure", "model-store", "whole-design"):
            errors.append(f"rejection-check line {n}: bad candidate_class {cls!r}")
        elif cls in CLASS_RULES and r["rule"] in R_RULES and r["rule"] not in CLASS_RULES[cls] and r["score"] != "N/A":
            errors.append(f"rejection-check line {n}: {r['rule']} does not apply to a {cls}; score it N/A with a reason")
        for q in r["quote_ids"]:
            if q not in ok:
                errors.append(f"rejection-check line {n}: {q} is not a verified quote of a supported finding")
        by_cand.setdefault((r["candidate"], cls), {})[r["rule"]] = r
    if not any(c == "whole-design" for _, c in by_cand):
        errors.append("rejection-check has no whole-design row set")
    for (cand, cls), rules in by_cand.items():
        need = R_RULES + (D_RULES if cls == "whole-design" else [])
        for rule in need:
            if rule not in rules:
                errors.append(f"rejection-check: {cand!r} has no cell for {rule} (blank cell)")
    br = jsonl(D / "borrowed-required.jsonl", errors)
    for n, r in enumerate(br, 1):
        miss = {"element", "section", "basis", "quote_ids", "note"} - r.keys()
        if miss:
            errors.append(f"borrowed-required line {n}: missing {sorted(miss)}")
            continue
        if r["basis"] == "borrowed":
            if not r["quote_ids"]:
                errors.append(f"borrowed-required line {n}: borrowed element without a quote ID")
            for q in r["quote_ids"]:
                if q not in ok:
                    errors.append(f"borrowed-required line {n}: {q} is not a verified quote of a supported finding")
        elif r["basis"] == "required":
            if r["quote_ids"] or not str(r["note"]).startswith("required: no source covers it"):
                errors.append(f"borrowed-required line {n}: required element must have no quote IDs and a note "
                              "starting 'required: no source covers it'")
        else:
            errors.append(f"borrowed-required line {n}: basis must be borrowed|required")
    elements = {r.get("element") for r in br}
    for rule_id in sorted(set(re.findall(r"\*\*([A-Z]{1,4}-\d+)\*\*", design))):
        if rule_id not in elements:
            errors.append(f"design element {rule_id} has no borrowed-vs-required row")
    if rc:
        lines = ["# Rejection check", "", "Generated from rejection-check.jsonl. N/A is never a pass.", ""]
        for (cand, cls), rules in by_cand.items():
            lines += [f"## {cand} ({cls})", "", "| Rule | Score | Reason | Quotes |", "| --- | --- | --- | --- |"]
            for rule in R_RULES + D_RULES:
                if rule in rules:
                    r = rules[rule]
                    lines.append(f"| {rule} | {r['score']} | {cell(r['reason'])} | {', '.join(r['quote_ids'])} |")
            lines.append("")
        (D / "rejection-check.md").write_text("\n".join(lines), encoding="utf-8")
    if br:
        lines = ["# Borrowed vs required", "", "Generated from borrowed-required.jsonl.", "",
                 "| Element | Section | Basis | Quotes | Note |", "| --- | --- | --- | --- | --- |"]
        lines += [f"| {cell(r.get('element'))} | {cell(r.get('section'))} | {r.get('basis')} | "
                  f"{', '.join(r.get('quote_ids', []))} | {cell(r.get('note'))} |" for r in br]
        (D / "borrowed-required.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return errors, {"candidates": len(by_cand), "rejection_cells": len(rc), "elements": len(br),
                    "borrowed": sum(r.get("basis") == "borrowed" for r in br),
                    "required": sum(r.get("basis") == "required" for r in br)}


def block_has(W, text):
    spans, _ = find_quote(text, normalize((W / "00-constraints.md").read_text(encoding="utf-8")))
    return spans is not None


def g5a(W):
    errors = []
    attacks = jsonl(W / "05-skeptic" / "attacks.jsonl", errors)
    pilot = W / "03-pilot" / "files"
    PILOT = json.loads((W / PILOT_TABLE).read_text(encoding="utf-8"))
    texts = {}
    for n, a in enumerate(attacks, 1):
        miss = {"attack_id", "line", "passage", "file", "version", "location", "produced", "rule", "rule_text",
                "argument"} - a.keys()
        if miss:
            errors.append(f"attack line {n}: missing {sorted(miss)}")
            continue
        if not re.fullmatch(r"A(10|[1-9])", a["line"]):
            errors.append(f"{a['attack_id']}: line must be A1..A10")
        if a["file"] not in PILOT:
            errors.append(f"{a['attack_id']}: file must be one of {sorted(PILOT)}")
            continue
        if a["version"] != PILOT[a["file"]]:
            errors.append(f"{a['attack_id']}: version must be the frozen SHA-256 of {a['file']}")
        if a["file"] not in texts:
            texts[a["file"]] = normalize((pilot / a["file"]).read_text(encoding="utf-8"))
        spans, reason = find_quote(a["passage"], texts[a["file"]])
        if spans is None:
            errors.append(f"{a['attack_id']}: passage fails the Phase 2 quote check ({reason})")
        if not block_has(W, a["rule_text"]):
            errors.append(f"{a['attack_id']}: rule_text is not a verbatim quote of the constraint block")
    ids = [a.get("attack_id") for a in attacks]
    if len(ids) != len(set(ids)):
        errors.append("attack_id values are not unique")
    return errors, {"attacks": len(attacks), "lines": sorted({a.get("line") for a in attacks})}


def g5b(W):
    errors = []
    attacks = {a["attack_id"]: a for a in jsonl(W / "05-skeptic" / "attacks.jsonl", errors)}
    responses = jsonl(W / "05-skeptic" / "responses.jsonl", errors)
    v1 = W / "04-design" / "design.v1.md"
    design_v1 = normalize(v1.read_text(encoding="utf-8")) if v1.exists() else ""
    seen = {}
    for n, r in enumerate(responses, 1):
        aid = r.get("attack_id")
        seen[aid] = seen.get(aid, 0) + 1
        if aid not in attacks:
            errors.append(f"response line {n}: unknown attack_id {aid!r}")
        d, g = r.get("decision"), r.get("ground")
        if d == "accept":
            if not str(r.get("diff", "")).strip():
                errors.append(f"{aid}: accepted without a diff")
        elif d == "reject":
            if g == "G1":
                step = str(r.get("design_step", ""))
                if not step.strip():
                    errors.append(f"{aid}: G1 rejection must show the design step")
                elif find_quote(step, design_v1)[0] is None:
                    errors.append(f"{aid}: G1 design_step is not a verbatim quote of design.v1.md")
            elif g == "G2":
                if not block_has(W, str(r.get("rule_quote", "")) or "\u0000"):
                    errors.append(f"{aid}: G2 rejection must quote the rule verbatim from the constraint block")
            else:
                errors.append(f"{aid}: a rejection must rest on exactly G1 or G2 (got {g!r})")
        else:
            errors.append(f"{aid}: decision must be accept or reject (no third kind of reply)")
    for aid in attacks:
        if seen.get(aid, 0) != 1:
            errors.append(f"{aid}: needs exactly one response (has {seen.get(aid, 0)})")
    return errors, {"responses": len(responses),
                    "accepted": sum(r.get("decision") == "accept" for r in responses),
                    "rejected_G1": sum(r.get("ground") == "G1" for r in responses),
                    "rejected_G2": sum(r.get("ground") == "G2" for r in responses)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("gate", choices=["g4", "g5a", "g5b"])
    ap.add_argument("--workdir", required=True)
    a = ap.parse_args()
    errors, stats = {"g4": g4, "g5a": g5a, "g5b": g5b}[a.gate](pathlib.Path(a.workdir))
    print(json.dumps({"gate": a.gate, "errors": len(errors), **stats}))
    for e in errors:
        print("ERROR ", e)
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
