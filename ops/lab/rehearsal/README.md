# L4 — restore and deploy-train rehearsal

Ship plan section 7.5, item L4. Before the owner types the runbook's commands against the only
copy of the shop's database, this folder types them here, against stand-ins, **from the
runbook file itself**, and records what each step did. Run it again for every new deploy-train
row (W0-results "Deploy-train table") and paste the train table into its "Rehearsal (L4)" column.

```bash
bash ops/lab/rehearsal/restore-rehearsal.sh      # the owner's P3b: sections 1.11-1.13, 3, 4, 6-9, wrong turns
bash ops/lab/rehearsal/train-rehearsal.sh        # the owner's P4c: section 11, restore onto drain-image, R5 to main, the train rows' checks, R5.9
```

Each takes a slot of the shared lock (`docs/program/lab/ff-slot.sh`, light pool) when it is on
this PC, writes `C:/Users/User/.fixflow-cache/lab/l4/<UTC stamp>-restore|train/` (`results.md`,
`rows.tsv`, `wrongturns.tsv`, `train.tsv`, one log per runbook command under `steps/`), and
tears the stand-in host down. `--keep` leaves it running; `--purge` also drops the image cache.
A first run builds the images (about 10 minutes); later runs reuse the cache volume.

## How it works

**The stand-in host** is one container on this PC, `fixflow-l4-host` (`docker:27.5.1-dind`,
privileged, default bridge, no published port, its Docker daemon on its unix socket only), with
its image cache in the volume `fixflow-l4-host-docker`. On this PC's Docker daemon the scripts
create only that container and that volume, and pull the `docker:27.5.1-dind` image if it is
missing (the four base images are copied in from this PC when present). Inside it everything is as on the VPS: root, `/opt/fixflow` (a clone),
`/etc/fixflow`, `/var/lib/fixflow`, `/usr/local/bin/ffc`, the compose project `fixflow` with its
own networks (in the stand-in host's own daemon, so this PC's exhausted address pools are not
touched). A bare repository inside it, `/srv/origin.git`, filled from a bundle of `origin/main` (for the train,
also the annotated tag `drain-pick-tz-fix` that 11.1 and 11.3a fetch, ruling C32),
plays GitHub: `git clone <repo-url>`, `fetch origin --tags` and section 11's `push` go there.

**Typing the runbook.** `lib/runbook.py` cuts a step's fenced blocks or inline `code` spans out of
the runbook by step number (`6.6`, `11.3a`, `R5.4`, section `0`). The restore reads the copy in
the checkout it is restoring (`/opt/fixflow/docs/RUNBOOK-SELFHOST.md`, after 1.11); the train
reads `main`'s runbook throughout (`/srv/prep`, a clone of `main`), because the checkout it
works in is `drain-image` (`a31924a` predates the file) until R5.4 replaces it. The
harness (`lib/harness.sh`) substitutes the placeholders the owner fills in (`<dump file name>`,
`<id>`, `<TARGET>`, ...: every substitution is printed in that step's log), then `eval`s the text
in one shell, so a variable set in one block (`D`, `S`, `P_RUN`) is still set in the next, as in
one SSH session. Then it cuts the Check command, runs it, and compares with the step's Expected
text (`lib/steps.sh`, `lib/steps-789.sh`, `inner/train.sh`). If the runbook moves or drops a
command, the step fails loudly instead of running something else.

**Verdicts:** DONE (ran as written, Check as expected), FAILED (ran as written, Check not as
expected, or the command failed), AMBIGUOUS (the text allows two readings, or only part of the
Check can be read here), NRH (not rehearsable here: names what it needs), N/A (another recovery
case). Each row quotes what was seen. A Check is matched against what the command printed, never
against the logged command text. A train row's check is PASS, FAIL, or PARTIAL (every item that
ran passed, and the items that cannot run here are named).

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
  the train's prebuild), and `inner/prep.sh` runs a backend image of `main` in two throwaway
  containers to migrate and seed the stand-in database (no R2 or other real setting is given
  to them).
- 6.2's `scp` from the laptop is a `cp` on the stand-in host; 3.4-3.7's editor is a line
  replacement (values never logged); 3.3's six values are generated by the block's own lines.
- The dead-man service is a listener on the stand-in host's `127.0.0.1:9999` (`lib/deadman.py`).
- 6.13's interactive `set_pin` prompt is answered through a pseudo-terminal (`lib/typist.py`).
- 8.5 needs a manifest a phone uploads: one stand-in `drain_manifest` event is inserted by SQL.
- The train's `R5.5` build is a cache hit: the same build ran online beforehand (`train.sh
prebuild`), because the host is offline when R5 runs.

## The stand-in production database

`inner/prep.sh` builds it the way the real one was built: `alembic upgrade head` (head **0046**,
the head of `main`), then `seed/standin_seed.py`: 47 jobs in every status with their events,
payments (some voided), completions, a negotiated bill and a sent bill, punches, pings and
presence crossings, the staff ledger with a valid hash chain, advance requests, media rows,
shop settings, staff accounts with stand-in PINs (two left on the seed PIN), and the
`dispatch_cursor` deliberately **below** `max(job_event.seq)` (as if 0046 ran mid-history and
the dispatcher stayed off). Fictional names only. It is dumped twice:

| Form    | Command                                                                                                             | What it stands for                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| nightly | the backup job's own `core/backup.py dump_database()`: `--format=custom --schema=public --no-owner --no-privileges` | R2 nightly / hourly / post-drain dumps and P0a's case-a dump        |
| B5      | `pg_dump -U fixflow_app -d fixflow --format=custom`                                                                 | the runbook's pre-drain snapshot (8.2) and pre-restore copy (6.6 b) |

`dumpfacts-standin.txt` is Appendix B on the source (P0a's `verify-dump.sh` output role).

**The real head is unknown** until the owner's P0a item 4. If the dead production is at 0045,
6.8's version check still passes, `dispatch_cursor` is absent in the dump and migration 0046
seeds it at the restored head on the first boot, and 6.9's cursor check then reads the head. If
it is older than 0045, 6.8 STOPs as written; that dump would need its own rehearsal with the
matching migrations (this seed runs only against head 0046).

## Files

| Path                                                                         | What                                                                 |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `restore-rehearsal.sh`, `train-rehearsal.sh`                                 | entry points (this PC)                                               |
| `lib/host.sh`                                                                | the stand-in host: start, origin bundle, kit copy, results, teardown |
| `lib/runbook.py`                                                             | cuts step text out of the runbook                                    |
| `lib/harness.sh`                                                             | substitute, log, eval, mask, record a row                            |
| `lib/steps.sh`, `lib/steps-789.sh`                                           | sections 1, 3, 4, 6 and 7-9, one function per section                |
| `lib/traincheck.py`                                                          | the train rows' post-deploy checks as API calls                      |
| `lib/lab-override.yml`, `lib/deadman.py`, `lib/typist.py`                    | the stand-ins above                                                  |
| `lib/report.py`                                                              | `results.md` from the TSVs                                           |
| `inner/prep.sh`, `inner/restore.sh`, `inner/wrongturns.sh`, `inner/train.sh` | run inside the stand-in host                                         |
| `seed/standin_seed.py`                                                       | the stand-in production data                                         |

## Adding a deploy-train row

Add its check to `lib/traincheck.py` (a mode named after the phase) and one `trow` call in
`inner/train.sh`'s 12.5 block, in table order. A row with a migration needs nothing else:
`R5.6` lets `start.sh` migrate and `12.4` reads the applied head.
