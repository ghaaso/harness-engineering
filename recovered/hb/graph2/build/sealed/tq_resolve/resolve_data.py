# Resolution decisions, read from the code at a31924a3818f4ac94b695906d107c72c912792b2.
COMMIT = "a31924a3818f4ac94b695906d107c72c912792b2"
NAMING = (" Naming: a function defined inside another function or component is written"
          " path::Outer.inner, naming each enclosing function or component; an object-literal method is"
          " object.method; a field or attribute of a class is given as its class (path::Class).")
NAMING_KINDS = {"other_half", "setting_readers", "route_clients", "change_reach"}
BASENAME_OLD = "(a) names F by path or basename,"
BASENAME_NEW = ("(a) names F by path or basename (a bare basename that names a whole family of"
                " files, such as `models.py` or `index.js`, counts for every file with that basename),")
AP = "src/app/providers/AppContext.jsx::"
NESTED = ["markReady", "closeJob", "markWaiting", "abandonJob", "haulToShop", "reschedule", "serverReason"]
# rename map: writer's bare name -> canonical qualified name
RENAME = {AP + n: AP + "AppProvider." + n for n in NESTED}
RENAME["backend/app/features/jobs/schemas.py::TravelSampleBatch.samples"] = \
    "backend/app/features/jobs/schemas.py::TravelSampleBatch"
RESOLUTION = {
 7: {"kind_of_disagreement": "naming convention (nested function qualification)",
     "decision": "AppProvider.<name> for the six direct callers",
     "why": ("markReady (src/app/providers/AppContext.jsx:231), closeJob (:346), markWaiting (:360), abandonJob (:386),"
             " haulToShop (:399) and reschedule (:412) are useCallback consts declared inside export function AppProvider"
             " (:62, body closes at :485); none is module-level. The bare names do not resolve to a top-level symbol."
             " Qualified form matches the convention both readers already used in Q41 (ArrivalAfterVideoScreen.recordVideo)."
             " Same set of six functions in both readings; only the spelling differed."),
     "evidence": ["src/app/providers/AppContext.jsx:62", "src/app/providers/AppContext.jsx:231",
                  "src/app/providers/AppContext.jsx:346", "src/app/providers/AppContext.jsx:360",
                  "src/app/providers/AppContext.jsx:386", "src/app/providers/AppContext.jsx:399",
                  "src/app/providers/AppContext.jsx:412"],
     "reworded": True},
 12: {"kind_of_disagreement": "naming convention (nested function qualification)",
      "decision": "AppProvider.serverReason",
      "why": ("serverReason is a const arrow function at src/app/providers/AppContext.jsx:229, inside AppProvider (:62-:485)."
              " Same function in both readings."),
      "evidence": ["src/app/providers/AppContext.jsx:62", "src/app/providers/AppContext.jsx:229"],
      "reworded": True},
 18: {"kind_of_disagreement": "rule interpretation (does a generic basename satisfy rule (a))",
      "decision": "include CLAUDE.md:L127",
      "why": ("The L127 bullet (CLAUDE.md:127) says cross-slice access goes through `service.py`/`deps.py`; service.py is the"
              " basename of the target, so rule (a) 'names F by path or basename' holds literally. The question singles out"
              " L127 as counting 'only through (a) or (b)', which presupposes it can count through (a). The second reader"
              " applied a stricter 'names this specific file' reading. Wording clarified for all six invariants_on_file"
              " questions; no other answer changes (no other target's basename is named by L116, L119 or L127)."),
      "evidence": ["CLAUDE.md:127"],
      "reworded": True},
 24: {"kind_of_disagreement": "granularity (class field vs class)",
      "decision": "backend/app/features/jobs/schemas.py::TravelSampleBatch (field-level name accepted as an alias)",
      "why": ("The cap is samples: list[TravelSampleIn] = Field(..., max_length=100) at backend/app/features/jobs/schemas.py:304,"
              " a field of class TravelSampleBatch (:300), which is the body of POST /{job_id}/travel-samples"
              " (backend/app/features/jobs/router.py:463, body param :471). No other server code enforces it. The protocol's"
              " symbol nodes are functions, classes, methods and components, so the class is the finest scoreable symbol;"
              " the question now says fields are given as their class."),
      "evidence": ["backend/app/features/jobs/schemas.py:300", "backend/app/features/jobs/schemas.py:304",
                   "backend/app/features/jobs/router.py:463"],
      "reworded": True},
}
