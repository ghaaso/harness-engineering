# Part 3 of the second reading: route_clients and change_reach. exec'd by build_answers.py.

AC = "src/app/providers/AppContext.jsx::AppProvider."
add(7, {"call_sites": ["src/features/jobs/data/jobsApi.js::transitionJob", M+"lib/jobsApi.ts::jobsApi.transition"],
        "via_bff": [],
        "direct_callers": [AC+"markReady", AC+"closeJob", AC+"markWaiting", AC+"abandonJob", AC+"haulToShop", AC+"reschedule", M+"lib/outboxSync.ts::send"]}, [
    "src/features/jobs/data/jobsApi.js:70 transitionJob",
    M+"lib/jobsApi.ts:267-273 jobsApi.transition",
    "src/app/providers/AppContext.jsx:234,349,363,389,402,415 useCallback bodies call transitionJob",
    M+"lib/outboxSync.ts:135,141 send() cases 'ready' and 'transition'",
], "high", "AppContext callers are useCallback consts inside AppProvider, written AppProvider.<name>.")

add(15, {"call_sites": [], "via_bff": [], "direct_callers": []}, [
    M+"lib/customersApi.ts:20 only GET /api/customers/lookup; no client references /consent",
], "high", "Consent is only written through the intake chip (POST /api/jobs whatsapp_consent).")

add(20, {"call_sites": ["ops-server.mjs::backendHealthComponents"], "via_bff": ["src/features/ops/data/opsApi.js::getHealth"], "direct_callers": ["ops-server.mjs::healthReport"]}, [
    "ops-server.mjs:348 backendOps('/api/ops/health') inside backendHealthComponents; transport fetch at :323 in backendOps",
    "ops-server.mjs:364 healthReport calls backendHealthComponents",
    "src/features/ops/data/opsApi.js:10 getHealth -> apiGet('/api/ops/health') served by ops-server.mjs:510",
], "medium", "Call site taken as the function holding the path literal; backendOps (generic transport, also used for metrics) could be listed too.")

add(27, {"call_sites": [], "via_bff": [], "direct_callers": []}, [
    F+"tenancy/router.py:27-43 routes exist; no /api/shop reference in src/, technician-app/src or ops-server.mjs",
], "high", "")

add(35, {"call_sites": [M+"lib/api.ts::api.requestUpload"], "via_bff": [], "direct_callers": [M+"features/media/uploadMedia.ts::uploadMedia"]}, [
    M+"lib/api.ts:125-126 requestUpload POST /api/jobs/{id}/media",
    M+"features/media/uploadMedia.ts:35 api.requestUpload",
], "high", "Web mediaApi.js:16 only GETs the same path.")

add(43, {"call_sites": ["src/features/attendance/data/attendanceApi.js::fetchGrid"], "via_bff": [], "direct_callers": ["src/features/attendance/hooks/useAttendanceData.js::useAttendanceData", "src/features/technicians/pages/TechnicianDetail.jsx::TechnicianDetail"]}, [
    "src/features/attendance/data/attendanceApi.js:24-27 fetchGrid",
    "src/features/attendance/hooks/useAttendanceData.js:29 (useEffect inside useAttendanceData)",
    "src/features/technicians/pages/TechnicianDetail.jsx:50 (useEffect inside TechnicianDetail)",
], "high", "")

add(49, {"call_sites": [M+"lib/catalogApi.ts::catalogApi.faultCodes"], "via_bff": [], "direct_callers": [M+"features/jobs/arrival-job/ArrivalJobStep3.tsx::ArrivalJobStep3"]}, [
    M+"lib/catalogApi.ts:52-53 faultCodes",
    M+"features/jobs/arrival-job/ArrivalJobStep3.tsx:31 (async IIFE in useEffect of ArrivalJobStep3)",
], "high", "Web troubleshooting faultCodes is a static data file, not an API call.")

# ---------------- change_reach ----------------
add(8, {"backend": ["POST /api/customers/{customer_id}/consent", "POST /api/jobs", "script:backend/scripts/reset_whatsapp_consent.py"],
        "web": ["src/features/jobs/data/jobsApi.js::createJob"],
        "mobile": [M+"lib/jobsApi.ts::jobsApi.create"]}, [
    F+"customers/router.py:53-66 post_consent -> record_consent",
    J+"service.py:958 _link_customer -> record_consent; :845 _create_with_next_token; :823 create_job; router.py:96-102 POST ''",
    "backend/scripts/reset_whatsapp_consent.py:94 record_consent",
    "src/features/jobs/data/jobsApi.js:43; technician-app/src/lib/jobsApi.ts:246-247",
], "high", "")

JR = "/api/jobs/{job_id}"
add(16, {"backend": ["POST /api/messaging/jobs/{job_id}/whatsapp/send", "POST /api/messaging/jobs/{job_id}/whatsapp/send-log", "scheduler:outbox-dispatch-whatsapp"],
         "web": [], "mobile": [M+"lib/messagingApi.ts::messagingApi.logSend"]}, [
    F+"customer_messaging/router.py:90 send_log, :132 send",
    F+"customer_messaging/service.py:479 dispatch handler; main.py:121-128 _run_whatsapp_dispatch, registered main.py:201-206",
    M+"lib/messagingApi.ts:35",
], "high", "No web code calls /api/messaging; no client calls /whatsapp/send.")

add(28, {"backend": ["DELETE " + JR + "/media/{media_id}", "POST " + JR + "/media"], "web": [],
         "mobile": [M+"lib/api.ts::api.deleteMedia", M+"lib/api.ts::api.requestUpload"]}, [
    F+"media/router.py:76 request_upload -> ref_by_token",
    F+"media/router.py:141 delete_media -> status_by_token -> jobs/service.py:1727 ref_by_token",
    M+"lib/api.ts:125,143",
], "high", "Web mediaApi.js only GETs media.")

add(36, {"backend": ["GET /api/attendance/ledger/verify"], "web": [], "mobile": []}, [
    F+"attendance/router.py:533-546 verify_ledger_chain route",
], "high", "No client references ledger/verify.")

JB = [JR+"/assign", JR+"/bill/negotiate", JR+"/claim", JR+"/completion", JR+"/customer-pin", JR+"/followups",
      JR+"/locations", JR+"/notes", JR+"/payments", JR+"/payments/{payment_id}/void", JR+"/transition", JR+"/travel-samples"]
MS = "/api/messaging/jobs/{job_id}/whatsapp/"
add(44, {"backend": ["GET " + JR] + ["POST " + p for p in JB] + ["GET " + MS + "preview", "POST " + MS + "send", "POST " + MS + "send-log", "scheduler:outbox-dispatch-whatsapp"],
         "web": ["src/features/jobs/data/jobsApi.js::" + n for n in ["addJobFollowup", "addJobNote", "assignJob", "fetchJob", "logPayment", "negotiateBill", "submitCompletion", "transitionJob", "voidPayment"]],
         "mobile": [M+"lib/jobsApi.ts::jobsApi." + n for n in ["addNote", "assign", "claim", "get", "logPayment", "negotiateBill", "recordLocation", "recordTravelSamples", "setCustomerPin", "submitCompletion", "transition", "voidPayment"]]
                   + [M+"lib/messagingApi.ts::messagingApi.logSend", M+"lib/messagingApi.ts::messagingApi.preview"]}, [
    F+"tenancy/service.py:114 effective_int; only callers jobs/service.py:898-908 (_money_rates, _fuel_rate)",
    J+"service.py:1216 submit_completion -> _money_rates; :1711 record_travel_samples -> _fuel_rate; :1953 _detail -> _fuel_rate",
    J+"service.py _detail is called by get_job, add_note, assign_job, claim_job, transition, submit_completion, negotiate_bill, log_customer_message, log_payment, void_payment, record_location, set_customer_pin",
    F+"customer_messaging/router.py:66,90,122,132 get_job / log_customer_message; customer_messaging/service.py:462 handler get_job (scheduler)",
], "medium", "Static reach through JobService._detail (route fuel preview) fans out to every route returning a JobDetail. POST /api/jobs, GET /api/jobs, GET travel-samples, evidence-gaps and tech-metrics do not reach it.")

add(50, {"backend": ["POST " + JR + "/assign"], "web": ["src/features/jobs/data/jobsApi.js::assignJob"], "mobile": [M+"lib/jobsApi.ts::jobsApi.assign"]}, [
    J+"router.py:243 assign route -> notifications.notify_assignment (only caller)",
    "src/features/jobs/data/jobsApi.js:52; technician-app/src/lib/jobsApi.ts:252-253",
], "high", "")
