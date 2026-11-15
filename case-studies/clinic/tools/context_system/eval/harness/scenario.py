"""The evaluation scenario: a generated sandbox project, a scripted sequence of user turns and
continuation tasks, plus the reference solution the scorer compares against.

Domain: a (fictional) water utility reconciling billed against metered volumes per zone.
Planted items are woven into ordinary work turns and never labelled as test items:

  instruction kept     data/raw is read-only, derived files go to data/derived; stdlib only
  correction           memo tables 'EUR k' one decimal -> 'EUR' whole euros (B6);
                       drift threshold 15% of billed -> 12% of metered, for zones not yet done (C4)
  decision + reason    baseline = median of the last six monthly zone totals (March spikes), built later (A7)
  rejected approach    joining on customer name (A6); caching the tariff per month (B4)
  conversation facts   vendor support queue + contact, finance sign-off person + amount (A4)
  early file facts     contract service credit rate/cap/fee (A2), firmware volume units section (A3)
  distant evidence     service credit = contract (A2) x incident days (C1) in the memo format (B6)
  unfinished work      the last four zones are read but deliberately not reconciled (C5)

Nothing the scorer needs is written inside the sandbox project except what the turns produce.
"""
from __future__ import annotations

import csv
import io
import random
import re
import statistics
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .common import CHARS_PER_TOKEN, write_text
from .textgen import COMPONENTS, CONDITIONS, DISTRICTS, FIRST, LAST, STREETS, Gen

READ_MONTHS = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"]
BILL_PERIODS = READ_MONTHS[1:]
TARIFFS = [("domestic", "2025-01-01", 2.04, 6.50), ("domestic", "2026-03-16", 2.19, 6.50),
           ("business", "2025-01-01", 1.86, 14.00), ("business", "2026-03-16", 1.97, 14.00)]
TARIFF_CHANGE = "2026-03-16"

SIZES: dict[str, dict[str, Any]] = {
    # zones: total survey zones (the last four are left unfinished); ext_pool: extension blocks available;
    # base_ext: extension blocks every arm runs before the adaptive top-up.
    "full": {"zones": 20, "meeting_months": ["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
                                             "2026-01", "2026-02", "2026-03", "2026-04"],
             "incidents": 28, "handbook": 16, "ext_pool": 20, "base_ext": 2},
    "fit": {"zones": 14, "meeting_months": ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"],
            "incidents": 16, "handbook": 8, "ext_pool": 8, "base_ext": 6},
}
REPORTS = {  # name: target chars (large ones exercise the system's read admission)
    "consultant-ageing": 26000, "consultant-ageing-appendix": 70000, "consultant-leakage": 26000,
    "regulator-guidance": 80000, "network-radio-survey": 28000, "customer-complaints-review": 28000,
    "asset-register-audit": 28000, "pressure-management-study": 28000, "capital-plan-2027": 26000,
    "smart-network-roadmap": 26000, "billing-system-review": 28000,
}

HANDOFF_PROMPT = """Prepare a compact handoff for a fresh chat continuing this project.

Use the existing canonical task-state file if one already owns this
work. Otherwise prepare SESSION_STATE.md. Do not create competing
state summaries.

Write it to that file now. Do not perform further project work or
change other files. Reply with the path you wrote.

The handoff must contain exactly these six sections:

1. Goal
State the active objective and what would count as completion.

2. Corrections and settled decisions
Express consequential corrections as operational rules:
"Do not ..."
"We rejected X because ..."
"Use X only when ..."

Distinguish:
- explicit user decisions;
- verified findings;
- assistant recommendations;
- experimental branches;
- unresolved interpretations.

Never turn an assistant recommendation into user approval.
Include the reason and evidence pointer where needed.

3. Constraints and out-of-scope
Preserve current permissions, especially writing restrictions.
Include scope boundaries and relevant project authority rules.

4. Where work actually stopped
State what is complete, what was independently checked, what remains
partial or defective, and which artifacts currently exist.
Distinguish completed actions from proposed actions.
Do not reconstruct missing facts; mark them UNKNOWN.

5. Next action
Give one concrete next action, its required inputs, expected output,
and completion check. Include any prerequisite still unresolved.

6. Authoritative files and conclusions already established
For each relevant file, record:
- exact path;
- what it owns and its status;
- the specific conclusion already verified from it;
- version/hash or verification date when available;
- what would require reopening it.

The next chat should use these conclusions without routinely rereading
the files. It must reopen the relevant source when:
- a needed claim was never verified;
- the source changed;
- evidence conflicts;
- the summary lacks details needed for the next action.

Keep it concise. Preserve information that changes the next action.
Reference existing evidence instead of reproducing logs, transcripts,
or the full history. Do not restart completed research or architecture."""
LIMIT_RESUME = ("I hit my usage limit while you were working, but it has reset now. "
                "Please continue from where you left off.")
TIMEOUT_RESUME = "continue"
TASK_FILE = "docs/tasks/recon-2026/task.md"   # named by the user in turn A2
# First message of the fresh chat in the handoff loop (its own step, so scripted turns stay identical in every arm).
HANDOFF_RESUME = ("This chat continues earlier work on this project. The handoff is in {path}. Read it first, "
                  "then wait for my next request.")
# Opening of a fresh evaluation session; the same words in every arm, followed by the continuation task.
FRESH_OPENING = "I'm picking this project back up in a new chat. The notes from the earlier work are in {path}."
# Follow-up sent only inside an evaluation branch, after the task is finished, for tasks whose result is
# otherwise only in prose. It names no planted value and asks for no new work.
REPORT_PROMPT = ("For my records, reply with one JSON object and nothing else, describing only what you just did "
                 "for that last request: {\"files_written\": [project-relative paths you created or changed], "
                 "\"volume_flagged\": [account ids your volume check flagged], "
                 "\"amount_mismatches\": [account ids whose billed amount failed the amount check]}. "
                 "Do not run anything or change any file.")
REPORT_TASKS = ("E4",)


@dataclass
class Turn:
    id: str
    phase: str
    kind: str                     # core | extension
    text: str
    reads: list[str] = field(default_factory=list)   # project files the turn asks Claude to read
    plants: list[str] = field(default_factory=list)  # planted item ids introduced in this turn


@dataclass
class EvalTask:
    id: str
    prompt: str
    checks: list[tuple[str, str]]          # (category, check id)
    setup_files: dict[str, str] = field(default_factory=dict)  # project-relative path -> content
    forbidden_in_prompt: list[str] = field(default_factory=list)


@dataclass
class Account:
    account_id: str
    serial: str
    name: str
    bill_name: str
    zone: int | None
    tclass: str
    fw: list[str]
    regs: list[int]
    read_dates: list[str]
    cons: list[float]          # true m3 per bill period (index matches BILL_PERIODS)
    billed: list[float]
    amounts: list[float]
    kind: str = "normal"


def _unit(fw: str) -> int:
    parts = tuple(int(x) for x in fw.split("."))
    return 10000 if parts >= (4, 2, 0) else 1000


def rate_on(tclass: str, day: str) -> tuple[float, float]:
    rate = None
    for c, frm, r, s in TARIFFS:
        if c == tclass and frm <= day:
            rate = (r, s)
    assert rate is not None
    return rate


class Scenario:
    def __init__(self, seed: int = 20261010, size: str = "full"):
        if size not in SIZES:
            raise ValueError(f"size must be one of {sorted(SIZES)}")
        self.seed, self.size, self.p = seed, size, SIZES[size]
        self.Z = self.p["zones"]
        self.deferred = list(range(self.Z - 3, self.Z + 1))
        self.done = list(range(1, self.Z - 3))
        self.z_upgrade, self.z_names = self.deferred[1], self.deferred[2]
        self.z_memo = 9
        pv = random.Random(seed * 7 + 1)
        self.v = {
            "queue": f"MTR-{pv.randint(4100, 4899)}",
            "vendor_contact": pv.choice(["Dana Whitlow", "Petra Lindqvist", "Marcus Okafor"]),
            "finance_contact": pv.choice(["Priya Raman", "Tomasz Wieczorek", "Hannah Achterberg"]),
            "signoff": pv.choice([2350, 2450, 2650]),
            "fee": pv.choice([18400, 17600, 19200]),
            "credit_rate": 0.8, "credit_cap": 10,
            "outage_days": pv.choice([5, 6, 7]),
            "upgrade_fw": "4.2.3", "new_fw": "4.2.1",
            "old_rule": "15b", "new_rule": "12m",
        }
        self.v["credit_eur"] = round(self.v["fee"] * min(self.v["credit_rate"] * self.v["outage_days"],
                                                         self.v["credit_cap"]) / 100)
        self._make_data()

    # ------------------------------------------------------------------ data ----------------
    def _make_data(self) -> None:
        r = random.Random(self.seed * 13 + 5)
        self.accounts: dict[int | str, list[Account]] = {}
        serials: set[str] = set()

        def serial() -> str:
            while True:
                s = "MC-" + "".join(r.choice("0123456789ABCDEF") for _ in range(6))
                if s not in serials:
                    serials.add(s)
                    return s

        for z in range(1, self.Z + 1):
            n = 40 + r.randint(0, 14)
            used_names: set[str] = set()
            accts = []
            p_new = 0.0 if z == self.z_memo else (0.08 if z <= self.Z - 6 else 0.25)
            for k in range(n):
                while True:
                    nm = f"{r.choice(FIRST)[0]}. {r.choice(LAST)}"
                    if nm not in used_names and nm != "J. Smith":
                        used_names.add(nm)
                        break
                fw = self.v["new_fw"] if r.random() < p_new else r.choice(["4.1.6", "4.1.7"])
                tclass = "business" if r.random() < 0.1 else "domestic"
                accts.append(self._account(r, f"RB{z:02d}{k + 1:04d}", serial(), nm, z, tclass, fw))
            self._plant_zone(r, z, accts)
            self.accounts[z] = accts
        com_names = ["Brennan Holdings Limited", "Harbour Bakery", "Harbour Bakery", "Quayside Motors Ltd",
                     "Mill Lane Laundry", "O'Rourke Engineering", "Castle Park Hotel", "Ferrybank Leisure Centre",
                     "Station Road Dental", "Canal Bank Brewery", "Abbeyfield Nursing Home", "Weirview Garden Centre"]
        bill_names = ["BRENNAN HOLDINGS LTD", "Harbour Bakery", "Harbour Bakery", "Quayside Motors Limited",
                      "Mill Lane Laundry", "O Rourke Engineering", "Castle Park Hotel", "Ferrybank Leisure Ctr",
                      "Station Road Dental", "Canal Bank Brewery", "Abbeyfield Nursing Home", "Weirview Garden Centre"]
        com = []
        for k, (nm, bn) in enumerate(zip(com_names, bill_names)):
            a = self._account(r, f"RBC{k + 1:04d}", serial(), nm, None, "business", r.choice(["4.1.6", "4.1.7"]),
                              lo=40, hi=160, march_split=k)
            a.bill_name = bn
            com.append(a)
        self.accounts["commercial"] = com
        self._plant_commercial(r, com)

    def _account(self, r: random.Random, aid: str, ser: str, nm: str, zone, tclass: str, fw: str,
                 lo: float = 6, hi: float = 16, march_split: int | None = None) -> Account:
        unit = _unit(fw)
        base = r.uniform(lo, hi)
        reg = r.randint(50_000, 900_000) * (unit // 1000)
        regs, dates, cons = [reg], [], []
        for i, month in enumerate(READ_MONTHS):
            if month == "2026-03" and march_split is not None:
                day = 4 + (march_split % 6) * 2 if march_split < 6 else 17 + (march_split % 6) * 2
            else:
                day = r.randint(3, 27)
            dates.append(f"{month}-{day:02d}")
            if i == 0:
                continue
            inc = int(round(base * r.uniform(0.85, 1.15) * unit))
            regs.append(regs[-1] + inc)
            cons.append(inc / unit)
        billed, amounts = [], []
        for i, c in enumerate(cons):
            b = round(c * (1 + r.uniform(-0.05, 0.05)), 1)
            billed.append(b)
        a = Account(aid, ser, nm, nm, zone, tclass, [fw] * len(READ_MONTHS), regs, dates, cons, billed, [])
        self._reprice(a)
        return a

    def _reprice(self, a: Account) -> None:
        a.amounts = []
        for i, b in enumerate(a.billed):
            rate, standing = rate_on(a.tclass, a.read_dates[i + 1])
            a.amounts.append(round(b * rate + standing, 2))

    @staticmethod
    def _set_cons(a: Account, i: int, value_m3: float) -> None:
        """Change true consumption for bill period i, shifting later registers."""
        unit = _unit(a.fw[i + 1])
        new_inc = int(round(value_m3 * unit))
        old_inc = a.regs[i + 1] - a.regs[i]
        delta = new_inc - old_inc
        for j in range(i + 1, len(a.regs)):
            a.regs[j] += delta
        a.cons[i] = new_inc / unit

    def _plant_zone(self, r: random.Random, z: int, accts: list[Account]) -> None:
        apr, mar = BILL_PERIODS.index("2026-04"), BILL_PERIODS.index("2026-03")
        old = [a for a in accts if a.fw[0].startswith("4.1") and a.tclass == "domestic"]
        # threshold-discriminating April accounts: both rules, 12%-of-metered only (above and below)
        picks = r.sample(old, 4)
        for a, x, kind in zip(picks, [0.24, -0.21, 0.13, -0.125], ["both", "both", "newA", "newB"]):
            a.billed[apr] = round(a.cons[apr] * (1 + x), 1)
            a.kind = kind
        # March meter-swap spikes (the reason the baseline uses the median)
        if z in (3, self.z_memo, 12):
            for a in r.sample([a for a in old if a.kind == "normal"], 6):
                self._set_cons(a, mar, a.cons[mar] + r.uniform(50, 70))
                a.billed[mar] = round(a.cons[mar] * (1 + r.uniform(-0.02, 0.02)), 1)
                a.kind = "spike"
        if z == self.z_memo:  # April outage: estimated bills for 15 accounts
            for a in r.sample([a for a in accts if a.kind == "normal"], 15):
                a.billed[apr] = round(a.cons[apr] + r.uniform(85, 110), 1)
                a.kind = "estimated"
        if z == 1:
            a1, a2 = [a for a in accts if a.kind == "normal"][:2]
            a1.name, a1.bill_name = "M. O'Neill", "M. ONeill"
            a2.name, a2.bill_name = "D. McCarthy", "D. Mc Carthy"
        if z == 4 or z == self.z_names:
            normals = [a for a in accts if a.kind == "normal"]
            normals[0].name = normals[0].bill_name = "J. Smith"
            normals[1].name = normals[1].bill_name = "J. Smith"
            normals[0].kind = normals[1].kind = "dupname"
            if z == self.z_names:
                for a, (nm, bn) in zip(normals[2:5], [("K. O'Sullivan", "K. OSullivan"),
                                                      ("R. FitzGerald", "R. Fitzgerald"),
                                                      ("T. De Burca", "T. de Burca")]):
                    a.name, a.bill_name, a.kind = nm, bn, "variant"
        if z == self.z_upgrade:  # pilot batch upgraded 4.1.7 -> 4.2.3 in March; billing still assumes litres
            batch = [a for a in accts if a.kind == "normal" and a.fw[0] == "4.1.7"][:14]
            if len(batch) < 8:
                batch = [a for a in accts if a.kind == "normal" and a.fw[0].startswith("4.1")][:14]
            m_idx = READ_MONTHS.index("2026-03")
            for a in batch:
                for j in range(m_idx, len(READ_MONTHS)):
                    a.fw[j] = self.v["upgrade_fw"]
                # registers from March on count decilitres: rebuild from the February litre value
                feb = a.regs[m_idx - 1]
                regs = a.regs[:m_idx]
                acc = feb * 10
                for j in range(m_idx, len(READ_MONTHS)):
                    acc += int(round(a.cons[j - 1] * 10000))
                    regs.append(acc)
                a.regs = regs
                for j in range(m_idx - 1, len(BILL_PERIODS)):
                    a.billed[j] = round(a.cons[j] * 10 * (1 + r.uniform(-0.03, 0.03)), 1)
                a.kind = "upgrade"
        for a in accts:
            self._reprice(a)
        # a few genuine March amount errors for the amount check
        if z in (2, 5, 7):
            a = [a for a in accts if a.kind == "normal"][3]
            a.amounts[mar] = round(a.amounts[mar] + 31.70, 2)
            a.kind = "amount_error"

    def _plant_commercial(self, r: random.Random, com: list[Account]) -> None:
        mar = BILL_PERIODS.index("2026-03")
        for a, x, kind in zip([com[3], com[6], com[8], com[10]], [0.25, -0.22, 0.13, -0.125],
                              ["both", "both", "newA", "newB"]):
            a.billed[mar] = round(a.cons[mar] * (1 + x), 1)
            a.kind = kind
        for a in com:
            self._reprice(a)
        for a, delta in ((com[5], 38.40), (com[9], -25.00)):
            a.amounts[mar] = round(a.amounts[mar] + delta, 2)
            a.kind = "amount_error"

    # ------------------------------------------------------------- reference solution ---------
    @staticmethod
    def metered(a: Account, period: str) -> float:
        i = READ_MONTHS.index(period)
        return round(a.regs[i] / _unit(a.fw[i]) - a.regs[i - 1] / _unit(a.fw[i - 1]), 4)

    @staticmethod
    def flagged(m: float, b: float, rule: str) -> bool:
        d = abs(b - m)
        return {"15b": d / b > 0.15, "12b": d / b > 0.12, "12m": d / m > 0.12}[rule]

    def recon(self, key, period: str, rule: str) -> dict[str, dict[str, Any]]:
        i = BILL_PERIODS.index(period)
        out = {}
        for a in self.accounts[key]:
            m, b = self.metered(a, period), a.billed[i]
            out[a.account_id] = {"metered": m, "billed": b, "flag": self.flagged(m, b, rule), "fw": a.fw[i + 1],
                                 "kind": a.kind, "name": a.name, "serial": a.serial}
        return out

    def zone_totals(self, z: int, basis: str) -> list[float]:
        totals = []
        for i, p in enumerate(BILL_PERIODS):
            if basis == "metered":
                totals.append(sum(self.metered(a, p) for a in self.accounts[z]))
            else:
                totals.append(sum(a.billed[i] for a in self.accounts[z]))
        return totals

    def baseline_candidates(self, z: int) -> dict[str, list[float]]:
        med, mean = [], []
        for basis in ("metered", "billed"):
            t = self.zone_totals(z, basis)
            apr = BILL_PERIODS.index("2026-04")
            for window in (t[apr - 6:apr], t[apr - 5:apr + 1]):
                med.append(round(statistics.median(window), 2))
                mean.append(round(statistics.mean(window), 2))
        return {"median": med, "mean": mean}

    def expected(self) -> dict[str, Any]:
        e: dict[str, Any] = {"values": dict(self.v), "deferred": self.deferred, "done": self.done}
        e["E1"] = {z: self.recon(z, "2026-04", "12m") for z in self.deferred}
        e["E1_rules"] = {rule: {z: sorted(k for k, v in self.recon(z, "2026-04", rule).items() if v["flag"])
                                for z in self.deferred} for rule in ("15b", "12b", "12m")}
        e["E2"] = {"baseline": self.baseline_candidates(self.z_memo), "credit": self.v["credit_eur"],
                   "days": self.v["outage_days"]}
        e["E4"] = {"recon": self.recon("commercial", "2026-03", "12m"),
                   "amount_errors": sorted(a.account_id for a in self.accounts["commercial"]
                                           if a.kind == "amount_error"),
                   "dup_ids": [a.account_id for a in self.accounts["commercial"] if a.name == "Harbour Bakery"]}
        return e

    # ------------------------------------------------------------------ CSV text --------------
    @staticmethod
    def _csv(header: list[str], rows: list[list[Any]]) -> str:
        buf = io.StringIO()
        w = csv.writer(buf, lineterminator="\n")
        w.writerow(header)
        w.writerows(rows)
        return buf.getvalue()

    def readings_csv(self, key) -> str:
        rows = []
        for a in self.accounts[key]:
            for i, month in enumerate(READ_MONTHS):
                rows.append([a.account_id, a.serial, a.name, a.tclass, a.fw[i], a.read_dates[i], a.regs[i]])
        return self._csv(["account_id", "meter_serial", "customer_name", "tariff_class", "firmware", "read_date",
                          "register"], rows)

    def billing_csv(self, z: int) -> str:
        rows = []
        for a in self.accounts[z]:
            for i, p in enumerate(BILL_PERIODS):
                rows.append([a.account_id, a.serial, a.bill_name, p, a.read_dates[i + 1], f"{a.billed[i]:.1f}",
                             f"{a.amounts[i]:.2f}"])
        return self._csv(["account_id", "meter_serial", "customer_name", "period", "read_date", "billed_m3",
                          "amount_eur"], rows)

    def commercial_export(self) -> str:
        i = BILL_PERIODS.index("2026-03")
        rows = [[a.bill_name, a.account_id, a.serial, "2026-03", a.read_dates[i + 1], f"{a.billed[i]:.1f}",
                 f"{a.amounts[i]:.2f}"] for a in self.accounts["commercial"]]
        return self._csv(["Customer", "Acct No", "Meter Serial", "Period", "Read Date", "Billed m3", "Amount EUR"],
                         rows)

    # ------------------------------------------------------------------ project ----------------
    def files(self) -> dict[str, str]:
        """Every file of the sandbox project, deterministic for (seed, size)."""
        g = Gen(random.Random(self.seed * 31 + 11))
        f: dict[str, str] = {}
        f.update(STARTER_CODE)
        f["CLAUDE.md"] = CLAUDE_MD
        f["README.md"] = README_MD
        f["docs/brief.md"] = self._brief(g)
        f["docs/vendor/meterco-contract.md"] = self._contract(g)
        f["docs/vendor/meterco-firmware-spec.md"] = self._spec(g)
        f["docs/tariffs/tariff-history.md"] = self._tariff_doc(g)
        for z in range(1, self.Z + 1):
            f[f"docs/zones/zone-{z:02d}.md"] = self._zone_report(g, z)
        for month in self.p["meeting_months"]:
            for k, kind in enumerate(["ops-review", "steering"] + (["vendor-sync"] if month >= "2026-01" else [])):
                f[f"docs/meetings/{month}-{(k * 9 + 6):02d}-{kind}.md"] = self._meeting(g, month, kind)
        for n in range(1, self.p["incidents"] + 1):
            f[f"docs/incidents/INC-2026-{n:03d}.md"] = self._incident(g, n)
        for n in range(1, self.p["handbook"] + 1):
            f[f"docs/ops/handbook-{n:02d}.md"] = self._handbook(g, n)
        for name, target in REPORTS.items():
            f[f"docs/reports/{name}.md"] = self._report(g, name, target)
        f["data/reference/tariffs.csv"] = self._csv(["tariff_class", "valid_from", "rate_eur_m3", "standing_eur"],
                                                    [list(t) for t in TARIFFS])
        acc_rows = []
        for key, accts in self.accounts.items():
            for a in accts:
                acc_rows.append([a.account_id, a.serial, a.name, "commercial" if key == "commercial" else f"{key:02d}",
                                 a.tclass, a.fw[0]])
        f["data/raw/accounts.csv"] = self._csv(["account_id", "meter_serial", "customer_name", "zone",
                                                "tariff_class", "firmware_at_install"], acc_rows)
        for z in range(1, self.Z + 1):
            f[f"data/raw/readings_zone_{z:02d}.csv"] = self.readings_csv(z)
            f[f"data/raw/billing_zone_{z:02d}.csv"] = self.billing_csv(z)
        f["data/raw/readings_commercial.csv"] = self.readings_csv("commercial")
        f["data/derived/.gitkeep"] = ""
        return f

    def write_project(self, dest: Path) -> dict[str, int]:
        sizes = {}
        for rel, text in self.files().items():
            write_text(Path(dest) / rel, text)
            sizes[rel] = len(text)
        return sizes

    # ----------------------------------------------------------- document generators -----------
    def _brief(self, g: Gen) -> str:
        lead, am = g.name(), g.name()
        return (f"# Project brief: April 2026 billing reconciliation\n\nOwner: Revenue assurance\nOps lead: {lead}\n"
                f"MeterCo account manager: {am}\n\n## Why\n\n" + g.paragraph("bg", 4, 6) +
                "\n\nBilling volumes are produced by the billing system from the MeterCo readings export. Ops want "
                "confidence that what we bill matches what the meters recorded, zone by zone, before the April "
                "close.\n\n## Scope\n\n- Reconcile billed against metered volumes for each survey zone for April "
                f"2026 (zones 01 to {self.Z:02d}).\n- Check billed amounts against the tariff table.\n- Keep a "
                "findings register from the field survey reports.\n- Produce variance memos for finance where a "
                "zone needs one.\n- Raise anything that looks like a MeterCo fault with MeterCo.\n\n## Out of scope\n"
                "\n- Changing the billing system itself.\n- Customer contact.\n\n## Background\n\n" +
                "\n\n".join(g.paragraph("bg") for _ in range(4)) + "\n")

    def _contract(self, g: Gen) -> str:
        v = self.v
        clauses = []
        titles = ["Definitions", "Term", "Services", "Service levels", "Data delivery", "Firmware management",
                  "Change control", "Charges", "Service credits", "Liability", "Confidentiality", "Termination",
                  "Disputes", "General"]
        for i, t in enumerate(titles, 1):
            body = [f"## {i}. {t}\n"]
            for j in range(1, 4 + g.r.randint(0, 3)):
                body.append(f"{i}.{j} " + " ".join(g.sentence("legal") for _ in range(g.r.randint(2, 4))))
            if t == "Service credits":
                body = [f"## {i}. {t}\n",
                        f"{i}.1 A Metering Data Outage means a period in which validated daily readings are not "
                        "delivered for a zone through a cause attributable to the Supplier.",
                        f"{i}.2 For each full day of Metering Data Outage the Customer is entitled to a service "
                        f"credit of {v['credit_rate']}% of the Monthly Service Fee, capped at {v['credit_cap']}% of "
                        "the Monthly Service Fee in any calendar month.",
                        f"{i}.3 Service credits must be claimed in writing within 60 days of the end of the month "
                        "in which the outage occurred.",
                        f"{i}.4 " + g.sentence("legal")]
            if t == "Service levels":
                body.append(f"{i}.{len(body)} The Supplier shall deliver validated daily readings for at least 98 per "
                            "cent of installed meters in each zone in each calendar month.")
            clauses.append("\n\n".join(body))
        sched = (f"## Schedule B: Charges\n\nMonthly Service Fee (Riverbend estate, all zones): EUR "
                 f"{v['fee']:,}\n\nInstallation and replacement rates are set out in the price list in Schedule C.\n\n"
                 "## Schedule C: Price list\n\n")
        text = ("# Metering Services Agreement: Riverbend Water and MeterCo Ltd\n\nAgreement reference: RW-MC-2024-07"
                "\n\n" + "\n\n".join(clauses) + "\n\n" + sched)
        return g.pad_table(text, 26000, ["Item", "Unit", "Rate (EUR)", "Notes"],
                           lambda: [g.pick(COMPONENTS).capitalize() + " replacement", "each",
                                    f"{g.r.randint(18, 240)}.00", g.pick(CONDITIONS)])

    def _spec(self, g: Gen) -> str:
        sections = []
        heads = ["Scope", "Device overview", "Radio protocol", "Packet structure", "Status word", "Alarms",
                 "Registers", "Configuration", "Firmware update", "Diagnostics", "Concentrator interface",
                 "Revision history"]
        for i, h in enumerate(heads, 1):
            subs = []
            for j in range(1, 6):
                title = {(7, 1): "Register map", (7, 2): "Register refresh",
                         (7, 3): "Volume register units"}.get((i, j), f"{h} detail {j}")
                if (i, j) == (7, 3):
                    body = ("The volume register is a 32-bit unsigned counter of the volume passed through the "
                            "meter since manufacture. Firmware versions earlier than 4.2.0 count the volume in "
                            "litres. Firmware 4.2.0 and later count the volume in decilitres (0.1 litre), to "
                            "support the low-flow leak detection added in that release. When a meter is upgraded "
                            "in the field from an earlier version to 4.2.0 or later, the register value is "
                            "converted to decilitres at the moment of the upgrade, so readings before and after the "
                            "upgrade are in different units. Head-end systems must take the firmware version of each "
                            "reading into account when converting the register to cubic metres.")
                else:
                    body = "\n\n".join(g.paragraph("spec") for _ in range(g.r.randint(1, 3)))
                subs.append(f"### {i}.{j} {title}\n\n{body}")
            if i == 7:
                subs.append(g.table(["Register", "Address", "Width", "Description"],
                                    [[f"R{k:02d}", f"0x{0x40 + k * 4:04X}", "32", g.sentence("spec")]
                                     for k in range(24)]))
            sections.append(f"## {i}. {h}\n\n" + "\n\n".join(subs))
        text = "# MeterCo WM-7 Smart Water Meter: Interface Specification\n\nDocument MC-WM7-IFS, issue 9\n\n" + \
            "\n\n".join(sections)
        return g.pad_table(text, 120000, ["Code", "Meaning", "Action"],
                           lambda: [f"E{g.r.randint(100, 999)}", g.sentence("spec"), g.sentence("proc")])

    def _tariff_doc(self, g: Gen) -> str:
        rows = [[c, frm, f"{r:.2f}", f"{s:.2f}"] for c, frm, r, s in TARIFFS]
        return ("# Tariff history\n\nRates are per cubic metre; the standing charge is per account per billing "
                "period. A bill uses the tariff in force on the date of the reading that closes the period.\n\n"
                + g.table(["Tariff class", "Valid from", "Rate (EUR/m3)", "Standing charge (EUR)"], rows) +
                "\n\n## Notes\n\n" + g.paragraph("bg") + "\n\nThe 2026 increase took effect part-way through the "
                "March billing period, on 16 March 2026.\n")

    def _zone_report(self, g: Gen, z: int) -> str:
        accts = self.accounts[z]
        n = len(accts)
        insp = n - g.r.randint(1, 5)
        fails = g.r.randint(3, 11)
        district = DISTRICTS[(z - 1) % len(DISTRICTS)]
        top = g.sentence("rec")
        head = (f"# Field survey report: Zone {z:02d} ({district})\n\nReport ref: FS-2026-{z:02d}  \n"
                f"Survey dates: {g.date(2026, 2)} to {g.date(2026, 3)}  \nInspector: {g.name()}\n\n"
                f"## Summary\n\n- Meters in zone: {n}\n- Meters inspected: {insp}\n- Failures observed: {fails} "
                f"({g.pick(CONDITIONS)}, {g.pick(CONDITIONS)}, {g.pick(CONDITIONS)})\n- Top recommendation: {top}\n")
        body = g.prose_sections("obs", [f"Observations: {s}" for s in g.r.sample(STREETS, 4)], paras=(2, 3))
        extra = ""
        if z == self.z_upgrade:
            batch = [a for a in accts if a.kind == "upgrade"]
            extra = (f"\n\n## Firmware upgrade batch\n\nOn 10 and 11 March MeterCo upgraded {len(batch)} meters in "
                     f"this zone from firmware 4.1.7 to {self.v['upgrade_fw']} as part of their pilot batch (serials "
                     "in Appendix B). Since then the billing extract shows consumption for these meters roughly ten "
                     "times higher than their neighbours, although the occupiers report no change in use. The radio "
                     "packets look normal and the registers are advancing steadily.\n\n### Appendix B: upgraded "
                     "meters\n\n" + g.table(["Account", "Serial", "Upgraded"],
                                             [[a.account_id, a.serial, f"2026-03-{10 + (i % 2)}"]
                                              for i, a in enumerate(batch)]))
        text = (head + "\n## Method\n\n" + g.paragraph("method", 3, 5) + "\n\n## Background\n\n" + g.paragraph("bg")
                + "\n\n" + body + extra + "\n\n## Recommendations\n\n1. " + top + "\n" +
                "\n".join(f"{i}. {g.sentence('rec')}" for i in range(2, 6)) +
                "\n\n## Appendix A: Inspected meters\n")
        return g.pad_table(text, 24000, ["Serial", "Location", "Condition", "Note"],
                           lambda: [g.pick(accts).serial, f"{g.r.randint(1, 120)} {g.pick(STREETS)}",
                                    g.pick(CONDITIONS), g.sentence("obs")[:90]])

    def _meeting(self, g: Gen, month: str, kind: str) -> str:
        attendees = sorted({g.name() for _ in range(6)})
        title = {"ops-review": "Operations review", "steering": "Metering programme steering group",
                 "vendor-sync": "MeterCo vendor sync"}[kind]
        items = [[f"A{g.r.randint(10, 99)}", g.sentence("meet")[:80], g.name(), g.date(int(month[:4]),
                                                                                      int(month[5:]))]
                 for _ in range(g.r.randint(5, 9))]
        text = (f"# {title}: {month}\n\nAttendees: {', '.join(attendees)}\n\n## Notes\n\n" +
                "\n\n".join(g.paragraph("meet", 4, 7) for _ in range(6)) + "\n\n## Actions\n\n" +
                g.table(["Ref", "Action", "Owner", "Due"], items) + "\n\n## Discussion log\n")
        return g.pad_table(text, 16000, ["Time", "Speaker", "Point"],
                           lambda: [f"{g.r.randint(9, 16)}:{g.r.choice(['00', '10', '20', '30', '40', '50'])}",
                                    g.name(), g.sentence("meet")])

    def _incident(self, g: Gen, n: int) -> str:
        if n == 14:
            d = self.v["outage_days"]
            words = {5: "five", 6: "six", 7: "seven"}[d]
            end = 3 + d - 1
            body = (f"# INC-2026-014: Metering data outage, zone {self.z_memo:02d}\n\nSeverity: 2  \nStatus: closed\n\n"
                    f"## Summary\n\nValidated daily readings for zone {self.z_memo:02d} were not delivered from 00:00 "
                    f"on 3 April 2026 to 24:00 on {end} April 2026 ({words} full days). MeterCo rolled the zone "
                    "concentrator back from firmware 4.1.7 to 4.1.6 during planned maintenance and the rollback "
                    "corrupted the concentrator's schedule. MeterCo's root cause analysis accepts that the cause was "
                    "theirs.\n\n## Customer impact\n\nFifteen accounts in the zone were billed on estimated reads for "
                    "April because no validated read was available on their read date.\n\n## Timeline\n\n")
        else:
            z = g.r.randint(1, self.Z)
            body = (f"# INC-2026-{n:03d}: {g.pick(['Radio coverage loss', 'Concentrator fault', 'Late data delivery', 'Head-end import failure', 'Battery alarms cluster'])}, zone {z:02d}\n\n"
                    f"Severity: {g.r.randint(2, 4)}  \nStatus: closed\n\n## Summary\n\n" + g.paragraph("inc") +
                    "\n\n## Customer impact\n\n" + g.paragraph("inc", 1, 2) + "\n\n## Timeline\n\n")
        text = body + "\n\n".join(g.paragraph("inc", 2, 4) for _ in range(3)) + "\n\n## Event log\n"
        return g.pad_table(text, 11000, ["Time", "Event", "By"],
                           lambda: [f"{g.r.randint(0, 23):02d}:{g.r.randint(0, 59):02d}", g.sentence("inc"), g.name()])

    def _handbook(self, g: Gen, n: int) -> str:
        titles = ["Purpose and scope", "Roles", "Data handling and file naming", "Route planning", "Chamber access",
                  "Readings", "Photographs", "Tamper and revenue protection", "Asset changes", "Customer contact",
                  "Traffic management", "Lone working", "Escalation", "Records retention", "Training", "Review"]
        title = titles[(n - 1) % len(titles)]
        extra = ""
        if n == 3:
            extra = ("\n\n## Derived file naming\n\nDerived outputs are named `<subject>_zone_<zz>_<period>.<ext>` "
                     "with a two-digit zone and the billing period as YYYY-MM, for example "
                     "`recon_zone_07_2026-04.csv`. Files for several zones use `all` in place of the zone.\n")
        text = (f"# Operations handbook, chapter {n}: {title}\n\n" + g.paragraph("proc", 3, 5) + extra + "\n\n" +
                g.prose_sections("proc", [f"{n}.{k} {g.pick(['Procedure', 'Checks', 'Records', 'Exceptions', 'Notes'])}"
                                          for k in range(1, 6)], paras=(2, 3)) + "\n\n## Checklist\n")
        return g.pad_table(text, 22000, ["Step", "Check", "Record"],
                           lambda: [str(g.r.randint(1, 40)), g.sentence("proc"), g.pick(["form", "tablet", "photo",
                                                                                        "log", "ticket"])])

    def _report(self, g: Gen, name: str, target: int) -> str:
        title = name.replace("-", " ").capitalize()
        text = (f"# {title}\n\nPrepared for Riverbend Water\n\n## Executive summary\n\n" + g.paragraph("analysis", 4, 6)
                + "\n\n" + g.prose_sections("analysis", ["Background", "Approach", "Findings", "Options",
                                                         "Recommendations", "Risks"], paras=(2, 4)) + "\n\n## Data\n")
        return g.pad_table(text, target, ["Zone", "Cohort", "Measure", "Value", "Comment"],
                           lambda: [f"{g.r.randint(1, self.Z):02d}", f"{g.r.randint(1975, 2019)}",
                                    g.pick(["night flow", "under-registration", "packet loss", "age", "failures"]),
                                    f"{g.r.randint(1, 98)}.{g.r.randint(0, 9)}", g.sentence("analysis")[:100]])

    # ------------------------------------------------------------------ script ----------------
    @staticmethod
    def _zr(zs: list[int]) -> str:
        return f"zone {zs[0]:02d}" if len(zs) == 1 else f"zones {zs[0]:02d} to {zs[-1]:02d}"

    def turns(self) -> list[Turn]:
        v, d = self.v, self.done
        groups = [[z for z in g if z in d] for g in ([1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12], [13, 14, 15, 16])]
        zf = lambda zs: [f"docs/zones/zone-{z:02d}.md" for z in zs]  # noqa: E731
        months = self.p["meeting_months"]
        mtg = lambda ms: [p for p in sorted(self._meeting_paths()) if any(p.split("/")[-1].startswith(m) for m in ms)]  # noqa: E731
        inc = lambda a, b: [f"docs/incidents/INC-2026-{n:03d}.md" for n in range(a, min(b, self.p["incidents"]) + 1)]  # noqa: E731
        t = [
            Turn("A1", "A", "core", "I'm taking over the Riverbend meter reconciliation work. Read CLAUDE.md, README.md "
                 "and docs/brief.md and tell me briefly what this project is for and what state the code is in.",
                 ["CLAUDE.md", "README.md", "docs/brief.md"]),
            Turn("A2", "A", "core", "A few ground rules before we start. data/raw/ holds the vendor and billing exports "
                 "exactly as delivered: never write into it; anything derived goes in data/derived/. Keep src/recon "
                 "on the standard library only, the ops server it runs on has no pandas. And keep a task file for "
                 "this work at docs/tasks/recon-2026/task.md (where we are, decisions, next steps) so someone else "
                 "could pick it up.\n\nFirst job: read the MeterCo contract, docs/vendor/meterco-contract.md, and "
                 "tell me what it says about service levels and service credits.",
                 ["docs/vendor/meterco-contract.md"], ["P1-raw-readonly", "P10-stdlib", "F1-contract"]),
            Turn("A3", "A", "core", "Now the firmware spec, docs/vendor/meterco-firmware-spec.md. I need to know how "
                 "the volume register is encoded across firmware versions. units.py assumes litres for everything "
                 "and I don't trust that. If it's wrong, fix it and add a test.",
                 ["docs/vendor/meterco-firmware-spec.md", "src/recon/units.py"], ["F2-spec-units"]),
            Turn("A4", "A", "core", f"Two things you'll need later. MeterCo want anything firmware-related raised "
                 f"through their support queue {v['queue']}, for the attention of {v['vendor_contact']}, not the "
                 f"general inbox. And on our side, any variance over €{v['signoff']:,} has to be signed off by "
                 f"{v['finance_contact']} in finance before it goes into a memo.\n\nNext: read the field survey "
                 f"reports for {self._zr(groups[0])} in docs/zones/ and start a findings register at "
                 "docs/findings.md, one row per zone: meters in zone, failures observed, and the inspector's top "
                 "recommendation.", zf(groups[0]), ["C1-queue", "C2-contact", "C3-signoff"]),
            Turn("A5", "A", "core", "Run the April reconciliation for zone 01 with the existing code and show me the "
                 "summary it prints.", ["src/recon/reconcile.py"]),
            Turn("A6", "A", "core", "Those unmatched rows are because reconcile.py joins billing to readings on "
                 "customer name. Don't join on names: they aren't consistent between the two exports (O'Neill vs "
                 "ONeill in zone 01, and zone 04 has two different accounts both called J. Smith). Join on "
                 f"account_id plus meter_serial. Fix it, then rerun April for {self._zr(groups[0])} and write the "
                 "outputs to data/derived/.", [], ["R1-name-join"]),
            Turn("A7", "A", "core", "Two decisions for the variance memos. The consumption baseline, when we build it "
                 "(not yet), is the median of the last six monthly zone totals, not the mean: the March meter swaps "
                 "put spikes into several zones and they wreck the mean. And in the finance tables, show amounts in "
                 "thousands of euros with one decimal, column header 'EUR k'.\n\nWrite the March variance memo for "
                 "zone 02 now, without a baseline section for the moment, so finance can see the table format.",
                 [], ["D1-median", "I2-eur-k"]),
            Turn("B1", "B", "core", f"Read the survey reports for {self._zr(groups[1])}, add them to the findings "
                 "register, and run the April reconciliation for those zones.", zf(groups[1])),
            Turn("B2", "B", "core", "Read the January and February meeting notes in docs/meetings/ and list any action "
                 "items assigned to our team that aren't done yet.", mtg(["2026-01", "2026-02"])),
            Turn("B3", "B", "core", "Ops say some second-half-of-March bills look wrong. Have a look at "
                 "src/recon/tariffs.py and docs/tariffs/tariff-history.md and run the March amount check for zone "
                 "05. What's going on?", ["src/recon/tariffs.py", "docs/tariffs/tariff-history.md"]),
            Turn("B4", "B", "core", "Right, it's the cache: it takes one rate for the whole month and the tariff "
                 "changed on 16 March. Drop the cache and look the tariff up by each reading's date every time. "
                 "Don't bring a cache back for speed; it isn't worth the risk. Fix it and rerun the March amount "
                 "check for zones 01 to 09.", [], ["R2-tariff-cache"]),
            Turn("B5", "B", "core", "Read incident reports INC-2026-001 to INC-2026-010 in docs/incidents/ and tell me "
                 "which ones affected billing.", inc(1, 10)),
            Turn("B6", "B", "core", "Finance came back on the memo format: they want whole euros, no decimals, and the "
                 "column header just 'EUR'. Leave the zone 02 memo as it is; it has already gone round. Nothing "
                 "else to do on that now.\n\nNext, read the March and April meeting notes and update the findings "
                 "register with anything that changes a zone's status.", mtg(["2026-03", "2026-04"]),
                 ["K1-eur-whole"]),
        ]
        if groups[2]:
            t.append(Turn("B7", "B", "core", f"Read the survey reports for {self._zr(groups[2])}, add them to the "
                          "register, and run April for those zones.", zf(groups[2])))
        t += [
            Turn("C1", "C", "core", "Read incident reports INC-2026-011 to INC-2026-020. Which of them can we hold "
                 "MeterCo responsible for under the contract?", inc(11, 20), ["F3-outage-days"]),
            Turn("C2", "C", "core", "For the April variance memos, include any service credit we can claim from "
                 "MeterCo for the zone. Nothing to write yet.\n\nRead the ops handbook chapters 01 to 04 "
                 "(docs/ops/) and check whether our derived output files follow the naming rules in there.",
                 [f"docs/ops/handbook-{n:02d}.md" for n in range(1, 5)], ["I3-credit-in-memo"]),
        ]
        if groups[3]:
            t.append(Turn("C3", "C", "core", f"Read the survey reports for {self._zr(groups[3])}, add them to the "
                          "register, and run April for those zones.", zf(groups[3])))
        t += [
            Turn("C4", "C", "core", "A correction from the ops lead: the drift threshold is 12%, measured against the "
                 "metered volume, not 15% against billed. Don't rerun the zones already done, those outputs have "
                 "gone to ops; the new rule applies to everything from here on.", [], ["K2-threshold"]),
            Turn("C5", "C", "core", f"{self._zr(self.deferred).capitalize()} are next, but hold off on reconciling "
                 "them: ops need to confirm the April cutover dates for those zones first. Read their survey "
                 "reports now so we're ready, and add them to the register.", zf(self.deferred), ["U1-deferred"]),
            Turn("C6", "C", "core", "Read the consultant's meter-ageing report, docs/reports/consultant-ageing.md, "
                 "and draft three questions for the ops lead. Put them in the task file.",
                 ["docs/reports/consultant-ageing.md"]),
        ]
        return t

    def _meeting_paths(self) -> list[str]:
        out = []
        for month in self.p["meeting_months"]:
            for k, kind in enumerate(["ops-review", "steering"] + (["vendor-sync"] if month >= "2026-01" else [])):
                out.append(f"docs/meetings/{month}-{(k * 9 + 6):02d}-{kind}.md")
        return out

    def extension_turns(self) -> list[Turn]:
        hb = self.p["handbook"]
        mtg = lambda ms: [p for p in self._meeting_paths() if any(p.split("/")[-1].startswith(m) for m in ms)]  # noqa: E731
        inc = lambda a, b: [f"docs/incidents/INC-2026-{n:03d}.md" for n in range(a, min(b, self.p["incidents"]) + 1)]  # noqa: E731
        hbk = lambda a, b: [f"docs/ops/handbook-{n:02d}.md" for n in range(a, min(b, hb) + 1)]  # noqa: E731
        rep = lambda n: [f"docs/reports/{n}.md"]  # noqa: E731
        pool = [
            ("Read handbook chapters 05 to 08 and list any procedure our scripts don't follow yet. Just the list "
             "for now.", hbk(5, 8)),
            ("Read docs/reports/consultant-leakage.md and summarise the recommendations that would affect billing.",
             rep("consultant-leakage")),
            ("Look over src/recon and the tests. Add tests for anything in reconcile.py that isn't covered, and run "
             "the whole suite.", ["src/recon/reconcile.py", "src/recon/cli.py", "tests/test_reconcile.py"]),
            ("Read docs/reports/regulator-guidance.md and note anything that affects estimated billing.",
             rep("regulator-guidance")),
            ("Read the November and December meeting notes and list decisions that affect the reconciliation.",
             mtg(["2025-11", "2025-12"])),
            ("Read docs/reports/customer-complaints-review.md and summarise the themes that relate to estimated "
             "reads.", rep("customer-complaints-review")),
            ("Read docs/reports/consultant-ageing-appendix.md and tell me which zones it puts first for "
             "replacement.", rep("consultant-ageing-appendix")),
            ("Read docs/reports/asset-register-audit.md and list the discrepancies that would affect billing.",
             rep("asset-register-audit")),
            ("Read incident reports INC-2026-021 to INC-2026-024 and start an incident log at docs/incident-log.md: "
             "one line per incident with zone, date, cause and billing impact.", inc(21, 24)),
            ("Read handbook chapters 09 to 12 and write a short glossary of the terms we use at docs/glossary.md.",
             hbk(9, 12)),
            ("Read docs/reports/network-radio-survey.md and list the zones with the worst radio coverage.",
             rep("network-radio-survey")),
            ("Read the September and October meeting notes and update the task file with anything relevant.",
             mtg(["2025-09", "2025-10"])),
            ("Read incident reports INC-2026-025 to INC-2026-028 and add them to the incident log.", inc(25, 28)),
            ("Read handbook chapters 13 to 16 and compare the escalation procedure with what we've been doing.",
             hbk(13, 16)),
            ("Read docs/reports/billing-system-review.md and list anything that explains billing errors we've "
             "seen.", rep("billing-system-review")),
            ("Read the July and August meeting notes and list open action items that are still relevant.",
             mtg(["2025-07", "2025-08"])),
            ("Read docs/reports/pressure-management-study.md and tell me whether it changes anything for the "
             "zones we have reconciled.", rep("pressure-management-study")),
            ("Read docs/reports/capital-plan-2027.md and list the items that touch metering.",
             rep("capital-plan-2027")),
            ("Read docs/reports/smart-network-roadmap.md and summarise what it means for the head-end system.",
             rep("smart-network-roadmap")),
            ("Review the findings register against the survey reports for zones 01 to 04 and correct anything that "
             "doesn't match.", [f"docs/zones/zone-{z:02d}.md" for z in range(1, 5)]),
        ]
        out = []
        for i, (text, reads) in enumerate(pool):
            if reads and all(not r.startswith("docs/") or r in self._doc_paths() for r in reads):
                out.append(Turn(f"X{len(out) + 1:02d}", "X", "extension", text, reads))
        return out[: self.p["ext_pool"]]

    def overflow_turns(self) -> list[Turn]:
        """Further top-up turns for when the extension pool runs out before the required compactions:
        user-requested re-checks of the register against survey reports already read (same for every arm)."""
        out = []
        for lo in range(5, len(self.done) + 1, 4):
            zs = [z for z in range(lo, lo + 4) if z in self.done]
            if zs:
                out.append(Turn(f"Y{len(out) + 1:02d}", "Y", "extension",
                                f"Review the findings register against the survey reports for {self._zr(zs)} and "
                                "correct anything that doesn't match.", [f"docs/zones/zone-{z:02d}.md" for z in zs]))
        return out

    def script(self) -> list[Turn]:
        """Every scripted user turn in order: core, extension pool, overflow."""
        return self.turns() + self.extension_turns() + self.overflow_turns()

    def base_turns(self) -> int:
        """Turns every arm runs before the adaptive top-up: the core script plus base_ext extension blocks."""
        return len(self.turns()) + min(self.p["base_ext"], len(self.extension_turns()))

    def _doc_paths(self) -> set[str]:
        if not hasattr(self, "_docs_cache"):
            self._docs_cache = {p for p in self.files() if p.startswith("docs/")}
        return self._docs_cache

    # ------------------------------------------------------------------ evaluation ------------
    def eval_tasks(self) -> list[EvalTask]:
        common_forbidden = [self.v["queue"], self.v["vendor_contact"], self.v["finance_contact"],
                            str(self.v["signoff"]), f"{self.v['signoff']:,}", "median", "mean", "baseline",
                            "threshold", "12", "15", "EUR", "credit", "penalty", "decilit", "7.3", "account_id",
                            "serial", "name", "tariff", "cache", "pandas", "derived", "litre"]
        return [
            EvalTask("E1", "Ops have confirmed the April cutover dates, so you can go ahead with the rest of the "
                     "zones now.",
                     [("unfinished_work", f"output_exists:{z}") for z in self.deferred] +
                     [("correction_applied", f"flags_12m:{z}") for z in self.deferred] +
                     [("rejected_avoided", f"id_join:{self.z_names}"), ("early_file_fact", "decilitre_units"),
                      ("instruction_kept", "raw_untouched"), ("instruction_kept", "outputs_in_derived"),
                      ("repeated_work_avoided", "done_outputs_untouched")],
                     forbidden_in_prompt=common_forbidden + ["zone 1", "zones 1", "metered"]),
            EvalTask("E2", f"Finance need the April variance memo for zone {self.z_memo:02d} for the month-end close. "
                     "Please write it.",
                     [("correction_applied", "eur_header"), ("correction_applied", "whole_euros"),
                      ("distant_evidence", "credit_value"), ("distant_evidence", "outage_days"),
                      ("decision_applied", "baseline_median"), ("conversation_fact", "signoff_name"),
                      ("instruction_kept", "raw_untouched")],
                     forbidden_in_prompt=common_forbidden + ["outage", "MeterCo", "sign"]),
            EvalTask("E3", f"Draft the note to MeterCo about the zone {self.z_upgrade:02d} register problem so I can "
                     "send it.",
                     [("conversation_fact", "queue_id"), ("conversation_fact", "contact_name"),
                      ("early_file_fact", "spec_section"), ("early_file_fact", "decilitre_term"),
                      ("distant_evidence", "fw_and_section"), ("instruction_kept", "raw_untouched")],
                     forbidden_in_prompt=common_forbidden + ["4.2", "firmware", "queue"]),
            EvalTask("E4", "The commercial accounts billing export for March just landed: "
                     "data/raw/commercial_2026-03.csv. Add it to the reconciliation, including the amount check.",
                     [("rejected_avoided", "id_join_count"), ("rejected_avoided", "duplicate_names_split"),
                      ("rejected_avoided", "tariff_by_date"), ("rejected_avoided", "no_tariff_cache"),
                      ("correction_applied", "flags_12m"),
                      ("instruction_kept", "no_pandas"), ("instruction_kept", "raw_untouched"),
                      ("instruction_kept", "outputs_in_derived")],
                     setup_files={"data/raw/commercial_2026-03.csv": self.commercial_export()},
                     forbidden_in_prompt=[p for p in common_forbidden if p not in ("name",)] + ["Acct", "16 March"]),
        ]

    # ------------------------------------------------------------------ audits ----------------
    def planted_strings(self) -> dict[str, list[str]]:
        v = self.v
        return {
            "conversation_only": [v["queue"], v["vendor_contact"], v["finance_contact"], f"{v['signoff']:,}",
                                  str(v["signoff"])],
            "conversation_only_regex": [r"\bmedian\b", r"EUR\s?k\b", r"\b1[25]\s?%", r"whole euros"],
            "contract_only": [f"{v['credit_rate']}%", f"{v['fee']:,}"],
            "spec_only": ["decilitre"],
        }

    def audit(self, files: dict[str, str] | None = None) -> list[str]:
        """Problems with the generated project or script; an empty list means the scenario is consistent."""
        files = files or self.files()
        ps = self.planted_strings()
        problems = []
        docs = {p: t for p, t in files.items() if p.endswith((".md", ".csv", ".py"))}
        for p, text in docs.items():
            for s in ps["conversation_only"]:
                # a number counts only as a whole number: '2650' inside the register 126503 is not the amount
                hit = re.search(r"(?<![\d.,])" + re.escape(s) + r"(?![\d])", text) if s[0].isdigit() else s in text
                if hit:
                    problems.append(f"conversation-only value {s!r} appears in {p}")
            if p.startswith("docs/"):
                for rx in ps["conversation_only_regex"]:
                    if re.search(rx, text, re.I):
                        problems.append(f"conversation-only pattern {rx!r} appears in {p}")
            for s in ps["contract_only"]:
                if s in text and p != "docs/vendor/meterco-contract.md":
                    problems.append(f"contract value {s!r} also appears in {p}")
            if "decilitre" in text.lower() and p != "docs/vendor/meterco-firmware-spec.md":
                problems.append(f"'decilitre' appears outside the spec: {p}")
        contract, spec = files["docs/vendor/meterco-contract.md"], files["docs/vendor/meterco-firmware-spec.md"]
        for s in ps["contract_only"]:
            if s not in contract:
                problems.append(f"contract lacks {s!r}")
        if "### 7.3 Volume register units" not in spec or spec.index("### 7.3") < 16000:
            problems.append("spec section 7.3 missing or inside the first page the read admission returns")
        inc14 = files.get("docs/incidents/INC-2026-014.md", "")
        if f"zone {self.z_memo:02d}" not in inc14:
            problems.append("INC-2026-014 does not describe the zone outage")
        if self.v["upgrade_fw"] not in files[f"docs/zones/zone-{self.z_upgrade:02d}.md"]:
            problems.append("upgrade zone report lacks the firmware version")
        for turn in self.script():
            for r in turn.reads:
                if r not in files:
                    problems.append(f"turn {turn.id} reads missing file {r}")
        for task in self.eval_tasks():
            neutral = re.sub(r"zone \d\d", "zone NN", task.prompt.lower())  # a zone number is not a planted value
            for word in task.forbidden_in_prompt:
                if re.search(r"(?<![\w-])" + re.escape(word.lower()) + r"(?![\w-])", neutral):
                    problems.append(f"eval prompt {task.id} primes {word!r}")
        e = self.expected()
        b = e["E2"]["baseline"]
        if min(abs(m - x) for m in b["median"] for x in b["mean"]) < 10:
            problems.append("baseline median and mean candidates are too close to discriminate")
        rules = e["E1_rules"]
        for z in self.deferred:
            if rules["15b"][z] == rules["12m"][z] or rules["12b"][z] == rules["12m"][z]:
                problems.append(f"zone {z} flag sets do not discriminate the threshold rules")
        variance = sum(a.billed[BILL_PERIODS.index("2026-04")] - self.metered(a, "2026-04")
                       for a in self.accounts[self.z_memo]) * 2.19
        if variance <= self.v["signoff"]:
            problems.append(f"zone {self.z_memo} April variance {variance:.0f} does not exceed the sign-off amount")
        return problems

    def stats(self) -> dict[str, Any]:
        files = self.files()
        reads_core = sum(len(files[r]) for t in self.turns() for r in t.reads if r in files)
        reads_ext = [sum(len(files[r]) for r in t.reads if r in files) for t in self.extension_turns()]
        return {"files": len(files), "project_chars": sum(len(t) for t in files.values()),
                "core_turns": len(self.turns()), "extension_pool": len(reads_ext),
                "core_read_chars": reads_core, "core_read_tokens": int(reads_core / CHARS_PER_TOKEN),
                "extension_read_tokens": [int(c / CHARS_PER_TOKEN) for c in reads_ext]}


CLAUDE_MD = """# Riverbend Water: meter data reconciliation

- Code: `src/recon` (run through `python recon.py <command>`; `python recon.py --help` lists commands).
- Tests: `python -m unittest discover -s tests`.
- Vendor and billing exports: `data/raw/`. Reference tables: `data/reference/`.
- Documents: `docs/` (contract and firmware spec under `docs/vendor/`, field survey reports under `docs/zones/`,
  meeting notes, incidents, the operations handbook and consultant reports).
"""

README_MD = """# Riverbend meter reconciliation

Scripts that compare what the billing system charged with what the MeterCo meters recorded.

## Commands

    python recon.py reconcile --zone 7 --period 2026-04 [--out DIR]
    python recon.py amounts --zone 7 --period 2026-03

`reconcile` writes `recon_zone_<zz>_<period>.csv` (default directory `out/`) and prints a summary.
`amounts` checks billed amounts against the tariff table.

## Data

- `data/raw/readings_zone_<zz>.csv`: MeterCo readings export (one row per meter per monthly read).
- `data/raw/billing_zone_<zz>.csv`: billing system export (one row per account per billing period).
- `data/raw/readings_commercial.csv`: readings for the commercial accounts.
- `data/raw/accounts.csv`: account list.
- `data/reference/tariffs.csv`: tariff table.

The scripts were written by the previous contractor and have not been reviewed.
"""

STARTER_CODE: dict[str, str] = {
    "recon.py": '''"""Command line entry point.

    python recon.py reconcile --zone 7 --period 2026-04 [--out DIR]
    python recon.py amounts --zone 7 --period 2026-03
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from recon.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
''',
    "src/recon/__init__.py": '"""Billing versus metering reconciliation for Riverbend Water."""\n',
    "src/recon/io.py": '''"""Loaders for the MeterCo readings export and the billing system export."""
from __future__ import annotations

import csv
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]
RAW = PROJECT / "data" / "raw"
REFERENCE = PROJECT / "data" / "reference"
DEFAULT_OUT = PROJECT / "out"


def _rows(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def load_readings(zone: int) -> list[dict]:
    rows = _rows(RAW / f"readings_zone_{zone:02d}.csv")
    for r in rows:
        r["register"] = int(r["register"])
    return rows


def load_billing(zone: int) -> list[dict]:
    rows = _rows(RAW / f"billing_zone_{zone:02d}.csv")
    for r in rows:
        r["billed_m3"] = float(r["billed_m3"])
        r["amount_eur"] = float(r["amount_eur"])
    return rows
''',
    "src/recon/units.py": '''"""Conversion of MeterCo register values to cubic metres."""


def register_to_m3(value: int, firmware: str) -> float:
    """MeterCo registers count litres."""
    return value / 1000.0
''',
    "src/recon/tariffs.py": '''"""Tariff lookup from data/reference/tariffs.csv.

Rates are cached per tariff class and billing period so the amount check does not
re-read the table for every account.
"""
from __future__ import annotations

import csv

from .io import REFERENCE

_CACHE: dict[tuple[str, str], tuple[float, float]] = {}


def _table() -> list[dict]:
    with open(REFERENCE / "tariffs.csv", newline="", encoding="utf-8") as fh:
        return sorted(csv.DictReader(fh), key=lambda r: r["valid_from"])


def _in_force(tariff_class: str, day: str) -> tuple[float, float]:
    found = None
    for row in _table():
        if row["tariff_class"] == tariff_class and row["valid_from"] <= day:
            found = (float(row["rate_eur_m3"]), float(row["standing_eur"]))
    if found is None:
        raise KeyError(f"no tariff for {tariff_class} on {day}")
    return found


def rate_for_period(tariff_class: str, period: str) -> tuple[float, float]:
    """(rate per m3, standing charge) for a billing period 'YYYY-MM'."""
    key = (tariff_class, period)
    if key not in _CACHE:
        _CACHE[key] = _in_force(tariff_class, period + "-01")
    return _CACHE[key]
''',
    "src/recon/report.py": '''"""Formatting helpers for memos."""


def eur_k(amount: float) -> str:
    """Amount in thousands of euros, one decimal."""
    return f"{amount / 1000:.1f}"


def md_table(headers: list[str], rows: list[list]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    lines += ["| " + " | ".join(str(c) for c in row) + " |" for row in rows]
    return "\\n".join(lines)
''',
    "src/recon/reconcile.py": '''"""Billed versus metered volumes for one zone and billing period."""
from __future__ import annotations

import csv
from pathlib import Path

from .io import load_billing, load_readings
from .tariffs import rate_for_period
from .units import register_to_m3

DRIFT_THRESHOLD = 0.15  # flag when |billed - metered| / billed exceeds this


def previous_period(period: str) -> str:
    y, m = map(int, period.split("-"))
    y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    return f"{y:04d}-{m:02d}"


def metered(readings: list[dict], period: str) -> dict[str, float]:
    """Metered m3 per customer for the period: this period's read minus the previous one."""
    by_month = {(r["customer_name"], r["read_date"][:7]): r for r in readings}
    prev = previous_period(period)
    out = {}
    for (name, month), cur in by_month.items():
        if month != period or (name, prev) not in by_month:
            continue
        before = by_month[(name, prev)]
        out[name] = round(register_to_m3(cur["register"], cur["firmware"])
                          - register_to_m3(before["register"], before["firmware"]), 3)
    return out


def reconcile(zone: int, period: str) -> tuple[list[dict], list[dict]]:
    readings = load_readings(zone)
    billing = [b for b in load_billing(zone) if b["period"] == period]
    m = metered(readings, period)
    rows, unmatched = [], []
    for b in billing:
        key = b["customer_name"]
        if key not in m:
            unmatched.append(b)
            continue
        diff = (b["billed_m3"] - m[key]) / b["billed_m3"]
        rows.append({"account_id": b["account_id"], "meter_serial": b["meter_serial"], "customer_name": key,
                     "metered_m3": m[key], "billed_m3": b["billed_m3"], "diff_pct": round(100 * diff, 1),
                     "drift_flag": abs(diff) > DRIFT_THRESHOLD})
    return rows, unmatched


def write_csv(rows: list[dict], out_dir: Path, zone: int, period: str) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"recon_zone_{zone:02d}_{period}.csv"
    fields = ["account_id", "meter_serial", "customer_name", "metered_m3", "billed_m3", "diff_pct", "drift_flag"]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    return path


def check_amounts(zone: int, period: str) -> list[dict]:
    billing = [b for b in load_billing(zone) if b["period"] == period]
    tclass = {r["account_id"]: r["tariff_class"] for r in load_readings(zone)}
    bad = []
    for b in billing:
        rate, standing = rate_for_period(tclass[b["account_id"]], period)
        expected = round(b["billed_m3"] * rate + standing, 2)
        if abs(expected - b["amount_eur"]) > 0.05:
            bad.append({"account_id": b["account_id"], "read_date": b["read_date"], "billed_m3": b["billed_m3"],
                        "amount_eur": b["amount_eur"], "expected_eur": expected})
    return bad
''',
    "src/recon/cli.py": '''"""Command line interface."""
from __future__ import annotations

import argparse
from pathlib import Path

from .io import DEFAULT_OUT
from .reconcile import check_amounts, reconcile, write_csv


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(prog="recon.py")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("reconcile", help="billed versus metered volumes for a zone and period")
    r.add_argument("--zone", type=int, required=True)
    r.add_argument("--period", required=True)
    r.add_argument("--out", default=str(DEFAULT_OUT))
    a = sub.add_parser("amounts", help="check billed amounts against the tariff table")
    a.add_argument("--zone", type=int, required=True)
    a.add_argument("--period", required=True)
    args = p.parse_args(argv)
    if args.cmd == "reconcile":
        rows, unmatched = reconcile(args.zone, args.period)
        path = write_csv(rows, Path(args.out), args.zone, args.period)
        flags = sum(1 for row in rows if row["drift_flag"])
        print(f"zone {args.zone:02d} {args.period}: {len(rows) + len(unmatched)} billed, {len(rows)} matched, "
              f"{len(unmatched)} unmatched, {flags} drift flags; written to {path}")
        for u in unmatched:
            print(f"  unmatched: {u['account_id']} {u['customer_name']}")
    else:
        bad = check_amounts(args.zone, args.period)
        print(f"zone {args.zone:02d} {args.period}: {len(bad)} amount mismatches")
        for b in bad:
            print(f"  {b['account_id']} read {b['read_date']}: billed {b['amount_eur']:.2f}, "
                  f"expected {b['expected_eur']:.2f}")
    return 0
''',
    "tests/test_units.py": '''import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from recon.units import register_to_m3  # noqa: E402


class UnitsTest(unittest.TestCase):
    def test_litres(self):
        self.assertAlmostEqual(register_to_m3(12345, "4.1.7"), 12.345)


if __name__ == "__main__":
    unittest.main()
''',
    "tests/test_reconcile.py": '''import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from recon.reconcile import previous_period  # noqa: E402


class PeriodTest(unittest.TestCase):
    def test_previous(self):
        self.assertEqual(previous_period("2026-01"), "2025-12")
        self.assertEqual(previous_period("2026-04"), "2026-03")


if __name__ == "__main__":
    unittest.main()
''',
}
