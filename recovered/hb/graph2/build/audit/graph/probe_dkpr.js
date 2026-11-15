'use strict';
// DuckPGQ pagerank() on small graphs, to identify its exact rule (dangling handling, normalisation).
const { DuckDBInstance } = require('@duckdb/node-api');
async function main() {
  const inst = await DuckDBInstance.create(':memory:'); const k = await inst.connect();
  const q = async (s) => (await k.runAndReadAll(s)).getRowObjectsJS();
  await q("SET extension_directory='/opt/eng/ext-duckdb'"); await q('LOAD duckpgq'); await q("SET active_grammar_extensions=['duckpgq']");
  const graphs = {
    // the toy projection of toy_checks.js H4 (dependencies, calls+imports+history, minConf 0.5): 1=a..7=t
    toy: [[1, 2], [1, 3], [2, 4], [3, 4], [5, 1], [1, 6], [6, 1]],
    cycle_tail: [[1, 2], [2, 3], [3, 1], [3, 4], [4, 5]],
    no_dangling: [[1, 2], [2, 3], [3, 1]],
  };
  const out = {};
  for (const [name, E] of Object.entries(graphs)) {
    const N = name === 'toy' ? 7 : Math.max(...E.flat());
    await q(`CREATE OR REPLACE TABLE v_${name} AS SELECT range + 1 AS id FROM range(${N})`);
    await q(`CREATE OR REPLACE TABLE e_${name}(src BIGINT, dst BIGINT)`);
    await q(`INSERT INTO e_${name} VALUES ${E.map(([a, b]) => `(${a}, ${b})`).join(', ')}`);
    await q(`CREATE OR REPLACE PROPERTY GRAPH g_${name} VERTEX TABLES (v_${name}) EDGE TABLES (e_${name} SOURCE KEY (src) REFERENCES v_${name} (id) DESTINATION KEY (dst) REFERENCES v_${name} (id) LABEL e_${name})`);
    const r = await q(`SELECT id, pagerank FROM pagerank('g_${name}', 'v_${name}', 'e_${name}') ORDER BY id`);
    out[name] = r.map((x) => [Number(x.id), +Number(x.pagerank).toFixed(6)]);
    out[name + '_sum'] = +r.reduce((s, x) => s + Number(x.pagerank), 0).toFixed(6);
  }
  console.log(JSON.stringify(out));
  k.closeSync(); inst.closeSync();
}
main().catch((e) => { console.error(e); process.exit(1); });
