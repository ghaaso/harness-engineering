"""Transcript forensics for the PR-LOCAL evidence lane (three-project deck).

Scans Claude Code transcripts under C:/Users/User/.claude/projects/**/*.jsonl and writes
counts, timestamps and token figures only. No message content is written to any output.

Outputs (in --out, default: this script's folder):
  sessions.csv          one row per transcript file (main sessions and subagents, kind column)
  limit_events.csv      user-turn usage-limit marker records (rule below)
  api_limit_errors.csv  synthetic assistant API-error records with error == "rate_limit"
  summary.json          totals, distributions, matching rules and exclusions

File kinds
  main      <projects>/<slug>/<session-uuid>.jsonl
  subagent  <projects>/<slug>/<session-uuid>/subagents/**/agent-*.jsonl
  journal   <projects>/<slug>/<session-uuid>/subagents/workflows/*/journal.jsonl
            (workflow-engine journals, not model transcripts; counted, not analysed)

Definitions
  API call            distinct message.id among assistant records that carry message.usage and
                      are not synthetic (isApiErrorMessage true or model "<synthetic>" excluded).
                      An API response split over several records is one call (last record wins).
  context tokens      usage.input_tokens + usage.cache_creation_input_tokens
                      + usage.cache_read_input_tokens for one call.
  peak context        maximum context tokens over the file's calls.
  compaction boundary record with type == "system" and subtype == "compact_boundary".
                      Also counted: subtype "microcompact_boundary" and user records with
                      isCompactSummary true. Mentions of these strings inside message text, tool
                      inputs or tool results are NOT boundaries; they are counted separately.
  usage-limit marker  record type == "user"; candidate texts are message.content when it is a
                      string, or each block of type "text" when it is a list. tool_result blocks,
                      toolUseResult fields and assistant text are never candidates. A record
                      matches when a candidate text, after stripping leading whitespace, starts
                      with the exact case-sensitive string "[Usage limit reached". One match per
                      record. Records where the string appears anywhere else are counted as
                      quotations and excluded.
  API limit error     assistant record with isApiErrorMessage true and error == "rate_limit".
                      rateLimitType, status and resetsAt come from the record's quotaLimits field
                      (metadata), never from message text.
  limit episode       one per distinct quotaLimits.resetsAt among API limit errors, plus each
                      usage-limit marker event outside every API-error window
                      (window = first error - 15 min to resetsAt). summary.json limit_episodes.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import pathlib
import statistics
from collections import Counter, defaultdict

MARKER = "[Usage limit reached"
MARKER_CORE = "Usage limit reached"


def parse_ts(s):
    if not isinstance(s, str):
        return None
    try:
        return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def iso(t):
    return t.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z") if t else ""


def candidate_texts(content):
    """User-turn texts eligible for the marker rule (never tool results)."""
    if isinstance(content, str):
        return [content]
    out = []
    if isinstance(content, list):
        for b in content:
            if isinstance(b, dict) and b.get("type") == "text" and isinstance(b.get("text"), str):
                out.append(b["text"])
    return out


def classify(path: pathlib.Path, root: pathlib.Path):
    rel = path.relative_to(root)
    slug = rel.parts[0]
    if len(rel.parts) == 2:
        return "main", slug, path.stem, ""
    session = rel.parts[1]
    if path.name == "journal.jsonl":
        return "journal", slug, session, ""
    agent = path.stem[len("agent-"):] if path.stem.startswith("agent-") else path.stem
    return "subagent", slug, session, agent


def analyse(path, kind, slug, session, agent):
    first_ts = last_ts = None
    records = bad = 0
    calls = {}  # message.id -> (order, usage)
    order = 0
    boundaries = micro = compact_summaries = 0
    string_mentions = 0
    marker_events = []
    marker_quotes = 0
    api_errs = []
    usage_notes = Counter()
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if not line.strip():
                continue
            records += 1
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                bad += 1
                continue
            if not isinstance(r, dict):
                continue
            t = parse_ts(r.get("timestamp"))
            if t:
                first_ts = t if first_ts is None or t < first_ts else first_ts
                last_ts = t if last_ts is None or t > last_ts else last_ts
            rtype = r.get("type")
            if rtype == "system":
                st = r.get("subtype")
                if st == "compact_boundary":
                    boundaries += 1
                elif st == "microcompact_boundary":
                    micro += 1
            elif "compact_boundary" in line:
                string_mentions += 1
            if rtype == "user":
                if r.get("isCompactSummary"):
                    compact_summaries += 1
                if isinstance(r.get("usageLimitNote"), str):
                    usage_notes[(r["usageLimitNote"], iso(t), r.get("sessionId") or session, kind)] += 1
                msg = r.get("message") or {}
                matched = any(x.lstrip().startswith(MARKER) for x in candidate_texts(msg.get("content")))
                if matched:
                    marker_events.append({
                        "timestamp": iso(t), "project_slug": slug, "session_id": r.get("sessionId") or session,
                        "file_kind": kind, "agent_id": agent, "is_meta": bool(r.get("isMeta")),
                        "usage_limit_note": r.get("usageLimitNote") if isinstance(r.get("usageLimitNote"), str) else "",
                    })
                elif MARKER_CORE in line:
                    marker_quotes += 1
            elif MARKER_CORE in line:
                marker_quotes += 1
            if rtype == "assistant":
                msg = r.get("message") or {}
                synthetic = bool(r.get("isApiErrorMessage")) or msg.get("model") == "<synthetic>"
                if r.get("isApiErrorMessage") and r.get("error") == "rate_limit":
                    q = r.get("quotaLimits") if isinstance(r.get("quotaLimits"), dict) else {}
                    ra = q.get("resetsAt")
                    api_errs.append({
                        "timestamp": iso(t), "project_slug": slug, "session_id": r.get("sessionId") or session,
                        "file_kind": kind, "agent_id": agent, "api_error": r.get("apiError") or "",
                        "http_status": r.get("apiErrorStatus") or "", "rate_limit_type": q.get("rateLimitType") or "",
                        "quota_status": q.get("status") or "",
                        "resets_at_utc": iso(dt.datetime.fromtimestamp(ra, dt.timezone.utc)) if isinstance(ra, (int, float)) else "",
                        "overage_status": q.get("overageStatus") or "",
                        "overage_disabled_reason": q.get("overageDisabledReason") or "",
                    })
                u = msg.get("usage")
                if synthetic or not isinstance(u, dict):
                    continue
                mid = msg.get("id") or r.get("requestId") or r.get("uuid")
                if mid not in calls:
                    calls[mid] = [order, u, t]
                    order += 1
                else:
                    calls[mid][1] = u
                    calls[mid][2] = t or calls[mid][2]
    series = sorted(calls.values(), key=lambda c: c[0])

    def ctx(u):
        return int(u.get("input_tokens") or 0) + int(u.get("cache_creation_input_tokens") or 0) + int(u.get("cache_read_input_tokens") or 0)

    ctxs = [ctx(c[1]) for c in series]
    outs = [int(c[1].get("output_tokens") or 0) for c in series]
    row = {
        "file_kind": kind, "project_slug": slug, "session_id": session, "agent_id": agent,
        "first_timestamp_utc": iso(first_ts), "last_timestamp_utc": iso(last_ts),
        "span_hours": round((last_ts - first_ts).total_seconds() / 3600, 3) if first_ts and last_ts else "",
        "jsonl_records": records, "unparsable_records": bad, "assistant_api_calls": len(series),
        "first_call_context_tokens": ctxs[0] if ctxs else "", "peak_context_tokens": max(ctxs) if ctxs else "",
        "peak_call_index_1based": (ctxs.index(max(ctxs)) + 1) if ctxs else "",
        "peak_timestamp_utc": iso(series[ctxs.index(max(ctxs))][2]) if ctxs else "",
        "mean_growth_tokens_per_call_to_peak": "", "hours_first_call_to_peak": "",
        "context_drops_over_10pct": 0,
        "compaction_boundaries": boundaries, "microcompact_boundaries": micro,
        "compact_summary_records": compact_summaries,
        "records_mentioning_compact_boundary_string": string_mentions,
        "sum_output_tokens": sum(outs),
        "sum_input_tokens": sum(int(c[1].get("input_tokens") or 0) for c in series),
        "sum_cache_creation_tokens": sum(int(c[1].get("cache_creation_input_tokens") or 0) for c in series),
        "sum_cache_read_tokens": sum(int(c[1].get("cache_read_input_tokens") or 0) for c in series),
        "usage_limit_marker_events": len(marker_events), "api_rate_limit_errors": len(api_errs),
    }
    if len(ctxs) >= 2:
        pk = ctxs.index(max(ctxs))
        if pk > 0:
            row["mean_growth_tokens_per_call_to_peak"] = round((ctxs[pk] - ctxs[0]) / pk, 1)
            t0, tp = series[0][2], series[pk][2]
            if t0 and tp:
                row["hours_first_call_to_peak"] = round((tp - t0).total_seconds() / 3600, 3)
        row["context_drops_over_10pct"] = sum(1 for a, b in zip(ctxs, ctxs[1:]) if a > 0 and b < 0.9 * a)
    return row, marker_events, api_errs, marker_quotes, usage_notes


def dist(vals):
    vals = sorted(v for v in vals if isinstance(v, (int, float)))
    if not vals:
        return {}
    return {"n": len(vals), "min": vals[0], "median": statistics.median(vals), "max": vals[-1],
            "mean": round(statistics.fmean(vals), 1)}


def main():
    here = pathlib.Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=r"C:/Users/User/.claude/projects")
    ap.add_argument("--out", default=str(here))
    a = ap.parse_args()
    root, out = pathlib.Path(a.root), pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rows, markers, errs = [], [], []
    quotes = Counter()
    notes = Counter()
    file_kinds = Counter()
    journal_bytes = 0
    for p in sorted(root.rglob("*.jsonl")):
        kind, slug, session, agent = classify(p, root)
        file_kinds[kind] += 1
        if kind == "journal":
            journal_bytes += p.stat().st_size
            continue
        row, m, e, q, n = analyse(p, kind, slug, session, agent)
        row["file_bytes"] = p.stat().st_size
        rows.append(row)
        markers += m
        errs += e
        quotes[kind] += q
        notes.update(n)

    def write_csv(name, data, fields):
        with open(out / name, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=fields)
            w.writeheader()
            for d in data:
                w.writerow(d)

    sfields = ["file_kind", "project_slug", "session_id", "agent_id", "first_timestamp_utc", "last_timestamp_utc",
               "span_hours", "jsonl_records", "unparsable_records", "file_bytes", "assistant_api_calls",
               "first_call_context_tokens", "peak_context_tokens", "peak_call_index_1based", "peak_timestamp_utc",
               "mean_growth_tokens_per_call_to_peak", "hours_first_call_to_peak", "context_drops_over_10pct",
               "compaction_boundaries", "microcompact_boundaries", "compact_summary_records",
               "records_mentioning_compact_boundary_string", "sum_input_tokens", "sum_cache_creation_tokens",
               "sum_cache_read_tokens", "sum_output_tokens", "usage_limit_marker_events", "api_rate_limit_errors"]
    rows.sort(key=lambda r: (r["file_kind"], r["first_timestamp_utc"]))
    write_csv("sessions.csv", rows, sfields)
    markers.sort(key=lambda r: r["timestamp"])
    write_csv("limit_events.csv", markers, ["timestamp", "project_slug", "session_id", "file_kind", "agent_id",
                                            "is_meta", "usage_limit_note"])
    errs.sort(key=lambda r: r["timestamp"])
    write_csv("api_limit_errors.csv", errs, ["timestamp", "project_slug", "session_id", "file_kind", "agent_id",
                                             "api_error", "http_status", "rate_limit_type", "quota_status",
                                             "resets_at_utc", "overage_status", "overage_disabled_reason"])

    def by_kind(kind):
        rs = [r for r in rows if r["file_kind"] == kind]
        firsts = [r["first_timestamp_utc"] for r in rs if r["first_timestamp_utc"]]
        lasts = [r["last_timestamp_utc"] for r in rs if r["last_timestamp_utc"]]
        peaks = [r["peak_context_tokens"] for r in rs if isinstance(r["peak_context_tokens"], int)]
        return {
            "files": len(rs), "distinct_parent_sessions": len({r["session_id"] for r in rs}),
            "earliest_record_utc": min(firsts) if firsts else None, "latest_record_utc": max(lasts) if lasts else None,
            "assistant_api_calls_total": sum(r["assistant_api_calls"] for r in rs),
            "peak_context_tokens": dist(peaks),
            "files_peak_over_200k": sum(1 for v in peaks if v > 200_000),
            "files_peak_over_500k": sum(1 for v in peaks if v > 500_000),
            "files_peak_over_800k": sum(1 for v in peaks if v > 800_000),
            "first_call_context_tokens": dist([r["first_call_context_tokens"] for r in rs]),
            "mean_growth_tokens_per_call_to_peak": dist([r["mean_growth_tokens_per_call_to_peak"] for r in rs]),
            "compaction_boundaries_total": sum(r["compaction_boundaries"] for r in rs),
            "microcompact_boundaries_total": sum(r["microcompact_boundaries"] for r in rs),
            "compact_summary_records_total": sum(r["compact_summary_records"] for r in rs),
            "files_with_context_drop_over_10pct": sum(1 for r in rs if r["context_drops_over_10pct"]),
            "records_mentioning_compact_boundary_string": sum(r["records_mentioning_compact_boundary_string"] for r in rs),
            "sum_output_tokens": sum(r["sum_output_tokens"] for r in rs),
            "sum_cache_read_tokens": sum(r["sum_cache_read_tokens"] for r in rs),
            "sum_cache_creation_tokens": sum(r["sum_cache_creation_tokens"] for r in rs),
            "sum_input_tokens": sum(r["sum_input_tokens"] for r in rs),
            "usage_limit_marker_events": sum(r["usage_limit_marker_events"] for r in rs),
            "api_rate_limit_errors": sum(r["api_rate_limit_errors"] for r in rs),
        }

    err_by_day = defaultdict(Counter)
    for e in errs:
        err_by_day[e["timestamp"][:10]][e["file_kind"]] += 1
    windows = defaultdict(lambda: {"errors": 0, "first_error_utc": None, "sessions": set(), "kinds": Counter()})
    for e in errs:
        w = windows[e["resets_at_utc"] or "unknown"]
        w["errors"] += 1
        w["first_error_utc"] = e["timestamp"] if w["first_error_utc"] is None else min(w["first_error_utc"], e["timestamp"])
        w["sessions"].add(e["session_id"])
        w["kinds"][e["file_kind"]] += 1
    main_rows = sorted([r for r in rows if r["file_kind"] == "main"], key=lambda r: -(r["peak_context_tokens"] or 0))

    # Limit episodes: API-error reset windows, plus marker events that fall in no API-error window.
    # A marker belongs to a window when first_error_utc - 15 min <= marker time <= resets_at_utc.
    win_list = sorted(((k, v) for k, v in windows.items() if k != "unknown"), key=lambda kv: kv[0])
    gaps = []
    prev_reset = None
    for k, v in win_list:
        fe = parse_ts(v["first_error_utc"])
        rs = parse_ts(k)
        gaps.append({"resets_at_utc": k, "first_error_utc": v["first_error_utc"],
                     "minutes_first_error_to_reset": round((rs - fe).total_seconds() / 60, 1) if fe and rs else None,
                     "minutes_previous_reset_to_first_error": round((fe - prev_reset).total_seconds() / 60, 1)
                     if fe and prev_reset else None})
        prev_reset = rs
    marker_only = []
    for m in markers:
        mt = parse_ts(m["timestamp"])
        inside = any(parse_ts(v["first_error_utc"]) - dt.timedelta(minutes=15) <= mt <= parse_ts(k) for k, v in win_list)
        if not inside:
            marker_only.append({"timestamp": m["timestamp"], "session_id": m["session_id"], "file_kind": m["file_kind"]})
    episode_dates = Counter([v["first_error_utc"][:10] for k, v in win_list] + [m["timestamp"][:10] for m in marker_only])
    tot_calls = sum(r["assistant_api_calls"] for r in rows) or 1
    tot_out = sum(r["sum_output_tokens"] for r in rows) or 1
    tot_cr = sum(r["sum_cache_read_tokens"] for r in rows) or 1
    sub = [r for r in rows if r["file_kind"] == "subagent"]
    limit_episodes = {
        "rule": "one episode per distinct quotaLimits.resetsAt among API rate-limit errors, plus each usage-limit marker event "
                "that falls in no API-error window (window = first_error_utc - 15 min to resets_at_utc)",
        "api_error_windows": len(win_list),
        "marker_only_episodes": marker_only,
        "total_episodes": len(win_list) + len(marker_only),
        "episodes_by_first_date_utc": dict(sorted(episode_dates.items())),
        "window_timing": gaps,
    }
    subagent_share = {
        "assistant_api_calls_pct": round(100 * sum(r["assistant_api_calls"] for r in sub) / tot_calls, 1),
        "output_tokens_pct": round(100 * sum(r["sum_output_tokens"] for r in sub) / tot_out, 1),
        "cache_read_tokens_pct": round(100 * sum(r["sum_cache_read_tokens"] for r in sub) / tot_cr, 1),
        "api_rate_limit_error_records_pct": round(100 * sum(1 for e in errs if e["file_kind"] == "subagent") / (len(errs) or 1), 1),
    }
    summary = {
        "generated_utc": iso(dt.datetime.now(dt.timezone.utc)),
        "root": str(root),
        "privacy": "Counts, timestamps, ids and token figures only; no message content is written.",
        "jsonl_files_by_kind": dict(file_kinds),
        "journal_files_skipped_bytes": journal_bytes,
        "project_slugs": sorted({r["project_slug"] for r in rows}),
        "main": by_kind("main"),
        "subagent": by_kind("subagent"),
        "main_sessions_by_peak": [{k: r[k] for k in ("session_id", "first_timestamp_utc", "last_timestamp_utc",
                                                      "assistant_api_calls", "first_call_context_tokens",
                                                      "peak_context_tokens", "mean_growth_tokens_per_call_to_peak",
                                                      "hours_first_call_to_peak", "compaction_boundaries",
                                                      "api_rate_limit_errors", "usage_limit_marker_events")}
                                  for r in main_rows],
        "usage_limit_marker": {
            "rule": "type=='user'; candidate text = message.content string or list blocks with type=='text' (tool_result blocks excluded); match if text.lstrip().startswith('[Usage limit reached') (case-sensitive); one per record",
            "events": len(markers),
            "events_by_kind": dict(Counter(m["file_kind"] for m in markers)),
            "usage_limit_note_values_on_matches": dict(Counter(m["usage_limit_note"] for m in markers)),
            "excluded_quotation_records_by_kind": dict(quotes),
            "usageLimitNote_field_values_all_user_records": dict(Counter(k[0] for k in notes.elements())),
            "usageLimitNote_records": [{"note": k[0], "timestamp_utc": k[1], "session_id": k[2], "file_kind": k[3]}
                                       for k in sorted(notes, key=lambda k: k[1])],
        },
        "all_transcripts_totals": {
            "files_analysed": len(rows),
            "assistant_api_calls": sum(r["assistant_api_calls"] for r in rows),
            "sum_input_tokens": sum(r["sum_input_tokens"] for r in rows),
            "sum_cache_creation_tokens": sum(r["sum_cache_creation_tokens"] for r in rows),
            "sum_cache_read_tokens": sum(r["sum_cache_read_tokens"] for r in rows),
            "sum_output_tokens": sum(r["sum_output_tokens"] for r in rows),
            "sum_all_reported_tokens": sum(r["sum_input_tokens"] + r["sum_cache_creation_tokens"] + r["sum_cache_read_tokens"]
                                           + r["sum_output_tokens"] for r in rows),
            "note": "Provider-reported usage summed over deduplicated calls. This is processing volume; how each token type counts toward plan limits is not established by these files.",
        },
        "sessions_with_api_limit_errors": dict(Counter(e["session_id"] for e in errs)),
        "api_rate_limit_errors": {
            "rule": "type=='assistant' and isApiErrorMessage==true and error=='rate_limit'; fields from quotaLimits metadata",
            "records": len(errs),
            "by_kind": dict(Counter(e["file_kind"] for e in errs)),
            "by_api_error": dict(Counter(e["api_error"] or "(none)" for e in errs)),
            "by_http_status": dict(Counter(str(e["http_status"]) for e in errs)),
            "by_rate_limit_type": dict(Counter(e["rate_limit_type"] or "(none)" for e in errs)),
            "by_overage_disabled_reason": dict(Counter(e["overage_disabled_reason"] or "(none)" for e in errs)),
            "by_day_utc": {d: dict(c) for d, c in sorted(err_by_day.items())},
            "distinct_sessions": len({e["session_id"] for e in errs}),
            "distinct_reset_windows": len(windows),
            "reset_windows": [{"resets_at_utc": k, "errors": v["errors"], "first_error_utc": v["first_error_utc"],
                               "distinct_sessions": len(v["sessions"]), "by_kind": dict(v["kinds"])}
                              for k, v in sorted(windows.items())],
            "first_error_utc": errs[0]["timestamp"] if errs else None,
            "last_error_utc": errs[-1]["timestamp"] if errs else None,
        },
        "limit_episodes": limit_episodes,
        "subagent_share_of_all_transcripts": subagent_share,
        "caveats": [
            "Only transcripts still present on disk are scanned; older sessions may have been removed or recorded elsewhere.",
            "Peak context is the provider-reported prompt size per call; it is not the composer's context display.",
            "Several API-error records can belong to one limit hit (retries, parallel subagents); reset windows are the closer unit.",
            "The scan includes the running workflow session, so its figures are a snapshot at generation time.",
        ],
    }
    with open(out / "summary.json", "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=1)
    print(json.dumps({k: summary[k] for k in ("jsonl_files_by_kind", "project_slugs")}, indent=1))
    print("marker:", json.dumps(summary["usage_limit_marker"], indent=1))
    print("totals:", json.dumps(summary["all_transcripts_totals"], indent=1))
    print("sessions with api limit errors:", json.dumps(summary["sessions_with_api_limit_errors"], indent=1))
    print("wrote:", ", ".join(str(out / n) for n in ("sessions.csv", "limit_events.csv", "api_limit_errors.csv", "summary.json")))


if __name__ == "__main__":
    main()
