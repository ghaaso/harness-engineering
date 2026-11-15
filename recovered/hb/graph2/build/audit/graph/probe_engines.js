'use strict';
// Lists what the installed engines offer (functions, settings), so the "strongest form" review is
// grounded in the installed versions, not in documentation of other versions. Read-only.
//   node probe_engines.js > engines_features.json
const lbug = require('@ladybugdb/core');
const { DuckDBInstance } = require('@duckdb/node-api');

async function main() {
  const out = {};
  // ---- LadybugDB ----
  const db = new lbug.Database(':memory:');
  const c = new lbug.Connection(db);
  const all = (q) => { const r = c.querySync(q); const rows = r.getAllSync(); r.close(); return rows; };
  try { all('LOAD EXTENSION algo'); out.lb_algo_loaded = true; } catch (e) { out.lb_algo_loaded = String(e.message); }
  try { out.lb_version = all('CALL db_version() RETURN *'); } catch (e) { out.lb_version = String(e.message); }
  try {
    const f = all('CALL show_functions() RETURN *');
    out.lb_function_cols = Object.keys(f[0] || {});
    out.lb_functions_n = f.length;
    const names = f.map((r) => (r.name || r.function_name || JSON.stringify(r)) + ' [' + (r.type || r.function_type || '') + ']');
    out.lb_table_and_algo_functions = names.filter((n) => /TABLE|ALGO|GDS|ALGORITHM/i.test(n) || /page|louv|core|gds|wcc|scc|connected|leiden|label|katz|between|close|eigen|node2vec|project|shortest|fts|vector|index/i.test(n)).sort();
  } catch (e) { out.lb_functions = String(e.message); }
  try { out.lb_settings = all('CALL current_setting(\'threads\') RETURN *'); } catch (e) { out.lb_settings = String(e.message); }
  for (const s of ['threads', 'timeout', 'var_length_extend_max_depth', 'enable_semi_mask', 'enable_zone_map', 'spill_to_disk', 'recursive_pattern_semantic', 'recursive_pattern_factor', 'progress_bar', 'checkpoint_threshold', 'enable_plan_optimizer']) {
    try { out['lb_setting_' + s] = all(`CALL current_setting('${s}') RETURN *`); } catch (e) { out['lb_setting_' + s] = 'ERR ' + String(e.message).slice(0, 120); }
  }
  c.closeSync(); db.closeSync();
  // ---- DuckDB + DuckPGQ ----
  const inst = await DuckDBInstance.create(':memory:');
  const k = await inst.connect();
  const q = async (s) => (await k.runAndReadAll(s)).getRowObjectsJS();
  await q("SET extension_directory='/opt/eng/ext-duckdb'");
  await q('LOAD duckpgq');
  out.duck_version = await q('SELECT version() AS v');
  out.duck_extensions = (await q("SELECT extension_name, loaded, installed, extension_version FROM duckdb_extensions() WHERE installed OR loaded")).map((r) => `${r.extension_name} loaded=${r.loaded} v=${r.extension_version}`);
  const fn = await q("SELECT DISTINCT function_name, function_type FROM duckdb_functions() WHERE function_name ILIKE '%csr%' OR function_name ILIKE '%length%' OR function_name ILIKE '%path%' OR function_name ILIKE '%pagerank%' OR function_name ILIKE '%component%' OR function_name ILIKE '%cluster%' OR function_name ILIKE '%pgq%' OR function_name ILIKE '%graph%' OR function_name ILIKE '%shortest%' OR function_name ILIKE '%reach%' OR function_name ILIKE '%louvain%' OR function_name ILIKE '%fts%' OR function_name ILIKE '%match%' ORDER BY 1");
  out.duck_graph_functions = fn.map((r) => r.function_name + ' [' + r.function_type + ']');
  const sets = await q("SELECT name, value FROM duckdb_settings() WHERE name IN ('threads','memory_limit','preserve_insertion_order','enable_object_cache','experimental_use_bfs','experimental_path_finding_operator','path_finding_task_size','path_finding_operator_threshold','enable_http_metadata_cache') OR name ILIKE '%path%find%' OR name ILIKE '%pgq%' OR name ILIKE '%bfs%' OR name ILIKE '%csr%' ORDER BY 1");
  out.duck_settings = sets;
  k.closeSync(); inst.closeSync();
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
