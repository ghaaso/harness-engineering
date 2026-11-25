"""A4: SweRankLLM-Small (7B listwise reranker) at 4-bit (nf4, bf16 compute, sdpa), over the top K of U1's frozen arm (A2).
usage (container, see run.sh):
  python a4.py smoke                      card: 3 queries, prints prompt, output and timing
  python a4.py sweep [--per-repo 20]      card: configs on a stride sample of the tuning queries (tuning only)
  python a4.py run --split tune|heldout   card: the frozen config on every query of the split (resumable)
  python a4.py score                      CPU: metrics (tuning), ranking files, score matrices for the table column
Settings (CFG): K 20|30, window 10|20, step window/2, tokens per file 256|512, content head|best. The authors' defaults are
window 10 and step 5 (run_rerank.sh), numeric identifiers, greedy decoding, the GitHub-issue code prompt (a4lib)."""
import argparse, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.environ.get('U1_CODE', '/u1'))
import numpy as np
import u1lib as L
import a4lib as A

MODEL = os.environ.get('U3_A4_MODEL', '/models/SweRankLLM-Small')
OUT = os.environ.get('U3_OUT', '/out')
U1D = os.environ.get('U1_OUT', '/u1data')
QMAX = int(os.environ.get('U3_QMAX', '1024'))          # query tokens kept (the authors keep all; the card's memory does not allow 32k)
GEN_BUDGET = int(os.environ.get('U3_GEN_BUDGET', '12000'))   # padded prompt tokens per generate call
CHUNK_Q = 8
GRID = [dict(K=k, W=w, N=n, content='head') for k in (20, 30) for w in (10, 20) for n in (256, 512)]


def cfg_id(c):
    return f"K{c['K']}_W{c['W']}_N{c['N']}_{c['content']}"


def load_a2(repo, split):
    p = f'{U1D}/cardfmt/{repo}/rank_a2.jsonl' if split == 'tune' else f'{U1D}/heldout/{repo}/rank_a2.jsonl'
    out = {}
    for r in L.rdjsonl(p):
        sc = r['scores']
        tk = L.tiekeys(str(r['qid']), [p_ for p_, _ in sc])
        o = np.lexsort((tk, -np.array([s for _, s in sc], dtype=np.float64)))
        out[str(r['qid'])] = [sc[i][0] for i in o]
    return out


class Data:
    """queries, A2 lists and file texts of one repository and split."""

    def __init__(self, repo, split):
        sp, qs = L.load_split(repo)
        items = L.load_items(repo)
        b = [x for x in sp['blocks'] if x['id'] == split][0]
        self.text = {items[i]['path']: items[i]['text'] for i in b['items']}
        self.paths = [items[i]['path'] for i in b['items']]
        self.q = [dict(qid=str(q['qid']), query=q['query']) for q in qs if q['block'] == split]
        self.a2 = load_a2(repo, split)
        self.repo = repo
        self.truth = {str(q['qid']): q['truth'] for q in qs if q['block'] == split} if split == 'tune' else None


class Content:
    def __init__(self, tok):
        self.tok = tok
        self.cache = {}
        self.chunks = {}

    def cut(self, s, n):
        ids = self.tok(s, add_special_tokens=False)['input_ids']
        return s if len(ids) <= n else self.tok.decode(ids[:n])

    def get(self, d, path, query, cfg):
        text = d.text[path]
        if cfg['content'] == 'head':
            k = (d.repo, path, cfg['N'])
            if k not in self.cache:
                self.cache[k] = self.cut(f'{path}\n{text}'[:cfg['N'] * 8], cfg['N'])
            return self.cache[k]
        if path not in self.chunks:
            self.chunks[path] = [(c, set(L.doc_tokens(c))) for c in L.function_chunks(path, text)]
        qt = set(L.qterms(query))
        best = max(self.chunks[path], key=lambda x: len(qt & x[1]))[0]
        return self.cut(best[:cfg['N'] * 8], cfg['N'])


def load_model():
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    tok = AutoTokenizer.from_pretrained(MODEL)
    tok.padding_side = 'left'
    q = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_compute_dtype=torch.bfloat16)
    m = AutoModelForCausalLM.from_pretrained(MODEL, quantization_config=q, device_map={'': 0}, dtype=torch.bfloat16,
                                             attn_implementation='sdpa').eval()
    return m, tok


def gen(model, tok, prompts, max_new):
    import torch
    enc = tok(prompts, return_tensors='pt', padding=True, add_special_tokens=False).to('cuda')
    with torch.no_grad():
        out = model.generate(**enc, max_new_tokens=max_new, do_sample=False, temperature=None, top_p=None, top_k=None,
                             repetition_penalty=1.0, pad_token_id=tok.pad_token_id)
    return [tok.decode(o[enc['input_ids'].shape[1]:], skip_special_tokens=True) for o in out]


def run_queries(model, tok, ct, d, qs, cfg, path, log):
    """rerank each query's A2 top K; append one JSON line per finished query to path (resumable)."""
    done = {r['qid'] for r in L.rdjsonl(path)} if os.path.exists(path) else set()
    todo = [q for q in qs if q['qid'] not in done]
    nout = len(tok(' > '.join(f'[{i + 1}]' for i in range(cfg['W'])), add_special_tokens=False)['input_ids']) + 2
    step = cfg['W'] // 2
    for s in range(0, len(todo), CHUNK_Q):
        grp = todo[s:s + CHUNK_Q]
        t0 = time.time()
        st = []
        for q in grp:
            order = d.a2[q['qid']][:cfg['K']]
            qids = tok(q['query'], add_special_tokens=False)['input_ids'][:QMAX]
            st.append(dict(q=q, order=list(order), wins=A.windows(len(order), cfg['W'], step), qtext=tok.decode(qids), raw=[]))
        for t in range(max(len(x['wins']) for x in st)):
            jobs = []
            for x in st:
                if t < len(x['wins']):
                    b, e = x['wins'][t]
                    docs = [ct.get(d, p, x['q']['query'], cfg) for p in x['order'][b:e]]
                    msg = [{'role': 'user', 'content': A.user_message(x['qtext'], docs)}]
                    pr = tok.apply_chat_template(msg, tokenize=False, add_generation_prompt=True)
                    jobs.append((x, b, e, pr, len(tok(pr, add_special_tokens=False)['input_ids'])))
            jobs.sort(key=lambda j: j[4])
            i = 0
            while i < len(jobs):
                j = i
                while j < len(jobs) and (j - i + 1) * jobs[j][4] <= GEN_BUDGET:
                    j += 1
                j = max(j, i + 1)
                res = gen(model, tok, [x[3] for x in jobs[i:j]], nout)
                for (x, b, e, pr, ln), r in zip(jobs[i:j], res):
                    x['order'] = A.apply(x['order'], b, e, A.parse(r, e - b))
                    x['raw'].append(r)
                i = j
        secs = time.time() - t0
        rows = [dict(qid=x['q']['qid'], order=x['order'], raw=x['raw'], secs=secs / len(grp)) for x in st]
        with open(path, 'a', encoding='utf-8') as f:
            for r in rows:
                f.write(json.dumps(r) + '\n')
            f.flush(); os.fsync(f.fileno())
        import torch
        log(f'{path.rsplit("/", 1)[-1]}: {s + len(grp)}/{len(todo)} queries, {secs / len(grp):.1f} s/query, mem {torch.cuda.memory_allocated() / 2**30:.1f}/{torch.cuda.memory_reserved() / 2**30:.1f} GiB, peak {torch.cuda.max_memory_allocated() / 2**30:.1f}')
        torch.cuda.empty_cache()


def full_matrix(d, orders, K):
    """A4 scores over the block's files: reranked top K get (K-pos)/K, the rest follow in A2's order below; NaN = not in A2's list."""
    idx = {p: i for i, p in enumerate(d.paths)}
    qids, M = [], np.full((len(d.q), len(d.paths)), np.nan, dtype=np.float32)
    for k, q in enumerate(d.q):
        qids.append(q['qid'])
        a2 = d.a2[q['qid']]
        order = orders.get(q['qid'], a2[:K])
        rest = a2[len(order):]
        for p, s in A.rank_scores(order, len(order), rest).items():
            M[k, idx[p]] = s
    return M, qids


def sample_idx(n, per):
    """per evenly spaced indices over the time-ordered tuning queries (all of them if n <= per)."""
    return list(range(n)) if n <= per else sorted({int(round(x)) for x in np.linspace(0, n - 1, per)})


def cmd_smoke(a):
    model, tok = load_model()
    ct = Content(tok)
    d = Data('fixflow', 'tune')
    cfg = dict(K=20, W=10, N=256, content='head')
    qs = d.q[:3]
    log = lambda s: print(s, flush=True)
    t = time.time()
    run_queries(model, tok, ct, d, qs, cfg, f'{OUT}/a4/smoke.jsonl', log)
    import torch
    print('time', time.time() - t, 'peak GiB', torch.cuda.max_memory_allocated() / 2**30)
    for r in L.rdjsonl(f'{OUT}/a4/smoke.jsonl'):
        print(r['qid'], r['raw'], r['order'][:3])


def cmd_sweep(a):
    import evalu3 as EV
    os.makedirs(f'{OUT}/a4', exist_ok=True)
    model, tok = load_model()
    ct = Content(tok)
    data = {r: Data(r, 'tune') for r in L.REPOS}
    sub = {r: [data[r].q[i] for i in sample_idx(len(data[r].q), a.per_repo)] for r in L.REPOS}
    log = lambda s: print(time.strftime('%H:%M:%S'), s, flush=True)
    res = {}
    rp = f'{OUT}/a4/sweep.json'
    if os.path.exists(rp):
        res = L.rdjson(rp)
    grid = GRID + [dict(K=30, W=10, N=256, content='best'), dict(K=30, W=10, N=512, content='best')] if a.with_best else GRID
    if a.configs:
        grid = [c for c in grid if cfg_id(c) in a.configs.split(',')]
    for cfg in grid:
        cid = cfg_id(cfg)
        per, base = {}, {}
        t = time.time()
        for r in L.REPOS:
            d = data[r]
            p = f'{OUT}/a4/sweep_{cid}_{r}.jsonl'
            run_queries(model, tok, ct, d, sub[r], cfg, p, log)
            orders = {x['qid']: x['order'] for x in L.rdjsonl(p)}
            sd = Data.__new__(Data); sd.__dict__.update(d.__dict__); sd.q = sub[r]
            M, qids = full_matrix(sd, orders, cfg['K'])
            per[r] = EV.repo_metrics(M, qids, d.paths, d.truth)
            B = np.full_like(M, np.nan)
            idx = {pp: i for i, pp in enumerate(d.paths)}
            for k, q in enumerate(sub[r]):
                for pos, pp in enumerate(d.a2[q['qid']]):
                    B[k, idx[pp]] = -pos
            base[r] = EV.repo_metrics(B, qids, d.paths, d.truth)
        m, b = EV.macro(per), EV.macro(base)
        res[cid] = dict(cfg=cfg, per_repo={r: dict(acc10=v[0], p2=v[1], n=v[2]) for r, v in per.items()}, macro_acc10=m[0],
                        macro_p2=m[1], a2_macro_acc10=b[0], a2_macro_p2=b[1], secs=time.time() - t)
        L.wrjson(rp, res)
        log(f'{cid}: macro Acc@10 {m[0]:.3f} P@2 {m[1]:.3f} (A2 on the same queries {b[0]:.3f} / {b[1]:.3f}), {time.time() - t:.0f} s')
    if all(cfg_id(c) in res for c in grid) and not a.configs:
        best = max(grid, key=lambda c: (res[cfg_id(c)]['macro_acc10'] + res[cfg_id(c)]['macro_p2'], -c['K'], -c['N']))
        L.wrjson(f'{OUT}/a4/frozen.json', dict(cfg=best, rule='max of macro Acc@10 + macro P@2 on the stride sample of tuning '
                                               'queries; ties to the smaller K, then fewer tokens', sweep=res))
        log('frozen ' + cfg_id(best))
    import torch
    with open(f'{OUT}/gpu-a4.peak', 'w') as f:
        f.write(f'PEAK_CUDA {torch.cuda.max_memory_allocated() / 2**30:.2f} GiB (torch max_memory_allocated)\n')


def frozen_cfg():
    return L.rdjson(f'{OUT}/a4/frozen.json')['cfg']


def cmd_run(a):
    import torch
    model, tok = load_model()
    ct = Content(tok)
    cfg = frozen_cfg()
    cid = cfg_id(cfg)
    log = lambda s: print(time.strftime('%H:%M:%S'), s, flush=True)
    for r in L.REPOS:
        d = Data(r, a.split)
        run_queries(model, tok, ct, d, d.q, cfg, f'{OUT}/a4/run_{cid}_{a.split}_{r}.jsonl', log)
    with open(f'{OUT}/gpu-a4.peak', 'w') as f:
        f.write(f'PEAK_CUDA {torch.cuda.max_memory_allocated() / 2**30:.2f} GiB (torch max_memory_allocated)\n')


def cmd_score(a):
    import evalu3 as EV
    cfg = frozen_cfg()
    cid = cfg_id(cfg)
    res = dict(cfg=cfg, tune={}, a2={})
    for split in ('tune', 'heldout'):
        for r in L.REPOS:
            p = f'{OUT}/a4/run_{cid}_{split}_{r}.jsonl'
            if not os.path.exists(p):
                continue
            d = Data(r, split)
            orders = {x['qid']: x['order'] for x in L.rdjsonl(p)}
            assert all(q['qid'] in orders for q in d.q), f'{r} {split}: queries missing'
            M, qids = full_matrix(d, orders, cfg['K'])
            np.savez_compressed(f'{OUT}/a4/a4_{r}_{split}.npz', M=M, qids=np.array(qids), paths=np.array(d.paths))
            root = f'{OUT}/cardfmt' if split == 'tune' else f'{OUT}/heldout'
            EV.write_rank(f'{root}/{r}/rank_a4.jsonl', M, qids, d.paths)
            if split == 'tune':
                res['tune'][r] = EV.repo_metrics(M, qids, d.paths, d.truth)
                B = np.full_like(M, np.nan)
                idx = {pp: i for i, pp in enumerate(d.paths)}
                for k, q in enumerate(d.q):
                    for pos, pp in enumerate(d.a2[q['qid']]):
                        B[k, idx[pp]] = -pos
                res['a2'][r] = EV.repo_metrics(B, qids, d.paths, d.truth)
    if res['tune']:
        res['macro'] = EV.macro(res['tune']); res['a2_macro'] = EV.macro(res['a2'])
    L.wrjson(f'{OUT}/a4/score.json', res)
    print(json.dumps(res, indent=1))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['smoke', 'sweep', 'run', 'score'])
    ap.add_argument('--per-repo', type=int, default=25)
    ap.add_argument('--split', default='tune')
    ap.add_argument('--with-best', action='store_true')
    ap.add_argument('--configs', default='')
    a = ap.parse_args()
    os.makedirs(f'{OUT}/a4', exist_ok=True)
    globals()['cmd_' + a.cmd](a)
