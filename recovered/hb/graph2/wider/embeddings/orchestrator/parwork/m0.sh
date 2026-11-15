#!/bin/sh
# M0 inside a throwaway kge-P1 container: is NVIDIA MPS available? Plus CPU-only prep (assignment at s = 1, epochs check).
echo "== uname"; uname -a
echo "== cgroup"; cat /proc/self/cgroup; ls /sys/fs/cgroup | head -40; grep -E '^(anon|file) ' /sys/fs/cgroup/memory.stat
echo "== command -v nvidia-cuda-mps-control:"; command -v nvidia-cuda-mps-control || echo "(not on PATH)"
echo "== command -v nvidia-cuda-mps-server:"; command -v nvidia-cuda-mps-server || echo "(not on PATH)"
for d in /usr/bin /usr/lib/wsl /usr/lib/wsl/lib /usr/lib/wsl/drivers /usr/local/nvidia /usr/local/nvidia/bin /usr/local/cuda/bin /usr/lib/x86_64-linux-gnu; do
  echo "== ls $d (mps / nvidia-smi matches)"; ls -la $d 2>&1 | grep -iE 'mps|nvidia-smi|No such' | head -20
done
echo "== find -iname '*mps*' (excluding /proc /sys /usr/lib/python*)"
find / -xdev \( -path /proc -o -path /sys \) -prune -o -iname '*mps*' -print 2>/dev/null | grep -v -E 'site-packages|dist-packages|/usr/share' | head -30
echo "== find under /usr/lib/wsl (all)"; find /usr/lib/wsl -maxdepth 3 2>/dev/null | head -80
echo "== nvidia-smi in container"; nvidia-smi --query-gpu=name,driver_version,compute_mode --format=csv 2>&1
nvidia-smi -q 2>&1 | grep -iE 'compute mode|mig|driver model|virtualization' | head -10
if command -v nvidia-cuda-mps-control >/dev/null 2>&1; then
  echo "== MPS present: trying it once"
  export CUDA_MPS_PIPE_DIRECTORY=/tmp/mps-pipe CUDA_MPS_LOG_DIRECTORY=/tmp/mps-log; mkdir -p /tmp/mps-pipe /tmp/mps-log
  nvidia-cuda-mps-control -d; echo "daemon rc=$?"; sleep 1; ps aux | grep -i mps | grep -v grep
  python -c "import torch; x=torch.ones(1000,device='cuda'); print('torch op ok', float(x.sum()))" 2>&1
  echo "== processes after the op"; ps aux | grep -i mps | grep -v grep
  echo get_server_list | nvidia-cuda-mps-control; cat /tmp/mps-log/control.log 2>/dev/null | tail -20; cat /tmp/mps-log/server.log 2>/dev/null | tail -20
  echo quit | nvidia-cuda-mps-control; echo "quit rc=$?"
fi
echo "== prep (CPU only): assignment_m('tune', 1)"
cd /w/pw && python - <<'EOF'
import sys, json, time, os, math
sys.path.insert(0, '/w/train'); sys.path.insert(0, '/w/export'); sys.path.insert(0, '/w/eval')
import checkpoints as ck
t = time.time(); F = ck.Facts(); assign, plag, info = ck.assignment_m('tune', 1, F)
cps = sorted(set(assign.values()), key=F.key)
json.dump(dict(assignment=assign, lag_by_parent=plag, checkpoints=cps), open('/w/pw/assign.json', 'w'), indent=1)
print('assignment s=1: %d parents -> %d checkpoints in %.1f s; identity: %s' % (len(assign), len(cps), time.time() - t, all(k == v for k, v in assign.items())))
# epochs: stage-A best epoch rounded up to the eval interval, min 20 (stageB.round_epochs) vs epochs.json
E = json.load(open('/w/pw/epochs.json')); bad = []
for k, v in E.items():
    arm, cid = k.split('/'); be = json.load(open('/w/train/stageA/%s/%s/meta.json' % (arm, cid)))['best_epoch']
    iv = 5 if arm == 'E4' else 10; ep = max(20, int(math.ceil(be / iv) * iv))
    if ep != v: bad.append((k, v, ep))
print('epochs.json vs round_epochs(stage-A best):', 'all equal' if not bad else bad)
EOF
