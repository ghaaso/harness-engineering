import re, hashlib

STOP = set("the and for with that this from into when then than are was were has have had not but can all any use used using should would could its it's they them their there here which what where while also more most only such some will need needs make makes made get gets new add adds added fix fixes fixed update updates remove removes instead been being does did one two".split())
CAMEL = re.compile(r'([a-z0-9])([A-Z])')


def terms(text, cap=40):
    t = CAMEL.sub(r'\1 \2', text)
    out = []
    for w in re.findall(r'[A-Za-z0-9]+', t):
        w = w.lower()
        if len(w) >= 3 and w not in STOP and w not in out:
            out.append(w)
    return out[:cap]


def tiekey(qid, path):
    return int(hashlib.sha256((qid + '\0' + path).encode()).hexdigest()[:12], 16)


def rank_files(qid, scored, universe):
    """scored: dict path->score (higher better). Unlisted files rank below all listed. Ties by one fixed key."""
    def key(p):
        if p in scored:
            return (0, -scored[p], tiekey(qid, p))
        return (1, 0, tiekey(qid, p))
    return sorted(universe, key=key)
