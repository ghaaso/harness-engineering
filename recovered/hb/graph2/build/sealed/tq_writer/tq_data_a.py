"""TQ questions 1-25. Answers read from the code at a31924a, never from an extractor."""

M = "technician-app/src/"
B = "backend/app/features/"
V = "backend/alembic/versions/"

Q = []

Q.append(dict(
    id=1, kind="screen_tables", target=M + "features/jobs/create-job/CreateJobWizard.tsx",
    tags=["mobile", "jobs", "customers", "media", "cross-runtime", "many-hop"],
    q="Which tables can the mobile create-job wizard (technician-app/src/features/jobs/create-job/CreateJobWizard.tsx, its submit) end up writing?",
    answer=["job", "job_event", "customer", "customer_phone", "customer_consent_event", "job_media"],
    evidence=[
        ["job", M + "features/jobs/create-job/CreateJobWizard.tsx:160", "sendOrQueue(makeItem kind 'create')"],
        ["job", M + "lib/outboxSync.ts:110", "send(): case 'create' -> jobsApi.create"],
        ["job", M + "lib/jobsApi.ts:246", "POST /api/jobs"],
        ["job", B + "jobs/router.py:102", "create_job route -> JobService.create_job"],
        ["job", B + "jobs/service.py:851", "JobRow(...) -> repo.create (repository.py:142)"],
        ["job_event", B + "jobs/service.py:835", "add_event(kind='create')"],
        ["customer", B + "jobs/service.py:950", "_link_customer -> create_customer_with_phone (consent ticked, no match)"],
        ["customer", "backend/app/features/customers/service.py:123", "record_consent sets customer.whatsapp_opt_in_at"],
        ["customer_phone", "backend/app/features/customers/service.py:145", "session.add(CustomerPhone)"],
        ["customer_consent_event", "backend/app/features/customers/service.py:111", "session.add(CustomerConsentEvent)"],
        ["job_media", M + "features/jobs/create-job/CreateJobWizard.tsx:177", "queueVoiceNotes -> enqueuePendingMedia (103-125)"],
        ["job_media", M + "features/media/pendingMedia.ts:145", "drainPendingMedia -> uploadMedia (drain mounted in technician-app/App.tsx:62)"],
        ["job_media", M + "features/media/uploadMedia.ts:35", "api.requestUpload -> POST /api/jobs/{job_id}/media; completeUpload at :55"],
        ["job_media", "backend/app/features/media/repository.py:44", "session.add(JobMedia); mark_uploaded :94; delete :106"],
    ],
    hops=9,
    naive="Text search from the wizard finds only POST /api/jobs and stops at job/job_event. It misses the customer tables (consent is a boolean in the create body, handled inside JobService._link_customer, not a separate call) and job_media (voice notes ride the pending-media queue, drained from App.tsx). It may wrongly add appliance_unit (backfill script only) or customer_message (the dispatcher is off and is a scheduler path).",
    notes="customer/customer_phone only when whatsapp_consent is ticked, no existing phone match, and the phone is an addressable mobile; customer_consent_event and the customer opt-in update only when consent is ticked; job_media only when a voice note was recorded.",
))

Q.append(dict(
    id=2, kind="tests_reach", target=B + "jobs/repository.py::JobRepository.try_transition",
    tags=["backend", "jobs", "real-vs-fake"],
    q="Which test files reach backend/app/features/jobs/repository.py::JobRepository.try_transition, split into tests that run the real method and tests that replace it with a fake?",
    answer={"real": ["backend/tests/test_jobs_integration.py", "backend/tests/test_catalog_integration.py", "backend/tests/test_messaging_integration.py"],
            "fake": ["backend/app/features/jobs/tests/test_lifecycle.py", "backend/app/features/jobs/tests/test_money_guards.py", "backend/app/features/jobs/tests/test_service.py"]},
    evidence=[
        ["backend/tests/test_jobs_integration.py", "backend/tests/test_jobs_integration.py:166", "POST /transition ready through the real stack"],
        ["backend/tests/test_catalog_integration.py", "backend/tests/test_catalog_integration.py:74", "POST /completion on a carry-in job -> submit_completion -> try_transition (service.py:1321)"],
        ["backend/tests/test_messaging_integration.py", "backend/tests/test_messaging_integration.py:445", "POST /completion on a carry-in job (no address => carry-in, schemas.py:31)"],
        ["backend/app/features/jobs/tests/test_lifecycle.py", "backend/app/features/jobs/tests/test_lifecycle.py:113", "repo.try_transition = AsyncMock(side_effect=...)"],
        ["backend/app/features/jobs/tests/test_money_guards.py", "backend/app/features/jobs/tests/test_money_guards.py:86", "repo.try_transition = AsyncMock"],
        ["backend/app/features/jobs/tests/test_service.py", "backend/app/features/jobs/tests/test_service.py:108", "repo.try_transition = AsyncMock"],
    ],
    hops=4,
    naive="Searching for 'try_transition' finds only the three fake files. The three integration tests never name it: they reach it through POST /completion (carry-in jobs auto-move to ready) or POST /transition. test_router.py replaces the whole JobService and never reaches the repository; test_evidence_gaps.py and test_tech_metrics.py build JobService on a mock repo but never call a path to it.",
    notes="All three real files are pytest.mark.integration and are skipped unless FIXFLOW_TEST_DATABASE_URL is set.",
))

Q.append(dict(
    id=3, kind="invariants_on_file", target=M + "lib/outbox.ts",
    tags=["mobile", "doc", "jobs-outbox"],
    q="Which CLAUDE.md invariants constrain technician-app/src/lib/outbox.ts?",
    answer=["CLAUDE.md:L151", "CLAUDE.md:L154", "CLAUDE.md:L161", "CLAUDE.md:L212"],
    evidence=[
        ["CLAUDE.md:L151", "CLAUDE.md:66", "Offline-engine table maps 'Jobs outbox' to lib/outbox.ts; L151 'Mobile mutations go through the outbox'"],
        ["CLAUDE.md:L154", "CLAUDE.md:154", "'The outbox never deletes a write'; outbox.ts markFailed :203, removeItem :177 used only after success (outboxSync.ts:211)"],
        ["CLAUDE.md:L161", "CLAUDE.md:161", "'the outbox has no mutual exclusion on a stable id'"],
        ["CLAUDE.md:L212", "CLAUDE.md:214", "names removeItem, defined at technician-app/src/lib/outbox.ts:177"],
    ],
    hops=2,
    naive="A search for 'outbox.ts' in CLAUDE.md hits only the table row at line 66, which is not an invariant, so a literal search returns nothing. A search for 'outbox' also pulls the dispatcher section (L231-L246), which is the backend job_event outbox, not this file.",
    notes="L151/L154/L161 via rule (c) (component 'the outbox' -> table row); L212 via rule (b) (removeItem).",
))

Q.append(dict(
    id=4, kind="other_half", target=B + "jobs/service.py::JobService.submit_completion (bill freeze)",
    tags=["backend", "mobile", "jobs", "cross-runtime", "server-to-client"],
    q="The server refuses a completion resubmit once the bill is frozen (bill_sent_at set, negotiated figure set, or a non-voided payment) in backend/app/features/jobs/service.py::JobService.submit_completion. Which client function mirrors those freeze arms so the technician is told before typing?",
    answer=[M + "features/jobs/completionPrefill.ts::freezeReason"],
    evidence=[
        ["server rule", B + "jobs/service.py:1175", "three freeze arms, lines 1176-1195"],
        [M + "features/jobs/completionPrefill.ts::freezeReason", M + "features/jobs/completionPrefill.ts:65", "same three arms in the same order (66-72)"],
        ["consumer", M + "features/jobs/completionPrefill.ts:95", "resolvePrefill sets frozen = freezeReason(...) (also :110)"],
        ["consumer", M + "features/jobs/CompleteJobScreen.tsx:152", "screen shows the frozen banner (273)"],
    ],
    hops=2,
    naive="Searching 'bill_sent_at' on the clients also hits ArrivalJobBillScreen.tsx:439 (a display badge, not the rule) and jobsApi.ts types. wizardState.ts is the other 'client guard' in CLAUDE.md but mirrors a different rule. The web app has no mirror.",
    notes="",
))

Q.append(dict(
    id=5, kind="setting_readers", target="settings.enable_dispatcher (backend/app/core/config.py:188)",
    tags=["backend", "small", "scheduler"],
    q="Which production code reads the backend setting enable_dispatcher (settings.enable_dispatcher, env FIXFLOW_ENABLE_DISPATCHER)?",
    answer=["backend/app/main.py::_lifespan"],
    evidence=[
        ["backend/app/main.py::_lifespan", "backend/app/main.py:200", "gates registration of scheduler job outbox-dispatch-whatsapp"],
        ["backend/app/main.py::_lifespan", "backend/app/main.py:237", "startup log line"],
    ],
    hops=1,
    naive="A text search also hits customer_messaging/service.py:415 (docstring) and config.py:188 (the definition), and CLAUDE.md prose.",
    notes="",
))

Q.append(dict(
    id=6, kind="migrations_touch_table", target="technician",
    tags=["backend", "identity", "hub-table"],
    q="Which Alembic migrations touch the table technician?",
    answer=["0004", "0012", "0013", "0020"],
    evidence=[
        ["0004", V + "0004_create_technicians.py:41", "create_table technician + seed"],
        ["0012", V + "0012_dedicated_manager_account.py:49", "bulk_insert manager row; UPDATE technician at :66"],
        ["0013", V + "0013_technician_security.py:32", "add_column failed_attempts/locked_until/token_version"],
        ["0020", V + "0020_tenancy_root.py:93", "add_column shop_id, language_pref; fk_technician_shop via loop :104 (list :42)"],
    ],
    hops=1,
    naive="grep finds 11 files: 0030, 0035, 0039, 0040, 0042 declare inline FKs that reference technician.id, 0032 adds NOT VALID FKs on other tables pointing at technician, and 0033 validates them. None of those alter technician itself.",
    notes="",
))

Q.append(dict(
    id=7, kind="route_clients", target="POST /api/jobs/{job_id}/transition",
    tags=["web", "mobile", "jobs", "cross-runtime"],
    q="Which client code calls the backend route POST /api/jobs/{job_id}/transition, and which production functions call those call sites directly?",
    answer={"call_sites": ["src/features/jobs/data/jobsApi.js::transitionJob", M + "lib/jobsApi.ts::jobsApi.transition"],
            "via_bff": [],
            "direct_callers": ["src/app/providers/AppContext.jsx::markReady", "src/app/providers/AppContext.jsx::closeJob",
                               "src/app/providers/AppContext.jsx::markWaiting", "src/app/providers/AppContext.jsx::abandonJob",
                               "src/app/providers/AppContext.jsx::haulToShop", "src/app/providers/AppContext.jsx::reschedule",
                               M + "lib/outboxSync.ts::send"]},
    evidence=[
        ["src/features/jobs/data/jobsApi.js::transitionJob", "src/features/jobs/data/jobsApi.js:70", ""],
        [M + "lib/jobsApi.ts::jobsApi.transition", M + "lib/jobsApi.ts:267", ""],
        ["src/app/providers/AppContext.jsx::markReady", "src/app/providers/AppContext.jsx:234", ""],
        ["src/app/providers/AppContext.jsx::closeJob", "src/app/providers/AppContext.jsx:349", ""],
        ["src/app/providers/AppContext.jsx::markWaiting", "src/app/providers/AppContext.jsx:363", ""],
        ["src/app/providers/AppContext.jsx::abandonJob", "src/app/providers/AppContext.jsx:389", ""],
        ["src/app/providers/AppContext.jsx::haulToShop", "src/app/providers/AppContext.jsx:402", ""],
        ["src/app/providers/AppContext.jsx::reschedule", "src/app/providers/AppContext.jsx:415", ""],
        [M + "lib/outboxSync.ts::send", M + "lib/outboxSync.ts:135", "kinds 'ready' (135) and 'transition' (141)"],
    ],
    hops=2,
    naive="closeJobWithVideo.ts:105 mentions 'jobsApi.transition' in a comment only (the close goes through sendOrQueue). Mobile screens never call jobsApi.transition directly; they queue 'transition' or 'ready' outbox items.",
    notes="",
))

Q.append(dict(
    id=8, kind="change_reach", target="backend/app/features/customers/service.py::record_consent",
    tags=["backend", "web", "mobile", "customers", "jobs", "cross-runtime"],
    q="If backend/app/features/customers/service.py::record_consent changes, what can the change reach in each runtime?",
    answer={"backend": ["POST /api/customers/{customer_id}/consent", "POST /api/jobs", "script:backend/scripts/reset_whatsapp_consent.py"],
            "web": ["src/features/jobs/data/jobsApi.js::createJob"],
            "mobile": [M + "lib/jobsApi.ts::jobsApi.create"]},
    evidence=[
        ["POST /api/customers/{customer_id}/consent", "backend/app/features/customers/router.py:66", "post_consent -> record_consent"],
        ["POST /api/jobs", B + "jobs/service.py:958", "_link_customer -> record_consent; via _create_with_next_token :845, create_job :823, router :102"],
        ["script:backend/scripts/reset_whatsapp_consent.py", "backend/scripts/reset_whatsapp_consent.py:94", ""],
        ["src/features/jobs/data/jobsApi.js::createJob", "src/features/jobs/data/jobsApi.js:42", "POST /api/jobs"],
        [M + "lib/jobsApi.ts::jobsApi.create", M + "lib/jobsApi.ts:246", "POST /api/jobs"],
    ],
    hops=6,
    naive="Searching for the consent route finds no client at all (nothing calls /api/customers/{id}/consent), so a route-only search says 'no client reach'. The real reach is the intake: POST /api/jobs with whatsapp_consent. The web toCreateBody never sets whatsapp_consent, so the web path is statically reachable but guarded off by data.",
    notes="Static reach. Data guard: record_consent runs on POST /api/jobs only when whatsapp_consent is true; only the mobile wizard sends it (createJobPayload.ts:78).",
))

Q.append(dict(
    id=9, kind="screen_tables", target="src/features/settings/pages/Settings.jsx",
    tags=["web", "attendance", "naming-trap"],
    q="Which tables can the web Settings page (src/features/settings/pages/Settings.jsx, including the cards it renders) end up writing?",
    answer=["attendance_geofence", "attendance_shift"],
    evidence=[
        ["attendance_geofence", "src/features/settings/components/GeofenceCard.jsx:174", "saveGeofence"],
        ["attendance_geofence", "src/features/attendance/data/attendanceApi.js:95", "PUT /api/attendance/geofences"],
        ["attendance_geofence", B + "attendance/router.py:440", "put_geofence -> AttendanceService.upsert_geofence (service.py:960)"],
        ["attendance_geofence", B + "attendance/repository.py:355", "upsert_geofence add/update"],
        ["attendance_shift", "src/features/settings/components/ShiftsCard.jsx:95", "saveShift"],
        ["attendance_shift", "src/features/attendance/data/attendanceApi.js:109", "PUT /api/attendance/shifts/{tech_id}"],
        ["attendance_shift", B + "attendance/router.py:412", "put_shift -> upsert_shift (service.py:929)"],
        ["attendance_shift", B + "attendance/repository.py:308", "upsert_shift add/update"],
    ],
    hops=7,
    naive="The name 'Settings' points at shop_setting and the /api/shop/settings routes (tenancy). The web never calls those; the page's only writes go through the attendance slice.",
    notes="Settings.jsx itself has no handlers; the workshop-profile form is demo data.",
))

Q.append(dict(
    id=10, kind="tests_reach", target="src/shared/lib/api.js::apiSend",
    tags=["web", "hub", "real-vs-fake", "empty-half"],
    q="Which test files reach the web HTTP helper src/shared/lib/api.js::apiSend, split into tests that run the real function and tests that replace it with a fake?",
    answer={"real": ["src/shared/lib/api.test.js", "src/features/attendance/data/attendanceApi.test.js",
                     "src/features/auth/data/authApi.test.js", "src/features/jobs/data/jobsApi.test.js"],
            "fake": []},
    evidence=[
        ["src/shared/lib/api.test.js", "src/shared/lib/api.test.js:24", "apiSend('/x', 'POST', ...)"],
        ["src/features/attendance/data/attendanceApi.test.js", "src/features/attendance/data/attendanceApi.test.js:62", "createAdjustment (also saveGeofence :85, saveShift :108)"],
        ["src/features/auth/data/authApi.test.js", "src/features/auth/data/authApi.test.js:21", "login -> apiSend"],
        ["src/features/jobs/data/jobsApi.test.js", "src/features/jobs/data/jobsApi.test.js:39", "createJob (and the other write helpers)"],
    ],
    hops=2,
    naive="These tests stub globalThis.fetch, which is not a fake of apiSend. mediaApi.test.js and opsApi.test.js stub fetch too but only call GET helpers (apiGet). AttendanceVariance.test.jsx mocks the attendanceApi module, not api.js, and its page only reads. No test mocks @shared/lib/api.",
    notes="",
))

Q.append(dict(
    id=11, kind="invariants_on_file", target="backend/app/core/security.py",
    tags=["backend", "small", "naming-trap"],
    q="Which CLAUDE.md invariants constrain backend/app/core/security.py?",
    answer=["CLAUDE.md:L134"],
    evidence=[["CLAUDE.md:L134", "CLAUDE.md:134", "names compare_secret and backend/app/core/security.py (defined at security.py:22)"]],
    hops=1,
    naive="The login-lock invariant (L140) is about identity/throttle.py; backend/app/features/identity/security.py is a different security.py (PIN hashing, JWT). A basename match on 'security.py' would wrongly merge them.",
    notes="",
))

Q.append(dict(
    id=12, kind="other_half", target=B + "jobs/service.py::JobService.transition (409 detail)",
    tags=["backend", "web", "mobile", "cross-runtime", "doc-vs-code"],
    q="JobService.transition (backend/app/features/jobs/service.py) rejects a forbidden transition with a 409 whose plain-text detail ends '(current status: X)'. Which client functions extract that detail string from a rejected transition request?",
    answer=["src/app/providers/AppContext.jsx::serverReason", M + "features/jobs/closeJobWithVideo.ts::apiDetail",
            M + "features/jobs/JobDetailScreen.tsx::apiDetail", M + "lib/syncClassification.ts::failureReason"],
    evidence=[
        ["server", B + "jobs/service.py:1133", "JobConflictError(f'cannot {action} this job (current status: ...)')"],
        ["src/app/providers/AppContext.jsx::serverReason", "src/app/providers/AppContext.jsx:229", "used for close (353) and wait (367) transitions"],
        [M + "features/jobs/closeJobWithVideo.ts::apiDetail", M + "features/jobs/closeJobWithVideo.ts:36", "used on 409/400 from the close (119-125)"],
        [M + "features/jobs/JobDetailScreen.tsx::apiDetail", M + "features/jobs/JobDetailScreen.tsx:59", "abandon (337), wait/reschedule/haul (373)"],
        [M + "lib/syncClassification.ts::failureReason", M + "lib/syncClassification.ts:35", "flushOutbox parks queued transition items with this reason (outboxSync.ts:219)"],
    ],
    hops=3,
    naive="Searching for 'current status' finds no client: every client regexes the whole JSON detail (/\"detail\"\\s*:\\s*\"([^\"]+)\"/). That same regex also appears in CreateJobWizard.tsx:169, ArrivalJobWizard.tsx:244 and ArrivalJobBillScreen.tsx:380, which handle create, completion and messaging errors, not transitions.",
    notes="CLAUDE.md L188 says 'three clients regex that string'; the code has four extraction sites on transition paths (one web, three mobile).",
))

Q.append(dict(
    id=13, kind="setting_readers", target="settings.ops_proxy_token (backend/app/core/config.py:173)",
    tags=["backend", "ops", "bff-trap"],
    q="Which production code reads the backend setting ops_proxy_token (settings.ops_proxy_token, env FIXFLOW_OPS_PROXY_TOKEN)?",
    answer=[B + "ops/deps.py::require_ops_proxy_token", B + "ops/health.py::config_presence"],
    evidence=[
        [B + "ops/deps.py::require_ops_proxy_token", B + "ops/deps.py:39", ""],
        [B + "ops/health.py::config_presence", B + "ops/health.py:114", "presence boolean only"],
    ],
    hops=1,
    naive="ops-server.mjs:71 reads OPS_PROXY_TOKEN, a different env variable on the BFF that must hold the same value; it does not read this setting. Tests (ops/tests/test_router.py, test_health.py) set it.",
    notes="",
))

Q.append(dict(
    id=14, kind="migrations_touch_table", target="dispatch_cursor",
    tags=["backend", "jobs", "small"],
    q="Which Alembic migrations touch the table dispatch_cursor?",
    answer=["0027", "0046"],
    evidence=[
        ["0027", V + "0027_events_outbox.py:81", "create_table dispatch_cursor"],
        ["0046", V + "0046_seed_dispatch_cursor.py:57", "INSERT INTO dispatch_cursor"],
    ],
    hops=1,
    naive="Searching file names finds only 0046; 0027 is named 'events_outbox'.",
    notes="",
))

Q.append(dict(
    id=15, kind="route_clients", target="POST /api/customers/{customer_id}/consent",
    tags=["customers", "empty"],
    q="Which client code calls the backend route POST /api/customers/{customer_id}/consent, and which production functions call those call sites directly?",
    answer={"call_sites": [], "via_bff": [], "direct_callers": []},
    evidence=[
        ["route", "backend/app/features/customers/router.py:53", "the route exists"],
        ["no client", M + "features/jobs/create-job/createJobPayload.ts:78", "intake consent travels as whatsapp_consent inside POST /api/jobs instead"],
    ],
    hops=1,
    naive="A search for 'consent' in the clients finds CreateJobWizard.tsx, CreateJobStep4.tsx and createJobPayload.ts, which send consent through POST /api/jobs, not through this route.",
    notes="Only backend/tests/test_messaging_integration.py calls the route.",
))

Q.append(dict(
    id=16, kind="change_reach", target=B + "jobs/service.py::JobService.log_customer_message",
    tags=["backend", "mobile", "jobs", "customer_messaging", "scheduler"],
    q="If backend/app/features/jobs/service.py::JobService.log_customer_message changes, what can the change reach in each runtime?",
    answer={"backend": ["POST /api/messaging/jobs/{job_id}/whatsapp/send-log", "POST /api/messaging/jobs/{job_id}/whatsapp/send",
                        "scheduler:outbox-dispatch-whatsapp"],
            "web": [],
            "mobile": [M + "lib/messagingApi.ts::messagingApi.logSend"]},
    evidence=[
        ["POST /api/messaging/jobs/{job_id}/whatsapp/send-log", "backend/app/features/customer_messaging/router.py:90", "send_log"],
        ["POST /api/messaging/jobs/{job_id}/whatsapp/send", "backend/app/features/customer_messaging/router.py:132", "send, when sent_now"],
        ["scheduler:outbox-dispatch-whatsapp", "backend/app/features/customer_messaging/service.py:479", "build_dispatch_handler.handle; wired in main.py:120, registered main.py:201 (gated by enable_dispatcher)"],
        [M + "lib/messagingApi.ts::messagingApi.logSend", M + "lib/messagingApi.ts:34", ""],
    ],
    hops=4,
    naive="The function lives in the jobs slice but no /api/jobs route calls it, so a slice-local search finds no route. The web app has no messaging client. The Cloud send route has no client caller.",
    notes="",
))

Q.append(dict(
    id=17, kind="screen_tables", target="src/features/schedule/pages/Schedule.jsx",
    tags=["web", "empty", "hub-trap"],
    q="Which tables can the web Schedule page (src/features/schedule/pages/Schedule.jsx) end up writing?",
    answer=[],
    evidence=[
        ["read only", "src/features/schedule/pages/Schedule.jsx:11", "uses only technicians and getJob from useApp"],
        ["demo data", "src/features/schedule/pages/Schedule.jsx:6", "weekDays/assignmentsFor from the local schedule fixture"],
    ],
    hops=2,
    naive="Following 'imports AppContext' pulls in every write AppContext exposes (job, job_event, job_payment ...). The page links to /jobs/:id, which a URL search can mistake for a jobs route call.",
    notes="",
))

Q.append(dict(
    id=18, kind="invariants_on_file", target=B + "jobs/service.py",
    tags=["backend", "jobs", "hub"],
    q="Which CLAUDE.md invariants constrain backend/app/features/jobs/service.py?",
    answer=["CLAUDE.md:L127", "CLAUDE.md:L181", "CLAUDE.md:L191", "CLAUDE.md:L199", "CLAUDE.md:L224",
            "CLAUDE.md:L231", "CLAUDE.md:L239", "CLAUDE.md:L246"],
    evidence=[
        ["CLAUDE.md:L127", "CLAUDE.md:127", "(a) basename service.py"],
        ["CLAUDE.md:L181", "CLAUDE.md:183", "(a)/(b) jobs/service.py, _TRANSITION_FROM (service.py:752), transition()"],
        ["CLAUDE.md:L191", "CLAUDE.md:191", "(b) submit_completion (service.py:1142)"],
        ["CLAUDE.md:L199", B + "jobs/service.py:1175", "(d) the freeze is enforced in submit_completion"],
        ["CLAUDE.md:L224", B + "jobs/service.py:1908", "(d) JobDetail.evidence filled in _detail; None when built without media (777-784)"],
        ["CLAUDE.md:L231", "CLAUDE.md:231", "(b) run_dispatch_once (service.py:459)"],
        ["CLAUDE.md:L239", "CLAUDE.md:239", "(b) run_dispatch_once"],
        ["CLAUDE.md:L246", "CLAUDE.md:246", "(b) log_customer_message (service.py:1403)"],
    ],
    hops=2,
    naive="A search for 'jobs/service.py' finds only L181; 'service.py' adds L127. The dispatcher bullets name only functions, and L199/L224 name columns and a schema field, not the file.",
    notes="L199 and L224 are by rule (d); scorers wanting anchor-only can drop them.",
))

Q.append(dict(
    id=19, kind="migrations_touch_table", target="job_event",
    tags=["backend", "jobs", "outbox"],
    q="Which Alembic migrations touch the table job_event?",
    answer=["0006", "0027", "0043", "0044", "0045", "0046"],
    evidence=[
        ["0006", V + "0006_create_job_event.py:24", "create_table"],
        ["0027", V + "0027_events_outbox.py:43", "payload, seq columns, backfill, unique constraint"],
        ["0043", V + "0043_job_lifecycle_contract.py:51", "client_id column + partial unique index"],
        ["0044", V + "0044_event_kind_check_and_media_fk.py:83", "job_event_kind_check NOT VALID"],
        ["0045", V + "0045_validate_event_kind_check.py:49", "VALIDATE CONSTRAINT"],
        ["0046", V + "0046_seed_dispatch_cursor.py:58", "reads MAX(seq) FROM job_event"],
    ],
    hops=1,
    naive="0034 mentions job_event only in its docstring. 0046 is named for dispatch_cursor but reads job_event; 0044 is named partly for media.",
    notes="",
))

Q.append(dict(
    id=20, kind="route_clients", target="GET /api/ops/health (backend)",
    tags=["web-ops", "ops-bff", "ops", "bff-trap"],
    q="Which client code calls the backend route GET /api/ops/health (the backend deep-health endpoint behind X-Ops-Proxy-Token), and which production functions call those call sites directly?",
    answer={"call_sites": ["ops-server.mjs::backendHealthComponents"],
            "via_bff": ["src/features/ops/data/opsApi.js::getHealth"],
            "direct_callers": ["ops-server.mjs::healthReport"]},
    evidence=[
        ["ops-server.mjs::backendHealthComponents", "ops-server.mjs:348", "backendOps('/api/ops/health'); fetch with X-Ops-Proxy-Token at :323-324"],
        ["ops-server.mjs::healthReport", "ops-server.mjs:365", "Promise.all([... backendHealthComponents()])"],
        ["src/features/ops/data/opsApi.js::getHealth", "src/features/ops/data/opsApi.js:10", "same path, served by the BFF handler at ops-server.mjs:510"],
        ["relative base", "Dockerfile.ops:24", "VITE_API_URL is empty for the ops build, so apiGet hits the BFF origin"],
    ],
    hops=3,
    naive="The web ops console's opsApi.getHealth has the identical path string and looks like a direct backend caller, but the ops build uses relative URLs, so it hits ops-server.mjs, whose /api/ops/health handler builds a merged report and calls the backend itself.",
    notes="Callers of getHealth (Health.jsx:9, Overview.jsx:36) are callers of the BFF route, not listed.",
))

Q.append(dict(
    id=21, kind="screen_tables", target=M + "lib/usePushRegistration.ts::usePushRegistration",
    tags=["mobile", "notifications", "small", "data-guard"],
    q="Which tables can the mobile hook technician-app/src/lib/usePushRegistration.ts::usePushRegistration end up writing?",
    answer=["device_token"],
    evidence=[
        ["device_token", M + "lib/push.ts:37", "registerForPush -> registerDevice"],
        ["device_token", M + "lib/devicesApi.ts:6", "POST /api/devices with body {token, platform} only"],
        ["device_token", B + "notifications/router.py:38", "register_device -> NotificationService.register"],
        ["device_token", B + "notifications/repository.py:66", "upsert_token add/update"],
        ["not device", B + "notifications/service.py:90", "upsert_device runs only when installation_id is sent; the app never sends it"],
    ],
    hops=6,
    naive="NotificationService.register can also upsert the fleet table device, so a call-graph-only answer adds device. The mobile body never carries installation_id.",
    notes="",
))

Q.append(dict(
    id=22, kind="tests_reach", target="backend/app/core/security.py::compare_secret",
    tags=["backend", "ops", "customer_messaging", "real-vs-fake", "empty-half"],
    q="Which test files reach backend/app/core/security.py::compare_secret, split into tests that run the real function and tests that replace it with a fake?",
    answer={"real": ["backend/tests/test_security.py", "backend/app/features/customer_messaging/tests/test_service.py",
                     "backend/app/features/ops/tests/test_router.py", "backend/tests/test_messaging_integration.py"],
            "fake": []},
    evidence=[
        ["backend/tests/test_security.py", "backend/tests/test_security.py:16", "direct calls"],
        ["backend/app/features/customer_messaging/tests/test_service.py", "backend/app/features/customer_messaging/tests/test_service.py:133", "verify_webhook_signature with a sha256= header -> compare_secret (service.py:158)"],
        ["backend/app/features/ops/tests/test_router.py", "backend/app/features/ops/tests/test_router.py:89", "wrong X-Ops-Proxy-Token -> require_ops_proxy_token (deps.py:44); only get_ops_service is overridden (:58)"],
        ["backend/tests/test_messaging_integration.py", "backend/tests/test_messaging_integration.py:332", "webhook GET handshake (router.py:157) and signed POST (:401)"],
    ],
    hops=3,
    naive="Searching 'compare_secret' in tests finds only test_security.py. ops/tests/test_health.py sets ops_proxy_token but only tests config_presence, which never compares.",
    notes="",
))

Q.append(dict(
    id=23, kind="invariants_on_file", target=M + "features/attendance/pingTracker.ts",
    tags=["mobile", "attendance", "privacy"],
    q="Which CLAUDE.md invariants constrain technician-app/src/features/attendance/pingTracker.ts?",
    answer=["CLAUDE.md:L154", "CLAUDE.md:L171"],
    evidence=[
        ["CLAUDE.md:L154", "CLAUDE.md:158", "(c) 'On-duty pings ... deliberately droppable'; table row CLAUDE.md:69 maps pings to pingQueue, pingSync, pingTracker"],
        ["CLAUDE.md:L171", "CLAUDE.md:174", "(a)/(b) pingTracker.ts, dutyStatus (pingTracker.ts:112), maxDutyHours read at :45"],
    ],
    hops=2,
    naive="A literal search for 'pingTracker.ts' finds only L171; the pings exception in L154 names the component, not the file.",
    notes="",
))

Q.append(dict(
    id=24, kind="other_half", target=M + "features/jobs/travelSync.ts::MAX_BATCH",
    tags=["mobile", "backend", "jobs", "client-to-server"],
    q="technician-app/src/features/jobs/travelSync.ts caps each upload at MAX_BATCH = 100, commented as 'the server's per-request cap'. Which server code is the other half of that rule?",
    answer=[B + "jobs/schemas.py::TravelSampleBatch.samples"],
    evidence=[
        ["client", M + "features/jobs/travelSync.ts:24", "MAX_BATCH = 100, used at :48-51 with jobsApi.recordTravelSamples"],
        [B + "jobs/schemas.py::TravelSampleBatch.samples", B + "jobs/schemas.py:304", "Field(..., max_length=100)"],
        ["route", B + "jobs/router.py:463", "POST /{job_id}/travel-samples takes TravelSampleBatch"],
    ],
    hops=3,
    naive="attendance/schemas.py:225 (PingBatch.pings, max_length=100) is the twin cap for pingSync.ts and telemetry/schemas.py:28 has a third 100 cap; a search for 'max_length=100' returns all three.",
    notes="",
))

Q.append(dict(
    id=25, kind="setting_readers", target="settings.labour_rate_paisa (backend/app/core/config.py:90)",
    tags=["backend", "tenancy", "jobs", "small", "doc-trap"],
    q="Which production code reads the backend env setting labour_rate_paisa (settings.labour_rate_paisa, env FIXFLOW_LABOUR_RATE_PAISA)?",
    answer=[V + "0040_shop_settings.py::upgrade"],
    evidence=[
        [V + "0040_shop_settings.py::upgrade", V + "0040_shop_settings.py:79", "seeds the shop_setting row once"],
        ["not a reader", B + "jobs/service.py:898", "_money_rates reads the shop_setting key via effective_int, not the env setting"],
    ],
    hops=1,
    naive="'labour_rate_paisa' is also a job_completion column (jobs/models.py:302), a schema field and a shop_setting key, so a name search returns the billing code. At runtime only the 0040 seed reads the env value; tests (jobs/tests/conftest.py, test_tenancy_integration.py) read it too.",
    notes="",
))
