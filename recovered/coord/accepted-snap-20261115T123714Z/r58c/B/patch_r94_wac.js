// agent B, round r58c: end-order-changes-2 change 6 (rulings:F2, blocker) and ruling 94(e)/(f): write_audit_claims.py
// writes AUDIT.md section 9 (the 2b and 2e logs and container records with sha256, what the rehearsals cannot cover,
// the mount records, the export/ note). Run once from LANE: node r58c/B/patch_r94_wac.js
const fs = require('fs');
const p = 'r58c/write_audit_claims.py';
let s = fs.readFileSync(p, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('no match: ' + a.slice(0, 80)); s = s.replace(a, () => b); };

rep(`             8. rulings 47 and 69 word for word (69's rerun comparisons are NOT located: open question 4)`,
`             8. rulings 47 and 69 word for word (69's rerun comparisons are NOT located: open question 4)
             9. ruling 86(b) and ruling 94(e)/(f) (end-order-changes-2 change 6): the held-out driver's rehearsal (END-ORDER
                2b: r58c/rehearsal/ logs, launch outputs, progress lines and inspect captures, heldout-launch/kge-H1R-launch.log)
                and the interface rehearsal (2e: r58c/B/out/rehearsal/ and r58c/B/out/logs/wr_rehearsal.log), every file
                with bytes and sha256; what the rehearsals cannot cover (the real record and anchor, the 70 real graphs,
                wall time); the mount record (docker inspect) of every container named in r58c/B/mounts-B.json and
                r58c/A/mounts-A.json, with sha256; and which containers mount export/ (ruling 94(f), ruling 89's per-use rule)`);
rep(`  29 LEAK_AUDIT_FAIL  30 RESULT_NOT_REPRODUCED  31 REAL_INPUT_IN_TEST  32 PROTOCOL_TEXT  33 FREEZE_HASH`,
`  29 LEAK_AUDIT_FAIL  30 RESULT_NOT_REPRODUCED  31 REAL_INPUT_IN_TEST  32 PROTOCOL_TEXT  33 FREEZE_HASH  34 TASK_TRUTH
  35 REHEARSAL_EVIDENCE (real mode, section 9: no r58c/rehearsal/REHEARSAL.txt ending in RESULT PASS rehearsal, no 2e
     result.json with test true, no r58c/B/mounts-B.json, or a container of it without its r58c/mounts/<name>.json)`);
rep(`        [--item22 P] [--answer P] [--handoff P] [--protocol P] [--answer-graded P] [--heldout P]
        writes ONLY`,
`        [--item22 P] [--answer P] [--handoff P] [--protocol P] [--answer-graded P] [--heldout P] [--evidence DIR]
        (--evidence: the folder section 9 reads in place of the lane root; nothing there is refused in test mode)
        writes ONLY`);
rep(`             PROTOCOL_TEXT=32, FREEZE_HASH=33, TASK_TRUTH=34)`, `             PROTOCOL_TEXT=32, FREEZE_HASH=33, TASK_TRUTH=34, REHEARSAL_EVIDENCE=35)`);
rep(`                 'tune-rank', 'anchor', 'ac-log', 'tasks')`, `                 'tune-rank', 'anchor', 'ac-log', 'tasks', 'evidence')`);

// the function, before audit_md
rep(`def audit_md(a, D, files, ev, codes, extra, is_test, marks):`,
`REH_KEEP = re.compile(r'(\\.log|\\.out|\\.txt|\\.rc|inspect.*\\.json|progress.*\\.jsonl|HANDOFF\\.json)$')
UNCOVERED = ('the real item-27 record and its coordinator anchor, the 70 real held-out graphs, and the real run\\'s wall time '
             '(ruling 86(b)); the rehearsals ran on three tuning parents with test records (2b) and on the grader\\'s test set '
             'pick8, 8 late-50 commits and 37 tasks, with test flags (2e)')


def rehearsal_evidence(root):
    """Section 9 (ruling 86(b); ruling 94(e), (f)): dict(r2b, r2e, mounts, export, lists, problems). Every file row is
    (path relative to root, bytes, sha256). problems is what the real run refuses (exit 35)."""
    def row(rel_):
        q = os.path.join(root, rel_); return (rel_.replace(os.sep, '/'), os.path.getsize(q), sha(q))

    def walk(rel_, keep=None, skip=('inputs',)):
        out = []; base = os.path.join(root, rel_)
        for dp, dn, fn in os.walk(base):
            dn[:] = sorted(d for d in dn if not (dp == base and d in skip))
            for f in sorted(fn):
                if keep is None or keep.search(f): out.append(row(os.path.relpath(os.path.join(dp, f), root)))
        return out
    probs = []
    r2b = walk(os.path.join('r58c', 'rehearsal'), REH_KEEP)
    kl = os.path.join('heldout-launch', 'kge-H1R-launch.log')
    if os.path.exists(os.path.join(root, kl)): r2b.append(row(kl))
    rs = os.path.join(root, 'r58c', 'rehearsal', 'REHEARSAL.txt')
    if not os.path.exists(rs) or not re.search(r'RESULT PASS rehearsal\\s*$', open(rs, encoding='utf-8', errors='replace').read()):
        probs.append('r58c/rehearsal/REHEARSAL.txt missing or not ending in RESULT PASS rehearsal (END-ORDER 2b)')
    r2e = walk(os.path.join('r58c', 'B', 'out', 'rehearsal'))
    wl = os.path.join('r58c', 'B', 'out', 'logs', 'wr_rehearsal.log')
    if os.path.exists(os.path.join(root, wl)): r2e.append(row(wl))
    rj = os.path.join(root, 'r58c', 'B', 'out', 'rehearsal', 'result.json')
    try: rj_test = json.load(open(rj)).get('test') if os.path.exists(rj) else None
    except ValueError: rj_test = None
    if rj_test is not True: probs.append('r58c/B/out/rehearsal/result.json missing or not test: true (END-ORDER 2e)')
    lists = {}; names = []
    for who, lp in (('B', os.path.join('r58c', 'B', 'mounts-B.json')), ('A', os.path.join('r58c', 'A', 'mounts-A.json'))):
        q = os.path.join(root, lp)
        if not os.path.exists(q):
            lists[lp.replace(os.sep, '/')] = None
            if who == 'B': probs.append('r58c/B/mounts-B.json missing (ruling 94(d))')
            continue
        try: M = json.load(open(q))
        except ValueError: M = {}; probs.append('%s is not JSON' % lp)
        lists[lp.replace(os.sep, '/')] = row(lp)
        names += [(who, k, (v or {}).get('step'), (v or {}).get('allow') or []) for k, v in sorted(M.items()) if not k.startswith('_')]
    mounts = []; exp = []
    for who, k, step, allow in names:
        cands = [os.path.join('r58c', 'mounts', k + '.json'), os.path.join('train', 'probe', k + '-inspect.json'),
                 os.path.join('train', 'heldout', k + '-inspect.json')]
        cands += [os.path.relpath(os.path.join(dp, f), root) for dp, _, fn in os.walk(os.path.join(root, 'r58c', 'rehearsal'))
                  for f in fn if f == k + '-inspect.json']
        got = [c for c in cands if os.path.exists(os.path.join(root, c))]
        mounts.append((k, who, step, [row(c) for c in got]))
        if who == 'B' and not got: probs.append('%s: no mount record r58c/mounts/%s.json (ruling 94(e))' % (k, k))
        if any(m.get('dst') in ('/w', '/w/export') or str(m.get('dst', '')).startswith('/w/export/') for m in allow):
            exp.append('%s (%s; %s)' % (k, step, ', '.join(sorted({m['dst'] for m in allow if m.get('dst') == '/w' or str(m.get('dst', '')).startswith('/w/export')}))))
    extra_rec = [row(os.path.relpath(os.path.join(root, 'r58c', 'mounts', f), root)) for f in sorted(os.listdir(os.path.join(root, 'r58c', 'mounts')))
                 if '.prev-' in f] if os.path.isdir(os.path.join(root, 'r58c', 'mounts')) else []
    kb1 = sorted(f for f in os.listdir(os.path.join(root, 'orchestrator')) if f.startswith('kge-B1-inspect') and f.endswith('.json')) \\
        if os.path.isdir(os.path.join(root, 'orchestrator')) else []
    return dict(r2b=r2b, r2e=r2e, mounts=mounts, extra=extra_rec, kb1=[row(os.path.join('orchestrator', f)) for f in kb1],
                export=exp, lists=lists, problems=probs)


def audit_md(a, D, files, ev, codes, extra, is_test, marks):`);

// section 9 at the end of audit_md
rep(`          'Ruling 69\\'s rerun comparisons: not located by this draft (open question 4).', '']
    return L`,
`          'Ruling 69\\'s rerun comparisons: not located by this draft (open question 4).', '']
    # 9 rehearsals and mount records (ruling 86(b); ruling 94(e), (f))
    RE = extra.get('rehearsal') or {}
    tab = lambda rows: (['| file | bytes | sha256 |', '|---|---|---|'] + ['| %s | %d | %s |' % (cellesc(r_[0]), r_[1], r_[2]) for r_ in rows]) if rows else ['(none found)']
    L += ['## 9. Rehearsals and mount records (ruling 86(b); ruling 94(e), (f))', '', '> ' + rt(86), '', '> ' + rt(94), '',
          '### 9a. The held-out driver\\'s rehearsal (END-ORDER 2b): logs and container records', ''] + tab(RE.get('r2b'))
    L += ['', '### 9b. The interface rehearsal (END-ORDER 2e): logs and outputs', ''] + tab(RE.get('r2e'))
    L += ['', '**What the rehearsals cannot cover:** ' + UNCOVERED + '.', '',
          '### 9c. Mount records (ruling 94(e)): the docker inspect of every container of every step, tests excluded', '',
          'Mount lists: ' + '; '.join('%s %s' % (k, ('sha256 %s' % v[2]) if v else 'NOT FOUND') for k, v in sorted((RE.get('lists') or {}).items())) + '.', '',
          '| container | list | step | record | bytes | sha256 |', '|---|---|---|---|---|---|']
    for k, who, step, rows in RE.get('mounts') or []:
        if not rows: L.append('| %s | %s | %s | NOT FOUND | | |' % (k, who, cellesc(step)))
        for r_ in rows: L.append('| %s | %s | %s | %s | %d | %s |' % (k, who, cellesc(step), cellesc(r_[0]), r_[1], r_[2]))
    for r_ in RE.get('kb1') or []: L.append('| kge-B1 | stage B | stage B | %s | %d | %s |' % (cellesc(r_[0]), r_[1], r_[2]))
    for r_ in RE.get('extra') or []: L.append('| (an earlier record of a repeated step) | | | %s | %d | %s |' % (cellesc(r_[0]), r_[1], r_[2]))
    L += ['', '**Ruling 94(f), export/:** export/ stays mounted only where a step reads graphs, under ruling 89\\'s per-use rule '
          '(section 1): %s; stage B\\'s kge-B1 mounted it as well (its record above). Every other container of the lists mounts no export/ folder.'
          % ('; '.join(RE.get('export') or []) or 'no container of the lists'), '']
    return L`);

// main: compute, refuse in real mode, pass on
rep(`    AU = audit_md(a, D, files, None, codes, dict(eval_walk=ew, freeze=fz, assemble=ac, tasks=trows), is_test, marks)`,
`    # ---- section 9: rehearsals and mount records (ruling 86(b); ruling 94(e), (f))
    reh = rehearsal_evidence(a.get('evidence') if is_test and a.get('evidence') else ROOT)
    if reh['problems'] and not is_test: refuse('REHEARSAL_EVIDENCE', '; '.join(reh['problems'][:6]))
    AU = audit_md(a, D, files, None, codes, dict(eval_walk=ew, freeze=fz, assemble=ac, tasks=trows, rehearsal=reh), is_test, marks)`);
fs.writeFileSync(p, s);
console.log('patched', p);
