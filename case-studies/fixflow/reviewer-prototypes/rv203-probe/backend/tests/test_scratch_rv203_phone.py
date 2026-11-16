"""Scratch (reviewer rv203, phone-side lens). Each test asserts the CURRENT behaviour of
drain_audit.py in a scenario the reviewer reports. A green test = the scenario reproduces.
Pure functions only (no database). Never part of the PR."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from scripts import drain_audit as da

T0 = datetime(2026, 11, 20, 6, 0, tzinfo=UTC)
J = "11111111-1111-4111-8111-111111111111"
OPEN = T0 - timedelta(days=1)


def _row(queue, key, *, manifest="m1", receipt=T0, techs=("t1",), **kw):
    fields = {
        "owner": "t1",
        "kind": queue,
        "state": "pending",
        "reason_class": None,
        "device_time": T0 - timedelta(hours=3),
        "taken_at": receipt - timedelta(minutes=10),
        "uploader": techs[0],
        "phone_techs": frozenset(techs),
    }
    fields.update(kw)
    return da.Row(queue=queue, key=key, manifest_id=manifest, receipt=receipt, **fields)


def _manifest(mid, rows, receipt, owners, uploader):
    return da.ParsedManifest(
        f"ev-{mid}", mid, uploader, receipt, receipt - timedelta(minutes=10), 7,
        list(owners), rows, [], [], {},
    )


def _job(**kw):
    f = dict(id=J, client_id=None, token=501, status="open", closed_at=None, abandoned=False,
             assigned_tech_id="a1", job_type="carry-in", has_pin=False,
             bill_negotiated_paisa=None, frozen_at=None)
    f.update(kw)
    return da.JobFacts(**f)


def _server(job, events):
    s = da.Server()
    s.jobs_by_id[job.id] = job
    s.jobs_by_token[job.token] = job
    for e in events:
        s.events_by_job[e.job_id].append(e)
    return s


def _report(manifests, results, extras=()):
    return da.AuditReport("default", OPEN, T0 + timedelta(days=1), None,
                          list(manifests), list(results), list(extras), [], [], [])


def _ev(eid, kind, actor, at):
    return da.EventFacts(eid, J, kind, None, None, actor, None, at)


def test_shared_phone_another_technicians_note_accounts_for_an_unsent_note():
    # Phone shared by a1 and b1 (b1 uploaded). a1's queued note on J never sends: a1 never
    # signs in on this phone again (the outbox flushes only under its owner). b1 adds a
    # note on the same job after the receipt.
    note = _row("outbox", "note:x", owner="a1", techs=("b1", "a1"), kind="note", job_ref=J)
    ev = _ev("e1", "note", "b1", T0 + timedelta(hours=2))
    results, _ = da.match_rows([note], _server(_job(), [ev]), t_open=OPEN, test_window=None)
    assert results[0].outcome == da.LANDED_BY_STATE
    m = _manifest("m1", [note], T0, ["a1"], "b1")
    assert _report([m], results).exit_code == da.EXIT_OK


def test_shared_phone_another_technicians_completion_accounts_for_an_unsent_completion():
    comp = _row("outbox", f"completion:{J}", owner="a1", techs=("b1", "a1"),
                kind="completion", job_ref=J)
    ev = _ev("e2", "complete", "b1", T0 + timedelta(hours=2))
    results, _ = da.match_rows([comp], _server(_job(), [ev]), t_open=OPEN, test_window=None)
    assert results[0].outcome == da.LANDED_BY_STATE


def test_a_second_phone_of_the_same_technician_marks_an_unsent_version_superseded():
    # P1 (owners t1, u1; uploaded by u1) holds completion:J version A, never sent: t1 never
    # signs in on P1 again. P2 (t1 only) holds a newer version B, which lands. A was never
    # replaced ON P1, yet it is called superseded and the run exits 0.
    a = _row("outbox", f"completion:{J}", manifest="m1", receipt=T0, techs=("u1", "t1"),
             kind="completion", job_ref=J, device_time=T0 - timedelta(hours=5))
    b = _row("outbox", f"completion:{J}", manifest="m2", receipt=T0 + timedelta(hours=1),
             techs=("t1",), kind="completion", job_ref=J, device_time=T0 - timedelta(hours=4))
    ev = _ev("e3", "complete", "t1", T0 + timedelta(hours=1, minutes=5))
    ms = [_manifest("m1", [a], T0, ["t1", "u1"], "u1"),
          _manifest("m2", [b], T0 + timedelta(hours=1), ["t1"], "t1")]
    rows = da.merge_rows(ms)
    assert len(rows) == 2
    results, _ = da.match_rows(rows, _server(_job(assigned_tech_id="t1"), [ev]),
                               t_open=OPEN, test_window=None)
    got = {r.row.manifest_id: r.outcome for r in results}
    assert got == {"m1": da.SUPERSEDED, "m2": da.LANDED_BY_STATE}
    assert _report(ms, results).exit_code == da.EXIT_OK


def test_a_fix_that_predates_the_snapshot_but_was_queued_after_it_fails_the_audit():
    # pingTracker stamps captured_at from fix.timestamp; drainGate stamps taken_at AFTER
    # reading every key. A fix 20 s older than taken_at (or a crossing handled while the
    # raw read ran) is in no manifest, lands, and is judged "the manifest missed a row".
    taken = T0 - timedelta(minutes=10)
    s = da.Server()
    s.extras_raw = {
        "ping": [{"cid": "p-late", "tech_id": "t1", "server_time": T0 + timedelta(minutes=5),
                  "device_time": taken - timedelta(seconds=20)}],
        "presence": [{"cid": "c-during", "tech_id": "t1",
                      "server_time": T0 + timedelta(minutes=5),
                      "device_time": taken - timedelta(seconds=1)}],
    }
    extras = da.find_extras([], [], s, scope_techs={"t1"}, snapshot_floor={"t1": taken},
                            test_window=None)
    assert {e.key: e.category for e in extras} == {
        "p-late": da.EXTRA_UNEXPECTED, "c-during": da.EXTRA_UNEXPECTED}
    m = _manifest("m1", [], T0, ["t1"], "t1")
    assert _report([m], [], extras).exit_code == da.EXIT_MISMATCH


def test_a_moved_pin_that_never_landed_is_prior_state_whenever_the_job_has_any_pin():
    pin = _row("outbox", f"customer_pin:{J}", owner="a1", techs=("a1",),
               kind="customer_pin", job_ref=J)
    results, _ = da.match_rows([pin], _server(_job(has_pin=True), []), t_open=OPEN,
                               test_window=None)
    assert results[0].outcome == da.PRIOR_STATE
    m = _manifest("m1", [pin], T0, ["a1"], "a1")
    assert _report([m], results).exit_code == da.EXIT_OK


def test_a_parked_payment_exits_zero_all_accounted_for():
    cid = "c0ffee00-0000-4000-8000-000000000001"
    pay = _row("outbox", cid, owner="a1", techs=("a1",), kind="payment", job_ref=J,
               client_id=cid, amount_minor=250000, state="parked", reason_class="app_detail")
    results, _ = da.match_rows([pay], _server(_job(), []), t_open=OPEN, test_window=None)
    assert results[0].outcome == da.STILL_PARKED
    rep = _report([_manifest("m1", [pay], T0, ["a1"], "a1")], results)
    assert (rep.exit_code, rep.verdict) == (da.EXIT_OK, "ALL ACCOUNTED FOR")


def test_a_payment_parked_during_the_drain_stays_missing_after_the_manager_reenters_it():
    cid = "c0ffee00-0000-4000-8000-000000000002"
    pay = _row("outbox", cid, owner="a1", techs=("a1",), kind="payment", job_ref=J,
               client_id=cid, amount_minor=250000)
    s = _server(_job(), [])
    other = "c0ffee00-0000-4000-8000-0000000000ff"
    s.payments_by_client[other] = {
        "id": "x", "cid": other, "job_id": J, "amount_paisa": 250000, "method": "cash",
        "recorded_by": "m1", "recorded_at": T0 + timedelta(hours=3), "voided": False}
    results, _ = da.match_rows([pay], s, t_open=OPEN, test_window=None)
    assert results[0].outcome == da.MISSING


def test_one_discard_trace_accounts_for_every_phones_row_with_that_stable_id():
    # x1 discards HIS ready:J on phone P2. Phone P1's ready:J (owner t1, never sent) is
    # accounted "discarded" too: the trace is matched on (queue, record_id) only.
    r1 = _row("outbox", f"ready:{J}", manifest="m1", owner="t1", techs=("t1",), kind="ready",
              job_ref=J, action="ready", client_id="c1000000-0000-4000-8000-000000000001")
    r2 = _row("outbox", f"ready:{J}", manifest="m2", receipt=T0 + timedelta(hours=1),
              owner="x1", techs=("x1",), kind="ready", job_ref=J, action="ready",
              client_id="c1000000-0000-4000-8000-000000000002")
    s = _server(_job(status="waiting"), [])
    s.discards[("outbox", f"ready:{J}")] = {
        "queue": "outbox", "record_id": f"ready:{J}", "kind": "ready",
        "reason_class": "app_detail", "owner_tech": "x1", "discarded_by": "x1",
        "uploaded_by": "x1", "server_time": T0 + timedelta(hours=2)}
    results, _ = da.match_rows([r1, r2], s, t_open=OPEN, test_window=None)
    assert {r.row.owner: r.outcome for r in results} == {"t1": da.DISCARDED, "x1": da.DISCARDED}
    assert all(not r.notes for r in results)  # no "shared phone" flag on t1's row


def test_pending_media_drained_by_a_third_technician_reads_missing():
    # P: owner a1, uploaded by a1. c1 signs in later; pending media has no owner on the
    # phone and drains under whoever is signed in, so it lands created_by=c1.
    med = _row("media", "intake:abc", owner="a1", techs=("a1",), kind="audio",
               job_ref=J, phase="intake", media_type="audio", job_token="501")
    s = _server(_job(), [])
    s.media["501"] = [{"id": "m-1", "token": "501", "phase": "intake", "type": "audio",
                       "status": "uploaded", "created_by": "c1",
                       "created_at": T0 + timedelta(hours=1)}]
    results, _ = da.match_rows([med], s, t_open=OPEN, test_window=None)
    assert results[0].outcome == da.MISSING
