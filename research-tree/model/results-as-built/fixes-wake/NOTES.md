# MB2b run notes (fixes-wake)
- 20:55 FXW-4 at 3000 MB: completes the verdict of C_W4 (FX-W1 + FX-W2 + FX-W4, hard-kill branch); decides whether the three wake fixes together restore liveness (NoDeadlock/AlwaysCanResolve/EventuallyResolves) or which open row breaks it.
- 20:58 FXW-4 at 3000 ended BOUNDED (23.2 M); switching to five maximal parts (x, u, u+x, x+x, u+l) per configuration; decides each fix's ablation verdict on the faults its defect needs.
- 21:00 FXW-4R (candidate re-alert) + its X1/X2/S2 ablations, same five parts: decides whether FX-W1 and FX-W2 each matter once the FX-W4 once-per-onset gap is out of the way.
- FXW-5 and FXW-6 whole at 3000 MB: completes the per-fix verdict (holds or the failing property) for FX-W5 and FX-W6.
- 21:16 final pass chain (FN-R5-DEAD, FN-R5, FN-OUT-CLOSE, FN-OUT-CLOSE-X, FN-JOIN-WSTART, FN-JOIN-WSTART-D; each <= 400 s): decides whether rev-5 point 1 closes the dead-orphan hole, whether FX-OUT is live without the commit oracle, and whether a dead watcher's restart lets the start lease expire (FIX-JOIN point 1).
