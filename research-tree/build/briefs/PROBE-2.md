# PROBE, part 2: a parent that ends its turn at once (2026-11-19)

Same session, rules and kind as `PROBE.md`. Commit nothing; write only section 2 of
`research-tree/build/facts/nesting.md`.

**Why.** A middle orchestrator that keeps its turn open must spend a model call on every wait. It is cheap only if
it can end its turn and be woken when a child ends, as a session is. The documentation says a nested helper that
outlasts its parent "reports to your main conversation", and that a helper's own background command wakes it after
its turn ends (`research-tree/build/facts/docs-subagents-excerpt.md`).

**Steps (main session).**
1. Start ONE helper: description `test: nesting parent two`, model `haiku`, in the background. Its prompt, verbatim:
   > Run `date +%s`; call it T0. In ONE message start two helpers with the Agent tool, in the background if the
   > tool offers it: description `test: nesting child three`, model `haiku`, prompt "Run `sleep 30`, then
   > `date +%s`. Reply with the time and the words CHILD THREE DONE."; and description `test: nesting child four`,
   > model `haiku`, prompt "Run `sleep 60`, then `date +%s`. Reply with the time and the words CHILD FOUR DONE."
   > Then at once reply with T0 and the words PARENT TWO ENDED, and stop. If you are woken again later, reply
   > with `date +%s` and what woke you, and stop.
2. Note, in order and with the time, every message that reaches you: the parent's reply, any child's reply, any
   later reply of the parent.
3. When both children's replies have reached someone, or 4 minutes after the start, read the transcripts as in
   `PROBE.md` step 4: did the parent run again after PARENT TWO ENDED (assistant lines after its first reply)?
   In whose transcript did each child's reply arrive? Did anything reach you twice, or never?
4. Write section 2 of `nesting.md`: the order of events with times; the answers; tokens. Report in at most 6 lines.
