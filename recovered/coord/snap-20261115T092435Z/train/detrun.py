"""Ruling 67 wrapper (not in the plan hash): run stageB.py with PyTorch's deterministic algorithms.

Sets CUBLAS_WORKSPACE_CONFIG=:4096:8 before torch loads and torch.use_deterministic_algorithms(True),
the same two settings as the coordinator's measurement (orchestrator/parwork/pw.py --det), appends
' det=1' to STAGEB_RUNNER so every part's runner field records it (ruling 66), then runs stageB.py
unchanged with the same arguments: python detrun.py run E4
"""
import os, runpy, sys

os.environ['CUBLAS_WORKSPACE_CONFIG'] = ':4096:8'
os.environ['STAGEB_RUNNER'] = (os.environ.get('STAGEB_RUNNER') or 'detrun.py') + ' det=1'
import torch  # noqa: E402

torch.use_deterministic_algorithms(True)
assert torch.are_deterministic_algorithms_enabled()
print('detrun: deterministic', torch.are_deterministic_algorithms_enabled(), 'cublas_ws',
      os.environ['CUBLAS_WORKSPACE_CONFIG'], flush=True)
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
sys.argv = [os.path.join(here, 'stageB.py')] + sys.argv[1:]
runpy.run_path(sys.argv[0], run_name='__main__')
