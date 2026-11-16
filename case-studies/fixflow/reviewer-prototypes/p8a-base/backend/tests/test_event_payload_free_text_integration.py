"""The rule behind rulings C31 and C35, as a guard: ``job_event.payload`` carries ids,
amounts, flags, slugs and timestamps, never free text (migration 0027's "ids and slugs
only, never PII").

One job is driven through every action that writes a ``job_event`` and takes free text,
with the same marker in every free-text input (customer name, address, problem, note,
follow-up, material name, remarks, every reason, the reschedule window). Then:

* no ``job_event.payload`` holds the marker (``payload::text``), and each leak is reported
  by the action that wrote it;
* the event texts and the proper columns DO hold it, so the marker really went in.

Writers of ``job_event`` (every ``JobEvent(`` in ``jobs/service.py``) and how each is
covered here:

* driven with the marker: ``create_job``, ``add_note`` (note and follow-up),
  ``submit_completion`` (remarks, a material name), ``transition`` (wait, reschedule,
  abandon), ``negotiate_bill`` (note), ``log_payment`` (a reason on an open job, a
  manager's reason on the closed job), ``void_payment`` (reason);
* driven, no free-text input to mark: ``claim_job``, ``assign_job``, ``transition``
  (ready), ``log_customer_message`` (``/whatsapp/send-log``: an enum ``kind``);
* NOT driven here, no free-text input: ``record_location`` (``/locations``: kind, lat,
  lng, accuracy) and ``set_customer_pin`` (lat, lng); a plain ``close`` (it needs the
  closing clip from the media slice; ``abandon`` takes the job to ``closed`` with a
  reason instead); ``_claim_or_require``'s implicit claim (the same event as ``claim_job``).
"""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.identity.models import Technician
from app.features.identity.security import create_access_token, hash_pin

pytestmark = pytest.mark.integration

Headers = dict[str, str]
MARK = "ZQX-P8A-FREETEXT"


async def _tech_headers(session: AsyncSession, tech_id: str) -> Headers:
    await session.merge(
        Technician(
            id=tech_id, name=f"Tech {tech_id}", role="tech", pin_hash=hash_pin("1234"), active=True
        )
    )
    await session.commit()
    token = create_access_token(tech_id=tech_id, role="tech", name=f"Tech {tech_id}")
    return {"Authorization": f"Bearer {token}"}


async def _new_events(session: AsyncSession, job_id: str, after: int) -> list[Any]:
    rows = (
        await session.execute(
            text(
                "SELECT seq, kind, text, payload::text AS payload FROM job_event "
                "WHERE job_id = :job AND seq > :after ORDER BY seq"
            ),
            {"job": UUID(job_id), "after": after},
        )
    ).all()
    await session.rollback()  # hold no snapshot or lock between steps
    return list(rows)


async def test_no_job_event_payload_carries_free_text(
    app_client: AsyncClient, auth_headers: Headers, session: AsyncSession
) -> None:
    t2 = await _tech_headers(session, "t2")
    await _tech_headers(session, "t3")
    manager = auth_headers

    created = await app_client.post(
        "/api/jobs",
        json={
            "job_type": "carry-in",
            "customer_name": f"Customer {MARK}",
            "customer_phone": "0300-1234567",
            "customer_address": f"House 1, {MARK}",
            "appliance_type": "Washing Machine",
            "problem": f"Drum not spinning {MARK}",
            "assigned_tech_id": None,
        },
        headers=manager,
    )
    assert created.status_code == 201, created.text
    job_id: str = created.json()["id"]
    base = f"/api/jobs/{job_id}"

    leaks: list[tuple[str, str, str]] = []
    kinds: set[str] = set()
    last = 0

    async def check(action: str) -> None:
        nonlocal last
        for seq, kind, _text, payload in await _new_events(session, job_id, last):
            kinds.add(kind)
            last = seq
            if MARK in payload:
                leaks.append((action, kind, payload))

    async def step(action: str, path: str, body: dict[str, Any] | None, who: Headers) -> Any:
        resp = await app_client.post(path, json=body, headers=who)
        assert 200 <= resp.status_code < 300, f"{action}: {resp.status_code} {resp.text}"
        await check(action)
        return resp.json()

    await check("create")
    await step("claim", f"{base}/claim", None, t2)
    await step("note", f"{base}/notes", {"text": f"note {MARK}"}, t2)
    await step("followup", f"{base}/followups", {"text": f"followup {MARK}"}, manager)
    await step("assign t3", f"{base}/assign", {"tech_id": "t3"}, manager)
    await step("assign t2", f"{base}/assign", {"tech_id": "t2"}, manager)
    done = await step(
        "completion",
        f"{base}/completion",
        {
            "materials": [{"name": f"Belt {MARK}", "qty": 1, "unit_paisa": 500000}],
            "time_spent_mins": 30,
            "fuel_paisa": 0,
            "remarks_text": f"remarks {MARK}",
        },
        t2,
    )
    await step("wait", f"{base}/transition", {"action": "wait", "reason": f"wait {MARK}"}, t2)
    await step("ready", f"{base}/transition", {"action": "ready"}, t2)
    await step(
        "negotiate",
        f"{base}/bill/negotiate",
        {"amount_paisa": done["bill_original_paisa"] - 100, "note": f"haggle {MARK}"},
        t2,
    )
    await step(
        "reschedule",
        f"{base}/transition",
        {
            "action": "reschedule",
            "preferred_date": date(2026, 12, 1).isoformat(),
            "time_window": f"am {MARK}",
        },
        manager,
    )
    await step(
        "whatsapp send-log",
        f"/api/messaging/jobs/{job_id}/whatsapp/send-log",
        {"kind": "bill"},
        manager,
    )
    paid = await step(
        "payment, open job, with a reason",
        f"{base}/payments",
        {"amount_paisa": 1000, "method": "cash", "client_id": str(uuid4()), "reason": MARK},
        t2,
    )
    del paid  # main has no payment_receipt; this copy stops at abandon
    await step(
        "abandon", f"{base}/transition", {"action": "abandon", "reason": f"gone {MARK}"}, manager
    )
    # main has no R12: the manager late payment and the closed-job void are refused (409),
    # so this copy stops at abandon.

    # Every writer that ran wrote what it should (else the guard proves nothing) ...
    assert {"create", "claim", "note", "followup", "assign", "complete", "status", "bill"} <= kinds
    assert "payment" in kinds
    # ... and none of them put the marker in a payload.
    assert leaks == [], "free text in job_event.payload:\n" + "\n".join(map(str, leaks))

    # The marker did go in: into the event texts and the proper columns.
    texts = (
        await session.execute(
            text("SELECT count(*) FROM job_event WHERE job_id = :j AND text LIKE :m"),
            {"j": UUID(job_id), "m": f"%{MARK}%"},
        )
    ).scalar_one()
    assert texts >= 6  # note, follow-up, wait, abandon, negotiate, late payment, void
    columns = (
        await session.execute(
            text(
                "SELECT j.customer_name, j.abandon_reason, c.remarks_text, "
                "(SELECT string_agg(coalesce(p.reason, '') || '|' "
                "                   || coalesce(p.void_reason, ''), ';') "
                "   FROM job_payment p WHERE p.job_id = j.id) "
                "FROM job j JOIN job_completion c ON c.job_id = j.id WHERE j.id = :j"
            ),
            {"j": UUID(job_id)},
        )
    ).one()
    await session.rollback()
    name, abandon_reason, remarks, payment_text = columns
    assert MARK in name and MARK in abandon_reason and MARK in remarks
    assert f"late {MARK}" in payment_text and f"void {MARK}" in payment_text
    assert payment_text.count(MARK) == 2  # the open-job reason was ignored, not stored
