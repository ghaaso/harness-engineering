#!/usr/bin/env python3
"""Build the WP11 decision board from decisions.json and queue.json.

Writes index.html and BOARD.md next to this file. Never edit those two by hand:
edit the JSON files and run this again.  Usage: python3 build.py [--today YYYY-MM-DD]
"""
import argparse
import datetime as dt
import html
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
STATUSES = {"open", "answered"}
RUN_STATUSES = {"booked", "running", "done", "cancelled"}
FIELDS = ("id", "question", "options", "recommended", "blocks", "status", "answer", "asked_on", "source", "waits")
RUN_FIELDS = ("id", "who", "what", "est_tokens", "needs_ff_slot", "booked_for", "status")


def validate(decisions):
    errors, seen = [], set()
    for d in decisions:
        did = d.get("id") or "?"
        missing = [k for k in FIELDS if k not in d]
        if missing:
            errors.append(f"{did}: missing {', '.join(missing)}")
        if not str(d.get("source") or "").strip():
            errors.append(f"{did}: no source")
        if d.get("status") not in STATUSES:
            errors.append(f"{did}: unknown status {d.get('status')!r}")
        if d.get("status") == "open":
            try:
                dt.date.fromisoformat(str(d.get("asked_on")))
            except ValueError:
                errors.append(f"{did}: asked_on is not YYYY-MM-DD")
        if not isinstance(d.get("blocks"), list) or not isinstance(d.get("waits"), list):
            errors.append(f"{did}: blocks and waits must be lists")
        if did in seen:
            errors.append(f"{did}: duplicate id")
        seen.add(did)
    if errors:
        raise ValueError("decisions.json is invalid:\n  " + "\n  ".join(errors))


def validate_queue(queue):
    errors = []
    for r in queue.get("runs", []):
        rid = r.get("id") or "?"
        missing = [k for k in RUN_FIELDS if k not in r]
        if missing:
            errors.append(f"{rid}: missing {', '.join(missing)}")
        if r.get("status") not in RUN_STATUSES:
            errors.append(f"{rid}: unknown status {r.get('status')!r}")
        if not isinstance(r.get("est_tokens"), int):
            errors.append(f"{rid}: est_tokens must be a whole number")
    if errors:
        raise ValueError("queue.json is invalid:\n  " + "\n  ".join(errors))


def open_rows(decisions, today):
    """Open decisions with days waiting, most rows blocked first."""
    rows = []
    for i, d in enumerate(decisions):
        if d["status"] != "open":
            continue
        days = (today - dt.date.fromisoformat(d["asked_on"])).days
        rows.append({"d": d, "days": days, "over": days > 1, "i": i})
    rows.sort(key=lambda r: (-len(r["d"]["blocks"]), -r["days"], r["i"]))
    return rows


def plural(n, word):
    return f"{n} {word}" if n == 1 else f"{n} {word}s"


def summary(rows):
    over = sum(r["over"] for r in rows)
    text = f"{plural(len(rows), 'open decision')}, {over} over a day"
    if rows and rows[0]["d"]["blocks"]:
        top = rows[0]["d"]
        text += f", {top['id']} blocks {plural(len(top['blocks']), 'row')}"
    waits = sum(len(r["d"]["waits"]) for r in rows)
    return text + f", {plural(waits, 'wait')} logged"


def by_package(rows):
    """[(package, [(decision id, days waiting)])], most decisions first, then longest wait."""
    pk = {}
    for r in rows:
        for b in r["d"]["blocks"]:
            pk.setdefault(b, []).append((r["d"]["id"], r["days"]))
    return sorted(pk.items(), key=lambda kv: (-len(kv[1]), -max(d for _, d in kv[1]), kv[0]))


HOW_TO = ("To answer one: in decisions.json set its status to \"answered\" and write the answer, "
          "then run python3 build.py. When a package has to wait on a decision, add an entry to its "
          "waits list; the summary counts them.")


def queue_totals(queue):
    live = [r for r in queue.get("runs", []) if not r.get("example") and r["status"] in ("booked", "running")]
    booked = sum(r["est_tokens"] for r in live)
    budget = queue.get("d07_budget_tokens_per_window")
    if budget is None:
        return f"D07 budget: {queue.get('d07_budget_note') or 'not set'}. Booked or running: {booked:,} tokens."
    flag = " OVER BUDGET" if booked > budget else ""
    return f"D07 budget: {budget:,} tokens per window. Booked or running: {booked:,} tokens.{flag}"


def waits_text(d):
    return [f"{w.get('package')} waited {w.get('from')} to {w.get('to') or 'now'}: {w.get('note', '')}" for w in d["waits"]]


# ---------- HTML ----------

CSS = """
:root{--bg:#fbfaf7;--card:#fff;--ink:#1d1d1b;--mute:#6b6a65;--line:#e3e0d8;--flag:#b42318;--flagbg:#fde8e6;--ok:#1f6f43;--accent:#2f5b9a}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--card:#1e1e1c;--ink:#ecebe6;--mute:#a3a29b;--line:#34332f;--flag:#ff8a7a;--flagbg:#3a1d19;--ok:#7fd1a1;--accent:#8fb4ee}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:920px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:1.5rem;margin:0 0 4px}h2{font-size:1.15rem;margin:32px 0 12px;border-bottom:1px solid var(--line);padding-bottom:6px}
.gen{color:var(--mute);font-size:.85rem;margin:0 0 16px}
.how{font-size:.9rem;color:var(--mute);border-left:3px solid var(--accent);padding:4px 10px;margin:12px 0}
details{margin:12px 0}summary{cursor:pointer;font-weight:600;padding:6px 0}
.sum{font-weight:600;font-size:1.05rem;padding:12px 14px;background:var(--card);border:1px solid var(--line);border-radius:8px}
article{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin:0 0 10px}
article.over{border-left:4px solid var(--flag)}
.head{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;font-size:.9rem;color:var(--mute)}
.id{font-weight:700;color:var(--ink);font-size:1rem}
.badge{background:var(--flagbg);color:var(--flag);font-weight:700;border-radius:4px;padding:0 6px}
.q{margin:4px 0 6px;font-size:1.02rem}
ul{margin:4px 0;padding-left:20px}li.rec{font-weight:600}li.rec::after{content:" (recommended)";font-weight:400;color:var(--ok)}
.meta{font-size:.85rem;color:var(--mute);margin:2px 0;overflow-wrap:anywhere}
code{font-size:.85em}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}
th,td{text-align:left;border-bottom:1px solid var(--line);padding:6px 8px;vertical-align:top}
tr.example td{color:var(--mute);font-style:italic}
"""


def e(s):
    return html.escape(str(s if s is not None else ""))


def card_html(d, days=None, over=False):
    head = [f'<span class="id">{e(d["id"])}</span>']
    if d["status"] == "open":
        head.append(f"blocks {plural(len(d['blocks']), 'row')}")
        head.append(f"waiting {plural(days, 'day')} (asked {e(d['asked_on'])})")
        if over:
            head.append('<span class="badge">over a day</span>')
    if d.get("when"):
        head.append(f"when: {e(d['when'])}")
    out = [f'<article class="{"over" if over else ""}">', f'<div class="head">{" · ".join(head)}</div>',
           f'<p class="q">{e(d["question"])}</p>']
    if d["options"]:
        lis = "".join(f'<li class="{"rec" if o == d["recommended"] else ""}">{e(o)}</li>' for o in d["options"])
        out.append(f"<ul>{lis}</ul>")
    if d["blocks"]:
        out.append(f'<p class="meta">Rows waiting on it: {e(", ".join(d["blocks"]))}</p>')
    if d.get("part4_unblocks"):
        out.append(f'<p class="meta">Part 4 says it unblocks: {e(d["part4_unblocks"])}</p>')
    if d["answer"]:
        out.append(f'<p class="meta"><strong>Answer:</strong> {e(d["answer"])}</p>')
    if d.get("note"):
        out.append(f'<p class="meta">Note: {e(d["note"])}</p>')
    for w in waits_text(d):
        out.append(f'<p class="meta">Wait logged: {e(w)}</p>')
    out.append(f'<p class="meta">Source: <code>{e(d["source"])}</code></p></article>')
    return "\n".join(out)


def render_html(decisions, queue, today):
    rows = open_rows(decisions, today)
    answered = [d for d in decisions if d["status"] == "answered"]
    p = ["<!doctype html>", '<html lang="en"><head><meta charset="utf-8">',
         '<meta name="viewport" content="width=device-width,initial-scale=1">',
         "<title>WP11 Decision Board</title>", f"<style>{CSS}</style></head><body><main>",
         "<h1>WP11 decision board</h1>",
         f'<p class="gen">Generated by build.py from decisions.json and queue.json for {today.isoformat()}. Do not edit this page; edit the JSON and rebuild.</p>',
         f'<p class="sum">{e(summary(rows))}</p>',
         f'<p class="how">{e(HOW_TO)}</p>',
         "<h2>Which package waits on what</h2>"]
    pk = by_package(rows)
    if pk:
        p.append('<div class="wrap"><table><thead><tr><th>Package</th><th>Open decisions it waits on</th>'
                 '<th>Longest wait</th></tr></thead><tbody>')
        p += [f"<tr><td>{e(k)}</td><td>{e(', '.join(i for i, _ in v))}</td><td>{plural(max(d for _, d in v), 'day')}</td></tr>"
              for k, v in pk]
        p.append("</tbody></table></div>")
    else:
        p.append("<p>No package is waiting.</p>")
    blocking = [r for r in rows if r["d"]["blocks"]]
    rest = [r for r in rows if not r["d"]["blocks"]]
    p.append("<h2>Waiting on you (colleague), blocking a package</h2>")
    p += [card_html(r["d"], r["days"], r["over"]) for r in blocking] or ["<p>Nothing is blocking a package.</p>"]
    if rest:
        p.append(f"<details><summary>Open but blocking no package yet ({len(rest)})</summary>")
        p += [card_html(r["d"], r["days"], r["over"]) for r in rest]
        p.append("</details>")
    p.append("<h2>Answered</h2>")
    p += [card_html(d) for d in answered] or ["<p>None yet.</p>"]
    p += ["<h2>Booking queue</h2>",
          "<p>Agent runs on the colleague's PC only, booked against the colleague's D07 budget. "
          "Heavy checks still take an <code>ff-slot.sh</code> slot.</p>",
          f'<p class="sum">{e(queue_totals(queue))}</p>',
          '<div class="wrap"><table><thead><tr>' + "".join(f"<th>{k}</th>" for k in RUN_FIELDS) + "</tr></thead><tbody>"]
    for r in queue.get("runs", []):
        cells = [e(r.get(k)) for k in RUN_FIELDS]
        if r.get("example"):
            cells[0] += " (example)"
        p.append(f'<tr class="{"example" if r.get("example") else ""}">' + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
    if not queue.get("runs"):
        p.append(f'<tr><td colspan="{len(RUN_FIELDS)}">No runs booked.</td></tr>')
    p += ["</tbody></table></div>", "</main></body></html>"]
    return "\n".join(p) + "\n"


# ---------- Markdown ----------

def md_cell(s):
    return str(s if s is not None else "").replace("|", "\\|").replace("\n", " ")


def card_md(d, days=None, over=False):
    head = f"### {d['id']}"
    if d["status"] == "open":
        head += f" · blocks {plural(len(d['blocks']), 'row')} · waiting {plural(days, 'day')} (asked {d['asked_on']})"
        if over:
            head += " · **OVER A DAY**"
    out = [head, "", d["question"], ""]
    for o in d["options"]:
        out.append(f"- **{o}** (recommended)" if o == d["recommended"] else f"- {o}")
    if d["options"]:
        out.append("")
    if d.get("when"):
        out.append(f"- When: {d['when']}")
    if d["blocks"]:
        out.append(f"- Rows waiting on it: {', '.join(d['blocks'])}")
    if d.get("part4_unblocks"):
        out.append(f"- Part 4 says it unblocks: {d['part4_unblocks']}")
    if d["answer"]:
        out.append(f"- Answer: {d['answer']}")
    if d.get("note"):
        out.append(f"- Note: {d['note']}")
    out += [f"- Wait logged: {w}" for w in waits_text(d)]
    out += [f"- Source: `{d['source']}`", ""]
    return out


def render_md(decisions, queue, today):
    rows = open_rows(decisions, today)
    answered = [d for d in decisions if d["status"] == "answered"]
    out = ["<!-- generated by build.py from decisions.json and queue.json, do not edit -->",
           "# WP11 decision board", "",
           f"_Generated by build.py for {today.isoformat()}, do not edit. Edit the JSON files and rebuild._", "",
           f"**{summary(rows)}**", "", f"_{HOW_TO}_", "", "## Which package waits on what", ""]
    pk = by_package(rows)
    if pk:
        out += ["| Package | Open decisions it waits on | Longest wait |", "| --- | --- | --- |"]
        out += [f"| {md_cell(k)} | {', '.join(i for i, _ in v)} | {plural(max(d for _, d in v), 'day')} |" for k, v in pk]
        out.append("")
    else:
        out += ["No package is waiting.", ""]
    out += ["## Waiting on you (colleague), blocking a package", ""]
    blocking = [r for r in rows if r["d"]["blocks"]]
    for r in blocking:
        out += card_md(r["d"], r["days"], r["over"])
    if not blocking:
        out += ["Nothing is blocking a package.", ""]
    rest = [r for r in rows if not r["d"]["blocks"]]
    if rest:
        out += [f"## Open but blocking no package yet ({len(rest)})", ""]
        for r in rest:
            out += card_md(r["d"], r["days"], r["over"])
    out += ["## Answered", ""]
    for d in answered:
        out += card_md(d)
    if not answered:
        out += ["None yet.", ""]
    out += ["## Booking queue", "",
            "Agent runs on the colleague's PC only, booked against the colleague's D07 budget. "
            "Heavy checks still take an `ff-slot.sh` slot.", "", queue_totals(queue), "",
            "| " + " | ".join(RUN_FIELDS) + " |", "|" + " --- |" * len(RUN_FIELDS)]
    for r in queue.get("runs", []):
        cells = [md_cell(r.get(k)) for k in RUN_FIELDS]
        if r.get("example"):
            cells[0] += " (example)"
        out.append("| " + " | ".join(cells) + " |")
    return "\n".join(out) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--today", type=dt.date.fromisoformat, default=dt.date.today(), help="YYYY-MM-DD")
    args = ap.parse_args(argv)
    decisions = json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["decisions"]
    queue = json.loads((HERE / "queue.json").read_text(encoding="utf-8"))
    try:
        validate(decisions)
        validate_queue(queue)
    except ValueError as err:
        print(err, file=sys.stderr)
        return 1
    (HERE / "index.html").write_text(render_html(decisions, queue, args.today), encoding="utf-8")
    (HERE / "BOARD.md").write_text(render_md(decisions, queue, args.today), encoding="utf-8")
    print(summary(open_rows(decisions, args.today)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
