# PROBE: do a helper's own helpers run in the background with fork mode off? (2026-11-19)

Asked by the top session (task r57-0517, the owner's go of 2026-11-19 to check the config that allows middle
orchestrators). Kind test. Commit nothing; write only `research-tree/build/facts/nesting.md`.

**Why.** `research-tree/ORCHESTRATION.md` section 2 keeps the build's tree flat because a helper's own helpers ran
in the foreground (hc1-0103: `requestShape` "foreground", fork mode on, the default). The documentation
(`code.claude.com/docs/en/sub-agents.md`, saved copy read 2026-11-19, lines 1077-1104, 936-963, 1292-1299) says:
in `claude -p` and the Agent SDK "the spawning subagent waits while fork mode is on. If you turn fork mode off,
nested subagents start in the background instead. The spawning subagent doesn't wait for a background nested
subagent, which reports to your main conversation if it outlasts the spawning subagent." `.claude/settings.json`
now sets `env.CLAUDE_CODE_FORK_SUBAGENT` to `"0"`. This session started after that change, so it runs with it.

**Steps (main session).**
1. Bash: `echo "fork=$CLAUDE_CODE_FORK_SUBAGENT"`. Note the Agent tool's parameters as you see them: is there a
   `run_in_background` parameter, is a `fork` subagent type offered?
2. Start ONE helper with the Agent tool: description `test: nesting parent`, model `haiku`, in the background
   (`run_in_background: true` if offered). Give it the prompt below, word for word.
3. Wait for its result; do not poll. If a child's reply ("CHILD ONE DONE" or "CHILD TWO DONE") reaches you, the
   main session, note when and from whom.
4. Then read the transcripts under
   `C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/<this session's id>/subagents/`
   (the folder holding `.meta.json` files with the three descriptions): for each helper its description, the
   `.meta.json` fields that say foreground or background and who spawned it, the first and last timestamp in its
   `.jsonl`, and its tokens (input + cache creation + cache read + output of assistant lines, once per message id).
5. Write `research-tree/build/facts/nesting.md`: the env value; the Agent tool's parameters; one row per helper;
   and the answers: (a) did the parent's Agent calls return before the children ended? (b) did the two children
   run at the same time? (c) did the parent receive child one's reply while child two still ran? (d) how did the
   parent wait, did it end before both replies came, and where did each reply go? (e) any stall, error or refusal
   by a hook; (f) the probe's tokens in total, this session included (`get_usage` is not needed).
6. End any process you started. Report in at most 8 lines.

**The parent's prompt (give it verbatim):**

> You are a test helper. Report times as Unix seconds from `date +%s`.
> 1. Run `date +%s`; call the result T0.
> 2. In ONE message start two helpers with the Agent tool, in the background if the tool offers it:
>    - description `test: nesting child one`, model `haiku`, prompt: "Run `date +%s`, then the Bash command
>      `sleep 40`, then `date +%s`. Reply with the two times and the words CHILD ONE DONE."
>    - description `test: nesting child two`, model `haiku`, prompt: "Run `date +%s`, then the Bash command
>      `sleep 100`, then `date +%s`. Reply with the two times and the words CHILD TWO DONE."
> 3. Right after both Agent calls return, run `date +%s`; call it T1. Note exactly what each Agent call returned
>    (an id and a running notice, or the child's reply).
> 4. Until both replies have reached you or 6 minutes have passed since T0: run `sleep 20; date +%s` as one Bash
>    call at a time, and after each note whether CHILD ONE DONE or CHILD TWO DONE has reached you. Do not finish
>    before that.
> 5. Reply with T0, T1, what each Agent call returned, the time each child's reply reached you (or "never"), and
>    anything unexpected.
