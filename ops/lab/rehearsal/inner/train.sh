#!/usr/bin/env bash
# The deploy-train rehearsal (the owner's P4c), inside the stand-in host, as root.
#   train.sh cut       runbook section 11 on a development clone: release/drain = a31924a + the
#                      squash commits by cherry-pick, push the branch, tag that sha, push the tag
#                      (all to the stand-in origin); the 11.13 re-cut; wrong turns WT7-WT11
#   train.sh prebuild  (online) build main's backend and web images once, so R5.5's build later
#                      is the same build from cache while the host is offline
#   train.sh deploy    (offline) restore onto drain-image (section 6), then R5 to main (12.4),
#                      each train row's post-deploy check (12.5), the web row (12.6), and the
#                      rollback R5.9 back to drain-image
set -u
export OUT=/srv/l4/out
# Every phase reads one runbook: main's (the ref under rehearsal), from the clone `cut` makes
# (/srv/rbsrc). The checkout in /opt/fixflow is drain-image (a31924a predates the file) until
# R5.4 replaces it, and /srv/prep is the seed's checkout (drain-image, see prep.sh).
export RB_FILE=/srv/rbsrc/docs/RUNBOOK-SELFHOST.md
source /srv/l4/kit/lib/harness.sh
source /srv/l4/kit/lib/steps.sh
source /srv/l4/kit/lib/steps-789.sh
export FF_EXTRA_COMPOSE=/srv/l4/kit/lib/lab-override.yml
[ -f /srv/l4/dumps/names.env ] && source /srv/l4/dumps/names.env   # made by prep.sh, which runs after `cut`
P1=87bbe88; P3A=90ea88d; FIX=3810e42   # FIX: the tech-metrics timezone fix, ruling C30 (runbook 11.3a)
FIX_TAG=drain-pick-tz-fix; FIX_FULL=3810e4209ea4bf8fde7ce500cea0458d3e7ff701   # ruling C32: picked by its tag
P1_FULL=87bbe88abf3c1b1222edda696ef032678a4dc34e; P3A_FULL=90ea88d67a4b3939c318c82a813039037291aa51
FIX_SUBJECT="fix(jobs): resolve the tech-metrics window in the shop timezone, not UTC"
TR="$OUT/train.tsv"
[ -f "$TR" ] || printf 'row\tcheck\tresult\tevidence\n' > "$TR"
trow() { printf '%s\t%s\t%s\t%s\n' "$1" "$(clean "$2" 300)" "$3" "$(clean "$4" 900)" >> "$TR"; echo "TRAIN $1: $3"; }

# R5 once with the target 12.4 names (origin/main), rows suffixed with <s>: sets TARGET, PREV,
# PREV_IMG, hb. Used for main, then for the stand-in row that carries a migration.
r5() { # <row suffix>
  local s="$1"
  rb_run 12.4-do "$(rb_fence 12.4 1)"
  TARGET="$(out_of | grep -E '^[0-9a-f]{40}$' | tail -n 1)"
  row "12.4a$s" "$( [ -n "$TARGET" ] && echo DONE || echo FAILED)" "fetch origin --tags; rev-parse origin/main" "TARGET=$TARGET"
  rb_run R5.1 "$(rb_span R5.1 'status --porcelain')"
  row "R5.1$s" "$( [ -z "$(out_of)" ] && echo DONE || echo FAILED)" "status --porcelain" "[$(out_of | tr '\n' ' ')]"
  rb_run R5.2 "$(rb_fence R5.2 1)" "<target>=$TARGET"
  rb_run R5.2-check "$(rb_span R5.2 'branch -r --contains')" "<sha>=$TARGET"
  row "R5.2$s" "$(v has origin/main)" "fetch; rev-parse '<target>^{commit}' (after T_close: a main sha)" "$(out_of | tr '\n' ' ')" \
    "T_close is assumed recorded (the train runs after it); before T_close the target could only be a drain-image tag"
  rb_run R5.3 "$(rb_fence R5.3 1)"
  PREV="$(out_of | grep -E '^[0-9a-f]{40}$' | head -n 1)"; PREV_IMG="$(out_of | grep -E '^sha256:' | head -n 1)"
  local dbhead; dbhead="$(out_of | grep -xE '[0-9]{4}' | head -n 1)"
  row "R5.3$s" "$( [ -n "$PREV" ] && [ -n "$PREV_IMG" ] && [ -n "$dbhead" ] && has '"sha256"' && echo DONE || echo FAILED)" \
    "PREV sha, PREV image, DB head, manual backup" "PREV=$PREV image=$(echo "$PREV_IMG" | cut -c1-19) head=$dbhead; $(out_of | grep '^{' | cut -c1-100)"
  rb_run R5.4 "$(rb_span R5.4 'checkout --detach')" "<TARGET>=$TARGET"
  row "R5.4$s" "$( [ "$(git -C /opt/fixflow rev-parse HEAD)" = "$TARGET" ] && echo DONE || echo FAILED)" "checkout --detach TARGET" "HEAD $(git -C /opt/fixflow rev-parse --short HEAD)"
  if [ -z "$s" ]; then
    # P6a's row: a leftover value of a retired key must be ignored on boot
    printf 'FIXFLOW_ATTENDANCE_LOCATION_ACCURACY_CEILING_M=50\nFIXFLOW_JOBS_PUNCH_ACCURACY_CEILING_M=50\n' >> /etc/fixflow/backend.env
    echo "edited /etc/fixflow/backend.env: added the two keys P6a retired (leftover values)" >> "$OUT/editor.log"
  fi
  # R5.5's Check (the tag fixflow/backend:<HEAD> exists) must be able to fail: the prebuild made
  # the same tags while online, so they are moved aside first (the image is kept under l4-keep/
  # for the build cache) and only R5.5's own build can put them back.
  local im
  for im in backend web; do
    docker tag "fixflow/$im:$TARGET" "l4-keep/$im:$TARGET" 2>/dev/null && docker rmi -f "fixflow/$im:$TARGET" >/dev/null 2>&1
  done
  echo "lab: R5.5$s the prebuild's fixflow/backend and fixflow/web tags at $TARGET were removed before the build (kept as l4-keep/*), so R5.5's check sees only its own build" >> "$OUT/deviations.log"
  rb_run R5.5 "$(rb_span R5.5 'build backend web')"
  local brc="$RC"
  local m55=no
  [ -z "$s" ] && l4_mut R5.5-no-tag && { docker rmi -f "fixflow/backend:$TARGET" >/dev/null 2>&1; m55=yes; }
  rb_run R5.5-check "$(rb_span R5.5 'docker images')"
  row "R5.5$s" "$( [ "$brc" = 0 ] && has "fixflow/backend:$TARGET" && echo DONE || echo FAILED)" "ffc \$P_RUN build backend web" "exit $brc; $(out_of | head -n 1)" \
    "built offline from the build cache (the same build ran online in the prebuild step); the tags were removed first"
  [ $m55 = yes ] && docker tag "l4-keep/backend:$TARGET" "fixflow/backend:$TARGET"
  rb_run R5.6 "$(rb_span R5.6 'up -d')"
  wait_backend_healthy 150; hb=$?
  rb_run R5.6-logs "$(rb_span R5.6 'logs --tail 60 backend')"
  row "R5.6$s" "$( [ $hb = 0 ] && has 'alembic' && has 'Application startup complete' && echo DONE || echo FAILED)" "ffc \$P_RUN up -d (start.sh migrates, then serves)" \
    "healthy=$([ $hb = 0 ] && echo yes || echo no); alembic lines $(grep -ci alembic "$OLOG"); startup complete $(grep -c 'Application startup complete' "$OLOG"); $(grep -o 'Running upgrade [0-9a-z_]* -> [0-9a-z_]*' "$OLOG" | tr '\n' ' ')"
  rb_run R5.7 "$(rb_fence R5.7 1)"
  row "R5.7$s" "$( has "git_sha= $TARGET" && has "'status': 'ok'" && echo DONE || echo FAILED)" "deep health git_sha and database" "$(out_of | tr '\n' ' ' | cut -c1-200)" \
    "the curl through api.<domain> half is NRH (no tunnel)"
  rb_run R5.8 "$(rb_span R5.8 "docker inspect --format '{{.Image}}'")"
  local newimg; newimg="$(out_of)"
  row "R5.8$s" "$( echo "$newimg" | grep -q '^sha256:' && echo DONE || echo FAILED)" "record the image id" "image $(echo "$newimg" | cut -c1-19); was $(echo "$PREV_IMG" | cut -c1-19)"
  local m124=no v124
  if [ -z "$s" ] && l4_mut 12.4-head; then
    v124="$(psql_app -c 'select version_num from alembic_version')"
    psql_app -c "update alembic_version set version_num = '$(printf '%04d' $((10#$v124 - 1)))'" >/dev/null; m124=yes
  fi
  rb_run 12.4-check "$(rb_fence 12.4 2)"
  [ $m124 = yes ] && psql_app -c "update alembic_version set version_num = '$v124'" >/dev/null
  # the expected head is the one CLAUDE.md declares at TARGET, never a number written here
  local tgthead; tgthead="$( [ -n "$TARGET" ] && claude_head /opt/fixflow "$TARGET")"
  row "12.4$s" "$( [ -n "$tgthead" ] && [ "$(out_of)" = "$tgthead" ] && echo DONE || echo FAILED)" "select version_num from alembic_version" \
    "$(out_of); CLAUDE.md at TARGET says head ${tgthead:-(not found)}; the database was at $dbhead before (R5.3)"
}

# R5.9 from TARGET back to PREV, rows suffixed with <s>. Rolls back when the database's head is
# the previous version's; refuses (and checks nothing was touched) when it is above it.
r59() { # <row suffix>
  local s="$1"
  rb_run R5.9-1 "$(rb_span R5.9 "show <PREV>:CLAUDE.md")" "<PREV>=$PREV"
  local prevhead; prevhead="$(out_of | grep -o '[0-9]\{4\}' | head -n 1)"
  # step 1's "the database's applied head (..., as in R5.3)": R5.3's third line
  rb_run R5.9-1b "$(rb_fence R5.3 1 '3p')"
  local dbh; dbh="$(out_of | grep -xE '[0-9]{4}' | head -n 1)"
  row "R5.9.1$s" "$( [ -n "$prevhead" ] && [ -n "$dbh" ] && echo DONE || echo FAILED)" "previous head from CLAUDE.md at PREV; DB head" "PREV head $prevhead; DB head $dbh" \
    "the VERIFY on 'head = **NNNN**' existing at the previous sha: $( [ -n "$prevhead" ] && echo present || echo ABSENT)"
  if [ -z "$prevhead" ] || [ -z "$dbh" ]; then
    row "R5.9.2$s" FAILED "compare the heads" "PREV head '$prevhead', DB head '$dbh'" "a head could not be read: no rollback attempted"
  elif [ "$((10#$dbh))" -gt "$((10#$prevhead))" ]; then
    # the refusal branch: nothing may change; the stack stays on TARGET, healthy
    deep_health > "$OUT/deep-health-r59$(echo "$s" | tr -cd 'a-z').json"
    local gs db_ok
    gs="$(jget facts.git_sha < "$OUT/deep-health-r59$(echo "$s" | tr -cd 'a-z').json")"
    db_ok="$(jget components < "$OUT/deep-health-r59$(echo "$s" | tr -cd 'a-z').json" | jget database.status)"
    row "R5.9.2$s" "$( [ "$gs" = "$TARGET" ] && [ "$db_ok" = ok ] && [ "$(git -C /opt/fixflow rev-parse HEAD)" = "$TARGET" ] && echo DONE || echo FAILED)" \
      "database head above the previous version's: STOP, no rollback" "$dbh > $prevhead; still serving git_sha ${gs:0:7} (TARGET ${TARGET:0:7}), database $db_ok, checkout at $(git -C /opt/fixflow rev-parse --short HEAD)" \
      "the refusal branch: an image below the database's head is never started, and alembic downgrade is never run"
  else
    row "R5.9.2$s" DONE "heads equal: rollback allowed" "$dbh = $prevhead"
    rb_run R5.9-3a "$(rb_span R5.9 'checkout --detach <PREV>')" "<PREV>=$PREV"
    rb_run R5.9-3b "$(rb_span R5.9 'build backend web')"
    rb_run R5.9-3c "$(rb_span R5.9 'up -d')"
    wait_backend_healthy 150
    rb_run R5.9-r57 "$(rb_fence R5.7 1)"
    row "R5.9$s" "$( has "git_sha= $PREV" && has "'status': 'ok'" && echo DONE || echo FAILED)" "checkout PREV; build; up -d; R5.7" "$(out_of | tr '\n' ' ' | cut -c1-200)" \
      "rolled back to the drain-image commit; describe: $(git -C /opt/fixflow describe --tags --exact-match HEAD 2>&1)"
  fi
}

case "${1:?cut|prebuild|deploy}" in
cut)
  PHASE=release-drain
  git config --global user.name "L4 rehearsal"; git config --global user.email "l4@example.invalid"
  rm -rf /srv/dev /srv/ff-rdrain-* /srv/wt7 /srv/behind /srv/fresh /srv/rbsrc
  # the runbook every train phase reads: main's (the ref under rehearsal), in a clone of its own
  git clone -q /srv/origin.git /srv/rbsrc || exit 1
  git clone -q /srv/origin.git /srv/dev && cd /srv/dev || exit 1
  echo "lab: section 11 with P2b-2 absent (not merged): every '<p2b2>' is dropped from the commit lists, 11.4 is not run, and 11.6/11.11/11.13 count three commits, not four" >> "$OUT/deviations.log"
  echo "lab: no gh and no GitHub here: 11.1's gh lines, 11.8's CI read and 11.8's gates (ff-gates.sh, the plan checkout's tool) are NRH; the tag messages say 'not run here' where the run id and the gate summary go" >> "$OUT/deviations.log"
  echo "lab: a runbook line carrying a \${NAME:?} guard runs in a subshell (lib/guardwrap.py): the rig's non-interactive bash would exit on it, where the owner's interactive shell drops the rest of that line; what the line assigns is carried back" >> "$OUT/deviations.log"
  WT="$OUT/wrongturns.tsv"
  wt() {
    local what="$3"
    [ -n "$RB_MOVED" ] && { what="MOVED (runbook moved under: $RB_MOVED; nothing typed for it) $what"; RB_MOVED=""; }
    printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$(clean "$2")" "$(clean "$what" 900)" "$(clean "$4" 400)" "$(clean "$5" 400)" >> "$WT"; echo "WT $1: $(clean "$4" 120)"
  }
  [ -f "$WT" ] || printf 'id\twrong turn\twhat happened\twhat stopped it\tscripted guard needed?\n' > "$WT"
  NOTRUN_CI="not run here (11.8 CI is NRH)"; NOTRUN_GATES="not run here (11.8 gates are NRH)"

  # ---- 11.1: the git half is judged here, the gh half is its own row
  rb_run 11.1 "$(rb_fence 11.1 1)" "87bbe88 <p2b2> 90ea88d=$P1 $P3A"
  # the Check for the fix, in order: `tag`, the full sha, ONE parent and the subject, `is-ancestor exit=1`
  fixblock="$(out_of | grep -A3 -x tag | head -n 4)"
  fixexp="tag
$FIX_FULL"
  l3="$(echo "$fixblock" | sed -n 3p)"
  row 11.1 "$( [ "$(out_of | grep -cE '^[0-9a-f]{7} on main$')" = 2 ] && [ "$(out_of | grep -c 'parents: 1')" = 2 ] && out_of | grep -qx commit \
      && [ "$(echo "$fixblock" | head -n 2)" = "$fixexp" ] \
      && echo "$l3" | grep -qE '^parents=[0-9a-f]+ ' && [ "${l3#* }" = "$FIX_SUBJECT" ] \
      && [ "$(echo "$fixblock" | sed -n 4p)" = "is-ancestor exit=1" ] && ! out_of | grep -q 'NOT on main' && ! out_of | grep -q '^fatal' \
      && ! out_of | grep -qE '^(\?\?|[ MADRCU][ MADRCU]) [^ ]' && echo DONE || echo FAILED)" \
    "preconditions (the git lines; no line of git status --porcelain)" "$(out_of | grep -vE 'gh: |^gh version|Logged in' | tr '\n' ';')" \
    "two phase commits checked, not three: P2b-2 is not merged; the tag drain-pick-tz-fix is in the stand-in origin as on GitHub"
  row "11.1 gh" NRH "gh --version; gh auth status" "$(out_of | grep -E 'gh: |^gh version|Logged in' | tr '\n' ';')" \
    "no gh and no GitHub login on the stand-in, and none may be made (no account, no real remote). Here the lines print 'gh: command not found', which the Check makes a STOP; installing gh and gh auth login are the owner's steps"

  rb_run 11.2 "$(rb_span 11.2 'git switch -c')"
  row 11.2 "$( [ "$(git rev-parse --short HEAD)" = a31924a ] && echo DONE || echo FAILED)" "git switch -c release/drain a31924a" "HEAD $(git rev-parse --short HEAD)"
  rb_run 11.3 "$(rb_span 11.3 'cherry-pick -x')"
  row 11.3 "$( [ "$RC" = 0 ] && ! has CONFLICT && echo DONE || echo FAILED)" "git cherry-pick -x $P1" "exit $RC; $(out_of | head -n 1)"
  rb_run 11.3a "$(rb_span 11.3a 'cherry-pick -x')"
  rc3a="$RC"; o3a="$(out_of | head -n 1)"
  # the Check compares `git show --stat HEAD` with `git show --stat 'drain-pick-tz-fix^{commit}'`; by name here (--stat shortens paths)
  same="$( [ "$(git show --name-only --format= HEAD | sort)" = "$(git show --name-only --format= "$FIX_TAG^{commit}" | sort)" ] && echo yes || echo no)"
  nfiles="$(git show --name-only --format= HEAD | grep -c .)"
  trailer="$(git log -1 --format=%B HEAD | grep 'cherry picked from')"
  row 11.3a "$( [ "$rc3a" = 0 ] && ! has CONFLICT && [ "$trailer" = "(cherry picked from commit $FIX_FULL)" ] && [ "$same" = yes ] && [ "$nfiles" = 4 ] && echo DONE || echo FAILED)" \
    "git cherry-pick -x $FIX_TAG" "exit $rc3a; $o3a; trailer: $trailer; files as in $FIX_TAG^{commit}: $same ($nfiles files)"
  row 11.4 NRH "git cherry-pick -x <p2b2>" "-" "P2b-2 is not merged (lane still working); the drain image is not complete until it is"
  rb_run 11.5 "$(rb_span 11.5 'cherry-pick -x')"
  row 11.5 "$( [ "$RC" = 0 ] && ! has CONFLICT && echo DONE || echo FAILED)" "git cherry-pick -x $P3A" "exit $RC; $(out_of | head -n 1)"
  rb_run 11.6 "$(rb_fence 11.6 1)"
  # first command: the oneline log (three lines: P3a, the fix, P1); second: the -x trailers in pick
  # order, exactly the Check's lines without the P2b-2 one
  srcexp="(cherry picked from commit $P1_FULL)
(cherry picked from commit $FIX_FULL)
(cherry picked from commit $P3A_FULL)"
  row 11.6 "$( [ "$(out_of | grep -vc 'cherry picked from')" = 3 ] && [ "$(out_of | grep 'cherry picked from')" = "$srcexp" ] \
      && [ "$(out_of | sed -n 2p | cut -d' ' -f2-)" = "$FIX_SUBJECT" ] && echo DONE || echo FAILED)" "git log a31924a..release/drain; the -x sources in pick order" \
    "$(out_of | tr '\n' ';')" "the Check expects four log lines and four source lines; with P2b-2 absent three of each (P1, the fix, P3a) are the right answer. The recovery block is rehearsed in WT7 and WT9"
  rb_run 11.7 "$(rb_fence 11.7 1)" "87bbe88 3810e42 <p2b2> 90ea88d=$P1 $FIX $P3A"
  # the Check: the diff prints nothing; every line after the --stat summary is diff output (in any
  # format: the stand-in host's busybox diff is unified, the owner's GNU diff is not)
  row 11.7 "$( [ "$RC" = 0 ] && [ "$(out_of | sed 1d | grep -c .)" = 0 ] && echo DONE || echo FAILED)" "diff --name-only vs the commits' files" "$(out_of | head -n 3 | tr '\n' ';')"

  # ---- 11.8 (ruling C34): push the branch alone, SHA, CI for that sha, the gates in a detached worktree
  rb_run 11.8-push "$(rb_fence 11.8 1 '1,2p')"
  seen="$(out_of | grep -xE '[0-9a-f]{40}' | tail -n 1)"; lsr="$(git ls-remote origin refs/heads/release/drain | cut -f1)"
  ntag="$(git ls-remote origin 'refs/tags/drain-image*' | grep -c .)"
  row 11.8-push "$( [ "$RC" = 0 ] && [ -n "${SHA:-}" ] && [ "$SHA" = "$seen" ] && [ "$lsr" = "$SHA" ] && [ "$ntag" = 0 ] && echo DONE || echo FAILED)" \
    "git push origin release/drain (the branch alone, to the stand-in origin); SHA=\$(git rev-parse release/drain)" \
    "SHA=${SHA:-}; origin's release/drain $lsr; drain-image* tags on origin: $ntag" "the push goes to the stand-in origin; on the real remote it would start CI"
  row "11.8 CI" NRH "gh run list --commit \"\${SHA:?...}\"; gh run view <run-id>" "-" \
    "reads the GitHub Actions run of the pushed sha: needs gh, the owner's login and a push to the real remote (all forbidden here). The SHA guard on that line is exercised in WT8"
  rb_run 11.8-worktree "$(rb_fence 11.8 3 '1p')"
  wtp="/srv/ff-rdrain-${SHA:0:7}"; wth="$(git -C "$wtp" rev-parse HEAD 2>/dev/null)"; wtd="$(git -C "$wtp" status --porcelain 2>/dev/null | grep -c .)"
  wdet="$(git -C "$wtp" symbolic-ref -q HEAD >/dev/null 2>&1 && echo no || echo yes)"
  row 11.8-worktree "$( [ "$RC" = 0 ] && [ "$wth" = "$SHA" ] && [ "$wdet" = yes ] && [ "$wtd" = 0 ] && echo DONE || echo FAILED)" \
    "git worktree add --detach ../ff-rdrain-<sha7> \"\$SHA\"" "$(out_of | tr '\n' ';') path $wtp, HEAD $wth, detached $wdet, changes $wtd"
  row "11.8 gates" N/A "ff-gates.sh backend rdrain ../ff-rdrain-<sha7>" "-" \
    "not run, by scope rather than by need: the tool (docs/program/lab/ff-gates.sh in the plan checkout) could run on this PC, but the gate run that clears a drain-image tag is the coordinator's, under its gate slots; the stand-in host does not hold the tool. Its VERIFY (argument order, lane names) stays open"
  rb_run 11.8-remove "$(rb_fence 11.8 4)"
  row 11.8-remove "$( [ "$RC" = 0 ] && [ -z "$(out_of)" ] && [ ! -e "$wtp" ] && echo DONE || echo FAILED)" "git worktree remove ../ff-rdrain-<sha7>" \
    "prints [$(out_of | tr '\n' ' ')]; path gone: $([ -e "$wtp" ] && echo no || echo yes)"

  # ---- WT8: SHA left empty in a new terminal. Every line of 11.8 and 11.9 that uses SHA, pasted into
  # a fresh interactive bash where SHA was never set (continuation lines joined, as a paste is one command)
  wt8="$OUT/wt8.log"; : > "$wt8"; nlines=0; nguard=0
  wt8src="$(rb_fence 11.8 1; rb_fence 11.8 3; rb_fence 11.8 4; rb_fence 11.9 @tag/1)"
  rb_moved_check WT8 "$wt8src" || wt8src=""
  printf '%s\n' "$wt8src" | sed -e ':a' -e '/\\$/N; s/\\\n//; ta' \
    | grep 'SHA' | grep -v '^SHA=' > "$OUT/wt8-lines.txt"
  while IFS= read -r line; do
    nlines=$((nlines + 1))
    o="$(printf '%s\n' "$line" | env -u SHA PS1= PS2= bash --norc -i 2>&1 | grep -vE 'no job control|cannot set terminal|^exit$')"
    printf '### %s\n%s\n' "$line" "$o" >> "$wt8"
    echo "$o" | grep -q 'SHA: not set - run the SHA= line of 11.8' && nguard=$((nguard + 1))
  done < "$OUT/wt8-lines.txt"
  wt8tag="$(git tag -l drain-image | grep -c .)"; wt8wt="$(git worktree list | grep -c ff-rdrain)"
  wt WT8 "SHA left empty in a new terminal: each line of 11.8 and 11.9 that uses SHA pasted into a fresh interactive shell" \
    "$nlines lines; $nguard printed 'bash: SHA: not set - run the SHA= line of 11.8'; afterwards drain-image tags: $wt8tag, ff-rdrain worktrees: $wt8wt (log wt8.log)" \
    "$( [ "$nguard" = "$nlines" ] && [ "$wt8tag" = 0 ] && [ "$wt8wt" = 0 ] && echo "the \${SHA:?} guard on every line: nothing that writes ran, no tag and no worktree were made (11.9's last line runs its \$(git rev-parse 'drain-image^{commit}') before the guard: a read-only 'fatal:' line, see wt8.log)" || echo "NOT every line was stopped (see wt8.log)")" \
    "$( [ "$nguard" = "$nlines" ] && echo "no: already scripted (C34)" || echo "YES: the unguarded lines in wt8.log")"

  # ---- 11.9 tag that sha; 11.10 push the tag alone
  rb_run 11.9 "$(rb_fence 11.9 @tag/1)" " P2b-2 <p2b2>,=" "<run-id>=$NOTRUN_CI" "<summary path>=$NOTRUN_GATES" "<date UTC>=$(date -u +%F)"
  local_ok=no
  [ "$(git cat-file -t drain-image)" = tag ] && [ "$(git rev-parse 'drain-image^{commit}')" = "$SHA" ] && has 'drain-image = SHA = origin/release/drain' \
    && git tag -n1 drain-image | grep -q "$P1" && git tag -n1 drain-image | grep -q "$FIX" && git tag -n1 drain-image | grep -q "$P3A" && local_ok=yes
  row 11.9 "$( [ $local_ok = yes ] && echo DONE || echo FAILED)" "git tag -a drain-image ... \"\${SHA:?...}\"" "$(out_of | tr '\n' ';' | cut -c1-300)" \
    "the message's ' P2b-2 <p2b2>,' was dropped (P2b-2 absent); its CI run and gate summary say 'not run here'"
  rb_run 11.10 "$(rb_span 11.10 'git push origin')"
  rb_run 11.10-check "$(rb_span 11.10 'git ls-remote')"
  brl="$(out_of | awk '$2=="refs/heads/release/drain"{print $1}')"; pel="$(out_of | awk '$2=="refs/tags/drain-image^{}"{print $1}')"
  row 11.10 "$( [ "$brl" = "$SHA" ] && [ "$pel" = "$SHA" ] && out_of | grep -q 'refs/tags/drain-image$' && echo DONE || echo FAILED)" \
    "git push origin drain-image (the tag alone, to the stand-in origin)" "$(out_of | awk '{print substr($1,1,9), $2}' | tr '\n' ';')"
  row 11.11 N/A "record the cut in W0-results" "-" "the coordinator's record; this rehearsal's results file holds the log"

  # ---- 11.12: not until P12a and P12 merge; its tag line's guard against 11.8's SHA is WT11
  row 11.12 NRH "release/drain-web: pick P12a, P12; push, CI, gates, tag drain-web-image" "-" "P12a and P12 are not merged"
  rb_run wt11 "$(rb_fence 11.12 @web-tag/4)"
  wt WT11 "11.12's tag line run with SHA still holding 11.8's value (release/drain's commit)" \
    "printed: $(out_of | tr '\n' ' '); drain-web-image tags afterwards: $(git tag -l 'drain-web-image*' | grep -c .)" \
    "$(has "STOP: SHA is release/drain's commit" && [ -z "$(git tag -l 'drain-web-image*')" ] && echo "the tag line's own test: STOP, no tag" || echo "NOTHING: see the step log")" \
    "$(has "STOP: SHA is release/drain's commit" && echo "no: already scripted" || echo "YES")"
  if rb_anch 11.12 web-ci; then
    # the batch checks the web sha BEFORE the push (ruling C37): its check-and-push line, with SHA
    # still holding 11.8's value, must push nothing
    rb_run wt11b "$(rb_fence 11.12 @web-ci '2p')"
    wt WT11b "11.12's check-and-push line run with SHA still holding 11.8's value" \
      "printed: $(out_of | tr '\n' ' ' | cut -c1-200); origin's release/drain-web afterwards: $(git ls-remote origin refs/heads/release/drain-web | grep -c .)" \
      "$(has 'STOP: not pushed' && [ -z "$(git ls-remote origin refs/heads/release/drain-web)" ] && echo "the line's own test: STOP, nothing pushed" || echo "NOTHING: see the step log")" \
      "$(has 'STOP: not pushed' && echo "no: scripted (the batch's 11.12)" || echo "YES")"
  fi

  # ---- a clone made now is "behind" once 11.13 pushes the re-cut (WT10)
  git clone -q /srv/origin.git /srv/behind && git -C /srv/behind switch -q release/drain

  # ---- WT7 and WT9 in a clone of their own, so 11.6's recovery block runs on a real release/drain
  rm -rf /srv/wt7 && git clone -q /srv/origin.git /srv/wt7 && cd /srv/wt7 || exit 1
  SQ=f192fee; SQ_FULL="$(git rev-parse "$SQ")"
  git switch -q -c release/drain a31924a && git cherry-pick -x "$P1" >/dev/null 2>&1
  git cherry-pick -x "$SQ" > "$OUT/wt7-pick.log" 2>&1; rcsq=$?
  [ "$rcsq" = 0 ] || git cherry-pick --abort >/dev/null 2>&1
  git cherry-pick -x "$P3A" >/dev/null 2>&1 || git cherry-pick --abort >/dev/null 2>&1
  sqfiles="$( [ "$(git show --name-only --format= HEAD~1 | sort)" = "$(git show --name-only --format= "$FIX_TAG^{commit}" | sort)" ] && echo "the same four files as the tag" || echo "other files than the tag")"
  rb_run wt7-11.6 "$(rb_fence 11.6 1)"
  o76="$(out_of)"
  oldcount="$(git log a31924a..release/drain --format=%B | grep -c 'cherry picked from commit')"
  rb_run wt7-11.7 "$(rb_fence 11.7 1)" "87bbe88 3810e42 <p2b2> 90ea88d=$P1 $FIX $P3A"
  o77="$(out_of)"
  s117="$( [ "$(echo "$o77" | sed 1d | grep -c .)" = 0 ] && echo "silent (no file outside the commits)" || echo "lists files")"
  caught=no; [ "$rcsq" != 0 ] && caught=notrun; echo "$o76" | grep -qF "(cherry picked from commit $SQ_FULL)" && [ "$(echo "$o76" | grep 'cherry picked from')" != "$srcexp" ] && caught=yes
  # WT9 first: the recovery block pasted while another branch is checked out
  git switch -q main
  b9="$(git rev-parse main) $(git rev-parse release/drain)"
  rb_run wt9 "$(rb_fence 11.6 3)"
  o9="$(out_of)"; a9="$(git rev-parse main) $(git rev-parse release/drain)"
  wt WT9 "11.6's recovery (reset) block pasted while another branch (main) is checked out" \
    "printed: $(echo "$o9" | tr '\n' ';' | cut -c1-400); main and release/drain $( [ "$b9" = "$a9" ] && echo unchanged || echo CHANGED)" \
    "$(echo "$o9" | grep -q 'STOP: not on release/drain' && [ "$b9" = "$a9" ] && echo "the block's branch-name test: STOP: not on release/drain, nothing reset" || echo "NOTHING: see the step log")" \
    "$(echo "$o9" | grep -q 'STOP: not on release/drain' && [ "$b9" = "$a9" ] && echo "no: already scripted (C34)" || echo "YES")"
  # then the recovery as written, on release/drain, and the redo the text asks for
  git switch -q release/drain
  rb_run wt7-recover "$(rb_fence 11.6 3)"
  orc="$(out_of)"
  rb_run wt7-11.3a "$(rb_span 11.3a 'cherry-pick -x')"
  rb_run wt7-11.5 "$(rb_span 11.5 'cherry-pick -x')"
  rb_run wt7-11.6b "$(rb_fence 11.6 1)"
  o76b="$(out_of)"
  recok=no
  echo "$orc" | grep -qx 'release/drain' && echo "$orc" | grep -qx 'count=1' && echo "$orc" | grep -q '^HEAD is now at' \
    && [ "$(echo "$orc" | tail -n 1)" = "(cherry picked from commit $P1_FULL)" ] && [ "$(echo "$o76b" | grep 'cherry picked from')" = "$srcexp" ] && recok=yes
  wt WT7 "11.3a picks main's squash f192fee (PR #204) instead of the tag drain-pick-tz-fix (3810e42)" \
    "the pick: exit $rcsq$( [ "$rcsq" = 0 ] && echo ', no conflict' || echo ' (CONFLICT)'), $sqfiles. 11.6 log: $(echo "$o76" | grep -v 'cherry picked' | tr '\n' ';') 11.6 sources: $(echo "$o76" | grep 'cherry picked' | sed 's/(cherry picked from commit \(.......\)[0-9a-f]*)/\1/' | tr '\n' ' '). 11.7: $(echo "$o77" | tr '\n' ';' | cut -c1-120). A count of trailers (the pre-#206 Check) would read $oldcount and pass. Recovery as written: $(echo "$orc" | grep -E '^count=|^HEAD is now' | tr '\n' ';') then 11.3a, 11.5 and 11.6 again: sources $( [ "$recok" = yes ] && echo 'as expected' || echo 'NOT as expected')" \
    "$( [ $caught = yes ] && echo "11.6 as merged at 53c6046 (C32/C34): its source list names f192fee97d… where the Check wants 3810e420…, so the text says STOP; its reset block (computed P1 pick, branch-guarded) recovered the branch: $recok. 11.7 is $s117. The subject differs too, but only an operator comparing it notices" || { [ $caught = notrun ] && echo "wrong turn not reproduced: f192fee did not apply on P1 (see wt7-pick.log)" || echo "nothing: 11.6 and 11.7 both looked as expected"; })" \
    "$( [ $caught = yes ] && echo "no new guard: 11.6's source list is the guard, a comparison the operator reads, not a test that stops; the smallest scripted form is diff <(git log --reverse … | grep 'cherry picked from') <(expected lines) || echo STOP" || { [ $caught = notrun ] && echo "not judged" || echo "YES: compare the -x trailers to the expected full shas"; })"
  cd /srv/dev || exit 1

  # ---- 11.13 a re-cut after a window fix. The fix is a stand-in: one new file on top of main, kept
  # local (the stand-in origin's main stays the real main)
  git switch -q -c l4-window-fix origin/main && printf 'L4 stand-in window fix (lab only)\n' > ops/lab/L4-STANDIN-WINDOW-FIX.txt \
    && git add ops/lab/L4-STANDIN-WINDOW-FIX.txt && git commit -q -m "fix(lab): stand-in window fix for the L4 re-cut rehearsal" && WFIX="$(git rev-parse HEAD)"
  git switch -q release/drain
  echo "lab 11.13: the window fix is a stand-in commit (one new file, ops/lab/L4-STANDIN-WINDOW-FIX.txt) on top of main, not pushed to the stand-in origin's main" >> "$OUT/deviations.log"
  OLDSHA="$SHA"
  rb_run 11.13-sync "$(rb_fence 11.13 @fetch/1)"
  row 11.13-sync "$(has 'release/drain = origin/release/drain' && echo DONE || echo FAILED)" "fetch; switch release/drain; local = origin" "$(out_of | tail -n 1)"
  rb_run 11.13-pick "$(rb_fence 11.13 2)" "<fix-sha>=$WFIX"
  row 11.13-pick "$( [ "$RC" = 0 ] && ! has CONFLICT && echo DONE || echo FAILED)" "git cherry-pick -x <fix-sha> (the stand-in fix)" "exit $RC; $(out_of | head -n 1)"
  rb_run 11.13-6 "$(rb_fence 11.6 1)"
  row 11.13-6 "$( [ "$(out_of | grep -vc 'cherry picked from')" = 4 ] && [ "$(out_of | grep 'cherry picked from')" = "$srcexp
(cherry picked from commit $WFIX)" ] && echo DONE || echo FAILED)" "11.6 again" "$(out_of | tr '\n' ';' | cut -c1-400)" "three commits and the fix (P2b-2 absent); the trailer list is 11.6's lines followed by the fix's full sha"
  rb_run 11.13-7 "$(rb_fence 11.7 1)" "87bbe88 3810e42 <p2b2> 90ea88d=$P1 $FIX $P3A $WFIX"
  row 11.13-7 "$( [ "$RC" = 0 ] && [ "$(out_of | grep -c '^[<>]')" = 0 ] && echo DONE || echo FAILED)" "11.7 again with the fix" "$(out_of | head -n 2 | tr '\n' ';')"
  rb_run 11.13-push "$(rb_fence 11.8 1 '1,2p')"
  lsr="$(git ls-remote origin refs/heads/release/drain | cut -f1)"
  row 11.13-push "$( [ "$RC" = 0 ] && ! has 'forced update' && ! has rejected && [ "$SHA" != "$OLDSHA" ] && [ "$lsr" = "$SHA" ] && [ "$(git rev-parse "$SHA~1")" = "$OLDSHA" ] && echo DONE || echo FAILED)" \
    "11.8's push (a fast-forward) and SHA again" "SHA $OLDSHA -> $SHA; origin's release/drain $lsr; $(out_of | grep -E '\.\.|->' | head -n 1)"
  row "11.13 CI" NRH "11.8's gh run list/view for the new SHA" "-" "as 11.8 CI: needs gh, the owner's login and a push to the real remote"
  rb_run 11.13-worktree "$(rb_fence 11.8 3 '1p')"
  rcwa="$RC"; wtp="/srv/ff-rdrain-${SHA:0:7}"; wth="$(git -C "$wtp" rev-parse HEAD 2>/dev/null)"
  wdet="$(git -C "$wtp" symbolic-ref -q HEAD >/dev/null 2>&1 && echo no || echo yes)"
  row "11.13 gates" N/A "11.8's ff-gates.sh for the new SHA" "-" "as 11.8 gates: the coordinator's gate run"
  rb_run 11.13-remove "$(rb_fence 11.8 4)"
  row 11.13-worktree "$( [ "$rcwa" = 0 ] && [ "$wth" = "$SHA" ] && [ "$wdet" = yes ] && [ "$RC" = 0 ] && [ -z "$(out_of)" ] && [ ! -e "$wtp" ] && echo DONE || echo FAILED)" \
    "11.8's worktree for the new sha, then removed" "path $wtp at $wth, detached $wdet; remove printed [$(out_of | tr '\n' ' ')]; removed: $([ -e "$wtp" ] && echo no || echo yes)"
  rb_run 11.13-tag "$(rb_fence 11.13 @tag/3)" "<fix-sha>=$WFIX" "<run-id>=$NOTRUN_CI" "<summary path>=$NOTRUN_GATES" "<date UTC>=$(date -u +%F)"
  l4_mut 11.13-tag-gone && git push -q origin :refs/tags/drain-image-2 >/dev/null 2>&1
  pel2="$(git ls-remote origin 'refs/tags/drain-image-2*' | awk '$2=="refs/tags/drain-image-2^{}"{print $1}')"
  row 11.13 "$( [ "$RC" = 0 ] && [ "$(git rev-parse 'drain-image-2^{commit}')" = "$SHA" ] && [ "$(git rev-parse origin/release/drain)" = "$SHA" ] && [ "$pel2" = "$SHA" ] \
      && [ "$(git rev-parse 'drain-image^{commit}')" = "$OLDSHA" ] && [ "$(git log --oneline a31924a..release/drain | grep -c .)" = 4 ] && echo DONE || echo FAILED)" \
    "git tag -a drain-image-2 ... \"\$SHA\"; git push origin drain-image-2" "drain-image-2 -> $(git rev-parse --short 'drain-image-2^{commit}'); origin's peeled $(echo "$pel2" | cut -c1-9); drain-image still $(git rev-parse --short 'drain-image^{commit}')" \
    "the deploy below still uses drain-image (the re-cut is rehearsed, not deployed)"
  if rb_anch 11.13a web-fetch; then
    row 11.13a "$( [ -z "$(git ls-remote origin refs/heads/release/drain-web)" ] && echo N/A || echo NRH)" "re-cut release/drain-web after the same fix (only if it exists)" \
      "origin's release/drain-web: $(git ls-remote origin refs/heads/release/drain-web | grep -c .)" "the web branch does not exist here: P12a and P12 are not merged (11.12)"
  fi

  # ---- WT10: the re-cut started from a clone that is behind (made before the re-cut was pushed)
  cd /srv/behind || exit 1
  rb_run wt10 "$(rb_fence 11.13 @fetch/1)"
  o10="$(out_of)"; l10="$(git rev-parse --short release/drain)"; r10="$(git rev-parse --short origin/release/drain)"
  rm -rf /srv/fresh && git clone -q /srv/origin.git /srv/fresh && cd /srv/fresh || exit 1
  rb_run wt10-fresh "$(rb_fence 11.13 @fetch/1)"
  of="$(out_of | tail -n 1)"
  cd /srv/dev || exit 1
  wt WT10 "11.13 started in a clone made before the last cut was pushed (its release/drain is behind origin's)" \
    "printed: $(echo "$o10" | tail -n 1); local release/drain $l10, origin/release/drain $r10. The text's remedy, a fresh clone, prints: $of" \
    "$(echo "$o10" | grep -q "STOP: local release/drain is not origin's" && echo "11.13's equality test: STOP before any pick; a fresh clone passes it" || echo "NOTHING: see the step log")" \
    "$(echo "$o10" | grep -q "STOP: local release/drain is not origin's" && echo "no: already scripted (C34). It prints a STOP line but exits 0: a pasted block keeps going only if the operator ignores it" || echo "YES")"
  ;;

prebuild)
  rm -rf /srv/prebuild && git clone -q /srv/origin.git /srv/prebuild
  MAIN="$(git -C /srv/prebuild rev-parse HEAD)"
  FF_ROOT=/srv/prebuild ffc --profile db --profile app --profile web build backend web > "$OUT/prebuild-main.log" 2>&1 \
    && echo "prebuild: fixflow/backend and fixflow/web at $MAIN" || { echo "prebuild failed"; tail "$OUT/prebuild-main.log"; exit 1; }
  # A train row that carries a migration (the binding review's findings 3 and 7): a stand-in
  # commit on top of main, kept in the stand-in origin only (branch l4-next, never on GitHub). It
  # adds the next migration in the chain, which writes to every job row, and moves CLAUDE.md's
  # head to it. deploy lands it on the stand-in's main after the first R5.9, so R5 applies a new
  # migration to populated data and R5.9 meets a database above the previous version's head.
  rm -rf /srv/next && git clone -q /srv/origin.git /srv/next && cd /srv/next || exit 1
  git config --global user.name "L4 rehearsal"; git config --global user.email "l4@example.invalid"
  V=backend/alembic/versions
  revs="$(grep -h '^revision' $V/*.py | sed 's/.*"\(.*\)".*/\1/')"
  downs="$(grep -h '^down_revision' $V/*.py | sed 's/.*"\(.*\)".*/\1/')"
  HEADREV="$(for r in $revs; do printf '%s\n' "$downs" | grep -qx "$r" || echo "$r"; done)"
  [ "$(printf '%s\n' "$HEADREV" | grep -c .)" = 1 ] || { echo "prebuild: the migration head is not one revision: [$HEADREV]"; exit 1; }
  CH="$(claude_head /srv/next)"
  [ "$CH" = "$HEADREV" ] || echo "lab: CLAUDE.md at main says head $CH, the migration chain ends at $HEADREV" >> "$OUT/deviations.log"
  NEXTREV="$(printf '%04d' $((10#$HEADREV + 1)))"
  cat > "$V/${NEXTREV}_l4_standin_row.py" <<PY
"""L4 STAND-IN, lab only, never on GitHub: a train row's migration on populated data

Revision ID: $NEXTREV
Revises: $HEADREV
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "$NEXTREV"
down_revision: str | None = "$HEADREV"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("job", sa.Column("l4_standin_mark", sa.Text(), nullable=True))
    op.execute("UPDATE job SET l4_standin_mark = 'l4'")


def downgrade() -> None:
    op.drop_column("job", "l4_standin_mark")
PY
  sed -i "s/head = \*\*$CH\*\*/head = **$NEXTREV**/" CLAUDE.md
  git add -A && git commit -q -m "L4 STAND-IN: a train row with migration $NEXTREV (lab only)" && git push -q origin HEAD:refs/heads/l4-next \
    || { echo "prebuild: the stand-in migration row could not be made"; exit 1; }
  NEXT="$(git rev-parse HEAD)"
  printf 'NEXT=%s\nNEXTREV=%s\nHEADREV=%s\n' "$NEXT" "$NEXTREV" "$HEADREV" > /srv/l4/next.env
  echo "lab: stand-in train row with a migration: commit ${NEXT:0:7} on the stand-in origin's l4-next adds $NEXTREV after $HEADREV (writes job.l4_standin_mark on every row) and sets CLAUDE.md's head to $NEXTREV" >> "$OUT/deviations.log"
  FF_ROOT=/srv/next ffc --profile db --profile app --profile web build backend web > "$OUT/prebuild-next.log" 2>&1 \
    && echo "prebuild: fixflow/backend and fixflow/web at the stand-in row $NEXT" || { echo "prebuild of the stand-in row failed"; tail "$OUT/prebuild-next.log"; exit 1; }
  cd / || exit 1
  ;;

deploy)
  sec4_profiles
  lab_up || exit 1
  PHASE=train-restore
  sec6 "(drain-image, nightly form)" "$NIGHTLY" a
  sec6_tail
  # stand-in accounts for the rows' checks (harness setup): known stand-in PINs for m1, t1, t2
  for t in m1 t1 t2; do
    p="$(python3 -c 'import secrets; print("".join(str(secrets.randbelow(10)) for _ in range(6)))')"; secret "$p"
    printf '%s\n' "$p" | ffc exec -T backend python -m scripts.set_pin --tech $t --pin-stdin --apply > /dev/null 2>&1
    eval "export L4_PIN_$(echo $t | tr a-z A-Z)=$p"
  done
  echo "lab: stand-in PINs set for m1, t1, t2 by set_pin --pin-stdin (values in no file)" >> "$OUT/deviations.log"

  PHASE=train
  rb_run 11.14 "$(rb_fence 11.14 1)"
  row 11.14 "$( [ "$(out_of)" = drain-image ] && echo DONE || echo FAILED)" "describe --tags --exact-match HEAD" "$(out_of)"

  # ---- 12.4 / R5 to main (the target)
  r5 ""

  # ---- 12.5: each row's post-deploy check, in table order
  BIP="$(docker inspect -f '{{(index .NetworkSettings.Networks "fixflow_app").IPAddress}}' "$(ffc $P_RUN ps -q backend)")"
  BASE="http://$BIP:8000"
  setup="$(python3 /srv/l4/kit/lib/traincheck.py "$BASE" p6a-setup 2>&1)"
  r6="$(python3 /srv/l4/kit/lib/traincheck.py "$BASE" p6a "$(echo "$setup" | tail -n 1)" 2>&1)"
  tmpl="$(grep -cE 'FIXFLOW_(ATTENDANCE_LOCATION|JOBS_PUNCH)_ACCURACY_CEILING_M' /opt/fixflow/ops/selfhost/env/backend.env.example)"
  res6="$(echo "$r6" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"])' 2>/dev/null || echo FAIL)"
  [ "$hb" = 0 ] && [ "$tmpl" = 0 ] || res6=FAIL
  trow P6a "sampler_state, last_ping_at, pings_today on the board; clocked in without a recent ping is stale/silent; day view effective time; shift before midnight on duty; two retired keys ignored and absent from the template" \
    "$res6" "fixture: $(echo "$setup" | cut -c1-300) | check: $r6 | backend booted healthy with both retired keys set: $([ $hb = 0 ] && echo yes || echo no); template lines naming them: $tmpl"
  J_OTHER="$(psql_app -c "select id from job where assigned_tech_id='t2' and status in ('open','waiting','ready') order by token limit 1")"
  J_CLOSED="$(psql_app -c "select id from job where status='closed' order by token limit 1")"
  J_UNCL="$(psql_app -c "select id from job where assigned_tech_id is null and status='open' order by token limit 1")"
  l4_mut p7a-open-job && J_CLOSED="$(psql_app -c "select id from job where status='open' order by token desc limit 1")"
  r7="$(python3 /srv/l4/kit/lib/traincheck.py "$BASE" p7a "{\"other\": \"$J_OTHER\", \"closed\": \"$J_CLOSED\", \"unclaimed\": \"$J_UNCL\"}" 2>&1)"
  J_UNCL="$(echo "$r7" | tail -n 1 | python3 -c 'import json,sys; print(json.load(sys.stdin).get("unclaimed",""))' 2>/dev/null)"
  claims="$(psql_app -c "select count(*) from job_event where job_id='$J_UNCL' and kind='claim' and actor='t1'" 2>/dev/null)"
  res7="$(echo "$r7" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"])' 2>/dev/null || echo FAIL)"
  [ "$claims" = 1 ] || res7=FAIL
  trow P7a "(1) tech GET another tech's job 403; (2) payment on a closed job 409 '(current status: closed)'; (3) tech note on an unclaimed job 201 + assigned + one claim event; (4) GET /api/jobs/99999999999/media not 500" \
    "$res7" "$r7 | claim events by t1 on that job: $claims"
  r204="$(python3 /srv/l4/kit/lib/traincheck.py "$BASE" p204 2>&1)"
  res204="$(echo "$r204" | tail -n 1 | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"])' 2>/dev/null || echo FAIL)"
  trow "f192fee (#204)" "GET /api/jobs/reports/tech-metrics as a manager with no dates: the window ends on the shop-local today (no migration). In the drain tree the same fix is the original 3810e42 (11.3a, ruling C30)" \
    "$res204" "$r204"
  deep_health > "$OUT/deep-health-train.json"
  d="$OUT/deep-health-train.json"
  ports="$(docker ps --format '{{.Names}} [{{.Ports}}]' | grep -c -- '->')"
  f3="environment=$(jget facts.environment < "$d") git_sha=$(jget facts.git_sha < "$d") backup_prefix=$(jget facts.backup_prefix < "$d") enable_dispatcher=$(jget facts.enable_dispatcher < "$d") database=$(jget components < "$d" | jget database.status); '->' lines: $ports"
  res3=FAIL
  [ "$(jget facts.environment < "$d")" = production ] && [ "$(jget facts.git_sha < "$d")" = "$TARGET" ] && [ "$(jget facts.backup_prefix < "$d")" = backups/db-selfhost/ ] \
    && [ "$(jget facts.enable_dispatcher < "$d")" = False ] && [ "$(jget components < "$d" | jget database.status)" = ok ] && [ "$ports" = 0 ] && res3=PASS
  trow "P3a first boot" "deep health environment=production, git_sha = deployed commit, backup_prefix=backups/db-selfhost/, enable_dispatcher=false, database ok; docker ps shows no '->'" \
    "$res3" "$f3 (read after the train deploy; the same facts after 6.9 on drain-image are in the step table)"
  sed -i '/^FIXFLOW_ATTENDANCE_LOCATION_ACCURACY_CEILING_M=/d; /^FIXFLOW_JOBS_PUNCH_ACCURACY_CEILING_M=/d' /etc/fixflow/backend.env

  # ---- 12.6 the web image from main
  WEBIMG="$(docker inspect --format '{{.Image}}' "$(ffc ps -q web)" 2>/dev/null)"
  row 12.6 AMBIGUOUS "web built from main in R5.5 and started in R5.6" "web image $(echo "$WEBIMG" | cut -c1-19)" \
    "the board 'shows sampler_state' is a page in a browser; the same fields were read from the API in the P6a row. 12.6's 'ffc \$P_RUN build web' is the build R5.5 already did"

  # ---- R5.9 the rollback, to PREV (the drain-image commit)
  PHASE=rollback
  r59 ""

  # ---- a train row that carries a migration (stand-in): R5 again, then R5.9's refusal branch
  PHASE=train-migration
  source /srv/l4/next.env
  git -C /srv/next push -q origin "$NEXT:refs/heads/main" || { echo "could not land the stand-in row on the stand-in main"; exit 1; }
  echo "lab: the stand-in row ${NEXT:0:7} (migration $NEXTREV) landed on the stand-in origin's main after the first R5.9 (a fast-forward)" >> "$OUT/deviations.log"
  r5 " (migration row)"
  mark="$(psql_app -c "select count(*) filter (where l4_standin_mark = 'l4') || '|' || count(*) from job" 2>&1)"
  row "12.4b (migration row)" "$( [ "${mark%%|*}" = "${mark##*|}" ] && [ "${mark##*|}" -gt 0 ] 2>/dev/null && echo DONE || echo FAILED)" \
    "start.sh applied the stand-in row's migration $NEXTREV on boot" "job rows written by the migration | job rows: $mark" \
    "the migration ran against the restored, populated database (plan 7.5: run start.sh's migrations to the new head)"
  PHASE=rollback-migration
  r59 " (migration row)"
  sec4_5 "4.5 (after the train)"
  ;;
esac
