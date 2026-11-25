"""SweRankEmbed-Large on transformers 5.24 (image d2-embed-gpu:3), two routes that must agree:
  (a) the authors' modeling_qwen.py imported by file path (the hub auto_map fails offline), with a small stub for the module
      transformers.modeling_attn_mask_utils that v5 removed (the mask helpers it needs, non-causal path only, written
      from the v4 behaviour) and rope_theta read from config.rope_parameters;
  (b) the native transformers Qwen2Model made bidirectional: is_causal False on every attention layer and the causal mask
      builder replaced by the bidirectional padding mask (the model's config says is_causal false).
Pooling as the model card: last token (the end-of-text token the tokenizer appends: add_eos_token true), right padding,
L2 normalised. Query prefix as the card (QUERY_PREFIX)."""
import importlib.util, sys, types
import torch

QUERY_PREFIX = 'Instruct: Given a github issue, identify the code that needs to be changed to fix the issue.\nQuery: '
EOS = 151643


def _stub_mask_utils():
    """v4 semantics: [B,S] 1/0 padding mask -> additive [B,1,Q,K] float mask (min value where masked)."""
    name = 'transformers.modeling_attn_mask_utils'
    if name in sys.modules:
        return
    m = types.ModuleType(name)

    def _expand(mask, dtype, tgt_len=None):
        b, src = mask.shape
        tgt_len = tgt_len or src
        e = mask[:, None, None, :].expand(b, 1, tgt_len, src).to(dtype)
        inv = 1.0 - e
        return inv.masked_fill(inv.to(torch.bool), torch.finfo(dtype).min)

    def _prepare_4d_attention_mask(mask, dtype, tgt_len=None):
        return _expand(mask, dtype, tgt_len)

    def _prepare_4d_attention_mask_for_sdpa(mask, dtype, tgt_len=None):
        if mask is None or bool(mask.all()):
            return None
        return _expand(mask, dtype, tgt_len)

    def _causal(*a, **k):
        raise NotImplementedError('the embedder runs non-causal only')

    m._prepare_4d_attention_mask = _prepare_4d_attention_mask
    m._prepare_4d_attention_mask_for_sdpa = _prepare_4d_attention_mask_for_sdpa
    m._prepare_4d_causal_attention_mask = _causal
    m._prepare_4d_causal_attention_mask_for_sdpa = _causal
    sys.modules[name] = m


def load_remote_module(path):
    _stub_mask_utils()
    spec = importlib.util.spec_from_file_location('gte_modeling_qwen', f'{path}/modeling_qwen.py')
    mod = importlib.util.module_from_spec(spec)
    sys.modules['gte_modeling_qwen'] = mod
    spec.loader.exec_module(mod)
    return mod


def _config(path, **over):
    from transformers import Qwen2Config
    cfg = Qwen2Config.from_pretrained(path)
    for k, v in over.items():
        setattr(cfg, k, v)
    return cfg


def load_route_a(path, quant=None, dtype=torch.bfloat16, device_map=None, attn='sdpa', code_path=None):
    mod = load_remote_module(code_path or path)
    cfg = _config(path)
    rp = getattr(cfg, 'rope_parameters', None) or {}
    cfg.rope_theta = rp.get('rope_theta', 1000000.0)
    kw = dict(config=cfg, dtype=dtype, attn_implementation=attn)
    if quant is not None:
        kw['quantization_config'] = quant
        kw['device_map'] = device_map or {'': 0}
    m = mod.Qwen2Model.from_pretrained(path, **kw)
    fix_rotary(m)
    return m.eval()


# 2026-11-25 (review r57-0097, text B4): the cos/sin tables are built for the longest input A6 feeds the model, not for
# max_position_embeddings (131,072): 28 layers x 2 x 131,072 x 128 float32 took 3,584 MiB of the card for positions never
# used. Inputs are cut by encode_ids to max_len tokens: queries 8,192 (a6.py), chunks U3_MAXTOK (512). The +1 covers the
# flash path's rotary_seq_len (max position + 1). Values for every position below the bound are the same (same arange,
# same float32 ops); a longer input would still make the remote forward extend the table itself.
ROPE_LEN = max(8192, int(__import__('os').environ.get('U3_MAXTOK', '512'))) + 1


def fix_rotary(model, max_len=None):
    """transformers 5 builds a model on the meta device; the remote rotary class keeps inv_freq and its cos/sin cache as
    non-persistent buffers, which are then never filled (NaN output). Recompute them in float32 on the layer's device,
    for the first min(max_position_embeddings, ROPE_LEN) positions."""
    dev = next(model.parameters()).device
    n = max_len or ROPE_LEN
    for mod in model.modules():
        if hasattr(mod, 'inv_freq') and hasattr(mod, '_set_cos_sin_cache'):
            inv = 1.0 / (mod.base ** (torch.arange(0, mod.dim, 2, dtype=torch.int64).float().to(dev) / mod.dim))
            mod.register_buffer('inv_freq', inv, persistent=False)
            mod._set_cos_sin_cache(seq_len=min(mod.max_position_embeddings, n), device=dev, dtype=torch.float32)


def make_bidirectional(model):
    """Route (b): is_causal False on every attention module, mask builder replaced by the bidirectional padding mask."""
    import transformers.models.qwen2.modeling_qwen2 as q2
    from transformers.masking_utils import create_bidirectional_mask
    for layer in model.layers:
        layer.self_attn.is_causal = False
    model.config.is_causal = False

    def bidir(config, inputs_embeds, attention_mask, cache=None, position_ids=None, **kw):
        return create_bidirectional_mask(config=config, inputs_embeds=inputs_embeds, attention_mask=attention_mask)

    q2.create_causal_mask = bidir
    return model


def load_route_b(path, quant=None, dtype=torch.bfloat16, device_map=None, attn='sdpa'):
    from transformers import Qwen2Model
    kw = dict(config=_config(path), dtype=dtype, attn_implementation=attn)
    if quant is not None:
        kw['quantization_config'] = quant
        kw['device_map'] = device_map or {'': 0}
    m = Qwen2Model.from_pretrained(path, **kw)
    return make_bidirectional(m).eval()


def bnb_nf4():
    from transformers import BitsAndBytesConfig
    return BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_compute_dtype=torch.bfloat16,
                              bnb_4bit_use_double_quant=False)


def encode_ids(tok, texts, max_len):
    """token ids with the end-of-text token appended (the tokenizer config's add_eos_token), cut to max_len with the
    end token kept."""
    ids = tok(texts, add_special_tokens=False, truncation=True, max_length=max_len - 1)['input_ids']
    return [x + [EOS] for x in ids]


def pad_batch(ids, device, pad=EOS):
    n = max(len(x) for x in ids)
    inp = torch.full((len(ids), n), pad, dtype=torch.long)
    att = torch.zeros((len(ids), n), dtype=torch.long)
    for i, x in enumerate(ids):
        inp[i, :len(x)] = torch.tensor(x)
        att[i, :len(x)] = 1
    return inp.to(device), att.to(device)


@torch.no_grad()
def embed_ids(model, ids, device="cuda", pad=EOS):
    inp, att = pad_batch(ids, device, pad)
    h = model(input_ids=inp, attention_mask=att, use_cache=False).last_hidden_state
    last = att.sum(1) - 1
    e = h[torch.arange(h.shape[0], device=h.device), last].float()
    return torch.nn.functional.normalize(e, p=2, dim=1)
