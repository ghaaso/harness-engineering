#!/usr/bin/env python3
"""The deploy-train rows' post-deploy checks, as API calls against the stand-in backend.

Each check is the W0-results "Post-deploy check" text of its row, turned into the calls it
describes, with stand-in accounts (PINs set by the rehearsal, in no file). Run on the stand-in
host against the backend's container address (no tunnel):

  traincheck.py <base url> p6a-setup     write the fixture the P6a row needs "today": t1 clocked in
                                          30 min ago with a fresh ping; t2 clocked in one hour
                                          before shop-local midnight, no ping
  traincheck.py <base url> p6a           the P6a row's check (manager token)
  traincheck.py <base url> p7a <json>    the P7a row's four checks; <json> names the jobs:
                                          {"other": id of a job assigned to t2,
                                           "closed": id of a closed job,
                                           "unclaimed": id of an open unassigned job}
PINs come from the environment: L4_PIN_M1, L4_PIN_T1, L4_PIN_T2. Prints one JSON object:
{"result": "PASS"|"FAIL", "items": [[name, ok, evidence], ...]}.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from datetime import UTC, datetime, timedelta, timezone

BASE = sys.argv[1].rstrip("/")
# Asia/Karachi is UTC+05:00 all year (no DST); the stand-in host (Alpine) has no tzdata.
SHOP_TZ = timezone(timedelta(hours=5))


def call(method: str, path: str, token: str | None = None, body: object | None = None) -> tuple[int, object]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, raw.decode(errors="replace")[:300]


def login(tech: str, env: str) -> str:
    st, body = call("POST", "/api/auth/login", body={"tech_id": tech, "pin": os.environ[env]})
    if st != 200 or not isinstance(body, dict):
        raise SystemExit(json.dumps({"result": "FAIL", "items": [[f"login {tech}", False, f"{st} {body}"]]}))
    return body.get("access_token") or body.get("token")


def iso(dt: datetime) -> str:
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


def p6a_setup() -> None:
    now = datetime.now(UTC)
    t1, t2 = login("t1", "L4_PIN_T1"), login("t2", "L4_PIN_T2")
    out = []
    st, b = call("POST", "/api/attendance/punches", t1,
                 {"client_id": str(uuid.uuid4()), "tech_id": "t1", "kind": "clock_in",
                  "device_time": iso(now - timedelta(minutes=30)), "lat": 24.86, "lng": 67.0, "accuracy_m": 10})
    out.append(["t1 clock_in 30 min ago", st in (200, 201), st])
    st, b = call("POST", "/api/attendance/pings", t1,
                 {"pings": [{"client_id": str(uuid.uuid4()), "tech_id": "t1", "captured_at": iso(now - timedelta(minutes=1)),
                             "lat": 24.86, "lng": 67.0, "accuracy_m": 10}]})
    out.append(["t1 ping 1 min ago", st in (200, 201) and isinstance(b, dict) and b.get("accepted") == 1, f"{st} {b}"])
    midnight = datetime.now(SHOP_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    before = midnight - timedelta(hours=1)
    st, b = call("POST", "/api/attendance/punches", t2,
                 {"client_id": str(uuid.uuid4()), "tech_id": "t2", "kind": "clock_in",
                  "device_time": iso(before), "lat": 24.86, "lng": 67.0, "accuracy_m": 10})
    out.append([f"t2 clock_in at {before.isoformat()} (before shop midnight)", st in (200, 201), f"{st} {b if st >= 300 else ''}"])
    ok = all(i[1] for i in out)
    print(json.dumps({"result": "PASS" if ok else "FAIL", "items": out, "t2_since": before.isoformat()}))


def p6a() -> None:
    m1 = login("m1", "L4_PIN_M1")
    items = []
    st, board = call("GET", "/api/attendance/board", m1)
    rows = {r["tech_id"]: r for r in board.get("rows", [])} if isinstance(board, dict) else {}
    keys_ok = bool(rows) and all({"sampler_state", "last_ping_at", "pings_today"} <= set(r) for r in rows.values())
    items.append(["board rows carry sampler_state, last_ping_at, pings_today", st == 200 and keys_ok, f"{st}, {len(rows)} rows"])
    r1, r2 = rows.get("t1", {}), rows.get("t2", {})
    items.append(["t1 (fresh ping) is healthy", r1.get("sampler_state") == "ok",
                  f"t1 sampler_state={r1.get('sampler_state')} pings_today={r1.get('pings_today')} last_ping_at={r1.get('last_ping_at')}"])
    items.append(["clocked in, no recent ping: stale or silent, never healthy", r2.get("sampler_state") in ("stale", "silent"),
                  f"t2 sampler_state={r2.get('sampler_state')}"])
    since = r2.get("on_duty_since")
    items.append(["a shift begun before midnight shows on duty with its start time", bool(since),
                  f"t2 on_duty_since={since} status={r2.get('status')}"])
    today = datetime.now(SHOP_TZ).date()
    st, days = call("GET", f"/api/attendance/techs/t2/days?start={today - timedelta(days=1)}&end={today}", m1)
    has_eff = "effective_time" in json.dumps(days)
    items.append(["the technician day view renders the effective time", st == 200 and has_eff, f"{st}, effective_time present={has_eff}"])
    ok = all(i[1] for i in items)
    print(json.dumps({"result": "PASS" if ok else "FAIL", "items": items}))


def p7a(jobs: dict[str, str]) -> None:
    t1, m1 = login("t1", "L4_PIN_T1"), login("m1", "L4_PIN_M1")
    items = []
    st, b = call("GET", f"/api/jobs/{jobs['other']}", t1)
    items.append(["(1) tech token on another tech's job: 403", st == 403, f"{st} {str(b)[:120]}"])
    st, b = call("POST", f"/api/jobs/{jobs['closed']}/payments", m1,
                 {"amount_paisa": 1000, "method": "cash", "client_id": str(uuid.uuid4())})
    detail = b.get("detail") if isinstance(b, dict) else str(b)
    items.append(["(2) payment on a closed job: 409 ending (current status: closed)",
                  st == 409 and str(detail).endswith("(current status: closed)"), f"{st} {str(detail)[:160]}"])
    st, b = call("POST", f"/api/jobs/{jobs['unclaimed']}/notes", t1, {"text": "L4 rehearsal note"})
    st2, job = call("GET", f"/api/jobs/{jobs['unclaimed']}", m1)
    assigned = job.get("assigned_tech_id") if isinstance(job, dict) else None
    items.append(["(3) tech note on an unclaimed job: 201, then assigned to that tech",
                  st == 201 and assigned == "t1", f"note {st}; job now assigned_tech_id={assigned}"])
    st, b = call("GET", "/api/jobs/99999999999/media", t1)
    items.append(["(4) GET /api/jobs/99999999999/media is not a 500", st != 500 and st < 500, f"{st} {str(b)[:120]}"])
    ok = all(i[1] for i in items)
    print(json.dumps({"result": "PASS" if ok else "FAIL", "items": items}))


if __name__ == "__main__":
    mode = sys.argv[2]
    if mode == "p6a-setup":
        p6a_setup()
    elif mode == "p6a":
        p6a()
    elif mode == "p7a":
        p7a(json.loads(sys.argv[3]))
    else:
        raise SystemExit(f"unknown mode {mode}")
