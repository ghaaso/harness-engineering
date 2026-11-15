# Builds answers.jsonl for the blind second reading of tq_questions.jsonl.
# Answers were produced by reading the exported frozen commit a31924a (no extractor used).
import json, os, sys

F = "backend/app/features/"
M = "technician-app/src/"
J = F + "jobs/"
V = "backend/alembic/versions/"
CL = "CLAUDE.md"

A = {}

def add(i, answer, evidence, conf, reading=""):
    A[i] = dict(answer=answer, evidence=evidence, confidence=conf, reading=reading)

# ---------------- screen_tables ----------------
add(1, ["customer", "customer_consent_event", "customer_phone", "job", "job_event", "job_media"], [
    M+"features/jobs/create-job/CreateJobWizard.tsx:160 submitJob -> sendOrQueue(kind create) -> POST /api/jobs (outboxSync.ts:110 send 'create' on replay)",
    J+"router.py:96 create_job -> service.create_job",
    J+"service.py:878 _create_with_next_token -> repo.create (repository.py session.add job) [job]",
    J+"service.py:835 add_event JobEvent kind=create [job_event]",
    J+"service.py:948 _link_customer -> create_customer_with_phone; customers/service.py:143 add Customer, :145 add CustomerPhone [customer, customer_phone] (consent chip)",
    J+"service.py:958 -> customers/service.py:111 add CustomerConsentEvent, :123/126 customer.whatsapp_opt_in_at/updated_at [customer_consent_event, customer]",
    M+"features/jobs/create-job/CreateJobWizard.tsx:104 queueVoiceNotes -> pendingMedia.ts:145 drainPendingMedia -> uploadMedia.ts:35 api.requestUpload (POST /api/jobs/{id}/media) + completeUpload",
    F+"media/repository.py:44 add JobMedia; :101 mark_uploaded; :107 session.delete (oversize) [job_media]",
], "high", "Submit = submitJob; followed the create outbox item and the pending-media voice-note queue it feeds. GET /api/jobs used by the drain is a read.")

add(9, ["attendance_geofence", "attendance_shift"], [
    "src/features/settings/components/GeofenceCard.jsx:174 saveGeofence -> attendanceApi.js:96 PUT /api/attendance/geofences",
    F+"attendance/router.py:441 put_geofence -> service.py:960 upsert_geofence -> repository.py:369 add / attribute sets [attendance_geofence]",
    "src/features/settings/components/ShiftsCard.jsx:95 saveShift -> attendanceApi.js:110 PUT /api/attendance/shifts/{tech_id}",
    F+"attendance/router.py:413 put_shift -> service.py:929 upsert_shift -> repository.py:322 add / attribute sets [attendance_shift]",
], "high", "Settings.jsx itself only has a disabled workshop-profile button (demo); the two cards it renders write.")

add(17, [], [
    "src/features/schedule/pages/Schedule.jsx:3-11 imports only useApp (technicians, getJob) and demo data/schedule.js",
    "src/app/providers/AppContext.jsx:431 getJob is an in-memory lookup",
], "high", "Schedule is demo data; no HTTP write.")

add(21, ["device_token"], [
    M+"lib/usePushRegistration.ts:9 registerForPush -> push.ts:37 registerDevice -> devicesApi.ts:6 POST /api/devices body {token, platform}",
    F+"notifications/router.py:38 register_device -> service.register -> repository.upsert_token :66 add / :74 updated_at [device_token]",
    F+"notifications/service.py (register) upsert_device only when installation_id is not None -> repository.py:44 [device]",
], "medium", "Excluded 'device': its upsert runs only when installation_id is sent, and this client never sends it (devicesApi.ts:8 body has only token, platform). A purely static reading that ignores the payload would add 'device'.")

add(29, ["attendance_event", "attendance_ping"], [
    M+"features/attendance/punch.ts:51 enqueue -> :57 syncNow -> sync.ts:136 recordPunch (POST /api/attendance/punches), :169 completeSelfie (POST .../selfie/complete)",
    F+"attendance/service.py:346 record_punch -> repo.create_event (repository.py:53) [attendance_event]; :549 finalize_selfie / :544 reject_selfie update attendance_event",
    M+"features/attendance/punch.ts:55 startDutyPings -> pingTracker.ts:303-304 enqueuePing + syncPings -> pingSync.ts:42 recordPings (POST /api/attendance/pings)",
    F+"attendance/service.py:507 record_pings -> repository.py:248 create_pings pg_insert(AttendancePing) [attendance_ping]",
], "high", "Presence (geofence crossings) is fed by the geofence task, not by punch, so attendance_presence_event is excluded.")

add(37, ["job", "job_event", "job_media", "job_payment"], [
    M+"features/jobs/arrival-job/ArrivalJobBillScreen.tsx:170 sendOrQueue negotiate -> POST /bill/negotiate; service.py negotiate_bill sets job.bill_negotiated_paisa/bill_status + add_event [job, job_event]",
    M+"features/jobs/arrival-job/ArrivalJobBillScreen.tsx:251 sendOrQueue payment -> POST /payments; jobs/repository.py:227 add JobPayment, add_event, row.updated_at [job_payment, job_event, job]",
    M+"features/jobs/arrival-job/ArrivalJobBillScreen.tsx:288 closeJobWithVideo -> uploadMedia (media/repository.py:44/101 [job_media]) + transition close (jobs/repository.py:90 update(Job), service.py add_event)",
    M+"features/jobs/arrival-job/ArrivalJobBillScreen.tsx:371 messagingApi.logSend -> customer_messaging/router.py:90 log_customer_message -> add_event + job.bill_sent_at [job_event, job]",
], "high", "messagingApi.preview and jobsApi.get are reads.")

# ---------------- tests_reach ----------------
add(2, {"real": ["backend/tests/test_catalog_integration.py", "backend/tests/test_jobs_integration.py", "backend/tests/test_messaging_integration.py"],
        "fake": ["backend/app/features/jobs/tests/test_lifecycle.py", "backend/app/features/jobs/tests/test_money_guards.py", "backend/app/features/jobs/tests/test_service.py"]}, [
    J+"service.py:1125 transition -> try_transition; :1321 submit_completion -> try_transition when job_type != home-visit",
    "backend/tests/test_jobs_integration.py:166 POST /transition (real DB)",
    "backend/tests/test_catalog_integration.py:74 POST /completion on a carry-in job (JobCreate default job_type carry-in, schemas.py:31)",
    "backend/tests/test_messaging_integration.py:445 POST /completion on a carry-in job",
    J+"tests/test_lifecycle.py:113, test_money_guards.py:86, test_service.py:108 repo.try_transition = AsyncMock",
], "high", "jobs/tests/test_router.py replaces the whole JobService via dependency_overrides (router test), so try_transition is neither run nor replaced there -> excluded.")

add(10, {"real": ["src/features/attendance/data/attendanceApi.test.js", "src/features/auth/data/authApi.test.js", "src/features/jobs/data/jobsApi.test.js", "src/shared/lib/api.test.js"], "fake": []}, [
    "src/shared/lib/api.test.js:24 apiSend direct",
    "src/features/auth/data/authApi.test.js:19 login -> authApi.js:15 apiSend",
    "src/features/jobs/data/jobsApi.test.js:39-118 createJob/assign/notes/transition/completion/negotiate/payments -> apiSend",
    "src/features/attendance/data/attendanceApi.test.js:62,85,108 createAdjustment/saveGeofence/saveShift -> apiSend",
], "high", "Only globalThis.fetch is stubbed; no test mocks @shared/lib/api.")

add(22, {"real": ["backend/app/features/customer_messaging/tests/test_service.py", "backend/app/features/ops/tests/test_router.py", "backend/tests/test_messaging_integration.py", "backend/tests/test_security.py"], "fake": []}, [
    "backend/tests/test_security.py:16 compare_secret direct",
    F+"ops/tests/test_router.py:48 GET /api/ops/health with token -> ops/deps.py:44 compare_secret",
    F+"customer_messaging/tests/test_service.py:133 verify_webhook_signature -> service.py:158 compare_secret",
    "backend/tests/test_messaging_integration.py:330-346 webhook GET verify_token -> router.py:157; :401 signed POST -> verify_webhook_signature",
], "high", "ops/tests/test_health.py only reads the setting via config_presence; nothing patches compare_secret.")

add(30, {"real": [M+"features/attendance/pingSync.test.ts"], "fake": [M+"features/attendance/pingTracker.test.ts"]}, [
    M+"features/attendance/pingSync.test.ts:62 syncPings direct",
    M+"features/attendance/pingTracker.test.ts:30 jest.mock('./pingSync'); :109 handlePingUpdate -> pingTracker.ts:304 syncPings; :120 asserts mocked call",
], "high", "punch.test.ts mocks pingTracker wholesale, so it never reaches syncPings.")

add(38, {"real": [M+"features/media/uploadMedia.test.ts"], "fake": [M+"features/media/pendingMedia.test.ts"]}, [
    M+"features/media/uploadMedia.test.ts:74 uploadMedia direct",
    M+"features/media/pendingMedia.test.ts:35 jest.mock('./uploadMedia'); :85 drainPendingMedia -> pendingMedia.ts:145 uploadMedia",
], "high", "lib/architecture.test.ts only reads source text (fs), does not execute closeJobWithVideo.")

add(45, {"real": [], "fake": ["src/features/attendance/pages/AttendanceVariance.test.jsx"]}, [
    "src/features/attendance/pages/AttendanceVariance.test.jsx:13 vi.mock attendanceApi module with fetchVariance fake; renders page whose AttendanceVariance.jsx:92 calls fetchVariance",
    "src/features/attendance/data/attendanceApi.test.js:3-15 does not import or call fetchVariance",
], "high", "")

# ---------------- invariants_on_file ----------------
add(3, ["CLAUDE.md:L151", "CLAUDE.md:L154", "CLAUDE.md:L161", "CLAUDE.md:L212"], [
    "CLAUDE.md:66 Offline-engine table maps 'Jobs outbox' to technician-app/src/lib/outbox.ts",
    "CLAUDE.md:L151 'Mobile mutations go through the outbox' (c); outbox.ts:155 enqueue",
    "CLAUDE.md:L154 'The outbox never deletes a write ... failed list' (c,d); outbox.ts:203 markFailed, :225 discardItem only on user confirmation",
    "CLAUDE.md:L161 'the outbox has no mutual exclusion on a stable id' (c,d); outbox.ts:155-161 enqueue replaces by id",
    "CLAUDE.md:L212 names removeItem (b); outbox.ts:177 removeItem",
], "medium", "Read (c) as: the bullet names 'the outbox' / 'jobs outbox', which the table maps to outbox.ts. L191 ('client-queued ready') excluded though OutboxKind still lists 'ready' (outbox.ts:31), since the bullet names no outbox component.")

add(11, ["CLAUDE.md:L134"], [
    "CLAUDE.md:L134 names backend/app/core/security.py and compare_secret",
    "backend/app/core/security.py:22 compare_secret",
], "high", "L140 concerns identity/throttle.py and identity/security.py, not core/security.py.")

add(18, ["CLAUDE.md:L181", "CLAUDE.md:L191", "CLAUDE.md:L199", "CLAUDE.md:L224", "CLAUDE.md:L231", "CLAUDE.md:L239", "CLAUDE.md:L246"], [
    "CLAUDE.md:L181 names jobs/service.py, _TRANSITION_FROM/_TRANSITION_SETTLED; service.py:1026 transition",
    "CLAUDE.md:L191 names submit_completion; service.py:1142, ready move at :1321",
    "CLAUDE.md:L199 bill freeze implemented in service.py submit_completion (d)",
    "CLAUDE.md:L224 JobDetail.evidence filled in service.py:1908 _detail (d)",
    "CLAUDE.md:L231/L239 name run_dispatch_once, defined service.py:459",
    "CLAUDE.md:L246 names log_customer_message, defined service.py:1403",
], "medium", "L207 excluded (the rule is the client form; the server upsert is only its reason). L116/L119/L127 not named via (a)/(b).")

add(23, ["CLAUDE.md:L154", "CLAUDE.md:L171"], [
    "CLAUDE.md:69 table maps 'On-duty pings' to features/attendance/{pingQueue,pingSync,pingTracker}.ts",
    "CLAUDE.md:L154 names 'On-duty pings' as deliberately droppable (c)",
    "CLAUDE.md:L171 names pingTracker.ts and dutyStatus (a,b); pingTracker.ts:112 dutyStatus",
], "medium", "")

add(31, ["CLAUDE.md:L231"], [
    "CLAUDE.md:L231 names _MAX_DISPATCH_EVENT_AGE (main.py); backend/app/main.py:94",
], "medium", "L239/L243/L246 rules are implemented in jobs/service.py run_dispatch_once and customer_messaging (main.py only wires them, main.py:97-128), so excluded; borderline.")

add(39, [], [
    "src/features/jobs/pages/JobDetail.jsx:610-617 Mark Ready / Close buttons call app.markReady/closeJob (direct, not queued)",
    "src/features/jobs/pages/JobDetail.jsx:666 web CompletionForm; no freeze mirror, no detail regex in this file",
], "medium", "CLAUDE.md:L224 names JobDetail.evidence, which is the backend schema (jobs/schemas.py), not this page's JobDetail component - treated as a name collision, not a match. Possible borderline: L199 (web Edit hidden when closed, JobDetail.jsx:268).")

# ---------------- other_half ----------------
add(4, [M+"features/jobs/completionPrefill.ts::freezeReason"], [
    M+"features/jobs/completionPrefill.ts:65 freezeReason checks bill_sent_at, bill_negotiated_paisa, non-voided payment",
], "high", "")

add(12, ["src/app/providers/AppContext.jsx::AppProvider.serverReason", M+"features/jobs/JobDetailScreen.tsx::apiDetail", M+"features/jobs/closeJobWithVideo.ts::apiDetail", M+"lib/syncClassification.ts::failureReason"], [
    "src/app/providers/AppContext.jsx:229 serverReason regex on detail; used for transitionJob close/wait at :353/:367",
    M+"features/jobs/JobDetailScreen.tsx:59 apiDetail; used for transition abandon :337 and queueTransition :373",
    M+"features/jobs/closeJobWithVideo.ts:36 apiDetail; used on close transition 409/400 at :124",
    M+"lib/syncClassification.ts:35 failureReason; outboxSync.ts:219 markFailed reason for a rejected queued transition",
], "medium", "No client regexes the literal '(current status: X)'; read 'extract that detail string' as pulling FastAPI detail out of a rejected transition response. serverReason is a const inside AppProvider. failureReason is generic (all queued kinds) - include is borderline.")

add(24, [J+"schemas.py::TravelSampleBatch"], [
    J+"schemas.py:304 samples: list[TravelSampleIn] = Field(..., max_length=100)",
    J+"router.py:463-467 POST /{job_id}/travel-samples uses it",
], "high", "The cap is the samples field of TravelSampleBatch.")

add(32, [M+"features/jobs/closeJobWithVideo.ts::closeJobWithVideo"], [
    M+"features/jobs/closeJobWithVideo.ts:77 uploads phase=closing, then :109 queues transition close",
], "high", "")

add(40, [M+"features/jobs/arrival-job/arrivalDraft.ts::evidenceSatisfiesCaptures"], [
    M+"features/jobs/arrival-job/arrivalDraft.ts:94 evidenceSatisfiesCaptures(evidence)",
    M+"features/jobs/arrival-job/ArrivalJobWizard.tsx:134 calls it with job?.evidence",
], "high", "")

add(46, [], [
    "src/features/auth/pages/Login.jsx:35 any failure -> 'Wrong PIN'",
    M+"features/auth/LoginScreen.tsx:55 bare catch -> 'Wrong PIN, or login failed.'",
], "high", "No client inspects 429 or Retry-After on login.")

# ---------------- setting_readers ----------------
add(5, ["backend/app/main.py::_lifespan"], [
    "backend/app/main.py:200 if settings.enable_dispatcher (register job); :237 log line",
], "high", "core/config.py:188 is the declaration, not a read.")

add(13, [F+"ops/deps.py::require_ops_proxy_token", F+"ops/health.py::config_presence"], [
    F+"ops/deps.py:39 expected = settings.ops_proxy_token",
    F+"ops/health.py:114 bool(settings.ops_proxy_token)",
], "high", "ops-server.mjs:71 reads a different env var (OPS_PROXY_TOKEN, the BFF's copy of the secret), so excluded.")

add(25, [V+"0040_shop_settings.py::upgrade"], [
    V+"0040_shop_settings.py:79 str(settings.labour_rate_paisa) seed",
], "medium", "Read as the env Settings attribute only. The per-shop key reader jobs/service.py:898 JobService._money_rates reads the shop_setting registry, not the env value (comment at :894 says env is never read there).")

add(33, [J+"service.py::JobService._money_rates", J+"service.py::JobService._fuel_rate"], [
    J+"service.py:899-900 effective_int(key=KEY_FUEL_RATE_PAISA_PER_KM)",
    J+"service.py:907-908 effective_int(key=KEY_FUEL_RATE_PAISA_PER_KM)",
], "medium", "Generic registry readers (tenancy/service.py list_effective, effective_int) and the 0040 seed (writes) are not counted as naming this key.")

add(41, [M+"features/jobs/arrival-job/ArrivalAfterVideoScreen.tsx::ArrivalAfterVideoScreen.recordVideo", M+"features/jobs/arrival-job/ArrivalCapturesScreen.tsx::ArrivalCapturesScreen.recordVideo", M+"features/jobs/closeJobWithVideo.ts::closeJobWithVideo"], [
    M+"features/jobs/arrival-job/ArrivalAfterVideoScreen.tsx:53 minMs: config.video.minMs (inside recordVideo, :35)",
    M+"features/jobs/arrival-job/ArrivalCapturesScreen.tsx:122 (inside recordVideo, :104)",
    M+"features/jobs/closeJobWithVideo.ts:60",
], "high", "Nested arrow functions written as Component.inner; the top-level enclosing function is the component.")

add(47, ["src/shared/lib/api.js::apiUrl"], [
    "src/shared/lib/api.js:13 export const apiUrl = import.meta.env.VITE_API_URL ?? ...",
], "high", "Dockerfile.web/Dockerfile.ops only set it.")

# ---------------- migrations_touch_table ----------------
add(6, ["0004", "0012", "0013", "0020"], [
    V+"0004_create_technicians.py:41 create_table technician",
    V+"0012_dedicated_manager_account.py:49 bulk_insert technician, :66 UPDATE technician",
    V+"0013_technician_security.py:33-41 add_column x3",
    V+"0020_tenancy_root.py:93-102 add_column shop_id/language_pref; :106-108 fk_technician_shop + VALIDATE",
], "high", "0032/0033/0030/0035/0039/0040/0042 only declare or validate FKs on other tables that reference technician.")

add(14, ["0027", "0046"], [
    V+"0027_events_outbox.py:81 create_table dispatch_cursor",
    V+"0046_seed_dispatch_cursor.py:57 INSERT INTO dispatch_cursor",
], "high", "")

add(19, ["0006", "0027", "0043", "0044", "0045", "0046"], [
    V+"0006_create_job_event.py:25 create_table",
    V+"0027_events_outbox.py:44-78 add payload/seq, backfill UPDATE, unique seq",
    V+"0043_job_lifecycle_contract.py:52-57 add client_id + partial unique index",
    V+"0044_event_kind_check_and_media_fk.py:83 ADD CONSTRAINT job_event_kind_check NOT VALID",
    V+"0045_validate_event_kind_check.py:49 VALIDATE CONSTRAINT",
    V+"0046_seed_dispatch_cursor.py:58 SELECT MAX(seq) FROM job_event (reads rows)",
], "high", "0046 counted because it reads job_event rows in SQL.")

add(26, ["0001", "0009", "0015", "0032", "0036", "0044"], [
    V+"0001_create_job_media.py:26 create_table",
    V+"0009_media_audio_closing.py:22-31 phase/type check swaps",
    V+"0015_money_guards.py:40 add created_by",
    V+"0032_integrity.py:53-81 add job_uuid/duration, backfill, FK, VALIDATE, index, phase check",
    V+"0036_intake_geo_idempotency.py:54-55 phase check",
    V+"0044_event_kind_check_and_media_fk.py:75 UPDATE job_media backfill",
], "high", "")

add(34, ["0002", "0003", "0018", "0020", "0032", "0033"], [
    V+"0002_create_attendance.py:26 create_table",
    V+"0003_attendance_wifi.py:24-26 add columns",
    V+"0018_presence_confirmed_effective_time.py:64,81,86 effective_time column + index",
    V+"0020_tenancy_root.py:36,106-108 fk_attendance_event_shop + VALIDATE (loop over _SHOP_FK_TABLES)",
    V+"0032_integrity.py:43,87 fk_attendance_event_tech NOT VALID (constraint on attendance_event)",
    V+"0033_validate_tech_fks.py:40,51 VALIDATE fk_attendance_event_tech",
], "high", "")

add(42, ["0021", "0022"], [
    V+"0021_customer.py:32 create_table customer, :63-64 indexes",
    V+"0022_geography.py:92-96 add area_id + fk_customer_area + VALIDATE",
], "high", "0024/0034 and 0021:111 only add FKs on other tables that reference customer.")

add(48, ["0031"], [
    V+"0031_telemetry.py:68 create_table ops_metric_rollup, :85 index",
], "high", "")

# ---------------- route_clients + change_reach (separate file) ----------------
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "part_routes.py"), encoding="utf-8").read())

# ---------------- write ----------------
qs = [json.loads(l) for l in open(sys.argv[1], encoding="utf-8") if l.strip()]
missing = sorted({q["id"] for q in qs} - set(A))
assert len(qs) == 50 and not missing, missing
with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as out:
    for q in qs:
        r = dict(id=q["id"], split=q["split"], kind=q["kind"], reader="tq_second",
                 commit="a31924a3818f4ac94b695906d107c72c912792b2", **A[q["id"]])
        out.write(json.dumps(r, ensure_ascii=False) + "\n")
print("wrote", len(qs))
