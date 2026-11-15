import fs from 'fs';
const a=JSON.parse(fs.readFileSync('inv.json','utf8'));
const C={ '6790d8':['unclear','unclear','Untitled session; first prompt is a lone "."; no cost-state.'],
'7f348b':['harness-meta','design','Orchestration design v3 for the FixFlow ship program; prompt pastes the harness design and asks to prune a bloated clinic folder.'],
'cb58bd':['clinic-testbed','design','Reconciling the October clinic notebook into the technical plan for the clinic inventory app.'],
'dfe1ea':['clinic-testbed','implementation','S00 baseline: toolchain and project skeleton for the Django clinic app.'],
'903f58':['clinic-testbed','implementation','S05 slice: stock count, investigate, correct, reverse.'],
'df1db0':['clinic-testbed','implementation','Faster check: parallel tests and non-durable test DB for the clinic build.'],
'b9ceba':['clinic-testbed','implementation','Posting follow-ups parked until cutoff guards merge; clinic follow-up slice.'],
'9ae029':['clinic-testbed','implementation','Polish follow-up: templates, wording, navigation of clinic app.'],
'96abd7':['clinic-testbed','implementation','Query follow-up: money and overview pages at volume.'],
'bf7694':['clinic-testbed','implementation','People follow-up parked until cutoff guards merge.'],
'3aa7e5':['clinic-testbed','implementation','S03 slice: purchase request, approval, receiving.'],
'16a65b':['clinic-testbed','implementation','S02 slice: atomic posting, journal, idempotency foundations.'],
'b70a43':['clinic-testbed','implementation','S09 slice: doctor overview, drill-down, exports.'],
'cf8bc8':['clinic-testbed','design','UI/UX design pass over every built clinic screen.'],
'da4e55':['clinic-testbed','ops-deploy','Local staging VM and rehearsal rig preparing S11.'],
'b8d255':['clinic-testbed','implementation','Identity follow-up: lockout, hashing, landing page.'],
'733bc5':['clinic-testbed','implementation','S07 slice: expenses, cash receipts, transfers, cash close.'],
'1c7937':['clinic-testbed','implementation','S08 slice: restricted payroll information.'],
'97380a':['clinic-testbed','implementation','Opening cutoff guards and paying opening pay.'],
'9fb553':['clinic-testbed','implementation','S07 follow-up: withhold salary funding on money screens.'],
'2d86c8':['clinic-testbed','ops-deploy','S11: deployment, restore and upgrade proof on the rig.'],
'43eb0a':['clinic-testbed','implementation','Retire the prototype screen mechanism in the clinic app.'],
'65fe4c':['clinic-testbed','implementation','S06 slice: supplier invoices, partial payments, return settlement.'],
'eb18b4':['clinic-testbed','implementation','S10 slice: trial import, openings, source ownership.'],
'a9b52f':['clinic-testbed','implementation','S04 slice: issue actual stock with bill and reference linkage.'],
'efb9a0':['clinic-testbed','implementation','S01 slice: named access and catalogue with exact units.'],
'f59bdc':['clinic-testbed','implementation','Pilot readiness: real-data switch default off.'],
'7b3031':['clinic-testbed','implementation','Linux test runner: tests beside the database.'],
'feb61c':['clinic-testbed','implementation','Kernel follow-up parked until cutoff guards merge.'],
'9bc505':['clinic-testbed','design','UI track: four-region screen forest for later slices.'],
'019355':['harness-meta','research','Context admission controls research: which shipped context system for Claude Code, judged against a failed loop.'],
'092a93':['harness-meta','research','Corpus dependency map research: method for mapping a markdown plan corpus.'],
'186f2b':['unrelated','mixed','Resumed continuation of the three-project-deck workflow (presentation on three projects); shares cost-state with 3b820b.'],
'1f1083':['harness-meta','research','Review of the agentic coding and tasks folders with a planned workflow before opining.'],
'2d4435':['harness-meta','design','Justification pass design framework for the corpus-map method; pilot-files parameters.'],
'3b820b':['unrelated','mixed','Three-project-deck workflow: presentation covering three projects (washing-machine control panel etc.).'],
'6c9a1a':['harness-meta','mixed','Session state: continues corpus-map-justification via SESSION_STATE.md with a workflow of 122 subagents.'],
'828628':['clinic-testbed','design','PDF of architecture, networking, user and function flow of the clinic implementation plan.'],
'9fc718':['unrelated','unclear','Quiz prep from lecture slides with visual learning; coursework.'],
'd3e9a8':['unrelated','design','Defining a workflow for designing a presentation covering three projects.'],
'e56a90':['clinic-testbed','review-verify','MD Health Clinic project review: reason over implementation plan and architecture for suitability.']};
let tot=0;
const sessions=a.map(s=>{const k=C[s.sid.slice(0,6)];if(!k)throw s.sid;
 let usd=s.usd==null?null:Math.round(s.usd*100)/100; if(s.sid.startsWith('186f2b'))usd=null; if(usd)tot+=usd;
 const o={sid:s.sid,store:s.store,title:s.title||'(none)',workType:k[0],phase:k[1],harnessUsd:usd,harnessByModel:s.mu,from:s.first,to:s.last,subagentCount:s.sub,compactions:s.comp,evidence:k[2]};
 if(s.sid.startsWith('186f2b'))o.harnessByModel={};return o});
const bm={};for(const s of sessions)for(const[m,v]of Object.entries(s.harnessByModel))bm[m]=Math.round(((bm[m]||0)+v)*100)/100;
fs.writeFileSync('final.json',JSON.stringify({sessions,harnessTotals:{usd:Math.round(tot*100)/100,byModel:bm}}));
console.log(sessions.length,tot,JSON.stringify(bm));
