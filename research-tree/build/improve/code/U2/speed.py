import time, sys, torch
import u2lib as U, trainlib as T
tag = sys.argv[1]
ch, pairs = U.read_pairs('zulip')
for negs in (3, 7):
    ex = T.make_examples(pairs[:64], ch, negs)
    t = time.time()
    m, st, inf = T.train(tag, ex, 1e-5, 1)
    print(tag, 'negs', negs, '64 examples', f'{time.time()-t:.1f}s', inf, 'peak GiB', torch.cuda.max_memory_allocated()/2**30, flush=True)
    del m; torch.cuda.empty_cache()
