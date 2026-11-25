"""Fine-tuning of the two retrievers on (query, positive chunk, hard negatives): in-batch + hard-negative InfoNCE.
SweRankEmbed-Small: all weights, bf16 autocast over fp32 weights. Qwen3-Embedding-0.6B: LoRA (peft) on the attention and
MLP projections over bf16 weights, gradient checkpointing."""
import math, random, time
import numpy as np
import u2lib as U
import dense as carddense

LORA = dict(r=16, lora_alpha=32, lora_dropout=0.05, target_modules=['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'])
SCALE = 20.0
MAXLEN = 256


def build_model(tag, state=None, train=False):
    """state: None (start model) or what `trained_state` returned. train=True: model ready for training."""
    import torch
    m = U.load_st(tag, 'bf16' if tag == 'qwen3' else 'fp32')
    m.max_seq_length = MAXLEN
    am = m[0].auto_model
    if tag == 'qwen3':
        from peft import LoraConfig, get_peft_model, set_peft_model_state_dict
        if train:
            am.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant': False})
            am.enable_input_require_grads()
        pm = get_peft_model(am, LoraConfig(**LORA))
        if state is not None:
            set_peft_model_state_dict(pm, state)
        # 2026-11-25 (coordinator 8): sentence-transformers 6.3's Transformer.auto_model is a read-only property returning
        # self.model, so assigning the PeftModel to it never took (the bare model, with the LoRA layers injected in place, is what
        # runs, which is the LoRA model). The PeftModel is kept beside it for merge, state save and load.
        object.__setattr__(m[0], '_u2_peft', pm)
    else:
        if state is not None:
            am.load_state_dict(state)
        if train:
            try:
                am.gradient_checkpointing_enable()
            except Exception as e:
                print('no gradient checkpointing for', tag, e, flush=True)
    return m


def trained_state(m, tag):
    if tag == 'qwen3':
        from peft import get_peft_model_state_dict
        return {k: v.detach().cpu().clone() for k, v in get_peft_model_state_dict(m[0]._u2_peft).items()}
    return {k: v.detach().cpu().clone() for k, v in m[0].auto_model.state_dict().items()}


def set_state(m, state, tag):
    if tag == 'qwen3':
        from peft import set_peft_model_state_dict
        set_peft_model_state_dict(m[0]._u2_peft, state)
    else:
        m[0].auto_model.load_state_dict(state)


def to_eval(m, tag):
    """merge LoRA, fp16, 512 tokens: the card's inference form."""
    import torch
    if tag == 'qwen3':
        m[0].model = m[0]._u2_peft.merge_and_unload()   # the base model with the LoRA weights merged in (see build_model)
        m[0].model.gradient_checkpointing_disable()
    m.eval()
    m.half()
    m.max_seq_length = 512
    return m


def make_examples(pairs, chunks, negs):
    return [dict(query=p['query'], pos=chunks[p['pos']], negs=[chunks[j] for j in p['negs'][:negs]], commit=p['commit']) for p in pairs]


def train(tag, examples, lr, epochs, bs=8, seed=0, log=None, ckpt=None, every=480):
    """ckpt: path of a checkpoint file; written every `every` s and at each epoch end (model state, optimizer, scheduler, position),
    resumed from when it exists. The batch order of epoch ep is random.Random(seed*1000+ep), so a resume repeats it exactly."""
    import torch, os
    torch.manual_seed(seed)
    m = build_model(tag, train=True)
    m.train()
    params = [p for p in m.parameters() if p.requires_grad]
    opt = torch.optim.AdamW(params, lr=lr, weight_decay=0.01)
    nb = math.ceil(len(examples) / bs)
    total, warm = nb * epochs, max(1, int(0.1 * nb * epochs))
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: (s + 1) / warm if s < warm else max(0.0, (total - s) / max(1, total - warm)))
    prompt = carddense.PROMPTS[tag]
    step, t0, losses, diag = 0, time.time(), [], {}
    t_save = time.time()
    if ckpt and os.path.exists(ckpt):
        c = torch.load(ckpt, map_location="cuda", weights_only=False)
        set_state(m, c["model"], tag); opt.load_state_dict(c["opt"]); sched.load_state_dict(c["sched"])
        step, losses, diag = c["step"], c["losses"], c["diag"]
        torch.set_rng_state(c["rng"].cpu()); torch.cuda.set_rng_state(c["cuda_rng"].cpu())
        if log: log(f"  resumed from {ckpt} at step {step}/{total}")
    spe = nb

    def save():
        os.makedirs(os.path.dirname(ckpt), exist_ok=True); tmp = ckpt + ".tmp"
        obj = dict(model=trained_state(m, tag), opt=opt.state_dict(), sched=sched.state_dict(), step=step, losses=losses, diag=diag, rng=torch.get_rng_state(), cuda_rng=torch.cuda.get_rng_state())
        for attempt in range(6):  # a write can fail while other units fill the disk; retry, same bytes
            try:
                torch.save(obj, tmp); break
            except RuntimeError:
                if attempt == 5: raise
                time.sleep(20)
        os.replace(tmp, ckpt)

    def enc(texts):
        f = m.tokenize(texts)
        f = {k: v.cuda() for k, v in f.items() if hasattr(v, 'cuda')}
        with torch.autocast('cuda', dtype=torch.bfloat16):
            e = m(f)['sentence_embedding']
        return torch.nn.functional.normalize(e.float(), dim=-1)

    for ep in range(epochs):
        if step >= (ep + 1) * spe:
            continue
        order = list(range(len(examples)))
        random.Random(seed * 1000 + ep).shuffle(order)
        for s in range(0, len(order), bs):
            if step > ep * spe + s // bs:
                continue
            B = [examples[i] for i in order[s:s + bs]]
            ks = [1 + len(e['negs']) for e in B]   # 2026-11-25 (coordinator 9): examples may carry fewer negatives than asked
            off = [sum(ks[:i]) for i in range(len(B))]   # column of each example's positive
            qe = enc([prompt + e['query'] for e in B])
            de = enc([t for e in B for t in [e['pos']] + e['negs']])
            sims = qe @ de.T * SCALE
            commit = [e['commit'] for e in B for _ in range(1 + len(e['negs']))]
            mask = torch.tensor([[commit[j] == B[i]['commit'] and j != off[i] for j in range(len(commit))] for i in range(len(B))], device='cuda')
            sims = sims.masked_fill(mask, -1e4)   # another positive or negative of the same commit is not a negative
            loss = torch.nn.functional.cross_entropy(sims, torch.tensor(off, device='cuda'))
            loss.backward()
            if step == 0:
                nz = sum(1 for p in params if p.grad is not None and float(p.grad.abs().sum()) > 0)
                diag = dict(params=len(params), with_grad=nz)
            torch.nn.utils.clip_grad_norm_(params, 1.0)
            opt.step(); sched.step(); opt.zero_grad(set_to_none=True)
            losses.append(float(loss)); step += 1
            if log and step % 50 == 0:
                log(f'  step {step}/{total} loss {np.mean(losses[-50:]):.3f} {time.time() - t0:.0f} s')
            if ckpt and (time.time() - t_save > every or (s + bs >= len(order) and ep + 1 < epochs)):
                save(); t_save = time.time()
    state = trained_state(m, tag)
    return m, state, dict(diag=diag, steps=step, secs=time.time() - t0, loss_first=float(np.mean(losses[:20])), loss_last=float(np.mean(losses[-20:])))
