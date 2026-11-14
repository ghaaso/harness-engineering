# L4 — restore and deploy-train rehearsal

Ship plan section 7.5, item L4. Before the owner types the runbook's commands against the only
copy of the shop's database, this folder types them here, against stand-ins, **from the
runbook file itself**, and records what each step did. Run it again for every new deploy-train
row (W0-results "Deploy-train table") and paste the train table into its "Rehearsal (L4)" column.

```bash
bash ops/lab/rehearsal/restore-rehearsal.sh      # the owner's P3b: sections 1.11-1.14, 3, 4, 6-9, wrong turns
bash ops/lab/rehearsal/train-rehearsal.sh        # the owner's P4c: section 11, restore onto drain-image, R5 to main, the train rows' checks, R5.9
```

Options (both scripts):

| Option           | What                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ref <ref>`    | The code and runbook under rehearsal, default `origin/main`. It becomes the stand-in origin's `main`, so a runbook change is rehearsed from its PR branch **before** it merges (`--ref origin/<branch>`). A branch or tag name; a bare sha cannot be bundled. |
| `--mutate`       | The negative run (see "Every kind of check, shown failing"). The restore skips its wrong turns.                                                                                                                                                               |
| `--baseline`     | `<run name>`: the paired normal run (same ref, same rig, no `--mutate`) a `--mutate` run is compared with. Without it no mutation counts as caught.                                                                                                           |
| `--keep`         | Leave the stand-in host running at the end. A later run refuses it unless given `--replace-kept`.                                                                                                                                                             |
| `--replace-kept` | Remove a host a `--keep` run left running (only one carrying `--keep`'s mark), then run.                                                                                                                                                                      |
| `--purge`        | Also drop the image cache volume at the end.                                                                                                                                                                                                                  |

Each run writes `C:/Users/User/.fixflow-cache/lab/l4/<UTC stamp>-restore|train/` (`results.md`,
`rows.tsv`, `wrongturns.tsv`, `train.tsv`, `run.txt`, one log per runbook command under
`steps/`) and an **evidence bundle** in `C:/Users/User/.fixflow-cache/handoff/evidence/l4/<run>/`:
the results table, the raw TSVs, the small logs, and `cited.txt` (the output each row that is
not DONE read; no full logs). The coordinator commits the bundles on the plan branch under
`docs/program/evidence/lab/` (ruling C33). Then the stand-in host is torn down.

**Two runs at once.** The light pool has two slots, so two runs can hold slots together, but
there is one `fixflow-l4-host`. A run that finds that host running and did not start it refuses
and names it; it never removes it (one that exited, as after a reboot, is removed). A run
collects, files evidence for and removes only a host it started itself (`L4_HOST_MINE`), so a
refused run touches nothing of the other run's. Each run's slot holder is `l4-<kind>-<pid>`.
Pins are never re-cut by a run (`--repin` is gone, ruling C57): re-cutting
`lib/runbook-pins.tsv` is a reviewed commit.

**Slots and cost.** Each run takes one slot of the shared lock (`docs/program/lab/ff-slot.sh`)
for its lifetime: the **light** pool when the image cache volume exists (warm: the stand-in host
peaks at about 0.7 GB, mean 0.5 GB), the **heavy** pool when it does not (cold: the first run, or
the run after a `--purge`, pulls and builds every image, about 10 minutes).

## How it works

**The stand-in host** is one container on this PC, `fixflow-l4-host` (`docker:27.5.1-dind`,
privileged, default bridge, no published port, its Docker daemon on its unix socket only), with
its image cache in the volume `fixflow-l4-host-docker`. On this PC's Docker daemon the scripts
create only that container and that volume, and pull the `docker:27.5.1-dind` image if it is
missing (the four base images are copied in from this PC when present). Inside it everything is
as on the VPS: root, `/opt/fixflow` (a clone), `/etc/fixflow`, `/var/lib/fixflow`,
`/usr/local/bin/ffc`, a cron that reads `/etc/cron.d` (cronie), the compose project `fixflow`
with its own networks (in the stand-in host's own daemon, so this PC's exhausted address pools
are not touched).

**GitHub, and this PC's repository.** A bare repository inside the stand-in host,
`/srv/origin.git`, plays GitHub: `git clone <repo-url>`, `fetch origin --tags` and section 11's
`push` go there. It is filled from a bundle of `--ref` (as its `main`) and, for the train, the
annotated tag `drain-pick-tz-fix` that 11.1 and 11.3a fetch (ruling C32). **To build that
bundle the entry script fetches from GitHub into this PC's shared repository**, read only: a ref
`origin/<branch>` updates that remote-tracking ref, and the train's tag is fetched into
`refs/tags/` (without `--force`, so a tag that moved on GitHub fails the run instead of being
copied). Other sessions see those refs. **The rehearsal follows whatever that ref is at run
time**; `run.txt` records the sha. Nothing is ever pushed to GitHub.

**Typing the runbook.** `lib/runbook.py` cuts a step's fenced blocks or inline `code` spans out
of the runbook by step number (`6.6`, `11.3a`, `R5.4`, section `0`). The restore reads the copy
in the checkout it is restoring (`/opt/fixflow/docs/RUNBOOK-SELFHOST.md`, after 1.11); the train
reads the rehearsed ref's runbook throughout (`/srv/rbsrc`), because the checkout it works in is
`drain-image` (`a31924a` predates the file) until R5.4 replaces it. The harness
(`lib/harness.sh`) substitutes the placeholders the owner fills in (`<dump file name>`, `<id>`,
`<TARGET>`, ...: every substitution is printed in that step's log; a placeholder the owner
cannot fill yet, like `<T_CLOSE>` in main's 8.6, which comes before 8.7 records it, is left as
written and the row fails where the owner would), then `eval`s the text in one shell, so a
variable set in one block (`D`, `S`, `P_RUN`) is still set in the next, as in one SSH session. A
line that carries a guard (`: "${D:?...}" && ...`) behaves as in the owner's interactive shell:
an unset variable drops the rest of that line and nothing else (`lib/guardwrap.py` runs such a
line in a subshell, because a non-interactive bash would exit; what the line assigns is carried
back). Then it cuts the Check command, runs it, and compares with the step's Expected text
(`lib/steps.sh`, `lib/steps-789.sh`, `inner/train.sh`).

**Choosing a block: by anchor or by content, never by position.** A runbook block preceded by
an anchor comment, `<!-- block: <step>-<name> -->` (the runbook batch of ruling C42 anchors every
block it adds or changes), is chosen by that anchor. Every other block is chosen by its content:
the rig names block `n` of `lib/runbook-pins.tsv` (recorded from the runbook the rig was written
against; its first line names the sha), and the cutter takes the step's block whose first line
equals that pin's (whitespace collapsed; a `</dev/null` stdin redirect, which the batch adds to
`ffc exec` lines runbook-wide, is ignored), wherever it now stands. When no block, or more blocks
than pinned, begin that way, or when the block's line count differs from the pin (an inserted
line; a pin may list a reviewed second count, as 6.12's here-document does: 9 lines on `main`, 8 in
the runbook batch), the step is
**MOVED**: nothing is typed, the row's verdict is MOVED, `moved.log` names the block, and the run
says so on stderr. A changed command that keeps its first line and length is typed as changed,
which is the point of cutting instead of retyping. **Part of a block is chosen by content too**,
never by line number: `rb_line <step> <n|@name|*> <substring> [<end>]` (`runbook.py line`) takes the
one line containing the substring, from the selected block or from every block of the step (`*`),
and with `<end>` runs through the one later line containing it (`$`: the block's last line). Zero
or several matches are MOVED. Only command text counts: a comment, a here-document's body, an
`echo` or `printf` of the command and a longer word (`--report-json` for `--report`) never match,
so they can neither stand in for a missing command nor compete with the real one. So 6.12's up
line, 6.13's report and set lines, WT1's up line and 11.8's push are typed from either text, and
WT2's up line is 8.1's (`--force-recreate backend`), which every text has (6.12's is gone from the
runbook lane's C61 text, 8.6's from the older ones). 6.12's up line is typed after the fence block
unless that block holds exactly that line; a missing up line makes the row MOVED unless the text
says none follows (the block anchored `6.12-fence` and the prose "No restart follows", ruling C61:
both, or MOVED). 6.4's Check is DONE on `<n> (head)` or the literal `<rev> (head)`, after the
printed head is checked against the dump's. An anchor name used twice in a step is MOVED,
never the later block. Where the batch rewrote a step, the rig has
both readings: it asks the runbook under rehearsal whether the anchor exists (`rb_anch`) and
follows that text (6.1, 6.6, 6.7, 6.9, 8.2, 8.5a-8.7, 11.12, 11.13a, 9.2's expected time, 6.8's
check 6), so main and a runbook PR are rehearsed by the same rig. `lib/selftest-runbook.py
<runbook> <pins>` is the mutation test of the cutter (an unchanged block, a same-length change, a
block added in front, a `</dev/null` added, an inserted line, a changed first line, a duplicate
first line, an anchor, an anchor fallback, a missing anchor, a renamed step, a duplicate anchor,
and the line selector across blocks, moved, doubled and absent, and against a comment, an echo, a
here-document line and a longer option; 6.12's up-line decision, including "none" only when the
text says so; WT16's verdict; no Docker needed). On a text whose 6.12 has no up line, the line
cases run on a copy with main's line added after the fence; both
rehearsals run it on every run, and its result is the row `selftest` (FAILED when a case fails). After a runbook change merges, regenerate the pins
(`python3 lib/runbook.py pins <runbook>`, with the two header lines) in the same change that
teaches the rig any new text.

**Verdicts:** DONE (ran as written, Check as expected), FAILED (ran as written, Check not as
expected, or the command failed), AMBIGUOUS (the text allows two readings, or only part of the
Check can be read here), MOVED (see "Choosing a block"), NRH (not rehearsable here: names what it needs),
N/A (another recovery case). Each row quotes what was seen. A Check is matched against what the
command printed, never against the logged command text. A train row's check is PASS, FAIL, or
PARTIAL (every item that ran passed, and the items that cannot run here are named).

**Every kind of check, shown failing.** `--mutate` runs a rehearsal with `lib/mutations.tsv`
applied: one mutation per kind of check (exact Expected text, a printed exit code, a count of
listing lines, a pattern in output, a checksum, database content against the source's facts, the
app's own report, cron pings, the dead-man log, a bucket listing, deep-health facts, a SQL truth
value, a ref on the remote, a train row's API item, the applied head against CLAUDE.md, an image
tag, and the shape guard). A `runbook` mutation edits the copy of the runbook the run reads; a
`state` mutation changes the stand-in's state at one hook (`l4_mut` in the step code); a `moved`
mutation inserts a line while keeping the committed pin. `mutations.md` lists, per mutation, the
row it targets, the verdict that row got, the same row in the paired normal run (`--baseline`),
and whether the check caught it. A mutation is caught only when `mutations-applied.log` says it was
**applied** (its id matched exactly; a state hook logs "applied" only after its change succeeded),
its target row reads the wanted verdict, and the baseline row did not already read it. A target
may name alternatives (`drain-window|8.7,drain-window|8.6`) when the texts check that fact in
different rows; each is judged against its own baseline row. The kinds no mutation
covers are named in the PR that last ran it.

**Wrong turns start from a stated state.** Before each wrong turn `wt_state` sets the restore
sign-off (present or absent) and the backend (running or stopped), measures both, and writes them
into the row's "what happened" as `[start: ...]` (and to `deviations.log`), so no turn inherits
the previous one's host. WT16 and WT1 start present and running (the live host); each WT2 spelling
present and stopped; the others absent and stopped. WT13 (b) starts the backend by hand after
6.6 (`up -d`, sign-off written by hand) before typing 6.7; on a text whose DROP line refuses on
its own (C61), (b2) then removes the sign-off and types 6.7 again with the backend still running.
WT17 (ruling C65, review route 2b) types 6.6 on the live host, then 6.7; when 6.7 refuses, it
clears each reason by hand (removes the sign-off, `ffc stop backend`, never 6.1) and types 6.7
again. WT18 and WT19 run 6.6 on the stopped host, bring the backend up by hand, then pause it
(WT18, with a 120 s watchdog that unpauses it should the DROP hang) or put it in a crash loop
(WT19: an invalid setting appended to `backend.env`, removed afterwards), remove the sign-off and
type 6.7. A refusal names the line that refused first: 6.6 (b)'s dump line (`STOP: no copy taken`) or
its marker line when (b) printed a STOP and wrote no marker, else 6.7's DROP line.

**Lab substitutions** (each is written to `deviations.log` when it happens):

- `$P_RUN` without `--profile edge`: cloudflared needs a real tunnel. Section 5, 6.14, 7.3,
  8.3 and every `curl https://api.<domain>` half of a Check are NRH.
- `FF_EXTRA_COMPOSE=lib/lab-override.yml`: a **stand-in R2 bucket** (`moto` 5.0.28 with TLS)
  under its own profile `l4s3` that no runbook command names, reachable inside the stack as
  `l4lab.r2.cloudflarestorage.com` (the hostname `get_storage()` builds from the stand-in
  account id), plus its CA for the backend (`AWS_CA_BUNDLE`). So `fixflow-backup.sh`,
  `fixflow-r2-put.sh`, the deep-health R2 probe and the prune code run unchanged. **The stand-in
  host is cut off the network (`docker network disconnect bridge`) before the first container
  of the `fixflow` stack starts**, so nothing the runbook starts can reach R2 or any other real
  host; the entry script stops if an IPv4 or IPv6 default route remains. Before the cut, while
  online, the host installs its packages, clones the stand-in origin, builds the images (4.3,
  the train's prebuild), and `inner/prep.sh` runs a backend image in two throwaway containers to
  migrate and seed the stand-in database (no R2 or other real setting is given to them).
- 6.2's `scp` from the laptop is a `cp` on the stand-in host; 3.4-3.7's editor is a line
  replacement (values never logged); 3.3's six values are generated by the block's own lines.
- The dead-man service is a listener on the stand-in host's `127.0.0.1:9999` (`lib/deadman.py`).
- From 7.4 on, `heartbeat.env`'s health URL is the backend's container address (the address
  7.2's test uses), so the cron heartbeat can be healthy without a tunnel. 7.7's installed cron
  line has its minute moved to the next run for one run and put back (the Check waits for the
  next `:17`).
- 6.13's interactive `set_pin` prompt is answered through a pseudo-terminal (`lib/typist.py`).
  The stand-in PINs and every generated value are masked in every log (`<stand-in PIN>`,
  `<stand-in secret>`).
- 8.5 needs a manifest a phone uploads: one stand-in `drain_manifest` event is inserted by SQL.
- The train's `R5.5` builds from the build cache: the same build ran online beforehand (`train.sh
prebuild`), because the host is offline when R5 runs. The prebuild's tags are removed before
  R5.5, so R5.5's Check (the `fixflow/backend:<HEAD>` tag) sees only its own build.

## The stand-in production database

`inner/prep.sh` builds it the way the real one was built: `alembic upgrade head` of a checkout,
then `seed/standin_seed.py`: 47 jobs in every status with their events, payments (some voided),
completions, a negotiated bill and a sent bill, punches, pings and presence crossings, the staff
ledger with a valid hash chain, advance requests, media rows, shop settings, staff accounts with
stand-in PINs (two left on the seed PIN), and the `dispatch_cursor` deliberately **below**
`max(job_event.seq)` (as if 0046 ran mid-history and the dispatcher stayed off). Fictional names
only. The checkout is the one production would run:

- **restore:** the rehearsed ref (`main`), which the restore deploys;
- **train:** `drain-image`, the code production runs until the train. The cut runs first, so the
  dump is never newer than the image it is restored into, and R5 then applies every migration
  of the train's rows to the populated database.

The dump's head (`SEED_HEAD`, its `alembic_version`, checked against `CLAUDE.md` at that
checkout) is what 6.4 and 6.8 compare with; the image's head is the one `CLAUDE.md` declares at
the deployed checkout; 12.4 reads `CLAUDE.md` at the target. No head number is written into the
rig. The dump is made twice:

| Form    | Command                                                                                                             | What it stands for                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| nightly | the backup job's own `core/backup.py dump_database()`: `--format=custom --schema=public --no-owner --no-privileges` | R2 nightly / hourly / post-drain dumps and P0a's case-a dump        |
| B5      | `pg_dump -U fixflow_app -d fixflow --format=custom`                                                                 | the runbook's pre-drain snapshot (8.2) and pre-restore copy (6.6 b) |

`dumpfacts-standin.txt` is Appendix B on the source (P0a's `verify-dump.sh` output role), and
`source-cursor.txt` the source's `dispatch_cursor` and `max(job_event.seq)`.

**The real dump.** Production was deployed at 0046 on 2026-08-02 (`docs/RUNBOOK-BACKUPS.md:141`,
"dispatch_cursor +1 (the 0046 seed)"), so the real dump is most likely at 0046 with the cursor
below the head, exactly as this stand-in. Main's 6.9 checks the cursor against `max(seq)` with
nothing in between to move it, so it stops on this dump (D1) and would stop the owner's real
P3b; the runbook batch moves 8.8's forward-only re-seed into 6.9 and keeps the check exact, and
its 6.8 compares the cursor with the value recorded for the dump. The owner's P0a item 4 settles
the real head.

## Train: a row that carries a migration

The train runs R5 twice. First to `main`, with every train row's post-deploy check and R5.9:
its rollback when `main` carries no migration (heads equal), its **refusal branch** when it does
(since P8a, `main` is at 0047 and `drain-image` at 0046). Then a **stand-in row** lands on the stand-in origin's `main`: a commit
(made in the prebuild, kept in the stand-in only, never on GitHub) that adds the next migration
in the chain, writing to every `job` row, and moves `CLAUDE.md`'s head to it. R5 deploys it
(`start.sh` runs the migration on the restored, populated database; row `12.4b`), and R5.9 then
meets a database above the previous version's head: the **refusal branch** (no rollback, the
stack stays on the target, healthy).

## Files

| Path                                                                                    | What                                                                                                             |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `restore-rehearsal.sh`, `train-rehearsal.sh`                                            | entry points (this PC)                                                                                           |
| `lib/host.sh`                                                                           | the stand-in host: slot, start, origin bundle, kit, results, evidence                                            |
| `lib/runbook.py`, `lib/runbook-pins.tsv`, `lib/selftest-runbook.py`, `lib/guardwrap.py` | cuts step text out of the runbook; the pinned first lines; the self-test; guard lines as in an interactive shell |
| `lib/harness.sh`                                                                        | substitute, log, eval, mask, record a row; MOVED; `rb_line`; the mutate mode                                     |
| `lib/mutate.py`, `lib/mutations.tsv`                                                    | the negative run's mutations and its report                                                                      |
| `lib/steps.sh`, `lib/steps-789.sh`                                                      | sections 1, 3, 4, 6 and 7-9, one function per section                                                            |
| `lib/traincheck.py`                                                                     | the train rows' post-deploy checks as API calls                                                                  |
| `lib/lab-override.yml`, `lib/deadman.py`, `lib/typist.py`                               | the stand-ins above                                                                                              |
| `lib/report.py`                                                                         | `results.md` from the TSVs                                                                                       |
| `inner/prep.sh`, `inner/restore.sh`, `inner/wrongturns.sh`, `inner/train.sh`            | run inside the stand-in host                                                                                     |
| `seed/standin_seed.py`                                                                  | the stand-in production data                                                                                     |

## Adding a deploy-train row

Add its check to `lib/traincheck.py` (a mode named after the phase) and one `trow` call in
`inner/train.sh`'s 12.5 block, in table order. A row's migration is applied by `R5.6`
(`start.sh` migrates on boot) to the database restored at drain-image's head, and `12.4`
compares the applied head with `CLAUDE.md` at the target. When main carries a migration, the
first R5.9 takes the refusal branch, and the stand-in row still adds one migration on top.
