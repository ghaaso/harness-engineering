# Card gate (improve/code/cardgate.sh, r57-0092): caps PyTorch's card allocator at the memory the job declared to the
# gate, so that jobs admitted side by side by their declared needs cannot crowd each other out. It changes nothing
# else: no batch, length, model or setting. Acts once per container (the first Python process; an environment marker
# stops its children), only where the card is mounted (/dev/dxg), only when GATE_TORCH_MIB is set and above 0.
# An out-of-memory error under the cap exits 76; the run script then reruns the job once alone and uncapped, and the
# job resumes from its own checkpoint. The image's own sitecustomize (/usr/lib/python3.11) is loaded afterwards.
#
# 2026-11-25 (coordinator 7, 47ff9697): the cap counts what PyTorch's caching allocator has reserved, not what live
# tensors hold. Without expandable segments the cache fragments: at the three out-of-memory exits of 2026-11-24/25 the
# reserved-but-unallocated share was 0.45 GiB (U2 resume-test2), 1.06 and 2.58 GiB (U6 TGN zulip, cap 5.61 GiB) and
# 5.33 GiB (U6 TGN zulip, cap 9.70 GiB, live tensors 4.29 GiB). So every card container now runs with
# PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True (set here before torch starts; U3's run script already set it and
# its jobs ran with it on this card and image). It changes where tensors sit in card memory, not what is computed.
# The first Python process also prints its peak reserved and allocated card memory at exit, so declared needs can be
# set from measured peaks.
import os, sys


def _alloc_conf():
    if not os.path.exists('/dev/dxg'):
        return
    for k in ('PYTORCH_CUDA_ALLOC_CONF', 'PYTORCH_ALLOC_CONF'):
        if 'expandable_segments' in os.environ.get(k, ''):
            return
    c = os.environ.get('PYTORCH_CUDA_ALLOC_CONF', '')
    os.environ['PYTORCH_CUDA_ALLOC_CONF'] = (c + ',' if c else '') + 'expandable_segments:True'


def _peak_line(torch):
    try:
        if torch.cuda.is_initialized():
            return 'peak reserved %d MiB, peak allocated %d MiB (this process, torch.cuda)' % (
                torch.cuda.max_memory_reserved(0) >> 20, torch.cuda.max_memory_allocated(0) >> 20)
    except Exception as e:
        return 'peak unreadable: %r' % (e,)
    return 'card not used'


def _gate():
    mib = int(os.environ.get('GATE_TORCH_MIB', '0') or 0)
    if os.environ.get('GATE_SEEN') or mib <= 0 or not os.path.exists('/dev/dxg'):
        return
    os.environ['GATE_SEEN'] = '1'
    import torch
    msg = '[card gate] PyTorch allocator capped at %d MiB (the job declared %d MiB to the gate)' % (
        mib, mib + int(os.environ.get('GATE_CTX', '400')))
    print(msg + '; PYTORCH_CUDA_ALLOC_CONF=%s' % os.environ.get('PYTORCH_CUDA_ALLOC_CONF', ''), file=sys.stderr, flush=True)

    def _apply():
        total = torch.cuda.get_device_properties(0).total_memory
        torch.cuda.set_per_process_memory_fraction(min(1.0, mib * 2**20 / total), 0)
    lazy = getattr(torch.cuda, '_lazy_call', None)
    if lazy is not None and not torch.cuda.is_initialized():
        lazy(_apply)
    else:
        _apply()
    prev = sys.excepthook

    def _hook(t, v, tb):
        prev(t, v, tb)
        if issubclass(t, torch.OutOfMemoryError):
            print(msg + ': out of memory under the cap; %s; exit 76 (the run script reruns the job alone, uncapped)'
                  % _peak_line(torch), file=sys.stderr, flush=True)
            os._exit(76)
    sys.excepthook = _hook
    import atexit
    atexit.register(lambda: print('[card gate] ' + _peak_line(torch), file=sys.stderr, flush=True))


try:
    _alloc_conf()
    _gate()
except Exception as e:  # never silent
    print('[card gate] FAILED to set the cap: %r' % (e,), file=sys.stderr, flush=True)

_own = '/usr/lib/python3.11/sitecustomize.py'
if os.path.exists(_own):
    import importlib.util as _u
    _s = _u.spec_from_file_location('_image_sitecustomize', _own)
    _m = _u.module_from_spec(_s)
    _s.loader.exec_module(_m)
