"""Evaluation-only matching of automatic compaction to exact hook restoration.

A deferred startup callback can precede the checkpoint callback in the same
continuation. Match all callbacks before the first observed model item against
the current compaction turn's validated snapshot, rather than choosing the first.
This observes native events; it does not expose the network request or context.
"""
from __future__ import annotations

from eval_client import BUILTIN_ITEMS
from eval_pilot import hook_measurements


MODEL_ITEMS = BUILTIN_ITEMS | {"reasoning", "agentMessage", "dynamicToolCall"}


def automatic_boundaries(client, sid, store=None):
    events = list(client.events)
    callbacks = hook_measurements(client, sid) if store else []
    snapshots, snapshot_errors = [], []
    if store:
        for path in sorted((store._session(sid) / "snapshots").glob("snapshot_*.json")):
            try:
                snapshots.append(store._manifest(path, sid))
            except (OSError, ValueError, KeyError, TypeError) as error:
                snapshot_errors.append({"file": path.name, "error": type(error).__name__})
    boundaries = []
    for event in events:
        msg = event.get("message", {})
        p = msg.get("params", {})
        item = p.get("item", {})
        if (event.get("direction") != "in" or msg.get("method") != "item/completed"
                or p.get("threadId") != sid or item.get("type") != "contextCompaction"):
            continue
        seq, tid = event["sequence"], p.get("turnId")
        first = next((e for e in events if e["sequence"] > seq and e.get("direction") == "in"
            and e.get("message", {}).get("method") in {"item/started", "item/completed"}
            and e["message"].get("params", {}).get("threadId") == sid
            and e["message"].get("params", {}).get("turnId") == tid
            and e["message"].get("params", {}).get("item", {}).get("type") in MODEL_ITEMS), None)
        lifecycle = any(e.get("direction") == "in" and e["sequence"] < seq
            and e.get("message", {}).get("method") == "item/started"
            and e["message"].get("params", {}).get("threadId") == sid
            and e["message"].get("params", {}).get("turnId") == tid
            and e["message"].get("params", {}).get("item", {}).get("id") == item.get("id")
            and e["message"].get("params", {}).get("item", {}).get("type") == "contextCompaction"
            for e in events)
        record = {"item_id": item.get("id"), "turn_id": tid, "completed_sequence": seq,
            "lifecycle_valid": lifecycle, "first_model_output_sequence": first["sequence"] if first else None,
            "restoration_valid": None, "first_consequential_call": None}
        if store:
            candidates = [h for h in callbacks if h["event"] == "sessionStart"
                and h["status"] == "completed" and h["turn_id"] == tid and h["sequence"] > seq
                and first and h["sequence"] < first["sequence"]]
            matches = [(manifest, delivered) for manifest in snapshots for delivered in candidates
                if manifest.get("turn_id") == tid and manifest.get("text_sha") == delivered["text_sha"]]
            manifest, delivered = matches[0] if len(matches) == 1 else (None, None)
            complete = bool(manifest and manifest.get("blocks") and not manifest.get("omitted")
                            and not manifest.get("problem"))
            record.update(checkpoint_id=manifest.get("id") if manifest else None,
                checkpoint_omitted=manifest.get("omitted") if manifest else None,
                checkpoint_problem=manifest.get("problem") if manifest else None,
                restoration_sequence=delivered["sequence"] if delivered else None,
                restoration_bytes=delivered["canonical_adapter_envelope_bytes"] if delivered else None,
                restoration_candidate_count=len(candidates), restoration_match_count=len(matches),
                checkpoint_validation_errors=snapshot_errors,
                restoration_valid=bool(lifecycle and first and complete and delivered and not snapshot_errors
                    and delivered["canonical_adapter_envelope_bytes"] <= 4096))
        boundaries.append(record)
    identifiers = [b.get("checkpoint_id") for b in boundaries if b.get("checkpoint_id")]
    if store and len(identifiers) != len(set(identifiers)):
        for boundary in boundaries:
            boundary["restoration_valid"] = False
            boundary["freshness_problem"] = "same checkpoint associated with multiple automatic compactions"
    return boundaries
