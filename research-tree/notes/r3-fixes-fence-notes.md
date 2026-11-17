# MB2a fixes-fence: run notes (one line before every run over 10 minutes or above 400 MB)

- Baseline proof AB-COMMIT-CLOSE rerun at 700 MB (not 400): the copy's state record is 2 bytes longer (snapshot byte per
  row), so the recorded 2,948,455-state run no longer fits 400 MB. It completes the "flags off = unchanged" proof.
- FX-CLOSE ended BOUNDED at 400 MB (2.91 M states, 2.74 M expanded): rerun alone at 1500 MB to complete FX-CLOSE's verdict
  (all safety, the D7 forms and the four liveness properties).
- FX-CLOSE-X and FX-CLOSE-NOOWNEREND at 1500 MB (same size class as FX-CLOSE, 4.15 M states): complete the two ablation verdicts.
- D7-SLOTS-HELD BOUNDED at 400 MB (2.91 M states, 2.87 M expanded): rerun at 1500 MB to give the real SlotsProc/SlotsR10 verdict FIDELITY-3 asked for.
- FX-CGATE BOUNDED at 400 MB (2.91 M states, 2.52 M expanded, nothing failing): rerun at 2000 MB to complete FX-CGATE's verdict (safety, StaleWrites and liveness).
- FX-CGATE-Q5B BOUNDED at 400 MB (2.71 M states, 2.09 M expanded): rerun at 2500 MB to complete the Q5b branch's verdict.
- FX-OUT-PLAN BOUNDED at 400 MB (2.91 M, 2.59 M expanded, no safety failure): rerun at 2500 MB to complete FX-OUT's verdict (C_OUT with FX-PLAN, on which FX-OUT's torn-fence liveness depends).
- FX-OUT-PLAN again at 2500 MB after the h-budget correction (a torn hand-over counted once): completes FX-OUT.
- FX-CLAIM (C_D4B reading i) BOUNDED at 400 MB (2.91 M, 2.12 M expanded, no failure): rerun at 2500 MB to complete FX-CLAIM/FX-PLAN's verdict.
- FX-CLAIM (C_D4B now with AB_STOP_HELD: the z->stopped artefact was behind the 2500 MB trace) by parts at 1500 MB in the background, wall 1500 s (over 10 min): completes FX-CLAIM/FX-PLAN reading (i).
- FX-CLAIM parts: 40/43 complete and all hold at 1500 MB; the three r parts (k=2,{cs,cv,cd}=1,r=1) BOUNDED at 11.7 M states: rerun those three alone at 3000 MB in the background (over 10 min) to complete FX-CLAIM.
- FX-PLAN-NOSTARTWAIT and FX-PLAN-X: one part each (k=2,x=2, the part where a turn dies between start and bind) at 2500 MB, background: completes the two ablation verdicts (a liveness failure in a complete part is a real trace).
- FX-CGATE-Q5B (now with FX-CLAIM) by parts at 1500 MB in the background, wall 1700 s (over 10 min): completes the Q5b branch's verdict.
- FX-CGATE-Q5B again by parts at 1500 MB (background, over 10 min) after the owner-start correction (the owner answers every 'owner' act, not once): completes the Q5b branch.
