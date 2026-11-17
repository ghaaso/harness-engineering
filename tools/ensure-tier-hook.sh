#!/usr/bin/env bash
# Checks that the folder a harness session is about to start in carries the tier hook, and installs
# it when the folder is inside this repository and has no settings file of its own.
# Usage: tools/ensure-tier-hook.sh <folder> [--force]
# Exit: 0 present or installed, 2 no such folder, 3 outside this repository (not installed), 4 a
# settings file exists without the hook (not overwritten).
set -u
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && (pwd -W 2>/dev/null || pwd))"
HOOK="$REPO/.claude/hooks/tier-hook.mjs"
F="${1:?give the folder}"; FORCE="${2:-}"
[ -d "$F" ] || { echo "no such folder: $F"; exit 2; }
ABS="$(cd "$F" && (pwd -W 2>/dev/null || pwd))"
if grep -qs "tier-hook.mjs" "$ABS/.claude/settings.json" "$ABS/.claude/settings.local.json"; then echo "present: $ABS"; exit 0; fi
case "$ABS" in
  "$REPO"|"$REPO"/*) ;;
  *) if [ "$FORCE" != "--force" ]; then
       echo "not installed: $ABS is outside the harness repository. Other sessions there may follow other routes, and the hook would refuse their helpers. Start harness sessions inside the harness repository, or pass --force."; exit 3; fi ;;
esac
if [ -e "$ABS/.claude/settings.json" ]; then echo "not installed: $ABS/.claude/settings.json exists without the hook. Add the PreToolUse entry by hand."; exit 4; fi
mkdir -p "$ABS/.claude" && cat > "$ABS/.claude/settings.json" <<EOF
{ "hooks": { "PreToolUse": [ { "matcher": "*", "hooks": [ { "type": "command", "command": "node \"$HOOK\"" } ] } ] } }
EOF
echo "installed: $ABS/.claude/settings.json"
