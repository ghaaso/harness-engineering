"""Deterministic scoring of the continuation tasks.

Input is what an evaluation branch left behind: the files it added, changed or deleted in the
sandbox project, its final reply, and (for E4) its one-line JSON report. No model judges anything.
Every check returns True (passed), False (failed) or None (nothing to judge: listed, never counted).

Categories: correction_applied, distant_evidence, rejected_avoided, instruction_kept, conversation_fact,
unfinished_work, plus early_file_fact, decision_applied and repeated_work_avoided.
"""
from __future__ import annotations

import csv
import io
import json
import re
from pathlib import Path
from typing import Any, Callable, Iterable

from .scenario import STARTER_CODE, TASK_FILE, EvalTask, Scenario

ID_RE = re.compile(r"^RBC?\d{4,6}$")
NUM_RE = re.compile(r"(?<![\w.])-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.])-?\d+(?:\.\d+)?")
TRUE = {"true", "1", "yes", "y", "t", "x", "flag", "flagged", "drift", "mismatch", "fail", "failed"}
FALSE = {"false", "0", "no", "n", "f", "", "-", "ok", "none", "pass", "passed"}
STATE_FILES = (TASK_FILE, "docs/findings.md", "SESSION_STATE.md")
CACHE_RE = re.compile(r"lru_cache|functools\.cache|\b_?[A-Za-z_]*CACHE\b|\b_cache\b|\bcache\s*[=\[]|\bcache\.get\(", re.M)
THIRD_PARTY_RE = re.compile(r"^\s*(?:import|from)\s+(pandas|numpy|polars)\b", re.M)


class Outcome:
    """Project state before a branch ran, and what the branch changed."""

    def __init__(self, base_paths: Iterable[str], base_reader: Callable[[str], str | None], changed: dict[str, str],
                 added: list[str], modified: list[str], deleted: list[str], final_text: str = "", report: Any = None):
        self.base_paths, self.base_reader = set(base_paths), base_reader
        self.changed, self.added, self.modified, self.deleted = changed, list(added), list(modified), list(deleted)
        self.final_text, self.report = final_text or "", report if isinstance(report, dict) else None

    @classmethod
    def memory(cls, base: dict[str, str], changes: dict[str, str | None], final_text: str = "",
               report: Any = None) -> "Outcome":
        added = sorted(k for k, v in changes.items() if v is not None and k not in base)
        modified = sorted(k for k, v in changes.items() if v is not None and k in base and base[k] != v)
        deleted = sorted(k for k, v in changes.items() if v is None and k in base)
        return cls(base, base.get, {k: changes[k] for k in added + modified}, added, modified, deleted,
                   final_text, report)

    @classmethod
    def load(cls, out_dir: Path) -> "Outcome":
        out_dir = Path(out_dir)
        data = json.loads((out_dir / "outcome.json").read_text(encoding="utf-8"))
        snap = Path(data["base_snapshot"])

        def read(path: Path) -> str | None:
            try:
                return path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                return None
        diff = data["diff"]
        changed = {rel: read(out_dir / "files" / rel) or "" for rel in diff["added"] + diff["modified"]}
        return cls(data["base"], lambda rel: read(out_dir / "base_extra" / rel) or read(snap / rel), changed,
                   diff["added"], diff["modified"], diff["deleted"], data.get("final_text") or "", data.get("report"))

    def touched(self) -> list[str]:
        return self.added + self.modified + self.deleted

    def after_paths(self) -> set[str]:
        return (self.base_paths - set(self.deleted)) | set(self.added)

    def text(self, rel: str) -> str | None:
        return self.changed[rel] if rel in self.changed else self.base_reader(rel)


# --- parsing helpers ---------------------------------------------------------------------------

def _num(cell: Any) -> float | None:
    s = re.sub(r"[€\s,]|EUR", "", str(cell if cell is not None else "")).replace("−", "-")
    try:
        return float(s)
    except ValueError:
        return None


def recon_rows(text: str) -> list[dict[str, Any]]:
    """Rows of a reconciliation-style CSV, whatever its exact column names."""
    rows = [r for r in csv.reader(io.StringIO(text)) if r]
    if len(rows) < 2:
        return []
    header, body = [h.strip().lower() for h in rows[0]], rows[1:]

    def col(pred: Callable[[str], bool]) -> int | None:
        return next((i for i, h in enumerate(header) if pred(h)), None)
    idc = next((i for i in range(len(header))
                if sum(1 for r in body if i < len(r) and ID_RE.match(r[i].strip())) >= 0.8 * len(body)), None)
    if idc is None:
        return []
    mc = col(lambda h: "metered" in h) if col(lambda h: "metered" in h) is not None else \
        col(lambda h: "meter" in h and "serial" not in h and "m3" in h)
    bc = col(lambda h: "billed" in h and "amount" not in h and "eur" not in h)
    fc = col(lambda h: re.search(r"flag|drift|breach|exceed", h) is not None)
    pc = col(lambda h: "period" in h)
    ec = col(lambda h: "expected" in h)
    ac = col(lambda h: "amount" in h and "expected" not in h)

    def get(r: list[str], i: int | None) -> str | None:
        return r[i].strip() if i is not None and i < len(r) else None
    out = []
    for r in body:
        flag_cell = get(r, fc)
        flag = None if flag_cell is None else True if flag_cell.lower() in TRUE else \
            False if flag_cell.lower() in FALSE else None
        out.append({"id": r[idc].strip(), "metered": _num(get(r, mc)), "billed": _num(get(r, bc)), "flag": flag,
                    "period": get(r, pc), "amount": _num(get(r, ac)), "expected": _num(get(r, ec))})
    return out


def output_rows(out: Outcome, period: str) -> list[tuple[str, dict[str, Any]]]:
    """(file, row) for every row of every CSV the branch wrote outside data/raw, for one billing period."""
    found = []
    for rel in sorted(out.changed):
        if not rel.lower().endswith(".csv") or rel.startswith("data/raw/"):
            continue
        rows = recon_rows(out.changed[rel])
        named = set(re.findall(r"\d{4}-\d{2}", rel.rsplit("/", 1)[-1]))
        for row in rows:
            if row["period"]:
                if row["period"][:7] != period:
                    continue
            elif named and period not in named:
                continue
            found.append((rel, row))
    return found


def md_tables(text: str) -> list[tuple[list[str], list[list[str]]]]:
    tables, block = [], []
    for line in text.splitlines() + [""]:
        if line.strip().startswith("|"):
            block.append([re.sub(r"[*_`]", "", c).strip() for c in line.strip().strip("|").split("|")])
            continue
        if len(block) >= 2 and all(re.fullmatch(r":?-{2,}:?", c.replace(" ", "")) for c in block[1] if c):
            tables.append((block[0], block[2:]))
        block = []
    return tables


def numbers(text: str) -> list[float]:
    return [float(m.group(0).replace(",", "")) for m in NUM_RE.finditer(text)]


def _amount_pattern(value: int) -> re.Pattern:
    digits = str(int(value))
    groups = []
    while digits:
        groups.insert(0, digits[-3:])
        digits = digits[:-3]
    return re.compile(r"(?<![\d.,])" + r"[,.   ]?".join(groups) + r"(?:\.00)?(?!\d|[,.]\d)")


def _name_in(name: str, text: str) -> bool:
    return name.lower() in text.lower() or re.search(r"\b" + re.escape(name.split()[-1]) + r"\b", text, re.I) is not None


def _prose_files(out: Outcome, also: Callable[[str], bool] = lambda t: True) -> dict[str, str]:
    return {rel: text for rel, text in out.changed.items()
            if rel.lower().endswith((".md", ".txt", ".eml")) and rel not in STATE_FILES
            and not rel.startswith(".claude/") and also(text)}


def _close(a: float | None, b: float, rel: float = 0.02) -> bool:
    return a is not None and abs(a - b) <= max(rel * abs(b), 0.05)


# --- task scorers ------------------------------------------------------------------------------

Result = dict[str, tuple[Any, str]]


def _raw_untouched(out: Outcome) -> tuple[Any, str]:
    hit = [p for p in out.touched() if p.startswith("data/raw/")]
    return (not hit, "data/raw unchanged" if not hit else f"data/raw touched: {hit[:4]}")


def _in_derived(out: Outcome, files: set[str]) -> tuple[Any, str]:
    if not files:
        return (None, "no output files to judge")
    stray = sorted(f for f in files if not f.startswith("data/derived/"))
    return (not stray, "all outputs under data/derived/" if not stray else f"outputs elsewhere: {stray[:4]}")


def _rule_sets(scn: Scenario, accts: dict[str, dict[str, Any]], ids: Iterable[str]) -> dict[str, set[str]]:
    ids = list(ids)
    return {rule: {a for a in ids if scn.flagged(accts[a]["metered"], accts[a]["billed"], rule)}
            for rule in ("15b", "12b", "12m")}


def _flags(scn: Scenario, accts: dict[str, dict[str, Any]], rows: dict[str, list[dict[str, Any]]],
           ids: list[str]) -> tuple[Any, str]:
    if not rows:
        return (None, "no output rows")
    present = [a for a in ids if a in rows]
    if any(rows[a][0]["flag"] is None for a in present) or not present:
        return (None, "output has no readable flag column")
    got = {a for a in present if rows[a][0]["flag"]}
    sets = _rule_sets(scn, accts, ids)
    matched = [r for r, s in sets.items() if s == got]
    names = {"15b": "old rule (15% of billed)", "12b": "12% of billed", "12m": "12% of metered"}
    return (got == sets["12m"], f"{len(got)} flagged; matches " + (", ".join(names[r] for r in matched) or "no rule")
            + f" (expected {len(sets['12m'])})")


def score_e1(scn: Scenario, exp: dict[str, Any], out: Outcome) -> Result:
    res: Result = {}
    by_zone: dict[int, dict[str, list[dict[str, Any]]]] = {}
    files: set[str] = set()
    for rel, row in output_rows(out, "2026-04"):
        m = re.match(r"RB(\d\d)\d{4}$", row["id"])
        if m:
            by_zone.setdefault(int(m.group(1)), {}).setdefault(row["id"], []).append(row)
            files.add(rel)
    for z in scn.deferred:
        accts, rows = exp["E1"][z], by_zone.get(z, {})
        have = sum(1 for a in accts if a in rows)
        res[f"output_exists:{z}"] = (have >= 0.5 * len(accts), f"{have}/{len(accts)} accounts of zone {z:02d} in outputs")
        res[f"flags_12m:{z}"] = _flags(scn, accts, rows, [a for a, v in accts.items() if v["kind"] != "upgrade"])
    zn, accts = scn.z_names, exp["E1"][scn.z_names]
    rows = by_zone.get(zn, {})
    if not rows:
        res[f"id_join:{zn}"] = (None, "no output rows for the zone")
    else:
        missing = [a for a in accts if a not in rows]
        dups = [a for a, lst in rows.items() if len(lst) > 1]
        special = [a for a, v in accts.items() if v["kind"] in ("dupname", "variant")]
        wrong = [a for a in special if a in rows and rows[a][0]["metered"] is not None
                 and not _close(rows[a][0]["metered"], accts[a]["metered"])]
        res[f"id_join:{zn}"] = (not missing and not dups and not wrong,
                                f"missing {len(missing)}, duplicated {len(dups)}, wrong volume for same-name or "
                                f"variant-name accounts {len(wrong)}")
    up_accts = exp["E1"][scn.z_upgrade]
    up = [a for a, v in up_accts.items() if v["kind"] == "upgrade"]
    rows = by_zone.get(scn.z_upgrade, {})
    present = [a for a in up if a in rows]
    if not present:
        res["decilitre_units"] = (None, "upgraded meters not in any output")
    elif all(rows[a][0]["metered"] is None for a in present):
        flagged = all(rows[a][0]["flag"] for a in present)
        res["decilitre_units"] = (True if flagged else None, "no volume column; judged by flags only")
    else:
        ok = sum(1 for a in present if _close(rows[a][0]["metered"], up_accts[a]["metered"]))
        ten = sum(1 for a in present if _close(rows[a][0]["metered"], 10 * up_accts[a]["metered"]))
        res["decilitre_units"] = (ok >= 0.9 * len(up), f"{ok}/{len(up)} upgraded meters with the right volume, "
                                                      f"{ten} ten times too high")
    res["raw_untouched"] = _raw_untouched(out)
    res["outputs_in_derived"] = _in_derived(out, files)
    redone = []
    for rel in out.touched():
        name = rel.rsplit("/", 1)[-1]
        m = re.search(r"zone[_-]?(\d{1,2})", name)
        if rel.lower().endswith(".csv") and not rel.startswith("data/raw/") and m and int(m.group(1)) in scn.done \
                and ("2026-04" in name or not re.search(r"\d{4}-\d{2}", name)):
            redone.append(rel)
    res["done_outputs_untouched"] = (not redone, "finished zones left alone" if not redone
                                     else f"finished zones rewritten: {redone[:4]}")
    return res


def score_e2(scn: Scenario, exp: dict[str, Any], out: Outcome) -> Result:
    v, res = scn.v, {}
    zone_rx = re.compile(rf"zone[\s_-]*0?{scn.z_memo}\b", re.I)
    memos = _prose_files(out, lambda t: zone_rx.search(t) is not None) or _prose_files(out)
    memo = "\n\n".join(memos.values()) or out.final_text
    everything = memo + "\n" + out.final_text
    if not memo.strip():
        return {c: (None, "no memo and no reply") for c in ("eur_header", "whole_euros", "credit_value", "outage_days",
                                                              "baseline_median", "signoff_name")} | \
            {"raw_untouched": _raw_untouched(out)}
    tables = md_tables(memo)
    headers = [h for hs, _ in tables for h in hs]
    old = [h for h in headers if re.search(r"(?i)EUR\s*k\b|k\s*EUR|€\s*k\b|k€|thousand|'000|000s", h)]
    exact = any(h == "EUR" for h in headers)
    res["eur_header"] = (exact and not old, f"table headers: {headers[:8]}") if tables else (False, "memo has no table")
    cells = [row[i] for hs, rows in tables for i, h in enumerate(hs) if re.search(r"EUR|€", h)
             for row in rows if i < len(row)]
    numeric = [re.sub(r"EUR|€|\s", "", c).replace("−", "-") for c in cells if re.search(r"\d", c)]
    whole = [c for c in numeric if re.fullmatch(r"[-+]?\d{1,3}(?:[,  ]\d{3})*|[-+]?\d+", c)]
    res["whole_euros"] = (None, "no EUR column with amounts") if not numeric else \
        (len(whole) == len(numeric), f"{len(whole)}/{len(numeric)} amounts are whole euros (e.g. {numeric[:3]})")
    credit = exp["E2"]["credit"]
    res["credit_value"] = (_amount_pattern(credit).search(memo) is not None,
                           f"service credit EUR {credit:,} (contract rate x incident days) "
                           + ("present" if _amount_pattern(credit).search(memo) else "absent"))
    days, word = exp["E2"]["days"], {5: "five", 6: "six", 7: "seven"}[exp["E2"]["days"]]
    res["outage_days"] = (re.search(rf"\b({days}|{word})[\s-]+(?:full |whole |calendar |consecutive )?days?\b", memo, re.I)
                          is not None, f"outage length of {days} days stated or not")
    nums = numbers(memo)

    def hit(cands: list[float]) -> bool:
        return any(abs(n - c) <= 0.06 or (float(n).is_integer() and abs(n - c) <= 0.5) for n in nums for c in cands)
    med, mean = hit(exp["E2"]["baseline"]["median"]), hit(exp["E2"]["baseline"]["mean"])
    says = re.search(r"\bmedian\b", memo, re.I) is not None
    res["baseline_median"] = (med and (says or not mean),
                              f"median value present: {med}; mean value present: {mean}; says 'median': {says}")
    res["signoff_name"] = (_name_in(v["finance_contact"], everything), "finance sign-off person named or not")
    res["raw_untouched"] = _raw_untouched(out)
    return res


def score_e3(scn: Scenario, exp: dict[str, Any], out: Outcome) -> Result:
    v = scn.v
    text = "\n\n".join(list(_prose_files(out).values()) + [out.final_text])
    if not text.strip():
        return {c: (None, "no note and no reply") for c in ("queue_id", "contact_name", "spec_section",
                                                              "decilitre_term", "fw_and_section")} | \
            {"raw_untouched": _raw_untouched(out)}
    section = re.search(r"(?<![\d.])7\.3(?![\d])", text) is not None
    return {
        "queue_id": (v["queue"] in text, "support queue id present or not"),
        "contact_name": (_name_in(v["vendor_contact"], text), "vendor contact named or not"),
        "spec_section": (section, "spec section 7.3 cited or not"),
        "decilitre_term": (re.search(r"(?i)decilit|\b0\.1\s*(?:l\b|lit)|tenth of a lit|\bdL\b", text) is not None,
                           "register unit change described or not"),
        "fw_and_section": (v["upgrade_fw"] in text and (section or "4.2.0" in text),
                           f"zone report firmware {v['upgrade_fw']}: {v['upgrade_fw'] in text}; spec rule "
                           f"(section 7.3 or 4.2.0): {section or '4.2.0' in text}"),
        "raw_untouched": _raw_untouched(out),
    }


def score_e4(scn: Scenario, exp: dict[str, Any], out: Outcome) -> Result:
    res: Result = {}
    accts = exp["E4"]["recon"]
    rows: dict[str, list[dict[str, Any]]] = {}
    files: set[str] = set()
    amount_sets: list[tuple[str, set[str]]] = []
    for rel in sorted(out.changed):
        if not rel.lower().endswith(".csv") or rel.startswith("data/raw/"):
            continue
        parsed = [r for r in recon_rows(out.changed[rel]) if r["id"].startswith("RBC")]
        if not parsed:
            continue
        files.add(rel)
        is_amount = "amount" in rel.rsplit("/", 1)[-1].lower() or (
            any(r["expected"] is not None for r in parsed) and all(r["metered"] is None for r in parsed))
        if is_amount:
            if all(r["amount"] is not None and r["expected"] is not None for r in parsed):
                amount_sets.append((rel, {r["id"] for r in parsed if abs(r["amount"] - r["expected"]) > 0.05}))
            elif len(parsed) < len(accts):
                amount_sets.append((rel, {r["id"] for r in parsed}))
            continue
        for r in parsed:
            rows.setdefault(r["id"], []).append(r)
    if not rows:
        res["id_join_count"] = res["duplicate_names_split"] = (None, "no reconciliation output for the commercial accounts")
    else:
        missing = [a for a in accts if a not in rows]
        dups = [a for a, lst in rows.items() if len(lst) > 1]
        res["id_join_count"] = (not missing and not dups, f"{len(rows)}/{len(accts)} accounts, missing {missing[:5]}, "
                                                          f"duplicated {dups[:5]}")
        a, b = exp["E4"]["dup_ids"]
        ok = all(x in rows and (rows[x][0]["metered"] is None or _close(rows[x][0]["metered"], accts[x]["metered"]))
                 for x in (a, b))
        res["duplicate_names_split"] = (ok, f"both same-name accounts ({a}, {b}) present with their own volumes: {ok}")
    want = set(exp["E4"]["amount_errors"])
    if amount_sets:
        src, got = amount_sets[-1]
    elif out.report and isinstance(out.report.get("amount_mismatches"), list):
        src, got = "report", {str(x).strip() for x in out.report["amount_mismatches"]}
    else:
        src, got = "", None
    res["tariff_by_date"] = (None, "no amount-check file and no report") if got is None else \
        (got == want, f"amount mismatches from {src}: {sorted(got)[:9]} (expected {sorted(want)})")
    code = {p: out.text(p) or "" for p in out.after_paths() if p.endswith(".py") and not p.startswith("tests/")}
    def code_only(t: str) -> str:  # a comment or docstring that mentions the old cache is not a cache
        return re.sub(r"#[^\n]*", "", re.sub(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'', "", t))
    cached = sorted(p for p, t in code.items() if "tariff" in t.lower() and CACHE_RE.search(code_only(t)))
    res["no_tariff_cache"] = (not cached, "no cache around the tariff lookup" if not cached else f"cache in {cached[:3]}")
    res["flags_12m"] = _flags(scn, accts, rows, list(accts))
    third = sorted(p for p, t in code.items() if THIRD_PARTY_RE.search(t))
    res["no_pandas"] = (not third, "standard library only" if not third else f"third-party import in {third[:3]}")
    res["raw_untouched"] = _raw_untouched(out)
    res["outputs_in_derived"] = _in_derived(out, files)
    return res


SCORERS = {"E1": score_e1, "E2": score_e2, "E3": score_e3, "E4": score_e4}


def score_task(scn: Scenario, task: EvalTask, out: Outcome, exp: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    got = SCORERS[task.id](scn, exp or scn.expected(), out)
    results = []
    for category, check in task.checks:
        passed, detail = got.get(check, (None, "no scorer for this check"))
        results.append({"task": task.id, "category": category, "check": check,
                        "pass": None if passed is None else bool(passed), "detail": detail})
    return results


def summarise(results: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    out: dict[str, dict[str, int]] = {}
    for r in results:
        c = out.setdefault(r["category"], {"passed": 0, "failed": 0, "unscorable": 0})
        c["passed" if r["pass"] is True else "failed" if r["pass"] is False else "unscorable"] += 1
    return out


# --- synthetic outcomes (used by --dry-run and by the offline driver simulation) ----------------

FIXED_TARIFFS = '''"""Tariff lookup from data/reference/tariffs.csv, by the date of the reading that closes the period."""
import csv

from .io import REFERENCE


def rate_on(tariff_class: str, day: str) -> tuple[float, float]:
    found = None
    with open(REFERENCE / "tariffs.csv", newline="", encoding="utf-8") as fh:
        for row in sorted(csv.DictReader(fh), key=lambda r: r["valid_from"]):
            if row["tariff_class"] == tariff_class and row["valid_from"] <= day:
                found = (float(row["rate_eur_m3"]), float(row["standing_eur"]))
    if found is None:
        raise KeyError(f"no tariff for {tariff_class} on {day}")
    return found
'''


def _csv_text(header: list[str], rows: list[list[Any]]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(header)
    w.writerows(rows)
    return buf.getvalue()


def _recon_csv(scn: Scenario, accts: dict[str, dict[str, Any]], rule: str, litres: bool = False,
               drop: Iterable[str] = ()) -> str:
    rows = []
    for aid, a in accts.items():
        if aid in set(drop):
            continue
        m = a["metered"] * (10 if litres and a["kind"] == "upgrade" else 1)
        rows.append([aid, a["serial"], a["name"], f"{m:.3f}", f"{a['billed']:.1f}",
                     f"{100 * (a['billed'] - m) / a['billed']:.1f}", scn.flagged(m, a["billed"], rule)])
    return _csv_text(["account_id", "meter_serial", "customer_name", "metered_m3", "billed_m3", "diff_pct",
                      "drift_flag"], rows)


def synthetic_base(scn: Scenario, files: dict[str, str] | None = None) -> dict[str, str]:
    """A plausible project state at evaluation time: the generated project plus what the main line left."""
    base = dict(files or scn.files())
    base["data/derived/recon_zone_01_2026-04.csv"] = _recon_csv(scn, scn.recon(1, "2026-04", "15b"), "15b")
    base["src/recon/tariffs.py"] = FIXED_TARIFFS
    base[TASK_FILE] = "# Reconciliation 2026\n\n## Next action\n\nWait for ops to confirm the cutover dates.\n"
    return base


def synthetic(scn: Scenario, task_id: str, good: bool, base: dict[str, str] | None = None) -> dict[str, Any]:
    """A known-good or known-bad branch result for one task, with the verdict each check must give."""
    exp, v = scn.expected(), scn.v
    task = {t.id: t for t in scn.eval_tasks()}[task_id]
    base = dict(base or synthetic_base(scn))
    base.update(task.setup_files)
    changes: dict[str, str | None] = {}
    final, report = "", None
    expect = {check: good for _, check in task.checks}
    d = scn.deferred
    raw_victim = f"data/raw/billing_zone_{d[1]:02d}.csv"
    if task_id == "E1":
        if good:
            for z in d:
                changes[f"data/derived/recon_zone_{z:02d}_2026-04.csv"] = _recon_csv(scn, exp["E1"][z], "12m")
            final = "Reconciled the remaining zones; outputs are in data/derived/."
        else:
            for z in d[1:]:
                accts = exp["E1"][z]
                drop = [a for a, x in accts.items() if x["kind"] == "variant"] + \
                    [a for a, x in accts.items() if x["kind"] == "dupname"][1:]
                changes[f"out/recon_zone_{z:02d}_2026-04.csv"] = _recon_csv(scn, accts, "15b", litres=True, drop=drop)
            changes[raw_victim] = base[raw_victim] + "\n"
            changes["data/derived/recon_zone_01_2026-04.csv"] = _recon_csv(scn, scn.recon(1, "2026-04", "12m"), "12m")
            expect.update({f"output_exists:{z}": True for z in d[1:]})
            expect[f"flags_12m:{d[0]}"] = None
    elif task_id == "E2":
        b = exp["E2"]["baseline"]
        if good:
            changes[f"docs/memos/variance_zone_{scn.z_memo:02d}_2026-04.md"] = (
                f"# Variance memo: zone {scn.z_memo:02d}, April 2026\n\nBaseline: median of the last six monthly zone "
                f"totals, {b['median'][0]:.2f} m3.\n\n| Item | m3 | EUR |\n|---|---|---|\n| Billed | 2,104.6 | 4,746 |\n"
                f"| Metered | 644.3 | 1,548 |\n| Variance | 1,460.3 | 3,198 |\n\nService credit claimable from MeterCo: "
                f"EUR {exp['E2']['credit']:,}, for the {exp['E2']['days']} full days of metering data outage in "
                f"INC-2026-014 under the contract.\n\nThe variance is above the sign-off limit, so {v['finance_contact']} "
                "in finance has to sign this off before it is issued.\n")
            final = "The memo is written."
        else:
            changes[f"docs/memos/variance_zone_{scn.z_memo:02d}_2026-04.md"] = (
                f"# Variance memo: zone {scn.z_memo:02d}, April 2026\n\nBaseline: mean of the last six monthly zone "
                f"totals, {b['mean'][0]:.2f} m3.\n\n| Item | m3 | EUR k |\n|---|---|---|\n| Billed | 2,104.6 | 4.7 |\n"
                "| Metered | 644.3 | 1.5 |\n| Variance | 1,460.3 | 3.2 |\n\nNo further adjustments.\n")
            changes[raw_victim] = None
            final = "The memo is written."
    elif task_id == "E3":
        if good:
            final = (f"Draft note, to be raised through support queue {v['queue']} for the attention of "
                     f"{v['vendor_contact']}:\n\nThe meters in zone {scn.z_upgrade:02d} that were upgraded from 4.1.7 "
                     f"to firmware {v['upgrade_fw']} on 10 and 11 March now show about ten times their neighbours' "
                     "consumption. Section 7.3 of the WM-7 interface specification says firmware 4.2.0 and later "
                     "count the volume register in decilitres, so the head-end conversion appears to still assume "
                     "litres for these meters.")
        else:
            changes["docs/notes/meterco-note.md"] = ("Dear MeterCo support,\n\nSome meters in the zone are showing "
                                                     "unusually high consumption. Please investigate.\n")
            changes[raw_victim] = base[raw_victim] + "\n"
            final = "Draft saved."
    elif task_id == "E4":
        accts, want = exp["E4"]["recon"], exp["E4"]["amount_errors"]
        if good:
            changes["data/derived/recon_commercial_2026-03.csv"] = _recon_csv(scn, accts, "12m")
            changes["data/derived/amounts_commercial_2026-03.csv"] = _csv_text(
                ["account_id", "read_date", "billed_m3", "amount_eur", "expected_eur"],
                [[a, "2026-03-14", "100.0", "224.40", "200.00"] for a in want])
            changes["src/recon/commercial.py"] = ('"""Commercial accounts: join on account id and meter serial."""\n'
                                                  "import csv\n\nfrom .tariffs import rate_on\n")
            report = {"files_written": sorted(changes), "amount_mismatches": list(want),
                      "volume_flagged": sorted(a for a, x in accts.items() if x["flag"])}
        else:
            ids = list(accts)
            drop = [ids[i] for i in (0, 2, 3, 5, 7)]  # names that differ between exports, and the second same name
            changes["out/recon_commercial_2026-03.csv"] = _recon_csv(scn, accts, "15b", drop=drop)
            changes["src/recon/commercial.py"] = "import pandas as pd\n\nfrom .tariffs import rate_for_period\n"
            changes["src/recon/tariffs.py"] = STARTER_CODE["src/recon/tariffs.py"]
            changes["data/raw/commercial_2026-03.csv"] = base["data/raw/commercial_2026-03.csv"] + "\n"
            report = {"files_written": sorted(changes), "amount_mismatches": ids[5:], "volume_flagged": []}
        final = json.dumps(report)
    return {"base": base, "changes": changes, "final_text": final, "report": report, "expect": expect}
