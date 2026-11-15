#!/bin/sh
# Fake docker for r58c/B/tests/test_race_gate.sh (installed as `docker` first on PATH; no real container, no daemon).
# State in $RG_STATE; every call and EVENT goes to $RG_STATE/calls.log. With RG_RACER=1 a twin ktest-G40 is
# listed from the launcher's first `docker run` until two `ps` calls after that first container is removed (the
# 2026-11-14 race: both passed the pre-check in the same second). The launcher's own container is listed while
# alive; ungated, or once released, it ends after three listings (EVENT done) or at `docker wait` (EVENT wait).
S=$RG_STATE; L=$S/calls.log
echo "docker $*" >> "$L"
get() { cat "$S/$1" 2>/dev/null || echo 0; }
put() { echo "$2" > "$S/$1"; }
finish() { put done 1; o=$(cat "$S/out" 2>/dev/null); [ -n "$o" ] && [ -d "$o" ] && echo 0 > "$o/rc"; }
case "$1" in
  image) case "$*" in *gpu*) echo "$RG_GPU_ID" ;; *) echo "$RG_CPU_ID" ;; esac ;;
  run)
    r=$(( $(get runs) + 1 )); put runs $r; put stopped 0; put done 0; put released 0; put seen 0
    put name "$(echo "$*" | sed -n 's/.*--name \([^ ]*\).*/\1/p')"
    echo "$*" | sed -n 's/.* -v \([^ ]*\):\/w\/out .*/\1/p' > "$S/out"
    # rerun_check.sh after ruling 94 (second pass): the scratch parent at /w/rerun-out, the run in /w/rerun-out/<STAMP>
    [ -s "$S/out" ] || { p_=$(echo "$*" | sed -n 's/.* -v \([^ ]*\):\/w\/rerun-out .*/\1/p'); s_=$(echo "$*" | sed -n 's/.* -w \/w\/rerun-out\/\([^ ]*\) .*/\1/p')
      [ -n "$p_" ] && [ -n "$s_" ] && echo "$p_/$s_" > "$S/out"; }
    case "$*" in *'/tmp/go'*) put gated 1 ;; *) put gated 0 ;; esac
    echo "EVENT run $r gated $(get gated) racer_listed $( [ "${RG_RACER:-0}" = 1 ] && [ "$(get stopped1)" = 0 ] && echo 1 || echo 0)" >> "$L"
    echo fakeid ;;
  ps)
    [ "$2" = -a ] && exit 0
    r=$(get runs); n=$(get name)
    if [ "${RG_RACER:-0}" = 1 ] && [ "$r" -ge 1 ]; then
      if [ "$(get stopped1)" = 0 ]; then echo ktest-G40
      elif [ "$(get g)" -lt 2 ]; then echo ktest-G40; put g $(( $(get g) + 1 )); fi
    fi
    if [ "$r" -ge 1 ] && [ "$(get stopped)" = 0 ] && [ "$(get done)" = 0 ]; then
      echo "$n"
      if [ "$(get gated)" = 0 ] || [ "$(get released)" = 1 ]; then
        s=$(( $(get seen) + 1 )); put seen $s; [ $s -ge 3 ] && { finish; echo "EVENT done $r" >> "$L"; }
      fi
    fi ;;
  rm|stop)
    r=$(get runs); case "$*" in *"$(get name)"*) ;; *) exit 0 ;; esac
    [ "$(get stopped)" = 1 ] && exit 0
    put stopped 1; [ "$r" = 1 ] && put stopped1 1; echo "EVENT rm $r" >> "$L" ;;
  exec) r=$(get runs); put released 1; echo "EVENT release $r" >> "$L" ;;
  wait) r=$(get runs); finish; echo "EVENT wait $r" >> "$L"; echo 0 ;;
  inspect) echo 0 ;;
  logs) : ;;
  stats) echo "10MiB / 1GiB" ;;
  *) echo "fake docker: $1 not modelled" >&2; exit 1 ;;
esac
exit 0
