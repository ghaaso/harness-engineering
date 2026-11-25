"""U1 shared code: paths, the card run's rules (imported read-only from /d2), text indexes, fast scoring.

Container mounts (run.sh): /code = this folder (ro), /d2 = runbig/card/d2 (ro, the card run's code), /cr = CR/d2 (ro),
/out = CR/improve/U1, /src/<repo> = the git repositories (ro), /models = CR/models (ro).
"""
import gzip, hashlib, json, math, os, re, sys
import numpy as np

sys.path.insert(0, os.environ.get('D2_CODE', '/d2'))
import prep as cardprep      # noqa: E402  read_log, candidates, clean_message, indexable, split_point, git
import common as cardcommon  # noqa: E402  terms, tiekey, rank_files
import score as cardscore    # noqa: E402  metrics, code_query

REPOS = ['fixflow', 'clinic', 'zulip']
OUT = os.environ.get('U1_OUT', '/out')
CRD2 = os.environ.get('U1_CR', '/cr')
SRC = os.environ.get('U1_SRC', '/src')

TUNE_FRAC, TUNE_MAX = 0.3, 150      # CANDIDATES.md section 2
TRAIN_MAX = 1000                    # CANDIDATES.md section 2
MAXBYTES = 150_000                  # card prep.py
DAY = 86400.0

# ---------------------------------------------------------------- io

def rdjsonl(p):
    op = gzip.open if p.endswith('.gz') else open
    with op(p, 'rt', encoding='utf-8') as f:
        return [json.loads(l) for l in f if l.strip()]


def wrjsonl(p, rows):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    op = gzip.open if p.endswith('.gz') else open
    with op(p, 'wt', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r) + '\n')


def rdjson(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def wrjson(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(o, f, indent=1)
        f.flush()
        os.fsync(f.fileno())   # a PC shutdown on 2026-11-24 left an unflushed file


def rdir(repo):
    return f'{OUT}/{repo}'


def load_split(repo):
    """split.json, queries.jsonl (held-out rows carry no truth), snapshots, items (path, blob) -> text index."""
    d = rdir(repo)
    sp = rdjson(f'{d}/split.json')
    qs = rdjsonl(f'{d}/queries.jsonl')
    return sp, qs


def load_items(repo):
    """items.jsonl.gz: one row per distinct (path, blob) used by any snapshot: {i, path, blob, text}."""
    return rdjsonl(f'{rdir(repo)}/items.jsonl.gz')


def load_heldout_queries(repo):
    """The card run's held-out queries WITHOUT their truth: the field is dropped at parse and never kept."""
    out = []
    with open(f'{CRD2}/{repo}/queries.jsonl', encoding='utf-8') as f:
        for l in f:
            r = json.loads(l)
            r.pop('truth', None)
            out.append(dict(qid=r['qid'], commit=r['commit'], ct=r['ct'], query=r['query']))
    return out

# ---------------------------------------------------------------- tokens (FTS5 unicode61 on camel-split text, as bm25.mjs)

CAMEL = re.compile(r'([a-z0-9])([A-Z])')
TOK = re.compile(r'[^\W_]+')
QTERM = re.compile(r'^[a-z0-9]+$')


def doc_tokens(text):
    return TOK.findall(CAMEL.sub(r'\1 \2', text).lower())


def qterms(text, cap=40):
    return cardcommon.terms(text, cap)


def path_terms(path):
    return set(cardcommon.terms(path, 10_000))

# ---------------------------------------------------------------- fast ranking equal to common.rank_files + score.metrics

def tiekeys(qid, paths):
    return np.array([cardcommon.tiekey(qid, p) for p in paths], dtype=np.int64)


def order(scores, tk):
    """scores: float array, NaN = unlisted. Same order as common.rank_files: listed by -score then tie key; unlisted by key."""
    unl = np.isnan(scores)
    s = np.where(unl, 0.0, -scores)
    return np.lexsort((tk, s, unl))


def metrics_from_order(o, truthmask):
    top10 = truthmask[o[:10]]
    h10 = int(top10.sum())
    nt = int(truthmask.sum())
    return (1.0 if h10 else 0.0, float(truthmask[o[:2]].sum()) / 2.0, h10 / nt if nt else 0.0)


def qmetrics(scores, tk, truthmask):
    return metrics_from_order(order(scores, tk), truthmask)

# ---------------------------------------------------------------- BM25 and BM25F over a snapshot

IDF = {
    'fts5': lambda N, n: np.maximum(np.log((N - n + 0.5) / (n + 0.5)), 1e-6),
    'lucene': lambda N, n: np.log1p((N - n + 0.5) / (n + 0.5)),
}


class TermIndex:
    """CSR term counts for a list of documents (items or chunks) with one shared vocabulary."""

    def __init__(self, vocab=None):
        self.vocab = vocab if vocab is not None else {}
        self.indptr, self.indices, self.data, self.lens = [0], [], [], []

    def add(self, tokens):
        c = {}
        for t in tokens:
            j = self.vocab.get(t)
            if j is None:
                j = self.vocab[t] = len(self.vocab)
            c[j] = c.get(j, 0) + 1
        ks = sorted(c)
        self.indices.extend(ks)
        self.data.extend(c[k] for k in ks)
        self.indptr.append(len(self.indices))
        self.lens.append(len(tokens))

    def freeze(self):
        import scipy.sparse as sp
        n = len(self.lens)
        self.m = sp.csr_matrix((np.array(self.data, dtype=np.float32), np.array(self.indices, dtype=np.int64),
                                np.array(self.indptr, dtype=np.int64)), shape=(n, max(len(self.vocab), 1)))
        self.dl = np.array(self.lens, dtype=np.float64)
        del self.indptr, self.indices, self.data, self.lens
        return self


def query_tids(vocab, terms):
    return np.array([vocab[t] for t in terms if t in vocab], dtype=np.int64)


def listed(scores):
    """a text arm lists only files that match a term (as FTS5 MATCH): score 0 -> unlisted (NaN)."""
    s = scores.astype(np.float64).copy()
    s[s <= 0] = np.nan
    return s


# ---------------------------------------------------------------- chunks

LINE_CHUNK = 1500


def line_chunks(text, size=LINE_CHUNK):
    out, cur, n = [], [], 0
    for line in text.splitlines():
        line = line[:400]
        if n + len(line) > size and cur:
            out.append('\n'.join(cur)); cur, n = [], 0
        cur.append(line); n += len(line) + 1
    if cur:
        out.append('\n'.join(cur))
    return out


_TS = {}


def _parser(ext):
    if ext in _TS:
        return _TS[ext]
    import tree_sitter as ts
    p = None
    try:
        if ext == 'py':
            import tree_sitter_python as m; p = ts.Parser(ts.Language(m.language()))
        elif ext in ('js', 'jsx', 'mjs', 'cjs'):
            import tree_sitter_javascript as m; p = ts.Parser(ts.Language(m.language()))
        elif ext == 'ts':
            import tree_sitter_typescript as m; p = ts.Parser(ts.Language(m.language_typescript()))
        elif ext == 'tsx':
            import tree_sitter_typescript as m; p = ts.Parser(ts.Language(m.language_tsx()))
    except Exception:
        p = None
    _TS[ext] = p
    return p


FUNC = {'function_definition', 'function_declaration', 'method_definition', 'generator_function_declaration',
        'decorated_definition', 'arrow_function', 'function_expression', 'function'}
CLASS = {'class_definition', 'class_declaration', 'class', 'abstract_class_declaration', 'interface_declaration'}
WRAP = {'export_statement', 'lexical_declaration', 'variable_declaration', 'variable_declarator', 'expression_statement',
        'assignment_expression', 'pair', 'public_field_definition', 'field_definition'}


def _is_func(n, depth=0):
    if n.type in FUNC:
        return True
    if n.type in WRAP and depth < 4:
        return any(_is_func(c, depth + 1) for c in n.named_children)
    return False


def _class_body(n):
    for c in n.named_children:
        if c.type in ('block', 'class_body'):
            return c
        if c.type in ('class_definition', 'class_declaration'):
            return _class_body(c)
    return None


def function_chunks(path, text, maxch=4000):
    """tree-sitter function chunks for py/js/ts: each top-level function, each method of a top-level class (the class
    header with its non-method lines as one chunk), and the rest of the module as one chunk. Other files and parse
    failures: line windows. A chunk over maxch characters is cut into line windows. Every chunk starts with the path."""
    ext = path.rsplit('.', 1)[-1].lower() if '.' in path.rsplit('/', 1)[-1] else ''
    p = _parser(ext)
    pieces = []
    if p is not None:
        try:
            src = text.encode('utf-8')
            root = p.parse(src).root_node
            spans, rest = [], []
            for n in root.named_children:
                tgt = n
                if n.type in ('export_statement', 'decorated_definition'):
                    inner = [c for c in n.named_children if c.type in CLASS]
                    tgt = inner[0] if inner else n
                if tgt.type in CLASS:
                    body = _class_body(tgt) if tgt.type not in ('class',) else None
                    meth, other = [], []
                    if body is not None:
                        for c in body.named_children:
                            (meth if _is_func(c) else other).append(c)
                    hdr_end = body.start_byte if body is not None else n.end_byte
                    head = src[n.start_byte:hdr_end].decode('utf-8', 'replace')
                    head += '\n' + '\n'.join(src[c.start_byte:c.end_byte].decode('utf-8', 'replace') for c in other)
                    spans.append(head)
                    for c in meth:
                        spans.append(src[c.start_byte:c.end_byte].decode('utf-8', 'replace'))
                elif _is_func(n):
                    spans.append(src[n.start_byte:n.end_byte].decode('utf-8', 'replace'))
                else:
                    rest.append(src[n.start_byte:n.end_byte].decode('utf-8', 'replace'))
            if rest:
                spans.append('\n'.join(rest))
            for s in spans:
                if len(s) > maxch:
                    pieces.extend(line_chunks(s, LINE_CHUNK))
                elif s.strip():
                    pieces.append(s)
        except Exception:
            pieces = []
    if not pieces:
        pieces = line_chunks(text)
    return [f'{path}\n{c}' for c in pieces[:200]] or [path]

# ---------------------------------------------------------------- file kind

DOCS_EXT = ('md', 'rst', 'txt')
CONF_EXT = ('yml', 'yaml', 'toml', 'ini', 'cfg', 'json')
MARK_EXT = ('html', 'css', 'scss', 'hbs')
TEST_RE = re.compile(r'(^|/)(tests?|__tests__|spec)/|(^|/)test_[^/]*$|_test\.[a-z]+$|\.(test|spec)\.[a-z]+$')
KINDS = ['code', 'test', 'docs', 'config', 'markup', 'script']


def file_kind(path):
    ext = path.rsplit('.', 1)[-1].lower() if '.' in path.rsplit('/', 1)[-1] else ''
    if ext in DOCS_EXT or path.startswith('docs/'):
        return 2
    if TEST_RE.search(path):
        return 1
    if ext in CONF_EXT:
        return 3
    if ext in MARK_EXT:
        return 4
    if ext in ('sh', 'sql'):
        return 5
    return 0


def sha(s):
    return hashlib.sha1(s.encode('utf-8')).hexdigest()
