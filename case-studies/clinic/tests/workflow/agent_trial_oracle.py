"""Predeclared evaluator for disposable agent fixtures; never clinic acceptance."""
from __future__ import annotations
import argparse
import importlib.util
import json
from pathlib import Path


class Adapter:
    def __init__(self, failures=0):
        self.failures = failures
        self.calls = []

    def send(self, payload):
        self.calls.append(dict(payload))
        if len(self.calls) <= self.failures:
            raise RuntimeError("synthetic retryable adapter failure")
        return {"status": "sent", "sequence": len(self.calls), "payload": dict(payload)}


def evaluate(module, phase):
    results = []

    def check(name, action):
        try:
            action()
            results.append({"case": name, "passed": True})
        except Exception as exc:
            results.append({"case": name, "passed": False, "error": f"{type(exc).__name__}: {exc}"})

    def expect_error(error_type, operation):
        try:
            operation()
        except error_type:
            return
        raise AssertionError("Expected declared error, got a successful response")

    def retry():
        adapter, state, payload = Adapter(1), {}, {"item": "alpha"}
        expect_error(RuntimeError, lambda: module.submit_once(adapter, "retry", payload, state))
        actual = module.submit_once(adapter, "retry", payload, state)
        assert len(adapter.calls) == 2, "Failed attempt was incorrectly reused as completed"
        assert actual == {"status": "sent", "sequence": 2, "payload": payload}, actual

    def cached():
        adapter, state, payload = Adapter(), {}, {"item": "beta"}
        first = module.submit_once(adapter, "cached", payload, state)
        second = module.submit_once(adapter, "cached", dict(payload), state)
        assert second == first and len(adapter.calls) == 1

    def distinct_ids():
        adapter, state = Adapter(), {}
        module.submit_once(adapter, "a", {"item": "same"}, state)
        module.submit_once(adapter, "b", {"item": "same"}, state)
        assert len(adapter.calls) == 2, "Distinct IDs were merged"

    def repeated_failures():
        adapter, state, payload = Adapter(2), {}, {"item": "gamma"}
        for _ in range(2):
            expect_error(RuntimeError, lambda: module.submit_once(adapter, "many", payload, state))
        result = module.submit_once(adapter, "many", payload, state)
        assert len(adapter.calls) == 3 and result["status"] == "sent"

    for name, action in (("retry_after_failure", retry), ("cached_success_no_duplicate", cached),
                         ("distinct_ids", distinct_ids), ("repeated_adapter_failure", repeated_failures)):
        check(name, action)

    if phase >= 1:
        def conflict():
            adapter, state = Adapter(), {}
            module.submit_once(adapter, "conflict", {"item": "original"}, state)
            expect_error(module.RequestConflictError, lambda: module.submit_once(adapter, "conflict", {"item": "changed"}, state))
            assert len(adapter.calls) == 1
            result = module.submit_once(adapter, "conflict", {"item": "original"}, state)
            assert result["payload"] == {"item": "original"} and len(adapter.calls) == 1

        def copy_original_payload():
            adapter, state, payload = Adapter(), {}, {"item": "original"}
            module.submit_once(adapter, "copied", payload, state)
            payload["item"] = "changed-by-caller"
            expect_error(module.RequestConflictError, lambda: module.submit_once(adapter, "copied", payload, state))
            assert len(adapter.calls) == 1

        check("conflicting_retry_preserves_success", conflict)
        check("caller_mutation_does_not_rebind_key", copy_original_payload)

    if phase >= 2:
        def disabled_new():
            adapter, state = Adapter(), {}
            expect_error(module.SubmissionDisabledError, lambda: module.submit_once(adapter, "disabled", {"item": "x"}, state, enabled=False))
            assert not adapter.calls and not state

        def disabled_cached():
            adapter, state = Adapter(), {}
            module.submit_once(adapter, "cached", {"item": "x"}, state, enabled=True)
            expect_error(module.SubmissionDisabledError, lambda: module.submit_once(adapter, "cached", {"item": "x"}, state, enabled=False))
            expect_error(module.SubmissionDisabledError, lambda: module.submit_once(adapter, "cached", {"item": "different"}, state, enabled=False))
            assert len(adapter.calls) == 1

        def invalid_config():
            for value in ("false", 1, None, [], {}):
                adapter, state = Adapter(), {}
                expect_error((ValueError, TypeError), lambda: module.submit_once(adapter, "invalid", {"item": "x"}, state, enabled=value))
                assert not adapter.calls and not state

        check("disabled_before_new_effect", disabled_new)
        check("disabled_before_cached_result_and_conflict", disabled_cached)
        check("invalid_configuration_rejected_at_consumer", invalid_config)

    return {"ok": all(case["passed"] for case in results), "phase": phase,
            "cases": results, "passed": sum(case["passed"] for case in results),
            "exposure": len(results), "reviewer": "predeclared deterministic evaluator, outside worker copies",
            "limits": "Synthetic sequential adapter behavior, no concurrency/durability/clinic or human acceptance"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("--phase", type=int, choices=(0, 1, 2), required=True)
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location("trial_submission", args.workspace / "submission.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = evaluate(module, args.phase)
    print(json.dumps(result, indent=2))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
