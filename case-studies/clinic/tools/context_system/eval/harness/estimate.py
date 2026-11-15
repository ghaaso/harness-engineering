"""A rough token forecast per arm, printed before anything is started.

It replays the driver's phases on a simple growth model. Every constant below is an assumption,
not a measurement of this scenario: the forecast is for deciding whether to start, nothing else.
"""
from __future__ import annotations

from typing import Any

from .common import CHARS_PER_TOKEN
from .sandbox import ARMS

BASE_TOKENS = 35_000        # system prompt, tools, CLAUDE.md, rules at the start of a session
TURN_OVERHEAD = 8_000       # replies, tool calls and small outputs added by one scripted turn
POST_COMPACT = 45_000       # context right after a compaction (summary, restored state, re-attached files)
RESERVE = 33_000            # Claude Code 2.1.293: threshold = window - 33,000
CALLS_PER_TURN = (6, 20)    # model requests per scripted turn, low and high
CALLS_PER_EVAL = (8, 30)    # model requests per continuation task
OUTPUT_PER_CALL = 900
LARGE_READ, FIRST_PAGE = 30_000, 17_500   # the system's read admission (bytes): first page plus outline


def turn_tokens(sizes: dict[str, int], arm: str, reads: list[str]) -> int:
    total = 0.0
    for rel in reads:
        n = sizes.get(rel, 0)
        if arm == "system" and n > LARGE_READ:
            n = FIRST_PAGE
        total += n / CHARS_PER_TOKEN
    return int(total) + TURN_OVERHEAD


def estimate(scn, state: dict[str, Any]) -> dict[str, Any]:
    sizes = {p: len(t) for p, t in scn.files().items()}
    script = scn.script()
    window, threshold = state["window"], state["window"] - RESERVE
    sim = {n: {"ctx": BASE_TOKENS, "pos": 0, "compactions": 0, "handoffs": 0, "peak": BASE_TOKENS, "new": 0,
               "reread": [0.0, 0.0], "calls": [0, 0], "fits": True, "eval_runs": 0} for n in state["arms_order"]}

    def play(name: str) -> None:
        a = sim[name]
        if name == "handoff" and a["ctx"] >= state["handoff_at"]:
            for i in (0, 1):
                a["reread"][i] += 2 * a["ctx"]
                a["calls"][i] += 4
            a["ctx"], a["handoffs"] = BASE_TOKENS + 8_000, a["handoffs"] + 1
        add = turn_tokens(sizes, name, script[a["pos"]].reads)
        mid = a["ctx"] + add / 2
        for i in (0, 1):
            a["reread"][i] += CALLS_PER_TURN[i] * mid
            a["calls"][i] += CALLS_PER_TURN[i]
        a["ctx"] += add
        a["new"] += add
        a["peak"] = max(a["peak"], a["ctx"])
        if ARMS[name]["window"] and a["ctx"] >= threshold:
            a["compactions"] += 1
            for i in (0, 1):
                a["reread"][i] += a["ctx"]
                a["calls"][i] += 1
            a["ctx"] = POST_COMPACT
        if name == "reference" and a["ctx"] >= state["ref_limit"]:
            a["fits"] = False
        a["pos"] += 1

    for name in sim:
        while sim[name]["pos"] < min(state["base_turns"], len(script)):
            play(name)
    compacting = [n for n in sim if ARMS[n]["compacts"]]
    shortfall = False
    while True:
        need = [n for n in compacting if sim[n]["compactions"] < state["min_compactions"]]
        if not need:
            break
        if any(sim[n]["pos"] >= len(script) for n in need):
            shortfall = True
            break
        for n in need:
            play(n)
    target = max(a["pos"] for a in sim.values())
    for name in sim:
        while sim[name]["pos"] < target:
            play(name)
    n_tasks = len(state["tasks"])
    for name, a in sim.items():
        for variant in state["variants"]:
            start = a["ctx"] if variant == "resume" else BASE_TOKENS + 30_000
            for _ in range(n_tasks):
                a["eval_runs"] += 1
                a["new"] += 20_000
                for i in (0, 1):
                    a["reread"][i] += CALLS_PER_EVAL[i] * (start + 10_000)
                    a["calls"][i] += CALLS_PER_EVAL[i]
    arms = {}
    for name, a in sim.items():
        arms[name] = {"scripted_turns": a["pos"], "predicted_compactions": a["compactions"],
                      "predicted_handoffs": a["handoffs"], "predicted_peak_context": int(a["peak"]),
                      "fits_reference_limit": a["fits"], "evaluation_runs": a["eval_runs"],
                      "model_requests": list(a["calls"]), "new_input_tokens": int(a["new"]),
                      "context_resent_tokens": [int(x) for x in a["reread"]],
                      "output_tokens": [c * OUTPUT_PER_CALL for c in a["calls"]]}
    return {"arms": arms, "equalised_turns": target, "script_length": len(script), "script_shortfall": shortfall,
            "window": window, "threshold": threshold,
            "assumptions": {"chars_per_token": CHARS_PER_TOKEN, "session_base_tokens": BASE_TOKENS,
                            "tokens_added_per_turn_besides_reads": TURN_OVERHEAD, "context_after_compaction": POST_COMPACT,
                            "requests_per_turn_low_high": CALLS_PER_TURN, "requests_per_eval_low_high": CALLS_PER_EVAL,
                            "output_tokens_per_request": OUTPUT_PER_CALL}}


def format_estimate(est: dict[str, Any]) -> list[str]:
    def m(n: float) -> str:
        return f"{n / 1e6:.1f}M" if n >= 1e6 else f"{n / 1e3:.0f}k"
    lines = [f"{'arm':<10}{'turns':>6}{'compactions':>12}{'handoffs':>9}{'peak ctx':>9}{'eval runs':>10}"
             f"{'requests':>11}{'new input':>10}{'context re-sent (cache reads)':>31}{'output':>13}"]
    tot = [0.0, 0.0]
    for name, a in est["arms"].items():
        lines.append(f"{name:<10}{a['scripted_turns']:>6}{a['predicted_compactions']:>12}{a['predicted_handoffs']:>9}"
                     f"{m(a['predicted_peak_context']):>9}{a['evaluation_runs']:>10}"
                     f"{str(a['model_requests'][0]) + '-' + str(a['model_requests'][1]):>11}{m(a['new_input_tokens']):>10}"
                     f"{m(a['context_resent_tokens'][0]) + ' - ' + m(a['context_resent_tokens'][1]):>31}"
                     f"{m(a['output_tokens'][0]) + '-' + m(a['output_tokens'][1]):>13}")
        for i in (0, 1):
            tot[i] += a["new_input_tokens"] + a["context_resent_tokens"][i] + a["output_tokens"][i]
    lines.append(f"all arms, every token counted once per request: {m(tot[0])} to {m(tot[1])} "
                 f"(mostly cache reads of the growing context)")
    if est["script_shortfall"]:
        lines.append("WARNING: the forecast runs out of scripted turns before the required compactions")
    lines.append("Forecast only: it assumes " + ", ".join(f"{k}={v}" for k, v in est["assumptions"].items()))
    return lines
