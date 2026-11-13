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

l4_slot_acquire() { # holds one slot of the light pool for this script's lifetime
  if [ -f "$L4_SLOT" ]; then
    FF_POOL=light bash "$L4_SLOT" acquire "l4-$1" 1 "$$" || l4_die "could not take a slot"
    L4_SLOT_HOLDER="l4-$1"
  else
    echo "L4: no ff-slot.sh at $L4_SLOT; running without the shared lock" >&2
    L4_SLOT_HOLDER=""
  fi
}
l4_slot_release() {
  [ -n "${L4_SLOT_HOLDER:-}" ] && FF_POOL=light bash "$L4_SLOT" release "$L4_SLOT_HOLDER" >/dev/null 2>&1
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
  l4_dx apk add -q --no-cache bash git python3 openssl curl iproute2 coreutils util-linux \
    findutils grep sed gawk procps logrotate >/dev/null || l4_die "apk add failed (is the PC online?)"
  # A Debian host has /etc/cron.d (7.4, 7.7, 7.8 install into it); Alpine has none. The files are
  # installed and listed as written; nothing here runs them (busybox crond does not read it).
  l4_dx mkdir -p /etc/cron.d
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
# this checkout's origin/main (and of any extra refs passed). It stands in for GitHub: the
# runbook's `git clone <repo-url>`, `git fetch origin --tags` and `git push origin ...` all go to
# it, never to the real remote.
l4_origin() { # <checkout> [extra refs...]
  local co="$1"; shift
  local b; b="$(mktemp -d)/l4.bundle"
  # Other sessions share this repository's object store and refs: a fetch or bundle can meet
  # their lock for a moment, so each is tried three times and the last error is shown.
  local i ok=0
  for i in 1 2 3; do
    git -C "$co" fetch -q origin main && git -C "$co" bundle create "$(l4_win "$b")" origin/main "$@" > "$b.err" 2>&1 \
      && { ok=1; break; }
    sleep 5
  done
  [ "$ok" = 1 ] || { cat "$b.err" >&2; l4_die "git fetch/bundle failed"; }
  l4_dx mkdir -p /srv/in
  docker cp "$(l4_win "$b")" "$L4_HOST:/srv/in/l4.bundle" >/dev/null || l4_die "docker cp of the bundle failed"
  l4_dx sh -c 'rm -rf /srv/origin.git && git init -q --bare /srv/origin.git \
    && git -C /srv/origin.git fetch -q /srv/in/l4.bundle "refs/remotes/origin/main:refs/heads/main" \
    && git -C /srv/origin.git symbolic-ref HEAD refs/heads/main' || l4_die "origin repo failed"
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
