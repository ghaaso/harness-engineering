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
:root{--bg:#f6f5f1;--card:#fff;--ink:#1c1c1a;--mute:#66645e;--line:#e4e1d9;--soft:#f1efe9;
--flag:#b42318;--flagbg:#fde8e6;--ok:#1f6f43;--okbg:#e5f3ea;--accent:#2457a6;--accentbg:#e8eef8;
--dec:#6b4e00;--decbg:#fff4d6;--decline:#ecd79a;--band:#1c1c1a;--bandink:#fff;--bandmute:#c9c6be}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121211;--card:#1c1c1a;--ink:#ecebe6;--mute:#a3a29b;
--line:#34332f;--soft:#252522;--flag:#ff8a7a;--flagbg:#3a1d19;--ok:#7fd1a1;--okbg:#17301f;--accent:#8db3f0;--accentbg:#1c2738;
--dec:#f0d690;--decbg:#3a3016;--decline:#5c4c1e;--band:#26261f;--bandink:#ecebe6;--bandmute:#a3a29b}}
:root[data-theme="dark"]{--bg:#121211;--card:#1c1c1a;--ink:#ecebe6;--mute:#a3a29b;
--line:#34332f;--soft:#252522;--flag:#ff8a7a;--flagbg:#3a1d19;--ok:#7fd1a1;--okbg:#17301f;--accent:#8db3f0;--accentbg:#1c2738;
--dec:#f0d690;--decbg:#3a3016;--decline:#5c4c1e;--band:#26261f;--bandink:#ecebe6;--bandmute:#a3a29b}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,"Segoe UI",system-ui,sans-serif}
main{max-width:960px;margin:0 auto;padding:24px 16px 64px}
h1,h2{font-family:"Avenir Next","Segoe UI",-apple-system,system-ui,sans-serif;letter-spacing:-.01em}
h2{font-size:1.2rem;margin:36px 0 12px;display:flex;align-items:baseline;gap:8px}
h2 .count{font-size:.8rem;font-weight:700;color:var(--mute);background:var(--soft);border-radius:999px;padding:1px 9px}
code{font:.82em ui-monospace,"SF Mono",Menlo,Consolas,monospace}
a{color:var(--accent)}
.band{background:var(--band);color:var(--bandink);border-radius:14px;padding:22px 22px 18px}
.kicker{font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--bandmute);margin:0}
.band h1{font-size:2rem;line-height:1.1;margin:4px 0 6px;font-weight:800}
.band p{margin:0;color:var(--bandmute);font-size:.9rem}
.band .sum{color:var(--bandink);font-weight:600;font-size:1rem;margin-top:10px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px}
.stat b{display:block;font-size:1.6rem;line-height:1.2;font-family:"Avenir Next","Segoe UI",system-ui,sans-serif}
.stat span{font-size:.8rem;color:var(--mute)}
.stat.bad{border-color:var(--flag);background:var(--flagbg)}.stat.bad b{color:var(--flag)}
.stat.good b{color:var(--ok)}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 0}
nav a{font-size:.85rem;text-decoration:none;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px 12px}
nav a:hover{border-color:var(--accent);color:var(--accent)}
.how{font-size:.88rem;color:var(--mute);background:var(--card);border:1px dashed var(--line);border-radius:10px;padding:10px 14px;margin:14px 0 0}
.wrap{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:.9rem}
th,td{text-align:left;border-bottom:1px solid var(--line);padding:9px 12px;vertical-align:top}
tr:last-child td{border-bottom:0}
th{font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);font-weight:700;background:var(--soft)}
td.n{white-space:nowrap;color:var(--mute)}
tr.example td{color:var(--mute);font-style:italic}
.chip{display:inline-block;border-radius:999px;padding:1px 10px;margin:2px 4px 2px 0;font-size:.8rem;font-weight:600;
background:var(--soft);border:1px solid var(--line);color:var(--ink);text-decoration:none}
a.chip{background:var(--decbg);border-color:var(--decline);color:var(--dec)}
a.chip:hover{filter:brightness(.95)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:0 0 10px;scroll-margin-top:12px}
.card.over{border-left:5px solid var(--flag)}
.card:target{outline:3px solid var(--accent);outline-offset:2px}
.head{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.id{font-weight:800;font-size:1.05rem;margin-right:4px;font-family:"Avenir Next","Segoe UI",system-ui,sans-serif}
.pill{font-size:.78rem;color:var(--mute);background:var(--soft);border-radius:999px;padding:1px 9px}
.pill.ok{color:var(--ok);background:var(--okbg);font-weight:700}
.badge{font-size:.78rem;background:var(--flagbg);color:var(--flag);font-weight:700;border-radius:999px;padding:1px 9px}
.when{font-size:.78rem;color:var(--mute);margin-left:auto}
.q{margin:8px 0 6px;font-size:1.06rem;font-weight:600}
ul.opts{list-style:none;margin:6px 0 8px;padding:0}
ul.opts li{padding:5px 10px;margin:3px 0;border-radius:8px;background:var(--soft);font-size:.92rem}
ul.opts li.rec{background:var(--okbg);font-weight:600}
.tag{font-size:.7rem;font-weight:700;color:var(--ok);text-transform:uppercase;letter-spacing:.06em;margin-left:6px}
.meta,.answer{font-size:.86rem;color:var(--mute);margin:4px 0;overflow-wrap:anywhere}
.answer{color:var(--ink);background:var(--okbg);border-radius:8px;padding:6px 10px}
.lbl{font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin-right:8px}
.src{font:.75rem ui-monospace,"SF Mono",Menlo,Consolas,monospace;color:var(--mute);margin:8px 0 0;overflow-wrap:anywhere}
details{margin:14px 0}
summary{cursor:pointer;font-weight:700;padding:10px 14px;background:var(--card);border:1px solid var(--line);border-radius:10px;margin-bottom:10px}
.queue-sum{font-weight:600;margin:0 0 10px}
footer{margin-top:40px;font-size:.8rem;color:var(--mute)}
"""


def e(s):
    return html.escape(str(s if s is not None else ""))


def chips(items, link=False):
    if link:
        return "".join(f'<a class="chip" href="#{e(i)}">{e(i)}</a>' for i in items)
    return "".join(f'<span class="chip">{e(i)}</span>' for i in items)


def card_html(d, days=None, over=False):
    head = [f'<span class="id">{e(d["id"])}</span>']
    if d["status"] == "open":
        head.append(f'<span class="pill">blocks {plural(len(d["blocks"]), "row")}</span>')
        head.append(f'<span class="pill">waiting {plural(days, "day")} · asked {e(d["asked_on"])}</span>')
        if over:
            head.append('<span class="badge">over a day</span>')
    else:
        head.append('<span class="pill ok">answered</span>')
    if d.get("when"):
        head.append(f'<span class="when">when: {e(d["when"])}</span>')
    out = [f'<article id="{e(d["id"])}" class="card{" over" if over else ""}">',
           f'<div class="head">{"".join(head)}</div>', f'<p class="q">{e(d["question"])}</p>']
    if d["options"]:
        lis = "".join(f'<li class="rec">{e(o)}<span class="tag">recommended</span></li>' if o == d["recommended"]
                      else f"<li>{e(o)}</li>" for o in d["options"])
        out.append(f'<ul class="opts">{lis}</ul>')
    if d["blocks"]:
        out.append(f'<p class="meta"><span class="lbl">Waiting on it</span>{chips(d["blocks"])}</p>')
    if d.get("part4_unblocks"):
        out.append(f'<p class="meta"><span class="lbl">Part 4 says it unblocks</span>{e(d["part4_unblocks"])}</p>')
    if d["answer"]:
        out.append(f'<p class="answer"><span class="lbl">Answer</span>{e(d["answer"])}</p>')
    if d.get("note"):
        out.append(f'<p class="meta"><span class="lbl">Note</span>{e(d["note"])}</p>')
    for w in waits_text(d):
        out.append(f'<p class="meta"><span class="lbl">Wait logged</span>{e(w)}</p>')
    out.append(f'<p class="src">{e(d["source"])}</p></article>')
    return "\n".join(out)


def stat(value, label, tone=""):
    return f'<div class="stat {tone}"><b>{e(value)}</b><span>{e(label)}</span></div>'


def render_html(decisions, queue, today):
    rows = open_rows(decisions, today)
    answered = [d for d in decisions if d["status"] == "answered"]
    blocking = [r for r in rows if r["d"]["blocks"]]
    rest = [r for r in rows if not r["d"]["blocks"]]
    pk = by_package(rows)
    over = sum(r["over"] for r in rows)
    waits = sum(len(r["d"]["waits"]) for r in rows)
    budget = queue.get("d07_budget_tokens_per_window")
    p = ["<!doctype html>", '<html lang="en"><head><meta charset="utf-8">',
         '<meta name="viewport" content="width=device-width,initial-scale=1">',
         "<title>WP11 Decision Board</title>", f"<style>{CSS}</style></head><body><main>",
         '<header class="band"><p class="kicker">WP11 · decisions and pages</p><h1>Decision board</h1>',
         f"<p>Every decision still owed, built from decisions.json and queue.json for {today.isoformat()}. "
         "Do not edit this page; edit the JSON and rebuild.</p>",
         f'<p class="sum">{e(summary(rows))}</p></header>',
         '<div class="stats">',
         stat(len(rows), "open decisions"),
         stat(over, "open more than a day", "bad" if over else "good"),
         stat(len(pk), "packages waiting", "bad" if pk else "good"),
         stat(waits, "waits logged"),
         stat(f"{budget:,}" if budget is not None else "not set", "D07 budget per window", "" if budget is not None else "bad"),
         "</div>",
         f'<nav><a href="#packages">Packages ({len(pk)})</a><a href="#blocking">Blocking ({len(blocking)})</a>'
         f'<a href="#rest">Not blocking ({len(rest)})</a><a href="#answered">Answered ({len(answered)})</a>'
         '<a href="#queue">Booking queue</a></nav>',
         f'<p class="how">{e(HOW_TO)}</p>',
         f'<h2 id="packages">Which package waits on what <span class="count">{len(pk)}</span></h2>']
    if pk:
        p.append('<div class="wrap"><table><thead><tr><th>Package</th><th>Open decisions it waits on</th>'
                 '<th>Longest wait</th></tr></thead><tbody>')
        p += [f'<tr><td>{e(k)}</td><td>{chips([i for i, _ in v], link=True)}</td>'
              f'<td class="n">{plural(max(d for _, d in v), "day")}</td></tr>' for k, v in pk]
        p.append("</tbody></table></div>")
    else:
        p.append("<p>No package is waiting.</p>")
    p.append(f'<h2 id="blocking">Waiting on you, blocking a package <span class="count">{len(blocking)}</span></h2>')
    p += [card_html(r["d"], r["days"], r["over"]) for r in blocking] or ["<p>Nothing is blocking a package.</p>"]
    if rest:
        p.append(f'<details id="rest"><summary>Open but blocking no package yet ({len(rest)})</summary>')
        p += [card_html(r["d"], r["days"], r["over"]) for r in rest]
        p.append("</details>")
    p.append(f'<h2 id="answered">Answered <span class="count">{len(answered)}</span></h2>')
    p += [card_html(d) for d in answered] or ["<p>None yet.</p>"]
    p += ['<h2 id="queue">Booking queue</h2>',
          "<p>Agent runs on the colleague's PC only, booked against the colleague's D07 budget. "
          "Heavy checks still take an <code>ff-slot.sh</code> slot.</p>",
          f'<p class="queue-sum">{e(queue_totals(queue))}</p>',
          '<div class="wrap"><table><thead><tr>' + "".join(f"<th>{k}</th>" for k in RUN_FIELDS) + "</tr></thead><tbody>"]
    for r in queue.get("runs", []):
        cells = [e(r.get(k)) for k in RUN_FIELDS]
        if r.get("example"):
            cells[0] += " (example)"
        p.append(f'<tr class="{"example" if r.get("example") else ""}">' + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
    if not queue.get("runs"):
        p.append(f'<tr><td colspan="{len(RUN_FIELDS)}">No runs booked.</td></tr>')
    p += ["</tbody></table></div>",
          "<footer>Generated by build.py. Sources are path:line in this repository.</footer>",
          "</main></body></html>"]
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
