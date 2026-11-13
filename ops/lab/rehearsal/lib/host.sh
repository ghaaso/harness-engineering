# shellcheck shell=bash
# Host side of the L4 rehearsals (Git Bash on the Windows development PC, or any Linux shell).
# Sourced by restore-rehearsal.sh and train-rehearsal.sh. Everything it creates on this PC's
# Docker daemon is named fixflow-l4-*:
#   container fixflow-l4-host         the stand-in VPS: docker:dind, default bridge, no port
#   volume    fixflow-l4-host-docker  that host's /var/lib/docker (image and build cache; kept
#                                     between runs unless --purge, so a re-run does not rebuild)
# Inside the stand-in host the stack is the real compose project `fixflow` at the runbook's own
# paths (/opt/fixflow, /etc/fixflow, /var/lib/fixflow); its networks live in that host's own
# Docker daemon, so this PC's exhausted address pools are never touched and no network is
# created here.
set -u
export MSYS_NO_PATHCONV=1

L4_HOST=fixflow-l4-host
L4_VOL=fixflow-l4-host-docker
L4_DIND_IMAGE="${L4_DIND_IMAGE:-docker:27.5.1-dind}"
L4_SLOT="${L4_SLOT:-C:/Users/User/Documents/projects/EMS_workshop1/docs/program/lab/ff-slot.sh}"
L4_RESULTS_ROOT="${L4_RESULTS_ROOT:-C:/Users/User/.fixflow-cache/lab/l4}"
# Images copied from this PC's daemon into the stand-in host when present (saves a download);
# anything missing is pulled inside the stand-in host while it is still online.
L4_SEED_IMAGES="postgres:17-bookworm python:3.12-slim node:22-alpine caddy:2-alpine"

l4_die() { echo "L4: $*" >&2; exit 1; }
l4_dx() { docker exec "$L4_HOST" "$@"; }
l4_win() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf "%s" "$1"; fi; }

# Warm (the image-cache volume exists), the stand-in host peaks at about 0.7 GB, mean 0.5 GB
# (the binding review's 117 samples): one slot of the light pool. Cold (no volume: the first run,
# or the run after a --purge), it pulls and builds every image: one slot of the heavy pool.
l4_slot_acquire() { # holds one slot for this script's lifetime
  L4_POOL=light
  docker volume inspect "$L4_VOL" >/dev/null 2>&1 || L4_POOL=heavy
  if [ -f "$L4_SLOT" ]; then
    echo "L4: taking a slot of the $L4_POOL pool ($( [ $L4_POOL = light ] && echo warm || echo 'cold: no image cache'))"
    FF_POOL=$L4_POOL bash "$L4_SLOT" acquire "l4-$1" 1 "$$" || l4_die "could not take a slot"
    L4_SLOT_HOLDER="l4-$1"
  else
    echo "L4: no ff-slot.sh at $L4_SLOT; running without the shared lock" >&2
    L4_SLOT_HOLDER=""
  fi
}
l4_slot_release() {
  [ -n "${L4_SLOT_HOLDER:-}" ] && FF_POOL="${L4_POOL:-light}" bash "$L4_SLOT" release "$L4_SLOT_HOLDER" >/dev/null 2>&1
  L4_SLOT_HOLDER=""
}

l4_host_up() {
  docker info >/dev/null 2>&1 || l4_die "Docker is not running"
  docker rm -f "$L4_HOST" >/dev/null 2>&1
  # --privileged is what Docker-in-Docker needs; the daemon listens on its unix socket only
  # (no TCP listener, so nothing on the bridge can drive it). No port is published.
  docker run -d --privileged --name "$L4_HOST" --hostname l4-host --memory "${L4_MEMORY:-6g}" \
    -v "$L4_VOL:/var/lib/docker" "$L4_DIND_IMAGE" dockerd --host=unix:///var/run/docker.sock >/dev/null \
    || l4_die "could not start $L4_HOST"
  local i
  for i in $(seq 1 60); do
    l4_dx docker info >/dev/null 2>&1 && break
    sleep 2
  done
  l4_dx docker info >/dev/null 2>&1 || l4_die "the stand-in host's Docker did not start"
  # The cache volume keeps the stand-in host's images between runs, but also its containers,
  # volumes and networks, and its daemon restarts a previous run's stack (restart:
  # unless-stopped), creating that stack's bind-mount directories (/opt/fixflow/..., /srv/l4/...)
  # in this new container. Every run starts from an empty host: the containers, volumes and
  # networks go, then those directories, and only the images survive.
  l4_dx sh -c 'ids=$(docker ps -aq); [ -z "$ids" ] || docker rm -f $ids >/dev/null;
    docker volume prune -af >/dev/null; docker network prune -f >/dev/null' \
    || l4_die "could not empty the stand-in host"
  [ -z "$(l4_dx docker ps -aq)" ] || l4_die "the stand-in host still has containers"
  l4_dx rm -rf /opt/fixflow /etc/fixflow /var/lib/fixflow /var/log/fixflow /srv/l4 /srv/prep /srv/dev /srv/prebuild
  l4_dx sh -c '! test -e /opt/fixflow && ! test -e /srv/l4' || l4_die "the stand-in host is not fresh"
  # A mirror can stall a download for good: each attempt is bounded, and three are allowed.
  local ok=0
  for i in 1 2 3; do
    l4_dx timeout 240 apk add -q --no-cache bash git python3 openssl curl iproute2 coreutils util-linux \
      findutils grep sed gawk procps logrotate cronie >/dev/null 2>&1 && { ok=1; break; }
    echo "L4: apk add attempt $i did not finish; retrying" >&2
  done
  [ "$ok" = 1 ] || l4_die "apk add failed three times (is the PC online?)"
  # A Debian host runs a cron that reads /etc/cron.d (7.4, 7.7 and 7.8 install into it, with a
  # user field). Alpine's busybox crond does not read it; cronie (1.7, the same cron Fedora and
  # RHEL ship) does, so the installed files run here as written.
  l4_dx mkdir -p /etc/cron.d
  l4_dx crond -s || l4_die "cronie's crond did not start"
  local img have
  for img in $L4_SEED_IMAGES; do
    have="$(l4_dx docker image ls -q "$img")"
    [ -n "$have" ] && continue
    if docker image inspect "$img" >/dev/null 2>&1; then
      docker save "$img" | l4_dx sh -c 'docker load -q' >/dev/null
    fi
  done
}

# The repository the stand-in host clones from: a bare repo inside it, filled from a bundle of
# this checkout's refs. It stands in for GitHub: the runbook's `git clone <repo-url>`,
# `git fetch origin --tags` and `git push origin ...` all go to it, never to the real remote.
# <ref> is the code and runbook under rehearsal (default origin/main): it becomes the stand-in's
# `main`, so a runbook change can be rehearsed from its PR branch before it merges. A ref of the
# form origin/<branch> is fetched from GitHub first (read only, into this repository's refs, as
# any `git fetch` does); a local branch or tag name is bundled as it is.
l4_origin() { # <checkout> <ref> [tag:<name> | <branch name>]... extra refs of the real remote
  local co="$1" ref="$2"; shift 2
  local b; b="$(mktemp -d)/l4.bundle"
  local full; full="$(git -C "$co" rev-parse --symbolic-full-name "$ref" 2>/dev/null)"
  case "$ref" in
    origin/*) full="refs/remotes/$ref" ;;
  esac
  [ -n "$full" ] || l4_die "--ref $ref is not a branch or tag name of this repository (a bare sha cannot be bundled)"
  local refs="$full" maps="$full:refs/heads/main" fetch="" r
  case "$ref" in origin/*) fetch="${ref#origin/}" ;; esac
  for r in "$@"; do
    case "$r" in
      tag:*) r="refs/tags/${r#tag:}"; refs="$refs $r"; maps="$maps $r:$r"; fetch="$fetch $r:$r" ;;
      *) refs="$refs origin/$r"; maps="$maps refs/remotes/origin/$r:refs/heads/$r"; fetch="$fetch $r" ;;
    esac
  done
  # Other sessions share this repository's object store and refs: a fetch or bundle can meet
  # their lock for a moment, so each is tried three times and the last error is shown. A tag is
  # fetched without --force: one that moved on the real remote fails here instead of being copied.
  local i ok=0
  for i in 1 2 3; do
    # shellcheck disable=SC2086
    { [ -z "$fetch" ] || git -C "$co" fetch -q origin $fetch > "$b.err" 2>&1; } && git -C "$co" bundle create "$(l4_win "$b")" $refs >> "$b.err" 2>&1 \
      && { ok=1; break; }
    sleep 5
  done
  [ "$ok" = 1 ] || { cat "$b.err" >&2; l4_die "git fetch/bundle failed"; }
  L4_REF_SHA="$(git -C "$co" rev-parse "$full^{commit}")"
  echo "L4: rehearsing $ref ($L4_REF_SHA) as the stand-in origin's main"
  l4_dx mkdir -p /srv/in
  docker cp "$(l4_win "$b")" "$L4_HOST:/srv/in/l4.bundle" >/dev/null || l4_die "docker cp of the bundle failed"
  l4_dx sh -c "rm -rf /srv/origin.git && git init -q --bare /srv/origin.git \
    && git -C /srv/origin.git fetch -q /srv/in/l4.bundle $maps \
    && git -C /srv/origin.git symbolic-ref HEAD refs/heads/main" || l4_die "origin repo failed"
  rm -rf "$(dirname "$b")"
}

l4_copy_kit() { # <rehearsal dir>
  l4_dx rm -rf /srv/l4/kit
  l4_dx mkdir -p /srv/l4
  docker cp "$(l4_win "$1")" "$L4_HOST:/srv/l4/kit" >/dev/null || l4_die "could not copy the kit"
  l4_dx sh -c 'find /srv/l4/kit -name "*.sh" -exec sed -i "s/\r$//" {} +; chmod +x /srv/l4/kit/*.sh /srv/l4/kit/inner/*.sh'
}

l4_collect() { # <run name> -> prints the local results folder
  local dst="$L4_RESULTS_ROOT/$1"
  mkdir -p "$dst"
  docker cp "$L4_HOST:/srv/l4/out/." "$(l4_win "$dst")/" >/dev/null 2>&1
  echo "$dst"
}

l4_host_down() { # [--purge]
  # the stack inside goes first, so the cache volume holds no container to restart next time
  l4_dx sh -c 'ids=$(docker ps -aq); [ -z "$ids" ] || docker rm -f $ids' >/dev/null 2>&1
  docker rm -f "$L4_HOST" >/dev/null 2>&1
  [ "${1:-}" = "--purge" ] && docker volume rm "$L4_VOL" >/dev/null 2>&1
  local left
  left="$(docker ps -a --filter "name=^fixflow-l4" --format '{{.Names}}' | tr '\n' ' ')"
  echo "TEARDOWN containers_left=[${left}] volume_kept=$(docker volume ls -q --filter "name=^$L4_VOL$" | wc -l | tr -d ' ')"
}

# The run's modes, read by harness.sh inside the stand-in host.
l4_mode() { # <restore|train>
  l4_dx sh -c "mkdir -p /srv/l4 && printf 'export L4_REHEARSAL=%s L4_MUTATE=%s L4_REPIN=%s L4_REF=%s L4_REF_SHA=%s\n' \
    '$1' '${L4_MUTATE:-0}' '${L4_REPIN:-0}' '$L4_REF' '$L4_REF_SHA' > /srv/l4/mode.env"
}

# The evidence bundle the coordinator commits on the plan branch (ruling C33): the results table,
# the raw TSVs, the small logs and, for every row that is not DONE, the output its check read.
# No full logs.
L4_EVIDENCE_ROOT="${L4_EVIDENCE_ROOT:-C:/Users/User/.fixflow-cache/handoff/evidence/l4}"
l4_evidence() { # <results dir> <run name>
  local src="$1" dst="$L4_EVIDENCE_ROOT/$2" f
  rm -rf "$dst"; mkdir -p "$dst"
  for f in results.md rows.tsv train.tsv wrongturns.tsv mutations.md mutations-result.tsv deviations.log editor.log \
    moved.log mutations-applied.log dumpfacts-standin.txt source-cursor.txt dumps.sha256 run.txt selftest-runbook.txt; do
    [ -f "$src/$f" ] && cp "$src/$f" "$dst/"
  done
  cp "$src"/pins-diff-*.txt "$src"/deep-health-*.json "$dst/" 2>/dev/null
  # the output each non-DONE row's check read: the step logs whose id begins with the row's step
  awk -F'\t' 'NR>1 && $3!="DONE"{split($2,a," "); print $1"\t"a[1]"\t"$3"\t"$2}' "$src/rows.tsv" | sort -u |
    while IFS="$(printf '\t')" read -r phase step verdict label; do
      printf '==== %s | %s | %s\n' "$phase" "$label" "$verdict"
      for f in "$src"/steps/*-"$step".log "$src"/steps/*-"$step"-*.log; do
        [ -f "$f" ] || continue
        printf -- '-- %s\n' "$(basename "$f")"
        sed -n '/^### output:/,/^### exit=/p' "$f" | head -n 40
      done
    done > "$dst/cited.txt"
  echo "$dst"
}

# What this run rehearsed, for the record (run.txt in the results and the evidence bundle).
l4_run_record() { # <checkout> <rehearsal dir>
  local rig dirty
  rig="$(git -C "$1" rev-parse HEAD)"
  dirty="$(git -C "$1" status --porcelain -- "$(l4_win "$2")" | grep -c .)"
  docker exec -i "$L4_HOST" sh -c "mkdir -p /srv/l4/out && cat > /srv/l4/out/run.txt" <<RUN
rehearsed ref: $L4_REF = $L4_REF_SHA (the stand-in origin's main)
rig: ops/lab/rehearsal at $rig ($dirty uncommitted file(s) under it)
modes: mutate=${L4_MUTATE:-0} repin=${L4_REPIN:-0}; slot pool: ${L4_POOL:-none}
started: $(date -u +%FT%TZ)
RUN
}
