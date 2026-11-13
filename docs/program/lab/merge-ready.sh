#!/usr/bin/env bash
# The coordinator's merge gate (plan section 7.7; merging was delegated by the owner on 2026-11-13).
# Refuses to merge unless every condition holds, then squash-merges and keeps the branch.
#
#   merge-ready.sh <pr number> <verdict file> [--dry-run]
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
PR="${1:?usage: merge-ready.sh <pr> <verdict file> [--dry-run]}"
VF="${2:?verdict file}"
DRY="${3:-}"
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

# merge-hold list, plan section 7.2
case "$PHASE" in
  P5a|P5b-1|P5b-2|P14-*) die "$PHASE is held until P4a passed and the SDK row is answered" ;;
  P6b-1|P6b-2)           die "$PHASE is held until P4c is done" ;;
  P7b-1)                 die "$PHASE is held until every roster phone is on v2 or retired" ;;
  P9a-1|P9a-2|P9b|P10a|P11) die "$PHASE is held until P5d-2 is done and P9-0b is answered" ;;
  P13a|P13b|P13c|P13d)   die "$PHASE is held until T_close" ;;
esac

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

CHECKS="$(node -e "const j=JSON.parse(process.argv[1]);const c=j.statusCheckRollup||[];const bad=c.filter(x=>(x.conclusion||x.status)!=='SUCCESS');console.log(c.length+' '+bad.length)" "$J")"
set -- $CHECKS
[ "$1" -ge 3 ] || die "expected the three CI jobs on $HEAD, found $1"
[ "$2" -eq 0 ] || die "$2 of $1 checks on $HEAD are not SUCCESS"
[ "$MS" = "CLEAN" ] || die "GitHub merge state is $MS (rebase needed?)"

BODY="$(mktemp)"
{
  echo "Phase $PHASE of the FixFlow ship plan (docs/program/SHIP-PLAN-2026-11.md on the plan branch, PR #182)."
  echo
  echo "Merged by the coordinator under the owner's delegation of 2026-11-13 (plan section 7.7):"
  echo "CI green on $HEAD; binding review $(head -1 "$VF") on that SHA."
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
