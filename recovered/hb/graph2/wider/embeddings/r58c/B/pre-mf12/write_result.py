"""write_result.py: RESULT.md (under 150 lines) and result.json (aggregates only, no per-task row) of the embeddings
lane (addendum 8; ruling 62's wording), from the files the other scripts wrote. It computes nothing new: every number
is copied from an input, and every input is cited with its sha256 (result.json also carries write_result.py's own).

Inputs. The REAL run takes no path at all (rulings 80, 84; MF-12): `python write_result.py` (a draft to
train/report/result-draft/) or `python write_result.py --final` (the deliverable folder in the repository). Any other
option, an EMB_ROOT that is not the lane folder or a set FIXFLOW_REPO is refused (exit 2). Its fixed inputs:
  tune      train/report/tune.json                      report.py (test false, plan_hash, stamp: rulings 82, 83)
  item22    train/report/item22.json                    item22.py (test false, plan_hash, refs_sha256)
  answer    train/report/answer_level/answer_level.json answer_level.py tune (the tuning hand-off's sha256)
  tune_rank     grader-returns/tune-rank.json           the grader (orchestrator/grader-interface-v2.md section 6)
  answer_graded grader-returns/tune-item24.json         the grader
  heldout       grader-returns/heldout.json             the grader
  leak      train/leak_audit/leak_audit.json            leak_audit.py (ok, not a test, this plan)
  item27    train/heldout/item27.json                   item27.py (the frozen held-out choice)
  handoff   train/heldout/HANDOFF.json                  heldout.py
  plan      train/stageB/plan.json
  anchor    progress.jsonl (lane root)                  the coordinator's item27_freeze and preflight_e4_det lines
  ac_log    the log named by the last `PASS assemble-checks` line of train/RUNLOG.md (HD-12's e4_det1 line)
  protocol  the repository's protocol-addendum-8.md     (limits, items 28-31 and ruling texts copied word for word)
Without --final a missing grader return prints "not graded yet"; --final refuses unless all three exist (exit 11).
--test (plumbing tests and the interface rehearsal): every input is given explicitly (--tune, --item22, --answer,
--answer-graded, --tune-rank, --heldout, --leak, --item27, --handoff, --plan, --protocol, --anchor, --ac-log) and
--outdir is required; a test never writes the deliverable folder or anything under it (exit 8). Unknown options exit 2.

What is checked (grader-interface-v2.md section 8, key for key; MF-5, MF-12, MF-13):
  each grader return: split; test false in the real run (true under --test); handoff_sha256 equal to the hand-off the
    lane wrote (tuning: answer_level.json's and the file's own sha256; held-out: sha256(HANDOFF.json)); for held-out
    freeze_sha256 equal to sha256(item27.json), to HANDOFF.json's and (real run) to the coordinator's anchor line;
    tasks and commits (418 and 75 on held-out; the tuning hand-off's counts on tuning); the exact key sets (no
    missing and no extra variant, label, metric, scope or field); every number finite (never a bool), metrics and p
    in [0, 1], differences and interval bounds in [-1, 1]; the scorer block (three 64-hex sha256), the same block in
    every return. tune-rank.json is also compared with tune.json (late 50; per seed, seed mean, comparators; both
    scopes; four metrics) to 1e-9 (ruling 88b), and its truth block must show every task checked and equal.
    Exits: 12 held-out, 13 tuning item 24, 14 tuning rank.
  the real run also (exit 10): every input present; tune.json, item22.json, answer_level.json, item27.json and the
    leak audit not a test and of this plan_hash; tune.json's stamp (report_sha256, selectB_sha256, plan_hash,
    tables_digest) present and its tables_digest equal to item27.json's; item27.json's code list has report.py and
    the record carries pins and tuning_inputs (ruling 84); item22.json's refs_sha256 equal to train/stageA/refs.json;
    the frozen choice (arm, configuration, w, figure) equal to tune.json's final_all65 for that arm; sha256(item27.json)
    equal to the LAST item27_freeze anchor line; a preflight_e4_det line with an accepted status; the assemble-checks
    log with e4_det1 n of n, planned n; the limit texts found in the protocol.
Wording: ruling 62 (Holm rows "percentile intervals at Holm-adjusted levels", N3 weight / 3, the E5 single-area
reading, item 17 as distinct paths, distinct (checkpoint, path) pairs (ruling 76) and occurrences); item 31's "cannot
tell" wording; items 28-31 and rulings 35, 39, 44, 45, 46, 47, 67, 68 word for word (MF-14); a failed item-22
injection prints "injection FAILED"; E4's check carries ruling 74's sentence; E5 without a compared specialist is
FAILED; the E4 det and repeat-alone facts (rulings 67, 68, 87); held-out: item 7's stored figures with ruling 88g's
sentence, the vs_RRF differences (ruling 88d, no verdict word) and the grader's literal check (ruling 73).
usage: python write_result.py [--final]
       python write_result.py --test --tune P --outdir DIR [--item22 P] [--answer P] [--answer-graded P] [--tune-rank P]
                              [--heldout P] [--leak P] [--item27 P] [--handoff P] [--plan P] [--protocol P]
                              [--anchor P] [--ac-log P]
"""
import os, sys, json, hashlib, datetime, re, math
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)
LANE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # this file's lane folder (tests never patch it)
REPO_HOST = 'C:/Users/User/Documents/projects/EMS_workshop1'


def _repo():
    if os.environ.get('FIXFLOW_REPO'): return os.environ['FIXFLOW_REPO']
    return REPO_HOST if os.path.isdir(REPO_HOST) or not os.path.isdir('/repo') else '/repo'


REPO = _repo()
DELIVERABLE = os.path.join(REPO, 'docs', 'program', 'evidence', 'harness-bottlenecks', 'graph2', 'embeddings')
PROTOCOL = os.path.join(REPO, 'docs', 'program', 'evidence', 'harness-bottlenecks', 'graph2', 'protocol-addendum-8.md')
EMB = ('E1', 'E2', 'E3', 'E4', 'E5'); ARMS6 = EMB + ('PLACEBO',); KINDS = ('alone', 'fused')
MAX_LINES = 149
LIMIT_ITEMS = (28, 29, 30, 31)
LIMIT_RULINGS = (35, 39, 44, 45, 46, 47, 67, 68)
METRICS = ('P@10', 'R@10', 'R@20', 'MRR'); SCOPES = ('pool', 'unrestricted'); COMPS = ('RRF', 'PPR', 'CO', 'DIR')
ITEM7 = ('Stored arms of item 7, shown as they are (8,000-token answer recall, 75 commits; nothing of theirs is rerun): '
         'typed graph 0.700, scripted search 0.625, changed-together floor 0.638, same-folder floor 0.549.')
R88G = ('The embedding lists rank code files only and were packed by an adapter, so item 7\'s figures are context and not a '
        'like-for-like comparison; the like-for-like comparison is with RRF, PPR, CO and DIR packed the same way (ruling 88g).')
CT = 'cannot tell (no evidence either way at this size)'
OPTS = ('tune', 'item22', 'answer', 'answer-graded', 'tune-rank', 'heldout', 'leak', 'item27', 'handoff', 'plan', 'protocol',
        'anchor', 'ac-log', 'outdir')
HEX = re.compile(r'^[0-9a-f]{64}$')
# grader-interface-v2.md section 6: the exact key sets of the three returns
TUNE_RANK_KEYS = {'split', 'test', 'handoff_sha256', 'tasks', 'commits', 'rank', 'truth', 'scorer'}
ITEM24_KEYS = {'split', 'test', 'handoff_sha256', 'tasks', 'commits', 'labels', 'scorer'}
HELDOUT_KEYS = {'split', 'arm', 'test', 'freeze_sha256', 'handoff_sha256', 'commits', 'tasks', 'rank', 'answer_level', 'scorer',
                'vs_RRF', 'literal_check'}
SCORER_KEYS = {'files_sha256', 'evalcore_sha256', 'score_js_sha256'}
LABELS16 = ['%s_%s_mean' % (a, k) for a in ARMS6 for k in KINDS] + list(COMPS)
TUNE_ROWS = ['%s_%s_s%d' % (a, k, s) for a in ARMS6 for k in KINDS for s in (1, 2, 3)] + ['%s_%s_mean' % (a, k) for a in ARMS6 for k in KINDS] + list(COMPS)
HO_TASKS, HO_COMMITS = 418, 75
# ruling 91: the hand-off's count of tasks absent from a table, per variant ({variant label: n}); shown beside that
# variant's figures. SLOT: agent A names the key (answer_level.py and heldout.py write it); 'absent_tasks' until then.
ABSENT_KEY = 'absent_tasks'


def absent_counts(path):
    """Ruling 91: {variant label: tasks absent} from a hand-off file (None when the file or the key is absent)."""
    H = load(path) if path else None
    v = (H or {}).get(ABSENT_KEY)
    return v if isinstance(v, dict) else None


def absent_cell(AB, names):
    """The ruling-91 cell of a table row: per name, its counts (per seed s1/s2/s3 when the hand-off lists seeds)."""
    if AB is None: return 'n/a'
    out = []
    for n in names:
        ks = sorted(k for k in AB if k == n or k == n + '_mean' or re.match(re.escape(n) + r'_s\d+$', k))
        out.append('/'.join(str(AB[k]) for k in ks) if ks else '-')
    return ' ; '.join(out)


def word(w):
    """Item 31: 'cannot tell' is reported as 'no evidence either way at this size'."""
    return w.replace('cannot tell', CT, 1) if isinstance(w, str) and w.startswith('cannot tell') else w


def ruling_text(path, n):
    """The paragraph of protocol-addendum-8.md that starts '<n>. ', joined into one line (None when absent)."""
    if not path or not os.path.exists(path): return None
    out = None
    for l in open(path, encoding='utf-8'):
        if out is None:
            if re.match(r'^%d\. ' % n, l): out = [l.strip()]
        elif not l.strip() or re.match(r'^\d+\. ', l) or l.startswith('#'):
            break
        else:
            out.append(l.strip())
    return ' '.join(out) if out else None


def r74_sentence(path):
    t = ruling_text(path, 74) or ''
    m = re.search(r'It tests the scoring path[^.]*\.', t)
    return m.group(0) if m else None


def ho_variants(arm):
    return ['%s_%s_%s' % (arm, k, s) for k in KINDS for s in ('s1', 's2', 's3', 'mean')] + list(COMPS)


def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def f3(x): return 'n/a' if x is None else '%+.3f' % x


def u3(x): return 'n/a' if x is None else '%.3f' % x  # unsigned (a ratio): f3(None)[1:] printed '/a'


def iv(d): return '%s [%s, %s]' % (f3(d['diff']), f3(d['lo']), f3(d['hi']))


def load(p):
    return json.load(open(p)) if p and os.path.exists(p) else None


def isnum(x): return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def num(bad, where, x, lo=0.0, hi=1.0):
    if not isnum(x) or not lo <= x <= hi: bad.append('%s = %r is not a finite number in [%g, %g]' % (where, x, lo, hi))


def keys(bad, where, d, want):
    if not isinstance(d, dict): bad.append('%s is not an object' % where); return False
    got = set(d)
    if got != set(want):
        bad.append('%s keys: missing %s, extra %s' % (where, sorted(set(want) - got)[:4], sorted(got - set(want))[:4])); return False
    return True


def scorer_ok(bad, d):
    if keys(bad, 'scorer', d, SCORER_KEYS):
        for k in sorted(SCORER_KEYS):
            if not isinstance(d[k], str) or not HEX.match(d[k]): bad.append('scorer.%s is not a sha256' % k)


def common(bad, R, split, is_test, handoff_sha, tasks, commits):
    if R.get('split') != split: bad.append('split %r, want %r' % (R.get('split'), split))
    if R.get('test') is not bool(is_test): bad.append('test=%r, want %r' % (R.get('test'), bool(is_test)))
    if not handoff_sha or R.get('handoff_sha256') != handoff_sha:
        bad.append('handoff_sha256 %s is not the hand-off the lane wrote (%s)' % (str(R.get('handoff_sha256'))[:12], str(handoff_sha)[:12]))
    if R.get('tasks') != tasks or isinstance(R.get('tasks'), bool): bad.append('tasks %r, want %r' % (R.get('tasks'), tasks))
    if R.get('commits') != commits or isinstance(R.get('commits'), bool): bad.append('commits %r, want %r' % (R.get('commits'), commits))
    scorer_ok(bad, R.get('scorer'))


def metric_block(bad, where, d):
    if keys(bad, where, d, SCOPES):
        for sc in SCOPES:
            if keys(bad, '%s.%s' % (where, sc), d[sc], METRICS):
                for m in METRICS: num(bad, '%s.%s.%s' % (where, sc, m), d[sc][m])


def interval(bad, where, d, with_p):
    if keys(bad, where, d, ('diff', 'lo', 'hi', 'p') if with_p else ('diff', 'lo', 'hi')):
        for k in ('diff', 'lo', 'hi'): num(bad, '%s.%s' % (where, k), d[k], -1.0, 1.0)
        if with_p: num(bad, '%s.p' % where, d['p'])


def tune_handoff(AL, answer_path):
    """The tuning hand-off's sha256 as answer_level.json records it, checked against the file (None when they differ)."""
    if not AL: return None
    rec = (AL.get('item24') or {}).get('handoff_sha256'); rel = (AL.get('item24') or {}).get('handoff')
    p = os.path.join(os.path.dirname(os.path.abspath(answer_path)), rel) if rel and answer_path else None
    return rec if p and os.path.exists(p) and sha(p) == rec else None


def check_tune_rank(TR, AL, T, a, is_test):
    """grader-interface-v2 6/8 and ruling 88b: the tuning rank return, and its values against tune.json to 1e-9."""
    bad = []
    keys(bad, 'tune-rank.json', TR, TUNE_RANK_KEYS)
    common(bad, TR, 'tune', is_test, tune_handoff(AL, a.get('answer')), (AL or {}).get('tasks'), (AL or {}).get('commits'))
    rk = TR.get('rank')
    if keys(bad, 'rank', rk, TUNE_ROWS):
        for v in TUNE_ROWS: metric_block(bad, 'rank.%s' % v, rk[v])
    tr = TR.get('truth')
    if keys(bad, 'truth', tr, ('rule', 'tasks_checked', 'equal_to_lane')):
        if tr['rule'] != 'item 4' or tr['tasks_checked'] != TR.get('tasks') or tr['equal_to_lane'] != tr['tasks_checked']:
            bad.append('truth %s: every task must be checked and equal to the lane\'s (rule item 4)' % json.dumps(tr))
    if bad: return bad, None
    A = T.get('arms', {}).get('late50', {}); CM = T.get('comparators', {}).get('late50', {}); diff = 0.0; n = 0
    for v in TUNE_ROWS:
        for sc in SCOPES:
            for m in METRICS:
                if v in COMPS: lane = (CM.get(sc, {}).get(v) or {}).get(m)
                else:
                    base, s = v.rsplit('_', 1); d = A.get(sc, {}).get(base) or {}
                    lane = (d.get('seed_mean') or {}).get(m) if s == 'mean' else ((d.get('per_seed') or {}).get(s[1:]) or {}).get(m)
                if not isnum(lane): bad.append('tune.json has no %s %s %s' % (v, sc, m)); continue
                diff = max(diff, abs(lane - rk[v][sc][m])); n += 1
    if diff > 1e-9: bad.append('tune-rank.json differs from tune.json by up to %.3g (> 1e-9, ruling 88b)' % diff)
    return bad, dict(cells=n, max_abs_diff=diff)


def check_item24(AG, AL, a, is_test):
    """grader-interface-v2 6/8 and MF-12: the tuning item-24 return (16 labels, finite values, this hand-off)."""
    bad = []
    keys(bad, 'tune-item24.json', AG, ITEM24_KEYS)
    common(bad, AG, 'tune', is_test, tune_handoff(AL, a.get('answer')), (AL or {}).get('tasks'), (AL or {}).get('commits'))
    lb = AG.get('labels')
    if keys(bad, 'labels', lb, LABELS16):
        for l in LABELS16:
            want = ('mean',) + (() if l in COMPS else ('per_seed',)) + (() if l == 'RRF' else ('vs_RRF',))
            if not keys(bad, 'labels.%s' % l, lb[l], want): continue
            if keys(bad, 'labels.%s.mean' % l, lb[l]['mean'], ('primary',)): num(bad, 'labels.%s.mean.primary' % l, lb[l]['mean']['primary'])
            if 'per_seed' in want and keys(bad, 'labels.%s.per_seed' % l, lb[l]['per_seed'], ('s1', 's2', 's3')):
                for s in ('s1', 's2', 's3'): num(bad, 'labels.%s.per_seed.%s' % (l, s), lb[l]['per_seed'][s])
            if 'vs_RRF' in want and keys(bad, 'labels.%s.vs_RRF' % l, lb[l]['vs_RRF'], ('primary',)):
                interval(bad, 'labels.%s.vs_RRF.primary' % l, lb[l]['vs_RRF']['primary'], True)
    return bad


def anchor_line(path, unit):
    """The LAST progress.jsonl line with step coordinator and this unit (None when absent)."""
    out = None
    if path and os.path.exists(path):
        for l in open(path, encoding='utf-8', errors='replace'):
            try:
                o = json.loads(l)
            except ValueError:
                continue
            if isinstance(o, dict) and o.get('step') == 'coordinator' and o.get('unit') == unit: out = o
    return out


def check_heldout(HO, R27, a, is_test):
    """audit-result-2, ALH-2, AR2-6, grader-interface-v2 6/8: the grader's held-out return belongs to the frozen,
    anchored choice and is complete, exact and finite."""
    bad = []
    keys(bad, 'heldout.json', HO, HELDOUT_KEYS)
    fz = sha(a['item27']) if a.get('item27') and os.path.exists(a['item27']) else None
    if not fz or HO.get('freeze_sha256') != fz: bad.append('freeze_sha256 %s is not sha256(item27.json) %s' % (str(HO.get('freeze_sha256'))[:12], str(fz)[:12]))
    an = anchor_line(a.get('anchor'), 'item27_freeze')
    if an is not None and an.get('sha256') != fz: bad.append('the anchor line names %s, not sha256(item27.json)' % str(an.get('sha256'))[:12])
    if an is None and not is_test: bad.append('no item27_freeze anchor line in %s' % a.get('anchor'))
    hp = a.get('handoff'); H = load(hp)
    if H is None: bad.append('HANDOFF.json %s missing' % hp); H = {}; hsha = None
    else:
        hsha = sha(hp)
        if H.get('freeze_sha256') != HO.get('freeze_sha256'): bad.append('HANDOFF.json freeze_sha256 differs')
        if bool(H.get('test')) != bool(is_test): bad.append('HANDOFF.json test=%s' % H.get('test'))
    tasks, commits = (HO_TASKS, HO_COMMITS) if not is_test else (H.get('tasks'), H.get('commits', HO.get('commits')))
    if not is_test and H.get('tasks') != HO_TASKS: bad.append('HANDOFF.json tasks %r, want %d' % (H.get('tasks'), HO_TASKS))
    common(bad, HO, 'heldout', is_test, hsha, tasks, commits)
    arm = (R27 or {}).get('chosen', {}).get('arm')
    if HO.get('arm') != arm: bad.append('aggregates arm %s, frozen arm %s' % (HO.get('arm'), arm))
    vs = ho_variants(arm or '?')
    if keys(bad, 'rank', HO.get('rank'), vs):
        for v in vs: metric_block(bad, 'rank.%s' % v, HO['rank'][v])
    if keys(bad, 'answer_level', HO.get('answer_level'), vs):
        for v in vs: num(bad, 'answer_level.%s' % v, HO['answer_level'][v])
    rows = ['%s_fused_mean' % arm, '%s_alone_mean' % arm]
    if keys(bad, 'vs_RRF', HO.get('vs_RRF'), rows):
        for r in rows:
            if keys(bad, 'vs_RRF.%s' % r, HO['vs_RRF'][r], ('pool_P@10', 'unrestricted_P@10', 'answer_level')):
                for k in ('pool_P@10', 'unrestricted_P@10', 'answer_level'): interval(bad, 'vs_RRF.%s.%s' % (r, k), HO['vs_RRF'][r][k], False)
    lc = HO.get('literal_check')
    if keys(bad, 'literal_check', lc, ('tasks', 'task_commit_in_checkpoint_history', 'parent_mismatch')):
        if lc != dict(tasks=tasks, task_commit_in_checkpoint_history=0, parent_mismatch=0):
            bad.append('literal_check %s (ruling 73: every task checked, no task commit in its checkpoint\'s history, no parent mismatch)' % json.dumps(lc))
    return bad


def ac_e4(path):
    """HD-12: the e4_det1 line of an assemble_checks log -> (n, m, p) or None."""
    if not path or not os.path.exists(path): return None
    hit = None
    for l in open(path, encoding='utf-8', errors='replace'):
        m = re.match(r'^e4_det1 (\d+) of (\d+) e4_parts, planned (\d+)$', l.strip())
        if m: hit = tuple(int(x) for x in m.groups())
    return hit


def runlog_ac_log(root):
    """The log named by the last `PASS assemble-checks <log> ...` line of train/RUNLOG.md (relative to the lane root)."""
    rl = os.path.join(root, 'train', 'RUNLOG.md'); out = None
    if os.path.exists(rl):
        for l in open(rl, encoding='utf-8', errors='replace'):
            m = re.match(r'\s*PASS\s+assemble-checks\s+(\S+)', l)
            if m: out = os.path.join(root, m.group(1))
    return out


def real_input_problems(a, T, I22, AL, LK, R27, plan, prog):
    """The real run's refusals (exit 10): presence, test flags, plan hashes, stamps, pins, anchor, final_all65 (MF-5,
    MF-6, MF-12, MF-13; audit-result-3, -10)."""
    bad = []
    ph = (plan or {}).get('plan_hash')
    if plan is None: bad.append('plan.json %s is missing' % a['plan'])
    for name, d in (('tune.json', T), ('item22.json', I22), ('answer_level.json', AL), ('item27.json', R27), ('the leak audit', LK)):
        if d is None: bad.append('%s is missing' % name); continue
        if d.get('test') is not False: bad.append('%s test=%r (a test input, or no test field)' % (name, d.get('test')))
        if d.get('plan_hash') != ph or not ph: bad.append('%s plan_hash %s is not plan.json\'s %s' % (name, str(d.get('plan_hash'))[:12], str(ph)[:12]))
    if LK is not None and LK.get('ok') is not True: bad.append('the leak audit says ok=%s' % LK.get('ok'))
    st = (T or {}).get('stamp') or {}
    miss = [k for k in ('report_sha256', 'selectB_sha256', 'plan_hash', 'tables_digest') if not st.get(k)]
    if T is not None and miss: bad.append('tune.json stamp lacks %s (ruling 83)' % miss)
    if R27 is not None:
        if not R27.get('tables_digest') or R27.get('tables_digest') != st.get('tables_digest'):
            bad.append('item27.json tables_digest %s differs from tune.json\'s %s (ruling 82)' % (str(R27.get('tables_digest'))[:12], str(st.get('tables_digest'))[:12]))
        if not (R27.get('code_sha256') or {}).get('train/report.py'): bad.append('item27.json code list lacks train/report.py (ruling 83)')
        if not R27.get('pins') or not R27.get('tuning_inputs'): bad.append('item27.json lacks pins or tuning_inputs (ruling 84)')
        an = anchor_line(prog, 'item27_freeze')
        if an is None or an.get('file') != 'train/heldout/item27.json' or an.get('sha256') != sha(a['item27']):
            bad.append('sha256(item27.json) is not the last item27_freeze anchor line (%s; ruling 80)' % (str((an or {}).get('sha256'))[:12]))
        ch = R27.get('chosen') or {}; f = ((T or {}).get('choices', {}).get(ch.get('arm')) or {}).get('final_all65') or {}
        if not ((f.get('config_id'), float(f.get('w', -1))) == (ch.get('config_id'), float(ch.get('w', -2)))
                and isnum(f.get('mean')) and isnum(ch.get('figure_all65')) and abs(f['mean'] - ch['figure_all65']) < 1e-12):
            bad.append('item27 chosen %s differs from tune.json final_all65 %s' % ((ch.get('arm'), ch.get('config_id'), ch.get('w')), (f.get('config_id'), f.get('w'))))
    if AL is not None:
        hp = os.path.join(os.path.dirname(os.path.abspath(a['answer'])), (AL.get('item24') or {}).get('handoff') or '') if a.get('answer') else None
        if absent_counts(hp) is None: bad.append('the tuning hand-off %s has no %s (ruling 91)' % (hp, ABSENT_KEY))
    if a.get('handoff') and os.path.exists(a['handoff']) and absent_counts(a['handoff']) is None:
        bad.append('the held-out HANDOFF.json has no %s (ruling 91)' % ABSENT_KEY)
    if I22 is not None:
        rp = os.path.join(HERE, 'stageA', 'refs.json')
        if not I22.get('refs_sha256') or not os.path.exists(rp) or I22['refs_sha256'] != sha(rp): bad.append('item22.json refs_sha256 is not train/stageA/refs.json\'s')
    pf = anchor_line(prog, 'preflight_e4_det')
    if pf is None or not str(pf.get('status', '')).startswith('accepted'): bad.append('no accepted preflight_e4_det line in progress.jsonl (ruling 87)')
    e4 = ac_e4(a.get('ac_log'))
    if not e4 or not (e4[0] == e4[1] == e4[2]): bad.append('the assemble-checks log %s shows no e4_det1 n of n, planned n (HD-12)' % a.get('ac_log'))
    miss = [n for n in LIMIT_ITEMS + LIMIT_RULINGS if not ruling_text(a.get('protocol'), n)] + ([] if r74_sentence(a.get('protocol')) else [74])
    if miss: bad.append('text of item/ruling %s not found in %s' % (miss, a.get('protocol')))
    return bad


def build(a):
    T = load(a['tune']); I22 = load(a.get('item22')); AL = load(a.get('answer')); LK = load(a.get('leak')); R27 = load(a.get('item27'))
    HO = load(a.get('heldout')); plan = load(a.get('plan')); AG = load(a.get('answer_graded')); TR = load(a.get('tune_rank'))
    if T is None: raise SystemExit('write_result: the tune report %s is missing' % a['tune'])
    L = []; J = dict(written=datetime.datetime.utcnow().isoformat() + 'Z', inputs={}, test=bool(a['test']), final=bool(a.get('final')),
                     write_result_sha256=sha(os.path.abspath(__file__)))
    for k in ('tune', 'item22', 'answer', 'answer_graded', 'tune_rank', 'leak', 'item27', 'heldout', 'handoff', 'plan', 'protocol', 'anchor', 'ac_log'):
        p = a.get(k)
        if p and os.path.exists(p): J['inputs'][k] = dict(file=os.path.basename(p), sha256=sha(p))
    L += ['# Embedding arms on the code graph: result (addendum 8)', '',
          'Five knowledge-graph-embedding arms (E1 RotatE, E2 ComplEx-N3, E3 TransE, E4 CompGCN, E5 routed RotatE specialists)',
          'fused with PPR and CO by weighted RRF, against RRF of PPR and CO, on the late 50 tuning commits (pool P@10;',
          'item 23 aggregation, paired bootstrap by commit, 10,000 resamples, 95 % percentile intervals).' + (' TEST OUTPUT.' if a['test'] else ''), '']
    # ---- verdicts
    c = T['contrasts']['late50']; hol = T.get('holm', {}).get('late50', {})
    cps = T['contrasts'].get('late50_pilot_shared', {})
    L += ['## Verdicts (section G, late 50, primary = fused minus RRF, pool P@10)', '',
          '| arm | fused - RRF, pool P@10 | word | percentile interval at Holm-adjusted level | alone - RRF | word | fused, unrestricted | word '
          '| builder reading (53), sensitivity, no word | pilot-shared commits (56), sensitivity, no word |',
          '|---|---|---|---|---|---|---|---|---|---|']
    J['verdicts'] = {}
    for arm in ARMS6:
        if '%s_fused' % arm not in c['pool']: continue
        fp = c['pool']['%s_fused' % arm]; ap = c['pool']['%s_alone' % arm]; fu = c['unrestricted']['%s_fused' % arm]
        h = hol.get('pool', {}).get('fused', {}).get('P@10', {}).get(arm)
        hs = ('[%s, %s] at %.4f' % (f3(h['lo']), f3(h['hi']), h['level'])) if h else 'n/a (not an embedding arm)'
        sb = c['pool'].get('%s_fused_builder' % arm); sp = cps.get('pool', {}).get('%s_fused' % arm)
        L.append('| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (arm, iv(fp['vs_RRF']['P@10']), word(fp['verdict_P10']), hs, iv(ap['vs_RRF']['P@10']),
                                                                        word(ap['verdict_P10']), iv(fu['vs_RRF']['P@10']), word(fu['verdict_P10']),
                                                                        iv(sb['vs_RRF']['P@10']) if sb else 'n/a', iv(sp['vs_RRF']['P@10']) if sp else 'n/a'))
        J['verdicts'][arm] = dict(fused_pool_P10=fp['vs_RRF']['P@10'], fused_pool_word=fp['verdict_P10'], holm_fused_pool_P10=h,
                                  alone_pool_P10=ap['vs_RRF']['P@10'], alone_pool_word=ap['verdict_P10'],
                                  fused_unrestricted_P10=fu['vs_RRF']['P@10'], fused_unrestricted_word=fu['verdict_P10'])
    L += ['', 'Words from the unadjusted interval ("adds": above zero and >= +0.02; "matches": inside +-0.02); the Holm column gives '
          'percentile intervals at Holm-adjusted levels over the five arms, beside the unadjusted ones (item 26).', '']
    hc = T.get('harness_check', {})
    L += ['Placebo (harness check, ruling 54; harness_check.ok = %s): primary word "%s"; fixed-w pool P@10 minus RRF: %s.' % (
        hc.get('ok'), word(hc.get('placebo_primary_late50')), ', '.join('%s %s' % (k, iv(dict(zip(('diff', 'lo', 'hi'), v[:3])) if isinstance(v, list) else v))
                                                   for k, v in sorted(hc.get('placebo_fixed_w_late50_pool_P10_vs_RRF', {}).items()))), '']
    J['placebo'] = hc
    # ---- every metric on both scopes (audit-result-8)
    A = T.get('arms', {}).get('late50', {}); CM = T.get('comparators', {}).get('late50', {})
    m2 = lambda d: '%.3f' % d if isinstance(d, (int, float)) else 'n/a'
    L += ['## All metrics, late 50 (item 23; seed means; arm cells: alone / fused)', '',
          '| list | ' + ' | '.join('%s %s' % (sc[:5], m) for sc in SCOPES for m in METRICS) + ' |', '|---' * 9 + '|']
    for arm in ARMS6:
        if '%s_fused' % arm not in A.get('pool', {}): continue
        L.append('| %s | %s |' % (arm, ' | '.join('%s / %s' % (m2(A[sc]['%s_alone' % arm]['seed_mean'][m]), m2(A[sc]['%s_fused' % arm]['seed_mean'][m]))
                                                  for sc in SCOPES for m in METRICS)))
    for n in COMPS + ('RANDOM',):
        if n in CM.get('pool', {}):
            L.append('| %s | %s |' % (n, ' | '.join(m2(CM[sc][n].get(m)) for sc in SCOPES for m in METRICS)))
    trc = ''
    if a.get('tune_rank_check'):
        trc = (' Grader\'s tuning rank check (ruling 88b): %d cells of tune-rank.json (per seed, seed mean, comparators; both scopes; four '
                 'metrics) equal tune.json within 1e-9 (largest difference %.1e).' % (a['tune_rank_check']['cells'], a['tune_rank_check']['max_abs_diff']))
        J['tune_rank_check'] = a['tune_rank_check']
    L += ['', 'Every arm-minus-RRF interval for every metric and scope, the sensitivity rows (53, 56) and the comparators are in result.json.' + trc, '']
    J['tune_full'] = dict(comparators=T.get('comparators'), seed_means={st: {sc: {v: r.get('seed_mean') for v, r in d.items()} for sc, d in x.items()}
                                                                         for st, x in T.get('arms', {}).items()},
                          vs_RRF={st: {sc: {v: r.get('vs_RRF') for v, r in d.items()} for sc, d in x.items()} for st, x in T['contrasts'].items()},
                          harness_check_ok=hc.get('ok'), notes=T.get('notes'))
    # ---- seeds (item 25)
    L += ['## Seeds alone (item 25): fused minus RRF, pool P@10, per seed', '']
    J['per_seed'] = {}
    for arm in ARMS6:
        r = c['pool'].get('%s_fused' % arm)
        if not r: continue
        ps = r['per_seed_P10_vs_RRF']; J['per_seed'][arm] = ps
        L.append('- %s: %s' % (arm, '; '.join('s%s %s' % (s, iv(ps[s])) for s in sorted(ps))))
    L.append('')
    # ---- answer level
    L += ['## Answer level (item 24; tuning split, late 50)', '']
    if AL:
        I24 = AL['item24']; LFR = AL['lane_file_recall']
        L.append('Item 24 is scored by the grader with its full references (files and definitions), as on held-out (ruling 71). The lane '
                 'handed over ranked lists and packs (shared packer, frozen typed primary options %s: %s form, %s granularity, pad %s; '
                 '8,000 tokens): %s, %d tasks, %d commits, %d ranked lists.' % (AL['options']['record'], AL['options']['form'],
                 AL['options']['granularity'], AL['options']['pad'], I24['handoff'], AL['tasks'], AL['commits'], AL['variants']))
        J['item24'] = dict(measure=I24['measure'], handoff=I24['handoff'], handoff_sha256=I24['handoff_sha256'])
        base = lambda n: n[:-5] if n.endswith('_mean') else n  # grader-interface-v2: <ARM>_<KIND>_mean
        GL = {base(k): v for k, v in AG['labels'].items()} if AG and isinstance(AG.get('labels'), dict) else None
        LL = {base(k): v for k, v in LFR['labels'].items()}
        if GL is None:
            L.append('Item 24 (grader): not graded yet.')
        head = LFR['label'][0].upper() + LFR['label'][1:]
        if GL is not None: head = 'Item 24 (grader, %s), with the lane\'s figure beside it under its own label: %s' % (os.path.basename(a['answer_graded']), LFR['label'])
        L += ['', '### ' + head, '',
              'Computed by the lane against git\'s files only (%s); a separate figure, not item 24. Arm cells: alone / fused. Tasks absent from'
              ' a table (ruling 91): none for a fused variant and for RRF, PPR and DIR; for CO and an arm alone only a task the method scored'
              ' no candidate for, ranked by the fixed tie-break alone; counts per seed (s1/s2/s3) from the hand-off\'s %s.' % (LFR['refs'], ABSENT_KEY), '']
        hdr = '| ranked list | ' + ('item 24 (grader) | minus RRF [95 %] | ' if GL is not None else '') + \
              'file recall within 8,000 tokens, lane-computed | minus RRF [95 %] | tasks absent (ruling 91) |'
        L += [hdr, '|---|---|---|---|' + ('---|---|' if GL is not None else '')]
        ABT = absent_counts(os.path.join(os.path.dirname(os.path.abspath(a['answer'])), I24['handoff']) if I24.get('handoff') else None)
        J['item24']['absent_tasks'] = ABT
        J['lane_file_recall'] = dict(label=LFR['label'], labels={})
        if GL is not None: J['item24']['labels'] = {}
        for lab in sorted(LL):
            d = LL[lab]; vs = d.get('vs_RRF', {}).get('primary')
            J['lane_file_recall']['labels'][lab] = dict(file_recall=d['mean']['primary'], vs_RRF=vs, per_seed=d.get('per_seed_primary'))
        for lab in sorted(GL or {}):
            d = GL[lab]; J['item24']['labels'][lab] = dict(primary=d['mean']['primary'], vs_RRF=(d.get('vs_RRF') or {}).get('primary'), per_seed=d.get('per_seed'))

        def cells(src, names):
            got = [src.get(n) for n in names]
            if not any(got): return None
            m = ' / '.join('n/a' if g is None else '%.3f' % g['mean']['primary'] for g in got)
            vv = []
            for g in got:
                vs = None if g is None else (g.get('vs_RRF') or {}).get('primary')
                vv.append('reference' if g is not None and vs is None else ('n/a' if vs is None else iv(vs)))
            return m, ' / '.join(vv)
        rows = [(arm, ['%s_alone' % arm, '%s_fused' % arm]) for arm in ARMS6] + [(cc, [cc]) for cc in COMPS]
        known = {n for _, ns in rows for n in ns}
        rows += [(n, [n]) for n in sorted(set(LL) | set(GL or {})) if n not in known]  # nothing is dropped
        for name, ns in rows:
            lc = cells(LL, ns); gc = cells(GL, ns) if GL is not None else None
            if lc is None and gc is None: continue
            L.append('| %s | ' % name + ('%s | %s | ' % (gc or ('n/a', 'n/a')) if GL is not None else '') + '%s | %s |' % (lc or ('n/a', 'n/a'))
                     + ' %s |' % absent_cell(ABT, ns))
    else:
        L.append('Not available (%s missing).' % a.get('answer'))
    L.append('')
    # ---- item 22
    L += ['## Item 22 (ruling 61): before an arm is called weak', '']
    if I22:
        sa = I22['stage_a']
        L.append('Stage-A held-out triples (%d queries at %s): PPR MRR %.3f, CO MRR %.3f (all entities).' % (
            sa['held_out']['queries'], sa['held_out']['sha'][:8], sa['PPR']['mrr_all_entities'], sa['CO']['mrr_all_entities']))
        L += ['', '| arm | config: stage-A MRR (loss ratio as run / to the selection epoch) | stage-B loss ratio median (units) | predict_target check |', '|---|---|---|---|']
        J['item22'] = dict(PPR=sa['PPR'], CO=sa['CO'], arms={})
        for arm in EMB:
            rows = sa['arms'].get(arm, [])
            cfgs = '; '.join('%s %.3f (%s / %s)' % (r['config_id'], r['mrr_all_entities'], u3(r['loss_ratio_as_run']), u3(r['loss_ratio_to_selection_epoch'])) for r in rows)
            sb = I22.get('stage_b_loss_ratio', {}).get(arm, {})
            sbs = '; '.join('%s %s (%d)' % (k, u3(v['median']), v['units']) for k, v in sorted(sb.items()))
            ck = I22.get('check_predict_target', {}).get(arm)
            if ck and arm == 'E5':
                sp = ck.get('specialists') or {}
                cks = 'per specialist: ' + ', '.join('%s %s' % (A_, ('injection FAILED' if v.get('injected_reps_equal_kept') is False else
                                                                    '%s/%s identical' % (v.get('full_order_identical', '-'), v.get('queries', '-'))))
                                                     for A_, v in sorted(sp.items()))
                if not ck.get('injected_reps_equal_kept') or not ck.get('specialists_compared'):
                    cks = 'FAILED (%s specialist(s) compared); ' % ck.get('specialists_compared', 0) + cks
            elif ck and ck.get('injected_reps_equal_kept') is False:
                cks = '%s: injection FAILED (the kept representations could not be written back; no comparison)' % ck['config_id']
            elif ck:
                cks = '%s: %s/%s orders identical, max abs diff %s%s' % (ck['config_id'], ck.get('full_order_identical'), ck.get('queries'),
                                                                     '%.1e' % ck['max_abs_score_diff'] if isnum(ck.get('max_abs_score_diff')) else 'n/a',
                                                                     ' (fresh model, ruling 74)' if arm == 'E4' else '')
            else:
                cks = 'not run'
            L.append('| %s | %s | %s | %s |' % (arm, cfgs, sbs or 'n/a', cks))
            J['item22']['arms'][arm] = dict(stage_a=rows, stage_b_loss_ratio=sb, check={k: v for k, v in (ck or {}).items() if k != 'cfg'})
        L += ['', 'The loss ratio is a reported number, not a pass mark (ruling 36 stops at the validation peak). E4 (ruling 74): %s The reciprocal '
              'relation is item22.py\'s description of each model, not a check.' % (r74_sentence(a.get('protocol')) or 'RULING 74 TEXT NOT FOUND')]
    else:
        L.append('Not available (%s missing).' % a.get('item22'))
    L.append('')
    # ---- item 17 counts
    L += ['## Item 17 counts for the chosen configuration (ruling 62)', '']
    cn = T.get('counts', {}); J['counts'] = {}
    for arm in EMB:
        if arm not in cn: continue
        x = cn[arm]['late50_block_choices']['pool']; o = x['occurrences']; dd = x['distinct']; dc = x.get('distinct_checkpoint_entities') or {}
        L.append('- %s (pool, late 50, block choices, seed 1; seeds equal: %s; recomputed: %s): %d tasks; %d with an unscored seed (%d candidate'
                 ' occurrences, %d distinct candidates, %d distinct (checkpoint, path) pairs); scored seeds: %d of %d candidate occurrences unscored'
                 ' (%d distinct, %d (checkpoint, path) pairs), absent at C %d, not in a routed specialist %d; tasks on a checkpoint without'
                 ' co_changed %d; folded %d.' % (
                     arm, x['same_across_seeds'], x['recompute_matches_counts'], o.get('tasks', 0), o.get('tasks_with_unscored_seed', 0),
                     o.get('cands_of_unscored_seeds', 0), dd.get('cands_of_unscored_seeds', 0), dc.get('cands_of_unscored_seeds', 0),
                     o.get('scored_seed_cands_unscored', 0), o.get('scored_seed_cands', 0), dd.get('absent_at_C', 0) + dd.get('not_in_routed_specialists', 0),
                     dc.get('absent_at_C', 0) + dc.get('not_in_routed_specialists', 0),
                     o.get('scored_seed_cands_unscored_absent_at_C', 0), o.get('scored_seed_cands_unscored_not_in_routed_specialists', 0),
                     o.get('tasks_on_checkpoint_without_co_changed', 0), o.get('cands_folded', 0) + o.get('seeds_folded', 0)))
        J['counts'][arm] = dict(late50_pool=dict(occurrences=o, distinct=dd, distinct_checkpoint_entities=dc), all65=cn[arm]['all65_final_choice']['config_id'])
    L.append('')
    # ---- held-out
    L += ['## Held-out (item 27; spent, descriptive only, no section-G word)', '']
    if R27:
        ch = R27['chosen']
        L.append('Frozen before any held-out unit (%s): %s %s, w %g, %d epochs, s %d, device %s; all-65 figure %.4f; tie group %s.' % (
            R27['frozen_at'][:19], ch['arm'], ch['config_id'], ch['w'], ch['epochs'], R27['s'], R27['device'], ch['figure_all65'],
            ', '.join(R27['tie_group_4dp'])))
        J['item27'] = dict(chosen={k: v for k, v in ch.items()}, s=R27['s'], device=R27['device'], test=R27.get('test'),
                           tables_digest=R27.get('tables_digest'))
    else:
        L.append('No frozen record (%s).' % a.get('item27'))
    L += [ITEM7, R88G]
    if HO:
        arm = R27['chosen']['arm']
        L += ['Grader aggregates (%s; %s commits, %s tasks; item 23 aggregation; descriptive only):' % (os.path.basename(a['heldout']), HO.get('commits'), HO.get('tasks')), '',
              '| variant | ' + ' | '.join('%s %s' % (sc[:5], m) for sc in SCOPES for m in METRICS) + ' | answer level (item 24) | tasks absent (ruling 91) |', '|---' * 11 + '|']
        ABH = absent_counts(a.get('handoff'))
        J['heldout'] = dict(freeze_sha256=HO['freeze_sha256'], handoff_sha256=HO['handoff_sha256'], commits=HO.get('commits'), tasks=HO.get('tasks'),
                            rank={}, answer_level={}, vs_RRF=HO['vs_RRF'], literal_check=HO['literal_check'], scorer=HO['scorer'])
        for v in ho_variants(arm):
            L.append('| %s | %s | %.3f | %s |' % (v, ' | '.join('%.3f' % HO['rank'][v][sc][m] for sc in SCOPES for m in METRICS), HO['answer_level'][v],
                                                  absent_cell(ABH, [v])))
            J['heldout']['rank'][v] = HO['rank'][v]; J['heldout']['answer_level'][v] = HO['answer_level'][v]
        L.append('')
        for r in ('%s_fused_mean' % arm, '%s_alone_mean' % arm):
            d = HO['vs_RRF'][r]
            L.append('- %s minus RRF (seed mean; by commit, 10,000 resamples, 95 %% percentile interval; ruling 88d, description only): pool P@10 %s;'
                     ' unrestricted P@10 %s; answer level %s.' % (r[:-5], iv(d['pool_P@10']), iv(d['unrestricted_P@10']), iv(d['answer_level'])))
        lc = HO['literal_check']
        L.append('Checked: the aggregates carry sha256(item27.json) and HANDOFF.json\'s hash; arm %s is the frozen arm; the grader\'s literal check '
                 '(ruling 73): %d tasks, task commit in the checkpoint\'s history %d, parent mismatch %d.' % (
                     arm, lc['tasks'], lc['task_commit_in_checkpoint_history'], lc['parent_mismatch']))
    else:
        L.append('Not graded yet: the held-out ranked lists and packs go to the grader (truth stays there).')
    L.append('')
    # ---- lag, leak audit
    lag = T.get('lag', {})
    L += ['## Lag and leak audit', '',
          '- Stride s = %s; lag (ruling 52) over late-50 tasks %s, over all tune tasks %s.' % (lag.get('stride'), lag.get('late50_tasks'), lag.get('all_tune_tasks'))]
    J['lag'] = lag
    if LK:
        L.append('- Leak audit (ruling 60): %s; checkpoints and tasks per split %s; failures %d; container mounts listed %d (table in AUDIT.md,'
                 ' with ruling 35\'s disclosure).' % ('PASS' if LK.get('ok') else 'FAIL', json.dumps({k: [v['checkpoints'], v['tasks']] for k, v in LK.get('splits', {}).items()}), len(LK.get('failures', [])), len(LK.get('mounts', []))))
        J['leak_audit'] = dict(ok=LK.get('ok'), checkpoints_tasks={k: [v['checkpoints'], v['tasks']] for k, v in LK.get('splits', {}).items()},
                               failures=len(LK.get('failures', [])), parts_rows=LK.get('c4_parts'))
    L.append('')
    # ---- readings
    n3 = []
    if plan:
        for cc in plan['configs'].get('E2', []):
            w = cc['cfg'].get('n3_weight')
            if w is not None: n3.append('%s %g / 3 = %.4g' % (cc['config_id'], w, w / 3))
    e4 = ac_e4(a.get('ac_log')); pf = anchor_line(a.get('anchor'), 'preflight_e4_det')
    e4s = ('every planned stage-B E4 part ran with det=1 (assemble_checks: %d of %d, planned %d)' % e4) if e4 else 'the assemble-checks e4_det1 line is not available'
    pfs = ('c13 and c16 trained twice alone on the card and repeated byte for byte (progress.jsonl preflight_e4_det: %s)' % pf.get('status')) if pf else \
        'the ruling-87 pre-flight result is not available (no preflight_e4_det line)'
    J['e4_det'] = dict(assemble_checks=e4, preflight_e4_det=pf)
    L += ['## Readings recorded', '',
          '- N3 weights in the paper\'s convention (weight / 3; the authors\' code read, kge.py docstring): ' + ('; '.join(n3) or 'n/a') + '.',
          '- E5 router (item 13): when every 1-hop neighbour of the seed is in the seed\'s own area, the seed is routed to that one specialist only;'
          ' this single-area case is the reading of item 13 (kge.route, report.py _route).',
          '- Item 17 counts are for the chosen configuration (per late-50 block; all 65 for the final choice), seed 1, as distinct paths, as distinct'
          ' (checkpoint, path) pairs (ruling 76) and as task-candidate occurrences; candidates of unscored seeds, tasks on checkpoints without'
          ' co_changed and the two ruling-55 cases among scored seeds are separate figures.',
          '- E4 (rulings 67, 87): %s; %s; c12 was measured to repeat alone in ruling 67, so E4 is deterministic everywhere. Ruling 68: E5 is'
          ' held to identical score tables and counts (not bit-reproducible on the card); no other setting was found not to repeat alone.' % (e4s, pfs), '']
    L += ['## Limits (section I, and the rulings reported as limits)', '']
    J['limits'] = {}
    for n in LIMIT_ITEMS:
        t = ruling_text(a.get('protocol'), n); J['limits']['item%d' % n] = t
        L.append('- Item %s' % (word_lim(t) if t else '%d: TEXT NOT FOUND in %s' % (n, a.get('protocol'))))
    for n in LIMIT_RULINGS:
        t = ruling_text(a.get('protocol'), n)
        J['limits'][str(n)] = t
        L.append('- Ruling %s' % (t if t else '%d: TEXT NOT FOUND in %s' % (n, a.get('protocol'))))
    L += ['', '## Sources', '', '; '.join('%s `%s` %s' % (k, v['file'], v['sha256'][:12]) for k, v in sorted(J['inputs'].items()))
          + '; write_result.py %s' % J['write_result_sha256'][:12]]
    J['lines'] = len(L)
    return L, J


def word_lim(t): return t  # items 28-31 are printed exactly as the protocol words them (MF-14)


def nc(p): return os.path.normcase(os.path.realpath(os.path.abspath(p)))


def under(p, d):
    return nc(p) == nc(d) or nc(p).startswith(nc(d).rstrip(os.sep) + os.sep)


def parse(argv):
    a = dict(test=False, final=False); i = 0
    while i < len(argv):
        k = argv[i]
        if k in ('--test', '--final'): a[k[2:]] = True; i += 1; continue
        if not k.startswith('--') or k[2:] not in OPTS or i + 1 >= len(argv):
            print('write_result: refusing (exit 2): unknown or incomplete option %r' % k, flush=True); raise SystemExit(2)
        a[k[2:].replace('-', '_')] = argv[i + 1]; i += 2
    given = sorted(k for k in a if k not in ('test', 'final'))
    if a['test'] and a['final']: print('write_result: refusing (exit 2): --final is the real run; it cannot be a --test', flush=True); raise SystemExit(2)
    if not a['test']:
        bad = ['option(s) %s' % given] if given else []
        e = os.environ.get('EMB_ROOT')
        if e is not None and nc(e) != nc(LANE): bad.append('EMB_ROOT=%s is not the lane folder %s' % (e, LANE))
        if os.environ.get('FIXFLOW_REPO'): bad.append('FIXFLOW_REPO=%s is set' % os.environ['FIXFLOW_REPO'])
        if bad: print('write_result: refusing in the real run (exit 2; rulings 80, 84): %s' % '; '.join(bad), flush=True); raise SystemExit(2)
        rets = os.path.join(ROOT, 'grader-returns')
        a.update(tune=os.path.join(HERE, 'report', 'tune.json'), item22=os.path.join(HERE, 'report', 'item22.json'),
                 answer=os.path.join(HERE, 'report', 'answer_level', 'answer_level.json'),
                 answer_graded=os.path.join(rets, 'tune-item24.json'), tune_rank=os.path.join(rets, 'tune-rank.json'),
                 heldout=os.path.join(rets, 'heldout.json'), leak=os.path.join(HERE, 'leak_audit', 'leak_audit.json'),
                 item27=os.path.join(HERE, 'heldout', 'item27.json'), handoff=os.path.join(HERE, 'heldout', 'HANDOFF.json'),
                 plan=os.path.join(HERE, 'stageB', 'plan.json'), protocol=PROTOCOL, anchor=os.path.join(ROOT, 'progress.jsonl'),
                 ac_log=runlog_ac_log(ROOT), outdir=DELIVERABLE if a['final'] else os.path.join(HERE, 'report', 'result-draft'))
    else:
        if 'tune' not in a or 'outdir' not in a:
            print('write_result: refusing (exit 2): --test needs explicit --tune and --outdir', flush=True); raise SystemExit(2)
        a.setdefault('protocol', PROTOCOL)
        # END-ORDER 2e: the grader's test-mode returns are read from LANE/grader-returns/test/ unless given; the real
        # returns folder itself is never a test input (exit 2)
        tr = os.path.join(ROOT, 'grader-returns', 'test')
        for k, n in (('tune_rank', 'tune-rank.json'), ('answer_graded', 'tune-item24.json'), ('heldout', 'heldout.json')):
            if k not in a and os.path.exists(os.path.join(tr, n)): a[k] = os.path.join(tr, n)
            if k in a and nc(os.path.dirname(os.path.abspath(a[k]))) == nc(os.path.join(ROOT, 'grader-returns')):
                print('write_result: refusing (exit 2): --test reads the test returns, not %s' % a[k], flush=True); raise SystemExit(2)
        if under(a['outdir'], DELIVERABLE):
            print('write_result: refusing (exit 8): test input is never written to the deliverable folder %s or under it' % DELIVERABLE, flush=True); raise SystemExit(8)
    return a


def main(argv):
    a = parse(argv); is_test = a['test']
    T = load(a['tune']); I22 = load(a.get('item22')); AL = load(a.get('answer')); LK = load(a.get('leak')); R27 = load(a.get('item27'))
    plan = load(a.get('plan'))
    if not is_test:
        bad = real_input_problems(a, T, I22, AL, LK, R27, plan, a.get('anchor'))
        if bad: print('write_result: refusing (exit 10): ' + '; '.join(bad), flush=True); raise SystemExit(10)
        if a['final']:
            miss = [k for k in ('tune_rank', 'answer_graded', 'heldout') if not os.path.exists(a[k])]
            if miss: print('write_result: refusing --final (exit 11): grader return(s) missing: %s' % [a[k] for k in miss], flush=True); raise SystemExit(11)
    TR = load(a.get('tune_rank')); AG = load(a.get('answer_graded')); HO = load(a.get('heldout'))
    scorers = []
    if TR is not None:
        if T is None or AL is None: print('write_result: refusing (exit 14): tune-rank.json needs tune.json and answer_level.json', flush=True); raise SystemExit(14)
        tb, a['tune_rank_check'] = check_tune_rank(TR, AL, T, a, is_test)
        if tb: print('write_result: refusing (exit 14): tune-rank.json: ' + '; '.join(tb[:8]), flush=True); raise SystemExit(14)
        scorers.append(TR['scorer'])
    if AG is not None:
        ab = check_item24(AG, AL, a, is_test) if AL is not None else ['answer_level.json missing']
        if ab: print('write_result: refusing (exit 13): tune-item24.json: ' + '; '.join(ab[:8]), flush=True); raise SystemExit(13)
        scorers.append(AG['scorer'])
    if HO is not None:
        hb = check_heldout(HO, R27, a, is_test)
        if hb: print('write_result: refusing (exit 12): held-out aggregates: ' + '; '.join(hb[:8]), flush=True); raise SystemExit(12)
        scorers.append(HO['scorer'])
    if any(s != scorers[0] for s in scorers):
        print('write_result: refusing (exit 12): the grader returns carry different scorer blocks', flush=True); raise SystemExit(12)
    L, J = build(a)
    if len(L) > MAX_LINES:
        print('write_result: refusing: RESULT.md would have %d lines (limit %d)' % (len(L), MAX_LINES + 1), flush=True); raise SystemExit(9)
    os.makedirs(a['outdir'], exist_ok=True)
    for name, data in (('RESULT.md', '\n'.join(L) + '\n'), ('result.json', json.dumps(J, indent=1, sort_keys=True, default=str) + '\n')):
        p = os.path.join(a['outdir'], name)
        with open(p + '.part', 'w', encoding='utf-8', newline='\n') as f: f.write(data)
        os.replace(p + '.part', p)
    print('write_result: wrote %s (%d lines) and result.json to %s' % ('RESULT.md', len(L), a['outdir']), flush=True)
    return L, J


if __name__ == '__main__':
    main(sys.argv[1:])
