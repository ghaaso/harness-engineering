-- RELATIONAL arm schema (protocol section 5b): integer ids, typed node and edge tables, covering
-- indexes both ways, WITHOUT ROWID, FTS5 over names/signatures/doc text, a co-change table, a bounded
-- closure table and stored rank columns. ANALYZE runs after the load.
CREATE TABLE meta(k TEXT PRIMARY KEY, v TEXT) STRICT;
CREATE TABLE nkind(kid INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE) STRICT;
CREATE TABLE eclass(cid INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, structural INTEGER NOT NULL) STRICT;
CREATE TABLE ekind(ekid INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE) STRICT;
CREATE TABLE node(
  id INTEGER PRIMARY KEY, sid TEXT NOT NULL UNIQUE, kid INTEGER NOT NULL REFERENCES nkind,
  path TEXT, name TEXT, ls INTEGER, le INTEGER, signature TEXT, runtime TEXT, slice TEXT,
  is_test INTEGER NOT NULL, tokens INTEGER NOT NULL, file_id INTEGER NOT NULL,
  -- stored rank columns (computed once after load)
  prod_in INTEGER NOT NULL DEFAULT 0,      -- production in-degree over non-structural classes
  transport INTEGER NOT NULL DEFAULT 0,    -- 1 = shared plumbing (see SPEC: transport nodes)
  pagerank REAL NOT NULL DEFAULT 0         -- global PageRank, dependencies direction, restart 0.15
) STRICT;
CREATE INDEX node_path ON node(path, ls);
CREATE INDEX node_file ON node(file_id);
CREATE INDEX node_transport ON node(id) WHERE transport = 1;
-- one row per directed edge (src, kind, dst); a symmetric edge (co_changed, sym = 1) has one row per
-- orientation. The primary key is the forward covering index (clustered, all columns).
CREATE TABLE edge(
  src INTEGER NOT NULL, ekid INTEGER NOT NULL, dst INTEGER NOT NULL,
  cid INTEGER NOT NULL, w REAL NOT NULL, n INTEGER NOT NULL, sym INTEGER NOT NULL,
  PRIMARY KEY (src, ekid, dst)
) STRICT, WITHOUT ROWID;
-- reverse covering index: every column a traversal reads
CREATE INDEX edge_rev ON edge(dst, ekid, src, cid, w, sym);
-- every evidence row of an edge (canonical orientation only) (file, line, and the extractor's op/via attribute)
CREATE TABLE edge_ev(src INTEGER NOT NULL, ekid INTEGER NOT NULL, dst INTEGER NOT NULL, path TEXT, line INTEGER, op TEXT) STRICT;
CREATE INDEX edge_ev_k ON edge_ev(src, ekid, dst, line);
CREATE TABLE cochange(a INTEGER NOT NULL, b INTEGER NOT NULL, support INTEGER NOT NULL, conf REAL NOT NULL, recency REAL NOT NULL,
  PRIMARY KEY (a, b)) STRICT, WITHOUT ROWID;
-- per node and edge class: out-degree, in-degree, production in-degree (sources that are not tests)
CREATE TABLE deg(node INTEGER NOT NULL, cid INTEGER NOT NULL, out_n INTEGER NOT NULL, in_n INTEGER NOT NULL, prod_in INTEGER NOT NULL,
  PRIMARY KEY (node, cid)) STRICT, WITHOUT ROWID;
CREATE VIRTUAL TABLE fts USING fts5(body, tokenize = 'unicode61');
-- bounded closure over forward rows: mask = closure_mask, confidence >= closure_minc, dist <= closure_k
CREATE TABLE closure(src INTEGER NOT NULL, dst INTEGER NOT NULL, dist INTEGER NOT NULL,
  PRIMARY KEY (src, dst)) STRICT, WITHOUT ROWID;
CREATE INDEX closure_rev ON closure(dst, src, dist);
