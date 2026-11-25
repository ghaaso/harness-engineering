"""U6 (B5): the co-change event stream, a vectorised neighbour sampler and the node features.

Stream: one event per file pair per commit (commits of 2..50 added or modified code files, the card's pair rule), time =
committer time in days since the first commit, edge features = the pair's decayed count at that time, counting this event and
every earlier one of the pair (four numbers: log1p of the decayed count with half-life 30 d and 365 d, log1p of the plain
count, log of the commit size). Nothing from a later event enters an event's feature (cumulative).
Node ids are global file ids + 1 (0 is the padding node, as in DyGLib).

The sampler gives DyGLib's 'recent' strategy (the last k neighbours strictly before the query time), vectorised: one searchsorted
over a (node, time) key instead of a python loop per node. Equivalence with DyGLib's NeighborSampler is tested in test_u6.py.
"""
import json, os
import numpy as np

DAY = 86400.0
KEY = 1.0e4          # key = node * KEY + time(days); the stream spans well under 1e4 days


class Stream:
    """All pair events of a repository in time order (commit order). ev_hend[n] = number of events of commits[:n]."""

    def __init__(self, commits, seed=0, max_commit_files=50):
        ct = np.array([c['ct'] for c in commits], dtype=np.int64)
        assert np.all(np.diff(ct) >= 0), 'commits must be in committer-time order'
        self.t0 = int(ct[0]) if len(ct) else 0
        S, D, T, C, Z = [], [], [], [], []
        rng = np.random.default_rng([seed, 20261124])
        self.max_id = max((i for c in commits for i, _ in c['ev']), default=0)
        for n, c in enumerate(commits):
            F = sorted({i for i, st in c['ev'] if st in ('A', 'M')})
            if len(F) < 2 or len(F) > max_commit_files:
                continue
            a, b = np.triu_indices(len(F), 1)
            Fa = np.array(F, dtype=np.int64)
            S.append(Fa[a]); D.append(Fa[b]); C.append(np.full(len(a), n, dtype=np.int64)); Z.append(np.full(len(a), len(F)))
        if S:
            S, D, C, Z = (np.concatenate(x) for x in (S, D, C, Z))
        else:
            S = D = C = Z = np.zeros(0, dtype=np.int64)
        flip = rng.random(len(S)) < 0.5          # a stored orientation is arbitrary; the training pass flips again
        self.src = np.where(flip, D, S) + 1
        self.dst = np.where(flip, S, D) + 1
        self.commit = C
        self.size = Z
        self.t = (ct[C] - self.t0) / DAY if len(C) else np.zeros(0)
        self.ct = ct
        self.n_events = len(self.src)
        # events of commits[:n]
        self.ev_hend = np.searchsorted(self.commit, np.arange(len(commits) + 1), side='left')
        self.edge_feat = self._edge_features(S, D)
        self.kind = 'pair'
        self.file_max_id = self.max_id
        # training units (a unit = a positive link to learn) and the events the graph is built of: the same in the pair stream
        self.u_src, self.u_dst, self.u_t, self.u_hend = self.src, self.dst, self.t, self.ev_hend

    def _edge_features(self, a, b):
        """[E+1, 4] float32; row 0 (padding) is zero."""
        E = len(a)
        out = np.zeros((E + 1, 4), dtype=np.float32)
        if E == 0:
            return out
        lo, hi = np.minimum(a, b), np.maximum(a, b)
        key = lo * (self.max_id + 2) + hi
        order = np.lexsort((np.arange(E), key))        # by pair, then event order (= time order)
        k, t = key[order], self.t[order]
        newgrp = np.r_[True, k[1:] != k[:-1]]
        gstart = np.maximum.accumulate(np.where(newgrp, np.arange(E), 0))
        rank = np.arange(E) - gstart
        dec = {30: np.ones(E), 365: np.ones(E)}
        for r in range(1, int(rank.max()) + 1):
            i = np.nonzero(rank == r)[0]
            dt = t[i] - t[i - 1]
            for hl, d in dec.items():
                d[i] = d[i - 1] * 0.5 ** (dt / hl) + 1.0
        cnt = (rank + 1).astype(np.float64)
        f = np.zeros((E, 4))
        f[order, 0] = np.log1p(dec[30]); f[order, 1] = np.log1p(dec[365]); f[order, 2] = np.log1p(cnt)
        f[:, 3] = np.log(self.size)
        out[1:] = f
        return out

    def time_of(self, ct):
        return (ct - self.t0) / DAY


class BipStream:
    """The commit-node bipartite stream. The graph is made of one event per (file, commit) for commits of 2..50 added or modified
    files: src = the file node (gid + 1), dst = the commit's own node (file_max_id + 2 + the commit's index), time = the commit's
    committer time in days. Edge features (4): log1p of the file's decayed count of commits at half-lives 30 d and 365 d (counting
    this one and every earlier one), log1p of its plain count, log of the commit size. A commit node's feature vector is the mean
    of its files' vectors (node_features of Ctx). The units to learn are the same co-change pairs as the pair stream's (file, file,
    commit time): a model embeds both files from this graph, strictly before the commit's time, and a link predictor scores
    them; so a file's neighbours are commits, and two files that changed together share commit neighbours.
    ev_hend[n] = number of graph events of commits[:n]; u_hend[n] = number of units of commits[:n]."""

    def __init__(self, commits, seed=0, max_commit_files=50):
        P = Stream(commits, seed=seed, max_commit_files=max_commit_files)
        self.pairs = P
        self.kind = 'bip'
        self.t0, self.ct = P.t0, P.ct
        self.file_max_id = P.max_id
        self.n_commits = len(commits)
        self.max_id = P.max_id + len(commits)          # n_nodes = max_id + 2 (padding, files gid+1, commit nodes)
        self.u_src, self.u_dst, self.u_t, self.u_hend, self.u_commit = P.src, P.dst, P.t, P.ev_hend, P.commit
        F, C, Z = [], [], []
        for n, c in enumerate(commits):
            f = sorted({i for i, st in c['ev'] if st in ('A', 'M')})
            if len(f) < 2 or len(f) > max_commit_files:
                continue
            F.append(np.array(f, dtype=np.int64)); C.append(np.full(len(f), n, dtype=np.int64)); Z.append(np.full(len(f), len(f)))
        if F:
            F, C, Z = (np.concatenate(x) for x in (F, C, Z))
        else:
            F = C = Z = np.zeros(0, dtype=np.int64)
        self.commit = C
        self.members = F                                  # the file (gid) of each event
        self.src = F + 1
        self.dst = self.file_max_id + 2 + C
        self.t = (P.ct[C] - P.t0) / DAY if len(C) else np.zeros(0)
        self.n_events = len(self.src)
        self.ev_hend = np.searchsorted(self.commit, np.arange(len(commits) + 1), side='left')
        E = self.n_events
        out = np.zeros((E + 1, 4), dtype=np.float32)
        if E:
            order = np.lexsort((np.arange(E), F))            # by file, then event order (= time order)
            k, t = F[order], self.t[order]
            newgrp = np.r_[True, k[1:] != k[:-1]]
            gstart = np.maximum.accumulate(np.where(newgrp, np.arange(E), 0))
            rank = np.arange(E) - gstart
            dec = {30: np.ones(E), 365: np.ones(E)}
            for r in range(1, int(rank.max()) + 1):
                i = np.nonzero(rank == r)[0]
                dt = t[i] - t[i - 1]
                for hl, d in dec.items():
                    d[i] = d[i - 1] * 0.5 ** (dt / hl) + 1.0
            f = np.zeros((E, 4))
            f[order, 0] = np.log1p(dec[30]); f[order, 1] = np.log1p(dec[365]); f[order, 2] = np.log1p((rank + 1).astype(np.float64))
            f[:, 3] = np.log(Z)
            out[1:] = f
        self.edge_feat = out

    def time_of(self, ct):
        return (ct - self.t0) / DAY


def make_stream(name, commits):
    return Stream(commits) if name == 'pair' else BipStream(commits)


class FastSampler:
    """DyGLib NeighborSampler, 'recent' strategy, vectorised. Both endpoints of an event see the other as a neighbour.
    max_event: only events [0, max_event) exist (used by tests); the time filter alone already decides what a query sees."""

    def __init__(self, st, max_event=None):
        E = st.n_events if max_event is None else int(max_event)
        n_nodes = st.max_id + 2
        self.n_nodes = n_nodes
        nodes = np.concatenate([st.src[:E], st.dst[:E]])
        nbr = np.concatenate([st.dst[:E], st.src[:E]])
        eid = np.concatenate([np.arange(1, E + 1), np.arange(1, E + 1)])
        tt = np.concatenate([st.t[:E], st.t[:E]])
        o = np.lexsort((eid, tt, nodes))
        self.nodes, self.nbr, self.eid, self.tt = nodes[o], nbr[o], eid[o], tt[o]
        self.keys = self.nodes.astype(np.float64) * KEY + self.tt
        self.indptr = np.searchsorted(self.nodes, np.arange(n_nodes + 1), side='left')

    def _ends(self, node_ids, times):
        node_ids = np.asarray(node_ids, dtype=np.int64); times = np.asarray(times, dtype=np.float64)
        end = np.searchsorted(self.keys, node_ids.astype(np.float64) * KEY + times, side='left')   # first entry with time >= t
        start = self.indptr[np.minimum(node_ids, self.n_nodes - 1)]
        end = np.maximum(end, start)
        return start, end

    def get_historical_neighbors(self, node_ids, node_interact_times, num_neighbors=20):
        """(ids, edge ids, times), each [len(node_ids), num_neighbors], the most recent neighbours before the query time, right
        aligned in time order, zero padded on the left (DyGLib's layout)."""
        node_ids = np.asarray(node_ids); n = len(node_ids)
        start, end = self._ends(node_ids, node_interact_times)
        cnt = np.minimum(end - start, num_neighbors)
        col = np.arange(num_neighbors)[None, :]
        pos = end[:, None] - num_neighbors + col
        ok = col >= (num_neighbors - cnt)[:, None]
        pos = np.where(ok, pos, 0)
        ids = np.where(ok, self.nbr[pos], 0).astype(np.int64) if len(self.nbr) else np.zeros((n, num_neighbors), np.int64)
        eids = np.where(ok, self.eid[pos], 0).astype(np.int64) if len(self.nbr) else np.zeros((n, num_neighbors), np.int64)
        tms = np.where(ok, self.tt[pos], 0.0) if len(self.nbr) else np.zeros((n, num_neighbors))
        return ids, eids, tms

    def first_hop(self, node_ids, node_interact_times, max_len):
        """Same as get_historical_neighbors with num_neighbors = max_len; DyGFormer takes the last max_len - 1 of them."""
        return self.get_historical_neighbors(node_ids, node_interact_times, max_len)


def load_embeddings(u4root, repo):
    z = np.load(os.path.join(u4root, 'emb', repo + '.npz'))
    return {k: n for n, k in enumerate(z['keys'].tolist())}, z['vecs']


def node_features(u4root, repo, seg_files, max_id, _cache={}, st=None):
    """[max_id + 2, 1024] float32 node features from the content snapshot `seg_files` (gid string -> key): row gid+1; zero when
    the file is not in the snapshot (and row 0, the padding node)."""
    if repo not in _cache:
        _cache[repo] = load_embeddings(u4root, repo)
    kmap, V = _cache[repo]
    fmax = st.file_max_id if st is not None else max_id
    X = np.zeros((max_id + 2, V.shape[1]), dtype=np.float32)
    for g, key in seg_files.items():
        if key in kmap and int(g) <= fmax:
            X[int(g) + 1] = V[kmap[key]]
    if st is not None and st.kind == 'bip' and st.n_events:
        # commit node = mean of its files' vectors (files absent from the snapshot count as zero vectors)
        starts = np.r_[0, np.nonzero(np.diff(st.commit))[0] + 1]
        cids = st.commit[starts]
        for a in range(0, len(starts), 2000):
            s0 = starts[a]; s1 = starts[a + 2000] if a + 2000 < len(starts) else st.n_events
            sums = np.add.reduceat(X[st.src[s0:s1]], starts[a:a + 2000] - s0, axis=0)
            cnt = np.diff(np.r_[starts[a:a + 2000], s1])
            X[st.file_max_id + 2 + cids[a:a + 2000]] = sums / cnt[:, None]
    return X
