# Writes engines_checked.json: engines.json with every statement marked by the timing audit.
# Inputs: results/bench/interleaved/engines.json, and this folder's recompute.json and sensitivity.json.
import json, os, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
IB = os.path.normpath(os.path.join(HERE, '..', '..', 'results', 'bench', 'interleaved'))
E = json.load(open(os.path.join(IB, 'engines.json'), encoding='utf-8'))
R = json.load(open(os.path.join(HERE, 'recompute.json'), encoding='utf-8'))
S = json.load(open(os.path.join(HERE, 'sensitivity.json'), encoding='utf-8'))
NAME = {'relational': 'SQLite', 'ladybug': 'LadybugDB', 'duckpgq': 'DuckDB+DuckPGQ'}
comp = {(c['what'], c['a'], c['b']): c for c in R['comparisons']}
best = E['calibration_best_threads']
rows = R['rows']

def row(g, c, e, s='one'):
    return rows.get('|'.join([g, c, e, s]))

def facts_note(x):
    g, cls = x['what'].split('/')[0], x['what'].split('/')[1].split(' ')[0]
    lb = row(g, cls, 'ladybug')
    other = x['b'] if x['a'] == 'ladybug' else x['a']
    ot = row(g, cls, other)
    lbw = lb['cold_plus_facts']['wall_passes']; ow = ot['cold']['wall_passes']
    if max(lbw) < min(ow): rel = 'LadybugDB stays lower in every pass'
    elif min(lbw) > max(ow): rel = f'{NAME[other]} is then lower in every pass'
    else: rel = 'the pass ranges then overlap (no difference shown)'
    return (f"LadybugDB's cold time leaves out loading the canonical facts graph into memory (median {lb['cold_facts_load_median']:.0f} ms on this graph), "
            f"which only the LadybugDB arm needs to answer (its LbGraph reads node kinds, files and count from it); SQLite and DuckDB load nothing. "
            f"Counted in, LadybugDB's cold wall time is about {lb['cold_plus_facts']['wall']:.0f} ms against {ot['cold']['wall']:.0f} ms for {NAME[other]}: {rel}. "
            f"Client-library load (about 70 to 100 ms per engine) is left out for all three.")

def quals(x, holds_listed):
    q = []; carry = []
    what = x['what']; a, b = x['a'], x['b']; engs = {a, b}
    c = comp[(what, a, b)]
    parts = what.split(' ')
    g = what.split('/')[0]
    cls = what.split('/')[1].split(' ')[0] if '/' in what else None
    meas = c['measure']
    # recomputation
    ok = abs(c['wall_diff'] - x['wall_diff_ms']) < 0.003 and abs(c['cpu_diff'] - x['cpu_diff_ms']) < 0.003 and c['holds_their_rule'] == holds_listed
    if not ok: q.append('RECOMPUTE MISMATCH: the audit got a different value or verdict')
    if holds_listed:
        if c['duplicate_of_1_thread_row']:
            q.append('Duplicate: both engines\' best thread setting is 1, so this is the 1-thread statement again with the same numbers; it is not a separate finding.')
        if not c['holds_sum_rule']:
            q.append('Weakest kind of hold: every pass agrees and the five pass values of the two engines do not overlap, but the difference is smaller than the two engines\' spreads added together.')
        if meas == 'cold' and 'ladybug' in engs:
            lb_lower = (c['wall_diff'] < 0) == (a == 'ladybug')
            (q if lb_lower else carry).append(facts_note(x) if lb_lower else 'Counting LadybugDB\'s facts load would make this difference larger: ' + facts_note(x))
    else:
        if meas == 'cold' and 'ladybug' in engs:
            carry.append('If LadybugDB\'s facts load is counted, this cold comparison changes: ' + facts_note(x))
    # labels that must travel with the number (all printed in summary.md, so they are not qualifications by themselves)
    if cls in ('S1', 'base') and 'ladybug' in engs and meas in ('warm', 'warm_p95'):
        carry.append('LadybugDB\'s PageRank here is 40 iterations in JavaScript over a transition CSR cached in application code; the "application caches dropped" statement is the like-for-like one.')
    if cls in ('S1', 'base') and 'ladybug' in engs and meas == 'uncached':
        carry.append('LadybugDB\'s PageRank still runs in JavaScript (the cached CSR is rebuilt by one Cypher query per call here).')
    if cls == 'primary' and 'ladybug' in engs and meas != 'cold':
        carry.append('LadybugDB\'s degree-normalised spreading for the primary runs in JavaScript; only the reach (native SHORTEST pattern) and the arc fetch run in the engine.')
    if cls in ('S1', 'base') and 'relational' in engs:
        carry.append('SQLite\'s PageRank is about 270 SQL statements per ranking driven by a loop in application code: an implementation choice of the relational arm, not a property of SQLite.')
    if 'duckpgq' in engs and meas != 'cold' and cls not in (None, 'build', 'update'):
        tr = next(t for t in E['table'] if t['graph'] == g and t['query_class'] == cls and t['engine'] == 'duckpgq' and t['setting'] == 'one')
        carry.append(f"DuckDB's times include the asynchronous Node client's per-statement round trips (estimated {tr['roundtrip_estimate_ms']['median_over_passes']:.1f} ms of its {tr['warm_wall_p50_ms']['median_over_passes']:.1f} ms warm median here).")
        if cls == 'primary': carry.append('DuckPGQ reaches nodes for the primary with its iterativelength() graph function over a CSR built in the statement; the ranking is SQL.')
        if cls in ('S1', 'base'): carry.append('DuckPGQ\'s bounded reach for this class is a recursive SQL statement, not a graph operator; PageRank is one recursive SQL statement.')
    if cls == 'tq':
        carry.append('The question code differs per arm (SQLite re-prepares its statements each call, LadybugDB keeps prepared statements, DuckDB inlines literals); 20 TUNE questions.')
        if parts[1:3] == ['best', 'threads'] and 'relational' in engs:
            q.append('SQLite\'s "best" setting for the questions is 4 threads, which is PRAGMA threads = 3 (sorter helper threads only); the calibration picked it on a 0.03 ms margin and it runs the same statements.')
    if cls in ('build', 'update'):
        carry.append('Store contents differ per arm (closure table, FTS5 and global PageRank in SQLite; typed tables, term graph and native page_rank, k-core and Louvain in LadybugDB; label tables, postings and two property graphs in DuckDB), and builds and updates run at each engine\'s default thread count: this compares the three designs, not the engines alone.')
    if parts[1:3] == ['best', 'threads'] and 'ladybug' in engs and not c['duplicate_of_1_thread_row'] and cls not in ('build', 'update'):
        T = best['ladybug'][g].get(cls)
        if T and T != 1:
            carry.append(f'LadybugDB runs at {T} threads here and the others at 1; CPU time counts every thread.')
    result = 'survives' if not q else ('refuted' if any(s.startswith('RECOMPUTE') for s in q) else 'needs qualification')
    return result, q, carry

def mark_list(lst, holds_listed):
    out = []
    for x in lst:
        res, q, carry = quals(x, holds_listed)
        c = comp[(x['what'], x['a'], x['b'])]
        out.append({'statement': x['text'], 'listed_as': 'difference that holds' if holds_listed else 'inside the noise', 'result': res,
                    'qualification': q, 'quote_only_with': carry,
                    'audit_recomputed': {'wall_diff_ms': round(c['wall_diff'], 3), 'cpu_diff_ms': round(c['cpu_diff'], 3), 'same_direction': c['same_direction'],
                                         'holds_declared_rule': c['holds_their_rule'], 'exceeds_sum_of_spreads': c['holds_sum_rule'], 'pass_ranges_disjoint': c['holds_disjoint_rule'],
                                         'passes_agreeing': c['passes_agreeing']}})
    return out

held = mark_list(E['differences_that_hold'], True)
noise = mark_list(E['differences_within_noise'], False)

labels = [
    {'statement': E['labels'][0], 'result': 'needs qualification',
     'qualification': ['The first clause ("recursive SQL, not a graph operator") is true for the bounded classes S1 and base only. For the frozen primary (unbounded) DuckPGQ reaches nodes with iterativelength(), a graph function of the extension over a CSR, and fetches the reach DAG with a GRAPH_TABLE MATCH one-edge pattern (arms/duckpgq/pgq.js khop). The parenthesis says so; the headline clause should not be quoted alone.'],
     'evidence': 'arms/duckpgq/pgq.js lines 249 to 290'},
    {'statement': E['labels'][1], 'result': 'survives', 'qualification': [],
     'evidence': 'arms/ladybug/lb.js pprApp loop over PPR_ITERS (arms/common/config.js: 40); bench/ladybug.js uses pprImpl "app" (an "engine" form exists in lb.js and is about 1.6 s a query; it was not timed).'},
    {'statement': E['labels'][2], 'result': 'survives', 'qualification': [],
     'evidence': 'arms/relational/rel.js: bounded hops use the recursive CTE (useCte = true); unbounded hops use the khop_level statement in a loop in JavaScript.'},
    {'statement': E['labels'][3], 'result': 'survives', 'qualification': [],
     'evidence': 'arms/ladybug/lb.js: degnorm = Cypher for arcs and out-degrees, spreading in JavaScript; reach by the native SHORTEST recursive pattern (lb.js line 143).'},
]

other = [
    {'statement': 'summary_rule: ' + E['summary_rule'], 'result': 'survives',
     'qualification': [],
     'note': f"The audit recomputed all {R['differences_check']['recomputed_comparisons']} comparisons and got the same {R['differences_check']['hold_their_rule']} holds and the same values. The rule takes the larger of the two spreads, not their sum; {R['differences_check']['hold_sum_rule']} of the {R['differences_check']['hold_their_rule']} also exceed the sum, and all {R['differences_check']['hold_their_rule']} have non-overlapping pass ranges with every pass agreeing."},
    {'statement': 'host_load: ' + E['host_load']['rule'] + f" Totals: {E['host_load']['totals']}; {E['host_load']['attempts_of_interrupted_session_discarded']} attempts of an interrupted session discarded.",
     'result': 'survives', 'qualification': [],
     'note': ('blocks.jsonl re-read: 0 attempts where the repeat or flag decision disagrees with "other work above 12 of 24 CPUs"; all 6 kept-and-flagged blocks are fourth attempts; every one of the 2,000 unit blocks is a kept line of the log; the host part of "other work" re-derived from host_load.jsonl agrees within 0.01 CPUs for all 2,000 blocks (the VM part was not saved and could not be re-derived). '
              'Dropping the 6 flagged blocks changes no verdict. The machine was not quiet: other work had a median of about 5.8 to 5.9 CPUs per block for every engine and a 90th percentile of about 10 CPUs; a block was repeated only above 12 CPUs. Inside one round the three engines saw the same load (median difference 0.01 to 0.05 CPUs).')},
    {'statement': 'check: ' + json.dumps(E['check']), 'result': 'survives', 'qualification': [],
     'note': ('Recomputed from the answer hashes in the unit files: on every seed of every class and graph, every engine, pass, thread setting, warm and cold call gave one and the same ranked answer at 1e-9 and also the same exact hash (primary, S1, base on both graphs; S2 across LadybugDB settings; the 20 questions across the three engines). '
              'The comparison with the reference arm itself was not re-run by this audit; it is taken from bench/icheck.js. 17 of the 200 frozen-graph seeds return an empty answer in every engine; dropping them changes no verdict.')},
    {'statement': 'calibration_best_threads: ' + json.dumps(best), 'result': 'needs qualification',
     'qualification': ['"Best" is the calibration pick (fewest threads within 3 % of the lowest median on 20 calibration seeds x 3, once, under load), not a setting shown to be faster in the passes. LadybugDB frozen primary "best 4" was 26 % faster in calibration, but in the passes it is 67.4 ms against 71.2 ms at 1 thread (spreads about 14 to 15 ms) and uses about 108 ms of CPU against 72 ms. SQLite\'s question "best 4" is PRAGMA threads = 3, sorter helpers only, picked on 0.261 against 0.234 ms.'],
     'note': 'Thread settings were read back from the engine in every warm block and match the setting asked for (SQLite pragma_threads 0 or 3, LadybugDB 1, 2 or 4, DuckDB 1).'},
    {'statement': 'Query-class titles: "LadybugDB S2 (PPR fused with the stored community prior; native engine mode)"', 'result': 'needs qualification',
     'qualification': ['At query time S2 runs the native SHORTEST reach, 40 PageRank iterations in JavaScript and reads a stored per-node community value (n.comm) by Cypher; the grouping came from Louvain at build time and is read from a stored prior file. "Native engine mode" overstates what runs in the engine per query (addendum 6 item 10).']},
]

table = []
for t in E['table']:
    k = '|'.join([t['graph'], t['query_class'], t['engine'], t['setting']])
    notes = []
    if t['engine'] == 'ladybug':
        r = rows[k]
        if r.get('cold_facts_load_median'):
            notes.append(f"cold_wall_ms leaves out LadybugDB's facts load (median {r['cold_facts_load_median']:.0f} ms), which the other engines do not need; with it the cold median is about {r['cold_plus_facts']['wall']:.0f} ms.")
        notes.append('query_text counts only the Cypher texts sent to the engine; the spreading or PageRank code in JavaScript is not counted, so it is not "lines of query code per algorithm".')
    if t['engine'] == 'relational' and t['query_class'] == 'tq' and t['setting'] == 'best':
        notes.append('best = 4 threads is PRAGMA threads = 3 (sorter helpers only); a calibration noise pick.')
    if t['engine'] == 'ladybug' and t['graph'] == 'frozen' and t['query_class'] == 'primary' and t['setting'] == 'best':
        notes.append('best = 4 threads: not faster than 1 thread beyond the spread in the passes, and about 50 % more CPU.')
    if t['graph'] == 'frozen' and t['query_class'] != 'tq':
        notes.append('17 of the 200 frozen-graph seeds return an empty answer in every engine and are included in the medians (dropping them changes no verdict).')
    table.append({'row': f"{t['graph']}/{t['query_class']} {NAME[t['engine']]} {t['setting']} (threads {t['threads']})",
                  'result': 'needs qualification' if t['engine'] == 'ladybug' or (t['engine'] == 'relational' and t['query_class'] == 'tq' and t['setting'] == 'best') else 'survives',
                  'recomputed': 'every per-pass value, median and spread of the warm, p95, caches-dropped, cold, cold-open, engine-API and app-code cells reproduced to 0.0015 ms' if not R['table_check']['mismatches'] else 'see mismatches',
                  'notes': notes})

stores = [{'row': f"{s['graph']} {NAME[s['engine']]}: build {s['build_wall_ms']['median_over_passes']:.0f} ms wall, {s['size_bytes']} bytes, one-file update {s['update_one_file_wall_ms']['median_over_passes']:.0f} ms wall",
           'result': 'survives', 'notes': ['Per-pass build and update values and the store size reproduced. Store contents and build/update thread counts differ per arm, so these compare designs, not engines alone.'] +
           (['LadybugDB build spread is large (one pass about 5.1 to 5.3 s against about 3.0 to 3.7 s in the others).'] if s['engine'] == 'ladybug' else [])} for s in E['stores']]

ipc = {'statement': 'ladybug_harness_ipc_per_pass (LadybugDB in the arm\'s child process)', 'result': 'survives',
       'notes': ['Per-pass medians reproduced. The frozen/primary spread (81.3 +- 89.9 ms) comes from one kept-and-flagged block (pass 2, other work 19.96 of 24 CPUs, 163.5 ms); the median is not affected.']}

safe = [
    'The engine timing ran after the held-out run was scored, on tuning inputs only: 200 tuning seeds on one June commit graph (2,450 nodes, 7,077 edges), 200 file nodes of the frozen commit graph (5,464 nodes, 16,462 edges) and the 20 tuning questions. No held-out task or question was timed.',
    'The three engines took turns in short blocks inside one container on six pinned CPUs, one engine at a time (no two blocks overlapped in time), over five passes from 08:05 to 11:21 UTC on 2026-11-13; every engine was first in about a third of the rounds.',
    'The PC was busy throughout: other work used a median of about 6 of its 24 logical CPUs during the blocks. 148 of the 2,148 block attempts in the passes were repeated because other work exceeded 12 CPUs, and 6 blocks were kept and flagged after three repeats; dropping them changes nothing.',
    'All three engines returned the same ranked answer for every seed, in every pass, at every thread setting, warm and cold, and the same answers to the 20 questions.',
    'An independent recomputation from the raw block files reproduced every number in the engine table and all 180 engine-to-engine verdicts.',
    'For the selected configuration (the frozen primary), SQLite answered fastest: median 14.5 ms per ranking on the tuning graph and 32.7 ms on the frozen graph, against 41.5 and 71.2 ms for LadybugDB and 70.3 and 98.7 ms for DuckDB with DuckPGQ (one thread, warm). These differences hold in wall and CPU time in all five passes.',
    'Between LadybugDB and DuckDB-with-DuckPGQ no difference is stated for the frozen primary warm median (71.2 against 98.7 ms): LadybugDB was lower in all five passes, but the 27.5 ms gap is smaller than the 36 ms spread between DuckDB\'s passes, so under the declared rule it stays inside the noise.',
    'For the PageRank configurations (S1 and the 2-hop base), the arm that runs PageRank in JavaScript over a cached adjacency (LadybugDB) was fastest, and the arm that runs it as about 270 SQL statements per ranking (SQLite) was slowest: frozen graph S1 17 ms, 58 ms and 256 ms (LadybugDB, DuckDB, SQLite). With the application caches dropped, LadybugDB is 51 ms and still lowest. This compares PageRank implementations, not graph operators.',
    'For the 20 question lookups SQLite took about 0.3 ms per question, LadybugDB about 1.9 ms and DuckDB about 9 ms (warm median, frozen graph).',
    'Building a store took about 0.35 to 0.9 s for SQLite, 0.6 to 0.7 s for DuckDB and 3.1 to 3.7 s for LadybugDB (median over five builds), and a one-file update 0.18 to 0.27 s for SQLite and DuckDB (no difference between them beyond the noise) against 0.52 to 0.63 s for LadybugDB; the stores hold different extra tables, so this compares the three designs, not the engines alone.',
    'Every per-query time is a few milliseconds to a few hundred milliseconds on graphs of a few thousand nodes; the test does not show whether these differences matter for an agent working in a session.',
]

must_not = [
    'Graph engines are faster than SQL (or than SQLite) at answering "what is connected to this code?".',
    'SQLite is faster (or slower) than the graph engines in general; the order depends on the configuration and on where each arm runs its ranking.',
    'LadybugDB computes PageRank, or the primary ranking, faster in its graph engine: both run in JavaScript in the LadybugDB arm.',
    'The S1 and 2-hop base timings show a graph operator against SQL: they compare a JavaScript PageRank over an application cache, one recursive SQL statement and about 270 SQL statements per ranking.',
    'DuckPGQ\'s graph operators are slower than SQL: most of its timed work is SQL, and the primary reach uses its iterativelength() function.',
    'LadybugDB starts (cold) faster than DuckDB or SQLite: its cold figure leaves out a facts load of about 90 to 180 ms that only LadybugDB needs; counted in, it is slower than SQLite on every class except frozen S1 and base, and slower than DuckDB on the frozen graph.',
    '149 differences between the engines hold (as a count of separate findings): 45 of them repeat a 1-thread statement under the "best threads" label.',
    'The timing was taken on a quiet machine.',
    'A "best thread setting" is faster than one thread (it is a calibration pick; for LadybugDB frozen primary and SQLite questions it is not faster beyond the noise).',
    'LadybugDB needs less query code than SQL (2 statements and 471 characters): its algorithm code is in JavaScript and is not counted in the query-text measure.',
    'Store build time, update time or size on disk measure the engines alone: each arm stores different extra tables.',
    'Any engine is better for this project, or should be adopted, on the strength of these timings.',
    'An agent finishes tasks faster with any of these stores.',
    'Anything timed here was measured on held-out tasks or questions.',
    'The timings hold for larger graphs, other repositories or other machines.',
]

out = {
    'audit': {'lane': 'timing audit (H5 engine measures)', 'written': datetime.datetime.utcnow().replace(microsecond=0).isoformat() + 'Z',
              'inputs': 'results/bench/interleaved/{engines.json, summary.md, summary.json, check.json, blocks.jsonl, host_load.jsonl, clock.jsonl, calibration.json, plan.json, units/*.json}; bench/*.js; arms/{relational,ladybug,duckpgq}/ code read for the labels',
              'scripts': ['audit/bench/recompute.py (own code: table, stores, 180 comparisons under three rules, alternation, load rule, cross-engine answer identity)', 'audit/bench/sensitivity.py (verdicts without flagged blocks, without empty-answer seeds, with LadybugDB facts load in its cold time)', 'audit/bench/build_checked.py (this file)'],
              'not_done': ['The reference-arm comparison of bench/icheck.js was not re-run (no arm or bench was executed by this audit); cross-engine identity was recomputed instead.', 'The VM side of the per-block load (sampled inside the container, not saved to a file) could not be re-derived.', 'The CPU time of LadybugDB\'s facts load is not recorded per cold row, so the facts-load variant was judged on wall time only.']},
    'checks': {
        '1_recompute_table': R['table_check'] | {'stores_mismatches': R['stores_check']['mismatches']},
        '2_alternation_seeds_equivalence': {'overlapping_block_attempts': R['alternation']['overlapping_attempts_total'], 'rounds': R['rounds'], 'same_seeds_across_engines_settings_passes': R['same_seeds_across_engines_settings_passes'], 'answer_identity_from_hashes': R['equivalence_from_unit_hashes'], 'unit_blocks_matched_to_log': R['unit_blocks_matched_to_log'], 'per_unit': R['alternation']['per_unit']},
        '3_host_load': {'load_rule_errors': R['alternation']['load_rule_error_count'], 'kept_flagged_by_attempt_index': R['alternation']['kept_flagged_by_attempt_index'], 'per_engine': R['host_load_per_engine'], 'host_other_recomputed': R['host_other_recomputed'], 'load_difference_same_round': R['load_difference_same_round'], 'sensitivity_drop_flagged': S['A_drop_flagged_blocks']},
        '4_differences': R['differences_check'] | {'sensitivity': {k: v for k, v in S.items()}},
        '5_labels_and_threads': {'labels': [l['result'] for l in labels], 'thread_readback': R['thread_readback'], 'calibration_margin': R['calibration_margin'], 'cold_with_facts_load': R['cold_with_facts_load']},
    },
    'source_engines_json': {'generated_at': E['generated_at'], 'settings': E['settings'], 'container': E['container'], 'units': E['units']},
    'labels': labels,
    'other_statements': other,
    'table': table,
    'stores': stores,
    'ladybug_harness_ipc': ipc,
    'differences_that_hold': held,
    'differences_within_noise': noise,
    'counts': {
        'differences_that_hold': {r: sum(1 for x in held if x['result'] == r) for r in ('survives', 'needs qualification', 'refuted')},
        'differences_within_noise': {r: sum(1 for x in noise if x['result'] == r) for r in ('survives', 'needs qualification', 'refuted')},
    },
    'safe_sentences_for_owner': safe,
    'must_not_claim': must_not,
}
json.dump(out, open(os.path.join(HERE, 'engines_checked.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(json.dumps(out['counts']))
for x in held:
    if x['result'] != 'survives': print('-', x['statement'][:110], '|', x['qualification'][0][:90])
