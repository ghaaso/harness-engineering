"""TQ questions 26-50. Answers read from the code at a31924a, never from an extractor."""

M = "technician-app/src/"
B = "backend/app/features/"
V = "backend/alembic/versions/"

Q = []

Q.append(dict(
    id=26, kind="migrations_touch_table", target="job_media",
    tags=["backend", "media", "hub-table"],
    q="Which Alembic migrations touch the table job_media?",
    answer=["0001", "0009", "0015", "0032", "0036", "0044"],
    evidence=[
        ["0001", V + "0001_create_job_media.py:25", "create_table job_media"],
        ["0009", V + "0009_media_audio_closing.py:22", "drops and recreates job_media phase/type check constraints"],
        ["0015", V + "0015_money_guards.py:40", "add_column created_by on job_media"],
        ["0032", V + "0032_integrity.py:53", "add_column job_uuid/duration_seconds, UPDATE, FK, index, check (53-82)"],
        ["0036", V + "0036_intake_geo_idempotency.py:54", "job_media phase check gains intake (54-55)"],
        ["0044", V + "0044_event_kind_check_and_media_fk.py:75", "UPDATE job_media rows before the FK"],
    ],
    hops=1,
    naive="0007 adds remarks_audio_media_id on job_completion (an id pointing at a job_media row) and matches a search for 'media'; it does not touch job_media.",
    notes="",
))

Q.append(dict(
    id=27, kind="route_clients", target="GET /api/shop/settings and PUT /api/shop/settings/{key}",
    tags=["tenancy", "empty", "naming-trap"],
    q="Which client code calls the backend routes GET /api/shop/settings or PUT /api/shop/settings/{key}, and which production functions call those call sites directly?",
    answer={"call_sites": [], "via_bff": [], "direct_callers": []},
    evidence=[
        ["route", "backend/app/features/tenancy/router.py:33", "router prefix /shop (:27); GET :33, PUT :43"],
        ["no client", "src/features/settings/pages/Settings.jsx", "the web Settings page writes geofences and shifts through the attendance API only"],
    ],
    hops=1,
    naive="The web Settings page and settings/ folder look like the client by name; neither calls /api/shop/settings.",
    notes="Manager-only API with no UI yet.",
))

Q.append(dict(
    id=28, kind="change_reach", target=B + "jobs/service.py::JobService.ref_by_token",
    tags=["backend", "mobile", "jobs", "media", "cross-slice"],
    q="If backend/app/features/jobs/service.py::JobService.ref_by_token changes, what can the change reach in each runtime?",
    answer={"backend": ["POST /api/jobs/{job_id}/media", "DELETE /api/jobs/{job_id}/media/{media_id}"],
            "web": [],
            "mobile": [M + "lib/api.ts::api.requestUpload", M + "lib/api.ts::api.deleteMedia"]},
    evidence=[
        ["POST /api/jobs/{job_id}/media", "backend/app/features/media/router.py:76", "request_upload -> jobs.ref_by_token"],
        ["DELETE /api/jobs/{job_id}/media/{media_id}", B + "jobs/service.py:1727", "status_by_token calls ref_by_token; called from media/router.py:141"],
        [M + "lib/api.ts::api.requestUpload", M + "lib/api.ts:125", "POST .../media"],
        [M + "lib/api.ts::api.deleteMedia", M + "lib/api.ts:143", "DELETE .../media/{id}"],
    ],
    hops=4,
    naive="A search inside the jobs slice finds no jobs route calling it; the callers are in the media router. The web app only GETs media (mediaApi.fetchJobMedia), which does not go through ref_by_token.",
    notes="",
))

Q.append(dict(
    id=29, kind="screen_tables", target=M + "features/attendance/punch.ts::punch (clock_in)",
    tags=["mobile", "attendance", "cross-runtime", "many-hop"],
    q="Which tables can the mobile clock-in action technician-app/src/features/attendance/punch.ts::punch (kind clock_in) end up writing, including what its queues and trackers send later?",
    answer=["attendance_event", "attendance_ping"],
    evidence=[
        ["attendance_event", M + "features/attendance/punch.ts:50", "enqueue punch; syncNow :56"],
        ["attendance_event", M + "features/attendance/sync.ts:136", "recordPunch; completeSelfie :169"],
        ["attendance_event", B + "attendance/service.py:346", "record_punch -> repo.create_event (repository.py:53); complete_selfie -> finalize_selfie (repository.py:117)"],
        ["attendance_ping", M + "features/attendance/punch.ts:54", "startDutyPings"],
        ["attendance_ping", M + "features/attendance/pingTracker.ts:271", "handlePingUpdate -> syncPings"],
        ["attendance_ping", M + "features/attendance/pingSync.ts:42", "attendanceApi.recordPings"],
        ["attendance_ping", B + "attendance/repository.py:248", "create_pings (service.record_pings :447)"],
    ],
    hops=8,
    naive="The geofence presence queue (attendance_presence_event) sits beside punch in the same folder and is a common false add; punch never feeds it. A search that stops at recordPunch misses attendance_ping (the duty-ping tracker starts from punch).",
    notes="",
))

Q.append(dict(
    id=30, kind="tests_reach", target=M + "features/attendance/pingSync.ts::syncPings",
    tags=["mobile", "attendance", "real-vs-fake"],
    q="Which test files reach technician-app/src/features/attendance/pingSync.ts::syncPings, split into tests that run the real function and tests that replace it with a fake?",
    answer={"real": [M + "features/attendance/pingSync.test.ts"],
            "fake": [M + "features/attendance/pingTracker.test.ts"]},
    evidence=[
        [M + "features/attendance/pingSync.test.ts", M + "features/attendance/pingSync.test.ts", "calls syncPings with AsyncStorage and attendanceApi mocked"],
        [M + "features/attendance/pingTracker.test.ts", M + "features/attendance/pingTracker.test.ts:30", "jest.mock('./pingSync'); handlePingUpdate exercised at :105"],
    ],
    hops=2,
    naive="punch.test.ts mocks pingTracker (startDutyPings) and never reaches pingSync.",
    notes="",
))

Q.append(dict(
    id=31, kind="invariants_on_file", target="backend/app/main.py",
    tags=["backend", "small", "scheduler"],
    q="Which CLAUDE.md invariants constrain backend/app/main.py?",
    answer=["CLAUDE.md:L231"],
    evidence=[["CLAUDE.md:L231", "CLAUDE.md:231", "names _MAX_DISPATCH_EVENT_AGE (main.py:94) and main.py"]],
    hops=1,
    naive="The scheduler table names main.py but is not an invariant bullet. L239/L246 describe run_dispatch_once and log_customer_message, which live in jobs/service.py, not main.py.",
    notes="",
))

Q.append(dict(
    id=32, kind="other_half", target=B + "jobs/service.py::JobService.transition (close needs a closing clip)",
    tags=["backend", "mobile", "jobs", "media", "server-to-client"],
    q="JobService.transition (backend/app/features/jobs/service.py) refuses to close a job without its 'closing' handover clip. Which client function is the other half, making sure the clip exists before it sends the close?",
    answer=[M + "features/jobs/closeJobWithVideo.ts::closeJobWithVideo"],
    evidence=[
        ["server rule", B + "jobs/service.py:1094", "close branch checks closing media (1094-1101)"],
        [M + "features/jobs/closeJobWithVideo.ts::closeJobWithVideo", M + "features/jobs/closeJobWithVideo.ts:40", "records and uploads the closing clip (77-84) before queueing the close (111-118)"],
        ["consumer", M + "features/jobs/JobDetailScreen.tsx:303", "also ArrivalJobBillScreen.tsx:288"],
    ],
    hops=2,
    naive="Web AppContext.closeJob sends the close with no clip handling, so a search for 'close' surfaces it, but it does not mirror the rule (the server rejects it and serverReason shows the detail).",
    notes="",
))

Q.append(dict(
    id=33, kind="setting_readers", target="shop_setting key fuel_rate_paisa_per_km",
    tags=["backend", "tenancy", "jobs", "settings-registry"],
    q="Which production code reads the per-shop setting key fuel_rate_paisa_per_km from the shop_setting registry?",
    answer=[B + "jobs/service.py::JobService._money_rates", B + "jobs/service.py::JobService._fuel_rate"],
    evidence=[
        [B + "jobs/service.py::JobService._money_rates", B + "jobs/service.py:899", "effective_int(..., 'fuel_rate_paisa_per_km')"],
        [B + "jobs/service.py::JobService._fuel_rate", B + "jobs/service.py:907", ""],
    ],
    hops=1,
    naive="The key is also declared in tenancy/specs.py (the registry definition, not a read) and seeded by 0040 from the env setting.",
    notes="",
))

Q.append(dict(
    id=34, kind="migrations_touch_table", target="attendance_event",
    tags=["backend", "attendance"],
    q="Which Alembic migrations touch the table attendance_event?",
    answer=["0002", "0003", "0018", "0020", "0032", "0033"],
    evidence=[
        ["0002", V + "0002_create_attendance.py:25", "create_table attendance_event"],
        ["0003", V + "0003_attendance_wifi.py:24", "add_column wifi_bssid/wifi_ssid/wifi_match"],
        ["0018", V + "0018_presence_confirmed_effective_time.py:81", "effective_time column NOT NULL + index (_TABLES :44)"],
        ["0020", V + "0020_tenancy_root.py:36", "in the shop-FK table list: shop_id column + FK"],
        ["0032", V + "0032_integrity.py:42", "fk_attendance_event_tech NOT VALID on attendance_event"],
        ["0033", V + "0033_validate_tech_fks.py:40", "VALIDATE fk_attendance_event_tech"],
    ],
    hops=1,
    naive="0017 mentions attendance_event only in its docstring (it creates attendance_presence_event). 0018 is named for presence but also alters attendance_event.",
    notes="",
))

Q.append(dict(
    id=35, kind="route_clients", target="POST /api/jobs/{job_id}/media",
    tags=["mobile", "media", "method-trap"],
    q="Which client code calls the backend route POST /api/jobs/{job_id}/media, and which production functions call those call sites directly?",
    answer={"call_sites": [M + "lib/api.ts::api.requestUpload"],
            "via_bff": [],
            "direct_callers": [M + "features/media/uploadMedia.ts::uploadMedia"]},
    evidence=[
        [M + "lib/api.ts::api.requestUpload", M + "lib/api.ts:125", "POST"],
        [M + "features/media/uploadMedia.ts::uploadMedia", M + "features/media/uploadMedia.ts:35", ""],
    ],
    hops=2,
    naive="Web mediaApi.fetchJobMedia uses the same path with GET; a path-only match counts it.",
    notes="",
))

Q.append(dict(
    id=36, kind="change_reach", target=B + "attendance/service.py::AttendanceService.verify_ledger_chain",
    tags=["backend", "attendance", "small", "no-client"],
    q="If backend/app/features/attendance/service.py::AttendanceService.verify_ledger_chain changes, what can the change reach in each runtime?",
    answer={"backend": ["GET /api/attendance/ledger/verify"], "web": [], "mobile": []},
    evidence=[
        ["GET /api/attendance/ledger/verify", B + "attendance/router.py:533", "verify_ledger (533-546)"],
        ["definition", B + "attendance/service.py:1386", ""],
    ],
    hops=1,
    naive="The web ledger pages call other /api/attendance/ledger routes, so a prefix match adds them; none calls /verify.",
    notes="",
))

Q.append(dict(
    id=37, kind="screen_tables", target=M + "features/jobs/arrival-job/ArrivalJobBillScreen.tsx",
    tags=["mobile", "jobs", "media", "customer_messaging", "cross-runtime", "many-hop"],
    q="Which tables can the mobile bill screen technician-app/src/features/jobs/arrival-job/ArrivalJobBillScreen.tsx end up writing?",
    answer=["job", "job_event", "job_payment", "job_media"],
    evidence=[
        ["job", M + "features/jobs/arrival-job/ArrivalJobBillScreen.tsx:173", "negotiate -> negotiate_bill sets bill_negotiated_paisa (service.py:1381-1401)"],
        ["job_payment", M + "features/jobs/arrival-job/ArrivalJobBillScreen.tsx:254", "payment -> log_payment (service.py:1437-1487)"],
        ["job_media", M + "features/jobs/arrival-job/ArrivalJobBillScreen.tsx:288", "close -> closeJobWithVideo -> uploadMedia"],
        ["job_event", M + "features/jobs/arrival-job/ArrivalJobBillScreen.tsx:371", "send-log -> log_customer_message adds job_event and sets job.bill_sent_at"],
    ],
    hops=6,
    naive="The WhatsApp send-log path suggests customer_message, but log_customer_message writes job_event and job.bill_sent_at; customer_message is written only by the dispatcher.",
    notes="job is also updated by the close transition.",
))

Q.append(dict(
    id=38, kind="tests_reach", target=M + "features/media/uploadMedia.ts::uploadMedia",
    tags=["mobile", "media", "real-vs-fake"],
    q="Which test files reach technician-app/src/features/media/uploadMedia.ts::uploadMedia, split into tests that run the real function and tests that replace it with a fake?",
    answer={"real": [M + "features/media/uploadMedia.test.ts"],
            "fake": [M + "features/media/pendingMedia.test.ts"]},
    evidence=[
        [M + "features/media/uploadMedia.test.ts", M + "features/media/uploadMedia.test.ts", "calls uploadMedia with api and fetch mocked"],
        [M + "features/media/pendingMedia.test.ts", M + "features/media/pendingMedia.test.ts:35", "jest.mock of uploadMedia; drainPendingMedia exercised at :85"],
    ],
    hops=2,
    naive="closeJobWithVideo has no test file (no screen harness), so a search that guesses callers' tests finds nothing more; a search for 'uploadMedia' in tests finds both files but cannot tell real from fake without reading the mock.",
    notes="",
))

Q.append(dict(
    id=39, kind="invariants_on_file", target="src/features/jobs/pages/JobDetail.jsx",
    tags=["web", "empty", "naming-trap"],
    q="Which CLAUDE.md invariants constrain the web page src/features/jobs/pages/JobDetail.jsx?",
    answer=[],
    evidence=[["trap", "CLAUDE.md:224", "'JobDetail.evidence' names the backend response schema (jobs/schemas.py JobDetail), not the web page"]],
    hops=1,
    naive="A name search for 'JobDetail' hits L224, which is about the backend schema class JobDetail and its mobile consumers.",
    notes="",
))

Q.append(dict(
    id=40, kind="other_half", target=B + "jobs/schemas.py::JobDetail.evidence",
    tags=["backend", "mobile", "jobs", "server-to-client"],
    q="The server returns per-phase evidence counts on JobDetail.evidence (backend/app/features/jobs/schemas.py, filled in JobService._detail) so a client can resume without re-demanding evidence. Which client function consumes those counts for that purpose?",
    answer=[M + "features/jobs/arrival-job/arrivalDraft.ts::evidenceSatisfiesCaptures"],
    evidence=[
        ["server", B + "jobs/service.py:1908", "_detail fills evidence (1908-1916); schemas.py:448 JobDetail.evidence, EvidenceCounts :371"],
        [M + "features/jobs/arrival-job/arrivalDraft.ts::evidenceSatisfiesCaptures", M + "features/jobs/arrival-job/arrivalDraft.ts:94", ""],
        ["consumer", M + "features/jobs/arrival-job/ArrivalJobWizard.tsx:134", ""],
    ],
    hops=2,
    naive="The web evidence-gaps report (fetchEvidenceGaps) is a different endpoint about missing evidence, not this field.",
    notes="",
))

Q.append(dict(
    id=41, kind="setting_readers", target=M + "config: config.video.minMs",
    tags=["mobile", "jobs", "media"],
    q="Which production code in the mobile app reads config.video.minMs (the minimum video length)?",
    answer=[M + "features/jobs/arrival-job/ArrivalAfterVideoScreen.tsx::ArrivalAfterVideoScreen.recordVideo",
            M + "features/jobs/arrival-job/ArrivalCapturesScreen.tsx::ArrivalCapturesScreen.recordVideo",
            M + "features/jobs/closeJobWithVideo.ts::closeJobWithVideo"],
    evidence=[
        [M + "features/jobs/arrival-job/ArrivalAfterVideoScreen.tsx::ArrivalAfterVideoScreen.recordVideo", M + "features/jobs/arrival-job/ArrivalAfterVideoScreen.tsx:53", ""],
        [M + "features/jobs/arrival-job/ArrivalCapturesScreen.tsx::ArrivalCapturesScreen.recordVideo", M + "features/jobs/arrival-job/ArrivalCapturesScreen.tsx:122", ""],
        [M + "features/jobs/closeJobWithVideo.ts::closeJobWithVideo", M + "features/jobs/closeJobWithVideo.ts:60", ""],
    ],
    hops=1,
    naive="A search for 'minMs' also hits the config definition and maxMs neighbours.",
    notes="",
))

Q.append(dict(
    id=42, kind="migrations_touch_table", target="customer",
    tags=["backend", "customers", "naming-trap"],
    q="Which Alembic migrations touch the table customer?",
    answer=["0021", "0022"],
    evidence=[
        ["0021", V + "0021_customer.py:31", "create_table customer"],
        ["0022", V + "0022_geography.py:92", "add_column area_id + fk_customer_area on customer (92-96)"],
    ],
    hops=1,
    naive="'customer' is a substring of customer_phone, customer_message, customer_consent_event and of job columns such as customer_name_raw, so a text search adds 0005, 0024, 0034, 0036, 0037, 0043 and 0046; others only declare FKs to customer.",
    notes="",
))

Q.append(dict(
    id=43, kind="route_clients", target="GET /api/attendance/grid",
    tags=["web", "attendance", "comment-trap"],
    q="Which client code calls the backend route GET /api/attendance/grid, and which production functions call those call sites directly?",
    answer={"call_sites": ["src/features/attendance/data/attendanceApi.js::fetchGrid"],
            "via_bff": [],
            "direct_callers": ["src/features/attendance/hooks/useAttendanceData.js::useAttendanceData",
                               "src/features/technicians/pages/TechnicianDetail.jsx::TechnicianDetail"]},
    evidence=[
        ["src/features/attendance/data/attendanceApi.js::fetchGrid", "src/features/attendance/data/attendanceApi.js:24", ""],
        ["src/features/attendance/hooks/useAttendanceData.js::useAttendanceData", "src/features/attendance/hooks/useAttendanceData.js:29", ""],
        ["src/features/technicians/pages/TechnicianDetail.jsx::TechnicianDetail", "src/features/technicians/pages/TechnicianDetail.jsx:50", "cross-slice through the attendance barrel"],
    ],
    hops=2,
    naive="MonthDots.jsx:3 mentions the path in a comment only.",
    notes="",
))

Q.append(dict(
    id=44, kind="change_reach", target="backend/app/features/tenancy/service.py::effective_int",
    tags=["backend", "web", "mobile", "tenancy", "hub", "cross-runtime"],
    q="If backend/app/features/tenancy/service.py::effective_int changes, what can the change reach in each runtime?",
    answer={"backend": [
        "GET /api/jobs/{job_id}", "POST /api/jobs/{job_id}/notes", "POST /api/jobs/{job_id}/followups",
        "POST /api/jobs/{job_id}/transition", "POST /api/jobs/{job_id}/assign", "POST /api/jobs/{job_id}/claim",
        "POST /api/jobs/{job_id}/completion", "POST /api/jobs/{job_id}/bill/negotiate", "POST /api/jobs/{job_id}/payments",
        "POST /api/jobs/{job_id}/payments/{payment_id}/void", "POST /api/jobs/{job_id}/locations",
        "POST /api/jobs/{job_id}/customer-pin", "POST /api/jobs/{job_id}/travel-samples",
        "GET /api/messaging/jobs/{job_id}/whatsapp/preview", "POST /api/messaging/jobs/{job_id}/whatsapp/send-log",
        "POST /api/messaging/jobs/{job_id}/whatsapp/send", "scheduler:outbox-dispatch-whatsapp"],
        "web": ["src/features/jobs/data/jobsApi.js::fetchJob", "src/features/jobs/data/jobsApi.js::addJobNote",
                "src/features/jobs/data/jobsApi.js::addJobFollowup", "src/features/jobs/data/jobsApi.js::transitionJob",
                "src/features/jobs/data/jobsApi.js::assignJob", "src/features/jobs/data/jobsApi.js::submitCompletion",
                "src/features/jobs/data/jobsApi.js::negotiateBill", "src/features/jobs/data/jobsApi.js::logPayment",
                "src/features/jobs/data/jobsApi.js::voidPayment"],
        "mobile": [M + "lib/jobsApi.ts::jobsApi.get", M + "lib/jobsApi.ts::jobsApi.claim", M + "lib/jobsApi.ts::jobsApi.assign",
                   M + "lib/jobsApi.ts::jobsApi.addNote", M + "lib/jobsApi.ts::jobsApi.transition",
                   M + "lib/jobsApi.ts::jobsApi.submitCompletion", M + "lib/jobsApi.ts::jobsApi.negotiateBill",
                   M + "lib/jobsApi.ts::jobsApi.logPayment", M + "lib/jobsApi.ts::jobsApi.voidPayment",
                   M + "lib/jobsApi.ts::jobsApi.recordLocation", M + "lib/jobsApi.ts::jobsApi.recordTravelSamples",
                   M + "lib/jobsApi.ts::jobsApi.setCustomerPin", M + "lib/messagingApi.ts::messagingApi.preview",
                   M + "lib/messagingApi.ts::messagingApi.logSend"]},
    evidence=[
        ["hub path", B + "jobs/service.py:907", "_fuel_rate -> effective_int; _money_rates :899"],
        ["hub path", B + "jobs/service.py:1953", "_detail always calls _fuel_rate, so every route returning a JobDetail reaches it"],
        ["POST /api/jobs/{job_id}/travel-samples", B + "jobs/service.py:1711", "record_travel_samples -> _fuel_rate"],
        ["scheduler:outbox-dispatch-whatsapp", "backend/app/features/customer_messaging/service.py:479", "handle -> get_job -> _detail"],
        ["not reached", B + "jobs/router.py", "GET /api/jobs (list), POST /api/jobs, evidence-gaps, tech-metrics, GET travel-samples do not build a JobDetail"],
    ],
    hops=5,
    naive="effective_int is called by name only in jobs/service.py (_money_rates, _fuel_rate), so a one-hop search names a couple of billing routes. The reach is wide because _detail calls _fuel_rate on every detail response.",
    notes="A hub question: exact answers need the full transitive closure through _detail.",
))

Q.append(dict(
    id=45, kind="tests_reach", target="src/features/attendance/data/attendanceApi.js::fetchVariance",
    tags=["web", "attendance", "real-vs-fake", "empty-half"],
    q="Which test files reach src/features/attendance/data/attendanceApi.js::fetchVariance, split into tests that run the real function and tests that replace it with a fake?",
    answer={"real": [], "fake": ["src/features/attendance/pages/AttendanceVariance.test.jsx"]},
    evidence=[
        ["src/features/attendance/pages/AttendanceVariance.test.jsx", "src/features/attendance/pages/AttendanceVariance.test.jsx:13", "vi.mock of the attendanceApi module (13-14)"],
        ["no real", "src/features/attendance/data/attendanceApi.test.js", "covers write helpers, not fetchVariance"],
    ],
    hops=2,
    naive="attendanceApi.test.js tests the same module and looks like a real test of every function in it.",
    notes="",
))

Q.append(dict(
    id=46, kind="other_half", target="backend/app/features/identity/throttle.py (per-account login lock, 429 + Retry-After)",
    tags=["backend", "web", "mobile", "identity", "empty"],
    q="The backend per-account login lock (backend/app/features/identity/throttle.py) answers a locked login with 429 and a Retry-After header (identity/router.py). Which client function handles that response as a lock (for example showing the wait)?",
    answer=[],
    evidence=[
        ["server", B + "identity/router.py:76", "429 + Retry-After (76-90)"],
        ["no mirror", "src/features/auth/pages/Login.jsx:35", "every failure becomes 'Wrong PIN'"],
        ["no mirror", M + "features/auth/LoginScreen.tsx:55", "every failure becomes 'Wrong PIN' (55-56)"],
    ],
    hops=2,
    naive="The login screens on both clients catch the error, so a search for the login call finds them, but neither reads the status or Retry-After.",
    notes="",
))

Q.append(dict(
    id=47, kind="setting_readers", target="VITE_API_URL",
    tags=["web", "web-ops", "small", "setter-trap"],
    q="Which production code reads the build-time variable VITE_API_URL?",
    answer=["src/shared/lib/api.js::apiUrl"],
    evidence=[
        ["src/shared/lib/api.js::apiUrl", "src/shared/lib/api.js:13", "import.meta.env.VITE_API_URL"],
        ["setter only", "Dockerfile.web:30", "sets it (30-32); Dockerfile.ops:24 sets it empty"],
    ],
    hops=1,
    naive="The Dockerfiles and .env examples name it but only set it.",
    notes="",
))

Q.append(dict(
    id=48, kind="migrations_touch_table", target="ops_metric_rollup",
    tags=["backend", "telemetry", "small"],
    q="Which Alembic migrations touch the table ops_metric_rollup?",
    answer=["0031"],
    evidence=[["0031", V + "0031_telemetry.py:68", "create_table ops_metric_rollup (68-85)"]],
    hops=1,
    naive="The scheduler job 'ops-metric-rollup' and the ops slice share the name; neither is a migration.",
    notes="",
))

Q.append(dict(
    id=49, kind="route_clients", target="GET /api/catalog/fault-codes",
    tags=["mobile", "catalog", "static-data-trap"],
    q="Which client code calls the backend route GET /api/catalog/fault-codes, and which production functions call those call sites directly?",
    answer={"call_sites": [M + "lib/catalogApi.ts::catalogApi.faultCodes"],
            "via_bff": [],
            "direct_callers": [M + "features/jobs/arrival-job/ArrivalJobStep3.tsx::ArrivalJobStep3"]},
    evidence=[
        [M + "lib/catalogApi.ts::catalogApi.faultCodes", M + "lib/catalogApi.ts:52", ""],
        [M + "features/jobs/arrival-job/ArrivalJobStep3.tsx::ArrivalJobStep3", M + "features/jobs/arrival-job/ArrivalJobStep3.tsx:31", ""],
    ],
    hops=2,
    naive="The web troubleshooting/data/faultCodes.js is static data with the same name and calls no route.",
    notes="",
))

Q.append(dict(
    id=50, kind="change_reach", target=B + "notifications/service.py::NotificationService.notify_assignment",
    tags=["backend", "web", "mobile", "notifications", "jobs"],
    q="If backend/app/features/notifications/service.py::NotificationService.notify_assignment changes, what can the change reach in each runtime?",
    answer={"backend": ["POST /api/jobs/{job_id}/assign"],
            "web": ["src/features/jobs/data/jobsApi.js::assignJob"],
            "mobile": [M + "lib/jobsApi.ts::jobsApi.assign"]},
    evidence=[
        ["POST /api/jobs/{job_id}/assign", B + "jobs/router.py:243", "assign route calls notify_assignment after the service call"],
        ["src/features/jobs/data/jobsApi.js::assignJob", "src/features/jobs/data/jobsApi.js:51", "POST .../assign"],
        [M + "lib/jobsApi.ts::jobsApi.assign", M + "lib/jobsApi.ts:252", "defined; no caller in the mobile app"],
    ],
    hops=2,
    naive="The claim route looks like an assignment but does not notify. jobsApi.assign has no callers, which a caller-based search drops.",
    notes="",
))
