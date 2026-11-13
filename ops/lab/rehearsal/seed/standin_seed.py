"""Stand-in "production" data for the restore rehearsal. NO real data, NO real people.

Run INSIDE the backend image, after ``alembic upgrade head``::

    cd /code && python /seed/standin_seed.py

Needs ``FIXFLOW_DATABASE_URL`` (postgresql+asyncpg) and ``FIXFLOW_ENVIRONMENT=dev``.
Deterministic: fixed random seed, fixed timestamps (2026-06..08 UTC), ids from
uuid5, PIN hashes with a fixed salt (hash_pin's own format, so verify_pin
accepts them). Tokens / event seq numbers come from the real sequences.

Stand-in values, not secrets (these PINs open only this fake database):
    t1 = 482913   t2 = 735024   t3 = 619478   m1 = 340871   t6 = 957206
    t4, t5 stay on the public seed PIN from the migrations.

Deliberate: the ``whatsapp`` dispatch cursor ends BELOW max(job_event.seq).
It is set after about two thirds of the events, as if migration 0046 ran
mid-history and the dispatcher stayed off.
"""

from __future__ import annotations

import asyncio
import hashlib
import random
import sys
import uuid
from datetime import UTC, date, datetime, timedelta

import app.registry  # noqa: F401  (registers every model)
from app.core.db import SessionLocal, engine
from app.features.attendance import chain
from app.features.identity.security import _HASH_SCHEME, _PBKDF2_ITERATIONS, verify_pin
from sqlalchemy import text

SHOP = "default"
NS = uuid.UUID("5ead5eed-0000-4000-8000-00000000f1f0")
RNG = random.Random(20260713)
BASE = datetime(2026, 6, 1, 6, 0, tzinfo=UTC)

PINS = {"t1": "482913", "t2": "735024", "t3": "619478", "m1": "340871", "t6": "957206"}


def uid(*parts: object) -> uuid.UUID:
    return uuid.uuid5(NS, "/".join(str(p) for p in parts))


def pin_hash(tech_id: str, pin: str) -> str:
    """hash_pin's format ('scheme$iters$salt$hash'), with a fixed salt."""
    salt = hashlib.sha256(f"standin-salt-{tech_id}".encode()).digest()[:16]
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, _PBKDF2_ITERATIONS)
    return f"{_HASH_SCHEME}${_PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


async def main() -> int:
    async with SessionLocal() as s:
        ex = s.execute

        async def one(sql: str, **p):
            return (await ex(text(sql), p)).scalar_one()

        # ── people ──────────────────────────────────────────────────────────
        await ex(
            text(
                "INSERT INTO technician (id, name, specialty, phone, role, pin_hash, shop_id) "
                "VALUES ('t6','Lab Tech Alpha','Refrigeration','+920000000106','tech',:h,:shop)"
            ),
            {"h": pin_hash("t6", PINS["t6"]), "shop": SHOP},
        )
        for tid in ("t1", "t2", "t3", "m1"):
            await ex(
                text("UPDATE technician SET pin_hash=:h, failed_attempts=0 WHERE id=:i"),
                {"h": pin_hash(tid, PINS[tid]), "i": tid},
            )
        techs = ["t1", "t2", "t3", "t4", "t5", "t6"]
        workers = ["t1", "t2", "t3", "t6"]

        # ── customers ───────────────────────────────────────────────────────
        area_ids = [
            r[0] for r in (await ex(text("SELECT id FROM area ORDER BY city, name LIMIT 6"))).all()
        ]
        cust: list[uuid.UUID] = []
        for i in range(1, 21):
            cid = uid("customer", i)
            cust.append(cid)
            opted = i % 3 != 0
            await ex(
                text(
                    "INSERT INTO customer (id, full_name, address_default, source, notes, area_id,"
                    " whatsapp_opt_in_at, consent_contact_at, created_at, updated_at) VALUES "
                    "(:id,:n,:a,:src,:no,:area,:opt,:opt,:ts,:ts)"
                ),
                {
                    "id": cid,
                    "n": f"Lab Customer {i:02d}",
                    "a": f"House {i}, Lab Street {i % 5 + 1}, Test Town",
                    "src": ["walk_in", "phone", "whatsapp", "referral"][i % 4],
                    "no": "stand-in record",
                    "area": area_ids[i % len(area_ids)] if area_ids else None,
                    "opt": BASE + timedelta(days=i) if opted else None,
                    "ts": BASE + timedelta(days=i),
                },
            )
            await ex(
                text(
                    "INSERT INTO customer_phone (id, customer_id, phone_e164, label, is_primary) "
                    "VALUES (:id,:c,:p,'mobile',true)"
                ),
                {"id": uid("cphone", i), "c": cid, "p": f"+9200000002{i:02d}"},
            )
            if opted:
                await ex(
                    text(
                        "INSERT INTO customer_consent_event (id, customer_id, kind, scope, channel,"
                        " recorded_by, created_at) VALUES (:id,:c,'given','whatsapp','verbal','m1',:ts)"
                    ),
                    {"id": uid("consent", i), "c": cid, "ts": BASE + timedelta(days=i)},
                )
        units: dict[int, uuid.UUID] = {}
        for i, (cat, brand, model) in enumerate(
            [("ac", "LabBrand", "AC-100"), ("refrigerator", "LabBrand", "RF-200"),
             ("washing_machine", "LabCo", "WM-300")]
        ):
            units[i] = uid("unit", i)
            await ex(
                text(
                    "INSERT INTO appliance_unit (id, customer_id, category_id, brand_raw, model_raw,"
                    " serial_number, purchase_year, notes, created_at, updated_at) VALUES "
                    "(:id,:c,:cat,:b,:m,:sn,2022,'stand-in',:ts,:ts)"
                ),
                {"id": units[i], "c": cust[i], "cat": cat, "b": brand, "m": model,
                 "sn": f"LAB-SN-{i:04d}", "ts": BASE},
            )

        # ── jobs: 17 seeded by the migration (timestamps reset) + 30 here ───
        seeded = (
            await ex(
                text("SELECT id, token, status, job_type, assigned_tech_id FROM job ORDER BY token")
            )
        ).all()
        specs: list[dict] = []
        for r in seeded:
            specs.append(dict(id=r[0], token=r[1], status=r[2], jtype=r[3], tech=r[4], seeded=True))
        statuses = ["open"] * 8 + ["waiting"] * 6 + ["ready"] * 6 + ["closed"] * 10
        cats = [("ac", "Split AC"), ("refrigerator", "Refrigerator"),
                ("washing_machine", "Washing machine"), ("microwave", "Microwave oven")]
        for i, st in enumerate(statuses):
            specs.append(
                dict(id=uid("job", i), token=None, status=st, seeded=False,
                     jtype=["carry-in", "carry-in", "home-visit", "pickup-delivery"][i % 4],
                     tech=workers[i % 4] if i % 7 else "t4", n=i)
            )
        rank = {"closed": 0, "ready": 1, "waiting": 2, "open": 3}
        specs.sort(key=lambda d: (rank[d["status"]], d.get("token") or 10**9, d.get("n", 0)))
        for k, d in enumerate(specs):
            d["t0"] = BASE + timedelta(days=3, hours=k * 41)  # 2026-06-04 .. ~2026-08-09
            d["k"] = k

        for d in specs:
            if d["seeded"]:
                await ex(
                    text("UPDATE job SET created_at=:t, updated_at=:t WHERE id=:i"),
                    {"t": d["t0"], "i": d["id"]},
                )
                continue
            k, cat = d["k"], cats[d["k"] % 4]
            c = cust[k % 20]
            d["token"] = await one("SELECT nextval('job_token_seq')")
            d["cust"] = c
            await ex(
                text(
                    "INSERT INTO job (id, token, customer_id, category_id, appliance_unit_id,"
                    " status, job_type, client_id, customer_name, customer_phone, customer_address,"
                    " appliance_type, appliance_brand, appliance_model, problem, assigned_tech_id,"
                    " intake_channel, area_id, created_at, updated_at) VALUES "
                    "(:id,:tok,:c,:cat,:unit,:st,:jt,:cl,:cn,:cp,:ca,:at,'LabBrand','LB-1',:pr,:tech,"
                    " :ch,:area,:t0,:t0)"
                ),
                {
                    "id": d["id"], "tok": d["token"], "c": c, "cat": cat[0],
                    "unit": units.get(k % 3) if k % 3 == 0 and cat[0] == "ac" else None,
                    "st": d["status"], "jt": d["jtype"], "cl": uid("jobclient", k),
                    "cn": f"Lab Customer {k % 20 + 1:02d}", "cp": f"+9200000002{k % 20 + 1:02d}",
                    "ca": f"House {k % 20 + 1}, Lab Street {k % 5 + 1}, Test Town", "at": cat[1],
                    "pr": ["Not cooling", "Makes noise", "Leaks water", "Does not start"][k % 4],
                    "tech": d["tech"], "ch": ["walk_in", "phone", "whatsapp"][k % 3],
                    "area": area_ids[k % len(area_ids)] if area_ids else None, "t0": d["t0"],
                },
            )

        # ── completions, bills, payments (own jobs in ready/closed) ─────────
        money_jobs = [d for d in specs if not d["seeded"] and d["status"] in ("ready", "closed")]
        pay_sum_expected = 0
        negotiated_done = sent_done = 0
        for j, d in enumerate(money_jobs):
            t = d["t0"] + timedelta(days=3)
            d["done_at"] = t
            mins = 60 + 30 * (j % 4)
            fuel = 0 if d["jtype"] == "carry-in" else 25000 + 5000 * (j % 3)
            comp = uid("completion", d["token"])
            await ex(
                text(
                    "INSERT INTO job_completion (id, job_id, time_spent_mins, fuel_paisa,"
                    " labour_rate_paisa, fuel_rate_paisa_per_km, fault_code_id, action_code_id,"
                    " remarks_text, submitted_by, submitted_at, fuel_basis) VALUES "
                    "(:id,:j,:m,:f,120000,2000,'ac_sensor_fault','ac_sensor_replace','stand-in remark',"
                    ":tech,:t,:fb)"
                ),
                {"id": comp, "j": d["id"], "m": mins, "f": fuel, "tech": d["tech"], "t": t,
                 "fb": "manual" if fuel else None},
            )
            parts = 0
            for n_, (name, qty, unit) in enumerate(
                [("Lab capacitor", 1, 35000 + j * 500), ("Lab relay", 1 + j % 2, 18000)][: 1 + j % 2]
            ):
                parts += qty * unit
                await ex(
                    text(
                        "INSERT INTO job_material (id, completion_id, name_raw, qty, unit_paisa,"
                        " quality) VALUES (:id,:c,:n,:q,:u,'aftermarket')"
                    ),
                    {"id": uid("material", d["token"], n_), "c": comp, "n": name, "q": qty, "u": unit},
                )
            original = 120000 * mins // 60 + fuel + parts
            negotiated = None
            if d["status"] == "closed" and negotiated_done == 0 and j > 2:
                negotiated, negotiated_done = original - 20000, 1
            final = negotiated if negotiated is not None else original
            sent = None
            if d["status"] == "closed" and sent_done < 2 and negotiated is None and j > 1:
                sent, sent_done = t + timedelta(hours=1), sent_done + 1
            d["bill"], d["negotiated"], d["sent"] = original, negotiated, sent
            await ex(
                text(
                    "UPDATE job SET bill_original_paisa=:o, bill_negotiated_paisa=:n,"
                    " bill_status=:bs, bill_sent_at=:s WHERE id=:i"
                ),
                {"o": original, "n": negotiated, "bs": "negotiated" if negotiated else "generated",
                 "s": sent, "i": d["id"]},
            )
            # payments
            d["payments"] = []
            if d["status"] == "closed":
                if j % 3 == 0:  # a wrong amount, voided, then re-logged
                    d["payments"].append((final - 1000, "cash", True, "typo in amount"))
                    d["payments"].append((final, "cash", False, None))
                elif j % 3 == 1:  # split
                    d["payments"].append((final // 2, "cash", False, None))
                    d["payments"].append((final - final // 2, "online", False, None))
                else:
                    d["payments"].append((final, "card", False, None))
            elif j % 2 == 0:  # ready jobs: an advance deposit on some
                d["payments"].append((50000, "cash", False, None))
            for pi, (amt, method, voided, why) in enumerate(d["payments"]):
                if not voided:
                    pay_sum_expected += amt
                await ex(
                    text(
                        "INSERT INTO job_payment (id, job_id, client_id, amount_paisa, method,"
                        " recorded_by, recorded_at, voided, void_reason) VALUES "
                        "(:id,:j,:cl,:a,:m,'m1',:t,:v,:w)"
                    ),
                    {"id": uid("payment", d["token"], pi), "j": d["id"],
                     "cl": uid("payclient", d["token"], pi), "a": amt, "m": method,
                     "t": d["done_at"] + timedelta(hours=2 + pi), "v": voided, "w": why},
                )

        # ── job lifecycle fields + timeline events ──────────────────────────
        events: list[dict] = []

        def ev(d, kind, txt, at, actor, payload="{}", cid=None):
            events.append(dict(id=uid("event", d["token"], kind, len(events)), job=d["id"],
                               kind=kind, text=txt, actor=actor, at=at, payload=payload, cid=cid))

        for d in specs:
            t0, st, tech = d["t0"], d["status"], d["tech"]
            ev(d, "create", "Job created at intake", t0, "m1")
            ev(d, "assign", f"Assigned to {tech}", t0 + timedelta(minutes=10), "m1",
               f'{{"tech_id":"{tech}"}}')
            ev(d, "claim", f"Claimed by {tech}", t0 + timedelta(hours=2), tech,
               cid=uid("claim", d["token"]))
            ev(d, "note", "Initial inspection done", t0 + timedelta(hours=26), tech)
            if d["k"] % 3 == 0:
                ev(d, "estimate", "Estimate given to customer", t0 + timedelta(hours=28), tech)
            if st == "open":
                if d["k"] % 4 == 0:
                    ev(d, "followup", "Call customer tomorrow", t0 + timedelta(hours=30), tech)
                continue
            if st == "waiting":
                since = (t0 + timedelta(days=2)).date()
                ev(d, "status", "Waiting for spare part", t0 + timedelta(days=2), tech,
                   '{"to":"waiting"}', cid=uid("waiting", d["token"]))
                await ex(
                    text("UPDATE job SET waiting_reason='Waiting for spare part',"
                         " waiting_since=:s WHERE id=:i"), {"s": since, "i": d["id"]})
                continue
            # ready / closed
            done = d.get("done_at", t0 + timedelta(days=3))
            if not d["seeded"]:
                ev(d, "complete", "Completion form submitted", done, tech)
                ev(d, "bill", "Bill generated", done + timedelta(minutes=5), tech)
                if d.get("negotiated") is not None:
                    ev(d, "bill", "Bill negotiated on site", done + timedelta(minutes=30), tech)
                for pi, (amt, _m, voided, _w) in enumerate(d.get("payments", [])):
                    ev(d, "payment", f"Payment {amt} paisa" + (" (voided)" if voided else ""),
                       done + timedelta(hours=2 + pi), "m1")
            ev(d, "ready", "Work done, awaiting handover", done + timedelta(hours=1), tech,
               '{"to":"ready"}', cid=uid("ready", d["token"]))
            await ex(text("UPDATE job SET ready_since=:s WHERE id=:i"),
                     {"s": (done + timedelta(hours=1)).date(), "i": d["id"]})
            if st == "closed":
                closed_at = done + timedelta(days=1)
                ev(d, "status", "Closed after handover", closed_at, "m1", '{"to":"closed"}',
                   cid=uid("closed", d["token"]))
                await ex(text("UPDATE job SET closed_at=:c, updated_at=:c WHERE id=:i"),
                         {"c": closed_at, "i": d["id"]})
        events.sort(key=lambda e: (e["at"], e["kind"] != "create", e["id"].hex))

        # ── insert events; set the dispatch cursor at ~2/3 of the history ───
        cut = len(events) * 2 // 3
        for n, e in enumerate(events):
            await ex(
                text(
                    "INSERT INTO job_event (id, job_id, kind, text, actor, client_id, seq, payload,"
                    " created_at) VALUES (:id,:j,:k,:t,:a,:c,nextval('job_event_seq'),"
                    "CAST(:p AS jsonb),:at)"
                ),
                {"id": e["id"], "j": e["job"], "k": e["kind"], "t": e["text"], "a": e["actor"],
                 "c": e["cid"], "p": e["payload"], "at": e["at"]},
            )
            if n + 1 == cut:
                await ex(text(
                    "UPDATE dispatch_cursor SET last_seq=(SELECT max(seq) FROM job_event),"
                    " updated_at=:t WHERE consumer='whatsapp'"), {"t": e["at"]})
        # keep updated_at sane for open/waiting/ready jobs
        await ex(text("UPDATE job SET updated_at=(SELECT max(created_at) FROM job_event e"
                      " WHERE e.job_id=job.id) WHERE closed_at IS NULL"))

        # ── job location / travel / outcome / messages / media ─────────────
        hv = next(d for d in specs if not d["seeded"] and d["jtype"] == "home-visit"
                  and d["status"] == "closed")
        for n, (kind, dt, lat, lng) in enumerate([
            ("depart_workshop", 0, 24.8607, 67.0011), ("arrive_customer", 40, 24.8700, 67.0100)]):
            await ex(
                text("INSERT INTO job_location (id, job_id, client_id, kind, lat, lng, accuracy_m,"
                     " captured_at, distance_m, verified) VALUES (:id,:j,:c,:k,:la,:ln,12,:t,30,true)"),
                {"id": uid("loc", n), "j": hv["id"], "c": uid("locclient", n), "k": kind,
                 "la": lat, "ln": lng, "t": hv["t0"] + timedelta(hours=3, minutes=dt)},
            )
        for n in range(5):
            await ex(
                text("INSERT INTO job_travel_sample (id, job_id, client_id, leg, lat, lng,"
                     " accuracy_m, captured_at, received_at, recorded_by) VALUES "
                     "(:id,:j,:c,'outbound',:la,:ln,15,:t,:t,:tech)"),
                {"id": uid("travel", n), "j": hv["id"], "c": uid("travelclient", n),
                 "la": 24.8607 + n * 0.002, "ln": 67.0011 + n * 0.002,
                 "t": hv["t0"] + timedelta(hours=3, minutes=n * 8), "tech": hv["tech"]},
            )
        done_closed = [d for d in specs if not d["seeded"] and d["status"] == "closed"]
        await ex(
            text("INSERT INTO job_outcome (id, job_id, checked_at, channel, result, notes,"
                 " recorded_by, created_at) VALUES (:id,:j,:t,'manager_call','ok','Still working','m1',:t)"),
            {"id": uid("outcome", 1), "j": done_closed[0]["id"], "t": datetime(2026, 7, 20, 7, tzinfo=UTC)},
        )
        for n, (d, kind, status) in enumerate([(done_closed[1], "bill", "sent"),
                                               (money_jobs[0], "ready", "suppressed")]):
            await ex(
                text("INSERT INTO customer_message (id, job_id, customer_id, kind, to_phone_e164, body,"
                     " status, error, created_at, sent_at, updated_at) VALUES "
                     "(:id,:j,:c,:k,:p,:b,:s,:e,:t,:sent,:t)"),
                {"id": uid("msg", n), "j": d["id"], "c": d["cust"], "k": kind,
                 "p": f"+9200000002{d['k'] % 20 + 1:02d}", "b": "Lab stand-in message body",
                 "s": status, "e": "no opt-in" if status == "suppressed" else None,
                 "t": d["t0"] + timedelta(days=4), "sent": d["t0"] + timedelta(days=4) if status == "sent" else None},
            )
        n_media = 0
        for d in [x for x in specs if not x["seeded"]][:14]:
            for phase, typ, ext, ctype in [("before", "photo", "jpg", "image/jpeg"),
                                           ("remark", "audio", "m4a", "audio/mp4"),
                                           ("closing", "video", "mp4", "video/mp4")]:
                if phase == "closing" and d["status"] != "closed":
                    continue
                pending = (n_media % 4 == 3)
                fn = f"{phase}-{d['token']}.{ext}"
                await ex(
                    text("INSERT INTO job_media (id, job_id, job_uuid, phase, type, filename, created_by,"
                         " storage_path, content_type, size_bytes, duration_seconds, status, uploaded_by,"
                         " created_at, uploaded_at) VALUES (:id,:jt,:ju,:ph,:ty,:fn,:by,:sp,:ct,:sz,:du,"
                         ":st,:ub,:t,:u)"),
                    {"id": uid("media", d["token"], phase), "jt": str(d["token"]), "ju": d["id"],
                     "ph": phase, "ty": typ, "fn": fn, "by": d["tech"],
                     "sp": f"media/lab/{d['token']}/{fn}", "ct": ctype, "sz": 50_000 + n_media * 1_111,
                     "du": 20 if typ != "photo" else None, "st": "pending" if pending else "uploaded",
                     "ub": None if pending else d["tech"], "t": d["t0"] + timedelta(hours=3),
                     "u": None if pending else d["t0"] + timedelta(hours=3, minutes=2)},
                )
                n_media += 1

        # ── attendance ─────────────────────────────────────────────────────
        await ex(
            text("INSERT INTO attendance_geofence (id, shop_id, name, center_lat, center_lng, radius_m,"
                 " is_active, created_at, updated_at) VALUES (:id,:s,'Lab Workshop (placeholder)',"
                 "24.8607,67.0011,150,true,:t,:t)"),
            {"id": uid("geofence"), "s": SHOP, "t": BASE},
        )
        for tid in ("t1", "t2", "t3"):
            await ex(
                text("INSERT INTO attendance_shift (id, shop_id, tech_id, start_local, end_local,"
                     " working_days, grace_minutes, timezone, created_at, updated_at) VALUES "
                     "(:id,:s,:t,'09:00','18:00','1111110',15,'Asia/Karachi',:ts,:ts)"),
                {"id": uid("shift", tid), "s": SHOP, "t": tid, "ts": BASE},
            )
        first_events: list[uuid.UUID] = []
        for ti, tid in enumerate(workers):
            for day in range(8):
                dd = datetime(2026, 7, 6, tzinfo=UTC) + timedelta(days=day)
                if dd.weekday() == 6:
                    continue
                for kind, hour in (("clock_in", 4), ("clock_out", 13)):  # 09:00 / 18:00 PKT
                    at = dd.replace(hour=hour, minute=RNG.randrange(0, 20))
                    eid = uid("att", tid, day, kind)
                    if kind == "clock_in":
                        first_events.append(eid)
                    await ex(
                        text("INSERT INTO attendance_event (id, client_id, shop_id, tech_id, kind, source,"
                             " server_time, device_time, drift_seconds, lat, lng, accuracy_m, inside_geofence,"
                             " distance_m, selfie_path, selfie_status, created_by, created_at, effective_time)"
                             " VALUES (:id,:c,:s,:t,:k,'mobile',:at,:at,0,24.8607,67.0011,10,true,20,:sp,"
                             ":ss,:t,:at,:at)"),
                        {"id": eid, "c": uid("attclient", tid, day, kind), "s": SHOP, "t": tid, "k": kind,
                         "at": at, "sp": f"attendance/lab/{tid}/{day}-{kind}.jpg" if kind == "clock_in" else None,
                         "ss": "uploaded" if kind == "clock_in" and day % 5 else "pending"},
                    )
                if tid == "t1" and day == 2:  # one manual correction
                    await ex(
                        text("INSERT INTO attendance_adjustment (id, original_event_id, new_event_id,"
                             " manager_id, reason, created_at) VALUES (:id,:o,:n,'m1','stand-in correction',:t)"),
                        {"id": uid("adj"), "o": uid("att", tid, day, "clock_in"),
                         "n": uid("att", tid, day, "clock_out"), "t": dd.replace(hour=14)},
                    )
                for p in range(6):  # on-duty pings
                    at = dd.replace(hour=5 + p, minute=30)
                    await ex(
                        text("INSERT INTO attendance_ping (id, client_id, shop_id, tech_id, captured_at,"
                             " received_at, lat, lng, accuracy_m, inside_geofence, distance_m) VALUES "
                             "(:id,:c,:s,:t,:at,:at,:la,:ln,15,:in,:d)"),
                        {"id": uid("ping", tid, day, p), "c": uid("pingclient", tid, day, p), "s": SHOP,
                         "t": tid, "at": at, "la": 24.8607 + p * 0.001, "ln": 67.0011, "in": p < 2,
                         "d": 20.0 + p * 110},
                    )
                for kind, hour in (("arrive", 4), ("depart", 13)):
                    at = dd.replace(hour=hour, minute=5)
                    await ex(
                        text("INSERT INTO attendance_presence_event (id, client_id, shop_id, tech_id, kind,"
                             " source, server_time, device_time, drift_seconds, lat, lng, accuracy_m,"
                             " inside_geofence, distance_m, created_at, effective_time, confirmed) VALUES "
                             "(:id,:c,:s,:t,:k,'geofence',:at,:at,0,24.8607,67.0011,10,:in,25,:at,:at,true)"),
                        {"id": uid("presence", tid, day, kind), "c": uid("presclient", tid, day, kind),
                         "s": SHOP, "t": tid, "k": kind, "at": at, "in": kind == "arrive"},
                    )

        # ── staff ledger + hash chain + advance requests + payroll ─────────
        ledger: list[dict] = []
        for ti, tid in enumerate(workers):
            for w in range(4):
                day = date(2026, 6, 28) + timedelta(days=7 * w)
                ledger.append(dict(tid=tid, kind="earning", amt=1_500_000 + ti * 100_000 + w * 25_000,
                                   day=day, note=f"Week {w + 1} earnings (stand-in)"))
            ledger.append(dict(tid=tid, kind="advance", amt=300_000 + ti * 50_000,
                               day=date(2026, 7, 10), note="Advance (stand-in)"))
            ledger.append(dict(tid=tid, kind="settlement", amt=1_000_000, day=date(2026, 7, 26),
                               note="Settlement paid (stand-in)"))
        ledger.append(dict(tid="t2", kind="advance", amt=999_900, day=date(2026, 7, 14),
                           note="Advance entered twice by mistake", void="duplicate entry"))
        ledger.append(dict(tid="t3", kind="adjustment_debit", amt=12_500, day=date(2026, 7, 15),
                           note="Breakage deduction (stand-in)"))
        for n, r in enumerate(ledger):
            r["id"] = uid("ledger", n)
            r["client_id"] = uid("ledgerclient", n)
            r["created_at"] = datetime.combine(r["day"], datetime.min.time(), UTC) + timedelta(hours=8, minutes=n)
            if "void" in r:
                r["voided_at"] = r["created_at"] + timedelta(hours=3)
        for r in ledger:
            await ex(
                text("INSERT INTO staff_ledger (id, client_id, shop_id, tech_id, kind, amount_minor,"
                     " occurred_on, note, recorded_by, created_at, voided, void_reason, voided_by, voided_at)"
                     " VALUES (:id,:c,:s,:t,:k,:a,:d,:n,'m1',:ts,:v,:vr,:vb,:va)"),
                {"id": r["id"], "c": r["client_id"], "s": SHOP, "t": r["tid"], "k": r["kind"],
                 "a": r["amt"], "d": r["day"], "n": r["note"], "ts": r["created_at"],
                 "v": "void" in r, "vr": r.get("void"), "vb": "m1" if "void" in r else None,
                 "va": r.get("voided_at")},
            )
        timeline = []
        for r in ledger:
            timeline.append((r["created_at"], 0, str(r["id"]), chain.CREATE, chain.canonical_create_payload(
                ledger_id=r["id"], client_id=r["client_id"], shop_id=SHOP, tech_id=r["tid"],
                kind=r["kind"], amount_minor=r["amt"], occurred_on=r["day"], note=r["note"],
                recorded_by="m1", created_at=r["created_at"])))
            if "void" in r:
                timeline.append((r["voided_at"], 1, str(r["id"]), chain.VOID, chain.canonical_void_payload(
                    ledger_id=r["id"], void_reason=r["void"], voided_by="m1", voided_at=r["voided_at"])))
        timeline.sort(key=lambda t: (t[0], t[1], t[2]))
        prev = chain.GENESIS_HASH
        for seq, (at, _o, lid, etype, payload) in enumerate(timeline, start=1):
            h = chain.compute_row_hash(payload, prev)
            await ex(
                text("INSERT INTO staff_ledger_chain (id, shop_id, seq, event_type, ledger_id, payload,"
                     " prev_hash, row_hash, created_at) VALUES (:id,:s,:q,:e,:l,:p,:ph,:h,:t)"),
                {"id": uid("chain", seq), "s": SHOP, "q": seq, "e": etype, "l": uuid.UUID(lid),
                 "p": payload, "ph": prev, "h": h, "t": at},
            )
            prev = h

        disbursed = next(r for r in ledger if r["tid"] == "t1" and r["kind"] == "advance")
        for n, (tid, status, amt, extra) in enumerate([
            ("t1", "disbursed", disbursed["amt"], dict(ledger_id=disbursed["id"], dec="m1")),
            ("t3", "pending", 200_000, {}),
            ("t6", "rejected", 800_000, dict(dec="m1", why="Over the cap (stand-in)")),
        ]):
            at = datetime(2026, 7, 10, 5, n, tzinfo=UTC)
            await ex(
                text("INSERT INTO advance_request (id, client_id, disbursement_client_id, shop_id, tech_id,"
                     " amount_minor, status, available_snapshot_minor, requested_at, decided_by, decided_at,"
                     " reject_reason, ledger_id, disbursement_ref, disbursement_rail, created_at) VALUES "
                     "(:id,:c,:dc,:s,:t,:a,:st,:av,:at,:db,:da,:rr,:l,:ref,:rail,:at)"),
                {"id": uid("advreq", n), "c": uid("advclient", n),
                 "dc": disbursed["client_id"] if status == "disbursed" else uid("advdisb", n),
                 "s": SHOP, "t": tid, "a": amt, "st": status, "av": 1_000_000, "at": at,
                 "db": extra.get("dec"), "da": at + timedelta(hours=1) if extra.get("dec") else None,
                 "rr": extra.get("why"), "l": extra.get("ledger_id"),
                 "ref": "MANUAL-LAB-0001" if status == "disbursed" else None,
                 "rail": "manual_cash" if status == "disbursed" else None},
            )
        for n, (f, t_) in enumerate([(date(2026, 7, 6), date(2026, 7, 12)),
                                      (date(2026, 7, 13), date(2026, 7, 19))]):
            await ex(
                text("INSERT INTO payroll_export (id, shop_id, from_date, to_date, storage_path, row_count,"
                     " created_at) VALUES (:id,:s,:f,:t,:p,4,:c)"),
                {"id": uid("payroll", n), "s": SHOP, "f": f, "t": t_,
                 "p": f"payroll/lab/{f}_{t_}.csv", "c": datetime.combine(t_ + timedelta(days=1),
                                                                          datetime.min.time(), UTC)},
            )

        # ── settings, telemetry, devices ───────────────────────────────────
        for n, (k, v) in enumerate([("advance_cooldown_hours", "24"),
                                    ("advance_absolute_cap_minor", "500000")]):
            await ex(
                text("INSERT INTO shop_setting (id, client_id, seq, shop_id, key, value, recorded_by,"
                     " created_at) VALUES (:id,:c,nextval('shop_setting_seq'),:s,:k,:v,'m1',:t)"),
                {"id": uid("setting", n), "c": uid("settingclient", n), "s": SHOP, "k": k, "v": v,
                 "t": datetime(2026, 7, 1, 7, n, tzinfo=UTC)},
            )
        for n in range(12):
            await ex(
                text("INSERT INTO app_event (id, client_id, actor_kind, actor_id, name, props, device_time,"
                     " server_time) VALUES (:id,:c,:ak,:ai,:nm,CAST(:p AS jsonb),:t,:t)"),
                {"id": uid("appevent", n), "c": uid("appeventclient", n),
                 "ak": ["tech", "manager", "system"][n % 3], "ai": ["t1", "m1", None][n % 3],
                 "nm": ["app_open", "job_viewed", "rollup_run"][n % 3], "p": '{"lab":true}',
                 "t": datetime(2026, 7, 7, 5, n, tzinfo=UTC)},
            )
        for n, tid in enumerate(["t1", "t2"]):
            dev = uid("device", n)
            await ex(
                text("INSERT INTO device (id, installation_id, tech_id, platform, os_version, app_version,"
                     " last_seen_at, created_at) VALUES (:id,:i,:t,'android','14','lab-1.0',:ts,:ts)"),
                {"id": dev, "i": f"lab-install-{n}", "t": tid, "ts": datetime(2026, 8, 1, 5, tzinfo=UTC)},
            )
            await ex(
                text("INSERT INTO device_token (id, tech_id, token, platform, device_id, created_at,"
                     " updated_at) VALUES (:id,:t,:tok,'android',:d,:ts,:ts)"),
                {"id": uid("devtoken", n), "t": tid, "tok": f"lab-fcm-token-{n}", "d": dev,
                 "ts": datetime(2026, 8, 1, 5, tzinfo=UTC)},
            )
        for n, route in enumerate(["/api/jobs", "/api/attendance/today", "/api/ops/health"]):
            await ex(
                text("INSERT INTO ops_metric_rollup (id, captured_at, window_seconds, route, method, count,"
                     " error_count, p50_ms, p95_ms, p99_ms) VALUES (:id,:t,300,:r,'GET',:c,0,20,80,150)"),
                {"id": uid("rollup", n), "t": datetime(2026, 8, 1, 5, n * 5, tzinfo=UTC), "r": route,
                 "c": 100 + n},
            )

        await s.commit()

    # ── report ──────────────────────────────────────────────────────────────
    ok = True
    async with SessionLocal() as s:
        tables = [r[0] for r in (await s.execute(text(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"))).all()]
        for t in tables:
            print(f"{t}={(await s.execute(text(f'SELECT count(*) FROM {t}'))).scalar_one()}")
        pay = (await s.execute(text(
            "SELECT coalesce(sum(amount_paisa),0) FROM job_payment WHERE NOT voided"))).scalar_one()
        print(f"non_voided_payment_sum_paisa={pay}")
        cur, mx = (await s.execute(text(
            "SELECT (SELECT last_seq FROM dispatch_cursor WHERE consumer='whatsapp'),"
            " (SELECT max(seq) FROM job_event)"))).one()
        print(f"dispatch_cursor_whatsapp={cur} max_job_event_seq={mx} below_max={cur < mx}")
        ok &= cur < mx
        for tid, pin in PINS.items():
            h = (await s.execute(text("SELECT pin_hash FROM technician WHERE id=:i"), {"i": tid})).scalar_one()
            ok &= verify_pin(pin, h)
        # same views the ledger-verify service builds
        evs = (await s.execute(text(
            "SELECT seq,event_type,ledger_id,payload,prev_hash,row_hash FROM staff_ledger_chain"
            " WHERE shop_id=:s"), {"s": SHOP})).all()
        rows = (await s.execute(text(
            "SELECT id,client_id,shop_id,tech_id,kind,amount_minor,occurred_on,note,recorded_by,"
            "created_at,voided,void_reason,voided_by,voided_at FROM staff_ledger WHERE shop_id=:s"),
            {"s": SHOP})).all()
        out = chain.verify_chain(
            [chain.ChainEventView(*e) for e in evs], [chain.LedgerRowView(*r) for r in rows])
        print(f"chain_verify ok={out.ok} events={out.event_count} ledger_rows={out.ledger_row_count}"
              f" head={out.head_hash[:16]} issues={len(out.issues)}")
        ok &= out.ok
    await engine.dispose()
    print("SEED OK" if ok else "SEED FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
