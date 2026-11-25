"""U6 (B5): DyGFormer and TGN exactly as DyGLib defines them (imported unchanged from the DyGLib clone, mounted at /dyglib),
with two faster data paths that do not change a number:
 - FastDyGFormer: neighbour sequences from the vectorised sampler, padding and the neighbour co-occurrence counts done with
   array operations instead of python loops per row (same layers, same weights, same outputs; tested against DyGLib's own
   methods in test_u6.py).
 - FastTGN: DyGLib's MemoryModel (TGN), with get_updated_memories asked only about nodes that have pending messages (the other
   nodes' memories do not change, so the result is the same; tested).
The link predictor is DyGLib's MergeLayer(node_dim, node_dim, node_dim, 1).
"""
import os, sys
sys.path.insert(0, os.environ.get('DYGLIB', '/dyglib'))
import numpy as np
import torch
import torch.nn as nn
from models.DyGFormer import DyGFormer, NeighborCooccurrenceEncoder
from models.MemoryModel import MemoryModel
from models.modules import MergeLayer


class FastCooccurrence(NeighborCooccurrenceEncoder):
    def count_nodes_appearances(self, src_padded_nodes_neighbor_ids, dst_padded_nodes_neighbor_ids):
        src_ids, dst_ids = src_padded_nodes_neighbor_ids, dst_padded_nodes_neighbor_ids
        s = torch.from_numpy(src_ids).to(self.device); d = torch.from_numpy(dst_ids).to(self.device)
        s_in_s = (s[:, :, None] == s[:, None, :]).sum(-1).float()
        d_in_d = (d[:, :, None] == d[:, None, :]).sum(-1).float()
        s_in_d = (s[:, :, None] == d[:, None, :]).sum(-1).float()
        d_in_s = (d[:, :, None] == s[:, None, :]).sum(-1).float()
        src_app = torch.stack([s_in_s, s_in_d], dim=2)          # [B, Ls, 2]
        dst_app = torch.stack([d_in_s, d_in_d], dim=2)
        src_app[s == 0] = 0.0; dst_app[d == 0] = 0.0
        return src_app, dst_app


class FastDyGFormer(DyGFormer):
    """neighbor_sampler is a FastSampler. max_input_sequence_length counts the node itself (DyGLib)."""

    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.neighbor_co_occurrence_encoder = FastCooccurrence(neighbor_co_occurrence_feat_dim=self.neighbor_co_occurrence_feat_dim,
                                                               device=self.device)

    def _padded(self, node_ids, times):
        L = self.max_input_sequence_length - 1
        ids, eids, tms = self.neighbor_sampler.first_hop(node_ids, times, L)
        # DyGLib: [node itself, then its neighbours oldest first]; only as long as the longest list in the batch (+ patch padding)
        n_nb = (ids != 0).sum(1)
        mx = int(n_nb.max()) + 1 if len(n_nb) else 1
        if mx % self.patch_size:
            mx += self.patch_size - mx % self.patch_size
        B = len(node_ids)
        pid = np.zeros((B, mx), dtype=np.int64); pe = np.zeros((B, mx), dtype=np.int64); pt = np.zeros((B, mx), dtype=np.float64)
        pid[:, 0] = node_ids; pt[:, 0] = times
        # the sampler right-aligns with zeros on the left: shift each row's valid part to columns 1..n
        col = np.arange(L)[None, :]
        valid = ids != 0
        dest = col - (L - n_nb)[:, None] + 1
        rows = np.broadcast_to(np.arange(B)[:, None], ids.shape)
        pid[rows[valid], dest[valid]] = ids[valid]; pe[rows[valid], dest[valid]] = eids[valid]; pt[rows[valid], dest[valid]] = tms[valid]
        return pid, pe, pt

    def compute_src_dst_node_temporal_embeddings(self, src_node_ids, dst_node_ids, node_interact_times):
        sp = self._padded(src_node_ids, node_interact_times)
        dp = self._padded(dst_node_ids, node_interact_times)
        src_co, dst_co = self.neighbor_co_occurrence_encoder(src_padded_nodes_neighbor_ids=sp[0], dst_padded_nodes_neighbor_ids=dp[0])
        out = []
        for (pid, pe, pt), co in ((sp, src_co), (dp, dst_co)):
            nf, ef, tf = self.get_features(node_interact_times=node_interact_times, padded_nodes_neighbor_ids=pid, padded_nodes_edge_ids=pe,
                                           padded_nodes_neighbor_times=pt, time_encoder=self.time_encoder)
            p = self.get_patches(nf, ef, tf, co, patch_size=self.patch_size)
            out.append((self.projection_layer['node'](p[0]), self.projection_layer['edge'](p[1]),
                        self.projection_layer['time'](p[2]), self.projection_layer['neighbor_co_occurrence'](p[3])))
        ns, nd = out[0][0].shape[1], out[1][0].shape[1]
        chans = [torch.cat([out[0][c], out[1][c]], dim=1) for c in range(4)]
        x = torch.stack(chans, dim=2).reshape(len(src_node_ids), ns + nd, self.num_channels * self.channel_embedding_dim)
        for tr in self.transformers:
            x = tr(x)
        s = self.output_layer(torch.mean(x[:, :ns, :], dim=1))
        d = self.output_layer(torch.mean(x[:, ns:ns + nd, :], dim=1))
        return s, d

    def get_features(self, node_interact_times, padded_nodes_neighbor_ids, padded_nodes_edge_ids, padded_nodes_neighbor_times, time_encoder):
        # DyGLib's version, with the time difference taken in float64 before the cast (times are in days, differences small)
        dev = self.node_raw_features.device
        nf = self.node_raw_features[torch.from_numpy(padded_nodes_neighbor_ids).to(dev)]
        ef = self.edge_raw_features[torch.from_numpy(padded_nodes_edge_ids).to(dev)]
        dt = torch.from_numpy(node_interact_times[:, None] - padded_nodes_neighbor_times).float().to(dev)
        tf = time_encoder(timestamps=dt)
        tf[torch.from_numpy(padded_nodes_neighbor_ids == 0).to(dev)] = 0.0
        return nf, ef, tf

    def set_node_features(self, X):
        self.node_raw_features = torch.from_numpy(X).to(self.device)


class FastTGN(MemoryModel):
    def get_updated_memories(self, node_ids, node_raw_messages):
        if len(node_ids) == self.num_nodes:
            node_ids = np.array([n for n, v in node_raw_messages.items() if len(v) > 0], dtype=np.int64)
        return super().get_updated_memories(node_ids=node_ids, node_raw_messages=node_raw_messages)

    def set_node_features(self, X):
        t = torch.from_numpy(X).to(self.device)
        self.node_raw_features = t
        self.embedding_module.node_raw_features = t

    def node_embeddings(self, node_ids, time, num_neighbors):
        """Embeddings of nodes at `time` from the memory as it is (pending messages applied for the computation only)."""
        mem, _ = self.get_updated_memories(node_ids=np.array(range(self.num_nodes)), node_raw_messages=self.memory_bank.node_raw_messages)
        return self.embedding_module.compute_node_temporal_embeddings(
            node_memories=mem, node_ids=np.asarray(node_ids, dtype=np.int64),
            node_interact_times=(np.asarray(time, dtype=np.float64) if np.ndim(time) else np.full(len(node_ids), time, dtype=np.float64)),
            current_layer_num=self.num_layers,
            num_neighbors=num_neighbors)


def build(kind, X, edge_feat, sampler, n_neighbors, device, dropout=0.1, **kw):
    """(backbone, link_predictor) with DyGLib's defaults: DyGFormer channel 50, 2 layers, 2 heads, time dim 100, patch 1;
    TGN 1 layer, 2 heads, time dim 100."""
    if kind == 'dygformer':
        bb = FastDyGFormer(node_raw_features=X, edge_raw_features=edge_feat, neighbor_sampler=sampler, time_feat_dim=100,
                           channel_embedding_dim=50, patch_size=1, num_layers=2, num_heads=2, dropout=dropout,
                           max_input_sequence_length=n_neighbors, device=device)
    elif kind == 'tgn':
        bb = FastTGN(node_raw_features=X, edge_raw_features=edge_feat, neighbor_sampler=sampler, time_feat_dim=100, model_name='TGN',
                     num_layers=1, num_heads=2, dropout=dropout, device=device)
    else:
        raise ValueError(kind)
    d = X.shape[1]
    lp = MergeLayer(input_dim1=d, input_dim2=d, hidden_dim=d, output_dim=1)
    return bb.to(device), lp.to(device)
