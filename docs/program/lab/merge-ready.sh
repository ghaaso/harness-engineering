#!/usr/bin/env bash
# The coordinator's merge gate (plan section 7.7; merging was delegated by the owner on 2026-11-13).
# Refuses to merge unless every condition holds, then squash-merges and keeps the branch.
#
#   merge-ready.sh <pr number> <verdict file> [--dry-run]
#                  [--local-checks <backend log dir> <mobile log dir> <web log dir>]
#
# --local-checks is the owner's decision N6 of 2026-11-14 ("Yes, local checks"; ruling C60): while
# GitHub refuses to START its jobs (billing, ruling C52), the same three job kinds run on this PC
# by ff-gates.sh stand in for them. The three log dirs are full, clean-tree runs of the PR head as
# it will sit on main: the head itself when origin/main is its ancestor, otherwise a local merge
# commit of exactly origin/main and the head. A GitHub check that really ran and did not succeed is
# never overridden: local mode is refused unless every non-green check on the head ended within
# seconds of starting (a refused job) or the head has no checks at all.
#
# <verdict file> is the binding review's report as the coordinator saved it. Its first line must
# read "VERDICT: PASS" (a PASS-WITH-FIXES verdict is merged only after the fixes were re-read and
# the coordinator rewrote that line to PASS with the new SHA), and it must contain the full head
# SHA it reviewed.
#
# Checks, in order: the PR is open, not a draft, and titled "[<phase>] ..."; the phase is not on
# the merge-hold list; its merge-order predecessor is merged; the head SHA on GitHub is the SHA
# the verdict names; every check on that head succeeded; GitHub reports the merge state clean.
# Merging deploys nothing (standing rule 3).
set -u
GH="/c/Program Files/GitHub CLI/gh.exe"
PR="${1:?usage: merge-ready.sh <pr> <verdict file> [--dry-run] [--local-checks <backend dir> <mobile dir> <web dir>]}"
VF="${2:?verdict file}"
shift 2
DRY=""; LOCAL=0; LB=""; LM=""; LW=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run) DRY="--dry-run"; shift ;;
    --local-checks)
      [ "$#" -ge 4 ] || { echo "REFUSED: --local-checks needs three log dirs (backend, mobile, web)"; exit 1; }
      LOCAL=1; LB="$2"; LM="$3"; LW="$4"; shift 4 ;;
    *) echo "REFUSED: unknown argument $1"; exit 1 ;;
  esac
done
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_DIR" || exit 2
die() { echo "REFUSED: $*"; exit 1; }
[ -f "$VF" ] || die "no verdict file at $VF"

J="$("$GH" pr view "$PR" --json number,title,state,isDraft,headRefOid,headRefName,mergeStateStatus,statusCheckRollup,baseRefName 2>/dev/null)" || die "cannot read PR #$PR"
field() { node -e "const j=JSON.parse(process.argv[1]);const v=j[process.argv[2]];console.log(typeof v==='string'?v:JSON.stringify(v))" "$J" "$1"; }
TITLE="$(field title)"; STATE="$(field state)"; DRAFT="$(field isDraft)"; HEAD="$(field headRefOid)"; MS="$(field mergeStateStatus)"; BASE="$(field baseRefName)"
[ "$STATE" = "OPEN" ] || die "PR #$PR is $STATE"
[ "$DRAFT" = "false" ] || die "PR #$PR is still a draft (the lane has not reported READY)"
[ "$BASE" = "main" ] || die "PR #$PR targets $BASE, not main"
PHASE="$(echo "$TITLE" | sed -n 's/^\[\([A-Za-z0-9-]*\)\].*/\1/p')"
[ -n "$PHASE" ] || die "title does not start with [<phase>]: $TITLE"

# a hold on one PR (a ruling that makes its merge wait for something a verdict and green checks do
# not show): a file named after the PR number, its first line the reason. The coordinator writes
# it with the ruling and removes it when the condition is met.
HOLD="${FF_HOLD_DIR:-/c/Users/User/.fixflow-cache/handoff/holds}/$PR"
[ -f "$HOLD" ] && die "PR #$PR is on hold: $(head -1 "$HOLD" | cut -c1-200)"

# merge-hold list, plan section 7.2
case "$PHASE" in
  P5a|P5b-1|P5b-2|P14-*) die "$PHASE is held until P4a passed and the SDK row is answered" ;;
  P6b-1|P6b-2)           die "$PHASE is held until P4c is done" ;;
  P7b-1)                 die "$PHASE is held until every roster phone is on v2 or retired" ;;
  P9a-1|P9a-2|P9b|P10a|P11) die "$PHASE is held until P5d-2 is done and P9-0b is answered" ;;
  P13a|P13b|P13c|P13d)   die "$PHASE is held until T_close" ;;
esac

# value hold, plan section 7.2: a phase built with a named placeholder merges only when the owner
# has supplied the value. P2b-1 carries two: the fleet versionCode and the domain name.
if [ "$PHASE" = "P2b-1" ]; then
  git fetch -q origin 2>/dev/null
  if git show "$HEAD:technician-app/fleet-version.js" 2>/dev/null | grep -q "FLEET_VERSION_CODE = 0;"; then
    die "P2b-1 is held: the fleet versionCode is still the placeholder 0 (the owner's value, P0a item 6)"
  fi
  if git show "$HEAD:technician-app/eas.json" 2>/dev/null | grep -q "fleet-domain-not-set.invalid"; then
    die "P2b-1 is held: the domain name is still the placeholder (the owner's value, P0b)"
  fi
fi

# merge order, plan section 7.2 ("Merges no earlier than")
pred=""
case "$PHASE" in
  P7a|P6a|P3a) pred="P1" ;;
  P2b-1) pred="P2a" ;;
  P2b-2) pred="P2b-1" ;;
  P8a|P7b-2) pred="P7a" ;;
  P8b) pred="P8a" ;;
  P12) pred="P12a" ;;
  L3a) pred="L2" ;;
esac
if [ -n "$pred" ]; then
  n="$("$GH" pr list --state merged --limit 100 --json title --jq "[.[] | select(.title | startswith(\"[$pred]\"))] | length" 2>/dev/null)"
  [ "${n:-0}" -ge 1 ] || die "$PHASE merges after $pred, and no merged PR is titled [$pred]"
fi

head -1 "$VF" | grep -q '^VERDICT: PASS[[:space:]]*$' || die "verdict file line 1 is not exactly 'VERDICT: PASS': $(head -1 "$VF" | cut -c1-80)"
grep -q "$HEAD" "$VF" || die "the verdict does not name the PR's head $HEAD (a push after the review needs a re-read of the diff since the reviewed SHA)"

# total, not green, and how many of the not-green ones really ran (still going, or took longer
# than 20 s from start to end: a job GitHub refuses for billing ends within a second or two)
CHECKS="$(node -e "
const j=JSON.parse(process.argv[1]);const c=j.statusCheckRollup||[];
const bad=c.filter(x=>(x.conclusion||x.status)!=='SUCCESS');
const ran=bad.filter(x=>{ if((x.status||'COMPLETED')!=='COMPLETED') return true;
  const a=Date.parse(x.startedAt||''), b=Date.parse(x.completedAt||'');
  if(!Number.isFinite(a)||!Number.isFinite(b)) return true; return (b-a)>20000; });
console.log(c.length+' '+bad.length+' '+ran.length)" "$J")"
set -- $CHECKS
N_CHECKS="$1"; N_BAD="$2"; N_RAN="$3"
HOW="CI green on $HEAD"
if [ "$N_CHECKS" -ge 3 ] && [ "$N_BAD" -eq 0 ]; then
  [ "$MS" = "CLEAN" ] || die "GitHub merge state is $MS (rebase needed?)"
elif [ "$LOCAL" = 1 ]; then
  [ "$N_RAN" -eq 0 ] || die "$N_RAN check(s) on $HEAD really ran and did not succeed: local checks never override a red check"
  case "$MS" in CLEAN|UNSTABLE) ;; *) die "GitHub merge state is $MS (rebase needed?)" ;; esac
  git fetch -q origin main 2>/dev/null
  MAIN="$(git rev-parse origin/main)"
  TESTED=""
  for pair in "backend:$LB:8" "mobile:$LM:3" "web:$LW:4"; do
    want="${pair%%:*}"; rest="${pair#*:}"; d="${rest%:*}"; min="${rest##*:}"
    s="$d/summary.txt"
    [ -f "$s" ] || die "local checks: no summary at $s"
    c="$(tr -d '\r' < "$s")"
    k="$(printf '%s\n' "$c" | sed -n '1s/.* kind=\([a-z]*\) .*/\1/p')"
    [ "$k" = "$want" ] || die "local checks: $s is a '$k' run, expected $want"
    printf '%s\n' "$c" | sed -n '1p' | grep -q ' tree=clean ' || die "local checks: $want ran on a dirty tree"
    printf '%s\n' "$c" | grep -q '^RUN partial' && die "local checks: $want was a partial run"
    printf '%s\n' "$c" | grep -q '^SETUP\[' && die "local checks: $want reports a setup failure"
    printf '%s\n' "$c" | grep -q '^SUMMARY FAIL=0$' || die "local checks: $want did not end SUMMARY FAIL=0"
    n="$(printf '%s\n' "$c" | grep -c '^GATE\[')"
    [ "$n" -ge "$min" ] || die "local checks: $want ran $n gate(s), expected at least $min"
    printf '%s\n' "$c" | grep '^GATE\[' | grep -vq 'EXIT=0$' && die "local checks: a $want gate did not exit 0"
    t="$(printf '%s\n' "$c" | sed -n '1s/.* head=\([0-9a-f]*\) .*/\1/p')"
    [ -n "$t" ] || die "local checks: $s names no head"
    if [ -z "$TESTED" ]; then TESTED="$t"; else [ "$t" = "$TESTED" ] || die "local checks: the three runs tested different commits ($TESTED, $t)"; fi
  done
  T_FULL="$(git rev-parse --verify -q "$TESTED^{commit}")" || die "local checks: the tested commit $TESTED is not in this repository"
  if [ "$T_FULL" = "$HEAD" ]; then
    git merge-base --is-ancestor "$MAIN" "$HEAD" || die "local checks ran on the head, but origin/main ${MAIN:0:7} is not its ancestor: test the head merged with main"
  else
    P="$(git rev-list --parents -n 1 "$T_FULL")"
    set -- $P
    [ "$#" -eq 3 ] || die "local checks: the tested commit $TESTED is neither the head nor a two-parent merge"
    { [ "$2" = "$MAIN" ] && [ "$3" = "$HEAD" ]; } || { [ "$2" = "$HEAD" ] && [ "$3" = "$MAIN" ]; } \
      || die "local checks: the tested merge $TESTED is not a merge of origin/main ${MAIN:0:7} and the head ${HEAD:0:7}"
  fi
  HOW="GitHub did not start its jobs on $HEAD (billing, ruling C52). The same three checks ran on this PC on ${T_FULL:0:12} (the head on main ${MAIN:0:7}): $(basename "$LB"), $(basename "$LM"), $(basename "$LW"). Owner's decision N6 of 2026-11-14 (ruling C60)"
else
  [ "$N_CHECKS" -ge 3 ] || die "expected the three CI jobs on $HEAD, found $N_CHECKS"
  die "$N_BAD of $N_CHECKS checks on $HEAD are not SUCCESS"
fi

BODY="$(mktemp)"
{
  echo "Phase $PHASE of the FixFlow ship plan (docs/program/SHIP-PLAN-2026-11.md on the plan branch, PR #182)."
  echo
  echo "Merged by the coordinator under the owner's delegation of 2026-11-13 (plan section 7.7):"
  echo "$HOW; binding review $(head -1 "$VF") on that SHA."
  echo
  echo "Merging deploys nothing (standing rule 3)."
  echo
  echo "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
} > "$BODY"

echo "OK to merge: #$PR $TITLE @ ${HEAD:0:7} (phase $PHASE${pred:+, after $pred})"
if [ "$DRY" = "--dry-run" ]; then echo "(dry run: not merged)"; rm -f "$BODY"; exit 0; fi
"$GH" pr merge "$PR" --squash --subject "$TITLE (#$PR)" --body-file "$(cygpath -m "$BODY")" || { rm -f "$BODY"; die "gh pr merge failed"; }
rm -f "$BODY"
git fetch -q origin main
echo "MERGED #$PR as $(git rev-parse --short origin/main) on main"
