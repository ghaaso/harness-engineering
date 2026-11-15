"""Round 3 fix of write_result.py: the two 16-row answer-level tables become one compact table (one row per arm,
cells alone / fused, plus the comparators), so the worst case (full held-out table and a graded item-24 table) stays
under the 150-line cap (audit-result-8). The lane figure keeps its own column label and heading (ruling 71)."""
import sys
p = sys.argv[1]
t = open(p, encoding='utf-8').read()
a = t.index("        if AG and isinstance(AG.get('labels'), dict):\n            L += ['', '| ranked list | item 24 (grader)")
b = t.index("    else:\n        L.append('Not available (%s missing).' % a['answer'])")
new = '''        GL = AG['labels'] if AG and isinstance(AG.get('labels'), dict) else None
        if GL is None and AG:
            L.append('Item 24 (grader): result attached, %s (no per-list table in it).' % a['answer_graded'])
            J['item24']['graded'] = AG.get('summary', AG)
        elif GL is None:
            L.append('Item 24 (grader): not graded yet.')
        L += ['', '### %s' % LFR['label'][0].upper() + LFR['label'][1:], '',
              'Computed by the lane against git\\'s files only (%s); a separate figure, not item 24. Arm cells: alone / fused.' % LFR['refs'], '']
        hdr = '| ranked list | ' + ('item 24 (grader) | minus RRF [95 %] | ' if GL is not None else '') + \\
              'file recall within 8,000 tokens, lane-computed | minus RRF [95 %] |'
        L += [hdr, '|---|---|---|' + ('---|---|' if GL is not None else '')]
        J['lane_file_recall'] = dict(label=LFR['label'], labels={})
        if GL is not None: J['item24']['labels'] = {}
        for lab in sorted(LFR['labels']):
            d = LFR['labels'][lab]; vs = d.get('vs_RRF', {}).get('primary')
            J['lane_file_recall']['labels'][lab] = dict(file_recall=d['mean']['primary'], vs_RRF=vs, per_seed=d.get('per_seed_primary'))
        for lab in sorted(GL or {}):
            d = GL[lab]; J['item24']['labels'][lab] = dict(primary=d['mean']['primary'], vs_RRF=(d.get('vs_RRF') or {}).get('primary'))

        def cells(src, key, names):
            got = [src.get(n) for n in names]
            if not any(got): return None
            m = ' / '.join('n/a' if g is None else '%.3f' % g['mean']['primary'] for g in got)
            vv = []
            for g in got:
                vs = None if g is None else (g.get('vs_RRF') or {}).get('primary')
                vv.append('reference' if g is not None and vs is None else ('n/a' if vs is None else iv(vs)))
            return m, ' / '.join(vv)
        rows = [(arm, ['%s_alone' % arm, '%s_fused' % arm]) for arm in EMB + ('PLACEBO',)] + [(c, [c]) for c in COMPS]
        known = {n for _, ns in rows for n in ns}
        rows += [(n, [n]) for n in sorted(set(LFR['labels']) | set(GL or {})) if n not in known]  # nothing is dropped
        for name, ns in rows:
            lc = cells(LFR['labels'], 'lane', ns); gc = cells(GL, 'grader', ns) if GL is not None else None
            if lc is None and gc is None: continue
            L.append('| %s | ' % name + ('%s | %s | ' % (gc or ('n/a', 'n/a')) if GL is not None else '') + '%s | %s |' % (lc or ('n/a', 'n/a')))
'''
t = t[:a] + new + t[b:]
open(p, 'w', encoding='utf-8').write(t)
print('patched')
